/* 应用核心：数据索引、路由、详情面板、搜索、提示框、课程数据组装、学习进度 */
const App = (() => {
  const views = {};
  const inited = new Set();
  let current = null;

  // awesome 列表分类
  const CATS = [
    { id: 'wbc', name: '全身控制 / 移动操作', color: '#e8890c' },
    { id: 'loco', name: '运动 Locomotion', color: '#0071e3' },
    { id: 'manip', name: '操作 Manipulation', color: '#8e4ec6' },
    { id: 'teleop', name: '遥操作', color: '#b07d00' },
    { id: 'sim2real', name: 'Sim-to-Real', color: '#0a9d8f' },
    { id: 'sim', name: '仿真与基准', color: '#6e7f96' },
    { id: 'anim', name: '物理角色动画', color: '#d6409f' },
    { id: 'motion', name: '人体运动分析与生成', color: '#e5484d' },
    { id: 'nav', name: '导航', color: '#0aa2c0' },
    { id: 'state', name: '状态估计', color: '#2f9e5a' },
    { id: 'hardware', name: '硬件设计', color: '#a0785a' },
  ];

  // ───────── 数据索引 ─────────
  const CIT = window.CITATIONS || {};
  const PAPERS = window.PAPERS || [];
  RL_NODES.forEach(n => { n.year = n.year ?? n.y; delete n.y; });  // d3-force 会占用 .y 作为坐标
  const rlById = new Map(RL_NODES.map(n => [n.id, n]));
  const groupById = new Map(RL_GROUPS.map(g => [g.id, g]));
  const laneById = new Map(LANES.map(l => [l.id, l]));
  const catById = new Map(CATS.map(c => [c.id, c]));
  const msById = new Map(MILESTONES.map(m => [m.id, m]));
  const paperById = new Map(PAPERS.map(p => [p.id, p]));
  const paperByArxiv = new Map(PAPERS.filter(p => p.arxiv).map(p => [p.arxiv, p]));
  const msByArxiv = new Map(MILESTONES.filter(m => m.arxiv).map(m => [m.arxiv, m]));

  RL_NODES.forEach(n => { n.cites = n.p && n.p.arxiv && CIT[n.p.arxiv] ? CIT[n.p.arxiv].c : null; n.inL = []; n.outL = []; n.usedBy = []; });
  RL_LINKS.forEach(([s, t, type]) => {
    if (!rlById.has(s) || !rlById.has(t)) { console.warn('RL 连边缺失节点', s, t); return; }
    rlById.get(s).outL.push({ id: t, type }); rlById.get(t).inL.push({ id: s, type });
  });
  MILESTONES.forEach(m => {
    if (m.arxiv && !m.y) { m.y = 2000 + +m.arxiv.slice(0, 2); m.m = +m.arxiv.slice(2, 4); }
    m.date = new Date(m.y, (m.m || 6) - 1, 15);
    const c = m.arxiv && CIT[m.arxiv];
    m.cites = c ? c.c : null; m.icites = c ? c.ic : null; m.s2venue = c ? c.v : '';
    m.from = (m.from || []).filter(id => msById.has(id) || (console.warn('前序缺失', m.id, id), false));
    m.to = []; m.rl = (m.rl || []).filter(id => rlById.has(id) || (console.warn('RL 节点缺失', m.id, id), false));
    const p = m.arxiv && paperByArxiv.get(m.arxiv); m.links = p ? p.links : {};
  });
  MILESTONES.forEach(m => { m.from.forEach(f => msById.get(f).to.push(m.id)); m.rl.forEach(r => rlById.get(r).usedBy.push(m.id)); });
  PAPERS.forEach(p => { p.date = new Date(p.year, (p.month || 6) - 1, 15); });

  const fmtDate = d => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const venueOf = p => (p.venue && p.venue.toLowerCase() !== 'arxiv' ? p.venue : p.s2venue && p.s2venue !== 'arXiv.org' ? p.s2venue : p.venue) || 'arXiv';
  const fmtNum = n => n == null ? '—' : n >= 10000 ? (n / 1000).toFixed(1) + 'k' : n.toLocaleString();
  const tex = (f, display = true) => {
    try { return katex.renderToString(f, { displayMode: display, throwOnError: false, strict: false }); }
    catch (e) { return `<code>${esc(f)}</code>`; }
  };

  // ───────── 简易标记渲染：段落 / 列表 / 公式 / 粗体 / 代码 ─────────
  function inline(s) {
    return s.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g).map(seg => {
      if (seg.startsWith('$$')) return tex(seg.slice(2, -2), true);
      if (seg.startsWith('$') && seg.endsWith('$') && seg.length > 1) return tex(seg.slice(1, -1), false);
      return esc(seg).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    }).join('');
  }
  function md(text) {
    if (!text) return '';
    // 块内按行类型分组：普通行合并为段落，"- " / "1. " 开头的连续行合并为列表
    const kind = l => /^\s*- /.test(l) ? 'ul' : /^\s*\d+\. /.test(l) ? 'ol' : 'p';
    return '<div class="md">' + text.trim().split(/\n\s*\n/).map(block => {
      const b = block.trim();
      if (b.startsWith('$$') && b.endsWith('$$') && b.indexOf('$$', 2) === b.length - 2) return tex(b.slice(2, -2), true);
      const groups = [];
      b.split('\n').forEach(l => { const k = kind(l); if (groups.length && groups[groups.length - 1].k === k) groups[groups.length - 1].ls.push(l); else groups.push({ k, ls: [l] }); });
      return groups.map(g => g.k === 'p' ? `<p>${inline(g.ls.join(''))}</p>`
        : `<${g.k}>${g.ls.map(l => `<li>${inline(l.replace(/^\s*(- |\d+\. )/, ''))}</li>`).join('')}</${g.k}>`).join('');
    }).join('') + '</div>';
  }

  // ───────── 课程：章节 + 精讲内容 + 自动生成的简介页 ─────────
  const inChapters = new Set(CHAPTERS.flatMap(c => c.lessons));
  const appendix = RL_NODES.filter(n => !inChapters.has(n.id)).sort((a, b) => a.year - b.year).map(n => n.id);
  const chapters = CHAPTERS.concat([{ id: 'cx', name: '附录：更多知识点', desc: '图谱中其余的概念与算法，按年代排列，按需查阅。', lessons: appendix }]);
  const order = chapters.flatMap(c => c.lessons.map(id => ({ id, ch: c })));
  const DEFAULT_READ = { found: ['SB', 'SU1', 'SILVER'], value: ['HF3', 'SB', 'SU_KEY'], pg: ['SU3', 'LW_PG', 'HF4'], ac: ['SU_SAC', 'SU_TD3', 'LW_PG'],
    model: ['CS285', 'LW_RL'], offline: ['CS285', 'SU_KEY'], il: ['CS285', 'LW_DIFF'], robot: ['LEGGEDGYM', 'ISAACLAB', 'LW_DR'], frontier: ['CS285', 'SU_KEY'] };
  const lessonCache = new Map();
  function lesson(id) {
    if (lessonCache.has(id)) return lessonCache.get(id);
    const node = rlById.get(id), L = LESSONS[id] || {};
    if (!node && !LESSONS[id]) return null;
    const idx = order.findIndex(o => o.id === id);
    const reads = (L.read || (node ? DEFAULT_READ[node.g] : []) || []).map(r => Array.isArray(r) ? r : READ[r]).filter(Boolean);
    const out = {
      id, node, deep: !!LESSONS[id], ch: idx >= 0 ? order[idx].ch : null, chNo: idx >= 0 ? chapters.indexOf(order[idx].ch) : -1,
      prev: idx > 0 ? order[idx - 1].id : null, next: idx >= 0 && idx < order.length - 1 ? order[idx + 1].id : null,
      title: L.title || node.name, en: L.en || node.en, year: node ? node.year : null,
      level: L.level || (node && node.g === 'frontier' ? '高级' : '进阶'), mins: L.mins || 3,
      one: L.one || (node ? node.s.split('。')[0] + '。' : ''),
      intuit: L.intuit || (node ? node.s : ''), formal: L.formal || (node && node.f ? '$$' + node.f + '$$' : ''),
      terms: L.terms || [], example: L.example || '', algo: L.algo || '', pitfalls: L.pitfalls || [],
      points: L.intuit ? [] : (node && node.pts) || [], robot: L.robot || (node && node.robot) || '',
      quiz: L.quiz || [], reads, paper: node && node.p,
      prereq: node ? node.inL.map(l => l.id) : [], post: node ? node.outL.map(l => l.id) : [], usedBy: node ? node.usedBy : [],
    };
    lessonCache.set(id, out); return out;
  }

  // 学习进度（仅保存在本浏览器）
  const KEY = 'rlr-progress-v1';
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) {}
  const progress = {
    has: id => done.has(id),
    set(id, v) { v ? done.add(id) : done.delete(id); try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch (e) {} },
    count: ids => ids.filter(id => done.has(id)).length,
  };

  // ───────── 路由 ─────────
  const PAGE = { home: 'page-home', learn: 'page-learn', rl: 'page-map', timeline: 'page-timeline', river: 'page-papers' };
  const ROUTE = { '': 'home', learn: 'learn', map: 'rl', timeline: 'timeline', papers: 'river' };
  function register(name, view) { views[name] = view; }
  function show(name) {
    if (current !== name) {
      current = name;
      Object.entries(PAGE).forEach(([v, id]) => document.getElementById(id).classList.toggle('active', v === name));
      const routeName = Object.keys(ROUTE).find(k => ROUTE[k] === name);
      document.querySelectorAll('#nav-links [data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === '/' + routeName));
      closePanel();
    }
    if (!inited.has(name)) { inited.add(name); views[name].init(); }
    views[name].activate && views[name].activate();
  }
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const name = ROUTE[parts[0]] || 'home', param = parts[1] ? decodeURIComponent(parts[1]) : null;
    untip();
    show(name);
    if (name === 'learn') views.learn.route(param);
    else if (name === 'home') views.home.route && views.home.route();
    else if (param) {
      views[name].focus && views[name].focus(param);
      const kind = name === 'rl' ? 'rl' : name === 'timeline' ? (msById.has(param) ? 'ms' : 'paper') : 'paper';
      openPanel(kind, param);
    }
  }
  function go(path) {
    const h = '#' + path;
    if (location.hash === h) route(); else location.hash = h;
  }
  function focus(kind, id) {
    go(kind === 'rl' ? '/map/' + id : kind === 'ms' ? '/timeline/' + id : kind === 'learn' ? '/learn/' + id : '/papers/' + id);
  }

  // ───────── 详情面板 ─────────
  const panel = document.getElementById('panel'), panelBody = document.getElementById('panel-body');
  let panelKey = null;
  const chip = (txt, color, attrs = '') => `<span class="chip ${attrs ? 'link' : ''}" ${attrs}>${color ? `<i style="background:${color}"></i>` : ''}${txt}</span>`;
  const rlChip = (id, to = 'rl') => { const n = rlById.get(id), g = groupById.get(n.g); return chip(esc(n.name), g.color, `data-go="${to}:${id}"`); };
  const msChip = id => { const m = msById.get(id), l = laneById.get(m.lane); return chip(`${esc(m.n)} <small style="color:var(--text-3)">${m.y}</small>`, l.color, `data-go="ms:${id}"`); };
  function paperLinks(arxiv, title, extra = {}) {
    const out = [];
    if (arxiv) out.push(`<a class="pri" href="https://arxiv.org/abs/${arxiv}" target="_blank">arXiv 原文</a>`, `<a href="https://arxiv.org/pdf/${arxiv}" target="_blank">PDF</a>`);
    if (extra.web) out.push(`<a href="${esc(extra.web)}" target="_blank">项目主页</a>`);
    if (extra.code) out.push(`<a href="${esc(extra.code)}" target="_blank">代码</a>`);
    if (extra.url) out.push(`<a ${arxiv ? '' : 'class="pri"'} href="${esc(extra.url)}" target="_blank">原文 / 主页</a>`);
    if (extra.paper && !arxiv) out.push(`<a href="${esc(extra.paper)}" target="_blank">论文页</a>`);
    if (arxiv) out.push(`<a href="https://www.alphaxiv.org/abs/${arxiv}" target="_blank">alphaXiv 讨论</a>`);
    if (title) out.push(`<a href="https://scholar.google.com/scholar?q=${encodeURIComponent(title)}" target="_blank">Google Scholar</a>`);
    return `<div class="p-links">${out.join('')}</div>`;
  }
  const stars = t => '★'.repeat(4 - t) + '<span style="opacity:.25">' + '★'.repeat(t - 1) + '</span>';

  function rlPanel(n) {
    const g = groupById.get(n.g), L = lesson(n.id);
    let h = `<div class="p-kicker">${chip(g.name, g.color)}${chip(n.year + ' 年')}${L.deep ? chip('有精讲', '#2f9e5a') : ''}</div>
      <div class="p-title">${esc(n.name)}</div><div class="p-en">${esc(n.en)}</div>
      <div class="p-summary">${esc(n.s)}</div>
      <a class="deep-btn" href="#/learn/${n.id}"><div><b>${L.deep ? '阅读详细讲解' : '查看知识点页面'}</b><small>${L.deep ? `直觉 · 公式逐项解释 · 例子 · 自测 · 约 ${L.mins} 分钟` : '简介 + 延伸阅读入口'}</small></div><span>→</span></a>`;
    if (n.f) h += `<div class="p-sec"><h4>关键公式</h4><div class="formula">${tex(n.f)}</div></div>`;
    if (n.robot) h += `<div class="p-sec"><h4>在机器人运控中</h4><div class="p-robot">${esc(n.robot)}</div></div>`;
    if (n.p) h += `<div class="p-sec"><h4>代表论文</h4><div class="p-paper"><div class="pt">${esc(n.p.t)}</div>
        <div class="pm">${esc(n.p.a || '')} · ${esc(n.p.v || '')}${n.cites != null ? ` · ${fmtNum(n.cites)} 次引用` : ''}</div>${paperLinks(n.p.arxiv, n.p.t, { url: n.p.url })}</div></div>`;
    if (n.inL.length) h += `<div class="p-sec"><h4>前置知识 · 先学这些</h4><div class="rel-list">${n.inL.map(l => rlChip(l.id)).join('')}</div></div>`;
    if (n.outL.length) h += `<div class="p-sec"><h4>后续发展</h4><div class="rel-list">${n.outL.map(l => rlChip(l.id)).join('')}</div></div>`;
    if (n.usedBy.length) {
      const ms = n.usedBy.map(id => msById.get(id)).sort((a, b) => a.date - b.date);
      h += `<div class="p-sec"><h4>用到它的机器人论文 · ${ms.length}</h4><div class="rel-list">${ms.map(m => msChip(m.id)).join('')}</div></div>`;
    }
    return h;
  }

  function msPanel(m) {
    const l = laneById.get(m.lane);
    let h = `<div class="p-kicker">${chip(l.name, l.color)}${chip(fmtDate(m.date))}<span class="stars" title="地位">${stars(m.tier)}</span></div>
      <div class="p-title">${esc(m.n)}</div><div class="p-full">${esc(m.t)}</div>
      <div class="stat-row"><div class="stat"><b>${fmtNum(m.cites)}</b><span>引用（S2）</span></div>
      <div class="stat"><b>${fmtNum(m.icites)}</b><span>高影响力引用</span></div>
      <div class="stat"><b style="font-size:13px">${esc(m.org || '—')}</b><span>机构</span></div></div>
      <div class="p-summary">${esc(m.s)}</div>${paperLinks(m.arxiv, m.t, Object.assign({ url: m.url }, m.links))}`;
    if (m.rl.length) h += `<div class="p-sec"><h4>读前须知 · 需要的 RL 知识（点击进入课程）</h4><div class="rel-list">${m.rl.map(id => rlChip(id, 'learn')).join('')}</div></div>`;
    if (m.from.length) h += `<div class="p-sec"><h4>继承 / 相关前序</h4><div class="rel-list">${m.from.map(msChip).join('')}</div></div>`;
    if (m.to.length) h += `<div class="p-sec"><h4>后续工作</h4><div class="rel-list">${m.to.map(msChip).join('')}</div></div>`;
    const stories = STORIES.filter(s => s.steps.some(st => st[0] === m.id));
    if (stories.length) h += `<div class="p-sec"><h4>所在故事线</h4><div class="rel-list">${stories.map(s => chip(esc(s.name), '#0071e3', `data-story="${s.id}"`)).join('')}</div></div>`;
    return h;
  }

  function paperPanel(p) {
    const ms = p.arxiv && msByArxiv.get(p.arxiv);
    let h = `<div class="p-kicker">${p.cats.map(c => chip(catById.get(c).name, catById.get(c).color)).join('')}${chip(fmtDate(p.date))}${p.open ? chip('开源', '#2f9e5a') : ''}</div>
      <div class="p-title" style="font-size:21px">${esc(p.short || p.title)}</div>${p.short ? `<div class="p-full">${esc(p.title)}</div>` : ''}
      <div class="stat-row"><div class="stat"><b>${fmtNum(p.cites)}</b><span>引用</span></div>
      <div class="stat"><b>${p.vel ?? '—'}</b><span>月均引用</span></div>
      <div class="stat"><b>Top ${Math.max(1, Math.round((1 - p.rank) * 100))}%</b><span>影响力</span></div></div>
      <div class="p-en">发表：${esc(venueOf(p))}</div>${paperLinks(p.arxiv, p.title, p.links)}`;
    if (ms) h += `<div class="p-sec"><h4>这是一篇精选里程碑</h4><div class="rel-list">${msChip(ms.id)}</div></div>`;
    return h;
  }

  function openPanel(kind, id) {
    const obj = kind === 'rl' ? rlById.get(id) : kind === 'ms' ? msById.get(id) : paperById.get(id);
    if (!obj) return;
    panelKey = kind + ':' + id;
    panelBody.innerHTML = kind === 'rl' ? rlPanel(obj) : kind === 'ms' ? msPanel(obj) : paperPanel(obj);
    panel.classList.remove('hidden');
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
    panel.scrollTop = 0;
  }
  function closePanel() {
    if (panel.classList.contains('hidden')) return;
    panel.classList.add('hidden'); panelKey = null;
    inited.forEach(v => views[v].onPanelClose && views[v].onPanelClose());
  }
  document.getElementById('panel-close').onclick = closePanel;
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); const v = g.dataset.go; if (v.startsWith('/')) go(v); else { const [k, id] = v.split(':'); focus(k, id); } return; }
    const st = e.target.closest('[data-story]');
    if (st) { e.preventDefault(); go('/timeline'); setTimeout(() => views.timeline.playStory(st.dataset.story), 150); }
  });

  // ───────── 提示框 ─────────
  const tt = document.getElementById('tooltip');
  function tip(html, ev) {
    tt.innerHTML = html; tt.classList.remove('hidden');
    const r = tt.getBoundingClientRect();
    let x = ev.clientX + 14, y = ev.clientY + 14;
    if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - 14;
    tt.style.left = x + 'px'; tt.style.top = y + 'px';
  }
  const untip = () => tt.classList.add('hidden');

  // ───────── 搜索 ─────────
  const input = document.getElementById('search'), results = document.getElementById('search-results');
  const index = [
    { kind: 'learn', id: 'intro', name: '什么是强化学习', sub: '第 1 课 · 新手从这里开始', color: '#2f9e5a', type: '课程', text: '什么是强化学习 rl intro 入门 新手 reinforcement learning' },
    ...RL_NODES.map(n => ({ kind: 'learn', id: n.id, name: n.name, sub: `${n.en} · ${n.year}${LESSONS[n.id] ? ' · 有精讲' : ''}`, color: groupById.get(n.g).color, type: '知识点', text: `${n.name} ${n.en} ${n.id}`.toLowerCase() })),
    ...MILESTONES.map(m => ({ kind: 'ms', id: m.id, name: m.n, sub: `${m.t} · ${m.y}`, color: laneById.get(m.lane).color, type: '里程碑', text: `${m.n} ${m.t} ${m.org || ''} ${m.id}`.toLowerCase() })),
    ...PAPERS.filter(p => !msByArxiv.has(p.arxiv)).map(p => ({ kind: 'paper', id: p.id, name: p.short || p.title.slice(0, 40), sub: `${p.title} · ${fmtDate(p.date)}`, color: catById.get(p.cats[0]).color, type: '论文', text: p.title.toLowerCase(), rank: p.rank })),
  ];
  let sel = 0, hits = [];
  function doSearch() {
    const q = input.value.trim().toLowerCase();
    inited.forEach(v => views[v].onSearch && views[v].onSearch(q));
    if (!q) { results.classList.remove('open'); return; }
    hits = index.map(it => {
      if (!it.text.includes(q)) return null;
      const nm = it.name.toLowerCase(), nameHit = nm.startsWith(q) ? 0 : nm.includes(q) ? 1 : 2;
      return { it, s: ({ learn: 0, ms: 1, paper: 2 })[it.kind] * 10 + nameHit * 3 + (it.kind === 'paper' ? 1 - (it.rank || 0) : 0) };
    }).filter(Boolean).sort((a, b) => a.s - b.s).slice(0, 16).map(h => h.it);
    sel = 0;
    results.innerHTML = hits.length ? hits.map((h, i) => `<div class="sr-item ${i === 0 ? 'sel' : ''}" data-i="${i}">
      <span class="sr-type" style="background:${h.color}">${h.type}</span><div style="min-width:0"><div class="sr-name">${esc(h.name)}</div><div class="sr-sub">${esc(h.sub)}</div></div></div>`).join('')
      : '<div class="sr-item muted">没有匹配结果</div>';
    results.classList.add('open');
  }
  function pick(i) { const h = hits[i]; if (!h) return; results.classList.remove('open'); input.blur(); focus(h.kind, h.id); }
  input.addEventListener('input', doSearch);
  input.addEventListener('focus', () => input.value && doSearch());
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % Math.max(1, hits.length);
      results.querySelectorAll('.sr-item').forEach((el, i) => el.classList.toggle('sel', i === sel));
    } else if (e.key === 'Enter') pick(sel);
    else if (e.key === 'Escape') { input.value = ''; doSearch(); input.blur(); }
  });
  results.addEventListener('mousedown', e => { const it = e.target.closest('[data-i]'); if (it) { e.preventDefault(); pick(+it.dataset.i); } });
  input.addEventListener('blur', () => setTimeout(() => results.classList.remove('open'), 150));

  // 滚动渐显
  function reveal(root) {
    const els = root.querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window) || document.documentElement.classList.contains('noraf')) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
    els.forEach(e => io.observe(e));
  }

  // ───────── 启动 ─────────
  function start() {
    const help = document.getElementById('help');
    document.getElementById('help-btn').onclick = () => help.classList.remove('hidden');
    help.onclick = e => { if (e.target === help || e.target.closest('.modal-close')) help.classList.add('hidden'); };
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === '/') { e.preventDefault(); input.focus(); }
      else if (e.key === 'Escape') { help.classList.add('hidden'); closePanel(); inited.forEach(v => views[v].onEscape && views[v].onEscape()); }
      else if (e.key === ' ' && views[current] && views[current].togglePlay) { e.preventDefault(); views[current].togglePlay(); }
    });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => inited.forEach(v => views[v].resize && views[v].resize()), 200); });
    addEventListener('hashchange', route);
    route();
  }

  return { views, register, show, go, focus, openPanel, closePanel, tip, untip, tex, md, esc, fmtDate, fmtNum, venueOf, start, reveal,
    lesson, chapters, order, progress, CATS, rlById, groupById, laneById, catById, msById, paperById, msByArxiv,
    get panelOpen() { return !!panelKey; } };
})();
