/* 首页：告诉用户"想学的内容在哪里" */
App.register('home', (() => {
  const root = document.getElementById('home-root');
  const deepCount = Object.keys(LESSONS).length;
  const deepItems = Object.values(window.DEEP || {}).reduce((n, v) => n + v.length, 0);
  let carIdx = 0, carTimer = null;

  // 入口卡片的小插图（线稿）
  const ART = {
    learn: `<svg class="t-art" viewBox="0 0 170 120"><path d="M10 100 C50 100 40 40 85 50 S130 20 160 15" fill="none" stroke="#0071e3" stroke-width="2.5" stroke-dasharray="4 6"/>${[[10, 100], [55, 70], [85, 50], [125, 32], [160, 15]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 4 ? 9 : 6}" fill="${i < 3 ? '#0071e3' : '#fff'}" stroke="#0071e3" stroke-width="2"/>`).join('')}</svg>`,
    map: `<svg class="t-art" viewBox="0 0 170 120">${[[40, 40, 30, 70], [40, 40, 90, 30], [90, 30, 130, 60], [30, 70, 80, 90], [80, 90, 130, 60], [90, 30, 80, 90]].map(l => `<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" stroke="#c7ccd6" stroke-width="1.5"/>`).join('')}${[[40, 40, 9, '#0071e3'], [90, 30, 7, '#e8890c'], [130, 60, 11, '#e5484d'], [30, 70, 6, '#0a9d8f'], [80, 90, 8, '#8e4ec6']].map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="${c[3]}"/>`).join('')}</svg>`,
    timeline: `<svg class="t-art" viewBox="0 0 170 120">${[0, 1, 2, 3].map(i => `<line x1="10" x2="160" y1="${22 + i * 26}" y2="${22 + i * 26}" stroke="#e8e8ed" stroke-width="14" stroke-linecap="round"/>`).join('')}${[[30, 22, 4], [70, 22, 6], [120, 22, 8], [55, 48, 5], [110, 48, 9], [140, 74, 7], [90, 74, 4], [130, 100, 10], [80, 100, 5]].map(c => `<circle cx="${c[0]}" cy="${c[1]}" r="${c[2]}" fill="${['#0071e3', '#d6409f', '#e8890c', '#8e4ec6'][Math.floor((c[1] - 22) / 26)]}"/>`).join('')}</svg>`,
    papers: `<svg class="t-art" viewBox="0 0 170 120"><path d="M10 100 C40 98 60 90 80 75 S120 30 160 12 L160 110 L10 110 Z" fill="rgba(0,113,227,.12)"/><path d="M10 100 C40 98 60 90 80 75 S120 30 160 12" fill="none" stroke="#0071e3" stroke-width="2.5"/></svg>`,
  };

  function html() {
    const chs = App.chapters.slice(0, -1);
    const totalLessons = chs.reduce((a, c) => a + c.lessons.length, 0);
    return `
    <section class="hero wrap">
      <div class="kicker reveal">RL × Robotics 学习地图</div>
      <h1 class="display reveal">从零读懂强化学习，<br>看清机器人运控的演进。</h1>
      <p class="lead reveal">一条循序渐进的学习路线，三张可交互的全景图。<span class="muted">不需要先懂公式——从第一课开始，每个概念都有直觉解释、公式逐项拆解和延伸阅读。</span></p>
      <div class="cta-row reveal">
        <a class="pill primary lg" href="#/learn/intro">开始第一课 →</a>
        <a class="pill lg" href="#/learn">查看完整路线</a>
      </div>
      <div class="hero-card reveal"><svg id="hero-svg"></svg></div>
      <div class="floating-note reveal">
        <div><b>${totalLessons} 节课 · ${deepCount} 节精讲 · ${deepItems} 个可展开的深入讲解</b><span>逐步推导、数值案例、Python 代码，以及 10 种互动演示</span></div>
        <a class="pill primary" href="#/learn">学习路线</a>
      </div>
    </section>

    <section class="section wrap">
      <div class="section-head reveal"><h2>你想做什么？</h2><p>四个入口，<b>对应四种需求</b>。不确定的话，从第一个开始。</p></div>
      <div class="tiles">
        <div class="tile reveal" data-go="/learn">${ART.learn}<div class="t-num">01 · 学习路线</div><h3>我是新手，<br>想系统地学 RL</h3>
          <p>9 章课程，从"什么是强化学习"一路讲到 PPO 和机器人 sim-to-real。每节都有直觉、公式、例子、自测题；想深入时可展开逐步推导、数值案例和代码，还能动手操作互动演示。</p>
          <div class="t-go">从第一课开始 →</div></div>
        <div class="tile reveal" data-go="/map">${ART.map}<div class="t-num">02 · 知识图谱</div><h3>想搞懂某个算法<br>从哪来、依赖什么</h3>
          <p>约 90 个概念的关系网，能看到前置知识和后续发展。直接跳到常见算法：</p>
          <div class="t-go">${['ppo', 'sac', 'gae', 'td', 'dr', 'privileged'].map(id => `<span class="t-chip" data-go="learn:${id}">${App.rlById.get(id).name}</span>`).join('')}</div></div>
        <div class="tile reveal" data-go="/timeline">${ART.timeline}<div class="t-num">03 · 运控演进</div><h3>想看机器人运控<br>这几年怎么发展的</h3>
          <p>约 110 篇里程碑论文按 8 条技术流排在时间轴上，圆越大影响越大。5 条故事线带你按顺序看。</p>
          <div class="t-go">打开时间轴 →</div></div>
        <div class="tile reveal" data-go="/papers">${ART.papers}<div class="t-num">04 · 论文库</div><h3>想找最新、<br>最有影响力的论文</h3>
          <p>awesome-humanoid-robot-learning 全部 ${PAPERS.length} 篇论文，按引用和热度排序，每篇都能直达原文、项目页、代码。</p>
          <div class="t-go">浏览论文 →</div></div>
      </div>
    </section>

    <section class="section wrap">
      <div class="section-head reveal"><h2>学习路线</h2><p>按顺序读，<b>每章建立在上一章之上</b>。已读的课会被记住（仅保存在你的浏览器）。</p></div>
      <div class="roadmap" id="home-roadmap"></div>
    </section>

    <section class="section wrap">
      <div class="section-head reveal"><h2>一览</h2></div>
      <div class="stats reveal">
        <div class="stat-cell"><b class="blue" data-count="${deepCount}">0</b><span>节精讲课程</span></div>
        <div class="stat-cell"><b data-count="${RL_NODES.length}">0</b><span>个 RL 概念与算法</span></div>
        <div class="stat-cell"><b data-count="${MILESTONES.length}">0</b><span>篇运控里程碑论文</span></div>
        <div class="stat-cell"><b data-count="${PAPERS.length}">0</b><span>篇人形机器人论文</span></div>
      </div>
    </section>

    <section class="section wrap">
      <div class="section-head reveal"><h2>五条技术故事线</h2><p>不知道论文从哪读起？<b>跟着一条故事线</b>，在时间轴上逐步点亮一条技术路线。</p></div>
      <div class="car-track reveal" id="car-track">${STORIES.map((s, i) => `
        <div class="story-card" data-story="${s.id}">
          <div class="sc-no">故事线 ${String(i + 1).padStart(2, '0')} · ${s.steps.length} 步</div>
          <h3>${App.esc(s.name)}</h3><p>${App.esc(s.desc)}</p>
          <div class="story-steps">${s.steps.slice(0, 6).map(st => `<span>${App.esc(App.msById.get(st[0]).n)}</span>`).join('<em>→</em>')}${s.steps.length > 6 ? '<em>…</em>' : ''}</div>
          <div class="sc-go">在时间轴上播放 →</div>
        </div>`).join('')}</div>
      <div class="car-ctrl"><div class="dots" id="car-dots">${STORIES.map((_, i) => `<i data-i="${i}" class="${i ? '' : 'on'}"></i>`).join('')}</div><button class="round-btn" id="car-pause" title="暂停">❚❚</button></div>
    </section>

    <section class="section wrap">
      <div class="section-head reveal"><h2>推荐的使用方式</h2></div>
      <div class="howto reveal">
        <div><b>1</b><h4>先读课</h4><p>按学习路线读第 1～5 章，建立 MDP、价值、策略梯度、PPO 的完整理解。每节末尾的自测题帮你检查是否真懂了。</p></div>
        <div><b>2</b><h4>再看图谱</h4><p>在知识图谱里查漏补缺：某个算法依赖什么、演化成了什么。点"学习路径"会按顺序点亮。</p></div>
        <div><b>3</b><h4>最后读论文</h4><p>在运控演进中跟一条故事线，每篇论文的"读前须知"会告诉你需要哪些 RL 知识，并链接到原文和代码。</p></div>
      </div>
    </section>

    <footer class="wrap">
      论文数据：<a href="https://github.com/YanjieZe/awesome-humanoid-robot-learning" target="_blank">awesome-humanoid-robot-learning</a> · 引用数：Semantic Scholar · 更新于 ${window.PAPERS_META ? PAPERS_META.generated : '—'}<br>
      更新数据：<code>python3 scripts/update_data.py</code> · 编辑评级与故事线为人工整理，仅供参考
    </footer>`;
  }

  function roadmap() {
    const chs = App.chapters.slice(0, -1);
    document.getElementById('home-roadmap').innerHTML = chs.map((c, i) => {
      const n = App.progress.count(c.lessons), tot = c.lessons.length, mins = c.lessons.reduce((a, id) => a + (App.lesson(id) ? App.lesson(id).mins : 0), 0);
      const next = c.lessons.find(id => !App.progress.has(id)) || c.lessons[0];
      return `<div class="rm-card reveal" data-go="learn:${next}">
        <div class="rm-no">第 ${i + 1} 章</div><h4>${App.esc(c.name)}</h4><p>${App.esc(c.desc)}</p>
        <div class="rm-meta"><span>${tot} 节 · 约 ${mins} 分钟</span><span>${n ? `已读 ${n}/${tot}` : '未开始'}</span></div>
        <div class="progress"><i style="width:${n / tot * 100}%"></i></div></div>`;
    }).join('');
  }

  // 首页动态插图：9 站学习路线，路径逐段绘出，小圆点沿路线移动
  function heroArt() {
    const svg = d3.select('#hero-svg'); svg.selectAll('*').remove();
    const W = svg.node().getBoundingClientRect().width || 1000, H = 280;
    svg.attr('viewBox', `0 0 ${W} ${H}`);
    const chs = App.chapters.slice(0, -1), n = chs.length;
    const pts = chs.map((c, i) => [60 + i * (W - 120) / (n - 1), H / 2 + Math.sin(i * 1.15) * 62]);
    const line = d3.line().curve(d3.curveCatmullRom.alpha(.5));
    const path = svg.append('path').attr('d', line(pts)).attr('fill', 'none').attr('stroke', '#d2d2d7').attr('stroke-width', 2);
    const prog = svg.append('path').attr('d', line(pts)).attr('fill', 'none').attr('stroke', '#0071e3').attr('stroke-width', 3).attr('stroke-linecap', 'round');
    const len = path.node().getTotalLength();
    prog.attr('stroke-dasharray', `${len} ${len}`).attr('stroke-dashoffset', len).transition().duration(2600).ease(d3.easeCubicInOut).attr('stroke-dashoffset', 0);
    const g = svg.selectAll('g.st').data(chs).join('g').attr('class', 'st').attr('transform', (d, i) => `translate(${pts[i]})`).style('cursor', 'pointer')
      .on('click', (e, d) => App.go('/learn/' + d.lessons[0]));
    g.append('circle').attr('r', 0).attr('fill', '#fff').attr('stroke', '#0071e3').attr('stroke-width', 2.5)
      .transition().delay((d, i) => 250 + i * 260).duration(500).ease(d3.easeBackOut).attr('r', 15);
    g.append('text').attr('text-anchor', 'middle').attr('dy', 4.5).style('font-size', '12px').style('font-weight', 700).attr('fill', '#0071e3').text((d, i) => i + 1)
      .style('opacity', 0).transition().delay((d, i) => 400 + i * 260).style('opacity', 1);
    g.append('text').attr('text-anchor', 'middle').attr('dy', (d, i) => (pts[i][1] < H / 2 ? -26 : 36)).style('font-size', '13px').style('font-weight', 600).attr('fill', '#1d1d1f')
      .text(d => d.name.split('：')[0]).style('opacity', 0).transition().delay((d, i) => 500 + i * 260).duration(600).style('opacity', 1);
    // 沿路线移动的小点
    const dot = svg.append('circle').attr('r', 6).attr('fill', '#0071e3');
    const halo = svg.append('circle').attr('r', 14).attr('fill', 'rgba(0,113,227,.15)');
    const t0 = performance.now();
    if (heroArt.timer) heroArt.timer.stop();
    heroArt.timer = d3.timer(() => {
      const t = ((performance.now() - t0) / 9000) % 1, p = path.node().getPointAtLength(t * len);
      dot.attr('cx', p.x).attr('cy', p.y); halo.attr('cx', p.x).attr('cy', p.y).attr('r', 12 + 4 * Math.sin(t * 60));
    });
  }

  function countUp() {
    root.querySelectorAll('[data-count]').forEach(el => {
      const target = +el.dataset.count;
      d3.select(el).transition().delay(200).duration(1400).ease(d3.easeCubicOut).tween('text', () => { const i = d3.interpolateRound(0, target); return t => { el.textContent = i(t).toLocaleString(); }; });
    });
  }

  function carousel() {
    const track = document.getElementById('car-track'), dots = [...document.querySelectorAll('#car-dots i')];
    const goTo = i => { carIdx = (i + STORIES.length) % STORIES.length; const c = track.children[carIdx]; track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.clientWidth) / 2, behavior: 'smooth' }); dots.forEach((d, j) => d.classList.toggle('on', j === carIdx)); };
    dots.forEach(d => d.onclick = () => goTo(+d.dataset.i));
    const pause = document.getElementById('car-pause');
    const play = () => { clearInterval(carTimer); carTimer = setInterval(() => goTo(carIdx + 1), 5000); pause.textContent = '❚❚'; };
    pause.onclick = () => { if (carTimer) { clearInterval(carTimer); carTimer = null; pause.textContent = '▶'; } else play(); };
    track.addEventListener('scroll', () => { const mid = track.scrollLeft + track.clientWidth / 2; let best = 0, bd = 1e9; [...track.children].forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid); if (d < bd) { bd = d; best = i; } }); carIdx = best; dots.forEach((d, j) => d.classList.toggle('on', j === best)); }, { passive: true });
    play();
  }

  let counted = false;
  return {
    init() {
      root.innerHTML = html(); roadmap(); App.reveal(root);
      carousel();
      const io = 'IntersectionObserver' in window && new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !counted) { counted = true; countUp(); } }, { threshold: .3 });
      io ? io.observe(root.querySelector('.stats')) : countUp();
    },
    activate() { requestAnimationFrame(heroArt); },
    route() { roadmap(); App.reveal(root); },
    resize() { heroArt(); },
  };
})());
