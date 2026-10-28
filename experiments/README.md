# 实验索引

## 2026-10-29：独立打乱批索引流恢复

研究当前排列、已发出游标和局部 CPU 生成器状态的不同职责；连续索引流与从快照恢复的索引流应在本轮剩余部分及后续 epoch 一致。按 `drop_last` 分别检查整轮覆盖或指定完整批前缀，不将有意省略的尾批记成恢复漏样。显式推进 epoch，耗尽检查不应偷跑随机状态。实际执行结果、错误对照与精确提交见[当日日报](../daily-learning/2026-10-29/README.md)，TorchData 来源分析见[学习笔记](../notes/深度学习笔记/2026-10-29-shuffled-index-recovery.md)。验收对象仅为已发出的索引序列，不是模型、优化器与数据流的联合恢复。

## 2026-10-28：累积窗口内断点恢复

在 10 月 27 日正确加权的训练循环之上，增加完成微批次后的恢复状态合同，比较连续运行与从快照重启的训练轨迹。本项不是重复验证尾窗口归一化，也不替代既有 epoch 边界 checkpoint。实验条件、实际结果、失败边界和精确提交集中见[当日日报](../daily-learning/2026-10-28/README.md)；推导及官方来源见[状态合同笔记](../notes/深度学习笔记/2026-10-28-accumulation-recovery.md)。

## 2026-10-27：不等长微批次梯度累积

新增训练循环问题：按窗口实际目标元素总数归一化，在尾窗口只更新一次，并与拼接后的有效批次对照参数和 momentum 状态。实际结果与精确提交见[当日日报](../daily-learning/2026-10-27/README.md)，数学与来源见[研究笔记](../notes/深度学习笔记/2026-10-27-gradient-accumulation.md)。这是独立训练机制增量，不修改旧 Wine 测试集、科学结果或历史数值阈值。

## 2026-10-26 状态补记

四批工程内容已发布为 [c57de064](https://github.com/zjDing1024/pytorch-from-zero/commit/c57de064e929bd388261e0514dd93015d10d8256)。精确提交 CI、后续文档提交及公开副本的隐私处理范围统一见[10 月 26 日发布日报](../daily-learning/2026-10-26/README.md)。

下文 10 月 18–22 日段落中的“当前”“尚未公开”“发布门未闭合”均描述当时状态；发布状态以本节及上述日报为准。历史科学失败、未归因边界和个人独立自测状态不因公开发布而改变。

本索引的四批工程入口已绑定上述真实提交，不再依赖两个仓库并排解压的本地目录。

## 当前本地材料导航（2026-10-18）

以下四批均来自本地恢复包，尚未公开发布。链接按本包中两个仓库并列的目录布局解析；它们不是新增公开 GitHub 文件或 commit 的证明。原日报和实验 README 保留交付当日状态，其中裸路径以原独立交付目录为基准；本索引提供当前可用入口。原有 GitHub main 链接不保证覆盖尚未发布的文件。

| 批次 | 工程入口 | 原始日报 | 证据与研究 |
|---|---|---|---|
| 2026-10-12 固定 logits | [协议/运行边界](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/docs/fixed-input-diagnostics.md) | [日报](../daily-learning/2026-10-12/README.md) | [计划及主机误述更正](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/docs/fixed-input-plan-erratum.json)、[最终原始记录](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/results/2026-10-12-fixed-input-reviewed.json)、[原验证](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/results/2026-10-12-fixed-input-verification.md)、[来源笔记](../notes/深度学习笔记/2026-10-12-fixed-input-diagnostics.md) |
| 2026-10-13 真实 TRAIN 首步 | [独立探针 README](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-first-step-2026-10-13/README.md) | [日报](../daily-learning/2026-10-13/README.md) | [观察边界](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-first-step-2026-10-13/docs/observations.md)、[原验证](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-first-step-2026-10-13/VALIDATION.md)、[源码研究](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-first-step-2026-10-13/docs/source-study.md) |
| 2026-10-14 saved-forward / matched-backward | [独立探针 README](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-saved-forward-2026-10-14/README.md) | [日报](../daily-learning/2026-10-14/README.md) | [观察边界](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-saved-forward-2026-10-14/docs/observations.md)、[原验证](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-saved-forward-2026-10-14/results/verification.json)、[源码研究](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-saved-forward-2026-10-14/docs/source-study.md) |
| 2026-10-15 真实 ZIP 交付验收 | [验收器 README](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/tools/wine-delivery/README.md) | [日报](../daily-learning/2026-10-15/README.md) | [交付报告](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/tools/wine-delivery/evidence/delivery-report.json)、[证据说明](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/tools/wine-delivery/evidence/README.md)、[来源研究](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/tools/wine-delivery/docs/source-study.md) |

原 10 月 17 日恢复包中的《恢复验收报告》（REPORT.zh.md）与[10 月 18 日文档整合日报](../daily-learning/2026-10-18/README.md)说明当前本地状态。四批材料不是四个新模型，也不构成学习者已独立掌握的证据。下文原日期条目保留其历史语境。

## 2026-10-08：Tensor、Autograd 与仿射回归

- 项目：[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)
- 主题：布局/共享、广播反向、梯度累加、解析/自动/数值求导与训练基线
- 原始记录：项目的 `results/2026-10-08-cpu.json`
- 验证：CPU float64；固定配置和数据划分；自动化测试与静态检查
- 边界：单种子合成数据，无 GPU/吞吐基准；由助理运行，个人自测待完成

每次新增实验先记录假设、比较对象、配置和成功/失败条件；结果保存原始数据，失败也保留并解释。未实际运行的内容不写成实验结论。


## 2026-10-08：Module / Dataset / DataLoader 小批次增量

- 实现：注册W/b的nn.Module、自定义map-style Dataset、局部Generator、torch SGD、train/eval/no_grad
- 验证：40轮、batch20、尾批16、三种子42/7/123；样本数加权和独立评估损失；全批次Module与手写同设置参数差均为0
- 原始记录：项目的 `results/2026-10-08-minibatch-cpu.json`、`results/2026-10-08-minibatch-seed7.json`、`results/2026-10-08-minibatch-seed123.json`
- [完整比较协议与复现命令](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/minibatch-training.md)
- 质量：新增100项、合计152项本地测试通过；原始全批次源码、CLI和证据保留
- 边界：按相同数据遍历次数比较，更新次数不同；无吞吐结论；CPU合成数据；学习者自测仍待完成

## 2026-10-08：Epoch 边界 checkpoint 恢复（已发布并通过远程CI）

- 范围：固定96/32/32合成数据、CPU float64、3→1模型、torch SGD momentum0.8、num_workers=0；epoch0或完整epoch边界
- 保存内容：模型、完整优化器、配置、数据指纹、完成轮数/历史、训练和指标Generator、精确PyTorch版本、内容checksum
- 已执行比较：种子42/7/123分别在新进程连续40轮，对照7轮保存后新进程恢复到40轮；模型/优化器/RNG/历史/结果均一致，每种子15项断言通过
- 已执行反例：三个种子的丢失momentum与重置shuffle均造成下一轮轨迹差异；严格加载的坏格式/版本/张量/历史测试纳入聚合检查
- [恢复协议与运行入口](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/checkpoint-recovery.md)：实现已发布，三种子实验及本地/远程319项测试通过
- 已执行：种子42的15项断言通过，连续/恢复参数差0；测试MSE0.0043601093；下一轮遗漏momentum/重置shuffle参数差0.0144504611/0.0036747311，见工程 `results/2026-10-08-checkpoint-cpu.json`
- 其他原始记录：工程 `results/2026-10-08-checkpoint-seed7.json`、`results/2026-10-08-checkpoint-seed123.json`
- 本地质量：319项测试（152原有+151checkpoint契约+16CLI）、Ruff/29文件格式、pip check、compileall及三条CLI通过
- 发布证据：工程增量 [9a5707696c064523ee95bcaddb49ab1f07dc4467](https://github.com/zjDing1024/pytorch-from-zero/commit/9a5707696c064523ee95bcaddb49ab1f07dc4467) 已发布；精确提交对应的 [CPU checks #37751219715](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37751219715) 已成功完成，319项测试与三条CLI通过。前两阶段原始结果不覆盖
- 边界：只加载可信文件；受限加载与文件上限不是安全沙箱，checksum不认证来源；Linux本地原子可见性不保证断电持久性；无mid-batch、GPU、AMP、DDP、scheduler；学习者自测待完成

## 2026-10-08 第四增量：Momentum / StepLR

手写CPU float64 momentum SGD已与torch按六组配置、六步、两个参数逐步核对；最大参数/buffer误差1.11e-16/2.22e-16。StepLR每轮在optimizer更新之后调用，独立CLI保存/校验scheduler与当前LR；种子42/7/123的新进程40轮对7+33轮恢复参数差均0，各24项断言通过。

公平预算均为200次更新、3840次样本访问。测试MSE（StepLR/固定LR）：42为0.004408268/0.004360109，7为0.003279841/0.003395952，123为0.001914461/0.001906621。没有一致胜者，不用合成数据小差异宣称策略普遍更优。验证负对照包括重置scheduler、遗漏momentum与重置shuffle；整周期切点的scheduler重置可能保留LR相位，这一例外也有测试。

[实现与协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/scheduler-recovery.md)、[手写推导](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/momentum-sgd.md)、[原始42](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-cpu.json)/[7](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-seed7.json)/[123](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-08-scheduler-seed123.json)。本增量679项本地测试、全新环境独立审查、Ruff/39文件格式、pip check、compileall和四条CLI已通过；清单核对及公开发布已完成。[工程提交2ac5b1b](https://github.com/zjDing1024/pytorch-from-zero/commit/2ac5b1b7f4aa1fce36557b09ec85ce8e837cbdd8)的[CPU checks #37785797239](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37785797239)成功；补记发布证据后的[最终工程提交c3b8893](https://github.com/zjDing1024/pytorch-from-zero/commit/c3b889348cd3bbf5588d08c67bff2e372e29df99)对应[CPU checks #37786698045](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37786698045)也已成功，远程均通过679项测试与四条CLI。助理完成工程验证不等于学习者已经独立掌握。


## 2026-10-09：UCI Wine固定划分与验证选择

公开许可、精确数据哈希、107/36/35分层划分、仅训练集标准化，三种子比较42参数线性与275参数MLP。每次840更新/12,840样本访问。验证CE选MLP（0.014833 vs0.017577），最终测试准确率均值MLP96.19%、线性97.14%、训练先验/多数类40%。不据测试倒改选择。错误集中在行68，MLP123还错行134；35条测试样本限制了结论。

[完整日报](../daily-learning/2026-10-09/README.md)、[工程协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/wine-evaluation.md)、[原始JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-09-wine-cpu.json)。[工程增量a274382](https://github.com/zjDing1024/pytorch-from-zero/commit/a27438230cbb2a9b515a6ca355029e5c6889ec26)的[CPU checks #37808159705](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37808159705)已成功；补写三份发布证据文档后的[最终工程提交bd5ba68](https://github.com/zjDing1024/pytorch-from-zero/commit/bd5ba6883bee133f2fdbd68ebda168edea0ae767)对应[CPU checks #37809158872](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37809158872)也已成功。两次精确提交远程CI均通过709项测试、Ruff/格式和五条CLI。完整检查与独立审查在日报和工程验证记录中分别说明；三种子仅为固定划分下训练随机性。


## 2026-10-10：CPU运行时与资源边界

对前日Wine固定工作量执行source/wheel各3次新进程测量，每样本6次拟合/5,040更新/77,040样本访问；科学结果hash均与前日一致。wall、process CPU与Linux高水位RSS分别计量，环境/宿主负载不同，不从差异宣称性能增益。完整运行依赖的10个wheel哈希锁、本地wheelhouse安装及损坏/缺失产物负对照、超时进程组清理形成可运行证据。Docker已在两个精确工程提交CI真实构建与运行，本机未执行。feature运行#37959687015为source=b7ab…/container=28ce…，最终运行#37961087696为source=28ce…/container=b7ab…；各job内部重复通过。两份完整输出的最大绝对差为3.61e-16，预测与模型选择相同；因果解释仍未建立，不声称跨运行逐位一致。

[日报](../daily-learning/2026-10-10/README.md)、[协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/runtime-reproducibility.md)、[source原始JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-10-runtime-source-cpu.json)、[wheel原始JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-10-runtime-wheel-cpu.json)。

[修复后工程e162eaf](https://github.com/zjDing1024/pytorch-from-zero/commit/e162eafd654e44bfea3473c391491fa071b443d0)的[CPU checks #37959687015](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37959687015)，以及4份Markdown补记后的[最终工程17aed9e](https://github.com/zjDing1024/pytorch-from-zero/commit/17aed9e5ea934807477652cabbc35a4de8c86a7e)的[CPU checks #37961087696](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37961087696)均已成功。两次精确SHA的source job通过784项测试、Ruff/格式和6条CLI，container job真实完成Docker构建及非root/只读/断网的6条已安装wheel CLI。


## 2026-10-11：完整数值回归与ATen dispatch

保持原Wine协议，先冻结比较计划，再恢复历史完整输出与执行A-B-B-A。分别记录严格hash、exact字段与8相邻binary64步诊断；历史最大75 ULP/932项超限仍失败，本机dispatch干预只作局部因果对照。所有原始输出、失败快照、命令和验证边界见[日报](../daily-learning/2026-10-11/README.md)及[工程协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/numerical-regression.md)。[修复后工程025a1d7](https://github.com/zjDing1024/pytorch-from-zero/commit/025a1d7da1b68ccd1965b9bfb355eba643ee7505)的[CPU checks #38132126861](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132126861)已通过；随后仅补记3份Markdown的[最终工程aa56d5e](https://github.com/zjDing1024/pytorch-from-zero/commit/aa56d5e3ae5ffcee428d1f4c996a04497df7bb7e)及其[CPU checks #38132800285](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132800285)也已通过。两次精确SHA的source均通过831项测试、Ruff/格式与7条CLI；container均完成实际镜像构建和非root、只读、断网的7条已安装wheel CLI，两路artifact上传成功。


## 2026-10-12：固定输入诊断与负结果

新增原创固定logits探针：预声明16×3 dyadic fixture、14个softmax/log-softmax/CE/梯度及显式运算记录，零训练更新。本次AMD EPYC 9V74上的A-B-B-A实际AVX512/DEFAULT切换、输入/控制与重复性通过，但465个输出值全部逐位相同；前次Wine干预为另一Intel主机，原计划同主机背景误述及事后更正见日报；没有本fixture的首个不等边界，不因此更换输入搜索差异，也不外推到Wine训练或历史CI。原严格hash与8 ULP失败记录保持。详细原始证据、实际检查和发布状态见[日报](../daily-learning/2026-10-12/README.md)。下一步另行预声明固定真实训练输入/初始权重的一步forward/loss/gradient/update，个人独立自测仍待完成。


## 2026-10-13：冻结真实训练首步

使用固定 TRAIN minibatch、初始权重和预声明的一次 forward / loss / gradient / update。已记录前向与 loss 相同，首个已记录差异在 logits 梯度；整体 strict 与原 8-ULP 比较仍失败。这个边界不证明未记录的前向中间值相同，也不直接定位 native kernel 缺陷。完整记录见[原始 A-B-B-A](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-first-step-2026-10-13/results/abba-initial.json)与[审查后记录](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-first-step-2026-10-13/results/abba-reviewed.json)，原实验配置与失败保持不变。

## 2026-10-14：saved-forward 与匹配上游梯度

沿用冻结 fixture，以公开 saved_tensors_hooks 观察 CE 保存值，并用匹配输入与上游梯度的公开 log-softmax backward VJP 对照。已捕获保存值相同，匹配 VJP 复现原 CE 的局部梯度差异；观察者前/中/后的记录严格相同。VJP 自身在 8 ULP 内，不会抵消原首步整体比较的失败。这只缩小本 fixture 的公开操作边界，不解释历史跨主机 CI，不证明具体微内核或数学错误。见[完整原始记录](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-saved-forward-2026-10-14/results/abba-initial.json)与[观察说明](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/experiments/wine-saved-forward-2026-10-14/docs/observations.md)。

## 2026-10-15：从真实交付 ZIP 验收

固定两份原始 ZIP 的身份，校验完整清单和路径边界，在新目录运行原命令并检查无关工作目录入口。原交付验证通过，但复跑科学 hash 与历史交付不同；两次记录的宿主不同，未隔离原因。交付通过、捕获控制通过和科学相等分开报告，原始 ZIP、阈值与失败记录不变。此工具是标准库脚本包，不是安装分发包；静态模式不执行探针，执行模式也不是安全沙箱。见[验收器使用说明](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/tools/wine-delivery/README.md)和[完整交付报告](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/tools/wine-delivery/evidence/delivery-report.json)。

## 2026-10-17 恢复与 2026-10-18 文档整合

原 10 月 17 日恢复包中的《恢复验收报告》（REPORT.zh.md）记录主工程 880、首步 59、saved-forward 45、验收器 34 项测试分别通过，合计 1,018 项；重复执行不再次累计。主项目 source 与新非 editable wheel 各八条 CLI 通过，三个独立脚本包不在该 wheel 覆盖范围内。本次文档工作只补齐入口和状态，未开展新的科学干预，也未将这组既有结果冒充今天的重跑。

公开发布、最终实际文件清单复核和新精确提交 CI 仍须按发布门处理；没有新增 Docker、全新依赖安装、跨平台复现或个人独立能力的证明。后续先闭合交付/发布与[个人自测](https://github.com/zjDing1024/pytorch-from-zero/blob/c57de064e929bd388261e0514dd93015d10d8256/docs/learner-self-check.md)，不为更好数值结果重选 fixture、seed、阈值或测试集。
