// 深入讲解（第 6～9 章补全）：连续控制、机器人 RL、模仿学习、前沿拓展
(() => {
const R = String.raw;
window.DEEP = window.DEEP || {};
const add = (id, items) => { window.DEEP[id] = (window.DEEP[id] || []).concat(items); };

// ═════════ 第 6 章 · 连续控制 ═════════
add('dpg', [
  { t: '确定性策略梯度：用链式法则"沿着 Q 往上爬"', k: 'derive', at: 'intuit', mins: 4, body: R`随机策略梯度要对动作**求期望**：$\nabla J=\mathbb{E}_{a\sim\pi}[\nabla\log\pi(a\mid s)\,Q(s,a)]$，需要采很多动作才能估计准。

确定性策略 $a=\mu_\theta(s)$ 没有"动作分布"，目标直接写成：

$$J(\theta)=\mathbb{E}_{s}\big[Q(s,\mu_\theta(s))\big]$$

对 $\theta$ 求导就是普通的**链式法则**：

$$\nabla_\theta J=\mathbb{E}_s\Big[\underbrace{\nabla_aQ(s,a)\big|_{a=\mu_\theta(s)}}_{\text{Q 往哪个方向变大}}\cdot\underbrace{\nabla_\theta\mu_\theta(s)}_{\text{参数如何改变动作}}\Big]$$

直观理解：critic 告诉 actor "把动作往这个方向挪一点，Q 会变大"，actor 就调整参数朝那个方向挪。

好处是梯度不需要对动作积分，方差低、样本效率高；代价是必须有一个**可微的 Q 函数**，而且 Q 不准时 actor 会被误导（并会主动去"钻" Q 的高估漏洞）。` },
  { t: '随机策略梯度 vs 确定性策略梯度', k: 'compare', at: 'end', mins: 2, body: R`| | 随机策略梯度（REINFORCE、PPO） | 确定性策略梯度（DDPG、TD3） |
|---|---|---|
| 策略形式 | 动作分布 $\pi(a\mid s)$ | 单个动作 $\mu(s)$ |
| 梯度从哪来 | $\nabla\log\pi\times$ 优势（似然比） | $\nabla_aQ\times\nabla_\theta\mu$（链式法则） |
| 是否需要可微的 Q | 不需要 | 需要 |
| 探索 | 策略本身随机 | 额外加噪声 |
| 数据 | on-policy | off-policy（可用回放） |` },
]);

add('ddpg', [
  { t: '一次 actor 更新的数值', k: 'case', at: 'formal', mins: 3, body: R`假设在某个状态下，critic 学到的 Q 关于动作的形状是 $Q(s,a)=1-(a-0.7)^2$（最优动作是 0.7），而当前 actor 输出 $\mu(s)=0.2$。

1. critic 对动作的梯度：$\nabla_aQ=-2(a-0.7)=-2(0.2-0.7)=1.0$，为正，说明动作应该增大；
2. actor 的更新方向：$1.0\times\nabla_\theta\mu_\theta(s)$，也就是"让输出变大"的参数方向；
3. 每一步都这样做，$\mu(s)$ 会逐渐靠近 0.7，此时 $\nabla_aQ=0$，更新停止。

critic 同时在用 TD 目标 $r+\gamma Q_{\bar\phi}(s',\mu_{\bar\theta}(s'))$ 修正自己。如果 critic 在某个动作附近错误地高估了，actor 会被"引诱"过去——这正是 TD3 要解决的问题。` },
  { t: 'DDPG 的一次完整更新（PyTorch）', k: 'code', at: 'formal', mins: 3, body: '', code: R`import torch, torch.nn.functional as F

def ddpg_update(actor, critic, actor_t, critic_t, batch, opt_a, opt_c, gamma=0.99, tau=0.005):
    s, a, r, s2, done = batch
    with torch.no_grad():                                       # 1. critic 的 TD 目标
        y = r + gamma * (1 - done) * critic_t(s2, actor_t(s2)).squeeze(-1)
    critic_loss = F.mse_loss(critic(s, a).squeeze(-1), y)
    opt_c.zero_grad(); critic_loss.backward(); opt_c.step()

    actor_loss = -critic(s, actor(s)).mean()                    # 2. actor：最大化 Q(s, μ(s))
    opt_a.zero_grad(); actor_loss.backward(); opt_a.step()

    with torch.no_grad():                                       # 3. 目标网络软更新
        for net, tgt in ((actor, actor_t), (critic, critic_t)):
            for p, pt in zip(net.parameters(), tgt.parameters()):
                pt.mul_(1 - tau).add_(tau * p)` },
  { t: '常见疑问', k: 'faq', at: 'end', mins: 2, body: R`**Q：探索噪声用 OU 噪声还是高斯噪声？**
原论文用 Ornstein-Uhlenbeck（OU）噪声，它在时间上相关，适合有惯性的物理系统。后来的研究（包括 TD3 论文）发现简单的独立高斯噪声效果差不多，现在更常用高斯。

**Q：软更新系数 τ 为什么这么小（0.005）？**
它让目标网络每步只向在线网络移动 0.5%，相当于对过去约 200 步的参数做平滑平均。目标越平稳，TD 学习越稳定。` },
]);

add('td3', [
  { t: '为什么"两个 Q 取较小值"能抑制高估', k: 'derive', at: 'formal', mins: 3, body: R`设真实值为 $Q$，两个 critic 的估计为 $Q_1=Q+\epsilon_1$、$Q_2=Q+\epsilon_2$，噪声零均值且相互独立。

- 单个 critic 配合 actor 的 argmax：actor 会专门去找 $\epsilon$ 为正的动作，导致**系统性高估**。
- 取 $\min(Q_1,Q_2)$：$\mathbb{E}[\min(Q_1,Q_2)]\le Q$，这是一个**偏低**的估计。

高估比低估危险得多：高估的动作会被 actor 主动选择，误差通过 TD 目标不断累积放大；低估的动作只是不被选择，不会自我强化。所以 TD3 宁可稍微保守。SAC 也沿用了这个做法。` },
  { t: 'TD3 目标值的计算', k: 'code', at: 'formal', mins: 2, body: '对比 DDPG，只多了"目标动作加噪声并截断"和"两个 Q 取最小"两处。', code: R`import torch

@torch.no_grad()
def td3_target(actor_t, q1_t, q2_t, r, s2, done, gamma=0.99, noise=0.2, noise_clip=0.5):
    a2 = actor_t(s2)
    eps = (torch.randn_like(a2) * noise).clamp(-noise_clip, noise_clip)  # 目标策略平滑
    a2 = (a2 + eps).clamp(-1.0, 1.0)
    q = torch.min(q1_t(s2, a2), q2_t(s2, a2)).squeeze(-1)               # 双 Q 取小
    return r + gamma * (1 - done) * q
# 另外：actor 与目标网络每更新 2 次 critic 才更新 1 次（延迟更新）` },
]);

add('maxent', [
  { t: '熵到底是多少：几个分布算一遍', k: 'case', at: 'intuit', mins: 3, body: R`熵 $\mathcal{H}(\pi)=-\sum_a\pi(a)\log\pi(a)$ 衡量"有多随机"。以 4 个动作为例：

| 策略 | 熵 |
|---|---|
| 均匀 [0.25, 0.25, 0.25, 0.25] | ln 4 = 1.386（最大） |
| [0.7, 0.1, 0.1, 0.1] | 0.940 |
| [0.97, 0.01, 0.01, 0.01] | 0.168 |
| 确定性 [1, 0, 0, 0] | 0（最小） |

连续高斯策略的熵为 $\tfrac12\ln(2\pi e\sigma^2)$（每一维），σ 越大熵越大，而且可以是负数（σ 很小时）。` },
  { t: '最优策略是"按 Q 值的 softmax"', k: 'derive', at: 'formal', mins: 4, body: R`在单个状态下，最大化"期望 Q + 熵"：

$$\max_\pi\ \sum_a\pi(a)Q(a)-\alpha\sum_a\pi(a)\log\pi(a)$$

用拉格朗日乘子（约束 $\sum_a\pi(a)=1$）求解，得到：

$$\pi^*(a)=\frac{\exp(Q(a)/\alpha)}{\sum_b\exp(Q(b)/\alpha)},\qquad V=\alpha\log\sum_a\exp\big(Q(a)/\alpha\big)$$

也就是说，最优策略是 Q 值的 softmax，"软价值" V 是一个"软最大值"。例如 $Q=[1,\ 0]$：

| 温度 α | π(动作 1) | 软价值 V |
|---|---|---|
| 1 | 0.731 | ln(e + 1) = 1.313 |
| 0.1 | 0.99995 | ≈ 1.000 |
| → 0 | 1 | max Q = 1 |

α → 0 时退化为普通 RL 的贪心策略和 max。α 越大，策略越愿意"给次优动作留机会"，而软价值会为这种多样性加分。` },
]);

add('sac', [
  { t: 'SAC 与 PPO：机器人中怎么选', k: 'compare', at: 'end', mins: 3, body: R`| | PPO | SAC |
|---|---|---|
| 数据利用 | on-policy，每批用几轮就丢 | off-policy，回放缓冲区反复使用 |
| 样本效率 | 低 | 高 |
| 与 GPU 大规模并行的配合 | 极好（简单、稳定） | 需要改造（大 batch、高 UTD） |
| 调参难度 | 中（对实现细节敏感） | 低（自动温度） |
| 真机在线学习 | 很少用 | 常用（数据珍贵） |
| 典型用途 | 仿真中训练腿足/人形运控 | 真机学习、灵巧操作、真机微调 |` },
]);

// ═════════ 第 7 章 · 机器人 RL ═════════
add('pomdp', [
  { t: '信念更新：理论上"应该"怎么从历史推断状态', k: 'derive', at: 'formal', mins: 4, body: R`POMDP 中，智能体维护对真实状态的概率分布（信念）$b(s)$。执行动作 $a$、看到观测 $o$ 后，用贝叶斯公式更新：

$$b'(s')=\frac{O(o\mid s')\sum_sP(s'\mid s,a)\,b(s)}{\text{归一化常数}}$$

- $\sum_sP(s'\mid s,a)b(s)$：**预测**——根据动力学，状态可能变成什么；
- $O(o\mid s')$：**校正**——实际看到的观测有多支持每种可能。

这和卡尔曼滤波是同一个思想。精确的信念更新需要知道 $P$ 和 $O$，在机器人上不可行。深度 RL 的做法是让 RNN/TCN/Transformer 从观测历史中**隐式地学会**这种推断——网络的隐状态就扮演了信念的角色。` },
  { t: '把历史观测拼进输入（代码）', k: 'code', at: 'robot', mins: 2, body: '最简单的处理部分可观测性的方法：保留最近 H 帧观测，展平后输入 MLP，或按时间维送入 TCN / GRU。', code: R`import torch

class ObsHistory:
    def __init__(self, num_envs, obs_dim, H=50, device="cpu"):
        self.buf = torch.zeros(num_envs, H, obs_dim, device=device)

    def push(self, obs, reset_ids=None):
        if reset_ids is not None and len(reset_ids):
            self.buf[reset_ids] = obs[reset_ids].unsqueeze(1)    # 新回合：用当前观测填满历史
        self.buf = torch.roll(self.buf, shifts=-1, dims=1)
        self.buf[:, -1] = obs
        return self.buf                                         # (num_envs, H, obs_dim)` },
]);

add('actionspace', [
  { t: '四种动作空间的对比', k: 'compare', at: 'intuit', mins: 3, body: R`| 动作空间 | 策略输出 | 优点 | 缺点 | 常见于 |
|---|---|---|---|---|
| 关节力矩 | 每个电机的力矩 | 最直接、最灵活 | 难学，对仿真误差敏感 | 少数高动态工作 |
| **关节目标角度 + PD** | 目标角度（偏移） | 易学、稳定、天然柔顺 | 要调 Kp/Kd | 绝大多数腿足/人形工作 |
| 关节目标速度 | 目标角速度 | 适合轮式、机械臂 | 位置会漂移 | 部分操作任务 |
| 末端位姿 / 任务空间 | 手或脚的目标位置 | 语义清晰，易与规划结合 | 需要逆运动学 | 操作、VLA 模型 |` },
  { t: '常见疑问', k: 'faq', at: 'end', mins: 3, body: R`**Q：动作缩放系数（如 0.25）怎么选？**
它决定策略输出 ±1 时关节能偏离默认姿态多远。太小，机器人动作幅度受限，做不出大动作；太大，训练初期随机动作会让机器人乱甩、频繁摔倒。0.25 rad 是腿足行走的常见值，跑酷、翻滚等大幅度动作会更大。

**Q：Kp/Kd 是不是越大越好？**
不是。Kp 大跟踪更准但更"硬"，对延迟和噪声更敏感，容易振荡、冲击大（可以用上面的 PD 演示观察）；Kp 小更柔顺安全但跟踪差。很多人形工作按关节的电机能力分别设置，并在训练中做 ±10%～20% 的随机化。

**Q：什么是执行器网络（actuator net）？**
真实电机有摩擦、饱和、延迟，理想 PD 模型和实际差别不小。Hwangbo 等人（2019）采集真实电机的"指令 → 实际力矩"数据，训练一个小网络替代仿真中的理想 PD，大幅缩小了 sim-to-real 差距。` },
]);

add('shaping', [
  { t: '为什么势函数塑形不改变最优策略', k: 'derive', at: 'formal', mins: 4, body: R`给每步奖励加上 $F(s,s')=\gamma\Phi(s')-\Phi(s)$，看整条轨迹的回报变化：

$$\sum_{t=0}^{\infty}\gamma^t\big(\gamma\Phi(s_{t+1})-\Phi(s_t)\big)=\big(\gamma\Phi(s_1)-\Phi(s_0)\big)+\big(\gamma^2\Phi(s_2)-\gamma\Phi(s_1)\big)+\dots=-\Phi(s_0)$$

中间项两两抵消（又是望远镜求和），只剩 $-\Phi(s_0)$。所以：

$$G'_0=G_0-\Phi(s_0),\qquad Q'(s,a)=Q(s,a)-\Phi(s)$$

在同一个状态下，所有动作的 Q 值都减去**同一个数** $\Phi(s)$，排序不变，最优动作不变。势函数塑形只是"给学习过程加了路标"，不改变终点。

实践中机器人奖励的大部分项（能耗、平滑、姿态惩罚）**都不是**势函数形式，它们确实会改变最优策略——这正是我们想要的（希望机器人节能、平滑），但也意味着权重要谨慎设置。` },
  { t: '奖励被"钻空子"的典型例子', k: 'case', at: 'example', mins: 3, body: R`RL 会找到奖励函数中任何可以利用的漏洞：

| 奖励设计 | 意图 | 学到的"捷径" |
|---|---|---|
| 只奖励前进速度 | 走得快 | 身体抽搐着向前滑、或连续前扑摔倒 |
| 惩罚过重（力矩、能耗） | 节能、平滑 | 站着不动最划算 |
| 奖励脚抬高 | 迈大步 | 一条腿一直举在空中 |
| 赛艇游戏中奖励吃金币（OpenAI 的著名例子） | 跑完赛道 | 原地转圈反复吃同一批金币 |
| 仿真中的接触漏洞 | 真实的动作 | 利用穿模或数值误差"弹射" |

应对方法：观察**各奖励分量**而不只看总分；录视频看实际行为；用运动参考数据（AMP、运动跟踪）约束动作风格；在第二个物理引擎中验证（sim-to-sim）。` },
  { t: '调奖励的实用流程', k: 'faq', at: 'end', mins: 3, body: R`**第 1 步**：只保留核心任务项（速度跟踪）+ 摔倒终止，确认机器人"能动起来"。

**第 2 步**：逐项加入惩罚，每次只改一项，观察对动作风格的影响和各分量曲线。

**第 3 步**：权重的量级要对齐。比较每一项在一个回合中的累计值，避免某项惩罚远大于任务奖励（机器人会选择"躺平"）。

**第 4 步**：用课程学习先易后难，例如先给宽松的跟踪核（大 σ），再逐渐收紧。

**第 5 步**：在 MuJoCo 等另一个仿真器中回放策略（sim-to-sim），检查是否利用了某个仿真器特有的漏洞。` },
]);

add('parallel', [
  { t: 'CPU 仿真与 GPU 并行仿真的流水线对比', k: 'compare', at: 'intuit', mins: 3, body: R`| | 传统 CPU 仿真 | GPU 并行仿真（Isaac Gym / Lab、MJX） |
|---|---|---|
| 环境数量 | 几个到几十个进程 | 一张卡上数千到上万个 |
| 物理计算 | CPU | GPU |
| 观测、奖励计算 | Python 循环 | 批量张量运算 |
| CPU ↔ GPU 数据拷贝 | 每步都要 | 几乎没有 |
| 吞吐量 | 每秒数千步 | 每秒数十万步量级 |
| 训练一个四足行走策略 | 数小时到数天 | 数分钟到数十分钟 |

关键不只是"物理算得快"，而是**整条数据流都留在 GPU 上**：物理状态 → 观测 → 策略网络 → 动作 → 物理，全程不离开显存。` },
  { t: '奖励也要写成批量张量运算', k: 'code', at: 'robot', mins: 2, body: '在并行仿真里，每个奖励函数一次计算所有环境，形状为 (num_envs,)。下面两项与 legged_gym 的写法一致。', code: R`import torch

def reward_tracking_lin_vel(commands, base_lin_vel, sigma=0.25):
    err = torch.sum((commands[:, :2] - base_lin_vel[:, :2]) ** 2, dim=1)   # (num_envs,)
    return torch.exp(-err / sigma)

def reward_action_rate(actions, last_actions):
    return torch.sum((actions - last_actions) ** 2, dim=1)                  # 乘以负权重后作为惩罚

# total = 1.0 * reward_tracking_lin_vel(...) - 0.01 * reward_action_rate(...) + ...` },
]);

add('curriculum', [
  { t: 'legged_gym 的地形课程是怎么运作的', k: 'case', at: 'intuit', mins: 3, body: R`地形被排成一个网格：每一行是一种难度（坡度、台阶高度越来越大），每一列是一种地形类型（斜坡、台阶、离散障碍……）。

每个机器人在回合结束时，根据走出的距离调整难度：

| 条件 | 调整 |
|---|---|
| 走出的距离 > 地形块长度的一半 | 升一级（更难） |
| 走出的距离 < 指令速度 × 回合时长 × 0.5 | 降一级（更简单） |
| 其他 | 保持 |

到达最高级的机器人会被随机分配到任意级别，防止遗忘简单地形。效果是：每个机器人总在"刚好有点难"的地形上练习，数千个机器人自然分布在各个难度上。` },
  { t: '课程更新的代码', k: 'code', at: 'end', mins: 2, body: '', code: R`import torch

def update_terrain_curriculum(env_ids, root_pos, env_origins, commands, terrain_levels,
                              terrain_length, episode_length_s, max_level):
    distance = torch.norm(root_pos[env_ids, :2] - env_origins[env_ids, :2], dim=1)
    move_up = distance > terrain_length / 2
    move_down = (distance < torch.norm(commands[env_ids, :2], dim=1) * episode_length_s * 0.5) & ~move_up
    terrain_levels[env_ids] += move_up.long() - move_down.long()
    # 通关最高级的机器人随机回到某一级，避免遗忘
    solved = terrain_levels[env_ids] > max_level
    terrain_levels[env_ids] = torch.where(solved, torch.randint_like(terrain_levels[env_ids], max_level + 1),
                                          terrain_levels[env_ids].clamp(min=0))
    return terrain_levels` },
]);

add('dr', [
  { t: '在回合重置时随机化（示意代码）', k: 'code', at: 'robot', mins: 2, body: '域随机化通常在每个环境重置时重新采样一组参数；推扰则在回合中按固定间隔施加。具体 API 因仿真器而异，下面只示意结构。', code: R`import torch

def randomize_on_reset(env, env_ids):
    n = len(env_ids)
    env.friction[env_ids] = torch.empty(n).uniform_(0.5, 1.25)           # 地面摩擦
    env.added_mass[env_ids] = torch.empty(n).uniform_(-1.0, 1.0)         # 机身附加质量 (kg)
    env.motor_strength[env_ids] = torch.empty(n, env.num_dof).uniform_(0.9, 1.1)
    env.kp_scale[env_ids] = torch.empty(n, env.num_dof).uniform_(0.9, 1.1)
    env.action_delay[env_ids] = torch.randint(0, 3, (n,))              # 延迟 0~2 个控制步

def push_robots(env, step, interval_steps=750, max_vel=1.0):             # 50Hz 下约每 15 秒
    if step % interval_steps == 0:
        env.root_lin_vel[:, :2] += torch.empty(env.num_envs, 2).uniform_(-max_vel, max_vel)` },
]);

add('asym', [
  { t: 'actor 与 critic 的观测对比（典型人形 / 四足配置）', k: 'case', at: 'intuit', mins: 3, body: R`| 观测 | Actor（部署用） | Critic（仅训练） |
|---|---|---|
| 关节角度、角速度、上一步动作 | 有 | 有 |
| IMU 角速度、重力投影 | 有（加噪声） | 有（无噪声） |
| 速度 / 动作指令 | 有 | 有 |
| 观测历史 | 常常有 | 可选 |
| 机身真实线速度 | **无** | 有 |
| 周围地形高度点（如 17×11 = 187 个） | 视传感器而定 | 有 |
| 摩擦、质量、推力等随机化参数 | **无** | 有 |
| 足端接触力 | **无** | 有 |

critic 看到的越多，价值估计越准，优势的噪声越小，actor 学得越快。部署时 critic 被丢弃，所以没有任何代价。` },
]);

add('privileged', [
  { t: '常见疑问', k: 'faq', at: 'end', mins: 3, body: R`**Q：为什么不直接用 RL 训练只看本体历史的策略？**
可以（如 DreamWaQ、一阶段的非对称 AC），但更难：策略要同时学会"推断隐藏信息"和"利用它做控制"，信号稀疏、训练慢。两阶段把问题拆成"RL 解决控制"和"监督学习解决推断"，各自都更容易。

**Q：学生能达到教师的水平吗？**
通常略低。有些信息从本体历史中推断不出来（比如前方 1 米的台阶，脚还没碰到时无从知道），这部分差距只能靠加入视觉等传感器弥补。

**Q：教师-学生和非对称 AC 有什么区别？**
非对称 AC 只是让 critic 看特权信息，actor 从一开始就只用部署可得的观测，一个阶段完成；师生蒸馏是先训一个**actor 也看特权信息**的教师，再蒸馏。两者常常组合使用。` },
]);

add('rma', [
  { t: 'RMA 的两阶段训练', k: 'case', at: 'formal', mins: 3, body: R`| | 阶段 1：基础策略 | 阶段 2：自适应模块 |
|---|---|---|
| 输入 | 当前状态 + 上一步动作 + **环境参数** | 最近 50 步的状态与动作 |
| 环境参数如何使用 | 编码器 μ 把摩擦、负载、质心、电机强度等压缩成 8 维隐向量 z | 网络 φ 从历史中估计 $\hat z$ |
| 训练方式 | PPO，策略与编码器一起端到端训练 | 监督回归 $\min\|\hat z-z\|^2$ |
| 部署时 | 不再使用编码器 μ | 用 $\hat z$ 代替 z 输入基础策略 |

为什么估计低维的 z 比估计全部物理参数更容易？z 只保留了"对控制有用"的信息。比如两种不同的"摩擦 × 负载"组合可能对步态的影响相同，编码器会把它们映射到相近的 z，自适应模块不需要区分它们。` },
]);

add('estimator', [
  { t: '估计什么、怎么训练', k: 'case', at: 'intuit', mins: 3, body: R`Ji 等人（2022）的并行估计器从本体感知历史中估计三类量：

| 估计量 | 为什么有用 | 仿真中的监督信号 |
|---|---|---|
| 机身线速度 | 速度跟踪需要知道自己有多快 | 仿真真值 |
| 足端离地高度 | 判断何时落脚、地形起伏 | 仿真真值 |
| 足端接触概率 | 判断支撑相与摆动相 | 接触力是否超过阈值 |

训练时估计器与策略**同时**训练：估计器用监督损失（回归 / 分类），策略用 RL，并以估计值作为输入。部署时估计器在真机上实时运行，相当于一个学出来的状态观测器。` },
  { t: '估计器与策略联合训练（示意）', k: 'code', at: 'end', mins: 2, body: '', code: R`import torch, torch.nn.functional as F

def estimator_loss(estimator, obs_hist, true_lin_vel, true_foot_h, true_contact):
    pred = estimator(obs_hist)                               # (N, 3 + 4 + 4)，以四足为例
    v, h, c_logit = pred[:, :3], pred[:, 3:7], pred[:, 7:]
    return (F.mse_loss(v, true_lin_vel) + F.mse_loss(h, true_foot_h)
            + F.binary_cross_entropy_with_logits(c_logit, true_contact.float()))

# 策略输入 = 本体观测 + estimator(obs_hist).detach()；PPO 与估计器损失各自优化` },
]);

// ═════════ 第 8 章 · 模仿学习 ═════════
add('bc', [
  { t: '复合误差：为什么误差随时间平方增长', k: 'derive', at: 'intuit', mins: 4, body: R`设学到的策略在**专家访问过的状态**上每步出错的概率是 ε。问题是：一旦出错，策略就进入专家没去过的状态，在那里它从没训练过，接下来可能一直错下去。

最坏情况下：第 1 步出错，之后 $T-1$ 步都错；第 2 步出错，之后 $T-2$ 步都错……累计代价约为

$$\varepsilon\cdot\big(T+(T-1)+\dots+1\big)\approx\varepsilon T^2/2$$

Ross 与 Bagnell 的理论结果：行为克隆的代价上界随 $T^2$ 增长，而 DAgger 只随 $T$ 线性增长。

这解释了几个实践经验：
- 长时序任务（几十秒的操作）用纯 BC 很容易"越走越偏"；
- **动作分块**（ACT、Diffusion Policy 一次预测十几步）减少了决策次数，相当于缩短了有效的 $T$；
- 遥操作时加入"纠偏"数据（DAgger、人在回路）很有效。` },
  { t: '行为克隆的训练循环', k: 'code', at: 'formal', mins: 2, body: '', code: R`import torch

def train_bc(policy, loader, epochs=50, lr=1e-4):
    opt = torch.optim.AdamW(policy.parameters(), lr=lr)
    for ep in range(epochs):
        for obs, act in loader:                     # 专家示范 (观测, 动作)
            dist = policy(obs)                      # 输出动作分布（高斯 / 混合高斯 / ...）
            loss = -dist.log_prob(act).sum(-1).mean()   # 最大似然；确定性策略可用 MSE
            opt.zero_grad(); loss.backward(); opt.step()` },
]);

add('dagger', [
  { t: '行为克隆、DAgger 与强化学习', k: 'compare', at: 'intuit', mins: 3, body: R`| | 行为克隆 | DAgger | 强化学习 |
|---|---|---|---|
| 需要什么 | 一批专家示范 | 可随时询问的专家 | 奖励函数 + 环境交互 |
| 训练数据的状态分布 | 专家的 | **学习者自己的** | 学习者自己的 |
| 复合误差 | 严重（∝ T²） | 缓解（∝ T） | 不存在 |
| 能否超越专家 | 不能 | 不能 | 能 |
| 机器人中的典型形式 | 遥操作数据 + ACT / Diffusion Policy | 师生蒸馏、人类实时纠偏 | 仿真中 PPO |` },
  { t: '常见疑问', k: 'faq', at: 'end', mins: 2, body: R`**Q：如果专家是人，DAgger 是不是很累？**
是的，让人逐帧标注"这里应该怎么做"成本很高。实用的变体是 **HG-DAgger / 人在回路干预**：机器人自主执行，人只在它快出错时接管，接管期间的数据加入训练集。

**Q：机器人里的 DAgger 为什么这么常见？**
因为"专家"常常是仿真中的教师策略：它不知疲倦、可以在任意状态上瞬间给出标注。师生蒸馏本质上就是自动化的 DAgger。` },
]);

add('gail', [
  { t: '判别器学到了什么：最优判别器', k: 'derive', at: 'formal', mins: 4, body: R`记 $D(s,a)$ 为"这个状态-动作来自专家"的概率，$\rho_E$、$\rho_\pi$ 分别是专家和当前策略的状态-动作占用分布。固定策略时，判别器的最优解是：

$$D^*(s,a)=\frac{\rho_E(s,a)}{\rho_E(s,a)+\rho_\pi(s,a)}$$

- 专家经常做、策略很少做的 (s,a)：$D^*\to1$，奖励 $-\log(1-D)$ 很大 → 策略被鼓励去做；
- 策略经常做、专家从不做的：$D^*\to0$，奖励接近 0 → 策略被劝阻；
- 两者分布一致时：$D^*=0.5$ 处处成立，判别器无法区分，学习完成。

把 $D^*$ 代回目标可以证明，GAIL 是在最小化两个占用分布之间的 Jensen-Shannon 散度。它不需要显式地学出奖励函数，所以可以看作"跳过奖励、直接匹配行为分布"的逆强化学习。` },
  { t: 'BC、逆强化学习与 GAIL', k: 'compare', at: 'end', mins: 2, body: R`| | 行为克隆 | 逆强化学习 | GAIL |
|---|---|---|---|
| 学什么 | 直接学策略 | 先学奖励，再用 RL 学策略 | 对抗地直接匹配行为分布 |
| 需要环境交互 | 不需要 | 需要（多轮 RL） | 需要 |
| 复合误差 | 有 | 无 | 无 |
| 计算成本 | 低 | 很高 | 高 |
| 训练稳定性 | 高 | 中 | 较低（对抗训练） |` },
]);

add('deepmimic', [
  { t: '跟踪奖励的代码', k: 'code', at: 'formal', mins: 2, body: '权重与系数取自 DeepMimic 论文的设置（各项分别对应关节旋转、关节角速度、末端位置、质心位置）。', code: R`import torch

def tracking_reward(q, q_ref, dq, dq_ref, ee, ee_ref, com, com_ref):
    r_pose = torch.exp(-2.0 * torch.sum((q - q_ref) ** 2, dim=-1))       # 关节姿态
    r_vel = torch.exp(-0.1 * torch.sum((dq - dq_ref) ** 2, dim=-1))      # 关节角速度
    r_ee = torch.exp(-40.0 * torch.sum((ee - ee_ref) ** 2, dim=(-1, -2)))  # 手脚位置
    r_com = torch.exp(-10.0 * torch.sum((com - com_ref) ** 2, dim=-1))    # 质心位置
    return 0.65 * r_pose + 0.1 * r_vel + 0.15 * r_ee + 0.1 * r_com
# 注：论文中姿态误差用四元数差的旋转角，这里用关节角差简化表示` },
  { t: '常见疑问', k: 'faq', at: 'end', mins: 3, body: R`**Q：一个策略能跟踪多少段动作？**
DeepMimic 原始做法是一段动作一个策略。PHC、GMT、BeyondMimic、SONIC 等工作把它扩展到一个策略跟踪成千上万段动作，关键技巧包括：按难度自适应采样动作片段、专家混合（MoE）、更大的网络与数据。

**Q：参考动作是人体的，机器人骨骼比例不同怎么办？**
需要"重定向"：把人体关节位置或旋转映射到机器人上，同时满足关节限位，并尽量保持脚与地面、手与物体的接触关系。重定向的质量很大程度上决定了最终动作是否自然、是否物理可行。

**Q：跟踪策略本身能完成任务吗？**
它只负责"把给定的动作做出来"。要完成任务（比如走到门前开门），还需要一个上层模块生成合适的参考动作：可以是遥操作、运动生成模型、扩散模型（BeyondMimic 的引导扩散）或 VLA。` },
]);

add('amp', [
  { t: '风格奖励的数值', k: 'case', at: 'formal', mins: 3, body: R`AMP 用最小二乘 GAN：判别器把数据集中的转移推向输出 +1，把策略产生的转移推向 −1。风格奖励为 $r^S=\max\big[0,\ 1-0.25(D-1)^2\big]$：

| 判别器输出 D | 含义 | 风格奖励 |
|---|---|---|
| +1 | 看起来完全像动作数据 | 1.00 |
| 0 | 拿不准 | 0.75 |
| −1 | 明显是策略做出来的 | 0.00 |
| −2 | 极不像 | 0（截断，不会变成负数） |

这个奖励有界、平滑，可以和任务奖励（比如速度跟踪）安全地加权相加。` },
  { t: 'AMP 判别器损失（含梯度惩罚）', k: 'code', at: 'formal', mins: 3, body: '梯度惩罚让判别器在数据样本附近保持平滑，是 AMP 训练稳定的关键。', code: R`import torch

def amp_disc_loss(D, real_ss, fake_ss, gp_weight=5.0):
    """real_ss / fake_ss: 拼接后的 (s, s')，分别来自动作数据集和策略"""
    real_ss = real_ss.requires_grad_(True)
    d_real, d_fake = D(real_ss), D(fake_ss)
    loss = ((d_real - 1) ** 2).mean() + ((d_fake + 1) ** 2).mean()        # 最小二乘 GAN
    grad = torch.autograd.grad(d_real.sum(), real_ss, create_graph=True)[0]
    return loss + gp_weight * grad.pow(2).sum(-1).mean()                  # 梯度惩罚

def amp_style_reward(D, ss):
    with torch.no_grad():
        return torch.clamp(1 - 0.25 * (D(ss) - 1) ** 2, min=0).squeeze(-1)` },
  { t: 'AMP 与 DeepMimic 运动跟踪', k: 'compare', at: 'end', mins: 2, body: R`| | DeepMimic 式跟踪 | AMP |
|---|---|---|
| 需要的数据 | 每个时刻要对齐的参考动作 | 一个无标注的动作片段集合 |
| 动作与参考的关系 | 逐帧精确复现 | 只要"风格像"即可 |
| 能否同时完成任意任务 | 需要上层生成参考 | 可直接与任务奖励结合 |
| 动作精度 | 高 | 较低 |
| 训练稳定性 | 高 | 对抗训练，较敏感 |
| 典型用途 | 人形全身遥操作、舞蹈、高难技能 | 自然步态、风格化行走 |` },
]);

add('diffpolicy', [
  { t: '扩散模型如何"去噪生成"动作', k: 'derive', at: 'formal', mins: 4, body: R`**加噪过程（训练时用）**：从真实动作序列 $a^0$ 开始，按预设的噪声表逐步加入高斯噪声，第 k 步的样本可以一步写出：

$$a^k=\sqrt{\bar\alpha_k}\,a^0+\sqrt{1-\bar\alpha_k}\,\epsilon,\qquad\epsilon\sim\mathcal{N}(0,I)$$

k 越大，噪声越多；k = K 时几乎是纯噪声。

**训练**：让网络 $\epsilon_\theta(o,a^k,k)$ 根据观测 $o$ 和加噪后的动作，**预测加进去的噪声**：

$$\mathcal{L}=\mathbb{E}_{k,\epsilon}\big\|\epsilon-\epsilon_\theta(o,a^k,k)\big\|^2$$

**推理**：从纯噪声 $a^K$ 出发，反复用网络预测的噪声"减去一点"，K 步后得到一个干净、合理的动作序列。

它为什么能处理多模态？网络学到的是"在当前位置，往哪个方向走更像真实数据"。从不同的初始噪声出发，会被引向不同的模式（左绕或右绕），而不是平均到中间。` },
  { t: '动作分块与滚动执行', k: 'case', at: 'example', mins: 3, body: R`Diffusion Policy 不是每步预测一个动作，而是一次预测一段：

| 参数 | 原论文的典型值 | 含义 |
|---|---|---|
| 观测窗口 $T_o$ | 2 | 输入最近 2 帧观测 |
| 预测长度 $T_p$ | 16 | 一次生成未来 16 步动作 |
| 执行长度 $T_a$ | 8 | 只执行前 8 步，然后重新预测 |

这种"预测长、执行短、再重规划"的方式类似 MPC：
- 一次生成一整段，动作在时间上连贯，不会在两种做法之间来回切换；
- 只执行一部分再重规划，能对环境变化做出反应；
- 决策次数减少，缓解了行为克隆的复合误差。` },
  { t: '扩散策略的训练损失（示意）', k: 'code', at: 'end', mins: 2, body: '', code: R`import torch, torch.nn.functional as F

def diffusion_policy_loss(eps_net, obs, actions, alphas_cumprod):
    """actions: (B, T_p, act_dim) 专家动作块；alphas_cumprod: (K,) 噪声表"""
    B, K = actions.shape[0], alphas_cumprod.shape[0]
    k = torch.randint(0, K, (B,), device=actions.device)
    a_bar = alphas_cumprod[k].view(B, 1, 1)
    noise = torch.randn_like(actions)
    noisy = a_bar.sqrt() * actions + (1 - a_bar).sqrt() * noise   # 一步加噪到第 k 步
    return F.mse_loss(eps_net(obs, noisy, k), noise)              # 预测加入的噪声` },
]);

// ═════════ 第 9 章 · 前沿拓展 ═════════
add('dreamer', [
  { t: 'Dreamer 的组成部分', k: 'case', at: 'intuit', mins: 3, body: R`| 模块 | 作用 |
|---|---|
| 编码器 | 把图像 / 本体观测压缩成特征 |
| 确定性状态 $h_t$（GRU） | 记住历史，相当于"记忆" |
| 随机状态 $z_t$ | 表示不确定性；训练时由观测推断（后验），想象时只靠模型预测（先验） |
| 解码器 | 从隐状态重建观测，迫使隐状态包含足够信息 |
| 奖励预测器、终止预测器 | 预测想象轨迹中的奖励和是否结束 |
| Actor、Critic | 完全在想象出的隐状态轨迹上训练 |` },
  { t: '"在想象中学习"的训练循环', k: 'derive', at: 'end', mins: 4, body: R`Dreamer 交替进行三件事：

**1. 与真实环境交互**：用当前 actor 采集数据，存入回放缓冲区。

**2. 训练世界模型**：从缓冲区采样真实序列，让模型学会重建观测、预测奖励、并让先验预测的 $z_t$ 尽量接近由真实观测推断出的 $z_t$（KL 损失）。

**3. 在想象中训练 actor-critic**：从真实数据的隐状态出发，**完全由模型**向前展开若干步（原论文约 15 步）：actor 选动作 → 模型预测下一隐状态和奖励。在这些想象轨迹上：
- critic 学习估计 λ-回报；
- actor 通过对想象回报**反向传播**（世界模型是可微的）或用策略梯度来更新。

好处：真实交互少得多（DayDreamer 在真机上 1 小时学会行走）；风险：模型不准时，actor 会利用模型的错误"想象出"不存在的高回报。` },
]);

add('tdmpc', [
  { t: 'TD-MPC 每一步是如何规划的', k: 'case', at: 'formal', mins: 3, body: R`每个控制步，TD-MPC 在学到的隐空间中做一次小型优化（MPPI）：

1. **采样**：生成几百条长度为 H（仅几步）的候选动作序列，其中一部分来自策略网络，一部分是在当前分布上加噪声；
2. **想象**：用学到的隐动力学把每条序列向前推演，累加预测奖励，并在末端加上价值函数 $Q(z_H,a_H)$；
3. **重加权**：按得分的指数给各条序列加权，更新动作分布的均值和方差；
4. 重复几轮后，**只执行第一个动作**，下一步重新规划。

H 很短也能做好长时序任务，是因为末端的 $Q$ 已经"总结"了视界之外的未来——这就是名字中"TD"的含义：用 TD 学到的价值函数补足短视界规划。` },
  { t: '无模型 RL、Dreamer 与 TD-MPC', k: 'compare', at: 'end', mins: 2, body: R`| | 无模型（PPO / SAC） | Dreamer | TD-MPC |
|---|---|---|---|
| 是否学习环境模型 | 否 | 是（含观测重建） | 是（只预测与任务相关的量） |
| 动作如何产生 | 策略网络直接输出 | 策略网络直接输出 | 每步在线规划 |
| 推理开销 | 很低 | 很低 | 较高 |
| 样本效率 | 低～中 | 高 | 高 |
| 擅长 | 大规模仿真训练 | 图像输入、真机学习 | 高维连续控制（如人形） |` },
]);

add('offline', [
  { t: '一个例子：为什么离线 Q 学习会"想入非非"', k: 'case', at: 'intuit', mins: 3, body: R`假设数据集中，某个状态下只出现过动作 A（回报约 5）。Q 网络在动作 A 附近训练得不错，但对从没见过的动作 B，它的输出只是随机初始化加泛化的结果——可能是 2，也可能是 20。

在线 RL 中，如果 Q(s,B) 被错误地估成 20，智能体会去试 B，发现回报其实很低，Q 就被纠正了。

离线 RL **不能去试**。于是：
1. 策略选择 Q 最高的动作 B；
2. TD 目标 $r+\gamma\max_aQ(s',a)$ 把这个错误的高估传播给前面的状态；
3. 误差越积越大，最终学出一个在真实环境中完全不可用的策略。

所有离线 RL 方法都在回答同一个问题：**如何不相信数据之外的动作**。` },
  { t: '主要离线 RL 方法对比', k: 'compare', at: 'end', mins: 2, body: R`| 方法 | 核心思路 | 是否查询数据外动作 | 特点 |
|---|---|---|---|
| 行为克隆 | 只模仿数据 | 否 | 无法超越数据 |
| BCQ | 只在"像数据"的动作中选 argmax | 有限 | 需要额外的生成模型 |
| CQL | 压低数据外动作的 Q 值 | 是，但给予惩罚 | 保守，理论清晰 |
| IQL | 用期望分位数回归，完全不查询 | 否 | 简单、稳定，适合离线到在线微调 |
| Decision Transformer | 以目标回报为条件做序列建模 | 否 | 把 RL 变成监督学习 |` },
]);

add('cql', [
  { t: 'CQL 的正则项在做什么', k: 'derive', at: 'formal', mins: 3, body: R`CQL 在普通 TD 损失之外加入：

$$\alpha\Big(\mathbb{E}_{s\sim\mathcal{D}}\Big[\log\sum_a\exp Q(s,a)\Big]-\mathbb{E}_{(s,a)\sim\mathcal{D}}\big[Q(s,a)\big]\Big)$$

- 第一项 $\log\sum_a\exp Q$ 是"所有动作 Q 值的软最大值"。最小化它会压低 Q 值最高的那些动作——包括被错误高估的数据外动作；
- 第二项是数据中实际出现的动作的 Q 值。减去它（即最大化它）把数据内动作的 Q 值托住。

合起来：**数据外的动作被压低，数据内的动作被保留**。α 控制保守程度：太大会过度保守，接近行为克隆；太小则仍会高估。` },
]);

add('rlhf', [
  { t: '奖励模型：从"哪个更好"到一个分数', k: 'derive', at: 'formal', mins: 3, body: R`人类标注者对同一个问题的两个回答 $y_w$（更好）和 $y_l$（更差）做比较。用 **Bradley-Terry 模型**假设：

$$P(y_w\succ y_l)=\sigma\big(r_\phi(x,y_w)-r_\phi(x,y_l)\big)$$

训练奖励模型就是最大化这个概率的对数：

$$\mathcal{L}(\phi)=-\mathbb{E}\big[\log\sigma\big(r_\phi(x,y_w)-r_\phi(x,y_l)\big)\big]$$

奖励模型学到的只是**相对**好坏（加一个常数不影响），这也是为什么 RLHF 中常对奖励做归一化。之后用 PPO 优化语言模型，并用 KL 惩罚防止模型为了刷高分而偏离原模型太远（奖励模型本身也会被"钻空子"）。` },
  { t: 'RLHF、DPO 与 GRPO', k: 'compare', at: 'end', mins: 3, body: R`| | RLHF（PPO） | DPO | GRPO |
|---|---|---|---|
| 是否需要单独的奖励模型 | 需要 | 不需要（隐式） | 需要奖励信号（可以是规则判分） |
| 是否需要价值网络 | 需要 | 不需要 | **不需要**（用组内平均作基线） |
| 训练方式 | 在线 RL | 离线，在偏好数据上做分类式损失 | 在线 RL |
| 典型场景 | 对齐人类偏好 | 对齐人类偏好 | 数学、代码等可自动判对错的推理任务 |

DPO 的损失：$-\log\sigma\Big(\beta\log\frac{\pi_\theta(y_w)}{\pi_{\text{ref}}(y_w)}-\beta\log\frac{\pi_\theta(y_l)}{\pi_{\text{ref}}(y_l)}\Big)$，它证明了在 KL 约束的 RLHF 目标下，最优策略与奖励之间有解析关系，于是可以跳过奖励模型和 RL。` },
]);

add('grpo', [
  { t: '手算一组 GRPO 优势', k: 'case', at: 'formal', mins: 3, body: R`对同一个数学题采样 4 个回答，用规则判分（对 = 1，错 = 0），得到 $r=[1,\ 0,\ 0,\ 1]$。

- 组内均值：0.5
- 组内标准差：0.5（按总体标准差计算；有些实现用样本标准差 0.577，结果只差一个缩放）
- 优势：$\hat A_i=(r_i-0.5)/0.5=[+1,\ -1,\ -1,\ +1]$

答对的两个回答中每个 token 都获得 +1 的优势，答错的获得 −1，然后用与 PPO 相同的截断目标更新。

如果 4 个回答**全对或全错**，标准差为 0、优势全为 0，这一组不提供任何学习信号——这也是为什么训练题目的难度要合适：太简单或太难都学不到东西。` },
  { t: '为什么可以不要价值网络', k: 'derive', at: 'end', mins: 2, body: R`PPO 中价值网络的作用是提供基线 $V(s)$，让"比平均好"的动作得正优势。GRPO 换了一种估计"平均水平"的方式：**对同一个输入多采样几次，用这几次的平均奖励作为基线**。

- 优点：省掉一个和策略同样大的价值网络（对大语言模型来说，显存和计算节省很多）；不需要训练价值函数，避免了它带来的偏差。
- 代价：每个输入要采样多次；只适合"一次生成、最后打分"的任务，难以给中间每一步单独的信用分配。

机器人任务通常是长时序、每步都有奖励的，所以运控中仍以 PPO + 价值网络为主；GRPO 式方法主要出现在 VLA 模型以"成功 / 失败"为奖励的后训练中。` },
]);

add('vlarl', [
  { t: '给 VLA 做 RL 后训练的几条路线', k: 'compare', at: 'intuit', mins: 3, body: R`| 路线 | 做法 | 代表工作 | 难点 |
|---|---|---|---|
| 在线策略梯度 | 在仿真中按成功 / 失败奖励用 PPO 或 GRPO 微调 VLA | SimpleVLA-RL 等 | 需要可并行的仿真与可靠的成功判定 |
| 优势条件化 | 学一个价值函数估计每段动作的好坏，把"好 / 坏"作为条件训练策略，执行时只取"好"的条件 | π*0.6（RECAP） | 价值函数的准确性 |
| 扩散 / flow 策略 RL | 把去噪过程看作内层 MDP，用 PPO 微调 | DPPO | 去噪步数多，计算量大 |
| 残差 RL | 冻结 VLA，再学一个小的残差策略做修正 | 多项工作 | 修正幅度有限 |
| 离线 RL | 用自主执行与人类纠正数据离线训练 | 多项工作 | 分布外动作 |

共同的动机：模仿学习的上限是示范数据的水平，RL 能利用机器人自己的成功和失败经验继续提升成功率和执行速度。` },
]);
})();
