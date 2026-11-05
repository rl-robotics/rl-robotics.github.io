/* ① RL 星图：力导向知识网络 ⇄ 时间演化布局，学习路径，时间回放 */
App.register('rl', (() => {
  let svg, root, gLinks, gNodes, gLabels, gAxis, bigYear, sim, zoom;
  let W = 0, H = 0, layout = 'force', yearMax = 2026, playing = null, pathRun = null;
  const hiddenGroups = new Set();
  const nodes = RL_NODES.map(n => Object.assign(n, { r: 4 + n.imp * 2.7 }));
  const links = RL_LINKS.filter(([s, t]) => App.rlById.has(s) && App.rlById.has(t)).map(([s, t, type]) => ({ source: s, target: t, type }));
  const groups = RL_GROUPS;
  const color = id => App.groupById.get(id).color;
  // 外环分组排列顺序：相近的方法族相邻
  const ring = ['value', 'ac', 'pg', 'robot', 'frontier', 'il', 'offline', 'model'];
  let linkSel, nodeSel, glabelSel, focusId = null, userZoomed = false;

  // 适配屏幕：留出左侧栏与底部时间条
  function fit(dur = 900) {
    const ns = nodes.filter(n => !hiddenGroups.has(n.g));
    if (!ns.length || !W) return;
    const x0 = d3.min(ns, n => n.x - n.r) - 30, x1 = d3.max(ns, n => n.x + n.r) + 30;
    const y0 = d3.min(ns, n => n.y - n.r) - 40, y1 = d3.max(ns, n => n.y + n.r) + 30;
    const left = W > 900 ? 264 : 10, availW = W - left - 20, availH = H - 96;
    const kk = Math.min(availW / (x1 - x0 + (layout === 'time' ? 140 : 0)), availH / (y1 - y0), 1.6);
    const tx = left + (availW - (x1 - x0) * kk) / 2 - x0 * kk + (layout === 'time' ? 70 * kk : 0), ty = 10 + (availH - (y1 - y0) * kk) / 2 - y0 * kk;
    svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(kk));
  }

  const yearScale = () => d3.scaleLinear().domain([1955, 1988, 2008, 2016, 2026]).range([0.14, 0.3, 0.48, 0.7, 0.98].map(v => v * VW));
  const bandY = g => { const i = groups.findIndex(x => x.id === g); return 60 + (i + 0.5) * (VH - 80) / groups.length; };
  // 分组锚点：基础理论居中，其余方法族环绕；布局在固定的虚拟画布上，再自动缩放适配屏幕
  const VW = 1500, VH = 1000;
  function anchor(g) {
    if (g === 'found') return [VW * 0.5, VH * 0.5];
    const i = ring.indexOf(g), a = -Math.PI / 2 + i * 2 * Math.PI / ring.length;
    return [VW * 0.5 + Math.cos(a) * VW * 0.34, VH * 0.5 + Math.sin(a) * VH * 0.38];
  }

  function init() {
    svg = d3.select('#rl-svg');
    const defs = svg.append('defs');
    defs.append('filter').attr('id', 'glow').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%')
      .call(f => { f.append('feGaussianBlur').attr('stdDeviation', 6).attr('result', 'b'); f.append('feMerge').call(m => { m.append('feMergeNode').attr('in', 'b'); m.append('feMergeNode').attr('in', 'SourceGraphic'); }); });
    groups.forEach(g => {
      const rg = defs.append('radialGradient').attr('id', 'rg-' + g.id).attr('cx', '35%').attr('cy', '35%');
      rg.append('stop').attr('offset', '0%').attr('stop-color', '#ffffff').attr('stop-opacity', .95);
      rg.append('stop').attr('offset', '35%').attr('stop-color', g.color);
      rg.append('stop').attr('offset', '100%').attr('stop-color', d3.color(g.color).darker(1.6));
    });
    bigYear = svg.append('text').attr('class', 'big-year').attr('text-anchor', 'end');
    root = svg.append('g');
    gAxis = root.append('g').attr('class', 'axis');
    gLabels = root.append('g');
    gLinks = root.append('g');
    gNodes = root.append('g');
    zoom = d3.zoom().scaleExtent([0.25, 4]).on('zoom', e => { root.attr('transform', e.transform); if (e.sourceEvent) userZoomed = true; });
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('click', e => { if (e.target === svg.node()) { clearFocus(); App.closePanel(); } });

    linkSel = gLinks.selectAll('path').data(links).join('path')
      .attr('class', d => 'link ' + d.type + (d.type === 'evo' ? ' flow' : ''))
      .attr('stroke', d => d.type === 'evo' ? '#4f8fd8' : d.type === 'use' ? '#b9a3e3' : '#b8bec9')
      .attr('stroke-opacity', d => d.type === 'evo' ? .6 : .45)
      .attr('stroke-width', d => d.type === 'evo' ? 1.4 : 1)
      .attr('stroke-dasharray', d => d.type === 'use' ? '2 4' : null);

    nodeSel = gNodes.selectAll('g').data(nodes, d => d.id).join('g').attr('class', 'node')
      .on('mouseenter', (e, d) => { hover(d); App.tip(`<div class="tt-title">${App.esc(d.name)}</div><div class="tt-sub">${App.esc(d.en)} · ${d.year}</div>`, e); })
      .on('mousemove', (e, d) => App.tip(`<div class="tt-title">${App.esc(d.name)}</div><div class="tt-sub">${App.esc(d.en)} · ${d.year}</div>`, e))
      .on('mouseleave', () => { App.untip(); hover(null); })
      .on('click', (e, d) => { e.stopPropagation(); stopPath(); setFocus(d.id); App.openPanel('rl', d.id); })
      .call(d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(.2).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = d.fy = null; }));
    nodeSel.append('circle').attr('class', 'halo').attr('r', d => d.r * 1.7).attr('fill', d => color(d.g)).attr('opacity', d => .05 + d.imp * .025);
    nodeSel.append('circle').attr('class', 'core').attr('r', d => d.r).attr('fill', d => color(d.g)).attr('stroke', '#fff').attr('stroke-width', 1.8);
    nodeSel.filter(d => d.imp === 5).append('circle').attr('class', 'orbit').attr('r', d => d.r + 6).attr('fill', 'none')
      .attr('stroke', d => color(d.g)).attr('stroke-opacity', .5).attr('stroke-dasharray', '2 5')
      .append('animateTransform').attr('attributeName', 'transform').attr('type', 'rotate').attr('from', '0').attr('to', '360').attr('dur', '18s').attr('repeatCount', 'indefinite');
    nodeSel.append('text').attr('text-anchor', 'middle').attr('dy', d => d.r + 13).style('font-size', d => (9.5 + d.imp * .7) + 'px').style('font-weight', d => d.imp >= 4 ? 600 : 400).text(d => d.name);

    glabelSel = gLabels.selectAll('text').data(groups).join('text').attr('class', 'group-label').attr('fill', d => d.color).attr('text-anchor', 'middle').text(d => d.name);

    sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.source.g === d.target.g ? 50 : 140).strength(d => d.source.g === d.target.g ? .3 : .01))
      .force('charge', d3.forceManyBody().strength(-160).distanceMax(260))
      .force('collide', d3.forceCollide(d => d.r + 14).iterations(2))
      .on('tick', tick)
      .on('end', () => { if (!userZoomed) fit(); });
    buildSide();
    buildTimebar();
    resize();
  }

  function setForces() {
    if (layout === 'force') {
      sim.force('x', d3.forceX(d => anchor(d.g)[0]).strength(.16));
      sim.force('y', d3.forceY(d => anchor(d.g)[1]).strength(.16));
      sim.force('link').strength(d => d.source.g === d.target.g ? .3 : .01);
      sim.force('charge').strength(-160);
    } else {
      const xs = yearScale();
      sim.force('x', d3.forceX(d => xs(d.year)).strength(.9));
      sim.force('y', d3.forceY(d => bandY(d.g)).strength(.5));
      sim.force('link').strength(0);
      sim.force('charge').strength(0);
    }
    userZoomed = false;
    linkSel.transition().duration(600).attr('stroke-opacity', d => (d.type === 'evo' ? .6 : .45) * (layout === 'time' ? .4 : 1));
    sim.alpha(.9).restart();
    drawAxis();
    setTimeout(() => { if (!userZoomed) fit(); }, 900);
  }

  function drawAxis() {
    gAxis.selectAll('*').remove();
    if (layout !== 'time') return;
    const xs = yearScale();
    [1960, 1970, 1980, 1990, 2000, 2005, 2010, 2013, 2016, 2018, 2020, 2022, 2024, 2026].forEach(y => {
      gAxis.append('line').attr('x1', xs(y)).attr('x2', xs(y)).attr('y1', 40).attr('y2', VH - 10).attr('stroke-dasharray', '2 6');
      gAxis.append('text').attr('x', xs(y)).attr('y', 32).attr('text-anchor', 'middle').text(y);
    });
    groups.forEach((g, i) => gAxis.insert('rect', ':first-child').attr('x', xs(1955) - 200).attr('width', VW - xs(1955) + 230).attr('y', bandY(g.id) - bandH() / 2).attr('height', bandH())
      .attr('fill', i % 2 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,.025)').attr('stroke', 'none'));
    groups.forEach(g => gAxis.append('text').attr('x', xs(1955) - 30).attr('y', bandY(g.id) + 4).attr('text-anchor', 'end')
      .attr('fill', g.color).style('font-family', 'inherit').style('font-weight', 700).style('opacity', .7).text(g.name));
    gAxis.selectAll('text').style('opacity', 0).transition().duration(800).style('opacity', function () { return this.style.fontWeight ? .7 : 1; });
  }

  const curve = d => {
    const sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y, dx = tx - sx, dy = ty - sy;
    const k = layout === 'time' ? .25 : .12;
    return `M${sx},${sy}Q${(sx + tx) / 2 - dy * k},${(sy + ty) / 2 + dx * k} ${tx},${ty}`;
  };
  const bandH = () => (VH - 80) / groups.length;
  function tick() {
    if (layout === 'time') nodes.forEach(d => { const c = bandY(d.g), h = bandH() / 2 - d.r - 4; d.y = Math.max(c - h, Math.min(c + h, d.y)); });
    linkSel.attr('d', curve);
    nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
    if (layout === 'force') {
      glabelSel.style('display', null).each(function (g) {
        const ns = nodes.filter(n => n.g === g.id); if (!ns.length) return;
        const cx = d3.mean(ns, n => n.x), top = d3.min(ns, n => n.y - n.r);
        d3.select(this).attr('x', cx).attr('y', top - 26);
      });
    } else glabelSel.style('display', 'none');
  }

  // ───────── 高亮 / 聚焦 ─────────
  function neighbors(id) {
    const s = new Set([id]); const n = App.rlById.get(id);
    n.inL.forEach(l => s.add(l.id)); n.outL.forEach(l => s.add(l.id)); return s;
  }
  function applyHighlight(set, strongLinks) {
    nodeSel.classed('dim', d => set && !set.has(d.id));
    linkSel.classed('dim', d => set && !(set.has(d.source.id) && set.has(d.target.id) && (!strongLinks || strongLinks(d))))
      .classed('hl', d => set && set.has(d.source.id) && set.has(d.target.id) && (!strongLinks || strongLinks(d)));
  }
  function hover(d) {
    if (pathRun) return;
    if (d) applyHighlight(neighbors(d.id), l => l.source.id === d.id || l.target.id === d.id);
    else if (focusId) applyHighlight(neighbors(focusId), l => l.source.id === focusId || l.target.id === focusId);
    else applyHighlight(null);
  }
  function setFocus(id) {
    focusId = id; hover(null);
    nodeSel.select('circle.core').attr('stroke-width', d => d.id === id ? 3.5 : 1.8).attr('stroke', d => d.id === id ? '#1d1d1f' : '#fff');
  }
  function clearFocus() { focusId = null; setFocus(null); }
  function centerOn(d, k = 1.4) {
    userZoomed = true;  // 防止布局结束时的自动适配覆盖聚焦
    const cx = (W - (App.panelOpen ? 450 : 0)) / 2;
    svg.transition().duration(900).call(zoom.transform, d3.zoomIdentity.translate(cx - d.x * k, H / 2 - d.y * k).scale(k));
  }

  // ───────── 侧栏 ─────────
  function buildSide() {
    const lg = d3.select('#rl-legend').selectAll('div').data(groups).join('div').attr('class', 'lg-item')
      .attr('title', d => d.desc)
      .html(d => `<span class="sw" style="color:${d.color}"></span>${d.name}<span class="cnt">${nodes.filter(n => n.g === d.id).length}</span>`)
      .on('click', function (e, d) {
        hiddenGroups.has(d.id) ? hiddenGroups.delete(d.id) : hiddenGroups.add(d.id);
        d3.select(this).classed('off', hiddenGroups.has(d.id)); applyVisibility();
      })
      .on('dblclick', (e, d) => { // 双击：只看这一组
        const only = hiddenGroups.size === groups.length - 1 && !hiddenGroups.has(d.id);
        hiddenGroups.clear(); if (!only) groups.forEach(g => g.id !== d.id && hiddenGroups.add(g.id));
        lg.classed('off', g => hiddenGroups.has(g.id)); applyVisibility();
      });
    d3.selectAll('#rl-layout button').on('click', function () {
      layout = this.dataset.layout;
      d3.selectAll('#rl-layout button').classed('active', function () { return this.dataset.layout === layout; });
      setForces();
    });
    d3.select('#rl-paths').selectAll('button').data(RL_PATHS).join('button').attr('class', 'path-btn')
      .html(d => `${d.name}<small>${d.nodes.length} 步 · ${d.nodes.slice(0, 3).map(id => App.rlById.get(id).name).join(' → ')} …</small>`)
      .on('click', (e, d) => pathRun && pathRun.path === d ? stopPath() : runPath(d));
  }

  function applyVisibility() {
    const vis = d => !hiddenGroups.has(d.g) && d.year <= yearMax;
    nodeSel.transition().duration(450).style('opacity', d => vis(d) ? 1 : 0).style('pointer-events', d => vis(d) ? null : 'none');
    linkSel.transition().duration(450).style('opacity', d => vis(d.source) && vis(d.target) ? null : 0);
    glabelSel.style('opacity', g => hiddenGroups.has(g.id) || !nodes.some(n => n.g === g.id && n.year <= yearMax) ? 0 : null);
  }

  // ───────── 时间回放 ─────────
  function buildTimebar() {
    const slider = document.getElementById('rl-year'), label = document.getElementById('rl-year-label');
    slider.oninput = () => setYear(+slider.value);
    document.getElementById('rl-play').onclick = togglePlay;
    function setYear(y) {
      const prev = yearMax; yearMax = y; slider.value = y; label.textContent = y;
      bigYear.text(y < 2026 ? y : '');
      applyVisibility();
      nodes.filter(n => n.year > prev && n.year <= y && !hiddenGroups.has(n.g)).forEach(ripple);
    }
    App._rlSetYear = setYear;
  }
  function ripple(n) {
    gNodes.append('circle').attr('class', 'ripple').attr('cx', n.x).attr('cy', n.y).attr('r', n.r)
      .attr('stroke', color(n.g)).attr('stroke-width', 2).attr('opacity', .9)
      .transition().duration(1200).ease(d3.easeCubicOut).attr('r', n.r * 5).attr('opacity', 0).remove();
  }
  function togglePlay() {
    const btn = document.getElementById('rl-play');
    if (playing) { clearInterval(playing); playing = null; btn.textContent = '▶'; return; }
    stopPath();
    const years = [...new Set(nodes.map(n => n.year))].sort((a, b) => a - b);
    let i = 0; App._rlSetYear(years[0] - 1); btn.textContent = '❚❚';
    playing = setInterval(() => {
      if (i >= years.length) { clearInterval(playing); playing = null; btn.textContent = '▶'; App._rlSetYear(2026); return; }
      App._rlSetYear(years[i++]);
    }, 650);
  }

  // ───────── 学习路径 ─────────
  function runPath(path) {
    stopPath(); if (playing) togglePlay(); App._rlSetYear(2026);
    App.closePanel();
    pathRun = { path, i: -1, timer: null, auto: true };
    d3.selectAll('#rl-paths .path-btn').classed('active', d => d === path);
    step(1);
  }
  function step(delta) {
    const pr = pathRun; if (!pr) return;
    pr.i = Math.max(0, Math.min(pr.path.nodes.length - 1, pr.i + delta));
    const lit = new Set(pr.path.nodes.slice(0, pr.i + 1));
    const order = new Map(pr.path.nodes.map((id, i) => [id, i]));
    applyHighlight(lit);
    const cur = App.rlById.get(pr.path.nodes[pr.i]);
    nodeSel.select('circle.core').attr('stroke', d => d.id === cur.id ? '#1d1d1f' : '#fff').attr('stroke-width', d => d.id === cur.id ? 3.5 : 1.8);
    ripple(cur);
    // 路径上前后两步之间画一条金色轨迹
    const pts = pr.path.nodes.slice(0, pr.i + 1).map(id => App.rlById.get(id));
    gLinks.selectAll('path.trail').data([pts]).join('path').attr('class', 'trail link').attr('fill', 'none')
      .attr('stroke', '#0071e3').attr('stroke-width', 2.4).attr('stroke-opacity', .85).attr('stroke-dasharray', '6 5')
      .style('animation', 'flow 1s linear infinite').attr('d', d3.line(p => p.x, p => p.y).curve(d3.curveCatmullRom.alpha(.5)));
    const cap = document.getElementById('rl-path-caption');
    cap.classList.remove('hidden');
    const first = cur.s.split(/[。]/)[0] + '。';
    cap.innerHTML = `<div class="cap-head"><span class="cap-step">${pr.i + 1} / ${pr.path.nodes.length}</span><span class="cap-title" style="color:${color(cur.g)}">${App.esc(cur.name)}</span><span class="muted">${App.esc(cur.en)} · ${cur.year}</span>
      <div class="cap-nav"><button data-a="prev">‹</button><button data-a="auto">${pr.auto ? '暂停' : '自动'}</button><button data-a="next">›</button><button data-a="open">简介</button><button data-a="learn" class="pri">读这一课</button><button data-a="stop">×</button></div></div>
      <div class="cap-text">${App.esc(first)}</div><div class="cap-dots">${pr.path.nodes.map((_, i) => `<i class="${i <= pr.i ? 'on' : ''}"></i>`).join('')}</div>`;
    cap.onclick = e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'prev') { pr.auto = false; step(-1); } else if (a === 'next') { pr.auto = false; step(1); }
      else if (a === 'auto') { pr.auto = !pr.auto; step(0); } else if (a === 'stop') stopPath(); else if (a === 'open') { pr.auto = false; step(0); App.openPanel('rl', cur.id); }
      else if (a === 'learn') { stopPath(); App.go('/learn/' + cur.id); }
    };
    clearTimeout(pr.timer);
    if (pr.auto && pr.i < pr.path.nodes.length - 1) pr.timer = setTimeout(() => step(1), 2600);
    void order;
  }
  function stopPath() {
    if (!pathRun) return;
    clearTimeout(pathRun.timer); pathRun = null;
    gLinks.selectAll('path.trail').remove();
    document.getElementById('rl-path-caption').classList.add('hidden');
    d3.selectAll('#rl-paths .path-btn').classed('active', false);
    setFocus(focusId);
  }

  function resize() {
    const r = svg.node().getBoundingClientRect(); W = r.width; H = r.height;
    bigYear.attr('x', W - 40).attr('y', H - 90).style('font-size', Math.min(W, H) * 0.22 + 'px');
    if (!resize.done) { resize.done = true; setForces(); } else fit(400);
  }

  return {
    init, resize, fit: () => fit(),
    activate() { if (sim) sim.alpha(.3).restart(); },
    focus(id) {
      stopPath(); hiddenGroups.clear(); d3.selectAll('#rl-legend .lg-item').classed('off', false);
      App._rlSetYear(2026); setFocus(id);
      const d = App.rlById.get(id); setTimeout(() => centerOn(d), 60);
    },
    onSearch(q) {
      if (!nodeSel || pathRun) return;
      if (!q) { hover(null); return; }
      const m = new Set(nodes.filter(n => `${n.name} ${n.en}`.toLowerCase().includes(q)).map(n => n.id));
      applyHighlight(m.size ? m : null);
    },
    onPanelClose() { clearFocus(); },
    onEscape() { stopPath(); },
    togglePlay,
  };
})());
