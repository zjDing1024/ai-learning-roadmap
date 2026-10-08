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
| [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero) | 张量/梯度、Module/DataLoader、小批次SGD、epoch边界checkpoint与momentum恢复 | 本地319项测试及恢复三种子实验通过；该增量发布/远程CI待核对；个人自测待完成 |

成长仓库保存路线、研究与总结；能独立运行、有完整结构或可持续扩展的项目放入独立仓库。后续候选包括模型实现、论文复现、RAG 和 Agent 系统，达到阶段门槛后再创建。

## 当前工程进度

2026-10-08：完成原始 PyTorch 实验、自动化测试、官方源码研究及同日 Module/DataLoader 小批次增量，保留原手写基线。今天继续加入checkpoint：恢复模型、momentum优化器、配置、历史与局部随机状态；种子42/7/123新进程实验各15项断言通过、恢复参数差0，完整本地319项测试及三条CLI通过。详细数值、文件与命令见当日日报。代码与记录由 AI 助理准备，结论限定在实际检查范围内。

2026-10-08 的记录描述本地已执行工作。远程变化以 [提交记录](https://github.com/zjDing1024/ai-learning-roadmap/commits/main/) 和项目 [Actions](https://github.com/zjDing1024/pytorch-from-zero/actions) 为准；本地测试不替代远程 CI 证据。

当前阶段：epoch边界checkpoint已完成本地验证，最终文档/清单验收与发布和远程CI待核对。下一阶段：独立自测、手写momentum SGD等价对照与scheduler顺序/状态实验。助理工程产物不等同于学习者已掌握；GPU和分布式仍待后续验证。
