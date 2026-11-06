// 深入讲解（第 4～8 章）
(() => {
const R = String.raw;
window.DEEP = window.DEEP || {};
Object.assign(window.DEEP, {

// ═════════ 第 4 章 ═════════
qlearning: [
  { t: '一次 Q 更新的完整数值', k: 'case', at: 'formal', mins: 3, body: R`当前 $Q(s,\text{上})=0.5$。执行"上"之后得到奖励 $r=-0.04$，到达 $s'$；$s'$ 中四个动作的 Q 值为 $[0.8,\ 0.3,\ 0.1,\ 0.6]$。取 $\gamma=0.9$，$\alpha=0.1$：

1. 下一状态的最优价值：$\max_{a'}Q(s',a')=0.8$
2. TD 目标：$-0.04+0.9\times0.8=0.68$
3. TD 误差：$0.68-0.5=0.18$
4. 更新：$Q(s,\text{上})\leftarrow0.5+0.1\times0.18=0.518$

注意第 1 步用的是 **max**，而不是智能体在 $s'$ 实际会选的动作——哪怕它下一步因为 ε-greedy 随机选了 0.1 的那个动作，这次更新也假设"之后会选最好的"。这就是 off-policy 的含义。` },
  { t: 'Q-learning 与 SARSA：悬崖边的两种性格', k: 'compare', at: 'formal', mins: 3, body: R`经典的"悬崖行走"任务：一条最短路线紧贴悬崖，掉下去 −100。两种算法都使用 ε=0.1 的探索：

| | Q-learning | SARSA |
|---|---|---|
| 更新目标 | $r+\gamma\max_{a'}Q(s',a')$ | $r+\gamma Q(s',a')$，$a'$ 是实际选的 |
| 学到的是 | 最优策略的价值（假设之后不犯错） | 带探索的当前策略的价值 |
| 学到的路线 | 紧贴悬崖的最短路 | 离悬崖远一点的安全路 |
| 训练中的表现 | 探索时偶尔掉下去，平均回报较低 | 平均回报较高 |

如果部署时会关掉探索，Q-learning 的路线更好；如果执行时本身就带噪声（比如真实机器人的执行误差），SARSA 的"保守"反而更实用。` },
  { t: '在 FrozenLake 上跑表格 Q-learning', k: 'code', at: 'algo', mins: 3, body: '注意第 11 行：只有真正终止（掉进冰洞或到达目标）时未来价值才为 0；被时间截断时仍然要自举。', code: R`import gymnasium as gym, numpy as np

env = gym.make("FrozenLake-v1", is_slippery=True)   # 4x4 冰面，会打滑
Q = np.zeros((env.observation_space.n, env.action_space.n))
alpha, gamma, eps = 0.1, 0.99, 0.1

for ep in range(20000):
    s, _ = env.reset()
    done = False
    while not done:
        a = env.action_space.sample() if np.random.rand() < eps else int(np.argmax(Q[s]))
        s2, r, terminated, truncated, _ = env.step(a)
        target = r + (0.0 if terminated else gamma * np.max(Q[s2]))
        Q[s, a] += alpha * (target - Q[s, a])
        s, done = s2, terminated or truncated

print(np.argmax(Q, axis=1).reshape(4, 4))   # 学到的策略：0左 1下 2右 3上` },
],

dqn: [
  { t: '为什么需要经验回放和目标网络', k: 'derive', at: 'intuit', mins: 4, body: R`把 Q 表换成神经网络后，会遇到两个在表格情况下不存在的问题：

**问题 1：样本高度相关。** 游戏里连续几帧几乎一样。如果按顺序训练，网络会在"最近几秒的画面"上过拟合，忘掉之前学到的东西。
→ **经验回放**：把最近约 100 万条转移存起来，每次随机抽一个 mini-batch。样本之间近似独立，而且每条数据能被反复使用。

**问题 2：目标在移动。** TD 目标 $r+\gamma\max Q_\theta(s',a')$ 里也有 $\theta$。每次更新 $\theta$，目标也跟着变——像追自己的影子，容易振荡甚至发散。
→ **目标网络**：复制一份参数 $\bar\theta$ 专门用来算目标，每隔几千步才同步一次。在两次同步之间，问题就变成了一个"目标固定"的监督回归。

这两个技巧被后来几乎所有 off-policy 算法继承（DDPG、TD3、SAC 用的是软更新 $\bar\theta\leftarrow\tau\theta+(1-\tau)\bar\theta$）。` },
  { t: 'DQN 损失函数的核心代码', k: 'code', at: 'algo', mins: 2, body: '', code: R`import torch, torch.nn.functional as F

def dqn_loss(q_net, target_net, batch, gamma=0.99):
    s, a, r, s2, done = batch                        # 从回放缓冲区随机采样
    q = q_net(s).gather(1, a.unsqueeze(1)).squeeze(1)  # Q(s, a)
    with torch.no_grad():                            # 目标不参与求导
        target = r + gamma * (1 - done) * target_net(s2).max(1).values
    return F.smooth_l1_loss(q, target)               # Huber 损失，对异常值更稳

# Double DQN 只改一行：用在线网络选动作，目标网络评估
# a2 = q_net(s2).argmax(1, keepdim=True)
# target = r + gamma * (1 - done) * target_net(s2).gather(1, a2).squeeze(1)` },
  { t: '常见疑问', k: 'faq', at: 'end', mins: 2, body: R`**Q：DQN 为什么不能直接控制机器人？**
DQN 要对每个动作输出一个 Q 值再取 max。机器人有 12～30 个连续关节，就算每个关节只离散成 10 档，组合也有 $10^{12}$ 个以上，无法枚举。所以连续控制需要 DDPG/TD3/SAC 这类"用 actor 网络近似 argmax"的方法，或者直接用策略梯度。

**Q：为什么 DQN 的 Q 值会高估？**
目标中的 max 会偏向估计噪声为正的动作。Double DQN 用在线网络选动作、目标网络评估，把"选"和"评"拆开，有效减小了这个偏差。` },
],

// ═════════ 第 5 章 ═════════
pgt: [
  { t: '策略梯度定理的完整推导', k: 'derive', at: 'formal', mins: 7, body: R`**目标**：最大化期望回报 $J(\theta)=\mathbb{E}_{\tau\sim\pi_\theta}[R(\tau)]=\sum_\tau P(\tau;\theta)\,R(\tau)$

**第 1 步：对数导数技巧。** 因为 $\nabla P=P\,\nabla\log P$：

$$\nabla_\theta J=\sum_\tau\nabla_\theta P(\tau;\theta)\,R(\tau)=\sum_\tau P(\tau;\theta)\,\nabla_\theta\log P(\tau;\theta)\,R(\tau)=\mathbb{E}_\tau\big[\nabla_\theta\log P(\tau;\theta)\,R(\tau)\big]$$

梯度变成了一个**期望**，可以用采样来估计。

**第 2 步：展开轨迹概率。**

$$P(\tau;\theta)=p(s_0)\prod_{t}\pi_\theta(a_t\mid s_t)\,P(s_{t+1}\mid s_t,a_t)$$

$$\log P(\tau;\theta)=\log p(s_0)+\sum_t\Big[\log\pi_\theta(a_t\mid s_t)+\log P(s_{t+1}\mid s_t,a_t)\Big]$$

**第 3 步：环境项消失。** 初始分布和转移概率都与 $\theta$ 无关，求导为零：

$$\nabla_\theta\log P(\tau;\theta)=\sum_t\nabla_\theta\log\pi_\theta(a_t\mid s_t)$$

**第 4 步：得到结果。**

$$\nabla_\theta J=\mathbb{E}_\tau\Big[\sum_t\nabla_\theta\log\pi_\theta(a_t\mid s_t)\;R(\tau)\Big]$$

**第 5 步：利用因果性降低方差。** $t$ 时刻的动作不可能影响 $t$ 之前的奖励，可以把 $R(\tau)$ 换成"从 $t$ 开始的回报" $\hat G_t$（reward-to-go），期望不变而方差更小：

$$\nabla_\theta J=\mathbb{E}_\tau\Big[\sum_t\nabla_\theta\log\pi_\theta(a_t\mid s_t)\;\hat G_t\Big]$$

再把 $\hat G_t$ 换成 $\hat G_t-b(s_t)$ 或优势 $\hat A_t$，就得到了后面所有方法的形式。` },
  { t: '用两个动作的例子手算梯度', k: 'case', at: 'example', mins: 4, body: R`只有一个状态、两个动作：$a_1$ 奖励 1，$a_2$ 奖励 0。策略 $\pi(a_1)=\sigma(\theta)$（sigmoid），初始 $\theta=0$，即 50%/50%。

先求两个对数概率的导数：

$$\nabla_\theta\log\pi(a_1)=1-\sigma(\theta)=0.5,\qquad\nabla_\theta\log\pi(a_2)=-\sigma(\theta)=-0.5$$

按策略梯度公式求期望：

$$\nabla J=\pi(a_1)\cdot0.5\cdot1+\pi(a_2)\cdot(-0.5)\cdot0=0.25$$

**验证**：直接写 $J(\theta)=\sigma(\theta)$，导数 $\sigma(1-\sigma)=0.25$，完全一致。梯度为正，$\theta$ 增大，$a_1$ 的概率上升——策略学会了选奖励高的动作。

关键在于：第二种算法**不需要**知道 $J(\theta)$ 的解析式，只需要能采样动作并观察奖励。` },
  { t: '常见疑问', k: 'faq', at: 'end', mins: 2, body: R`**Q：代码里为什么损失写成 `+'`-(logp * adv).mean()`'+R`？**
深度学习框架只会做梯度**下降**，而我们要最大化 $J$，所以在前面加负号。这个"损失"的数值本身没有意义（它不是真实回报），只有它的梯度有意义。

**Q：为什么策略梯度是 on-policy 的？**
因为期望 $\mathbb{E}_{\tau\sim\pi_\theta}$ 要求轨迹来自**当前**策略。策略一更新，旧数据就来自另一个分布了。PPO 用重要性采样做了有限的复用。` },
],

reinforce: [
  { t: '完整的 REINFORCE 代码（CartPole）', k: 'code', at: 'algo', mins: 4, body: '大约 300 次迭代后能稳定达到 500 分（满分）。其中"回报标准化"相当于减去一个常数基线，能显著降低方差。', code: R`import gymnasium as gym, torch, torch.nn as nn

env = gym.make("CartPole-v1")
pi = nn.Sequential(nn.Linear(4, 64), nn.Tanh(), nn.Linear(64, 2))
opt = torch.optim.Adam(pi.parameters(), lr=1e-2)

for it in range(300):
    obs, _ = env.reset()
    logps, rews, done = [], [], False
    while not done:                                   # 1. 采样一整个回合
        logits = pi(torch.as_tensor(obs, dtype=torch.float32))
        dist = torch.distributions.Categorical(logits=logits)
        a = dist.sample()
        logps.append(dist.log_prob(a))
        obs, r, term, trunc, _ = env.step(a.item())
        rews.append(r); done = term or trunc
    G, rets = 0.0, []
    for r in reversed(rews):                          # 2. reward-to-go
        G = r + 0.99 * G; rets.insert(0, G)
    rets = torch.tensor(rets)
    rets = (rets - rets.mean()) / (rets.std() + 1e-8) # 3. 标准化 ≈ 减基线
    loss = -(torch.stack(logps) * rets).sum()         # 4. 策略梯度
    opt.zero_grad(); loss.backward(); opt.step()` },
],

adv: [
  { t: '为什么减去基线能降低方差：一个极端例子', k: 'case', at: 'formal', mins: 4, body: R`沿用上一节两个动作的例子（$a_1$ 奖励 1，$a_2$ 奖励 0，当前各 50%）。看**单个样本**给出的梯度估计：

**不减基线**（权重 = 奖励）：

| 采到 | $\nabla\log\pi$ | 权重 | 梯度估计 |
|---|---|---|---|
| $a_1$ | 0.5 | 1 | 0.5 |
| $a_2$ | −0.5 | 0 | 0 |

平均 0.25，但单个样本要么 0.5 要么 0，方差 0.0625。

**减去基线 $b=V=0.5$**（权重 = 优势 $A=R-V$）：

| 采到 | $\nabla\log\pi$ | 优势 | 梯度估计 |
|---|---|---|---|
| $a_1$ | 0.5 | +0.5 | 0.25 |
| $a_2$ | −0.5 | −0.5 | 0.25 |

平均仍是 0.25，但**每个样本都是 0.25，方差为 0**！

直观理解：不减基线时，采到 $a_2$ 什么也学不到；减去基线后，采到 $a_2$ 也能学到"$a_2$ 比平均差，应该减少它"。每个样本都提供了有用的信号。` },
  { t: '优势、TD 误差、回报的关系', k: 'compare', at: 'end', mins: 2, body: R`| 权重 $\Psi_t$ | 偏差 | 方差 | 用在 |
|---|---|---|---|
| 整条轨迹回报 $R(\tau)$ | 无 | 极高 | 最原始的形式 |
| reward-to-go $\hat G_t$ | 无 | 高 | REINFORCE |
| $\hat G_t-V(s_t)$ | 无 | 中 | REINFORCE + 基线 |
| TD 误差 $\delta_t$ | 有（V 不准时） | 低 | A2C、一步 Actor-Critic |
| GAE $\hat A_t^{(\lambda)}$ | 可调 | 可调 | PPO 的默认选择 |` },
],

actorcritic: [
  { t: '一步 Actor-Critic 更新的数值', k: 'case', at: 'formal', mins: 3, body: R`机器人在状态 $s$ 下执行动作 $a$，得到 $r=0.5$，到达 $s'$。Critic 估计 $V(s)=10.0$，$V(s')=10.2$，$\gamma=0.99$：

1. TD 误差：$\delta=0.5+0.99\times10.2-10.0=0.598$
2. **Critic**：$V(s)$ 的目标是 $10.598$，用均方误差把 10.0 往上拉；
3. **Actor**：$\delta>0$，说明这个动作"比 critic 预期的好"，沿 $\delta\cdot\nabla\log\pi(a\mid s)$ 方向更新，增大它的概率。

如果 $r=-2$（比如脚打滑了），$\delta=-1.902<0$，同一个动作的概率就会被降低。` },
  { t: 'A2C 的损失函数', k: 'code', at: 'robot', mins: 2, body: '', code: R`def a2c_loss(dist, value, action, ret, entropy_coef=0.01, value_coef=0.5):
    adv = (ret - value).detach()                     # 优势：不让 actor 的梯度流进 critic
    loss_pi = -(dist.log_prob(action).sum(-1) * adv).mean()
    loss_v = (ret - value).pow(2).mean()             # critic 回归回报
    entropy = dist.entropy().sum(-1).mean()          # 熵奖励，防止过早变成确定性
    return loss_pi + value_coef * loss_v - entropy_coef * entropy` },
  { t: '常见疑问', k: 'faq', at: 'end', mins: 2, body: R`**Q：Actor 和 Critic 要不要共享网络？**
游戏（图像输入）中常共享卷积层以节省计算；机器人运控中通常**分开**，因为 critic 要用特权观测（非对称 AC），而且分开训练更稳定。

**Q：为什么计算优势时要 detach？**
优势只是 actor 更新的"权重"，不应该通过它去改变 critic。不 detach 的话，actor 的损失会反向影响 critic 的参数，导致价值估计被扭曲。` },
],

gae: [
  { t: 'GAE 是怎么推导出来的', k: 'derive', at: 'formal', mins: 5, body: R`从"看 k 步"的优势估计开始（$\delta_t=r_t+\gamma V(s_{t+1})-V(s_t)$）：

$$\hat A_t^{(1)}=\delta_t=-V(s_t)+r_t+\gamma V(s_{t+1})$$

$$\hat A_t^{(2)}=\delta_t+\gamma\delta_{t+1}=-V(s_t)+r_t+\gamma r_{t+1}+\gamma^2V(s_{t+2})$$

$$\hat A_t^{(k)}=\sum_{l=0}^{k-1}\gamma^l\delta_{t+l}=-V(s_t)+r_t+\dots+\gamma^{k-1}r_{t+k-1}+\gamma^kV(s_{t+k})$$

中间的 $V$ 项两两抵消了（这叫"望远镜求和"）。k 越大，真实奖励越多、对 V 的依赖越少：偏差小但方差大。

GAE 对所有 k 做指数加权平均（和 TD(λ) 完全相同的思路）：

$$\hat A_t^{\text{GAE}}=(1-\lambda)\big(\hat A_t^{(1)}+\lambda\hat A_t^{(2)}+\lambda^2\hat A_t^{(3)}+\dots\big)=\sum_{l=0}^{\infty}(\gamma\lambda)^l\delta_{t+l}$$

最后一步是把每个 $\delta_{t+l}$ 前的系数合并：它出现在 $\hat A^{(l+1)},\hat A^{(l+2)},\dots$ 中，系数之和为 $(1-\lambda)\gamma^l(\lambda^l+\lambda^{l+1}+\dots)=(\gamma\lambda)^l$。` },
  { t: '手算一个三步轨迹的 GAE', k: 'case', at: 'example', mins: 4, body: R`奖励 $r=[1,\ 0,\ 2]$，critic 估计 $V(s_0..s_2)=[0.5,\ 1.0,\ 0.8]$，第 3 步后回合**真正终止**（$V(s_3)=0$），$\gamma=0.9$，$\lambda=0.9$（$\gamma\lambda=0.81$）。

**第 1 步：算每步的 TD 误差**

- $\delta_0=1+0.9\times1.0-0.5=1.4$
- $\delta_1=0+0.9\times0.8-1.0=-0.28$
- $\delta_2=2+0.9\times0-0.8=1.2$

**第 2 步：从后往前递推** $\hat A_t=\delta_t+\gamma\lambda\hat A_{t+1}$

- $\hat A_2=1.2$
- $\hat A_1=-0.28+0.81\times1.2=0.692$
- $\hat A_0=1.4+0.81\times0.692=1.961$

**对比不同 λ：**

| | $\hat A_0$ | $\hat A_1$ | $\hat A_2$ |
|---|---|---|---|
| λ = 0（一步 TD） | 1.4 | −0.28 | 1.2 |
| λ = 0.9 | 1.961 | 0.692 | 1.2 |
| λ = 1（MC） | 2.12 | 0.8 | 1.2 |

验证 λ=1：$G_0=1+0.9\times0+0.81\times2=2.62$，$2.62-0.5=2.12$ ✓。

注意 $t=1$：一步 TD 认为这一步"不好"（−0.28，因为当下没拿到奖励），但看得更远就会发现它通往了 +2 的奖励，其实是好的。λ 越大越能看到这一点。` },
  { t: 'GAE 代码（区分终止与截断）', k: 'code', at: 'algo', mins: 3, body: '机器人训练中，回合常因"到达最大时长"被截断。截断不是失败，未来价值不为 0。常见做法是在截断时把 $\\gamma V(s_{T})$ 加到最后一步奖励里（rsl_rl 的做法），下面的代码用 `dones` 只标记真正的终止。', code: R`import numpy as np

def compute_gae(rewards, values, dones, last_value, gamma=0.99, lam=0.95):
    """dones[t]=1 表示 t 步后真正终止；last_value 是 rollout 末尾状态的 V"""
    T = len(rewards)
    adv = np.zeros(T)
    a = 0.0
    for t in reversed(range(T)):
        next_v = last_value if t == T - 1 else values[t + 1]
        nonterminal = 1.0 - dones[t]
        delta = rewards[t] + gamma * next_v * nonterminal - values[t]
        a = delta + gamma * lam * nonterminal * a
        adv[t] = a
    returns = adv + values            # critic 的回归目标
    return adv, returns

adv, ret = compute_gae(np.array([1, 0, 2.]), np.array([.5, 1., .8]), np.array([0, 0, 1.]), 0., gamma=.9, lam=.9)
print(adv.round(3))   # [1.961 0.692 1.2  ]` },
],

ppo: [
  { t: '从策略梯度到 PPO 的替代目标', k: 'derive', at: 'formal', mins: 5, body: R`**出发点**：我们想用旧策略 $\pi_{\text{old}}$ 采的数据，来优化新策略 $\pi_\theta$。用重要性采样把期望换到旧策略下：

$$L(\theta)=\mathbb{E}_{s,a\sim\pi_{\text{old}}}\Big[\frac{\pi_\theta(a\mid s)}{\pi_{\text{old}}(a\mid s)}\hat A(s,a)\Big]=\mathbb{E}\big[\rho_t\hat A_t\big]$$

**这个替代目标为什么合理？** 在 $\theta=\theta_{\text{old}}$ 处求导：

$$\nabla_\theta\rho_t\big|_{\theta_{\text{old}}}=\frac{\nabla_\theta\pi_\theta(a\mid s)}{\pi_{\text{old}}(a\mid s)}\Big|_{\theta_{\text{old}}}=\nabla_\theta\log\pi_\theta(a\mid s)\big|_{\theta_{\text{old}}}$$

所以 $\nabla L=\mathbb{E}[\nabla\log\pi\cdot\hat A]$，**正好就是策略梯度**。在旧策略附近，替代目标是真实目标的一阶近似。

**问题**：离旧策略越远，近似越差。如果不加限制地最大化 $\rho\hat A$，对于 $\hat A>0$ 的动作，算法会把 $\rho$ 推到无穷大。

**两种解决方案**：
- TRPO：加硬约束 $\mathrm{KL}(\pi_{\text{old}}\|\pi_\theta)\le\delta$，需要二阶优化；
- PPO：直接把 $\rho$ 截断在 $[1-\epsilon,1+\epsilon]$，再与未截断的取 min，一阶优化即可。` },
  { t: '四种情况：什么时候有梯度', k: 'case', at: 'formal', mins: 3, body: R`$\min(\rho\hat A,\ \mathrm{clip}(\rho)\hat A)$ 可以拆成四种情况（$\epsilon=0.2$）：

| | ρ 在 [0.8, 1.2] 内 | ρ > 1.2 | ρ < 0.8 |
|---|---|---|---|
| **Â > 0**（好动作） | 有梯度，增大概率 | **截断，梯度 0**（已经增大够了） | 有梯度，继续增大 |
| **Â < 0**（坏动作） | 有梯度，减小概率 | 有梯度，继续减小 | **截断，梯度 0**（已经减小够了） |

规律：**只截断"朝有利方向走过头"的情况**。如果某次更新反而让好动作的概率下降了（Â>0 且 ρ<0.8），PPO 仍然会把它拉回来。这就是取 min 的意义——它是一个悲观的下界。` },
  { t: '一次 PPO 迭代里的数字（腿足机器人典型配置）', k: 'case', at: 'algo', mins: 3, body: R`以 rsl_rl / legged_gym 的常见设置为例：

| 环节 | 数值 |
|---|---|
| 并行环境数 | 4096 |
| 每个环境采样步数 | 24（约 0.5 秒） |
| 一批数据量 | 4096 × 24 = **98,304** 条转移 |
| mini-batch 数 | 4（每个 24,576 条） |
| 每批数据训练轮数 | 5 epoch |
| 每次迭代的梯度更新次数 | 5 × 4 = **20** 次 |
| γ / λ / ε | 0.99 / 0.95 / 0.2 |
| 学习率 | 1e-3，按 KL 自适应（目标 KL ≈ 0.01） |
| 典型迭代次数 | 1,500～5,000 次 |

总交互量约 1.5 亿～5 亿步，在一张消费级 GPU 上耗时约 20 分钟到几小时。` },
  { t: 'PPO 损失函数代码', k: 'code', at: 'algo', mins: 3, body: '这是 PPO 的核心，其余部分（采样、GAE、mini-batch 循环）见上面的伪代码。', code: R`import torch

def ppo_loss(dist, value, act, old_logp, adv, ret, clip=0.2, c1=1.0, c2=0.01):
    logp = dist.log_prob(act).sum(-1)              # 新策略下的 log π(a|s)
    ratio = torch.exp(logp - old_logp)             # ρ = π_new / π_old
    adv = (adv - adv.mean()) / (adv.std() + 1e-8)  # 优势标准化
    surr1 = ratio * adv
    surr2 = torch.clamp(ratio, 1 - clip, 1 + clip) * adv
    loss_pi = -torch.min(surr1, surr2).mean()      # 截断目标（取负号做梯度下降）
    loss_v = (value - ret).pow(2).mean()           # critic 损失
    entropy = dist.entropy().sum(-1).mean()
    approx_kl = (old_logp - logp).mean()           # 监控用：新旧策略差多少
    clip_frac = ((ratio - 1).abs() > clip).float().mean()
    return loss_pi + c1 * loss_v - c2 * entropy, approx_kl, clip_frac` },
  { t: '训练时该看哪些曲线', k: 'faq', at: 'robot', mins: 4, body: R`**平均回报 / 回合长度**：最直观的指标。回合长度到上限（如 1000 步）说明机器人不再摔倒。

**各奖励项的分量**：比总回报更有用。比如速度跟踪项不涨、能耗惩罚项很大，说明惩罚权重太重，机器人学会了"不动最安全"。

**approx_kl**：新旧策略的差距。持续大于 0.05 说明更新太猛，应降低学习率；接近 0 说明几乎没在学。

**clip_fraction**：被截断的样本比例。一般在 0.1～0.3；过高同样说明步子太大。

**value_loss**：critic 的误差。突然暴涨常常是奖励尺度变化或出现了异常大的奖励。

**策略标准差 σ / 熵**：应缓慢下降。下降太快说明探索不足、可能陷入局部最优；不降说明策略没有收敛。` },
],

// ═════════ 第 6 章 ═════════
td3: [
  { t: 'DDPG、TD3、SAC 对比', k: 'compare', at: 'intuit', mins: 3, body: R`| | DDPG | TD3 | SAC |
|---|---|---|---|
| 策略 | 确定性 | 确定性 | 随机（高斯 + tanh） |
| Critic 数量 | 1 | 2，取最小 | 2，取最小 |
| 探索 | 外加噪声 | 外加噪声 | 熵奖励（内生） |
| 目标策略平滑 | 无 | 有 | 天然具备（随机策略） |
| Actor 更新频率 | 每步 | 每 2 步 | 每步 |
| 超参敏感度 | 高 | 中 | 低 |` },
],

sac: [
  { t: '重参数化技巧与 tanh 修正', k: 'derive', at: 'formal', mins: 5, body: R`**为什么需要重参数化？** SAC 的策略损失 $\mathbb{E}_{a\sim\pi_\theta}[\alpha\log\pi_\theta(a\mid s)-Q(s,a)]$ 中，采样本身依赖 $\theta$，而"采样"这个操作不可导。

**办法**：把随机性挪到一个与 $\theta$ 无关的噪声上：

$$u=\mu_\theta(s)+\sigma_\theta(s)\odot\xi,\qquad\xi\sim\mathcal{N}(0,I)$$

这样 $u$ 是 $\theta$ 的可导函数，梯度可以从 $Q(s,a)$ 一路传回策略网络。这与策略梯度的"对数导数技巧"是两种不同的梯度估计方法，重参数化的方差通常更低。

**为什么要 tanh？** 机器人动作有上下限。$a=\tanh(u)$ 把动作压到 $(-1,1)$。

**tanh 之后概率密度要修正**（变量替换公式）：

$$\log\pi(a\mid s)=\log\mathcal{N}(u;\mu,\sigma)-\sum_i\log\big(1-\tanh^2(u_i)\big)$$

直观理解：tanh 在两端把一大段 $u$ 压缩到很窄的 $a$ 区间，所以那里的密度会变大，需要减去 $\log$ 导数来修正。` },
  { t: 'SAC 策略与温度更新的代码', k: 'code', at: 'formal', mins: 3, body: '', code: R`import torch
from torch.distributions import Normal

def sac_actor_and_alpha_loss(actor, q1, q2, obs, log_alpha, target_entropy):
    mu, log_std = actor(obs).chunk(2, dim=-1)
    std = log_std.clamp(-5, 2).exp()
    u = mu + std * torch.randn_like(mu)               # 重参数化采样
    a = torch.tanh(u)
    logp = Normal(mu, std).log_prob(u).sum(-1) \
           - torch.log(1 - a.pow(2) + 1e-6).sum(-1)   # tanh 修正
    q = torch.min(q1(obs, a), q2(obs, a))
    alpha = log_alpha.exp().detach()
    actor_loss = (alpha * logp - q).mean()
    alpha_loss = -(log_alpha * (logp + target_entropy).detach()).mean()
    return actor_loss, alpha_loss

# target_entropy 常取 -动作维度，例如 12 个关节时为 -12` },
  { t: '常见疑问', k: 'faq', at: 'end', mins: 2, body: R`**Q：目标熵为什么取 −dim(A)？**
这是一个经验值。熵可以为负（连续分布），−dim(A) 大致对应"每个维度保持一定但不大的随机性"。自动调温度的作用是：熵低于目标时增大 α（更鼓励探索），高于目标时减小 α。

**Q：SAC 为什么在 GPU 大规模并行仿真中用得少？**
SAC 每采一步就要做梯度更新，样本效率高但"墙钟时间"效率不一定高；而数千并行环境产生数据极快，PPO 的简单并行更划算。2025 年后的 FastSAC/FastTD3 通过大 batch、大量并行环境改善了这一点。` },
],

// ═════════ 第 7 章 ═════════
pomdp: [
  { t: '机器人到底看不到什么', k: 'case', at: 'intuit', mins: 3, body: R`| 信息 | 仿真中 | 真机上 | 如何应对 |
|---|---|---|---|
| 关节角度、角速度 | 有 | 有（编码器） | 直接作为观测 |
| 机身角速度、姿态 | 有 | 有（IMU） | 直接作为观测 |
| 机身线速度 | 有 | **没有**（只能估计） | 状态估计器 / 历史推断 |
| 地面摩擦、软硬 | 有 | **没有** | 从历史推断（RMA、师生蒸馏） |
| 前方地形高度 | 有 | 需要相机/激光雷达 | 高度图 + 感知编码 |
| 外力、负载 | 有 | **没有** | 域随机化 + 历史推断 |
| 电机真实特性 | 模型近似 | 有误差 | 执行器网络 / 真实数据对齐 |

表中"没有"的部分，就是 sim-to-real 方法要解决的问题。` },
],

actionspace: [
  { t: 'PD 控制器算一次力矩', k: 'case', at: 'formal', mins: 3, body: R`以 legged_gym 中 Unitree A1 的设置为例：$K_p=20$，$K_d=0.5$，动作缩放 $\sigma_a=0.25$。

某一时刻，膝关节默认角度 $-1.5$ rad，策略输出 $a=0.4$，当前角度 $q=-1.45$ rad，角速度 $\dot q=2$ rad/s：

1. 目标角度：$q^{\text{target}}=-1.5+0.25\times0.4=-1.4$ rad
2. 位置误差：$-1.4-(-1.45)=0.05$ rad
3. 力矩：$\tau=20\times0.05-0.5\times2=1.0-1.0=0$ N·m

此刻角速度项正好抵消了位置项——关节已经在快速靠近目标，PD 控制器自动"刹车"，避免冲过头。策略只需要给出"想去哪"，这种平滑的力矩调节由 PD 控制器负责，这就是为什么输出目标角度比直接输出力矩容易学得多。` },
],

shaping: [
  { t: '一套真实的行走奖励（legged_gym 默认值）', k: 'case', at: 'intuit', mins: 4, body: R`legged_gym 的默认奖励项与权重（每项再乘以控制步长 dt）：

| 奖励项 | 权重 | 作用 |
|---|---|---|
| 线速度跟踪 $\exp(-\|v_{xy}^{cmd}-v_{xy}\|^2/0.25)$ | +1.0 | 主任务：按指令前进/横移 |
| 角速度跟踪 | +0.5 | 主任务：按指令转向 |
| 足端腾空时间 | +1.0 | 鼓励迈出完整的步子 |
| 竖直方向速度 $v_z^2$ | −2.0 | 防止上下颠簸 |
| 横滚/俯仰角速度 | −0.05 | 防止机身摇晃 |
| 动作变化率 $\|a_t-a_{t-1}\|^2$ | −0.01 | 动作平滑，减少抖动 |
| 关节加速度 | −2.5×10⁻⁷ | 减少冲击 |
| 关节力矩 | −1×10⁻⁵ | 节能 |
| 非足部碰撞 | −1.0 | 禁止用膝盖、身体着地 |

你会发现正奖励只有 3 项，其余都是惩罚。调参的典型过程：先只用跟踪项训练出"能动"的策略，再逐项加入惩罚，观察对动作风格的影响。` },
],

dr: [
  { t: '典型的随机化项与范围', k: 'case', at: 'formal', mins: 3, body: R`legged_gym 的默认随机化（前三项），以及很多后续工作中常见的扩展（范围因机器人而异，仅供参考）：

| 随机化项 | 典型范围 | 模拟的真实情况 |
|---|---|---|
| 地面摩擦系数 | 0.5 ～ 1.25 | 不同地面材质 |
| 机身附加质量 | −1 ～ +1 kg | 负载、电池、制造误差 |
| 随机推扰 | 每 15 秒一次，最大 1 m/s | 被人推、碰撞 |
| 电机强度 | ±10%～20% | 电机个体差异、温度 |
| Kp / Kd | ±10%～20% | 控制器参数误差 |
| 控制延迟 | 0～20 ms | 通信与计算延迟 |
| 观测噪声 | 按传感器精度 | 编码器、IMU 噪声 |
| 质心偏移 | 几厘米 | 装配误差 |` },
  { t: '域随机化、系统辨识与真实数据对齐', k: 'compare', at: 'end', mins: 3, body: R`| | 域随机化 | 系统辨识 | 真实数据对齐（如 ASAP） |
|---|---|---|---|
| 思路 | 让策略适应一整个范围 | 先测准真实参数，再仿真 | 用真机数据修正仿真 |
| 需要真机数据？ | 几乎不需要 | 需要（标定实验） | 需要（策略在真机上的轨迹） |
| 优点 | 简单、通用 | 仿真更逼真 | 能修正"建模之外"的误差 |
| 缺点 | 范围大会变保守 | 很多参数难以测量 | 流程复杂 |

实践中三者常常组合使用：先做基本的系统辨识（质量、Kp/Kd），再加域随机化覆盖剩余不确定性，对高动态动作再用真实数据对齐。` },
],

privileged: [
  { t: '教师和学生分别看到什么', k: 'case', at: 'intuit', mins: 3, body: R`以 ETH 2020 年的盲走工作为例（简化）：

| | 教师策略 | 学生策略 |
|---|---|---|
| 本体感知（关节、IMU） | 当前一帧 | **过去约 2 秒的历史**（时间卷积网络编码） |
| 机身线速度 | 真值 | 无 |
| 足端接触状态、接触力 | 真值 | 无 |
| 地面摩擦 | 真值 | 无 |
| 脚周围的地形高度 | 真值 | 无 |
| 外部扰动力 | 真值 | 无 |
| 训练方法 | PPO（强化学习） | 模仿教师动作（监督学习） |
| 能否部署到真机 | 不能 | **能** |

学生学到的，其实是"从历史中推断出教师能直接看到的那些信息"。论文中的分析显示，学生网络的隐层确实编码了地形和接触信息。` },
  { t: '学生蒸馏的代码骨架', k: 'code', at: 'algo', mins: 3, body: '', code: R`import torch

def distill(env, teacher, student, opt, iters=5000):
    for it in range(iters):
        obs_hist, priv = env.get_observations()      # 学生：本体历史；教师：特权信息
        with torch.no_grad():
            a_teacher = teacher(obs_hist[:, -1], priv)   # 教师在"学生到达的状态"上给出标注
        a_student = student(obs_hist)
        loss = (a_student - a_teacher).pow(2).mean()
        opt.zero_grad(); loss.backward(); opt.step()
        env.step(a_student.detach())                 # 关键：用学生的动作推进环境（DAgger）` },
],

// ═════════ 第 8 章 ═════════
bc: [
  { t: '均方误差为什么会"撞上障碍"', k: 'case', at: 'formal', mins: 3, body: R`前方有一根柱子。示范数据中，一半人从左绕（转向角 −1），一半人从右绕（转向角 +1）。

用均方误差训练的网络会输出使误差最小的那个值：

$$\arg\min_a\ \tfrac12(a-(-1))^2+\tfrac12(a-1)^2=0$$

转向角 0——直接撞上柱子。两个正确答案的平均不是正确答案。

解决办法是让策略输出**分布**而不是单个值：混合高斯、离散化动作（RT-1）、扩散模型（Diffusion Policy）、flow matching（π0）。它们都能表示"要么左、要么右"的多峰分布，采样时只会选其中一个。` },
],

deepmimic: [
  { t: '跟踪奖励的数值感受', k: 'case', at: 'formal', mins: 3, body: R`姿态奖励 $r^p=\exp(-2\sum_j\|\hat q_j\ominus q_j\|^2)$，其中求和是所有关节的旋转误差平方：

| 所有关节误差平方之和 | 姿态奖励 |
|---|---|
| 0 | 1.00 |
| 0.1 | 0.82 |
| 0.5 | 0.37 |
| 1.0 | 0.14 |
| 2.0 | 0.02 |

指数形式的好处：奖励有界（0～1），误差小时梯度平滑，误差大时奖励接近 0 但不会变成巨大的负数；各项可以安全地加权相加。缺点是误差很大时几乎没有学习信号，所以需要参考状态初始化，让机器人从"已经接近参考"的状态开始练。` },
  { t: '今天人形机器人运动跟踪的完整流程', k: 'case', at: 'robot', mins: 4, body: R`| 步骤 | 做什么 | 代表工作 / 工具 |
|---|---|---|
| 1. 获取动作 | 动捕数据集（AMASS）、手机视频、VR 实时采集 | AMASS、VideoMimic |
| 2. 重定向 | 把人体动作映射到机器人的骨骼和关节限位 | PHC 拟合、GMR、OmniRetarget |
| 3. 过滤 | 删除物理上不可行的动作（脚滑、穿模、超出力矩） | H2O 的 sim-to-data、KungfuBot |
| 4. RL 训练跟踪策略 | DeepMimic 式奖励 + PPO + 域随机化，常用师生蒸馏 | ExBody2、GMT、BeyondMimic |
| 5. sim-to-sim 验证 | 在另一个物理引擎（如 MuJoCo）中测试 | Humanoid-Gym 流程 |
| 6. 部署真机 | 可选：用真机数据对齐动力学 | ASAP |
| 7. 上层接口 | 遥操作、语言、视频或 VLA 输出参考动作 | OmniH2O、SONIC、LeVERB |` },
],
});
})();
