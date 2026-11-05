/* ② 运控演进：技术流泳道 × 时间轴，里程碑大小 = 影响力，谱系高亮、时间回放、故事线导览 */
App.register('timeline', (() => {
  const M = { l: 268, r: 24, t: 70, b: 92 };
  const T0 = new Date(2018, 0, 1), TK = new Date(2023, 0, 1), T1 = new Date(2026, 11, 31);
  let svg, root, plot, gEra, gAxis, gDensity, gLinks, gNodes, gLabels, gCursor, gLaneLbl, bigYear;
  let W, H, iw, ih, laneH, x, zx, k = 1, zoom;
  let ready = false, sizeMode = 'mix', showHot = true, showEdges = true, curDate = T1, playing = null, story = null, selId = null, hoverId = null;
  const laneIdx = new Map(LANES.map((l, i) => [l.id, i]));
  const measure = document.createElement('canvas').getContext('2d');
  const textW = (s, px) => { measure.font = `600 ${px}px Inter, "PingFang SC", "Noto Sans CJK SC", sans-serif`; return measure.measureText(s).width; };

  // awesome 论文 → 技术流泳道（标题关键词优先，其次分类）
  function laneOf(p) {
    const t = p.title;
    if (/\bVLA\b|vision[- ]language|language[- ]|foundation model|instruction/i.test(t)) return 'vla';
    if (/world model/i.test(t)) return 'algo';
    if (/teleop|exoskeleton|data collection|egocentric|human video|demonstration|\bUMI\b/i.test(t)) return 'teleop';
    if (/track|mimic|imitat|retarget|motion prior|character|animation/i.test(t)) return 'track';
    if (/loco-?manip|manipulat|whole-body|object|interaction|grasp|dexter|carry|push/i.test(t)) return 'wbc';
    if (/locomot|walk|parkour|terrain|gait|fall|stand|running|jump|stair|biped/i.test(t)) return 'hloco';
    if (/simulat|benchmark|gym\b|engine/i.test(t)) return 'sim';
    if (/reinforcement|policy optimization|world model|off-policy|sample[- ]efficien|Q-learning/i.test(t)) return 'algo';
    return { loco: 'hloco', wbc: 'wbc', teleop: 'teleop', manip: 'wbc', sim: 'sim', sim2real: 'algo', anim: 'track', motion: 'track', nav: 'hloco', state: 'hloco' }[p.cats[0]] || null;
  }

  // ───────── 节点数据 ─────────
  const ms = MILESTONES.map(m => ({ kind: 'ms', id: m.id, m, date: m.date, lane: m.lane, label: m.n, tier: m.tier, cites: m.cites }));
  const latest = d3.max(PAPERS, p => p.year * 12 + p.month - 1) || 2026 * 12;
  const hot = (() => {
    const cand = PAPERS.filter(p => !App.msByArxiv.has(p.arxiv) && p.year * 12 + p.month - 1 > latest - 12).map(p => ({ p, lane: laneOf(p) })).filter(d => d.lane);
    return d3.groups(cand, d => d.lane).flatMap(([lane, arr]) => arr.sort((a, b) => b.p.score - a.p.score).slice(0, 3))
      .map(({ p, lane }) => ({ kind: 'paper', id: p.id, p, date: p.date, lane, label: p.short || p.title.split(/[:：]/)[0].slice(0, 24), tier: 4, cites: p.cites, hot: true }));
  })();
  const all = ms.concat(hot);
  const byId = new Map(all.map(n => [n.id, n]));
  const edges = MILESTONES.flatMap(m => m.from.map(f => ({ s: byId.get(f), t: byId.get(m.id) })));

  function radius(n) {
    if (n.hot) return 4.5 + 5 * n.p.rank;
    const c = n.cites, cr = c == null ? 6 : 3 + 1.55 * Math.log1p(c);
    if (sizeMode === 'cites') return c == null ? 5 : Math.max(3.5, cr);
    if (sizeMode === 'tier') return { 1: 14, 2: 9.5, 3: 6.5 }[n.tier];
    return Math.max({ 1: 12, 2: 8.5, 3: 6 }[n.tier], cr * { 1: 1.12, 2: 1, 3: .9 }[n.tier]);
  }
  const color = n => App.laneById.get(n.lane).color;
  const laneY = l => laneIdx.get(l) * laneH;
  const visible = n => n.date <= curDate && (!n.hot || showHot);

  function init() {
    svg = d3.select('#tl-svg');
    const defs = svg.append('defs');
    defs.append('filter').attr('id', 'tlglow').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%')
      .call(f => { f.append('feGaussianBlur').attr('stdDeviation', 4).attr('result', 'b'); f.append('feMerge').call(m => { m.append('feMergeNode').attr('in', 'b'); m.append('feMergeNode').attr('in', 'SourceGraphic'); }); });
    LANES.forEach(l => {
      const rg = defs.append('radialGradient').attr('id', 'tg-' + l.id).attr('cx', '35%').attr('cy', '35%');
      rg.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', .9);
      rg.append('stop').attr('offset', '40%').attr('stop-color', l.color);
      rg.append('stop').attr('offset', '100%').attr('stop-color', d3.color(l.color).darker(1.5));
    });
    defs.append('clipPath').attr('id', 'tlclip').append('rect');
    bigYear = svg.append('text').attr('class', 'big-year').attr('text-anchor', 'end');
    root = svg.append('g');
    gLaneLbl = root.append('g');
    plot = root.append('g').attr('clip-path', 'url(#tlclip)');
    gEra = plot.append('g'); gDensity = plot.append('g'); gAxis = root.append('g').attr('class', 'axis');
    gLinks = plot.append('g'); gNodes = plot.append('g'); gLabels = plot.append('g'); gCursor = plot.append('g');
    // 缩放作用于 svg 坐标，而绘图区相对 svg 平移了 M.l，需换算到绘图区坐标
    zoom = d3.zoom().scaleExtent([1, 10]).on('zoom', e => { const t = e.transform; k = t.k; zx = d3.zoomIdentity.translate(t.x + (t.k - 1) * M.l, 0).scale(t.k).rescaleX(x); if (ready) render(false); });
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('click', e => { if (e.target.tagName === 'svg' || e.target.classList.contains('lane-bg')) { selId = null; App.closePanel(); highlight(); } });
    buildSide(); buildTimebar();
    resize();
  }

  // ───────── 布局（静态力模拟避免重叠） ─────────
  function layout() {
    all.forEach(n => { n.r = radius(n); n.x0 = x(n.date); n.x = n.x ?? n.x0; n.cy = laneY(n.lane) + laneH * .5; n.y = n.y ?? n.cy + (Math.random() - .5) * 10; });
    const sim = d3.forceSimulation(all).stop()
      .force('x', d3.forceX(n => n.x0).strength(.9))
      .force('y', d3.forceY(n => n.cy - (n.tier === 1 ? 6 : 0)).strength(.06))
      .force('c', d3.forceCollide(n => n.r + 2.5).iterations(2));
    for (let i = 0; i < 260; i++) {
      sim.tick();
      all.forEach(n => { const t = laneY(n.lane) + n.r + 16, b = laneY(n.lane) + laneH - n.r - 6; n.y = Math.max(t, Math.min(b, n.y)); });
    }
    all.forEach(n => { n.dx = n.x - n.x0; });
  }

  function resize() {
    const r = svg.node().getBoundingClientRect(); W = r.width; H = r.height;
    ready = false;
    iw = W - M.l - M.r; ih = H - M.t - M.b; laneH = ih / LANES.length;
    x = d3.scaleTime().domain([T0, TK, T1]).range([0, iw * .22, iw]);
    zx = x; k = 1;
    root.attr('transform', `translate(${M.l},${M.t})`);
    svg.select('#tlclip rect').attr('x', 0).attr('y', -M.t).attr('width', iw + 4).attr('height', H);
    zoom.translateExtent([[M.l, 0], [M.l + iw, H]]).extent([[M.l, 0], [M.l + iw, H]]);
    svg.call(zoom.transform, d3.zoomIdentity);
    bigYear.attr('x', W - 40).attr('y', H - 110).style('font-size', Math.min(W * .16, H * .3) + 'px');
    drawStatic(); layout(); ready = true; render(true);
  }

  // 泳道背景、标签、密度条
  const density = new Map();
  (function () {
    const start = 2023 * 12;
    PAPERS.forEach(p => { const l = laneOf(p), mi = p.year * 12 + p.month - 1; if (!l || mi < start) return; const a = density.get(l) || density.set(l, new Map()).get(l); a.set(mi, (a.get(mi) || 0) + 1); });
  })();
  const dMax = d3.max([...density.values()].flatMap(m => [...m.values()])) || 1;

  function drawStatic() {
    gLaneLbl.selectAll('*').remove();
    LANES.forEach((l, i) => {
      gLaneLbl.append('rect').attr('class', 'lane-bg').attr('x', -8).attr('y', i * laneH).attr('width', iw + 12).attr('height', laneH)
        .attr('fill', i % 2 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,.022)');
      gLaneLbl.append('line').attr('x1', -8).attr('x2', iw + 4).attr('y1', (i + 1) * laneH).attr('y2', (i + 1) * laneH).attr('stroke', 'rgba(0,0,0,.05)');
      const g = gLaneLbl.append('g').attr('transform', `translate(4,${i * laneH + 14})`).style('cursor', 'help')
        .on('mouseenter', e => App.tip(`<div class="tt-title" style="color:${l.color}">${l.name}</div><div class="tt-sub">${l.desc}</div>`, e)).on('mouseleave', App.untip);
      g.append('circle').attr('r', 4).attr('cy', -4).attr('fill', l.color);
      g.append('text').attr('class', 'lane-label').attr('x', 10).attr('fill', l.color).text(l.name);
    });
  }

  // ───────── 渲染（缩放时重算 x） ─────────
  const px = n => zx(n.date) + n.dx;
  function render(animate) {
    // 时代背景
    gEra.selectAll('g.era').data(ERAS).join(enter => {
      const g = enter.append('g').attr('class', 'era');
      g.append('rect').attr('y', -26).attr('height', ih + 26);
      g.append('text').attr('class', 'era-label').attr('y', -32).attr('text-anchor', 'middle');
      g.on('mouseenter', (e, d) => App.tip(`<div class="tt-title">${d.name}</div><div class="tt-sub">${d.desc}</div>`, e)).on('mouseleave', App.untip);
      return g;
    }).each(function (d, i) {
      const a = zx(new Date(d.from[0], d.from[1] - 1, 1)), b = zx(new Date(d.to[0], d.to[1] - 1, 28)), g = d3.select(this);
      g.select('rect').attr('x', a).attr('width', Math.max(0, b - a)).attr('fill', i % 2 ? 'rgba(0,113,227,.035)' : 'rgba(0,0,0,0)');
      g.select('text').attr('x', (a + b) / 2).text(b - a > textW(d.name, 11) + 10 ? d.name : b - a > 40 ? d.name.slice(0, Math.floor((b - a) / 12)) + '…' : '');
    });
    // 坐标轴
    gAxis.attr('transform', 'translate(0,-8)');
    const [d0, d1] = zx.domain().length > 2 ? [zx.invert(0), zx.invert(iw)] : zx.domain();
    const span = (d1 - d0) / 864e5;
    const ticks = span > 1500 ? d3.timeYear.range(d3.timeYear.floor(d0), d1) : span > 500 ? d3.timeMonth.every(3).range(d0, d1) : d3.timeMonth.range(d0, d1);
    gAxis.selectAll('text').data(ticks, d => +d).join('text').attr('x', d => zx(d)).attr('y', 0).attr('text-anchor', 'middle')
      .text(d => d.getMonth() === 0 ? d.getFullYear() : (d.getMonth() + 1) + '月').style('opacity', d => d.getMonth() === 0 ? 1 : .55)
      .style('display', d => zx(d) < -5 || zx(d) > iw + 5 ? 'none' : null);
    gEra.selectAll('line.yl').data(ticks.filter(d => d.getMonth() === 0), d => +d).join('line').attr('class', 'yl')
      .attr('x1', d => zx(d)).attr('x2', d => zx(d)).attr('y1', -20).attr('y2', ih).attr('stroke', 'rgba(0,0,0,.08)').attr('stroke-dasharray', '2 5');
    // 2023 前压缩区提示
    gEra.selectAll('text.cmp').data([0]).join('text').attr('class', 'cmp era-label').attr('x', zx(TK) - 6).attr('y', ih - 6).attr('text-anchor', 'end')
      .style('opacity', .5).style('font-size', '10px').text('← 2023 年前时间压缩');
    // 密度
    const area = d3.area().x(d => zx(new Date(Math.floor(d[0] / 12), d[0] % 12, 15))).y0(0).y1(d => -d[1] / dMax * laneH * .42).curve(d3.curveBasis);
    gDensity.selectAll('path').data(LANES.filter(l => density.has(l.id))).join('path')
      .attr('transform', l => `translate(0,${laneY(l.id) + laneH - 1})`)
      .attr('fill', l => l.color).attr('fill-opacity', .07).attr('stroke', l => l.color).attr('stroke-opacity', .18)
      .attr('d', l => { const m = density.get(l.id); const pts = d3.range(2023 * 12, latest + 1).map(i => [i, m.get(i) || 0]); return area(pts); });

    // 连边
    const ed = showEdges ? edges : [];
    gLinks.selectAll('path').data(ed, d => d.s.id + '>' + d.t.id).join('path').attr('class', 'link flow')
      .attr('stroke', d => color(d.s)).attr('stroke-width', 1.1).attr('stroke-opacity', .32)
      .attr('d', d => { const sx = px(d.s), sy = d.s.y, tx = px(d.t), ty = d.t.y, c = Math.max(30, Math.abs(tx - sx) * .5); return `M${sx},${sy}C${sx + c},${sy} ${tx - c},${ty} ${tx},${ty}`; })
      .style('display', d => visible(d.s) && visible(d.t) ? null : 'none');

    // 节点
    const sel = gNodes.selectAll('g.node').data(all, d => d.id).join(enter => {
      const g = enter.append('g').attr('class', 'node');
      g.append('circle').attr('class', 'halo');
      g.append('circle').attr('class', 'core');
      g.filter(d => d.tier === 1).append('circle').attr('class', 'ring').attr('fill', 'none').attr('stroke-dasharray', '2 4')
        .append('animateTransform').attr('attributeName', 'transform').attr('type', 'rotate').attr('from', '0').attr('to', '360').attr('dur', '14s').attr('repeatCount', 'indefinite');
      g.on('mouseenter', (e, d) => { hoverId = d.id; highlight(); App.tip(tipHtml(d), e); })
        .on('mousemove', (e, d) => App.tip(tipHtml(d), e))
        .on('mouseleave', () => { hoverId = null; highlight(); App.untip(); })
        .on('click', (e, d) => { e.stopPropagation(); selId = d.id; highlight(); App.openPanel(d.kind, d.id); });
      return g;
    });
    sel.attr('transform', d => `translate(${px(d)},${d.y})`);
    sel.select('circle.halo').attr('r', d => d.r * 1.7).attr('fill', color).attr('opacity', d => d.hot ? 0 : .1);
    const core = sel.select('circle.core');
    (animate ? core.transition().duration(500) : core).attr('r', d => d.r)
      .attr('fill', d => d.hot ? d3.color(color(d)).copy({ opacity: .22 }) : color(d))
      .attr('stroke', d => d.hot ? '#ff9500' : '#fff').attr('stroke-width', d => d.hot ? 1.6 : 1.5)
      .attr('stroke-dasharray', d => d.hot ? '2.5 2' : null);
    sel.select('circle.ring').attr('r', d => d.r + 5).attr('stroke', color).attr('stroke-opacity', .55);
    sel.style('display', d => visible(d) ? null : 'none');
    placeLabels();
    highlight();
    drawCursor();
  }

  // 贪心标签避让
  function placeLabels() {
    const boxes = [];
    const items = all.filter(visible).sort((a, b) => (a.tier - b.tier) || ((b.cites || 0) - (a.cites || 0)));
    const out = [];
    const minTier = k >= 2.6 ? 4 : k >= 1.6 ? 3 : 2;
    for (const n of items) {
      const forced = n.id === selId || n.id === hoverId || (story && story.lit.has(n.id));
      if (n.tier > minTier && !forced) continue;
      const fs = n.tier === 1 ? 12.5 : n.tier === 2 ? 11.5 : 10.5, w = textW(n.label, fs), h = fs + 2, X = px(n), Y = n.y;
      const cands = [[X + n.r + 4, Y + fs * .35, 'start'], [X - n.r - 4 - w, Y + fs * .35, 'start'], [X - w / 2, Y - n.r - 5, 'start'], [X - w / 2, Y + n.r + fs + 3, 'start']];
      let placed = null;
      for (const [lx, ly] of cands) {
        const b = [lx - 1, ly - fs, lx + w + 1, ly + 3];
        if (b[0] < 0 || b[2] > iw) continue;
        if (!forced && boxes.some(o => !(b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3]))) continue;
        if (!forced && all.some(o => o !== n && visible(o) && Math.abs(px(o) - (b[0] + b[2]) / 2) < w / 2 + o.r && Math.abs(o.y - (b[1] + b[3]) / 2) < h / 2 + o.r)) continue;
        placed = [lx, ly]; boxes.push(b); break;
      }
      if (placed) out.push({ n, x: placed[0], y: placed[1], fs });
    }
    gLabels.selectAll('text').data(out, d => d.n.id).join('text').attr('class', 'tl-label')
      .attr('x', d => d.x).attr('y', d => d.y).style('font-size', d => d.fs + 'px').style('font-weight', d => d.n.tier <= 2 ? 600 : 400)
      .attr('fill', d => d.n.hot ? '#a05a00' : d.n.tier === 1 ? '#1d1d1f' : '#424245')
      .style('paint-order', 'stroke').style('stroke', 'rgba(255,255,255,.95)').style('stroke-width', '3px').style('pointer-events', 'none')
      .text(d => d.n.label);
  }

  function tipHtml(d) {
    if (d.hot) return `<div class="tt-title">🔥 ${App.esc(d.p.title)}</div><div class="tt-sub">${App.fmtDate(d.date)} · 引用 ${App.fmtNum(d.cites)} · 数据驱动热点</div>`;
    const m = d.m;
    return `<div class="tt-title">${App.esc(m.n)} <span class="stars" style="font-size:10px">${'★'.repeat(4 - m.tier)}</span></div><div class="tt-sub">${App.esc(m.t)}</div>
      <div class="tt-sub">${App.fmtDate(m.date)} · ${App.esc(m.org || '')} · 引用 ${App.fmtNum(m.cites)}</div>`;
  }

  // ───────── 谱系高亮 ─────────
  function lineage(id) {
    const s = new Set([id]);
    const up = i => (App.msById.get(i)?.from || []).forEach(f => { if (!s.has(f)) { s.add(f); up(f); } });
    const down = i => (App.msById.get(i)?.to || []).forEach(t => { if (!s.has(t)) { s.add(t); down(t); } });
    up(id); down(id); return s;
  }
  function highlight() {
    let set = null;
    if (story) set = story.lit;
    else if (hoverId || selId) set = byId.get(hoverId || selId)?.kind === 'ms' ? lineage(hoverId || selId) : new Set([hoverId || selId]);
    gNodes.selectAll('g.node').classed('dim', d => set && !set.has(d.id))
      .select('circle.core').attr('stroke', d => d.id === selId || (story && d.id === story.cur) ? '#1d1d1f' : d.hot ? '#ff9500' : '#fff')
      .attr('stroke-width', d => d.id === selId || (story && d.id === story.cur) ? 3 : d.hot ? 1.6 : 1.5);
    gLinks.selectAll('path').classed('dim', d => set && !(set.has(d.s.id) && set.has(d.t.id))).classed('hl', d => set && set.has(d.s.id) && set.has(d.t.id) && !story);
    gLabels.selectAll('text').classed('dim', d => set && !set.has(d.n.id));
  }

  // ───────── 时间回放 ─────────
  function drawCursor() {
    const cx = zx(curDate), on = curDate < T1;
    // 零宽线条上的滤镜会被裁掉，用多层描边模拟发光
    gCursor.selectAll('line.cur').data(on ? [10, 4, 1.5] : []).join('line').attr('class', 'cur').attr('x1', cx).attr('x2', cx).attr('y1', -22).attr('y2', ih)
      .attr('stroke', '#0071e3').attr('stroke-width', w => w).attr('stroke-opacity', w => w > 5 ? .08 : w > 2 ? .2 : .95).attr('pointer-events', 'none');
    gCursor.selectAll('rect.fut').data(on ? [0] : []).join('rect').attr('class', 'fut').attr('x', cx).attr('y', -22).attr('width', Math.max(0, iw - cx)).attr('height', ih + 22)
      .attr('fill', 'rgba(255,255,255,.55)').attr('pointer-events', 'none');
    gCursor.selectAll('line.cur').raise();
    bigYear.text(on ? curDate.getFullYear() : '');
  }
  function setTime(v, fromPlay) {
    const slider = document.getElementById('tl-time');
    slider.value = v;
    const prev = curDate;
    curDate = v >= 1000 ? T1 : x.invert(v / 1000 * iw);
    document.getElementById('tl-time-label').textContent = v >= 1000 ? '全部' : App.fmtDate(curDate);
    render(false);
    if (fromPlay) all.filter(n => n.date > prev && n.date <= curDate && visible(n) && n.tier <= 2).forEach(n => ripple(n));
  }
  function ripple(n) {
    gCursor.append('circle').attr('class', 'ripple').attr('cx', px(n)).attr('cy', n.y).attr('r', n.r).attr('stroke', color(n)).attr('stroke-width', 2)
      .transition().duration(1300).ease(d3.easeCubicOut).attr('r', n.r * 4.5).attr('opacity', 0).remove();
  }
  function togglePlay() {
    const btn = document.getElementById('tl-play');
    if (playing) { playing.stop(); playing = null; btn.textContent = '▶'; return; }
    stopStory(); svg.call(zoom.transform, d3.zoomIdentity);
    let v = +document.getElementById('tl-time').value; if (v >= 1000) v = 0;
    btn.textContent = '❚❚';
    let last = null;
    playing = d3.timer(t => {
      if (last == null) last = t;
      v += (t - last) * 0.028; last = t;   // 约 36 秒播完
      if (v >= 1000) { setTime(1000); playing.stop(); playing = null; btn.textContent = '▶'; return; }
      setTime(v, true);
    });
  }
  function buildTimebar() {
    document.getElementById('tl-time').oninput = e => { if (playing) togglePlay(); setTime(+e.target.value); };
    document.getElementById('tl-play').onclick = togglePlay;
  }

  // ───────── 侧栏 / 故事线 ─────────
  function buildSide() {
    d3.select('#tl-stories').selectAll('button').data(STORIES).join('button').attr('class', 'path-btn')
      .html(d => `${d.name}<small>${d.steps.length} 步 · ${App.esc(d.desc.slice(0, 26))}…</small>`)
      .on('click', (e, d) => story && story.s === d ? stopStory() : playStory(d.id));
    d3.selectAll('#tl-size button').on('click', function () {
      sizeMode = this.dataset.size; d3.selectAll('#tl-size button').classed('active', function () { return this.dataset.size === sizeMode; });
      layout(); render(true);
    });
    d3.select('#tl-hot').on('change', function () { showHot = this.checked; render(false); });
    d3.select('#tl-edges').on('change', function () { showEdges = this.checked; render(false); });
  }

  function playStory(id) {
    const s = STORIES.find(x => x.id === id); if (!s) return;
    if (playing) togglePlay(); setTime(1000); stopStory(); App.closePanel(); selId = null;
    story = { s, i: -1, lit: new Set(), cur: null, auto: true, timer: null };
    d3.selectAll('#tl-stories .path-btn').classed('active', d => d === s);
    storyStep(1);
  }
  function storyStep(delta) {
    const st = story; if (!st) return;
    st.i = Math.max(0, Math.min(st.s.steps.length - 1, st.i + delta));
    const ids = st.s.steps.slice(0, st.i + 1).map(x => x[0]);
    st.lit = new Set(ids); st.cur = ids[ids.length - 1];
    const n = byId.get(st.cur);
    // 若当前节点不在视野内，平移
    const X = px(n);
    if (X < 40 || X > iw - 40) { const t = d3.zoomTransform(svg.node()); svg.transition().duration(700).call(zoom.translateBy, (iw / 2 - X) / t.k, 0); }
    placeLabels(); highlight(); ripple(n);
    const pts = ids.map(i => byId.get(i));
    gCursor.selectAll('path.trail').data([pts]).join('path').attr('class', 'trail').attr('fill', 'none').attr('stroke', '#0071e3')
      .attr('stroke-width', 2.4).attr('stroke-dasharray', '6 5').style('animation', 'flow 1s linear infinite')
      .attr('d', d3.line(p => px(p), p => p.y).curve(d3.curveCatmullRom.alpha(.5)));
    const cap = document.getElementById('tl-story-caption'); cap.classList.remove('hidden');
    const m = n.m, l = App.laneById.get(m.lane);
    cap.innerHTML = `<div class="cap-head"><span class="cap-step">${st.i + 1} / ${st.s.steps.length}</span><span class="cap-title" style="color:${l.color}">${App.esc(m.n)}</span><span class="muted">${App.fmtDate(m.date)} · ${App.esc(m.org || '')}</span>
      <div class="cap-nav"><button data-a="prev">‹</button><button data-a="auto">${st.auto ? '暂停' : '自动'}</button><button data-a="next">›</button><button data-a="open">详情</button><button data-a="stop">×</button></div></div>
      <div class="cap-text">${App.esc(st.s.steps[st.i][1])}</div><div class="cap-dots">${st.s.steps.map((_, i) => `<i class="${i <= st.i ? 'on' : ''}"></i>`).join('')}</div>`;
    cap.onclick = e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'prev') { st.auto = false; storyStep(-1); } else if (a === 'next') { st.auto = false; storyStep(1); }
      else if (a === 'auto') { st.auto = !st.auto; storyStep(0); } else if (a === 'stop') stopStory();
      else if (a === 'open') { st.auto = false; storyStep(0); App.openPanel('ms', n.id); }
    };
    clearTimeout(st.timer);
    if (st.auto && st.i < st.s.steps.length - 1) st.timer = setTimeout(() => storyStep(1), 4200);
  }
  function stopStory() {
    if (!story) return;
    clearTimeout(story.timer); story = null;
    gCursor.selectAll('path.trail').remove();
    document.getElementById('tl-story-caption').classList.add('hidden');
    d3.selectAll('#tl-stories .path-btn').classed('active', false);
    placeLabels(); highlight();
  }

  return {
    init, resize, togglePlay, playStory,
    focus(id) {
      stopStory(); if (playing) togglePlay(); setTime(1000);
      const n = byId.get(id) || [...byId.values()].find(v => v.p && v.p.id === id); if (!n) return;
      selId = n.id;
      const X = x(n.date), kk = 2.2;
      const txPlot = (iw - 450) / 2 - X * kk;  // 右侧详情面板约 450px
      svg.transition().duration(900).call(zoom.transform, d3.zoomIdentity.translate(txPlot - (kk - 1) * M.l, 0).scale(kk));
      setTimeout(() => { placeLabels(); highlight(); ripple(n); }, 950);
    },
    onSearch(q) {
      if (!gNodes || story) return;
      if (!q) { highlight(); return; }
      const m = new Set(all.filter(n => (n.label + ' ' + (n.m ? n.m.t + ' ' + (n.m.org || '') : n.p.title)).toLowerCase().includes(q)).map(n => n.id));
      gNodes.selectAll('g.node').classed('dim', d => m.size && !m.has(d.id));
    },
    onPanelClose() { selId = null; if (gNodes) { placeLabels(); highlight(); } },
    onEscape() { stopStory(); },
  };
})());
