#!/usr/bin/env python3
"""
更新论文数据：
  1. 拉取 YanjieZe/awesome-humanoid-robot-learning 的 README 并解析全部论文条目
  2. 收集精选数据 (data/milestones.js, data/rl_knowledge.js) 中引用的 arXiv ID
  3. 通过 Semantic Scholar batch API 获取引用数 (带本地缓存, 默认 7 天过期)
  4. 计算影响力分数, 输出 data/papers.js (window.PAPERS / window.CITATIONS)

用法:
  python3 scripts/update_data.py            # 增量更新
  python3 scripts/update_data.py --refresh  # 强制刷新全部引用数
  python3 scripts/update_data.py --offline  # 不联网, 仅用缓存
可选环境变量 S2_API_KEY: Semantic Scholar API key (提高限速)
"""
import json
import math
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CACHE = os.path.join(DATA, "cache")
README_URL = "https://raw.githubusercontent.com/YanjieZe/awesome-humanoid-robot-learning/main/README.md"
S2_BATCH = "https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,citationCount,influentialCitationCount,venue,publicationDate"
CACHE_TTL_DAYS = 7

SECTIONS = {
    "Loco-Manipulation and Whole-Body-Control": "wbc",
    "Manipulation": "manip",
    "Teleoperation": "teleop",
    "Locomotion": "loco",
    "Navigation": "nav",
    "State Estimation": "state",
    "Sim-to-Real": "sim2real",
    "Hardware Design": "hardware",
    "Simulation Benchmark": "sim",
    "Physics-Based Character Animation": "anim",
    "Human Motion Analysis and Synthesis": "motion",
}

TOP_VENUES = {"science robotics": 1.0, "nature": 1.0, "science": 1.0, "rss": 0.55, "corl": 0.55,
              "siggraph": 0.5, "siggraph asia": 0.5, "tog": 0.5, "icra": 0.35, "iros": 0.25,
              "neurips": 0.5, "icml": 0.5, "iclr": 0.5, "cvpr": 0.45, "iccv": 0.45, "eccv": 0.4,
              "humanoids": 0.25, "tro": 0.45, "ijrr": 0.45, "ra-l": 0.25}

ARXIV_RE = re.compile(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})")
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")


def log(*a):
    print(*a, file=sys.stderr)


def fetch(url, data=None, headers=None, retries=5):
    headers = dict(headers or {})
    headers.setdefault("User-Agent", "rl-robotics-atlas/1.0")
    for i in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # 429 / 网络抖动 -> 指数退避
            wait = 2 ** i * 2
            log(f"  请求失败 ({e}), {wait}s 后重试…")
            time.sleep(wait)
    raise RuntimeError(f"多次请求失败: {url}")


def parse_entry(line, section):
    body = line[2:].strip()
    star = "🌟" in body[:4]
    body = body.replace("🌟", "").strip()
    links = LINK_RE.findall(body)
    m = re.match(r"^\[([^\]]*)\]\(([^)]*)\)\s*,\s*(.*)$", body)
    if m:
        venue_raw, main_url, rest = m.group(1).strip(), m.group(2).strip(), m.group(3)
    else:
        m2 = re.match(r"^([^,]*),\s*(.*)$", body)
        if not m2:
            return None
        venue_raw, main_url, rest = m2.group(1).strip(), "", m2.group(2)
    # 标题 = 第一个 ", [" 之前的部分
    title = re.split(r",\s*\[", rest, maxsplit=1)[0].strip().strip(",").strip()
    title = title.replace("**", "").strip()
    if not title:
        return None
    arxiv = None
    for _, u in links:
        mm = ARXIV_RE.search(u)
        if mm:
            arxiv = mm.group(1)
            break
    vm = re.match(r"^(.*?)\s*(\d{4})(?:\.(\d{1,2}))?\s*$", venue_raw)
    venue, year, month = (vm.group(1).strip(), int(vm.group(2)), int(vm.group(3)) if vm.group(3) else None) if vm else (venue_raw, None, None)
    if arxiv:  # arXiv ID 的 YYMM 即首次提交时间, 最可靠
        ay, am = 2000 + int(arxiv[:2]), int(arxiv[2:4])
        if 1 <= am <= 12:
            year, month = ay, am
    if year is None:
        return None
    short = title.split(":")[0].strip() if ":" in title and len(title.split(":")[0]) <= 28 else None
    link_map = {}
    for name, u in links:
        k = name.lower()
        if "arxiv" in u:
            link_map.setdefault("arxiv", u)
        elif k in ("website", "project", "project page", "page"):
            link_map.setdefault("web", u)
        elif k in ("code", "github") or "github.com" in u:
            link_map.setdefault("code", u)
        else:
            link_map.setdefault("paper", u)
    if main_url and "arxiv" not in link_map and "paper" not in link_map:
        link_map["paper"] = main_url
    return {
        "id": arxiv or re.sub(r"[^a-z0-9]+", "-", title.lower())[:60],
        "arxiv": arxiv,
        "title": title,
        "short": short,
        "venue": venue if venue.lower() not in ("website", "github", "pdf", "") else "",
        "year": year,
        "month": month or 6,
        "cats": [section],
        "open": star or ("code" in link_map),
        "links": link_map,
    }


def title_keys(title):
    norm = lambda x: re.sub(r"[^a-z0-9]+", "", x.lower())
    keys = {norm(title)}
    if ":" in title:
        keys.add(norm(title.split(":", 1)[1]))
    return {k for k in keys if len(k) > 12}


def merge(q, p, section):
    if section not in q["cats"]:
        q["cats"].append(section)
    if p["venue"] and (not q["venue"] or q["venue"].lower() == "arxiv"):
        q["venue"] = p["venue"]
    if p["arxiv"] and not q["arxiv"]:
        q.update(id=p["id"], arxiv=p["arxiv"], year=p["year"], month=p["month"])
    if len(p["title"]) > len(q["title"]):
        q["title"], q["short"] = p["title"], p["short"] or q["short"]
    for k, v in p["links"].items():
        q["links"].setdefault(k, v)
    q["open"] = q["open"] or p["open"]


def parse_readme(text):
    """同一论文可能出现在多个分类 / 以不同链接出现: 按 arXiv ID 与标准化标题去重合并"""
    section, papers, by_key = None, [], {}
    for line in text.splitlines():
        if line.startswith("## "):
            section = SECTIONS.get(line[3:].strip())
            continue
        if section and line.startswith("- "):
            p = parse_entry(line, section)
            if not p:
                continue
            keys = title_keys(p["title"]) | ({"arxiv:" + p["arxiv"]} if p["arxiv"] else set())
            q = next((by_key[k] for k in keys if k in by_key), None)
            if q and p["arxiv"] and q["arxiv"] and p["arxiv"] != q["arxiv"]:
                q = None  # 同名但不同论文
            if q:
                merge(q, p, section)
            else:
                q = p
                papers.append(p)
            for k in keys | title_keys(q["title"]) | ({"arxiv:" + q["arxiv"]} if q["arxiv"] else set()):
                by_key[k] = q
    return papers


def curated_ids():
    ids = set()
    for fn in ("milestones.js", "rl_knowledge.js"):
        path = os.path.join(DATA, fn)
        if os.path.exists(path):
            ids |= set(re.findall(r"arxiv\s*:\s*['\"](\d{4}\.\d{4,5})['\"]", open(path, encoding="utf-8").read()))
    return ids


def curated_titles():
    """精选数据中的 标题 → arXiv 映射, 用于补全 README 中缺少 arXiv 链接的条目"""
    out = {}
    path = os.path.join(DATA, "milestones.js")
    if os.path.exists(path):
        for t, a in re.findall(r"t:\s*'([^']+)',\s*arxiv:\s*'(\d{4}\.\d{4,5})'", open(path, encoding="utf-8").read()):
            for k in title_keys(t):
                out[k] = a
    return out


def resolve_missing_arxiv(papers, cache, offline):
    """无 arXiv 链接的条目: 先匹配精选标题, 再用 Semantic Scholar 标题检索 (结果缓存)"""
    ct = curated_titles()
    for p in papers:
        if p["arxiv"]:
            continue
        a = next((ct[k] for k in title_keys(p["title"]) if k in ct), None)
        key = "title:" + re.sub(r"[^a-z0-9]+", "", p["title"].lower())
        if not a and key in cache:
            a = cache[key].get("arxiv")
        elif not a and not offline:
            url = "https://api.semanticscholar.org/graph/v1/paper/search/match?fields=externalIds,title&query=" + urllib.request.quote(p["title"])
            try:
                r = json.loads(fetch(url, retries=3)).get("data", [{}])[0]
                cand = (r.get("externalIds") or {}).get("ArXiv")
                same = title_keys(r.get("title", "")) & title_keys(p["title"])
                a = cand if cand and same else None
            except Exception:
                a = None
            cache[key] = {"t": time.time(), "arxiv": a}
            time.sleep(1.1)
        if a:
            p.update(id=a, arxiv=a, year=2000 + int(a[:2]), month=int(a[2:4]))
            p["links"].setdefault("arxiv", "https://arxiv.org/abs/" + a)


def load_cache():
    path = os.path.join(CACHE, "s2_cache.json")
    return json.load(open(path)) if os.path.exists(path) else {}


def save_cache(c):
    os.makedirs(CACHE, exist_ok=True)
    json.dump(c, open(os.path.join(CACHE, "s2_cache.json"), "w"), ensure_ascii=False)


def update_citations(ids, cache, refresh=False):
    now = time.time()
    todo = [i for i in sorted(ids) if refresh or i not in cache or now - cache[i].get("t", 0) > CACHE_TTL_DAYS * 86400]
    log(f"需要查询引用数: {len(todo)} / {len(ids)}")
    headers = {"Content-Type": "application/json"}
    if os.environ.get("S2_API_KEY"):
        headers["x-api-key"] = os.environ["S2_API_KEY"]
    for k in range(0, len(todo), 400):
        chunk = todo[k:k + 400]
        res = json.loads(fetch(S2_BATCH, json.dumps({"ids": ["ARXIV:" + i for i in chunk]}).encode(), headers))
        for i, r in zip(chunk, res):
            cache[i] = {"t": now, "c": (r or {}).get("citationCount"), "ic": (r or {}).get("influentialCitationCount"),
                        "v": (r or {}).get("venue") or "", "d": (r or {}).get("publicationDate")}
        log(f"  已完成 {min(k + 400, len(todo))}/{len(todo)}")
        save_cache(cache)
        time.sleep(1.5)
    return cache


def venue_bonus(v):
    v = (v or "").lower()
    best = 0
    for k, b in TOP_VENUES.items():
        if re.search(r"\b" + re.escape(k) + r"\b", v):
            best = max(best, b)
    if "robotics: science and systems" in v:
        best = max(best, 0.55)
    if "conference on robot learning" in v:
        best = max(best, 0.55)
    if "sci. robotics" in v:
        best = 1.0
    return best


def score(p, cit, now):
    """影响力: 总引用(对数) + 引用速度(按月龄归一) + 会议档次 + 开源加成"""
    c = cit.get("c") or 0
    age = max(1.0, (now.year - p["year"]) * 12 + (now.month - p["month"]) + 1)
    vel = c / age
    s = 0.55 * math.log1p(c) + 0.9 * math.log1p(vel * 3) + 1.2 * max(venue_bonus(p["venue"]), venue_bonus(cit.get("v"))) + (0.25 if p["open"] else 0)
    return round(s, 3), round(vel, 2)


def main():
    refresh, offline = "--refresh" in sys.argv, "--offline" in sys.argv
    os.makedirs(CACHE, exist_ok=True)
    readme_cache = os.path.join(CACHE, "awesome_README.md")
    if offline:
        text = open(readme_cache, encoding="utf-8").read()
    else:
        log("拉取 awesome-humanoid-robot-learning README …")
        text = fetch(README_URL).decode("utf-8")
        open(readme_cache, "w", encoding="utf-8").write(text)
    papers = parse_readme(text)
    log(f"解析得到 {len(papers)} 篇论文")

    cache = load_cache()
    resolve_missing_arxiv(papers, cache, offline)
    save_cache(cache)
    uniq = {}
    for p in papers:  # 补全 arXiv 后可能出现新的重复
        if p["id"] in uniq:
            merge(uniq[p["id"]], p, p["cats"][0])
        else:
            uniq[p["id"]] = p
    papers = list(uniq.values())
    ids = {p["arxiv"] for p in papers if p["arxiv"]} | curated_ids()
    if not offline:
        cache = update_citations(ids, cache, refresh)

    now = datetime.now(timezone.utc)
    for p in papers:
        cit = cache.get(p["arxiv"], {}) if p["arxiv"] else {}
        p["cites"] = cit.get("c")
        p["icites"] = cit.get("ic")
        if cit.get("v") and (not p["venue"] or p["venue"].lower() == "arxiv"):
            p["s2venue"] = cit["v"]
        p["score"], p["vel"] = score(p, cit, now)
    # 归一化到 0~1 (分位数), 前端据此决定节点大小
    ranked = sorted(papers, key=lambda p: p["score"])
    for r, p in enumerate(ranked):
        p["rank"] = round(r / max(1, len(ranked) - 1), 4)

    citations = {i: {"c": cache[i].get("c"), "ic": cache[i].get("ic"), "v": cache[i].get("v")}
                 for i in curated_ids() if i in cache}
    meta = {"generated": now.strftime("%Y-%m-%d %H:%M UTC"), "source": "https://github.com/YanjieZe/awesome-humanoid-robot-learning",
            "count": len(papers)}
    out = os.path.join(DATA, "papers.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 自动生成, 请勿手动编辑 —— 运行 python3 scripts/update_data.py 更新\n")
        f.write("window.PAPERS_META = " + json.dumps(meta, ensure_ascii=False) + ";\n")
        f.write("window.CITATIONS = " + json.dumps(citations, ensure_ascii=False, separators=(",", ":")) + ";\n")
        f.write("window.PAPERS = " + json.dumps(papers, ensure_ascii=False, separators=(",", ":")) + ";\n")
    log(f"已写入 {out}  ({os.path.getsize(out) // 1024} KB)")


if __name__ == "__main__":
    main()
