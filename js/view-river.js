/* ③ 论文星河：月度堆叠流图、全部论文蜂群图、关键词热度、影响力榜单 */
App.register('river', (() => {
  const CATS = App.CATS;
  const off = new Set();
  const papers = PAPERS.map(p => Object.assign(p, { cat: p.cats[0] }));
  const latestIdx = d3.max(papers, p => p.year * 12 + p.month - 1);
  const START = 2023 * 12;  // 流图与关键词从 2023 年开始
  let query = '', kwActive = null, topMode = 'score', swarmNodes = null, swarmSel = null, drawn = false;

  const KW = [
    { name: '运动跟踪 / 模仿', re: /track|mimic|imitat/i },
    { name: '移动操作 Loco-Manip', re: /loco-?manip|mobile manip/i },
    { name: 'VLA / 语言指令', re: /\bVLA\b|vision[- ]language|language/i },
    { name: '遥操作', re: /teleop/i },
    { name: '人类视频 / 第一视角', re: /video|egocentric|human data|from humans?\b/i },
    { name: '世界模型', re: /world model/i },
    { name: '扩散 / Flow', re: /diffusion|flow[- ]matching|\bflow\b/i },
    { name: '力 / 触觉 / 接触', re: /force|tactile|touch|contact/i },
    { name: '跑酷 / 敏捷 / 运动员', re: /parkour|agile|athlet|sprint|tennis|soccer|basketball|boxing/i },
    { name: '灵巧手', re: /dexter|hand/i },
    { name: 'Sim-to-Real 对齐', re: /sim-?to-?real|sim2real|real-?to-?sim/i },
    { name: '感知运动 / 地形', re: /perceptive|terrain|stair|vision-based loco/i },
  ];
  const monthDate = i => new Date(Math.floor(i / 12), i % 12, 15);
  const matches = p => (!query || p.title.toLowerCase().includes(query)) && (!kwActive || kwActive.re.test(p.title));

  function init() {
    document.getElementById('river-meta').textContent = `${papers.length} 篇 · 更新于 ${window.PAPERS_META ? PAPERS_META.generated : '—'}`;
    d3.select('#river-cats').selectAll('span').data(CATS).join('span').attr('class', 'chip').style('color', d => d.color)
      .html(d => `${d.name} <b style="opacity:.6">${papers.filter(p => p.cat === d.id).length}</b>`)
      .on('click', function (e, d) { off.has(d.id) ? off.delete(d.id) : off.add(d.id); d3.select(this).classed('off', off.has(d.id)); drawStream(); styleSwarm(); drawTop(); });
    d3.selectAll('#top-mode button').on('click', function () {
      topMode = this.dataset.mode; d3.selectAll('#top-mode button').classed('active', function () { return this.dataset.mode === topMode; }); drawTop();
    });
    drawKeywords(); drawTop();
  }
  function activate() {
    if (!drawn) { drawn = true; requestAnimationFrame(() => { drawStream(true); drawSwarm(); }); }
  }

  // ───────── 堆叠流图 ─────────
  function drawStream(animate) {
    const svg = d3.select('#stream-svg'); svg.selectAll('*').remove();
    const W = svg.node().getBoundingClientRect().width, H = 230, m = { l: 34, r: 14, t: 10, b: 24 };
    const months = d3.range(START, latestIdx + 1);
    const cats = CATS.filter(c => !off.has(c.id));
    const rows = months.map(i => { const r = { i }; cats.forEach(c => r[c.id] = 0); return r; });
    papers.forEach(p => { const i = p.year * 12 + p.month - 1 - START; if (i >= 0 && rows[i] && r0(p)) rows[i][p.cat]++; });
    function r0(p) { return !off.has(p.cat); }
    const stack = d3.stack().keys(cats.map(c => c.id)).offset(d3.stackOffsetSilhouette).order(d3.stackOrderInsideOut)(rows);
    const x = d3.scaleTime().domain([monthDate(START), monthDate(latestIdx)]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([d3.min(stack, s => d3.min(s, d => d[0])), d3.max(stack, s => d3.max(s, d => d[1]))]).range([H - m.b, m.t]);
    const area = d3.area().x(d => x(monthDate(d.data.i))).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveBasis);
    const clip = svg.append('clipPath').attr('id', 'stream-clip').append('rect').attr('x', 0).attr('y', 0).attr('height', H).attr('width', animate ? 0 : W);
    if (animate) clip.transition().duration(1800).ease(d3.easeCubicInOut).attr('width', W);
    const g = svg.append('g').attr('clip-path', 'url(#stream-clip)');
    g.selectAll('path').data(stack).join('path').attr('d', area)
      .attr('fill', d => App.catById.get(d.key).color).attr('fill-opacity', .72).attr('stroke', '#fff').attr('stroke-width', .6);
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b + 4})`).call(d3.axisBottom(x).ticks(d3.timeMonth.every(3)).tickFormat(d => d.getMonth() === 0 ? d.getFullYear() : (d.getMonth() + 1) + '月').tickSize(0)).select('.domain').remove();
    // 悬停竖线
    const hl = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', '#1d1d1f').attr('stroke-opacity', 0).attr('pointer-events', 'none');
    svg.on('mousemove', e => {
      const [mx] = d3.pointer(e); const d = x.invert(mx); const i = Math.round(d.getFullYear() * 12 + d.getMonth() + d.getDate() / 30 - .5) - START;
      const r = rows[Math.max(0, Math.min(rows.length - 1, i))]; if (!r) return;
      hl.attr('x1', x(monthDate(r.i))).attr('x2', x(monthDate(r.i))).attr('stroke-opacity', .8);
      const tot = d3.sum(cats, c => r[c.id]);
      App.tip(`<div class="tt-title">${App.fmtDate(monthDate(r.i))} · 新增 ${tot} 篇</div>` + cats.filter(c => r[c.id]).sort((a, b) => r[b.id] - r[a.id])
        .map(c => `<div class="tt-sub"><span style="color:${c.color}">●</span> ${c.name}：${r[c.id]}</div>`).join(''), e);
    }).on('mouseleave', () => { hl.attr('stroke-opacity', 0); App.untip(); });
    // 累计曲线标注
    const total = papers.filter(p => p.year * 12 + p.month - 1 >= START).length;
    svg.append('text').attr('x', m.l + 4).attr('y', m.t + 12).attr('fill', '#6e6e73').style('font-size', '12px').text(`2023 年至今 ${total} 篇；最近 6 个月 ${papers.filter(p => p.year * 12 + p.month - 1 > latestIdx - 6).length} 篇`);
  }

  // ───────── 蜂群图 ─────────
  function drawSwarm() {
    const svg = d3.select('#swarm-svg'); svg.selectAll('*').remove();
    const W = svg.node().getBoundingClientRect().width, H = 620, m = { l: 150, r: 16, t: 14, b: 26 };
    const OLD = new Date(2022, 6, 1);
    const x = d3.scaleTime().domain([new Date(2021, 0, 1), OLD, monthDate(latestIdx + 1)]).range([m.l, m.l + 40, W - m.r]);
    const counts = d3.rollup(papers, v => v.length, p => p.cat);
    const weights = CATS.map(c => Math.sqrt(counts.get(c.id) || 1)), tw = d3.sum(weights);
    let acc = m.t; const band = new Map();
    CATS.forEach((c, i) => { const h = (H - m.t - m.b) * weights[i] / tw; band.set(c.id, [acc, acc + h]); acc += h; });
    swarmNodes = papers.map(p => {
      const [a, b] = band.get(p.cat);
      return { p, r: 1.6 + 7.5 * p.rank ** 2.2, x0: x(p.date < OLD ? new Date(2021, 6, 1) : p.date), cy: (a + b) / 2, a, b };
    });
    swarmNodes.forEach(n => { n.x = n.x0; n.y = n.cy + (Math.random() - .5) * (n.b - n.a) * .6; });
    const sim = d3.forceSimulation(swarmNodes).stop().force('x', d3.forceX(n => n.x0).strength(.6)).force('y', d3.forceY(n => n.cy).strength(.04)).force('c', d3.forceCollide(n => n.r + .6));
    for (let i = 0; i < 160; i++) { sim.tick(); swarmNodes.forEach(n => { n.y = Math.max(n.a + n.r + 1, Math.min(n.b - n.r - 1, n.y)); }); }

    const gBand = svg.append('g');
    CATS.forEach((c, i) => {
      const [a, b] = band.get(c.id);
      gBand.append('rect').attr('x', m.l - 6).attr('width', W - m.l - m.r + 6).attr('y', a).attr('height', b - a).attr('fill', i % 2 ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,.7)');
      gBand.append('text').attr('x', m.l - 14).attr('y', (a + b) / 2 + 4).attr('text-anchor', 'end').attr('fill', c.color).style('font-size', '11.5px').style('font-weight', 600).text(c.name);
    });
    svg.append('text').attr('x', x(new Date(2021, 6, 1))).attr('y', H - 6).attr('text-anchor', 'middle').attr('fill', '#86868b').style('font-size', '10px').text('≤2022H1');
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b + 4})`)
      .call(d3.axisBottom(x).tickValues(d3.timeMonth.every(3).range(OLD, monthDate(latestIdx + 1))).tickFormat(d => d.getMonth() === 0 ? d.getFullYear() : (d.getMonth() + 1) + '月').tickSize(0)).select('.domain').remove();
    swarmSel = svg.append('g').selectAll('circle').data(swarmNodes).join('circle')
      .attr('cx', n => n.x).attr('cy', n => n.y).attr('r', 0)
      .attr('fill', n => App.catById.get(n.p.cat).color).attr('fill-opacity', n => .35 + .55 * n.p.rank)
      .attr('stroke', n => n.p.open ? 'rgba(0,0,0,.35)' : 'none').attr('stroke-width', .6).style('cursor', 'pointer')
      .on('mouseenter', function (e, n) {
        d3.select(this).raise().attr('stroke', '#1d1d1f').attr('stroke-width', 2);
        App.tip(`<div class="tt-title">${App.esc(n.p.title)}</div><div class="tt-sub">${App.fmtDate(n.p.date)} · ${App.esc(App.venueOf(n.p))} · 引用 ${App.fmtNum(n.p.cites)}${n.p.open ? ' · 开源' : ''}</div>`, e);
      })
      .on('mousemove', (e, n) => App.tip(`<div class="tt-title">${App.esc(n.p.title)}</div><div class="tt-sub">${App.fmtDate(n.p.date)} · ${App.esc(App.venueOf(n.p))} · 引用 ${App.fmtNum(n.p.cites)}${n.p.open ? ' · 开源' : ''}</div>`, e))
      .on('mouseleave', function (e, n) { d3.select(this).attr('stroke', n.p.open ? 'rgba(0,0,0,.35)' : 'none').attr('stroke-width', .6); App.untip(); })
      .on('click', (e, n) => App.openPanel('paper', n.p.id));
    swarmSel.transition().delay(n => (n.x - m.l) / (W - m.l) * 1800).duration(500).ease(d3.easeBackOut).attr('r', n => n.r);
    styleSwarm();
  }
  function styleSwarm() {
    if (!swarmSel) return;
    const filt = !!(query || kwActive);
    swarmSel.style('opacity', n => off.has(n.p.cat) ? .04 : filt ? (matches(n.p) ? 1 : .08) : null)
      .style('pointer-events', n => off.has(n.p.cat) ? 'none' : null);
  }

  // ───────── 关键词热度 ─────────
  function drawKeywords() {
    const qs = d3.range(Math.floor(START / 3), Math.floor(latestIdx / 3) + 1);
    const qCount = new Map(qs.map(q => [q, 0]));
    papers.forEach(p => { const q = Math.floor((p.year * 12 + p.month - 1) / 3); if (qCount.has(q)) qCount.set(q, qCount.get(q) + 1); });
    const data = KW.map(kw => {
      const c = new Map(qs.map(q => [q, 0]));
      papers.forEach(p => { const q = Math.floor((p.year * 12 + p.month - 1) / 3); if (c.has(q) && kw.re.test(p.title)) c.set(q, c.get(q) + 1); });
      const share = qs.map(q => qCount.get(q) ? c.get(q) / qCount.get(q) : 0);
      const recent = d3.mean(share.slice(-2)), before = d3.mean(share.slice(-6, -2)) || 1e-9;
      return { kw, counts: qs.map(q => c.get(q)), share, total: d3.sum(qs, q => c.get(q)), trend: recent / before - 1, recentShare: recent };
    }).sort((a, b) => b.total - a.total);
    const cards = d3.select('#kw-grid').selectAll('div').data(data).join('div').attr('class', 'kw-card')
      .attr('title', d => `占季度论文比例：最近两季 ${(d.recentShare * 100).toFixed(1)}%（点击在蜂群图中高亮）`)
      .on('click', function (e, d) {
        kwActive = kwActive === d.kw ? null : d.kw;
        cards.classed('active', x => x.kw === kwActive); styleSwarm();
        if (kwActive) document.getElementById('swarm-svg').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    cards.html(d => {
      const up = d.trend >= 0, col = d.trend > .15 ? '#2f9e5a' : d.trend < -.15 ? '#e5484d' : '#86868b';
      return `<div class="kw-name"><span>${d.kw.name}</span><span class="kw-trend" style="color:${col}">${up ? '▲' : '▼'} ${Math.abs(d.trend * 100).toFixed(0)}%</span></div>
        <div class="muted" style="font-size:11px">${d.total} 篇 · 占比 ${(d.recentShare * 100).toFixed(1)}%</div><svg></svg>`;
    });
    cards.each(function (d) {
      const svg = d3.select(this).select('svg'), W = this.getBoundingClientRect().width - 22 || 170, H = 44;
      const x = d3.scaleLinear().domain([0, d.counts.length - 1]).range([0, W]), y = d3.scaleLinear().domain([0, d3.max(d.counts) || 1]).range([H - 2, 4]);
      svg.attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'none');
      svg.append('path').attr('d', d3.area().x((v, i) => x(i)).y0(H).y1(v => y(v)).curve(d3.curveMonotoneX)(d.counts)).attr('fill', 'rgba(0,113,227,.1)');
      svg.append('path').attr('d', d3.line().x((v, i) => x(i)).y(v => y(v)).curve(d3.curveMonotoneX)(d.counts)).attr('fill', 'none').attr('stroke', '#0071e3').attr('stroke-width', 1.6).attr('vector-effect', 'non-scaling-stroke');
    });
  }

  // ───────── 影响力榜单 ─────────
  function drawTop() {
    let arr = papers.filter(p => !off.has(p.cat) && matches(p));
    const key = topMode === 'cites' ? p => p.cites || 0 : topMode === 'vel' ? p => p.vel || 0 : p => p.score;
    if (topMode === 'recent') arr = arr.filter(p => p.year * 12 + p.month - 1 > latestIdx - 6);
    arr = arr.sort((a, b) => key(b) - key(a)).slice(0, 20);
    const mx = d3.max(arr, key) || 1;
    d3.select('#top-list').selectAll('li').data(arr, p => p.id).join('li')
      .html(p => `<div style="min-width:0"><div class="tl-t">${App.esc(p.short ? p.short + ' — ' + p.title.split(':').slice(1).join(':') : p.title)}</div>
        <div class="tl-m">${App.fmtDate(p.date)} · ${App.esc(App.venueOf(p))} · 引用 ${App.fmtNum(p.cites)} · 月均 ${p.vel}</div></div>
        <div class="tl-bar"><i style="width:${key(p) / mx * 100}%;background:${App.catById.get(p.cat).color}"></i></div>`)
      .on('click', (e, p) => App.openPanel('paper', p.id));
  }

  return {
    init, activate,
    resize() { if (drawn) { drawStream(); drawSwarm(); } },
    focus(id) {
      activate();
      setTimeout(() => {
        if (!swarmSel) return;
        const n = swarmNodes.find(n => n.p.id === id); if (!n) return;
        document.getElementById('swarm-svg').scrollIntoView({ behavior: 'smooth', block: 'center' });
        swarmSel.filter(d => d === n).raise().transition().duration(300).attr('r', n.r + 8).attr('stroke', '#1d1d1f').attr('stroke-width', 2.5)
          .transition().duration(900).attr('r', n.r + 3);
      }, 400);
    },
    onSearch(q) { query = q; styleSwarm(); if (document.getElementById('top-list').children.length) drawTop(); },
  };
})());
