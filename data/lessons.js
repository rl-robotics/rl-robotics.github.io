// 学习路线与详细讲解 —— 手工撰写
// 正文使用简易标记：空行分段；"- " 开头为列表；$...$ 行内公式；$$...$$ 独立公式；**粗体**；`代码`
// 字段: level 难度, mins 阅读分钟, one 一句话理解, intuit 直觉, formal 正式定义, terms 公式逐项解释,
//       example 例子, algo 伪代码, pitfalls 常见误区, robot 机器人视角, quiz 自测 [问, 答], read 延伸阅读 [key 或 [类型, 标题, url]]
(() => {
const R = String.raw;

// 延伸阅读资源库（均已核实可访问）
window.READ = {
  SB:        ['教材', 'Sutton & Barto《Reinforcement Learning: An Introduction》第 2 版（免费 PDF）', 'http://incompleteideas.net/book/RLbook2020.pdf'],
  EASYRL:    ['中文教程', 'Datawhale《蘑菇书 EasyRL》在线版', 'https://datawhalechina.github.io/easy-rl/'],
  SU1:       ['入门', 'OpenAI Spinning Up · Part 1：RL 核心概念', 'https://spinningup.openai.com/en/latest/spinningup/rl_intro.html'],
  SU2:       ['入门', 'OpenAI Spinning Up · Part 2：RL 算法分类', 'https://spinningup.openai.com/en/latest/spinningup/rl_intro2.html'],
  SU3:       ['推导', 'OpenAI Spinning Up · Part 3：策略梯度推导', 'https://spinningup.openai.com/en/latest/spinningup/rl_intro3.html'],
  SU_VPG:    ['算法', 'Spinning Up · Vanilla Policy Gradient', 'https://spinningup.openai.com/en/latest/algorithms/vpg.html'],
  SU_TRPO:   ['算法', 'Spinning Up · TRPO', 'https://spinningup.openai.com/en/latest/algorithms/trpo.html'],
  SU_PPO:    ['算法', 'Spinning Up · PPO（含伪代码）', 'https://spinningup.openai.com/en/latest/algorithms/ppo.html'],
  SU_DDPG:   ['算法', 'Spinning Up · DDPG', 'https://spinningup.openai.com/en/latest/algorithms/ddpg.html'],
  SU_TD3:    ['算法', 'Spinning Up · TD3', 'https://spinningup.openai.com/en/latest/algorithms/td3.html'],
  SU_SAC:    ['算法', 'Spinning Up · SAC', 'https://spinningup.openai.com/en/latest/algorithms/sac.html'],
  SU_KEY:    ['论文清单', 'Spinning Up · 深度 RL 关键论文清单', 'https://spinningup.openai.com/en/latest/spinningup/keypapers.html'],
  SILVER:    ['视频课', 'David Silver · UCL 强化学习课程（经典 10 讲）', 'https://www.davidsilver.uk/teaching/'],
  CS285:     ['视频课', 'UC Berkeley CS285 深度强化学习（Sergey Levine）', 'https://rail.eecs.berkeley.edu/deeprlcourse/'],
  HF1:       ['动手', 'Hugging Face Deep RL 课程 · Unit 1 入门', 'https://huggingface.co/learn/deep-rl-course/unit1/introduction'],
  HF2:       ['动手', 'Hugging Face Deep RL 课程 · Unit 2 Q-learning', 'https://huggingface.co/learn/deep-rl-course/unit2/introduction'],
  HF3:       ['动手', 'Hugging Face Deep RL 课程 · Unit 3 DQN', 'https://huggingface.co/learn/deep-rl-course/unit3/introduction'],
  HF4:       ['动手', 'Hugging Face Deep RL 课程 · Unit 4 策略梯度', 'https://huggingface.co/learn/deep-rl-course/unit4/introduction'],
  HF6:       ['动手', 'Hugging Face Deep RL 课程 · Unit 6 Actor-Critic', 'https://huggingface.co/learn/deep-rl-course/unit6/introduction'],
  HF8:       ['动手', 'Hugging Face Deep RL 课程 · Unit 8 PPO', 'https://huggingface.co/learn/deep-rl-course/unit8/introduction'],
  LW_RL:     ['博客', 'Lilian Weng · A (Long) Peek into Reinforcement Learning', 'https://lilianweng.github.io/posts/2018-02-19-rl-overview/'],
  LW_PG:     ['博客', 'Lilian Weng · Policy Gradient Algorithms', 'https://lilianweng.github.io/posts/2018-04-08-policy-gradient/'],
  LW_BANDIT: ['博客', 'Lilian Weng · 多臂老虎机与探索', 'https://lilianweng.github.io/posts/2018-01-23-multi-armed-bandit/'],
  LW_DR:     ['博客', 'Lilian Weng · Domain Randomization for Sim2Real', 'https://lilianweng.github.io/posts/2019-05-05-domain-randomization/'],
  LW_DIFF:   ['博客', 'Lilian Weng · What are Diffusion Models?', 'https://lilianweng.github.io/posts/2021-07-11-diffusion-models/'],
  PPO37:     ['工程', 'The 37 Implementation Details of PPO（ICLR Blog）', 'https://iclr-blog-track.github.io/2022/03/25/ppo-implementation-details/'],
  CLEANRL:   ['代码', 'CleanRL：单文件、可读性极高的 RL 算法实现', 'https://docs.cleanrl.dev/'],
  GYM:       ['代码', 'Gymnasium：标准 RL 环境接口', 'https://gymnasium.farama.org/'],
  LEGGEDGYM: ['代码', 'legged_gym：腿足机器人并行 RL 训练', 'https://github.com/leggedrobotics/legged_gym'],
  RSLRL:     ['代码', 'rsl_rl：机器人常用的 PPO 实现', 'https://github.com/leggedrobotics/rsl_rl'],
  ISAACLAB:  ['代码', 'Isaac Lab 文档', 'https://isaac-sim.github.io/IsaacLab/'],
  DEEPMIMIC: ['项目页', 'DeepMimic 项目主页（视频）', 'https://xbpeng.github.io/projects/DeepMimic/index.html'],
  AMP:       ['项目页', 'AMP 项目主页（视频）', 'https://xbpeng.github.io/projects/AMP/index.html'],
};

window.CHAPTERS = [
  { id: 'c1', name: '强化学习是什么', desc: '智能体、环境、奖励、策略、价值——先建立全局图景，再进入公式。', lessons: ['intro', 'mdp', 'return', 'policy', 'value'] },
  { id: 'c2', name: '贝尔曼方程：价值的递归', desc: '几乎所有 RL 算法都在近似求解贝尔曼方程。理解它，就理解了一半。', lessons: ['bellman', 'bellman_opt', 'dp'] },
  { id: 'c3', name: '从经验中学习：MC 与 TD', desc: '不知道环境模型时，如何只靠试错来估计价值？', lessons: ['mc', 'td', 'tdlambda', 'explore', 'onoff'] },
  { id: 'c4', name: '价值方法：Q-learning → DQN', desc: '学会每个动作的价值，然后选最好的——深度 RL 的起点。', lessons: ['qlearning', 'sarsa', 'dqn', 'ddqn'] },
  { id: 'c5', name: '策略梯度：直接优化策略', desc: '从 REINFORCE 到 PPO：机器人运控中最常用的一条路线。', lessons: ['pgt', 'reinforce', 'adv', 'actorcritic', 'gae', 'is', 'trpo', 'ppo'] },
  { id: 'c6', name: '连续控制：DDPG、TD3、SAC', desc: '动作是连续的关节力矩/角度时，如何高效地复用数据？', lessons: ['dpg', 'ddpg', 'td3', 'maxent', 'sac'] },
  { id: 'c7', name: '机器人 RL：从仿真到真机', desc: '为什么仿真里训练好的策略能直接在真机上跑？sim-to-real 的工具箱。', lessons: ['pomdp', 'actionspace', 'shaping', 'parallel', 'curriculum', 'dr', 'asym', 'privileged', 'rma', 'estimator'] },
  { id: 'c8', name: '模仿学习与运动先验', desc: '让机器人"像人一样动"：从行为克隆到运动跟踪。', lessons: ['bc', 'dagger', 'gail', 'deepmimic', 'amp', 'diffpolicy'] },
  { id: 'c9', name: '拓展：世界模型、离线 RL 与大模型', desc: '前沿方向一览，按需深入。', lessons: ['dreamer', 'tdmpc', 'offline', 'cql', 'rlhf', 'grpo', 'vlarl'] },
];

window.LESSONS = {
  // ═════════ 第 1 章 ═════════
  intro: {
    title: '什么是强化学习', en: 'What is Reinforcement Learning', level: '入门', mins: 8,
    one: '强化学习 = 智能体通过"试错 + 奖励反馈"，自己摸索出怎样行动才能长期获得最多奖励。',
    intuit: R`想象你在教一只小狗学会坐下。你不会告诉它"把后腿弯曲 90 度"，而是：它做对了就给零食，做错了就不给。几次之后，小狗自己"悟"出了坐下 = 有零食。这就是强化学习的核心：**没有标准答案，只有奖励信号**。

和你熟悉的监督学习对比：监督学习像"老师给你每道题的标准答案"；强化学习像"只告诉你考了多少分，不告诉你哪道题错了"，而且分数往往要很久之后才出来（延迟奖励）——比如机器人走了 100 步才摔倒，到底是哪一步出了问题？

强化学习有两个独特的难题：**信用分配**（这个结果该归功/归咎于之前哪个动作？）和**探索与利用**（是继续用已知不错的方法，还是尝试新方法看看会不会更好？）。后面所有算法，本质上都在用不同的方式解决这两个问题。`,
    formal: R`强化学习系统由两部分组成，它们在每个时间步 $t$ 循环交互：

- **智能体 (Agent)**：观察状态 $s_t$，选择动作 $a_t$。
- **环境 (Environment)**：接收动作，返回奖励 $r_t$ 和下一个状态 $s_{t+1}$。

这条"状态 → 动作 → 奖励 → 新状态"的序列称为**轨迹 (trajectory)**：$\tau=(s_0,a_0,r_0,s_1,a_1,r_1,\dots)$。智能体的目标是最大化**累计奖励的期望**。`,
    example: R`**机器人学走路**就是一个典型的 RL 问题：

- 状态 $s$：关节角度、角速度、机身姿态（IMU）、速度指令
- 动作 $a$：12 个（四足）或 20+ 个（人形）关节的目标角度
- 奖励 $r$：跟上指令速度 +1、摔倒 −10、能耗过大 −0.01……
- 一个"回合"：从站立开始，直到摔倒或满 20 秒

没人告诉机器人每个关节该怎么动，它在仿真里试错上亿次，最终"悟"出了走路。`,
    pitfalls: ['以为 RL 需要大量人工标注——不需要标签，但需要**设计好奖励**，这往往同样困难。', 'RL 不是万能的：如果有大量专家示范数据，模仿学习（第 8 章）往往更简单高效；现代机器人系统常把两者结合。'],
    robot: R`近几年人形/四足机器人的行走、跑酷、后空翻，大多是"在 GPU 仿真里用 RL 训练 → 直接部署到真机"（sim-to-real）。理解 RL 是理解这一切的前提。`,
    quiz: [['强化学习和监督学习最本质的区别是什么？', '监督学习有每个输入的正确答案（标签）；强化学习只有标量奖励信号，且常常是延迟的，智能体必须自己通过试错发现好的行为。'],
      ['"信用分配问题"指的是什么？', '当奖励延迟到来时（比如走了很多步才摔倒），需要判断之前哪些动作对这个结果负责。TD 学习、优势函数等都是为了解决它。']],
    read: ['SU1', 'HF1', 'EASYRL', 'SILVER'],
  },
  mdp: {
    level: '入门', mins: 10,
    one: 'MDP 是强化学习问题的"标准格式"：状态、动作、转移概率、奖励、折扣因子五样东西。',
    intuit: R`要用数学研究"试错学习"，首先得把问题写成统一的形式，这就是**马尔可夫决策过程 (MDP)**。你可以把它想成一个棋盘游戏的规则说明书：有哪些格子（状态），每步能做什么（动作），做完会以什么概率走到哪里（转移），每步得多少分（奖励）。

"马尔可夫"这个词是关键假设：**未来只取决于现在，与过去无关**。就像下棋，只要看当前棋盘就能决定下一步，不需要知道之前是怎么走到这里的。如果当前"状态"包含了做决策所需的全部信息，问题就是马尔可夫的。`,
    formal: R`一个 MDP 是五元组：

$$\mathcal{M}=(\mathcal{S},\ \mathcal{A},\ P,\ r,\ \gamma)$$

马尔可夫性写成公式是：

$$P(s_{t+1}\mid s_t,a_t,s_{t-1},a_{t-1},\dots)=P(s_{t+1}\mid s_t,a_t)$$`,
    terms: [['\\mathcal{S}', '状态空间：所有可能状态的集合（可以是离散格子，也可以是连续的关节角向量）'],
      ['\\mathcal{A}', '动作空间：离散（上下左右）或连续（关节力矩）'],
      ['P(s\'\\mid s,a)', '转移概率：在状态 s 做动作 a 后到达 s\' 的概率——也就是"环境的物理规律"'],
      ['r(s,a)', '奖励函数：做这个动作立即得到的分数'],
      ['\\gamma\\in[0,1)', '折扣因子：未来的奖励打几折（下一节详细讲）']],
    example: R`**网格世界**：一个 4×4 的格子，机器人从左上角出发，到右下角得 +1 分，掉进陷阱得 −1 分，每走一步 −0.01 分。动作是上下左右，但地面有点滑：80% 概率按意愿走，20% 概率滑向两侧。这里 $P$ 就是"80%/10%/10%"的滑动规则。

注意：在 RL 中，智能体**通常不知道** $P$ 和 $r$ 的具体形式，只能通过与环境交互来体验它们。`,
    pitfalls: ['真实机器人往往**不是**严格的 MDP：传感器看不到地面摩擦、外力等信息，这叫部分可观测（POMDP，见第 7 章）。', '状态 ≠ 观测：状态是环境的完整描述，观测是智能体实际能看到的部分。'],
    robot: R`把机器人运控写成 MDP 时，控制频率通常是 50Hz：每 20ms 读取一次状态、输出一次动作。状态里常常会加入"上一步的动作"和"历史观测"，以尽量满足马尔可夫性。`,
    quiz: [['为什么在机器人状态里要加入过去几帧的观测？', '因为单帧观测不包含速度、摩擦等隐藏信息，不满足马尔可夫性；加入历史可以让策略推断这些信息，使问题更接近 MDP。']],
    read: ['SB', 'SU1', 'SILVER', 'EASYRL'],
  },
  return: {
    level: '入门', mins: 6,
    one: '回报是"从现在起所有未来奖励的折扣和"；折扣因子 γ 决定智能体有多"远视"。',
    intuit: R`智能体要最大化的不是单步奖励，而是**长期总收益**。但未来的奖励应该和眼前的一样重要吗？现实中"今天的 100 块比明年的 100 块更值钱"，RL 里也类似：我们给越远的奖励打越多的折扣。

折扣还有一个很实际的作用：如果任务没有终点，不打折的奖励和会无穷大，没法比较；打折后总和就有限了。`,
    formal: R`时刻 $t$ 的**回报 (return)** 定义为：

$$G_t=r_t+\gamma r_{t+1}+\gamma^2 r_{t+2}+\dots=\sum_{k=0}^{\infty}\gamma^k r_{t+k}$$

它满足一个很重要的递归关系（后面贝尔曼方程的源头）：

$$G_t=r_t+\gamma\,G_{t+1}$$`,
    terms: [['G_t', '从 t 时刻起的累计折扣奖励（一个随机变量，因为未来不确定）'], ['\\gamma^k', 'k 步之后的奖励只算 γ^k 倍'], ['\\frac{1}{1-\\gamma}', '"有效视界"：γ=0.99 时约看 100 步']],
    example: R`假设奖励序列是 $1, 1, 1, \dots$（每步 +1，无限长）：

- $\gamma=0.9$：$G=1/(1-0.9)=10$
- $\gamma=0.99$：$G=100$

机器人 50Hz 控制、$\gamma=0.99$ ⇒ 大约关注未来 100 步 ≈ 2 秒。所以腿足机器人可以学会"为了不摔倒提前调整步态"，但很难直接为 1 分钟后的目标做规划。`,
    pitfalls: ['γ 不是越大越好：γ 越接近 1，回报的方差越大，学习越不稳定。', 'γ 设得太小，机器人会"短视"，比如学不会需要先蓄力再跳跃的动作。'],
    quiz: [['γ=0 时智能体会怎样？', '只关心眼前一步的奖励，完全贪心、不考虑后果。']],
    read: ['SU1', 'SB'],
  },
  policy: {
    level: '入门', mins: 6,
    one: '策略就是智能体的"行为准则"：看到某个状态，就决定做什么动作（或各动作的概率）。',
    intuit: R`策略 $\pi$ 是 RL 最终要学的东西。它可以是一张查表（状态 → 动作），也可以是一个神经网络（输入传感器数据，输出关节指令）。

策略分两种：**确定性策略**每次输出同一个动作，比如"看到台阶就抬腿"；**随机策略**输出动作的概率分布，比如"70% 抬左腿、30% 抬右腿"。随机策略的好处是天然带有探索，并且在部分可观测或对抗场景中可能更优。`,
    formal: R`- 确定性策略：$a=\mu_\theta(s)$
- 随机策略：$a\sim\pi_\theta(a\mid s)$

连续控制中最常用**对角高斯策略**：网络输出均值 $\mu_\theta(s)$，再加一个可学习的标准差 $\sigma$：

$$\pi_\theta(a\mid s)=\mathcal{N}\big(\mu_\theta(s),\ \mathrm{diag}(\sigma^2)\big)$$

RL 的目标是找到使期望回报最大的策略：

$$\pi^*=\arg\max_\pi\ J(\pi),\qquad J(\pi)=\mathbb{E}_{\tau\sim\pi}\big[G_0\big]$$`,
    terms: [['\\theta', '策略网络的参数（神经网络权重）'], ['\\mathcal{N}(\\mu,\\sigma^2)', '高斯分布：训练时从中采样动作以探索；部署时通常直接用均值 μ'], ['J(\\pi)', '策略的"好坏分数"：按这个策略行动，平均能拿多少回报']],
    robot: R`人形机器人的策略通常是一个 3 层 MLP（如 512-256-128）或 Transformer，输入几十到几百维的本体观测，输出每个关节的目标角度偏移。训练时 $\sigma$ 从较大开始逐渐变小，部署时取均值。`,
    quiz: [['为什么部署时一般用高斯策略的均值而不是采样？', '训练时的随机性是为了探索；部署时希望动作平滑稳定，采样噪声会导致抖动。']],
    read: ['SU1', 'HF1'],
  },
  value: {
    level: '入门', mins: 8,
    one: '价值函数回答"处在这个状态（并做这个动作）未来平均能拿多少回报"，是评估好坏的打分器。',
    intuit: R`下棋高手看一眼棋盘就知道"这局面我优势很大"，这种直觉就是**价值函数**。它不直接告诉你下哪步，而是给每个局面打分。

有两种价值函数：
- **状态价值 V(s)**："站在这里，按当前策略走下去，平均能得多少分"
- **动作价值 Q(s,a)**："站在这里，先做动作 a，然后按策略走，平均能得多少分"

有了 Q，选动作就很简单：选 Q 最大的那个。有了 V，就能判断一个动作"比平均水平好还是差"（即优势 A=Q−V，第 5 章的核心）。`,
    formal: R`$$V^\pi(s)=\mathbb{E}_\pi\big[G_t\mid s_t=s\big]$$

$$Q^\pi(s,a)=\mathbb{E}_\pi\big[G_t\mid s_t=s,\ a_t=a\big]$$

两者的关系：

$$V^\pi(s)=\sum_a\pi(a\mid s)\,Q^\pi(s,a)$$`,
    terms: [['\\mathbb{E}_\\pi', '在"按策略 π 行动"的所有可能未来上取平均'], ['V^\\pi', '依赖于策略：同一个状态，好策略和差策略的价值不同'], ['Q^\\pi', '多了一个"先做 a"的条件，可用来比较动作']],
    example: R`网格世界中，靠近终点的格子 V 值高，靠近陷阱的格子 V 值低。在陷阱旁边，"往陷阱方向走"的 Q 值远低于"远离陷阱"的 Q 值。

机器人中，critic 网络学的就是 V(s)：机器人摇摇欲坠时 V 很低，稳稳行走时 V 很高。`,
    pitfalls: ['价值函数是**期望**，不是某一次的实际回报；单次回报波动很大。', 'V 和 Q 都依赖于策略 π；最优价值 V*、Q* 是最优策略下的值。'],
    quiz: [['已知 Q(s,·)，如何得到一个更好的策略？', '在每个状态选择 Q 最大的动作（贪心改进），这就是策略改进的基本思想。']],
    read: ['SU1', 'SB', 'HF2'],
  },

  // ═════════ 第 2 章 ═════════
  bellman: {
    level: '入门', mins: 12,
    one: '贝尔曼方程：一个状态的价值 = 眼前的奖励 + 打折后的"下一个状态的价值"。',
    intuit: R`回报满足 $G_t=r_t+\gamma G_{t+1}$——今天的总收益 = 今天的收益 + 打折后的明天总收益。对它取期望，就得到价值函数的递归关系：**贝尔曼方程**。

它的威力在于把"无限长的未来"转化成了"一步 + 下一个状态"。我们不需要模拟到游戏结束才知道一个状态的价值，只需要知道下一步的价值。这种"用估计更新估计"的思想叫**自举 (bootstrapping)**，是 TD 学习、Q-learning、Actor-Critic 的共同基础。`,
    formal: R`**状态价值的贝尔曼期望方程**：

$$V^\pi(s)=\sum_a\pi(a\mid s)\sum_{s'}P(s'\mid s,a)\Big[r(s,a)+\gamma V^\pi(s')\Big]$$

**动作价值版本**：

$$Q^\pi(s,a)=r(s,a)+\gamma\sum_{s'}P(s'\mid s,a)\sum_{a'}\pi(a'\mid s')\,Q^\pi(s',a')$$`,
    terms: [['\\sum_a \\pi(a\\mid s)', '按策略对动作加权平均'], ['\\sum_{s\'} P(s\'\\mid s,a)', '按环境转移对下一状态加权平均'], ['r+\\gamma V(s\')', '"一步奖励 + 打折的未来"——这个整体叫 TD 目标']],
    example: R`一个只有两个状态的例子：状态 A 每步得 1 分并以 50% 留在 A、50% 去 B；B 每步得 0 分并一直留在 B。取 $\gamma=0.9$：

$$V(B)=0+0.9V(B)\Rightarrow V(B)=0$$

$$V(A)=1+0.9\big(0.5V(A)+0.5V(B)\big)\Rightarrow V(A)=\frac{1}{1-0.45}\approx1.82$$

你看，解出价值只需要解一个线性方程组。`,
    pitfalls: ['贝尔曼期望方程描述的是"给定策略"的价值（策略评估），不是最优价值——后者需要下一节的最优方程。', '"自举"会引入偏差：如果 V(s\') 估计得不准，V(s) 也会被带偏。'],
    robot: R`机器人 RL 中训练 critic 的损失函数，就是让网络输出满足（采样版本的）贝尔曼方程：$\big(V_\phi(s)-[r+\gamma V_\phi(s')]\big)^2$。`,
    quiz: [['为什么说贝尔曼方程是"递归"的？', '因为 V(s) 用 V(s\') 来定义，价值函数出现在等号两边；整个价值函数是这个方程组的不动点。']],
    read: ['SB', 'SILVER', 'EASYRL', 'LW_RL'],
  },
  bellman_opt: {
    level: '进阶', mins: 10,
    one: '贝尔曼最优方程：最优价值 = 选"最好的动作"后的一步奖励 + 打折的最优未来价值。',
    intuit: R`上一节的方程是"按固定策略走"的价值。如果每一步都选最好的动作呢？把对动作的"加权平均"换成"取最大值"，就得到**贝尔曼最优方程**。

一旦求出最优动作价值 $Q^*$，最优策略就唾手可得：**每个状态选 Q* 最大的动作**。Q-learning、DQN 都是在近似求解这个方程。`,
    formal: R`$$V^*(s)=\max_a\sum_{s'}P(s'\mid s,a)\Big[r(s,a)+\gamma V^*(s')\Big]$$

$$Q^*(s,a)=\mathbb{E}_{s'}\Big[r(s,a)+\gamma\max_{a'}Q^*(s',a')\Big]$$

$$\pi^*(s)=\arg\max_a Q^*(s,a)$$`,
    terms: [['\\max_{a\'}', '假设之后都选最优动作'], ['Q^*', '最优动作价值：唯一存在（对有限 MDP）'], ['\\arg\\max', '从 Q* 直接读出最优策略']],
    pitfalls: ['因为有 max，这个方程是**非线性**的，不能像期望方程那样直接解线性方程组，需要迭代（价值迭代 / Q-learning）。', '用带噪声的估计取 max 会系统性**高估**价值（max 偏向正噪声）——这正是 Double DQN、TD3 要解决的问题。', '连续动作下 max 很难算（无穷多个动作），所以 DDPG/SAC 用一个 actor 网络来近似 argmax。'],
    quiz: [['为什么 max 会导致过估计？', '若每个 Q 估计都有零均值噪声，取最大值会倾向于选到噪声为正的那个，所以 E[max Q̂] ≥ max E[Q̂]。']],
    read: ['SB', 'SILVER'],
  },
  dp: {
    level: '入门', mins: 8,
    one: '已知环境模型时，反复应用贝尔曼方程就能精确求出最优策略：策略迭代与价值迭代。',
    intuit: R`如果你完全知道游戏规则（$P$ 和 $r$），就不需要试错，可以直接"算"出最优策略。**动态规划**有两种经典做法：

- **策略迭代**：先评估当前策略（解贝尔曼期望方程），再根据价值贪心地改进策略，如此循环——"评估 → 改进 → 评估 → 改进"。
- **价值迭代**：直接反复套用贝尔曼最优方程更新 V，直到收敛。

"评估 + 改进"交替进行的思想叫**广义策略迭代 (GPI)**，它是所有 RL 算法的共同骨架：Actor-Critic 中 critic 负责评估、actor 负责改进。`,
    formal: R`**价值迭代**：

$$V_{k+1}(s)\leftarrow\max_a\sum_{s'}P(s'\mid s,a)\big[r+\gamma V_k(s')\big]$$

贝尔曼算子是 γ-压缩映射，所以无论从什么初值出发，$V_k\to V^*$。`,
    algo: R`策略迭代:
  初始化任意策略 π
  重复:
    # 1. 策略评估
    反复更新 V(s) ← Σ_a π(a|s) Σ_s' P(s'|s,a)[r + γV(s')] 直到收敛
    # 2. 策略改进
    对每个 s: π(s) ← argmax_a Σ_s' P(s'|s,a)[r + γV(s')]
  直到 π 不再变化`,
    pitfalls: ['动态规划需要完整的环境模型，且要遍历所有状态——机器人的状态是连续高维的，无法直接使用（维数灾难）。'],
    robot: R`DP 本身不用于机器人，但它的思想无处不在：critic 评估、actor 改进；而 MPC 可以看作在已知模型上做有限视界的规划。`,
    quiz: [['GPI 中的"评估"和"改进"分别对应 Actor-Critic 中的哪个部分？', '评估 → Critic（学习价值函数）；改进 → Actor（根据价值更新策略）。']],
    read: ['SB', 'SILVER', 'EASYRL'],
  },

  // ═════════ 第 3 章 ═════════
  mc: {
    level: '入门', mins: 7,
    one: '蒙特卡洛方法：把一个回合完整跑完，用实际拿到的回报来估计价值——简单、无偏，但方差大。',
    intuit: R`不知道环境规则怎么办？最朴素的办法：**多玩几局，取平均**。想知道"从这个状态出发平均能得多少分"，就从这里出发玩到结束，记下总分；玩很多次后取平均，就是价值的估计。

优点：不需要模型，估计是无偏的。缺点：必须等回合结束才能更新；而且每局结果受大量随机因素影响，波动（方差）很大，需要很多样本。`,
    formal: R`$$V(s_t)\leftarrow V(s_t)+\alpha\big(G_t-V(s_t)\big)$$

其中 $G_t$ 是该回合从 $t$ 开始实际获得的回报，$\alpha$ 是学习率。这其实就是在做"增量平均"。`,
    terms: [['G_t', '真实的完整回报（不含任何估计）→ 无偏'], ['\\alpha', '学习率：每次向新样本移动多少']],
    pitfalls: ['回合很长时（机器人 1000 步），一次回报包含了 1000 个随机事件的累积，方差极大。'],
    quiz: [['MC 为什么是"无偏"的？', '因为它直接使用真实回报 G_t 作为目标，没有用任何（可能不准的）估计值。']],
    read: ['SB', 'EASYRL'],
  },
  td: {
    level: '入门', mins: 12,
    one: 'TD 学习：不等回合结束，每走一步就用"奖励 + 下一状态的估计价值"来修正当前估计。',
    intuit: R`假设你每天开车回家，出发时估计要 30 分钟。路上遇到堵车，你立刻把估计改成 40 分钟——你不需要等真正到家才修正预期。这就是**时序差分 (TD) 学习**：每走一步，就用新信息修正旧估计。

TD 把 MC（用真实经验，不需要模型）和 DP（用估计值自举，不用等结束）的优点结合了起来：
- 每一步都能更新，不用等回合结束
- 目标只涉及一步随机性，**方差小得多**
- 代价是引入了一点**偏差**（因为下一状态的价值也是估计的）

TD 误差 $\delta$ 是 RL 最重要的量之一，它衡量"实际情况比预期好了多少"。神经科学发现，大脑中多巴胺神经元的放电模式与 TD 误差惊人地相似。`,
    formal: R`**TD 误差**：

$$\delta_t=r_t+\gamma V(s_{t+1})-V(s_t)$$

**TD(0) 更新**：

$$V(s_t)\leftarrow V(s_t)+\alpha\,\delta_t$$`,
    terms: [['r_t+\\gamma V(s_{t+1})', 'TD 目标：一步真实奖励 + 下一状态的估计价值'], ['\\delta_t>0', '结果比预期好 → 提高 V(s_t)'], ['\\delta_t<0', '结果比预期差 → 降低 V(s_t)']],
    example: R`开车回家：在公司估计 30 分钟（$V(\text{公司})=30$）。开了 10 分钟到高速入口，此时估计还要 25 分钟。TD 目标 = 10 + 25 = 35，TD 误差 = 35 − 30 = 5。于是把对"公司"的估计上调：$30+\alpha\cdot5$。`,
    pitfalls: ['TD 的偏差来自自举：早期 V 估计很差时，目标也不准；但随着学习进行会逐步变好。', 'TD + 神经网络 + off-policy 可能发散（"致命三角"），需要目标网络等技巧。'],
    robot: R`PPO 中的 GAE、SAC 中的 Q 学习，底层都是 TD 误差。critic 网络的训练就是在不断减小 TD 误差。`,
    quiz: [['MC 和 TD 在偏差和方差上如何权衡？', 'MC：无偏、高方差（用完整的真实回报）；TD：有偏、低方差（只用一步真实奖励 + 估计值）。TD(λ) 和 n-step 在两者之间插值。']],
    read: ['SB', 'SILVER', 'HF2', 'LW_RL'],
  },
  explore: {
    level: '入门', mins: 8,
    one: '探索与利用的两难：只用已知最好的动作可能错过更好的；一直尝试新的又浪费机会。',
    intuit: R`你常去的餐厅还不错（利用），但附近新开了一家，可能更好也可能踩雷（探索）。总是去老店，可能永远错过最好的；总是试新店，平均体验会很差。

这在 RL 里叫**探索-利用困境**。最简单的多臂老虎机问题就能体现它：几台老虎机中奖概率不同，你不知道哪台最好，如何在有限次数里赢最多？

常见策略：
- **ε-greedy**：以 ε 的概率随机选，其余时间选当前最好的
- **UCB**：给"试得少"的选项加奖励分，乐观面对不确定性
- **熵正则 / 噪声**：连续控制中，让策略保持一定随机性（PPO 的 σ、SAC 的熵奖励）`,
    formal: R`**UCB** 选择：

$$a_t=\arg\max_a\Big[\hat Q(a)+c\sqrt{\frac{\ln t}{N_t(a)}}\Big]$$

$N_t(a)$ 是动作 a 被选过的次数——越少试过，加分越多。`,
    pitfalls: ['纯随机探索在高维连续动作空间（几十个关节）几乎无效：随机抖动的关节不可能"碰巧"学会走路。'],
    robot: R`机器人中探索主要靠：高斯策略噪声 + 精心设计的稠密奖励 + 课程学习（先学简单的）+ 参考动作（模仿人类）。这些方法让探索有方向，而不是盲目试错。`,
    quiz: [['为什么机器人学走路不能只靠随机探索？', '动作空间维度高、成功行为极其稀少，随机动作几乎不可能产生有意义的步态，需要奖励塑形、课程和先验来引导。']],
    read: ['LW_BANDIT', 'SB'],
  },
  onoff: {
    level: '进阶', mins: 8,
    one: 'On-policy 只能用"当前策略刚采的数据"学习；Off-policy 可以反复利用"任何策略采过的旧数据"。',
    intuit: R`打个比方：on-policy 像"只能从自己刚刚的亲身经历中学习"，经历过一次就扔掉；off-policy 像"可以翻看自己以前的日记，甚至别人的日记来学习"。

- **On-policy（如 PPO）**：数据用完即弃，样本效率低，但稳定、简单。
- **Off-policy（如 SAC、DQN）**：把数据存进**经验回放缓冲区**反复使用，样本效率高，但更容易不稳定。

这个区别决定了算法适合什么场景：仿真便宜（GPU 并行一秒几十万步）时，PPO 的低样本效率不是问题；在真机上采数据很贵时，SAC 这类 off-policy 方法更有优势。`,
    formal: R`区别在于数据分布：on-policy 要求训练数据来自当前策略 $\pi_\theta$；off-policy 允许数据来自行为策略 $\mu\neq\pi_\theta$，必要时用重要性采样或 Q 学习的形式来修正。`,
    pitfalls: ['PPO 严格说是"近似 on-policy"：同一批数据会用几个 epoch，靠 clip 限制策略不要偏离太远。'],
    robot: R`2021 年 Isaac Gym 之后，"PPO + 数千并行环境"成为腿足运控的默认组合；2025 年起 FastTD3/FastSAC 等工作尝试让 off-policy 在 GPU 并行下同样快甚至更快。`,
    quiz: [['为什么 GPU 并行仿真让 PPO 流行？', '并行环境能极快地产生大量新鲜的 on-policy 数据，弥补了 PPO 数据不能复用的缺点，同时享受其稳定、易调的优点。']],
    read: ['SU2', 'LW_RL'],
  },

  // ═════════ 第 4 章 ═════════
  qlearning: {
    level: '入门', mins: 10,
    one: 'Q-learning：用贝尔曼最优方程的"采样版"，一步步把 Q 表修正到最优。',
    intuit: R`Q-learning 维护一张表：每个（状态, 动作）组合对应一个 Q 值。每走一步，就用"得到的奖励 + 下一状态最好动作的 Q 值"来修正当前格子。

它最大的特点是 **off-policy**：更新目标里用的是 $\max_{a'}$（假设之后选最好的动作），而不管实际做了什么动作。所以即使智能体在用 ε-greedy 随机探索，它学到的依然是**最优**策略的 Q 值。在表格情形下，只要每个状态-动作被访问足够多次，Q-learning 可证明收敛到 $Q^*$。`,
    formal: R`$$Q(s,a)\leftarrow Q(s,a)+\alpha\Big[\underbrace{r+\gamma\max_{a'}Q(s',a')}_{\text{TD 目标}}-Q(s,a)\Big]$$`,
    terms: [['\\max_{a\'}Q(s\',a\')', '下一状态中最好动作的价值——这让它学的是最优策略'], ['\\alpha', '学习率，常取 0.1']],
    algo: R`初始化 Q(s,a) = 0
对每个回合:
  s ← 初始状态
  重复直到回合结束:
    以 ε 概率随机选 a，否则 a ← argmax_a Q(s,a)
    执行 a，观察 r, s'
    Q(s,a) ← Q(s,a) + α [r + γ max_a' Q(s',a') − Q(s,a)]
    s ← s'`,
    pitfalls: ['Q 表只能用于小规模离散问题；连续状态需要用神经网络近似（→ DQN）。', 'max 操作带来过估计偏差。'],
    quiz: [['Q-learning 和 SARSA 的更新目标有什么不同？', 'Q-learning 用 max_a\' Q(s\',a\')（最优动作），是 off-policy；SARSA 用实际执行的下一个动作 Q(s\',a\')，是 on-policy。']],
    read: ['HF2', 'SB', 'EASYRL'],
  },
  dqn: {
    level: '进阶', mins: 12,
    one: 'DQN = 用深度神经网络近似 Q 函数 + 经验回放 + 目标网络，开启了深度强化学习时代。',
    intuit: R`2013 年，DeepMind 让一个神经网络只看游戏画面像素就学会了玩几十款 Atari 游戏。这就是 **DQN**：把 Q 表换成卷积神经网络，输入画面，输出每个按键的 Q 值。

但直接把 Q-learning 和神经网络结合会非常不稳定，DQN 用两个关键技巧解决：

- **经验回放 (Experience Replay)**：把交互数据存进一个大缓冲区，训练时随机抽取。这打破了连续样本之间的强相关性，也让每条数据能被多次使用。
- **目标网络 (Target Network)**：计算 TD 目标时使用一个"冻结"的旧网络副本，每隔一段时间才同步一次。否则网络一边更新、目标一边移动，就像"追自己的影子"。`,
    formal: R`$$\mathcal{L}(\theta)=\mathbb{E}_{(s,a,r,s')\sim\mathcal{D}}\Big[\big(r+\gamma\max_{a'}Q_{\bar\theta}(s',a')-Q_\theta(s,a)\big)^2\Big]$$`,
    terms: [['\\mathcal{D}', '经验回放缓冲区'], ['\\bar\\theta', '目标网络参数（定期从 θ 复制）'], ['Q_\\theta', '正在训练的在线网络']],
    algo: R`初始化回放缓冲区 D，Q 网络 θ，目标网络 θ̄ ← θ
循环:
  用 ε-greedy 根据 Q_θ 选动作，执行并把 (s,a,r,s') 存入 D
  从 D 随机采样一个 mini-batch
  y = r + γ · max_a' Q_θ̄(s',a')        # 用目标网络
  最小化 (y − Q_θ(s,a))² 更新 θ
  每 C 步: θ̄ ← θ`,
    pitfalls: ['DQN 只适用于**离散动作**（要对每个动作输出一个 Q 值再取 max），不能直接控制机器人关节。', '后续改进：Double DQN（减过估计）、Dueling、优先回放、Rainbow 等。'],
    robot: R`DQN 本身很少用于运控，但"经验回放 + 目标网络"被 DDPG、TD3、SAC 继承，是所有 off-policy 连续控制算法的基础。`,
    quiz: [['如果不用目标网络会发生什么？', 'TD 目标会随着每次参数更新而改变，训练目标不断移动，容易振荡甚至发散。']],
    read: ['HF3', 'CLEANRL', 'SU_KEY'],
  },

  // ═════════ 第 5 章 ═════════
  pgt: {
    level: '进阶', mins: 14,
    one: '策略梯度定理告诉我们：增大"带来高回报的动作"的概率，就能提升策略——而且不需要知道环境模型。',
    intuit: R`价值方法是"先学打分，再选最好的"；策略梯度是"直接调整策略本身"。思路非常直观：

**如果某个动作带来了好结果，就让它在这个状态下出现的概率更大；带来坏结果，就让概率更小。**

问题在于：回报依赖于环境的动力学，我们无法对环境求导。策略梯度定理的巧妙之处在于，它证明了梯度只需要对**策略的对数概率**求导，环境部分会被消掉。这就让我们可以只靠采样来估计梯度。`,
    formal: R`$$\nabla_\theta J(\theta)=\mathbb{E}_{\tau\sim\pi_\theta}\Big[\sum_{t}\nabla_\theta\log\pi_\theta(a_t\mid s_t)\,\Psi_t\Big]$$

其中 $\Psi_t$ 可以是回报 $G_t$、$Q(s_t,a_t)$、或者优势 $A(s_t,a_t)$（方差依次降低）。

关键推导一步——**对数导数技巧**：

$$\nabla_\theta\pi_\theta=\pi_\theta\,\nabla_\theta\log\pi_\theta$$

把轨迹概率 $P(\tau)=p(s_0)\prod_t\pi_\theta(a_t\mid s_t)P(s_{t+1}\mid s_t,a_t)$ 取对数再求导，环境转移 $P(s_{t+1}\mid s_t,a_t)$ 与 θ 无关，导数为 0，直接消失。`,
    terms: [['\\nabla_\\theta\\log\\pi_\\theta(a\\mid s)', '"如何调参才能让这个动作更可能发生"的方向'], ['\\Psi_t', '这个动作有多好——作为方向的权重'], ['\\mathbb{E}_{\\tau\\sim\\pi_\\theta}', '用当前策略采样的轨迹来估计（所以是 on-policy）']],
    example: R`可以把它理解成"带权重的行为克隆"：行为克隆是让所有示范动作的概率都变大（权重都是 1）；策略梯度是让自己采到的动作按"好坏程度"加权——好的变大，坏的变小。`,
    pitfalls: ['直接用 $G_t$ 作权重方差非常大，实践中几乎总要减去基线、使用优势函数。', '策略梯度对步长很敏感：一步走太大，策略可能崩溃且难以恢复（→ TRPO/PPO）。'],
    quiz: [['为什么策略梯度不需要环境模型？', '轨迹概率中与环境有关的转移项不依赖策略参数 θ，取对数求导后为零，梯度只剩下 ∇log π 部分，可以用采样估计。']],
    read: ['SU3', 'LW_PG', 'HF4', 'CS285'],
  },
  reinforce: {
    level: '进阶', mins: 8,
    one: 'REINFORCE：最朴素的策略梯度算法——跑完一回合，用每步的回报加权对数概率梯度。',
    intuit: R`REINFORCE 是策略梯度定理最直接的实现：完整跑一个回合，算出每一步之后的回报 $G_t$，然后让"$G_t$ 高的动作"概率上升。

它简单但效率低：因为用的是蒙特卡洛回报，方差很大，需要大量回合才能学好。改进方法是减去一个**基线** $b(s)$（通常是 V(s)），这不会改变梯度的期望，却能大幅降低方差。`,
    formal: R`$$\nabla_\theta J\approx\frac{1}{N}\sum_{i=1}^{N}\sum_{t}\nabla_\theta\log\pi_\theta(a_t^i\mid s_t^i)\,\big(G_t^i-b(s_t^i)\big)$$`,
    algo: R`循环:
  用 π_θ 采样 N 条完整轨迹
  对每步计算 G_t = Σ_k γ^k r_{t+k}
  loss = −mean( log π_θ(a_t|s_t) · (G_t − b(s_t)) )
  梯度下降更新 θ`,
    pitfalls: ['减去基线不改变期望梯度的原因：$\mathbb{E}_a[\nabla\log\pi(a\mid s)]\,b(s)=b(s)\nabla\sum_a\pi(a\mid s)=0$。'],
    quiz: [['为什么减去只依赖状态的基线不会引入偏差？', '因为 ∇log π 在动作上的期望为 0，乘以与动作无关的 b(s) 后期望仍为 0。']],
    read: ['SU_VPG', 'HF4', 'SU3'],
  },
  adv: {
    level: '进阶', mins: 8,
    one: '优势 A(s,a) = Q(s,a) − V(s)：衡量"这个动作比平均水平好多少"，是策略梯度最好的权重。',
    intuit: R`假设机器人在某个状态下，所有动作的回报都是 100 左右。用回报作权重时，所有动作的概率都会被"推高"，只是推高的程度不同——这很低效，噪声也大。

**优势函数**减去了这个"平均水平" V(s)：比平均好的动作得正权重，比平均差的得负权重。这样梯度信号只关注"相对好坏"，方差大大降低。`,
    formal: R`$$A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s)$$

最简单的估计是一步 TD 误差：

$$\hat A_t=r_t+\gamma V(s_{t+1})-V(s_t)=\delta_t$$`,
    terms: [['A>0', '这个动作好于平均 → 增大其概率'], ['A<0', '差于平均 → 减小其概率']],
    pitfalls: ['PPO 实现中通常会对一个 batch 内的优势做标准化（减均值除标准差），这对稳定性影响很大。'],
    read: ['SU3', 'LW_PG'],
  },
  actorcritic: {
    level: '进阶', mins: 10,
    one: 'Actor-Critic：Actor 负责选动作，Critic 负责打分；用 Critic 的估计代替真实回报，降低方差。',
    intuit: R`把策略梯度想象成一位学习中的运动员（Actor）和一位教练（Critic）：
- **Actor（策略网络）**：决定做什么动作
- **Critic（价值网络）**：评估"这个状态有多好"，并告诉 Actor 刚才的动作比预期好还是差

Critic 用 TD 学习训练，Actor 用 Critic 给出的优势来更新。相比 REINFORCE 等回合结束，Actor-Critic 每步都能更新，方差也小得多。几乎所有现代深度 RL 算法（PPO、SAC、TD3）都是 Actor-Critic 结构。`,
    formal: R`**Critic 更新**（最小化 TD 误差）：

$$\phi\leftarrow\phi-\beta\nabla_\phi\big(r+\gamma V_\phi(s')-V_\phi(s)\big)^2$$

**Actor 更新**：

$$\theta\leftarrow\theta+\alpha\,\delta_t\,\nabla_\theta\log\pi_\theta(a_t\mid s_t)$$`,
    pitfalls: ['Critic 学得不准会误导 Actor：如果 Critic 有偏差，策略可能朝错误方向优化。', '机器人中 Critic 只在训练时使用，部署只需要 Actor——所以 Critic 可以"作弊"看特权信息（非对称 AC）。'],
    robot: R`在 rsl_rl / Isaac Lab 中，`+'`ActorCritic`'+R` 类同时包含 actor 和 critic 两个 MLP；部署到真机时只导出 actor 的权重。`,
    quiz: [['为什么 Critic 可以使用 Actor 看不到的信息？', 'Critic 只用于训练时计算优势，部署时不需要；因此它可以使用仿真中的真实状态，让价值估计更准确。']],
    read: ['HF6', 'SB', 'LW_PG'],
  },
  gae: {
    level: '进阶', mins: 10,
    one: 'GAE 把多步 TD 误差按 (γλ) 指数加权求和，用 λ 一个旋钮在偏差与方差之间平滑调节。',
    intuit: R`估计优势有两个极端：
- 一步 TD 误差 $\delta_t$：方差小，但如果 V 不准就偏差大
- MC 回报减基线 $G_t-V(s_t)$：无偏，但方差大

**GAE** 把未来每一步的 TD 误差按 $(\gamma\lambda)^l$ 衰减加起来。λ=0 就是一步 TD，λ=1 就是 MC，中间值在两者间平衡。实践中 λ=0.95 几乎是 PPO 的标准配置。`,
    formal: R`$$\hat A_t^{\text{GAE}(\gamma,\lambda)}=\sum_{l=0}^{\infty}(\gamma\lambda)^l\,\delta_{t+l},\qquad\delta_t=r_t+\gamma V(s_{t+1})-V(s_t)$$

实现时从后往前递推：

$$\hat A_t=\delta_t+\gamma\lambda\,\hat A_{t+1}$$`,
    algo: R`adv = 0
for t = T-1 ... 0:
    δ = r[t] + γ · V[t+1] · (1 − done[t]) − V[t]
    adv = δ + γ · λ · (1 − done[t]) · adv
    A[t] = adv
returns = A + V          # 用作 critic 的回归目标`,
    pitfalls: ['回合被时间截断（timeout，不是真正失败）时，应该用 V(s_{T}) 自举，而不是当作终止状态把未来价值设为 0——这是机器人训练中常见的 bug。'],
    quiz: [['λ=0 和 λ=1 时 GAE 分别退化成什么？', 'λ=0 → 一步 TD 误差 δ_t；λ=1 → Σγ^l δ_{t+l} = G_t − V(s_t)，即 MC 优势。']],
    read: ['SU_PPO', 'PPO37', 'LW_PG'],
  },
  is: {
    level: '进阶', mins: 7,
    one: '重要性采样：用"旧策略"采的数据来估计"新策略"下的期望，只需乘上两者的概率比。',
    intuit: R`PPO 每采一批数据要更新好几轮，但更新第二轮时策略已经变了，数据却是旧策略采的——这时就需要**重要性采样**来修正：某个动作在新策略下更可能出现，就给它更大的权重；反之更小。

这个概率比 $\rho=\pi_{\text{new}}/\pi_{\text{old}}$ 就是 PPO 公式里的核心变量。`,
    formal: R`$$\mathbb{E}_{a\sim\pi}[f(a)]=\mathbb{E}_{a\sim\mu}\Big[\frac{\pi(a\mid s)}{\mu(a\mid s)}\,f(a)\Big]$$`,
    pitfalls: ['两个策略差别太大时，概率比可能变得极大或极小，估计方差爆炸——所以要限制新旧策略的差距（TRPO 的 KL 约束 / PPO 的 clip）。'],
    read: ['LW_PG', 'SB'],
  },
  trpo: {
    level: '进阶', mins: 10,
    one: 'TRPO：每次更新都把新旧策略的差距（KL 散度）限制在一个"信赖域"内，保证稳定提升。',
    intuit: R`普通策略梯度有个致命问题：步长难调。步子太小学得慢；步子太大，策略可能一下子变得很差，而差的策略又会采到差的数据，形成恶性循环，再也学不回来。

TRPO 的想法：**不在参数空间限制步长，而在"策略行为"空间限制**。用 KL 散度衡量新旧策略输出分布的差别，要求它不超过 δ。在这个"信赖域"内，替代目标是真实目标的可靠近似，可以放心优化。`,
    formal: R`$$\max_\theta\ \mathbb{E}\Big[\frac{\pi_\theta(a\mid s)}{\pi_{\text{old}}(a\mid s)}\hat A\Big]\quad\text{s.t.}\quad\mathbb{E}_s\big[D_{KL}(\pi_{\text{old}}(\cdot\mid s)\,\|\,\pi_\theta(\cdot\mid s))\big]\le\delta$$

求解需要用共轭梯度法近似计算 $F^{-1}g$（F 为 Fisher 信息矩阵），再做线搜索。`,
    pitfalls: ['TRPO 理论优美但实现复杂、计算量大，现在几乎被 PPO 取代——PPO 用一阶优化实现了类似的效果。'],
    read: ['SU_TRPO', 'LW_PG'],
  },
  ppo: {
    level: '进阶', mins: 18,
    one: 'PPO 用"截断概率比"代替 TRPO 的硬约束：简单、稳定、易并行，是机器人运控 RL 的绝对主力。',
    intuit: R`PPO 想要 TRPO 的稳定性，但不想要它的复杂实现。它的做法非常聪明：**直接在目标函数里"截断"**。

设概率比 $\rho=\pi_\theta/\pi_{\text{old}}$。如果某个动作的优势是正的（好动作），我们想增大它的概率，但当 $\rho$ 超过 $1+\epsilon$ 时就不再给奖励——"已经够了，别再推了"。如果优势是负的，当 $\rho$ 低于 $1-\epsilon$ 时也不再惩罚。这样策略每次更新都不会偏离太远，而且只需要普通的梯度下降。

PPO 的另一个优势是可以把同一批数据重复用几个 epoch，样本效率比普通策略梯度高。再加上 GAE、价值函数、熵奖励，就构成了完整的 PPO。`,
    formal: R`**截断目标**：

$$\mathcal{L}^{\text{CLIP}}(\theta)=\mathbb{E}_t\Big[\min\big(\rho_t\hat A_t,\ \mathrm{clip}(\rho_t,1-\epsilon,1+\epsilon)\,\hat A_t\big)\Big],\qquad\rho_t=\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\text{old}}(a_t\mid s_t)}$$

**完整损失**（最小化）：

$$\mathcal{L}=-\mathcal{L}^{\text{CLIP}}+c_1\,\big(V_\phi(s_t)-\hat R_t\big)^2-c_2\,\mathcal{H}\big[\pi_\theta(\cdot\mid s_t)\big]$$`,
    terms: [['\\rho_t', '新旧策略对同一动作的概率比；=1 表示没变'], ['\\epsilon', '截断范围，通常 0.2'], ['\\min(\\cdot,\\cdot)', '取较小者 → 悲观下界：只限制"过度乐观"的更新'], ['c_1(V-\\hat R)^2', 'critic 的价值损失'], ['c_2\\mathcal{H}', '熵奖励，保持探索']],
    example: R`设 $\epsilon=0.2$，某动作 $\hat A=+2$：
- 若 $\rho=1.1$：目标 = min(2.2, 2.2) = 2.2，正常有梯度
- 若 $\rho=1.5$：目标 = min(3.0, 1.2×2=2.4) = 2.4，被截断，**梯度为 0**，不再继续推高

若 $\hat A=-2$ 且 $\rho=0.5$：min(−1.0, 0.8×(−2)=−1.6) = −1.6，被截断，不再继续压低。`,
    algo: R`for iteration = 1, 2, ...:
    # 1. 采样：N 个并行环境各跑 T 步（如 4096 × 24）
    用 π_old 收集 (s, a, r, done, log π_old(a|s), V(s))
    # 2. 计算优势
    用 GAE(γ=0.99, λ=0.95) 计算 Â，returns = Â + V
    Â ← (Â − mean) / std                 # 优势标准化
    # 3. 优化：K 个 epoch × M 个 mini-batch（如 5 × 4）
    for epoch in 1..K:
        for batch in minibatches:
            ρ = exp(log π_θ(a|s) − log π_old(a|s))
            L_clip = −mean(min(ρÂ, clip(ρ, 1−ε, 1+ε)Â))
            L_v = mean((V_φ(s) − returns)²)
            L = L_clip + c1·L_v − c2·entropy
            梯度下降（梯度裁剪 max_norm=1.0）
        若 KL(π_old, π_θ) 过大：减小学习率（rsl_rl 的自适应学习率）`,
    pitfalls: ['PPO 的效果很大程度依赖"实现细节"：观测归一化、优势标准化、学习率调度、梯度裁剪、正交初始化……论文里往往一笔带过。', '时间截断（timeout）的回合要做自举处理，否则价值估计有偏。', '并行环境数、每环境步数、mini-batch 数要配套调整。'],
    robot: R`ANYmal、Unitree、Booster、Digit……几乎所有腿足/人形 sim-to-real 工作都用 PPO。典型配置：4096 并行环境、每次 rollout 24 步、5 epoch × 4 mini-batch、自适应学习率（目标 KL≈0.01），在一张 GPU 上训练几十分钟到几小时。`,
    quiz: [['为什么 PPO 的目标要对截断项和未截断项取 min？', '取 min 得到一个悲观的下界：只有当更新"有利且未超出范围"时才给梯度；超出信赖范围的乐观改进被忽略，从而防止策略更新过猛。'],
      ['PPO 是 on-policy 还是 off-policy？', '本质 on-policy：每批数据来自当前策略，用几个 epoch 后丢弃。重复使用时通过概率比和 clip 修正轻微的策略偏移。']],
    read: ['SU_PPO', 'PPO37', 'HF8', 'CLEANRL', 'RSLRL'],
  },

  // ═════════ 第 6 章 ═════════
  ddpg: {
    level: '进阶', mins: 10,
    one: 'DDPG：用 actor 网络直接输出连续动作并沿 Q 的梯度方向改进，配合经验回放与目标网络。',
    intuit: R`DQN 只能处理离散动作，因为要对每个动作取 max。机器人关节动作是连续的，没法枚举。DDPG 的办法是：**训练一个 actor 网络 μ(s) 来"找"Q 最大的动作**。

Actor 的更新方向就是"让 Q 变大的方向"：把 actor 的输出送进 critic，对动作求梯度，再反传回 actor。其余部分继承 DQN：经验回放、目标网络（DDPG 用"软更新"缓慢跟随）。`,
    formal: R`**Critic**：

$$\mathcal{L}(\phi)=\mathbb{E}\Big[\big(r+\gamma Q_{\bar\phi}(s',\mu_{\bar\theta}(s'))-Q_\phi(s,a)\big)^2\Big]$$

**Actor**：

$$\nabla_\theta J=\mathbb{E}_s\Big[\nabla_aQ_\phi(s,a)\big|_{a=\mu_\theta(s)}\nabla_\theta\mu_\theta(s)\Big]$$

**软更新**：$\bar\theta\leftarrow\tau\theta+(1-\tau)\bar\theta$（τ≈0.005）`,
    pitfalls: ['DDPG 对超参数非常敏感，Q 值容易高估，训练常常不稳定——TD3 正是为修复这些问题而生。', '确定性策略需要额外加噪声（高斯/OU 噪声）来探索。'],
    read: ['SU_DDPG', 'LW_PG'],
  },
  td3: {
    level: '进阶', mins: 9,
    one: 'TD3 用三个技巧修复 DDPG：双 Critic 取小值、延迟更新 Actor、给目标动作加噪声平滑。',
    intuit: R`DDPG 的主要问题是 Q 值过估计：actor 会去"钻" critic 的估计漏洞，找到 Q 被错误高估的动作。TD3 的三板斧：

- **双 Q 取小 (Clipped Double Q)**：训练两个 critic，目标用两者较小值，抑制高估
- **延迟策略更新**：critic 更新 2 次，actor 才更新 1 次，让 actor 追随更准确的 critic
- **目标策略平滑**：计算目标时给动作加小噪声，避免 critic 在尖锐的峰值上过拟合`,
    formal: R`$$y=r+\gamma\min_{i=1,2}Q_{\bar\phi_i}\big(s',\ \mathrm{clip}(\mu_{\bar\theta}(s')+\epsilon,\ a_{\text{low}},a_{\text{high}})\big),\quad\epsilon\sim\mathrm{clip}(\mathcal{N}(0,\sigma),-c,c)$$`,
    robot: R`2025 年的 FastTD3 证明：TD3 配合大规模并行环境、超大 batch、分布式 critic，可以在几小时内训练出人形机器人策略，挑战 PPO 的地位。`,
    read: ['SU_TD3', 'CLEANRL'],
  },
  maxent: {
    level: '进阶', mins: 9,
    one: '最大熵 RL：在追求高回报的同时，让策略"尽可能随机"，带来更好的探索与鲁棒性。',
    intuit: R`普通 RL 只关心回报，学到的策略往往很"窄"：只会一种做事方式，环境稍有变化就失败。**最大熵 RL** 在奖励里加入策略的熵（随机性）：

"在保证高分的前提下，尽量保留多种做法。"

好处：探索更充分；学到多种解法，更鲁棒；优化面更平滑。温度系数 α 控制"随机性"与"回报"的权衡。`,
    formal: R`$$J(\pi)=\sum_t\mathbb{E}\Big[r(s_t,a_t)+\alpha\,\mathcal{H}\big(\pi(\cdot\mid s_t)\big)\Big],\qquad\mathcal{H}(\pi)=-\mathbb{E}_{a\sim\pi}[\log\pi(a\mid s)]$$

对应的**软价值函数**：

$$V(s)=\mathbb{E}_{a\sim\pi}\big[Q(s,a)-\alpha\log\pi(a\mid s)\big]$$`,
    terms: [['\\mathcal{H}', '熵：分布越均匀越大'], ['\\alpha', '温度：越大越重视随机性']],
    read: ['SU_SAC', 'LW_PG'],
  },
  sac: {
    level: '进阶', mins: 14,
    one: 'SAC：最大熵框架下的 off-policy Actor-Critic，样本效率高、对超参不敏感，真机学习的常用选择。',
    intuit: R`SAC 结合了 off-policy（数据可复用，样本效率高）和最大熵（探索好、稳定）两大优点，是连续控制中最受欢迎的算法之一。

它的组成：
- **两个 Q 网络**（取最小值，继承自 TD3）
- **随机高斯策略** + tanh 压缩到动作范围
- **熵奖励**：鼓励策略保持随机
- **自动温度调节**：自动调 α 使策略熵接近目标值（通常设为 −动作维度），不用手调

在真实机器人上直接学习（没有仿真）时，SAC 是首选之一，因为每条真实数据都很珍贵。`,
    formal: R`**Q 目标**：

$$y=r+\gamma\Big(\min_{i=1,2}Q_{\bar\phi_i}(s',\tilde a')-\alpha\log\pi_\theta(\tilde a'\mid s')\Big),\quad\tilde a'\sim\pi_\theta(\cdot\mid s')$$

**策略损失**：

$$\mathcal{L}_\pi=\mathbb{E}_{s\sim\mathcal{D}}\Big[\alpha\log\pi_\theta(\tilde a\mid s)-\min_iQ_{\phi_i}(s,\tilde a)\Big],\quad\tilde a=\tanh\big(\mu_\theta(s)+\sigma_\theta(s)\odot\xi\big)$$

**温度损失**：

$$\mathcal{L}(\alpha)=\mathbb{E}\big[-\alpha\big(\log\pi_\theta(\tilde a\mid s)+\bar{\mathcal{H}}\big)\big]$$`,
    terms: [['\\xi\\sim\\mathcal{N}(0,I)', '重参数化技巧：让采样过程可微'], ['\\tanh', '把动作压缩到 [−1,1]，计算 log π 时要做变量替换修正'], ['\\bar{\\mathcal{H}}', '目标熵，常取 −dim(A)']],
    pitfalls: ['在 GPU 大规模并行（数千环境）下，原始 SAC 的扩展性不如 PPO；需要大 batch、高 UTD 等改造。', 'tanh 压缩后 log 概率需要减去 Σlog(1−tanh²) 修正项，忘记会导致熵估计错误。'],
    robot: R`DeepMind 和 Berkeley 早期真机四足学走路（2018-2022）多用 SAC/DroQ；目前在灵巧操作、真机微调中仍很常见。`,
    quiz: [['SAC 为什么不需要像 DDPG 那样额外加探索噪声？', '它本身是随机策略，且熵奖励鼓励保持随机性，探索内生于算法。']],
    read: ['SU_SAC', 'CLEANRL', 'LW_PG'],
  },

  // ═════════ 第 7 章 ═════════
  pomdp: {
    level: '进阶', mins: 10,
    one: '真实机器人看不到全部信息（地形、摩擦、外力），这类问题叫 POMDP——理解 sim-to-real 方法的钥匙。',
    intuit: R`机器人在仿真里可以知道一切：地面摩擦系数、自己的真实速度、脚下 1 米内的地形高度。但在真实世界，它只有关节编码器和 IMU，**看不到**这些信息。

这就是**部分可观测 MDP (POMDP)**：智能体只能看到观测 $o$，而不是真实状态 $s$。解决办法是**利用历史**：虽然一帧观测看不出摩擦力，但从最近 0.5 秒"脚打滑了多少"就能推断出来。

后面的非对称 AC、师生蒸馏、RMA、状态估计器，本质上都是在用不同方法解决 POMDP。`,
    formal: R`在 POMDP 中，智能体维护对真实状态的**信念** (belief)：

$$b_t(s)=P\big(s_t=s\mid o_{1:t},a_{1:t-1}\big)$$

深度 RL 中一般不显式计算信念，而是用 RNN/TCN/Transformer 编码观测历史 $h_t=f(o_{t-k:t},a_{t-k-1:t-1})$，让网络隐式推断。`,
    terms: [['o_t', '观测：机器人真实能看到的（关节角、角速度、IMU、指令）'], ['s_t', '真实状态：包括不可见的摩擦、质量、地形、外力'], ['h_t', '历史编码：网络从过去推断现在']],
    robot: R`把下面几个概念串起来理解：
- **特权信息** = 只在仿真中可获得的真实状态 $s$
- **非对称 AC**：critic 用 $s$，actor 用 $o$
- **师生蒸馏**：教师用 $s$ 学会任务，学生用 $o$ 的历史模仿教师
- **RMA / 估计器**：从历史显式估计 $s$ 中的关键部分`,
    quiz: [['为什么只靠当前一帧观测，机器人无法判断地面是否湿滑？', '单帧观测不包含动力学信息；需要观察一段时间内"施加的动作"与"实际运动"之间的关系才能推断摩擦。']],
    read: ['CS285', 'SB'],
  },
  actionspace: {
    level: '进阶', mins: 8,
    one: '机器人策略一般不直接输出力矩，而是输出关节目标角度，由高频 PD 控制器跟踪——更易学、更鲁棒。',
    intuit: R`如果让神经网络直接输出电机力矩，它必须同时学会"想去哪"和"怎么稳定地到达那里"，非常难。更好的分工是：

- **策略（50Hz）**：只决定"每个关节应该转到哪个角度"
- **PD 控制器（200Hz~1kHz）**：负责把关节"拉"到目标角度，像弹簧-阻尼器一样

PD 控制器天然提供了稳定性和柔顺性，大大简化了学习问题。`,
    formal: R`$$\tau=K_p\big(q^{\text{target}}-q\big)-K_d\,\dot q,\qquad q^{\text{target}}=q_{\text{default}}+\sigma_a\cdot a_t$$`,
    terms: [['K_p', '刚度：越大越"硬"，跟踪越准但越容易抖'], ['K_d', '阻尼：抑制振荡'], ['q_{\\text{default}}', '默认站立姿态'], ['\\sigma_a', '动作缩放，常取 0.25']],
    pitfalls: ['Kp/Kd 在仿真和真机中必须一致，否则直接失败。', '真实电机有延迟、饱和、摩擦，仿真不建模就会有 sim-to-real 差距——Hwangbo 2019 用"执行器网络"学习真实电机特性解决了这一点。'],
    read: ['LEGGEDGYM', 'ISAACLAB'],
  },
  shaping: {
    level: '进阶', mins: 10,
    one: '奖励设计决定机器人学成什么样：稠密的引导奖励让学习可行，但设计不当会被"钻空子"。',
    intuit: R`如果只在"成功走到终点"时给奖励，机器人几乎永远拿不到，学不会。所以要设计**稠密奖励**，每一步都给反馈。一个典型的 locomotion 奖励由十几项组成：

- **任务项**：跟踪线速度、角速度指令（正奖励，主导）
- **稳定项**：机身保持水平、高度合适
- **正则项**：惩罚能耗、力矩、关节加速度、动作突变（让动作平滑、节能）
- **步态项**：奖励足端腾空时间、惩罚脚滑动、拖地
- **安全项**：惩罚非足部碰撞、关节超限

调奖励权重是机器人 RL 中最耗时的工作之一。RL 会**无情地钻奖励的空子**（reward hacking）：比如只奖励前进速度，机器人可能学会"抽搐着滑行"。`,
    formal: R`**势函数塑形**（不改变最优策略的安全形式）：

$$r'(s,a,s')=r(s,a,s')+\gamma\Phi(s')-\Phi(s)$$

**速度跟踪项**的常见写法：

$$r_{\text{vel}}=\exp\Big(-\frac{\|v^{\text{cmd}}_{xy}-v_{xy}\|^2}{\sigma^2}\Big)$$`,
    pitfalls: ['惩罚项权重过大，机器人会学会"站着不动"最安全。', '这也是运动跟踪（DeepMimic/BeyondMimic）范式流行的原因：用"跟踪人类动作"一项奖励替代大量手工项。'],
    robot: R`可以去读 legged_gym 中的 `+'`_reward_*`'+R` 函数，每一项奖励都是一个短函数，直观易懂。`,
    read: ['LEGGEDGYM', 'ISAACLAB', 'SB'],
  },
  parallel: {
    level: '入门', mins: 7,
    one: 'GPU 并行仿真让一张显卡同时运行数千个机器人，"几分钟学会走路"，改变了机器人 RL 的玩法。',
    intuit: R`传统仿真器（MuJoCo、PyBullet）在 CPU 上一次跑一个环境，训练一个四足策略可能要几天。2021 年 NVIDIA 的 **Isaac Gym** 把物理仿真、观测计算、奖励计算和神经网络训练**全部放在 GPU 上**，数据不用在 CPU 和 GPU 之间来回拷贝。

结果：一张 RTX 显卡并行 4096 个机器人，ETH 的 legged_gym 用 20 分钟就训练出能走复杂地形的 ANYmal 策略。这让"PPO + 大批量并行"成为标准配方，研究迭代速度提升了几十倍。`,
    pitfalls: ['并行环境越多不代表越好：PPO 在超大规模下会性能饱和（SAPG 等工作研究了这一问题）。'],
    robot: R`当前主流平台：Isaac Lab（基于 Isaac Sim）、MuJoCo Playground（基于 MJX/JAX）、Genesis、ManiSkill3。入门推荐从 legged_gym 或 Isaac Lab 的示例开始。`,
    read: ['LEGGEDGYM', 'ISAACLAB', 'RSLRL'],
  },
  curriculum: {
    level: '入门', mins: 6,
    one: '课程学习：先学简单的再学难的——地形由平到陡、速度由慢到快，自动根据表现调整难度。',
    intuit: R`没人一开始就学跑酷。机器人也一样：一上来就放到陡峭楼梯上，它只会不停摔倒，什么都学不到。**课程学习**让难度随能力增长：

- **地形课程**（legged_gym）：每个机器人被分配到某个难度的地形上，走得远就升级，走不远就降级
- **指令课程**：速度指令范围逐渐扩大
- **动作课程**：运动跟踪中先学简单动作，或逐渐收紧跟踪容差`,
    read: ['LEGGEDGYM'],
  },
  dr: {
    level: '进阶', mins: 10,
    one: '域随机化：在仿真中随机改变摩擦、质量、延迟等参数，让策略学会"适应一切"，真实世界只是又一种情况。',
    intuit: R`仿真永远不可能和真实世界完全一样。与其费力让仿真更精确，不如反过来：**让策略见识足够多样的仿真世界**。

每个训练回合随机设置：地面摩擦 0.2~1.5、机身质量 ±20%、电机强度 ±10%、控制延迟 0~20ms、随机推一把……策略必须在所有这些情况下都能工作，于是学会了鲁棒的行为。真实世界只是这个分布中的"又一个样本"。`,
    formal: R`$$\max_\pi\ \mathbb{E}_{\xi\sim p(\xi)}\Big[\mathbb{E}_{\tau\sim\pi,\ \mathcal{M}_\xi}\Big[\sum_t\gamma^tr_t\Big]\Big]$$

$\xi$ 是随机化的物理参数，$\mathcal{M}_\xi$ 是对应的仿真环境。`,
    pitfalls: ['随机化范围太宽：策略过于保守（步子小、动作僵硬）；太窄：无法覆盖真实情况。', '随机化不能弥补系统性的建模错误（如完全没建模的电机延迟），这时需要系统辨识或 ASAP 这类真实数据对齐。'],
    robot: R`几乎所有 sim-to-real 工作的标配。常见随机化项：摩擦、恢复系数、负载质量、质心偏移、电机强度、Kp/Kd、观测噪声、控制延迟、外力推扰。`,
    read: ['LW_DR', 'LEGGEDGYM'],
  },
  asym: {
    level: '进阶', mins: 6,
    one: '非对称 Actor-Critic：训练时 Critic 看"全部真相"，Actor 只看真机上能得到的观测——几乎免费的提升。',
    intuit: R`Critic 只在训练时用来计算优势，部署时直接丢掉。所以给它更多信息没有任何代价：真实线速度、地面摩擦、地形高度图、接触力……Critic 估计得越准，Actor 得到的学习信号就越好。

Actor 则必须只用真机传感器能得到的观测，否则无法部署。`,
    robot: R`人形/四足训练中几乎都在使用：critic 的观测（privileged obs）维度常常是 actor 的 2~3 倍。`,
    read: ['ISAACLAB', 'RSLRL'],
  },
  privileged: {
    level: '进阶', mins: 12,
    one: '师生蒸馏：先训练一个"开天眼"的教师策略，再让只用传感器历史的学生模仿它。',
    intuit: R`直接用部分观测训练 RL 很难：策略既要学会走，又要学会从历史推断地形。**拆成两步**就容易多了：

1. **教师阶段**：给策略所有特权信息（地形、摩擦、真实速度），用 RL 训练。因为信息完整，这是一个简单的 MDP，教师学得又快又好。
2. **学生阶段**：学生只能看到传感器历史。让学生在仿真中行动，同时"请教"教师在每个状态该做什么，用监督学习模仿（这就是 DAgger）。

学生学会了从历史中隐式推断教师"看到"的信息。ETH 2020 年用这个方法让 ANYmal 盲走穿越泥地、雪地、溪流，发表于 Science Robotics，从此成为标准范式。`,
    algo: R`# 阶段 1：教师
用 PPO 训练 π_teacher(a | o_t, privileged_t)
# 阶段 2：学生（DAgger 式蒸馏）
循环:
  用学生 π_student(a | o_{t-H:t}) 在仿真中执行（访问学生自己会到达的状态）
  在每个状态记录教师动作 a* = π_teacher(o_t, privileged_t)
  最小化 ‖π_student(o_{t-H:t}) − a*‖²`,
    pitfalls: ['让学生在**自己**产生的状态分布上学习（DAgger），而不是只在教师的轨迹上学（纯 BC），否则学生一出错就进入陌生状态。', '如果特权信息无法从历史中推断（比如远处的障碍），学生不可能学会——需要加视觉等传感器。'],
    robot: R`OmniH2O、HumanPlus、Extreme Parkour、GMT、TWIST 等大量工作都使用教师-学生两阶段训练。`,
    quiz: [['为什么学生训练时要用学生自己的策略去采样状态？', '这就是 DAgger 的思想：学生会犯教师不会犯的错，从而到达教师轨迹中没有的状态；只有在这些状态上也得到教师的标注，学生才能学会纠正错误。']],
    read: ['CS285', 'LEGGEDGYM'],
  },
  rma: {
    level: '进阶', mins: 8,
    one: 'RMA：训练时把环境参数编码成隐向量，部署时用一个模块从最近的历史中实时估计它，实现毫秒级自适应。',
    intuit: R`RMA 可以看作师生蒸馏的变体，但蒸馏的不是动作，而是**环境的"潜在描述"**：

- 训练阶段：环境编码器把摩擦、质量、地形等参数压缩成低维向量 z，策略以 z 为输入
- 部署阶段：没有这些参数了，用一个"自适应模块"从过去 50 步的状态-动作历史估计 $\hat z$

就像人走上冰面，几步之内就"感觉"到滑，自动调整步态。`,
    formal: R`训练：$z_t=\mu(e_t)$，$a_t=\pi(x_t,a_{t-1},z_t)$；部署：$\hat z_t=\phi(x_{t-k:t},a_{t-k-1:t-1})$，用 $\min\|\hat z_t-z_t\|^2$ 训练 $\phi$。`,
    read: ['CS285'],
  },

  // ═════════ 第 8 章 ═════════
  bc: {
    level: '入门', mins: 8,
    one: '行为克隆：把模仿当作监督学习，直接学"专家在这个状态下做了什么"。',
    intuit: R`如果有专家示范（人类遥操作录下的数据），最简单的方法是：把（状态, 动作）当作（输入, 标签），训练一个神经网络去拟合。这就是**行为克隆 (BC)**。

它的问题是**复合误差**：策略总会有小误差，一出错就进入专家从未到过的状态，在那里策略不知道该怎么办，于是错得更多，越偏越远。

现代方法（ACT 的动作分块、Diffusion Policy、VLA）都是在 BC 的框架下，用更强的模型和技巧缓解这个问题。`,
    formal: R`$$\min_\theta\ \mathbb{E}_{(s,a)\sim\mathcal{D}_{\text{expert}}}\big[-\log\pi_\theta(a\mid s)\big]$$`,
    pitfalls: ['专家数据通常是多模态的（绕障碍可以左绕也可以右绕），用均方误差回归会学成"往中间撞"——扩散模型等生成模型能解决这个问题。'],
    read: ['CS285', 'LW_DIFF'],
  },
  dagger: {
    level: '进阶', mins: 7,
    one: 'DAgger：让学习者自己执行，再请专家在它到达的状态上标注正确动作，反复聚合数据，消除分布偏移。',
    intuit: R`BC 的问题是"只在专家走过的路上学过"。DAgger 的办法很直接：**让学生自己走，走到哪里就请专家标注到哪里**。把这些新数据加入训练集，重新训练，再让学生走……几轮下来，学生在自己可能到达的所有状态上都学过了。

在机器人中，"专家"通常是一个拥有特权信息的教师策略，可以在仿真中无限次地免费标注——这让 DAgger 变得非常实用。`,
    algo: R`D ← 专家示范数据
循环:
  在 D 上训练 π
  用 π 执行，收集访问到的状态 {s}
  请专家为每个 s 标注 a* = π_expert(s)
  D ← D ∪ {(s, a*)}`,
    read: ['CS285'],
  },
  gail: {
    level: '进阶', mins: 8,
    one: 'GAIL：用一个判别器分辨"专家行为"和"策略行为"，策略的目标是骗过判别器——对抗式模仿学习。',
    intuit: R`和 GAN 生成逼真图片一样：判别器学习区分"这是专家的动作还是学生的动作"，学生（策略）用 RL 最大化"判别器认为我是专家"的概率。当判别器无法区分时，学生就学会了专家的行为。

与 BC 不同，GAIL 通过 RL 与环境交互，因此没有复合误差问题；代价是需要大量环境交互，且对抗训练不太稳定。AMP 就是把 GAIL 用到运动风格上。`,
    formal: R`$$\min_\pi\max_D\ \mathbb{E}_{\pi_E}\big[\log D(s,a)\big]+\mathbb{E}_{\pi}\big[\log(1-D(s,a))\big]$$

策略的奖励：$r(s,a)=-\log\big(1-D(s,a)\big)$`,
    read: ['CS285'],
  },
  deepmimic: {
    level: '进阶', mins: 12,
    one: 'DeepMimic：奖励 = "和参考动作有多像"，让物理仿真角色学会后空翻；今天人形运动跟踪的鼻祖。',
    intuit: R`怎样让机器人做出后空翻、侧手翻这种高难度动作？手工设计奖励几乎不可能。DeepMimic 的思路：**直接给一段人类动作捕捉数据，奖励"每一帧的姿态和参考有多接近"**。

两个关键技巧让它真正可行：
- **参考状态初始化 (RSI)**：每个回合从参考动作的随机时刻开始，而不是总从头开始。这样后空翻的"落地"阶段也能被反复练习。
- **提前终止 (ET)**：一旦摔倒（头触地）就结束回合，避免在无意义的状态上浪费样本。

2024 年起，人形机器人的"全身运动跟踪"（H2O、ExBody、ASAP、GMT、BeyondMimic、SONIC）都是这个范式的延续：动捕数据 → 重定向到机器人 → RL 跟踪 → sim-to-real。`,
    formal: R`$$r_t=w^pr^p_t+w^vr^v_t+w^er^e_t+w^cr^c_t,\qquad r^p_t=\exp\Big(-2\sum_j\|\hat q^j_t\ominus q^j_t\|^2\Big)$$`,
    terms: [['r^p', '关节旋转跟踪'], ['r^v', '关节角速度跟踪'], ['r^e', '末端（手脚）位置跟踪'], ['r^c', '质心位置跟踪'], ['\\exp(-k\\|\\cdot\\|^2)', '误差越小奖励越接近 1，平滑且有界']],
    robot: R`理解了 DeepMimic，就能读懂近两年大部分人形全身控制论文——它们的区别主要在：数据如何处理（过滤、重定向）、如何泛化到大量动作（MoE、自适应采样）、如何缩小 sim-to-real 差距（ASAP 的 delta 动作模型）。`,
    quiz: [['为什么参考状态初始化 (RSI) 对学习后空翻很重要？', '如果总从头开始，策略在学会起跳前很难到达空中和落地阶段，这些阶段几乎得不到练习；RSI 让每个阶段都能被采样到。']],
    read: ['DEEPMIMIC', 'CS285'],
  },
  amp: {
    level: '进阶', mins: 10,
    one: 'AMP：用对抗判别器从动作数据中学"风格奖励"，不需要逐帧对齐，也能动得自然。',
    intuit: R`DeepMimic 需要逐帧跟踪一段固定的参考动作，不够灵活：你想让机器人按指令走向任意方向，但数据只是一些走路片段。

AMP 的做法：训练一个判别器，判断"这个状态转移 (s, s') 像不像动作数据集里的"。判别器的输出作为**风格奖励**，和任务奖励（如速度跟踪）相加。机器人在完成任务的同时，动作风格会自然地向数据集靠拢，而不必精确复现某一段。`,
    formal: R`$$r_t=w^Gr^G(s_t,a_t,g)+w^S\max\Big[0,\ 1-0.25\big(D(s_t,s_{t+1})-1\big)^2\Big]$$`,
    terms: [['r^G', '任务奖励，例如跟随速度指令'], ['D(s,s\')', '判别器：最小二乘 GAN，数据集样本目标为 1，策略样本目标为 −1']],
    robot: R`AMP 被广泛用于四足/人形 locomotion，用来替代大量手工的"让步态更自然"的奖励项。`,
    read: ['AMP'],
  },
  diffpolicy: {
    level: '进阶', mins: 10,
    one: 'Diffusion Policy：用扩散模型"一步步去噪"生成动作序列，完美处理多模态示范。',
    intuit: R`示范数据常常有多种合理做法：绕过杯子可以从左也可以从右。传统 BC 用均方误差回归，会学成左右的平均——直接撞上去。

**扩散模型**（AI 绘画背后的技术）能学习完整的分布：从纯噪声开始，一步步去噪，最终生成一个"合理"的动作序列，自然地选择左或右之一。Diffusion Policy 还一次预测一段未来动作（动作块），让动作更连贯。

π0 等 VLA 模型使用的 flow matching 与之思想相近。`,
    formal: R`$$a^{k-1}=\alpha\Big(a^k-\gamma\,\epsilon_\theta(o,a^k,k)\Big)+\sigma\,\mathcal{N}(0,I)$$

训练目标：$\mathcal{L}=\mathbb{E}\big[\|\epsilon-\epsilon_\theta(o,\ a^0+\epsilon_k,\ k)\|^2\big]$，即预测加入的噪声。`,
    read: ['LW_DIFF'],
  },

  // ═════════ 第 9 章 ═════════
  dreamer: {
    level: '高级', mins: 8,
    one: 'Dreamer：学习一个世界模型，然后在"想象"中训练策略，极大减少真实交互。',
    intuit: R`如果能学会"环境会怎样变化"，就可以在脑海中模拟，而不必每次都真的去试。**Dreamer** 学习一个潜空间世界模型（RSSM），然后完全在想象出的轨迹上训练 actor-critic。

DayDreamer（2022）把它用在真实四足机器人上：不用仿真，1 小时就从零学会翻身和行走。`,
    read: ['CS285', 'LW_RL'],
  },
  offline: {
    level: '高级', mins: 8,
    one: '离线 RL：只用一个固定的数据集学习，不与环境交互；难点在于不要相信数据之外动作的 Q 值。',
    intuit: R`有时与环境交互很昂贵或危险（医疗、自动驾驶、真机），但我们有大量历史数据。离线 RL 想从中学出比数据本身更好的策略。

核心难题：Q 网络对数据中**没出现过的动作**的估计可能完全错误（且往往高估），策略又会主动去选这些被高估的动作，而离线设置下无法通过实际尝试来纠正。解决思路分两类：约束策略别离数据太远（BCQ、IQL），或者对未见动作的 Q 值保守估计（CQL）。`,
    read: ['CS285'],
  },
  rlhf: {
    level: '高级', mins: 8,
    one: 'RLHF：先从人类偏好学一个奖励模型，再用 PPO 微调大模型——RL 进入大语言模型的核心位置。',
    intuit: R`怎么定义"一个好回答"的奖励？很难写成公式，但人类很容易比较两个回答哪个更好。RLHF：

1. 收集人类对回答对的偏好
2. 训练奖励模型预测人类偏好
3. 用 PPO 优化语言模型，同时用 KL 惩罚防止偏离原模型太远

后续的 DPO、GRPO 进一步简化了这个流程。同样的"预训练 + RL 后训练"思路正在进入机器人 VLA 模型。`,
    read: ['LW_PG', 'CS285'],
  },
};
})();
