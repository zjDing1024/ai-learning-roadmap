# AI Learning Roadmap

## 2026-10-28 当前进展：累积窗口内的恢复合同

本轮承接上一日已完成的梯度累积，研究在一个微批次完成、但有效批次尚未结束时，如何保留未应用梯度与窗口进度。工程实现继续放在 `pytorch-from-zero`，不另建重复项目。[10 月 28 日日报](daily-learning/2026-10-28/README.md)集中记录实际验收与交付；[来源与状态合同笔记](notes/深度学习笔记/2026-10-28-accumulation-recovery.md)说明为什么模型、优化器状态之外还需要待用梯度、实际分母和数据游标。仍处阶段 1，个人能力待独立自测。

## 2026-10-27 当前进展：梯度累积的更新合同

本轮从已闭合的发布工作转回训练循环：研究不等长微批次与尾累积窗口的正确归一化，并以真实有效批次更新作对照。实现、测试、数值结果、精确提交与 CI 统一见[10 月 27 日日报](daily-learning/2026-10-27/README.md)；[来源与推导](notes/深度学习笔记/2026-10-27-gradient-accumulation.md)记录 Accelerate / PyTorch 官方参考及独立实现边界。仍属阶段 1，个人独立自测未被助理成果替代。

## 2026-10-26 当前进展：四批成果公开交付

本次完成已有固定输入、首步定位、saved-forward 和交付验证器的发布收尾。工程内容提交为 [c57de064e929bd388261e0514dd93015d10d8256](https://github.com/zjDing1024/pytorch-from-zero/commit/c57de064e929bd388261e0514dd93015d10d8256)，补记公开证据后的工程提交为 [3366eb96dfd3bf209e9218a39d22b4b4bca93064](https://github.com/zjDing1024/pytorch-from-zero/commit/3366eb96dfd3bf209e9218a39d22b4b4bca93064)。最终工程提交的 [CI 运行](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/40323044322)核验结果：成功。该精确提交的 source 与 installed-cpu-container 两个作业均完成且全部步骤成功；四套测试、source 8 个 CLI 及实际容器 8 个 CLI 的检查范围与内容提交相同，原始日志见该运行记录。。

本次仅按实际证据记录发布、链接绑定与远端验证；10 月 22 日的本地 1,018 项测试及 source / wheel 各 8 个 CLI 不算作今天重跑。冻结历史原件保留；公开副本的隐私处理见当日日报，科学结论不因发布而改变。旧“尚未公开”描述不代表当前状态。完整边界见[10 月 26 日发布日报](daily-learning/2026-10-26/README.md)。个人独立自测仍待完成，阶段保持 PyTorch 基础工程。

## 2026-10-22 历史进展：重新执行四批工程验收

详见[本次日报](daily-learning/2026-10-22/README.md)。本次推进的是已存在四批成果的实际验证与交付，不再新增发布 checker，也不把助理完成的工作记为学习者已掌握。阶段仍是 PyTorch 基础工程；历史条目按其原日期理解。

公开 AI 工程成长记录：以原创实现、可复现实验、源码研究与持续复盘建立作品集。

## 2026-10-18 历史入口：当时的本地恢复与文档整合

四批本地成果已在本恢复包中收拢：10 月 12 日固定 logits、10 月 13 日真实训练首步、10 月 14 日 saved-forward / matched-backward，以及 10 月 15 日交付验收器。本次补齐路线、能力记录、实验索引与日报导航；这是新的文档整合，不是遗失整合候选的原件恢复，也没有产生公开 commit、PR 或精确提交 CI。

当时状态见 [10 月 18 日日报](daily-learning/2026-10-18/README.md)，四批材料的可用入口见[实验索引](experiments/README.md)。原 10 月 17 日恢复包中的《恢复验收报告》（REPORT.zh.md）记录四套测试合计 1,018 项及主项目 source / wheel 各八条 CLI 通过；这些是恢复时的执行证据，不是今天重跑的结果。两个独立探针与验收器仍是脚本包，未成为主项目 wheel 模块。发布门仍未闭合，旧公开提交的绿色 CI 不覆盖这些本地批次。

下文按日期保留历史进度，不把历史“下一步”当作当前未执行事项。历史日报与实验快照保留原文；其中指向 GitHub main 的待发布文件链接不保证在远端可用，阅读本包请使用新的相对路径索引。跨仓库相对链接依赖本包两个仓库并列的目录布局；独立发布前须换成实际存在的目标链接。学习者个人独立自测仍待完成，当前阶段保持阶段 1。

## 目标与当前阶段

面向 AI / ML / Deep Learning / LLM / Agent / Research Engineer 的长期能力建设。当前从**阶段 1：基础工程与 PyTorch**开始，先建立可靠训练与实验方法，再逐步进入模型复现、现代 AI 系统和高级基础设施。

个人起点尚待诊断：没有足够证据判断 Python、数学、Git、Linux 或 PyTorch 的当前熟练度。不会用助理完成的代码替代个人能力证明。

## 记录与证据规范

- **已实现/已运行**：助理完成并留下代码、命令、结果与验证边界。
- **个人已验证**：学习者独立解释、修改或重写，提供可复查证据后再标记。
- **待验证/计划**：未运行、环境受限或尚未开展的内容。

每天实际开展的工作都记录主题、技术理解、问题、代码实验与下一步。没有执行的日期不补写虚构活动，不为了提交次数生成无意义变更。

## 导航

- [2026-10-26 发布闭环日报](daily-learning/2026-10-26/README.md)
- [AI 学习路线](roadmap/AI学习路线.md)
- [技能成长地图](roadmap/技能成长地图.md)
- [当前能力分析](skills/当前能力分析.md)
- [2026-10-18 文档整合日报](daily-learning/2026-10-18/README.md)
- 原 10 月 17 日恢复包中的《恢复验收报告》（REPORT.zh.md）
- [2026-10-15 交付验收日报](daily-learning/2026-10-15/README.md)
- [2026-10-14 saved-forward 日报](daily-learning/2026-10-14/README.md)
- [2026-10-13 真实训练首步日报](daily-learning/2026-10-13/README.md)
- [2026-10-12 固定输入日报](daily-learning/2026-10-12/README.md)
- [2026-10-11 每日报告](daily-learning/2026-10-11/README.md)
- [2026-10-10 每日报告](daily-learning/2026-10-10/README.md)
- [2026-10-09 每日报告](daily-learning/2026-10-09/README.md)
- [2026-10-08 每日报告](daily-learning/2026-10-08/README.md)
- [PyTorch 源码阅读](notes/深度学习笔记/2026-10-08-pytorch-source.md)
- [固定输入来源笔记](notes/深度学习笔记/2026-10-12-fixed-input-diagnostics.md)
- [首步 PyTorch 源码研究](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-first-step-2026-10-13/docs/source-study.md)
- [saved-forward PyTorch 源码研究](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-saved-forward-2026-10-14/docs/source-study.md)
- [交付验收 pytest / packaging 来源研究](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/tools/wine-delivery/docs/source-study.md)
- [实验索引](experiments/README.md)
- [论文阅读规范](papers/README.md)

## 独立项目

| 项目 | 当前内容 | 验证边界 |
|---|---|---|
| [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/README.md) | 既有训练与评估工程，以及四批诊断/交付材料；入口见实验索引 | 当前提交与 CI 见顶部 10 月 26 日记录；历史 strict / 8-ULP 失败不变，个人自测待完成 |

成长仓库保存路线、研究与总结；能独立运行、有完整结构或可持续扩展的项目放入独立仓库。后续候选包括模型实现、论文复现、RAG 和 Agent 系统，达到阶段门槛后再创建。

## 当前工程进度

2026-10-08：完成原始 PyTorch 实验、自动化测试、官方源码研究及同日 Module/DataLoader 小批次增量，保留原手写基线。今天继续加入checkpoint：恢复模型、momentum优化器、配置、历史与局部随机状态；种子42/7/123新进程实验各15项断言通过、恢复参数差0，完整本地319项测试及三条CLI通过。详细数值、文件与命令见当日日报。代码与记录由 AI 助理准备，结论限定在实际检查范围内。

2026-10-08 的记录区分本地与远程执行证据。工程增量 [9a5707696c064523ee95bcaddb49ab1f07dc4467](https://github.com/zjDing1024/pytorch-from-zero/commit/9a5707696c064523ee95bcaddb49ab1f07dc4467) 已发布；精确提交对应的 [CPU checks #37751219715](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37751219715) 已成功完成，319项测试与三条CLI通过。更多提交与完整校验见[当日日报](daily-learning/2026-10-08/README.md)。

当前阶段：epoch边界checkpoint已完成本地验证、独立审查、公开发布及精确提交远程CI。第四增量已完成手写momentum与StepLR实验，本地/独立审查/精确提交远程各679项测试通过，已公开发布；真实commit与CI见后文。该历史阶段之后，2026-10-09已完成UCI Wine真实数据评估，见下节；2026-10-10完成CPU依赖/wheel交付与资源实测；2026-10-11补齐完整数值证据与独立比较合同，最终精确工程提交831项source及7条容器CLI通过。2026-10-12已推进固定logits的最小逐阶段诊断（负结果及实际状态见最新日报）；下一步为个人独立自测和另行预声明的一步训练边界。助理工程产物不等同于学习者已掌握；GPU和分布式仍待后续验证。

## 2026-10-08 第四增量：Momentum / StepLR

手写CPU float64 momentum SGD已与torch按六组配置、六步、两个参数逐步核对；最大参数/buffer误差1.11e-16/2.22e-16。StepLR每轮在optimizer更新之后调用，独立CLI保存/校验scheduler与当前LR；种子42/7/123的新进程40轮对7+33轮恢复参数差均0，各24项断言通过。

公平预算均为200次更新、3840次样本访问。测试MSE（StepLR/固定LR）：42为0.004408268/0.004360109，7为0.003279841/0.003395952，123为0.001914461/0.001906621。没有一致胜者，不用合成数据小差异宣称策略普遍更优。验证负对照包括重置scheduler、遗漏momentum与重置shuffle；整周期切点的scheduler重置可能保留LR相位，这一例外也有测试。

[实现与协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/scheduler-recovery.md)、[手写推导](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/momentum-sgd.md)、[原始42](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-cpu.json)/[7](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-seed7.json)/[123](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-seed123.json)。本增量679项本地测试、全新环境独立审查、Ruff/39文件格式、pip check、compileall和四条CLI已通过；清单核对及公开发布已完成。[工程提交2ac5b1b](https://github.com/zjDing1024/pytorch-from-zero/commit/2ac5b1b7f4aa1fce36557b09ec85ce8e837cbdd8)的[CPU checks #37785797239](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37785797239)成功；补记发布证据后的[最终工程提交c3b8893](https://github.com/zjDing1024/pytorch-from-zero/commit/c3b889348cd3bbf5588d08c67bff2e372e29df99)对应[CPU checks #37786698045](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37786698045)也已成功，远程均通过679项测试与四条CLI。助理完成工程验证不等于学习者已经独立掌握。


## 2026-10-09：公开授权真实数据分类

从已完成的合成训练机制推进到UCI Wine：固定107/36/35分层划分、训练集标准化、线性与小MLP等预算比较、验证选择、最终测试和错误行分析。验证CE选中MLP，但最终测试均值为MLP96.19%、线性97.14%，训练先验/多数类基线40%；保留这个反例，没有按测试改选。每候选三种子、每次840更新/12,840样本访问。数据来源/许可/哈希、完整行ID和所有原始结果保留。

[今日完整报告](daily-learning/2026-10-09/README.md)与[来源笔记](notes/深度学习笔记/2026-10-09-real-data-evaluation.md)保留本地检查、独立审查和公开发布证据。[工程增量a274382](https://github.com/zjDing1024/pytorch-from-zero/commit/a27438230cbb2a9b515a6ca355029e5c6889ec26)的[CPU checks #37808159705](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37808159705)已成功；补写三份发布证据文档后的[最终工程提交bd5ba68](https://github.com/zjDing1024/pytorch-from-zero/commit/bd5ba6883bee133f2fdbd68ebda168edea0ae767)对应[CPU checks #37809158872](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37809158872)也已成功。两次精确提交远程CI均通过709项测试、Ruff/格式和五条CLI。Wine是小而容易的历史任务，不代表真实生产泛化；个人能力仍待独立自测。下一工程方向转向运行时可复现和资源计量，不重复已完成增量。


## 2026-10-10：运行时与资源计量

第六增量新增目标平台10个依赖wheel哈希锁、干净环境已安装wheel六条CLI、新进程计时/CPU/RSS、实际损坏/缺失产物负对照，以及超时进程组清理。固定Wine科学结果在source/wheel各3次新进程中保持与前日一致；不据不同环境的wall/RSS差异声称性能提升。Docker在GitHub CI实际构建/运行，修复后feature与最终工程精确SHA的source/container两路径都通过。本机无容器引擎；两次CI中source/container科学hash的对应关系交换，差异已量化为最大绝对差3.61e-16，具体run与边界见[新日报](daily-learning/2026-10-10/README.md)。个人独立能力仍待自测。


## 2026-10-11：完整数值证据与预声明比较

新增完整Wine输出留存、CPU/dispatch运行信息和严格结构/类型比较器。原科学hash门不变；独立8相邻binary64步诊断门在历史比较中真实失败（最大75 ULP，932项超限），未放宽阈值。A-B-B-A仅干预ATen dispatch，验证当前主机输出会变化，不能解释历史CI原因。详细结果、工程检查与发布证据见[今日日报](daily-learning/2026-10-11/README.md)。[修复后工程025a1d7](https://github.com/zjDing1024/pytorch-from-zero/commit/025a1d7da1b68ccd1965b9bfb355eba643ee7505)的[CPU checks #38132126861](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132126861)已通过；随后仅补记3份Markdown的[最终工程aa56d5e](https://github.com/zjDing1024/pytorch-from-zero/commit/aa56d5e3ae5ffcee428d1f4c996a04497df7bb7e)及其[CPU checks #38132800285](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132800285)也已通过。两次精确SHA的source均通过831项测试、Ruff/格式与7条CLI；container均完成实际镜像构建和非root、只读、断网的7条已安装wheel CLI，两路artifact上传成功。助理产物不等于个人独立掌握。


## 2026-10-12：固定输入诊断与负结果

新增原创固定logits探针：预声明16×3 dyadic fixture、14个softmax/log-softmax/CE/梯度及显式运算记录，零训练更新。本次AMD EPYC 9V74上的A-B-B-A实际AVX512/DEFAULT切换、输入/控制与重复性通过，但465个输出值全部逐位相同；前次Wine干预为另一Intel主机，原计划同主机背景误述及事后更正见日报；没有本fixture的首个不等边界，不因此更换输入搜索差异，也不外推到Wine训练或历史CI。原严格hash与8 ULP失败记录保持。详细原始证据、实际检查和发布状态见[日报](daily-learning/2026-10-12/README.md)。下一步另行预声明固定真实训练输入/初始权重的一步forward/loss/gradient/update，个人独立自测仍待完成。
