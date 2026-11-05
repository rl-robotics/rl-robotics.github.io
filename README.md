# RL × Robotics 学习地图

一个本地网页，帮你从零理解强化学习的理论，并看清近几年机器人运控的发展脉络。视觉风格参考 [supermimic.github.io](https://supermimic.github.io/)。

打开首页会先问"你想做什么？"，按需求给出四个入口：

| 页面 | 地址 | 适合 | 内容 |
| --- | --- | --- | --- |
| **学习路线** | `#/learn` | 新手系统学习 | 9 章课程，从"什么是强化学习"讲到 PPO、SAC、sim-to-real 和运动模仿。其中 44 节是**精讲**：直觉解释 → 正式定义（公式逐项解释）→ 例子 → 伪代码 → 常见误区 → 在机器人中的应用 → 自测题 → 延伸阅读。其余知识点有简介页和延伸阅读入口。读完的课会被记住（只保存在你的浏览器里） |
| **知识图谱** | `#/map` | 查某个算法从哪来、依赖什么 | 约 90 个概念的关系网，有 5 条学习路径。点节点后可以"阅读详细讲解" |
| **运控演进** | `#/timeline` | 看机器人运控的发展 | 约 105 篇里程碑论文，分 8 条技术流，有 5 条故事线导览。论文详情里有"读前须知"，直接链接到需要先学的 RL 课程 |
| **论文库** | `#/papers` | 找论文 | awesome-humanoid-robot-learning 全部论文，每篇都能直达 arXiv、PDF、项目主页、代码、alphaXiv 和 Google Scholar |

## 在线访问

<https://rl-robotics.github.io/>

## 运行

脚本依赖都在本地（`vendor/` 下的 d3 7.9.0 和 KaTeX 0.16.9），不联网也能用。Inter 字体从 Google Fonts 加载，离线时会自动换成系统字体。

```bash
python3 -m http.server 8765
```

然后打开 <http://localhost:8765>。直接双击 `index.html` 也可以打开。

快捷键：`/` 搜索，`空格` 播放或暂停，`Esc` 关闭面板。

## 更新论文数据

```bash
python3 scripts/update_data.py            # 增量更新：拉取最新 awesome README，并刷新超过 7 天的引用数
python3 scripts/update_data.py --refresh  # 强制刷新全部引用数
python3 scripts/update_data.py --offline  # 不联网，只用缓存重新生成
```

- 引用数来自 Semantic Scholar 的 batch API，没有 key 时会有限速。可以设置环境变量 `S2_API_KEY` 提高限额。
- 影响力分数 = 0.55·log(总引用) + 0.9·log(月均引用×3) + 会议档次加成 + 开源加成，最后取分位数映射到节点大小。
- 缓存位于 `data/cache/`。

## 部署到 GitHub Pages

这是纯静态网站，不需要构建。把仓库推到 GitHub 后，在仓库的 Settings → Pages 中选 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`。

`.github/workflows/update-data.yml` 每周一自动运行 `update_data.py`，有新论文或引用变化时自动提交，网站随之更新。也可以在 Actions 页面手动触发。

## 目录

```
index.html              页面骨架（首页 / 学习路线 / 知识图谱 / 运控演进 / 论文库）
css/style.css           样式
js/app.js               核心：路由、数据索引、详情面板、搜索、课程组装、学习进度
js/view-home.js         首页
js/view-learn.js        学习路线与课程页
js/view-rl.js           知识图谱
js/view-timeline.js     运控演进
js/view-river.js        论文库
data/lessons.js         【手工】章节、精讲内容、延伸阅读资源库
data/rl_knowledge.js    【手工】RL 节点、关系、学习路径
data/milestones.js      【手工】技术流、时代、里程碑论文、故事线
data/papers.js          【自动生成】awesome 列表论文与引用数
scripts/update_data.py  数据更新脚本
```

## 扩展内容

- **给某个知识点写精讲**：在 `data/lessons.js` 的 `LESSONS` 里，用节点 id 作键加一条。正文支持空行分段、`- ` 列表、`$公式$`、`$$独立公式$$` 和 `**粗体**`。想调整它在哪一章，改 `CHAPTERS`。
- **加一个 RL 概念**：在 `RL_NODES` 里加一个节点（`f` 写 LaTeX 公式），再在 `RL_LINKS` 里加上它的关系。没写精讲的节点会自动出现在课程"附录"里。
- **加一篇里程碑**：在 `MILESTONES` 里加一条，填 `arxiv`、`lane`、`tier`（1 = 里程碑，2 = 重要，3 = 代表作）、`rl`（用到的 RL 节点 id）和 `from`（前序工作的 id）。改完运行一次 `update_data.py` 获取它的引用数。
- **加一条故事线**：在 `STORIES` 里按 `[里程碑 id, 解说文字]` 的格式写出每一步。

## 许可与致谢

代码采用 MIT 许可。论文数据来自 [awesome-humanoid-robot-learning](https://github.com/YanjieZe/awesome-humanoid-robot-learning)，引用数据来自 [Semantic Scholar](https://www.semanticscholar.org/)；前端使用 [D3](https://d3js.org/)（ISC）与 [KaTeX](https://katex.org/)（MIT）。

## 说明

- 编辑评级（tier）、继承关系和故事线是人工整理的，带有主观判断。引用数存在索引误差，例如 AMP、ASE 等 SIGGRAPH 论文的引用数明显偏低。
- 2026 年的内容主要由数据驱动：awesome 列表本身，加上按引用速度自动选出的热点。
- 在后台或无头浏览器里调试时，可以在地址后加 `?noraf`，用定时器代替 `requestAnimationFrame`，否则动画不会运行。
