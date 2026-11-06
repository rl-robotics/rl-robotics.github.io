#!/usr/bin/env python3
"""给 index.html 中引用的本地 css/js 加上 ?v=<内容哈希>，内容变化时浏览器会重新下载而不是用旧缓存。
每次修改网站文件后、提交前运行：python3 scripts/bump_version.py
"""
import hashlib
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")


def file_hash(rel):
    path = os.path.join(ROOT, rel)
    if not os.path.exists(path):
        return None
    return hashlib.md5(open(path, "rb").read()).hexdigest()[:8]


def main():
    html = open(INDEX, encoding="utf-8").read()
    changed = 0

    def repl(m):
        nonlocal changed
        attr, rel = m.group(1), m.group(2)
        if rel.startswith(("http:", "https:", "//")):
            return m.group(0)
        h = file_hash(rel)
        if not h:
            return m.group(0)
        new = f'{attr}="{rel}?v={h}"'
        if new != m.group(0):
            changed += 1
        return new

    html = re.sub(r'(src|href)="([^"?#]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"', repl, html)
    open(INDEX, "w", encoding="utf-8").write(html)
    print(f"已更新 {changed} 个资源版本号")


if __name__ == "__main__":
    main()
