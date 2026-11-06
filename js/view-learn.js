/* 学习路线：章节目录 + 课程详细讲解 */
App.register('learn', (() => {
  const page = document.getElementById('page-learn'), root = document.getElementById('learn-root');
  let cur = null, io = null;
  const esc = App.esc;
  const lvlTag = l => `<span class="tag lvl-${l}">${l}</span>`;

  function toc(curId) {
    const all = App.order.map(o => o.id), n = App.progress.count(all);
    return `<aside class="toc">
      <div class="toc-title"><span>学习路线</span><span>${n} / ${all.length}</span></div>
      <div class="progress"><i style="width:${n / all.length * 100}%"></i></div>
      ${App.chapters.map((c, i) => `<div class="toc-ch">
        <div data-go="learn:${c.lessons[0]}"><small>${i < App.chapters.length - 1 ? i + 1 : '+'}</small>${esc(c.name)}</div>
        ${(c.id !== 'cx' || (curId && c.lessons.includes(curId)) ? c.lessons : []).map(id => { const L = App.lesson(id); return `<a href="#/learn/${id}" class="${id === curId ? 'cur' : ''}">
          <span class="ck ${App.progress.has(id) ? 'done' : ''}">${App.progress.has(id) ? '✓' : ''}</span>${esc(L.title)}${L.deep ? '' : '<span class="brief">简介</span>'}</a>`; }).join('')}
        ${c.id === 'cx' && !(curId && c.lessons.includes(curId)) ? `<a href="#/learn">展开 ${c.lessons.length} 个知识点…</a>` : ''}
      </div>`).join('')}
    </aside>`;
  }

  function index() {
    return `<div class="learn-layout">${toc(null)}<main class="article learn-index">
      <div class="crumb"><a href="#/">首页</a> / 学习路线</div>
      <h1>学习路线</h1>
      <p>按章节顺序阅读即可。<b>入门</b>课不需要任何前置知识；<b>进阶</b>课会用到前几章的概念。标有<b>"深入"</b>的课有可展开的逐步推导、数值案例和代码；标有<b>"互动"</b>的课有可以动手操作的演示；标有"简介"的是知识点速查页。</p>
      <div class="cta-row" style="justify-content:flex-start;margin-top:22px"><a class="pill primary" href="#/learn/${nextUnread()}">${App.progress.count(App.order.map(o => o.id)) ? '继续上次的学习 →' : '从第一课开始 →'}</a></div>
      ${App.chapters.map((c, i) => `<div class="ch-block">
        <h3><small>${c.id === 'cx' ? '附录' : '第 ' + (i + 1) + ' 章'}</small>${esc(c.name)}</h3><p>${esc(c.desc)}</p>
        ${c.lessons.map(id => { const L = App.lesson(id); return `<a class="ls-row" href="#/learn/${id}">
          <span class="ck ${App.progress.has(id) ? 'done' : ''}">${App.progress.has(id) ? '✓' : ''}</span>
          <div style="min-width:0"><div class="ls-t">${esc(L.title)} <span class="muted" style="font-weight:400;font-size:13px">${esc(L.en)}</span></div><div class="ls-o">${esc(L.one)}</div></div>
          <div class="ls-m">${deepOf(id).length ? `<span class="tag deep-tag">深入 ×${deepOf(id).length}</span>` : ''}${demosOf(id).length ? '<span class="tag demo-tag">互动</span>' : ''}${L.deep ? lvlTag(L.level) + `<span class="tag">${L.mins} 分钟</span>` : '<span class="tag">简介</span>'}</div></a>`; }).join('')}
      </div>`).join('')}
    </main></div>`;
  }
  const nextUnread = () => (App.order.find(o => !App.progress.has(o.id)) || App.order[0]).id;

  // 深入讲解卡片：默认折叠，详细模式下全部展开
  const KIND = { derive: '推导', case: '案例', code: '代码', faq: '疑问', compare: '对比' };
  let mode = 'brief';
  try { mode = localStorage.getItem('rlr-mode') || 'brief'; } catch (e) {}
  const deepOf = id => (window.DEEP && DEEP[id]) || [];
  const demosOf = id => (window.Demos && Demos.BY_LESSON[id]) || [];
  function deepCard(d) {
    const code = d.code ? `<div class="codeblock"><button class="copy" type="button">复制代码</button><pre><code>${esc(d.code)}</code></pre></div>` : '';
    return `<details class="deep k-${d.k}" ${mode === 'full' ? 'open' : ''}><summary><span class="dk">${KIND[d.k] || '深入'}</span><b>${esc(d.t)}</b><span class="dm">约 ${d.mins || 3} 分钟</span><span class="dt"></span></summary>
      <div class="deep-body">${App.md(d.body)}${code}</div></details>`;
  }

  function lessonHtml(L) {
    const secs = [], deep = deepOf(L.id), used = new Set();
    const cards = at => deep.filter(d => (d.at || 'end') === at).map(d => { used.add(d); return deepCard(d); }).join('');
    const sec = (title, body, at) => secs.push(`<section class="a-sec"><h2><span class="sn">${String(secs.length + 1).padStart(2, '0')}</span>${title}</h2>${body}${at ? cards(at) : ''}</section>`);
    sec(L.deep ? '直觉理解' : '简介', App.md(L.intuit), 'intuit');
    if (L.formal || L.terms.length) sec('正式定义', App.md(L.formal) + (L.terms.length ? `<div class="terms-head">公式里的每个符号</div><div class="terms">${L.terms.map(([t, d]) => `<div><span class="tm">${App.tex(t, false)}</span><span>${esc(d)}</span></div>`).join('')}</div>` : ''), 'formal');
    if (L.example) sec('举个例子', App.md(L.example), 'example');
    const demos = demosOf(L.id);
    if (demos.length) sec('动手试一试', `<p class="demo-intro">拖动滑块、点击按钮，观察结果如何变化。互动比读公式更容易建立直觉。</p>` + demos.map(([k, o]) => `<div class="demo" data-demo="${k}" data-opts='${JSON.stringify(o || {})}'></div>`).join(''));
    if (L.algo) sec('算法流程（伪代码）', `<pre class="algo">${esc(L.algo)}</pre>`, 'algo');
    if (L.points.length) sec('要点', `<div class="md"><ul>${L.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>`);
    if (L.pitfalls.length) sec('常见误区', `<div class="pitfalls">${L.pitfalls.map(p => `<div><span>${App.md(p).replace(/^<div class="md"><p>|<\/p><\/div>$/g, '')}</span></div>`).join('')}</div>`);
    if (L.robot || L.usedBy.length) {
      // 按地位与引用挑出最重要的 12 篇，其余折叠
      const ms = L.usedBy.map(id => App.msById.get(id)).sort((a, b) => (a.tier - b.tier) || ((b.cites || 0) - (a.cites || 0)));
      const mchip = m => `<span class="chip link" data-go="ms:${m.id}"><i style="background:${App.laneById.get(m.lane).color}"></i>${esc(m.n)} <small style="color:var(--text-3)">${m.y}</small></span>`;
      const top = ms.slice(0, 12).sort((a, b) => a.date - b.date), rest = ms.slice(12).sort((a, b) => a.date - b.date);
      sec('在机器人运控中', cards('robot') + `<div class="robot-box">${App.md(L.robot)}${ms.length ? `<div class="terms-head" style="margin-top:${L.robot ? 6 : 0}px">用到它的机器人论文 · ${ms.length} 篇${rest.length ? '（按重要性显示 12 篇）' : ''}</div><div class="rel-list">${top.map(mchip).join('')}${rest.length ? `<span class="chip link" onclick="this.outerHTML=this.nextElementSibling.innerHTML">+ 展开其余 ${rest.length} 篇</span><template>${rest.map(mchip).join('')}</template>` : ''}</div>` : ''}</div>`);
    }
    // 挂载点不存在的深入卡片（以及 at='end' 的）统一放在"更多深入讲解"
    const rest = deep.filter(d => !used.has(d));   // 此时各挂载点已消费完，剩下的就是 at='end' 或挂载点不存在的
    if (rest.length) sec('更多深入讲解', rest.map(deepCard).join(''));
    if (L.quiz.length) sec('自测一下', L.quiz.map(([q, a]) => `<details class="quiz"><summary>${esc(q)}</summary><div class="ans">${App.md(a).replace(/^<div class="md">|<\/div>$/g, '')}</div></details>`).join(''));
    const reads = L.reads.map(([t, n, u]) => `<a class="read-item" href="${u}" target="_blank"><span class="rt">${esc(t)}</span><span class="rn">${esc(n)}</span><span class="ru">${esc(u.replace(/^https?:\/\//, ''))}</span></a>`);
    if (L.paper) {
      const p = L.paper, u = p.arxiv ? 'https://arxiv.org/abs/' + p.arxiv : p.url || 'https://scholar.google.com/scholar?q=' + encodeURIComponent(p.t);
      reads.unshift(`<a class="read-item" href="${u}" target="_blank"><span class="rt">原论文</span><span class="rn">${esc(p.t)}</span><span class="ru">${esc(p.a || '')} · ${esc(p.v || '')}</span></a>`);
      if (p.arxiv) reads.splice(1, 0, `<a class="read-item" href="https://www.alphaxiv.org/abs/${p.arxiv}" target="_blank"><span class="rt">论文讨论</span><span class="rn">在 alphaXiv 上阅读与提问</span><span class="ru">alphaxiv.org/abs/${p.arxiv}</span></a>`);
    }
    if (reads.length) sec('延伸阅读', `<div class="reads">${reads.join('')}</div>`);

    const chip = id => { const n = App.rlById.get(id); return `<span class="chip link" data-go="learn:${id}"><i style="background:${App.groupById.get(n.g).color}"></i>${esc(n.name)}</span>`; };
    const prev = L.prev && App.lesson(L.prev), next = L.next && App.lesson(L.next);
    return `<div class="crumb"><a href="#/">首页</a> / <a href="#/learn">学习路线</a> / ${L.ch ? (L.ch.id === 'cx' ? '附录' : '第 ' + (L.chNo + 1) + ' 章 · ' + esc(L.ch.name)) : ''}</div>
      <h1>${esc(L.title)}</h1><div class="en">${esc(L.en)}</div>
      <div class="meta-row">${lvlTag(L.level)}<span class="tag">约 ${L.mins} 分钟</span>${L.year ? `<span class="tag">${L.year} 年</span>` : ''}${L.node ? `<span class="tag"><i style="width:7px;height:7px;border-radius:50%;background:${App.groupById.get(L.node.g).color};display:inline-block"></i>${esc(App.groupById.get(L.node.g).name)}</span>` : ''}${L.deep ? '' : '<span class="tag">知识点简介</span>'}</div>
      ${deep.length || demos.length ? `<div class="mode-bar"><div><b>本节包含 ${deep.length ? deep.length + ' 个深入讲解' : ''}${deep.length && demos.length ? '、' : ''}${demos.length ? demos.length + ' 个互动演示' : ''}</b><span>深入讲解默认折叠，点击卡片标题即可展开；也可以切换到"详细模式"一次展开全部。</span></div>
        <div class="seg" id="mode-seg"><button data-mode="brief" class="${mode === 'brief' ? 'active' : ''}">精简</button><button data-mode="full" class="${mode === 'full' ? 'active' : ''}">详细</button></div></div>` : ''}
      <div class="oneline"><small>一句话理解</small>${App.md(L.one).replace(/^<div class="md"><p>|<\/p><\/div>$/g, '')}</div>
      ${L.prereq.length ? `<div class="prereq">建议先了解：${L.prereq.map(chip).join('')}</div>` : ''}
      ${secs.join('')}
      ${L.deep ? '' : `<div class="brief-note">这是知识点简介页。想深入理解，推荐先读上面的原论文与延伸阅读；它的前置知识大多在学习路线前几章有详细讲解。</div>`}
      ${L.post.length ? `<div class="prereq" style="margin-top:34px">学完可以继续：${L.post.map(chip).join('')}</div>` : ''}
      <div class="lesson-actions">
        <button class="pill ${App.progress.has(L.id) ? '' : 'primary'}" id="mark-done">${App.progress.has(L.id) ? '✓ 已学完（点击取消）' : '标记为已学完'}</button>
        ${L.node ? `<a class="pill" href="#/map/${L.id}">在知识图谱中查看</a>` : ''}
        ${L.usedBy.length ? `<a class="pill" href="#/timeline/${L.usedBy[0]}">看相关机器人论文</a>` : ''}
      </div>
      <div class="pn">${prev ? `<a href="#/learn/${prev.id}"><small>← 上一节</small><b>${esc(prev.title)}</b></a>` : ''}${next ? `<a class="next" href="#/learn/${next.id}"><small>下一节 →</small><b>${esc(next.title)}</b></a>` : ''}</div>`;
  }

  function render(id) {
    if (io) { io.disconnect(); io = null; }
    if (window.Demos) Demos.stopAll();
    if (!id) { root.innerHTML = index(); page.scrollTop = 0; cur = null; return; }
    const L = App.lesson(id);
    if (!L) { root.innerHTML = index(); return; }
    cur = id;
    root.innerHTML = `<div class="learn-layout">${toc(id)}<main class="article">${lessonHtml(L)}</main></div>`;
    page.scrollTop = 0;
    const t = root.querySelector('.toc a.cur'); if (t) t.scrollIntoView({ block: 'center' });
    document.getElementById('mark-done').onclick = () => { App.progress.set(id, !App.progress.has(id)); render(id); };
    if (window.Demos) Demos.mount(root);
    const seg = document.getElementById('mode-seg');
    if (seg) seg.onclick = e => {
      const m = e.target.dataset.mode; if (!m) return;
      mode = m; try { localStorage.setItem('rlr-mode', m); } catch (err) {}
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
      root.querySelectorAll('details.deep').forEach(d => { d.open = m === 'full'; });
    };
    root.querySelectorAll('.codeblock .copy').forEach(btn => btn.onclick = () => {
      const txt = btn.nextElementSibling.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { btn.textContent = '已复制'; setTimeout(() => btn.textContent = '复制代码', 1500); }, () => { btn.textContent = '请手动选中复制'; });
    });
    // 读到页尾自动记为已学
    const pn = root.querySelector('.pn');
    if ('IntersectionObserver' in window && pn && !App.progress.has(id)) {
      io = new IntersectionObserver(es => { if (es[0].isIntersecting && page.scrollTop > 400) { App.progress.set(id, true); const b = document.getElementById('mark-done'); if (b) { b.textContent = '✓ 已学完（点击取消）'; b.classList.remove('primary'); } const c = root.querySelector('.toc a.cur .ck'); if (c) { c.classList.add('done'); c.textContent = '✓'; } io.disconnect(); } });
      io.observe(pn);
    }
  }

  return { init() {}, route: render };
})());
