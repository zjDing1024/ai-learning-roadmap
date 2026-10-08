# AI Learning Roadmap

公开 AI 工程成长记录：以原创实现、可复现实验、源码研究与持续复盘建立作品集。

## 目标与当前阶段

面向 AI / ML / Deep Learning / LLM / Agent / Research Engineer 的长期能力建设。当前从**阶段 1：基础工程与 PyTorch**开始，先建立可靠训练与实验方法，再逐步进入模型复现、现代 AI 系统和高级基础设施。

个人起点尚待诊断：没有足够证据判断 Python、数学、Git、Linux 或 PyTorch 的当前熟练度。不会用助理完成的代码替代个人能力证明。

## 记录与证据规范

- **已实现/已运行**：助理完成并留下代码、命令、结果与验证边界。
- **个人已验证**：学习者独立解释、修改或重写，提供可复查证据后再标记。
- **待验证/计划**：未运行、环境受限或尚未开展的内容。

每天实际开展的工作都记录主题、技术理解、问题、代码实验与下一步。没有执行的日期不补写虚构活动，不为了提交次数生成无意义变更。

## 导航

- [AI 学习路线](roadmap/AI学习路线.md)
- [技能成长地图](roadmap/技能成长地图.md)
- [当前能力分析](skills/当前能力分析.md)
- [2026-10-08 每日报告](daily-learning/2026-10-08/README.md)
- [PyTorch 源码阅读](notes/深度学习笔记/2026-10-08-pytorch-source.md)
- [实验索引](experiments/README.md)
- [论文阅读规范](papers/README.md)

## 独立项目

| 项目 | 当前内容 | 验证边界 |
|---|---|---|
| [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero) | 张量/梯度、Module/DataLoader、checkpoint、手写momentum与StepLR恢复 | 第四增量已完成独立审查、发布与精确提交远程679项测试/四条CLI；个人自测待完成 |

成长仓库保存路线、研究与总结；能独立运行、有完整结构或可持续扩展的项目放入独立仓库。后续候选包括模型实现、论文复现、RAG 和 Agent 系统，达到阶段门槛后再创建。

## 当前工程进度

2026-10-08：完成原始 PyTorch 实验、自动化测试、官方源码研究及同日 Module/DataLoader 小批次增量，保留原手写基线。今天继续加入checkpoint：恢复模型、momentum优化器、配置、历史与局部随机状态；种子42/7/123新进程实验各15项断言通过、恢复参数差0，完整本地319项测试及三条CLI通过。详细数值、文件与命令见当日日报。代码与记录由 AI 助理准备，结论限定在实际检查范围内。

2026-10-08 的记录区分本地与远程执行证据。工程增量 [9a5707696c064523ee95bcaddb49ab1f07dc4467](https://github.com/zjDing1024/pytorch-from-zero/commit/9a5707696c064523ee95bcaddb49ab1f07dc4467) 已发布；精确提交对应的 [CPU checks #37751219715](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37751219715) 已成功完成，319项测试与三条CLI通过。更多提交与完整校验见[当日日报](daily-learning/2026-10-08/README.md)。

当前阶段：epoch边界checkpoint已完成本地验证、独立审查、公开发布及精确提交远程CI。第四增量已完成手写momentum与StepLR实验，本地/独立审查/精确提交远程各679项测试通过，已公开发布；真实commit与CI见后文。下一阶段：独立自测、公开授权真实数据和误差分析。助理工程产物不等同于学习者已掌握；GPU和分布式仍待后续验证。

## 2026-10-08 第四增量：Momentum / StepLR

手写CPU float64 momentum SGD已与torch按六组配置、六步、两个参数逐步核对；最大参数/buffer误差1.11e-16/2.22e-16。StepLR每轮在optimizer更新之后调用，独立CLI保存/校验scheduler与当前LR；种子42/7/123的新进程40轮对7+33轮恢复参数差均0，各24项断言通过。

公平预算均为200次更新、3840次样本访问。测试MSE（StepLR/固定LR）：42为0.004408268/0.004360109，7为0.003279841/0.003395952，123为0.001914461/0.001906621。没有一致胜者，不用合成数据小差异宣称策略普遍更优。验证负对照包括重置scheduler、遗漏momentum与重置shuffle；整周期切点的scheduler重置可能保留LR相位，这一例外也有测试。

[实现与协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/scheduler-recovery.md)、[手写推导](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/momentum-sgd.md)、[原始42](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-cpu.json)/[7](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-seed7.json)/[123](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-seed123.json)。本增量679项本地测试、全新环境独立审查、Ruff/39文件格式、pip check、compileall和四条CLI已通过；清单核对及公开发布已完成。[工程提交2ac5b1b](https://github.com/zjDing1024/pytorch-from-zero/commit/2ac5b1b7f4aa1fce36557b09ec85ce8e837cbdd8)的[CPU checks #37785797239](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37785797239)成功；补记发布证据后的[最终工程提交c3b8893](https://github.com/zjDing1024/pytorch-from-zero/commit/c3b889348cd3bbf5588d08c67bff2e372e29df99)对应[CPU checks #37786698045](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37786698045)也已成功，远程均通过679项测试与四条CLI。助理完成工程验证不等于学习者已经独立掌握。
