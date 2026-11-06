/* 课程中的互动演示：网格世界(价值迭代/Q-learning)、折扣因子、多臂老虎机、MC vs TD 随机游走、高斯策略、PPO 截断、GAE 权重 */
window.Demos = (() => {
  const C = { blue: '#0071e3', gray: '#d2d2d7', soft: '#e8e8ed', text: '#1d1d1f', t2: '#6e6e73', green: '#2f9e5a', red: '#e5484d', orange: '#e8890c', purple: '#8e4ec6' };
  const timers = new Set();
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.add(id); return id; };
  const stop = id => { clearInterval(id); timers.delete(id); };
  const stopAll = () => { timers.forEach(clearInterval); timers.clear(); };
  const fmt = (v, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);
  const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // 通用控件
  function slider(label, min, max, step, val, onInput, fmtFn = v => v) {
    const w = document.createElement('label'); w.className = 'dm-slider';
    w.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}"><b>${fmtFn(val)}</b>`;
    const inp = w.querySelector('input'), out = w.querySelector('b');
    inp.oninput = () => { out.textContent = fmtFn(+inp.value); onInput(+inp.value); };
    return w;
  }
  function button(label, onClick, primary) { const b = document.createElement('button'); b.className = 'dm-btn' + (primary ? ' pri' : ''); b.textContent = label; b.onclick = onClick; return b; }
  function frame(box, title, hint) {
    box.innerHTML = `<div class="dm-head"><b>${title}</b><span>${hint || ''}</span></div><div class="dm-body"><div class="dm-viz"></div><div class="dm-side"></div></div><div class="dm-ctrl"></div><div class="dm-note"></div>`;
    return { viz: box.querySelector('.dm-viz'), side: box.querySelector('.dm-side'), ctrl: box.querySelector('.dm-ctrl'), note: box.querySelector('.dm-note') };
  }

  // ───────── 1. 网格世界：价值迭代 / Q-learning ─────────
  // 经典 3×4 网格（Russell & Norvig）：右上 +1，其下 −1，(1,1) 为墙，左下出发
  function grid(box, opts) {
    const R = 3, Cc = 4, WALL = '1,1', GOAL = '0,3', TRAP = '1,3', START = [2, 0];
    const ACT = [[-1, 0], [0, 1], [1, 0], [0, -1]], ANAME = ['↑', '→', '↓', '←'];
    const P = { gamma: .95, slip: .2, step: -.04, eps: .2, alpha: .2 };
    let mode = opts.mode || 'vi', V, Q, iter, delta, ag, ep, epRet, lastRet, run = null;
    const states = []; for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) if (`${r},${c}` !== WALL) states.push([r, c]);
    const key = s => s.join(','), term = s => key(s) === GOAL || key(s) === TRAP;
    const reward = s => key(s) === GOAL ? 1 : key(s) === TRAP ? -1 : P.step;
    const move = (s, a) => { const n = [s[0] + ACT[a][0], s[1] + ACT[a][1]]; return n[0] < 0 || n[0] >= R || n[1] < 0 || n[1] >= Cc || key(n) === WALL ? s : n; };
    const trans = (s, a) => [[move(s, a), 1 - P.slip], [move(s, (a + 1) % 4), P.slip / 2], [move(s, (a + 3) % 4), P.slip / 2]];
    const sample = (s, a) => { const u = Math.random(); return move(s, u < 1 - P.slip ? a : u < 1 - P.slip / 2 ? (a + 1) % 4 : (a + 3) % 4); };
    const qsa = (s, a) => trans(s, a).reduce((acc, [n, p]) => acc + p * (reward(n) + P.gamma * (term(n) ? 0 : V[key(n)])), 0);
    function reset() {
      V = {}; Q = {}; states.forEach(s => { V[key(s)] = 0; Q[key(s)] = [0, 0, 0, 0]; });
      iter = 0; delta = null; ag = START.slice(); ep = 0; epRet = 0; lastRet = null; if (run) { stop(run); run = null; } draw();
    }
    function viStep() {
      const nV = {}; delta = 0;
      states.forEach(s => { const k = key(s); nV[k] = term(s) ? 0 : Math.max(...[0, 1, 2, 3].map(a => qsa(s, a))); delta = Math.max(delta, Math.abs(nV[k] - V[k])); });
      V = nV; iter++; draw();
    }
    function qStep(render = true) {
      const k = key(ag), q = Q[k];
      const a = Math.random() < P.eps ? Math.floor(Math.random() * 4) : q.indexOf(Math.max(...q));
      const n = sample(ag, a), r = reward(n), target = r + (term(n) ? 0 : P.gamma * Math.max(...Q[key(n)]));
      q[a] += P.alpha * (target - q[a]); epRet += r;
      if (term(n) || epRet < -10) { ep++; lastRet = epRet; epRet = 0; ag = START.slice(); } else ag = n;
      if (render) draw();
    }
    const f = frame(box, '网格世界', '左下出发，右上 +1，其下 −1，灰格是墙；地面会打滑');
    const W = 78, svg = d3.select(f.viz).append('svg').attr('viewBox', `0 0 ${Cc * W} ${R * W}`).attr('class', 'dm-svg').style('max-width', '360px');
    const col = d3.scaleLinear().domain([-1, 0, 1]).range(['#f6c9cb', '#ffffff', '#b9d7f7']).clamp(true);
    function draw() {
      const val = s => mode === 'vi' ? V[key(s)] : Math.max(...Q[key(s)]);
      const best = s => { const vs = mode === 'vi' ? [0, 1, 2, 3].map(a => qsa(s, a)) : Q[key(s)]; return Math.max(...vs) === Math.min(...vs) ? -1 : vs.indexOf(Math.max(...vs)); };
      const cells = [];
      for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) cells.push([r, c]);
      svg.selectAll('g.cell').data(cells).join(e => { const g = e.append('g').attr('class', 'cell'); g.append('rect'); g.append('text').attr('class', 'v'); g.append('text').attr('class', 'a'); return g; })
        .attr('transform', d => `translate(${d[1] * W},${d[0] * W})`).each(function (d) {
          const g = d3.select(this), k = key(d), wall = k === WALL;
          g.select('rect').attr('x', 2).attr('y', 2).attr('width', W - 4).attr('height', W - 4).attr('rx', 10)
            .attr('fill', wall ? '#86868b' : k === GOAL ? '#cfe8d6' : k === TRAP ? '#f6c9cb' : col(val(d))).attr('stroke', C.soft);
          g.select('text.v').attr('x', W / 2).attr('y', W / 2 + (wall ? 5 : -6)).attr('text-anchor', 'middle').style('font-size', '13px').style('font-weight', 600)
            .attr('fill', C.text).text(wall ? '墙' : k === GOAL ? '+1' : k === TRAP ? '−1' : fmt(val(d)));
          const b = wall || term(d) ? -1 : best(d);
          g.select('text.a').attr('x', W / 2).attr('y', W / 2 + 22).attr('text-anchor', 'middle').style('font-size', '20px').attr('fill', C.blue).text(b >= 0 ? ANAME[b] : '');
        });
      svg.selectAll('circle.agent').data(mode === 'q' ? [ag] : []).join('circle').attr('class', 'agent').attr('r', 9).attr('fill', C.orange)
        .attr('cx', d => d[1] * W + W - 16).attr('cy', d => d[0] * W + 16);
      f.side.innerHTML = mode === 'vi'
        ? `<div class="dm-stat"><b>${iter}</b><span>已迭代轮数</span></div><div class="dm-stat"><b>${delta == null ? '—' : fmt(delta, 4)}</b><span>本轮最大变化 Δ</span></div>
           <p>每一轮对每个格子执行一次<b>贝尔曼最优更新</b>：试遍 4 个动作，算出"打滑后的期望（奖励 + γ·下一格价值）"，取最大的那个。数字是 V(s)，箭头是当前的最优动作。Δ 越来越小，说明在收敛。</p>`
        : `<div class="dm-stat"><b>${ep}</b><span>已完成回合</span></div><div class="dm-stat"><b>${lastRet == null ? '—' : fmt(lastRet)}</b><span>上一回合总奖励</span></div>
           <p>橙色圆点是智能体。它<b>不知道</b>打滑规则，只能用 ε-greedy 去试，每走一步用 TD 目标 $r+\gamma\max_{a'}Q(s',a')$ 修正 Q。格子里显示 $\max_a Q$；回合多了以后，箭头会和价值迭代算出的结果趋于一致。</p>`;
      if (window.App) f.side.querySelectorAll('p').forEach(p => p.innerHTML = p.innerHTML.replace(/\$([^$]+)\$/g, (m, t) => App.tex(t, false)));
    }
    function controlsFor() {
      f.ctrl.innerHTML = '';
      const tabs = document.createElement('div'); tabs.className = 'dm-tabs';
      [['vi', '价值迭代（已知模型）'], ['q', 'Q-learning（试错学习）']].forEach(([m, n]) => tabs.appendChild(Object.assign(button(n, () => { mode = m; reset(); controlsFor(); }), { className: 'dm-tab' + (m === mode ? ' on' : '') })));
      f.ctrl.appendChild(tabs);
      const row = document.createElement('div'); row.className = 'dm-row';
      if (mode === 'vi') {
        row.append(button('迭代 1 轮', viStep, true), button('自动迭代', e => { if (run) { stop(run); run = null; e.target.textContent = '自动迭代'; } else { run = every(() => { viStep(); if (delta < 1e-4) { stop(run); run = null; e.target.textContent = '自动迭代'; } }, 450); e.target.textContent = '暂停'; } }), button('重置', reset));
      } else {
        row.append(button('开始 / 暂停', () => { if (run) { stop(run); run = null; } else run = every(() => qStep(), 60); }, true), button('快进 300 回合', () => { const t = ep + 300; let guard = 0; while (ep < t && guard++ < 2e5) qStep(false); draw(); }), button('重置', reset));
        row.append(slider('探索率 ε', 0, 1, .05, P.eps, v => P.eps = v), slider('学习率 α', .05, 1, .05, P.alpha, v => P.alpha = v));
      }
      row.append(slider('折扣 γ', .5, .99, .01, P.gamma, v => { P.gamma = v; mode === 'vi' ? draw() : 0; }), slider('打滑概率', 0, .6, .05, P.slip, v => { P.slip = v; draw(); }),
        slider('每步奖励', -.6, 0, .02, P.step, v => { P.step = v; draw(); }, v => v.toFixed(2)));
      f.ctrl.appendChild(row);
      f.note.innerHTML = '试试：把"每步奖励"调到 −0.4 左右，智能体会宁可冒险走近路甚至跳进 −1；把"打滑概率"调大，最优路线会远离陷阱。';
    }
    controlsFor(); reset();
  }

  // ───────── 2. 折扣因子 ─────────
  function gamma(box) {
    const f = frame(box, '折扣因子 γ 的作用', '每根柱子是 k 步之后的奖励权重 γᵏ');
    let g = .9;
    const W = 520, H = 180, svg = d3.select(f.viz).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'dm-svg');
    const K = 60, x = d3.scaleBand().domain(d3.range(K)).range([30, W - 10]).padding(.15), y = d3.scaleLinear().domain([0, 1]).range([H - 24, 10]);
    svg.append('g').attr('transform', `translate(0,${H - 24})`).call(d3.axisBottom(x).tickValues([0, 10, 20, 30, 40, 50]).tickSize(0)).attr('class', 'axis').select('.domain').remove();
    svg.append('g').attr('transform', 'translate(30,0)').call(d3.axisLeft(y).ticks(3).tickSize(0)).attr('class', 'axis').select('.domain').remove();
    function draw() {
      svg.selectAll('rect.b').data(d3.range(K)).join('rect').attr('class', 'b').attr('x', k => x(k)).attr('width', x.bandwidth()).attr('rx', 2)
        .attr('fill', k => Math.pow(g, k) > .5 ? C.blue : '#9cc3ef').transition().duration(200).attr('y', k => y(Math.pow(g, k))).attr('height', k => y(0) - y(Math.pow(g, k)));
      const hz = 1 / (1 - g);
      f.side.innerHTML = `<div class="dm-stat"><b>${hz.toFixed(1)}</b><span>有效视界 1/(1−γ)（步）</span></div>
        <div class="dm-stat"><b>${(hz / 50).toFixed(2)} 秒</b><span>按 50Hz 控制换算</span></div>
        <div class="dm-stat"><b>${(10 * Math.pow(g, 20)).toFixed(2)}</b><span>20 步后的 +10 奖励，现在值多少</span></div>
        <p>γ 越大，远处的奖励越"值钱"，智能体越有远见，但回报的方差也越大、越难学。</p>`;
    }
    f.ctrl.appendChild(slider('γ', 0, .995, .005, g, v => { g = v; draw(); }, v => v.toFixed(3)));
    f.note.textContent = '机器人运控常用 γ = 0.99（约看 100 步 ≈ 2 秒）；需要长时规划的任务往往要配合稠密奖励或分层结构。';
    draw();
  }

  // ───────── 3. 多臂老虎机：探索与利用 ─────────
  function bandit(box) {
    const f = frame(box, '多臂老虎机：三种策略对比', '10 台老虎机，平均收益未知；每种策略各做 200 次独立实验取平均');
    let eps = .1, cUcb = 2;
    const W = 520, H = 200, svg = d3.select(f.viz).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'dm-svg');
    const T = 500, x = d3.scaleLinear().domain([0, T]).range([36, W - 10]);
    function simulate(strategy) {
      const runs = 200, avg = new Float64Array(T), opt = new Float64Array(T);
      for (let run = 0; run < runs; run++) {
        const mu = d3.range(10).map(randn), best = mu.indexOf(Math.max(...mu)), Qh = new Float64Array(10), N = new Float64Array(10);
        for (let t = 0; t < T; t++) {
          let a;
          if (strategy === 'ucb') { a = N.findIndex(n => n === 0); if (a < 0) { let bv = -1e9; for (let i = 0; i < 10; i++) { const v = Qh[i] + cUcb * Math.sqrt(Math.log(t + 1) / N[i]); if (v > bv) { bv = v; a = i; } } } }
          else { const e = strategy === 'greedy' ? 0 : eps; a = Math.random() < e ? Math.floor(Math.random() * 10) : Qh.indexOf(Math.max(...Qh)); }
          const r = mu[a] + randn(); N[a]++; Qh[a] += (r - Qh[a]) / N[a];
          avg[t] += r / runs; opt[t] += (a === best) / runs;
        }
      }
      return { avg: Array.from(avg), opt: Array.from(opt) };
    }
    let metric = 'avg';
    function draw() {
      const res = [['greedy', '纯贪心 (ε=0)', C.red], ['eps', `ε-greedy (ε=${eps})`, C.blue], ['ucb', `UCB (c=${cUcb})`, C.green]].map(([s, n, c]) => ({ n, c, ...simulate(s) }));
      const y = metric === 'avg' ? d3.scaleLinear().domain([0, 1.6]).range([H - 22, 10]) : d3.scaleLinear().domain([0, 1]).range([H - 22, 10]);
      svg.selectAll('*').remove();
      svg.append('g').attr('transform', `translate(0,${H - 22})`).call(d3.axisBottom(x).ticks(5).tickSize(0)).attr('class', 'axis').select('.domain').remove();
      svg.append('g').attr('transform', 'translate(36,0)').call(d3.axisLeft(y).ticks(4).tickFormat(metric === 'avg' ? null : d3.format('.0%')).tickSize(0)).attr('class', 'axis').select('.domain').remove();
      const smooth = a => a.map((_, i) => d3.mean(a.slice(Math.max(0, i - 9), i + 1)));
      res.forEach(r => svg.append('path').attr('d', d3.line().x((v, i) => x(i)).y(v => y(v))(smooth(r[metric]))).attr('fill', 'none').attr('stroke', r.c).attr('stroke-width', 2));
      f.side.innerHTML = res.map(r => `<div class="dm-stat"><b style="color:${r.c}">${metric === 'avg' ? fmt(d3.mean(r.avg.slice(-100))) : (d3.mean(r.opt.slice(-100)) * 100).toFixed(0) + '%'}</b><span>${r.n} · 最后 100 步</span></div>`).join('')
        + `<p>纯贪心很快"认死"一台不错的机器，常常错过最好的；适度探索的长期收益更高。</p>`;
    }
    const row = document.createElement('div'); row.className = 'dm-row';
    const tabs = document.createElement('div'); tabs.className = 'dm-tabs';
    [['avg', '平均奖励'], ['opt', '选中最优臂的比例']].forEach(([m, n]) => tabs.appendChild(Object.assign(button(n, e => { metric = m; tabs.querySelectorAll('button').forEach(b => b.classList.remove('on')); e.target.classList.add('on'); draw(); }), { className: 'dm-tab' + (m === metric ? ' on' : '') })));
    row.append(tabs, slider('ε', 0, .5, .01, eps, v => { eps = v; }), slider('UCB 的 c', .5, 4, .5, cUcb, v => { cUcb = v; }), button('重新实验', draw, true));
    f.ctrl.appendChild(row);
    f.note.textContent = '调节 ε 或 c 后点"重新实验"。ε 太大也不好：长期仍在乱试，浪费机会。';
    draw();
  }

  // ───────── 4. 随机游走：MC vs TD ─────────
  function randomWalk(box) {
    const f = frame(box, '随机游走：MC 与 TD 谁学得快？', '5 个状态 A–E，从 C 出发左右随机走；走出右端得 +1，左端得 0');
    let alpha = .1;
    const TRUE = [1, 2, 3, 4, 5].map(i => i / 6), EP = 100, RUNS = 100;
    const W = 520, H = 200, svg = d3.select(f.viz).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'dm-svg');
    function episode() { let s = 2; const traj = [s]; for (;;) { s += Math.random() < .5 ? -1 : 1; if (s < 0) return { traj, r: 0 }; if (s > 4) return { traj, r: 1 }; traj.push(s); } }
    function run() {
      const errTD = new Float64Array(EP + 1), errMC = new Float64Array(EP + 1); let lastTD, lastMC;
      const rms = V => Math.sqrt(d3.mean(V.map((v, i) => (v - TRUE[i]) ** 2)));
      for (let k = 0; k < RUNS; k++) {
        const VT = [.5, .5, .5, .5, .5], VM = [.5, .5, .5, .5, .5];
        errTD[0] += rms(VT) / RUNS; errMC[0] += rms(VM) / RUNS;
        for (let e = 1; e <= EP; e++) {
          const { traj, r } = episode();
          traj.forEach((s, i) => { const terminal = i === traj.length - 1, next = terminal ? 0 : VT[traj[i + 1]], rr = terminal ? r : 0; VT[s] += alpha * (rr + next - VT[s]); });
          traj.forEach(s => { VM[s] += alpha * (r - VM[s]); });
          errTD[e] += rms(VT) / RUNS; errMC[e] += rms(VM) / RUNS;
        }
        lastTD = VT; lastMC = VM;
      }
      return { errTD: Array.from(errTD), errMC: Array.from(errMC), lastTD, lastMC };
    }
    function draw() {
      const res = run();
      svg.selectAll('*').remove();
      const x = d3.scaleLinear().domain([0, EP]).range([36, 300]), y = d3.scaleLinear().domain([0, .3]).range([H - 22, 14]);
      svg.append('g').attr('transform', `translate(0,${H - 22})`).call(d3.axisBottom(x).ticks(4).tickSize(0)).attr('class', 'axis').select('.domain').remove();
      svg.append('g').attr('transform', 'translate(36,0)').call(d3.axisLeft(y).ticks(3).tickSize(0)).attr('class', 'axis').select('.domain').remove();
      svg.append('text').attr('x', 40).attr('y', 10).attr('class', 'dm-lbl').text('误差（RMS）随回合数');
      [['errTD', C.blue, 'TD(0)'], ['errMC', C.orange, 'MC']].forEach(([k, c, n], i) => {
        svg.append('path').attr('d', d3.line().x((v, j) => x(j)).y(v => y(Math.min(.3, v)))(res[k])).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2);
        svg.append('text').attr('x', 250).attr('y', 30 + i * 16).attr('fill', c).attr('class', 'dm-lbl').text('— ' + n);
      });
      const bx = d3.scaleBand().domain(d3.range(5)).range([330, W - 10]).padding(.3), by = d3.scaleLinear().domain([0, 1]).range([H - 22, 14]);
      svg.append('text').attr('x', 330).attr('y', 10).attr('class', 'dm-lbl').text(`${EP} 回合后的估计（单次）`);
      d3.range(5).forEach(i => {
        svg.append('rect').attr('x', bx(i)).attr('width', bx.bandwidth() / 2).attr('y', by(res.lastTD[i])).attr('height', by(0) - by(res.lastTD[i])).attr('fill', C.blue);
        svg.append('rect').attr('x', bx(i) + bx.bandwidth() / 2).attr('width', bx.bandwidth() / 2).attr('y', by(res.lastMC[i])).attr('height', by(0) - by(res.lastMC[i])).attr('fill', C.orange);
        svg.append('line').attr('x1', bx(i) - 3).attr('x2', bx(i) + bx.bandwidth() + 3).attr('y1', by(TRUE[i])).attr('y2', by(TRUE[i])).attr('stroke', C.text).attr('stroke-width', 2);
        svg.append('text').attr('x', bx(i) + bx.bandwidth() / 2).attr('y', H - 6).attr('text-anchor', 'middle').attr('class', 'dm-lbl').text('ABCDE'[i]);
      });
      f.side.innerHTML = `<div class="dm-stat"><b style="color:${C.blue}">${fmt(res.errTD[EP], 3)}</b><span>TD(0) 最终误差</span></div><div class="dm-stat"><b style="color:${C.orange}">${fmt(res.errMC[EP], 3)}</b><span>MC 最终误差</span></div>
        <p>黑色横线是真实价值 1/6…5/6。在这个任务上 TD 通常更快、更准：它每一步都在利用相邻状态的估计（自举），方差更小。</p>`;
    }
    const row = document.createElement('div'); row.className = 'dm-row';
    row.append(slider('学习率 α', .01, .3, .01, alpha, v => alpha = v), button('重新运行', draw, true));
    f.ctrl.appendChild(row);
    f.note.textContent = '把 α 调大：两者都学得快但最终抖动大；调小：更稳但更慢。这就是学习率的权衡。（每条曲线为 100 次实验平均）';
    draw();
  }

  // ───────── 5. 高斯策略与熵 ─────────
  function gauss(box) {
    const f = frame(box, '高斯策略：均值、标准差与熵', '连续动作策略输出一个高斯分布，训练时从中采样');
    let mu = 0, sigma = .6, squash = false, samples = [];
    const W = 520, H = 190, svg = d3.select(f.viz).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'dm-svg');
    function draw() {
      svg.selectAll('*').remove();
      const lo = squash ? -1 : -3, hi = squash ? 1 : 3, x = d3.scaleLinear().domain([lo, hi]).range([30, W - 10]);
      const pdf = a => { if (squash) { if (Math.abs(a) >= .999) return 0; const u = Math.atanh(a); return Math.exp(-((u - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI)) / (1 - a * a); } return Math.exp(-((a - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI)); };
      const pts = d3.range(lo, hi + 1e-9, (hi - lo) / 300).map(a => [a, pdf(a)]), ymax = Math.min(8, d3.max(pts, p => p[1]) * 1.1);
      const y = d3.scaleLinear().domain([0, ymax]).range([H - 40, 10]);
      svg.append('g').attr('transform', `translate(0,${H - 40})`).call(d3.axisBottom(x).ticks(7).tickSize(0)).attr('class', 'axis').select('.domain').remove();
      svg.append('path').attr('d', d3.area().x(p => x(p[0])).y0(y(0)).y1(p => y(Math.min(ymax, p[1]))).curve(d3.curveBasis)(pts)).attr('fill', 'rgba(0,113,227,.12)').attr('stroke', C.blue).attr('stroke-width', 2);
      svg.append('line').attr('x1', x(squash ? Math.tanh(mu) : mu)).attr('x2', x(squash ? Math.tanh(mu) : mu)).attr('y1', y(0)).attr('y2', 12).attr('stroke', C.text).attr('stroke-dasharray', '3 3');
      svg.selectAll('circle.s').data(samples).join('circle').attr('class', 's').attr('cx', a => x(squash ? Math.tanh(a) : a)).attr('cy', (a, i) => H - 22 - (i % 3) * 6).attr('r', 3.5).attr('fill', C.orange);
      svg.append('text').attr('x', W - 12).attr('y', H - 4).attr('text-anchor', 'end').attr('class', 'dm-lbl').text(squash ? '动作 a = tanh(u)，范围 [−1, 1]' : '动作 a');
      const H0 = .5 * Math.log(2 * Math.PI * Math.E * sigma * sigma);
      f.side.innerHTML = `<div class="dm-stat"><b>${fmt(H0)}</b><span>熵 ½·ln(2πeσ²)（未压缩的高斯）</span></div><div class="dm-stat"><b>${samples.length}</b><span>已采样动作（橙点）</span></div>
        <p>σ 大 → 动作分散、探索多、熵高；σ 小 → 动作集中、接近确定性。PPO 让 σ 随训练逐渐变小；SAC 用熵奖励主动维持一定的 σ。</p>`;
    }
    const row = document.createElement('div'); row.className = 'dm-row';
    const cb = document.createElement('label'); cb.className = 'dm-check'; cb.innerHTML = '<input type="checkbox"> tanh 压缩（SAC 的做法）'; cb.querySelector('input').onchange = e => { squash = e.target.checked; draw(); };
    row.append(slider('均值 μ', -2, 2, .05, mu, v => { mu = v; samples = []; draw(); }), slider('标准差 σ', .05, 1.5, .05, sigma, v => { sigma = v; samples = []; draw(); }),
      button('采样 20 个动作', () => { for (let i = 0; i < 20; i++) samples.push(mu + sigma * randn()); samples = samples.slice(-120); draw(); }, true), cb);
    f.ctrl.appendChild(row);
    f.note.textContent = '打开 tanh 压缩并把 σ 调大：概率会堆积在 ±1 两端——这就是动作"饱和"。';
    draw();
  }

  // ───────── 6. PPO 截断目标 ─────────
  function ppoclip(box) {
    const f = frame(box, 'PPO 截断目标：哪里有梯度，哪里没有', '横轴是概率比 ρ = π_new / π_old；灰色区域梯度为 0');
    let eps = .2, rho = 1.3;
    const W = 520, H = 210, svg = d3.select(f.viz).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'dm-svg');
    const L = (r, A) => Math.min(r * A, Math.max(1 - eps, Math.min(1 + eps, r)) * A);
    function draw() {
      svg.selectAll('*').remove();
      [[1, 0, 'Â > 0（好动作）'], [-1, 265, 'Â < 0（坏动作）']].forEach(([A, ox, title]) => {
        const g = svg.append('g').attr('transform', `translate(${ox},0)`);
        const x = d3.scaleLinear().domain([0, 2]).range([30, 245]), y = d3.scaleLinear().domain(A > 0 ? [0, 2] : [-2, 0]).range([H - 26, 22]);
        const zeroA = A > 0 ? [1 + eps, 2] : [0, 1 - eps];
        g.append('rect').attr('x', x(zeroA[0])).attr('width', x(zeroA[1]) - x(zeroA[0])).attr('y', 22).attr('height', H - 48).attr('fill', 'rgba(0,0,0,.05)');
        g.append('g').attr('transform', `translate(0,${H - 26})`).call(d3.axisBottom(x).ticks(4).tickSize(0)).attr('class', 'axis').select('.domain').remove();
        g.append('g').attr('transform', 'translate(30,0)').call(d3.axisLeft(y).ticks(4).tickSize(0)).attr('class', 'axis').select('.domain').remove();
        const xs = d3.range(0, 2.001, .01);
        g.append('path').attr('d', d3.line().x(r => x(r)).y(r => y(r * A))(xs)).attr('fill', 'none').attr('stroke', C.gray).attr('stroke-dasharray', '4 4').attr('stroke-width', 1.5);
        g.append('path').attr('d', d3.line().x(r => x(r)).y(r => y(L(r, A)))(xs)).attr('fill', 'none').attr('stroke', A > 0 ? C.blue : C.red).attr('stroke-width', 2.5);
        g.append('circle').attr('cx', x(rho)).attr('cy', y(L(rho, A))).attr('r', 6).attr('fill', C.orange).attr('stroke', '#fff').attr('stroke-width', 2);
        g.append('text').attr('x', 34).attr('y', 14).attr('class', 'dm-lbl').style('font-weight', 600).text(title);
      });
      const st = A => { const clipped = A > 0 ? rho > 1 + eps : rho < 1 - eps; return `ρ=${rho.toFixed(2)}，L=${fmt(L(rho, A))}，${clipped ? '<b style="color:#e5484d">梯度为 0（已截断）</b>' : '<b style="color:#2f9e5a">有梯度</b>'}`; };
      f.side.innerHTML = `<p><b>Â&gt;0：</b>${st(1)}</p><p><b>Â&lt;0：</b>${st(-1)}</p><p>虚线是未截断的 ρÂ，实线是 PPO 实际优化的 min(ρÂ, clip(ρ)Â)。只有"朝有利方向走过头"时才截断；朝不利方向偏离仍会被拉回。</p>`;
    }
    const row = document.createElement('div'); row.className = 'dm-row';
    row.append(slider('截断范围 ε', .05, .5, .01, eps, v => { eps = v; draw(); }), slider('概率比 ρ', 0, 2, .01, rho, v => { rho = v; draw(); }));
    f.ctrl.appendChild(row);
    f.note.textContent = '拖动 ρ：好动作在 ρ>1+ε 后不再被继续推高；坏动作在 ρ<1−ε 后不再被继续压低。';
    draw();
  }

  // ───────── 7. GAE 权重与优势估计 ─────────
  function gae(box) {
    const f = frame(box, 'GAE：λ 如何在偏差与方差间折中', '左：未来第 l 步 TD 误差的权重 (γλ)ˡ；右：一条示例轨迹上的优势估计');
    let gm = .99, lam = .95;
    const r = [0, 0, 1, 0, 0, 0, 0, 0, 0, 10], V = [2, 2.3, 2.6, 2.5, 3.2, 4, 5, 6.2, 7.5, 9, 0];  // 回合在 t=9 后结束
    const adv = (g, l) => { const A = new Array(10); let a = 0; for (let t = 9; t >= 0; t--) { const d = r[t] + g * V[t + 1] - V[t]; a = d + g * l * a; A[t] = a; } return A; };
    const W = 520, H = 190, svg = d3.select(f.viz).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'dm-svg');
    function draw() {
      svg.selectAll('*').remove();
      const K = 40, x = d3.scaleBand().domain(d3.range(K)).range([30, 240]).padding(.15), y = d3.scaleLinear().domain([0, 1]).range([H - 24, 18]);
      svg.append('text').attr('x', 30).attr('y', 12).attr('class', 'dm-lbl').text('权重 (γλ)ˡ');
      svg.selectAll('rect.b').data(d3.range(K)).join('rect').attr('x', l => x(l)).attr('width', x.bandwidth()).attr('y', l => y((gm * lam) ** l)).attr('height', l => y(0) - y((gm * lam) ** l)).attr('fill', C.blue);
      svg.append('g').attr('transform', `translate(0,${H - 24})`).call(d3.axisBottom(x).tickValues([0, 10, 20, 30]).tickSize(0)).attr('class', 'axis').select('.domain').remove();
      const lines = [[adv(gm, 0), C.orange, 'λ=0（一步 TD）'], [adv(gm, 1), C.purple, 'λ=1（MC）'], [adv(gm, lam), C.blue, `λ=${lam}`]];
      const x2 = d3.scaleLinear().domain([0, 9]).range([280, W - 10]), all = lines.flatMap(l => l[0]);
      const y2 = d3.scaleLinear().domain([Math.min(0, d3.min(all)), d3.max(all)]).nice().range([H - 24, 18]);
      svg.append('g').attr('transform', `translate(0,${H - 24})`).call(d3.axisBottom(x2).ticks(9).tickSize(0)).attr('class', 'axis').select('.domain').remove();
      svg.append('g').attr('transform', 'translate(280,0)').call(d3.axisLeft(y2).ticks(4).tickSize(0)).attr('class', 'axis').select('.domain').remove();
      svg.append('line').attr('x1', 280).attr('x2', W - 10).attr('y1', y2(0)).attr('y2', y2(0)).attr('stroke', C.soft);
      lines.forEach(([A, c, n], i) => {
        svg.append('path').attr('d', d3.line().x((v, t) => x2(t)).y(v => y2(v))(A)).attr('fill', 'none').attr('stroke', c).attr('stroke-width', i === 2 ? 2.6 : 1.5).attr('stroke-dasharray', i === 2 ? null : '4 3');
        svg.append('text').attr('x', 290 + i * 78).attr('y', 12).attr('fill', c).attr('class', 'dm-lbl').text(n);
      });
      f.side.innerHTML = `<div class="dm-stat"><b>${(1 / (1 - gm * lam)).toFixed(1)}</b><span>等效视界 1/(1−γλ)（步）</span></div>
        <p>示例轨迹：t=2 得 +1，t=9 得 +10 后结束；V 是一个不太准的 critic。λ=0 只看眼前一步 TD 误差，早期几步几乎感受不到 t=9 的大奖励；λ=1 把它完整传回来，但也带上了全部噪声。</p>`;
    }
    const row = document.createElement('div'); row.className = 'dm-row';
    row.append(slider('γ', .8, .999, .001, gm, v => { gm = v; draw(); }, v => v.toFixed(3)), slider('λ', 0, 1, .01, lam, v => { lam = v; draw(); }));
    f.ctrl.appendChild(row);
    f.note.textContent = '实践中 λ=0.95、γ=0.99 是 PPO 的常用默认值。';
    draw();
  }

  const registry = { grid, gamma, bandit, rw: randomWalk, gauss, ppoclip, gae };
  function mount(root) {
    root.querySelectorAll('.demo[data-demo]').forEach(d => {
      if (d.dataset.ready) return; d.dataset.ready = '1';
      try { registry[d.dataset.demo](d, JSON.parse(d.dataset.opts || '{}')); } catch (e) { console.error('演示加载失败', d.dataset.demo, e); d.innerHTML = '<p class="muted">演示加载失败</p>'; }
    });
  }
  // 每节课挂载哪些演示
  const BY_LESSON = {
    intro: [['bandit']], mdp: [['grid', { mode: 'vi' }]], return: [['gamma']], policy: [['gauss']], value: [['grid', { mode: 'vi' }]],
    bellman: [['grid', { mode: 'vi' }]], bellman_opt: [['grid', { mode: 'vi' }]], dp: [['grid', { mode: 'vi' }]],
    mc: [['rw']], td: [['rw']], tdlambda: [['gae']], explore: [['bandit']], qlearning: [['grid', { mode: 'q' }]], sarsa: [['grid', { mode: 'q' }]],
    pgt: [['gauss']], adv: [['gae']], gae: [['gae']], trpo: [['ppoclip']], ppo: [['ppoclip'], ['gae']], is: [['ppoclip']], maxent: [['gauss']], sac: [['gauss']],
  };
  return { mount, stopAll, BY_LESSON };
})();
