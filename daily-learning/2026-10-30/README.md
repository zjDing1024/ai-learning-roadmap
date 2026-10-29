# AI Engineer Daily Report：2026-10-30

时区：Asia/Kuala_Lumpur。主题：打乱索引流与累积训练器的联合安全点恢复。

## 本轮问题与阶段

10 月 28 日处理固定顺序下的累积窗口恢复，10 月 29 日处理独立打乱批索引流。本轮连接两者，回答一个具体问题：索引已经发出、这一批还没有完成训练时，下一次恢复应从哪里继续？只对齐数据游标，或者只对齐模型参数，都不足以回答。

工程继续归入 [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)，不另建重复项目。本仓库保存原创来源研究、状态推导与独立自测目标。当前仍属阶段 1：基础工程与 PyTorch；助理准备的实现和验证不代表学习者本人已掌握。

## 联合状态与失败边界

本轮限定单进程、CPU float64、固定仿射模型、确定性数据与带 momentum 的 SGD。`JointTrainer` 独占模型、优化器和 `ShuffledBatchStream`；本轮固定 `drop_last=False`，保留不足一批的尾部。联合快照需要使当前排列、索引游标、局部 RNG、模型、优化器、待用原始梯度和实际归一化分母描述同一个训练安全点。原始梯度是窗口内损失求和后的梯度，尚未除以窗口实际目标元素数；它不能用已更新参数或 momentum 缓冲替代。

`step_microbatch()` 的边界如下：

1. **fetch 前**：通过参数检查后先将对象标为不安全，再从索引流取得一批。索引流的发出游标已经前进，不表示训练器已经提交。
2. **backward 后**：完成求和损失的反向传播，`.grad` 已累积。若本批结束累积窗口或 epoch 尾部，则按实际目标元素数归一化，调用 SGD 并清空窗口；否则保存原始待用梯度。
3. **progress-commit 前后**：尾批完成更新后还会准备下一 epoch 的排列。只有所有这些操作成功，才统一推进训练器的 epoch、游标、更新次数和窗口计数，最后恢复安全标记并返回已提交的索引。

显式故障点为 `after_fetch`、`after_backward`、`after_update`、`before_commit`；`after_update` 仅接受确实触发更新的一批。操作开始后如果中途失败，部分状态可能已经变化，不尝试内存回滚。该对象拒绝快照、保存和继续训练，调用方必须丢弃它，重新加载先前成功保存的**完整联合快照**。初始化及一次完整微批次操作成功返回后的状态才是公开保存边界；任意异步中断与最终提交／返回之间的确认协议不在本项支持范围内。

“进度提交”指训练器认可这一批已经完成规定操作，不表示它已经写入磁盘。恢复只讨论从成功保存、结构合法且可信的联合快照继续运行；没有任意指令位置的 exactly-once 保证，不处理外部日志、数据库或消息等副作用事务，也不承诺断电后的持久性。仅索引流恢复成功，不能充当联合训练恢复证据。

## 实际执行与验证结果

| 验证层次 | 本次结果 |
|---|---|
| 本地源码测试、静态检查与依赖检查 | 主套件 1,183 项（307.40 秒）及 59 + 45 + 34 项独立套件，共 1,321 项通过，新增 121 项；Ruff lint、116 个文件的格式检查（含 Markdown 代码块）、pip check 与 compileall 通过 |
| 连续训练与新进程联合恢复实验 | 三个 seed、四个故障点，共 12 个恢复案例，使用 9 个 worker 进程；147 个恢复后安全点状态精确一致，已提交索引后缀一致，最终参数最大差为 0 |
| 发出后未完成训练的故障注入与错误状态反例 | fetch、backward、update 与 commit 前的受控异常均使当前对象拒绝快照、保存及继续训练；从旧完整联合快照重新加载后恢复。游标超前的拆分状态被拒绝；重新计算摘要后混入旧模型的载荷可能通过结构检查，但数值轨迹偏离，说明摘要不是训练历史认证 |
| 独立审查的范围与结果 | 独立审查的 30 项测试子集已计入上述主套件，不额外累加。21 组配置、198 个安全点与手写仿射梯度和 momentum 方程在 atol=rtol=1e-12 内一致；另验证精确恢复及六个实际修改状态后抛异常的案例 |
| 干净非 editable wheel 与 CLI | 独立离线、非 editable wheel 的 12 个 CLI 全通过；33 个包文件与最终源码和安装后字节一致，10 个运行时 wheel 哈希复核通过 |
| 本地容器执行 | 本地未执行；实际 Docker 结果见本次远端 CI |

测试项、恢复切点、配置组合与样本数分别记录，不相加为“测试总数”。源码执行、已安装 wheel、远端源码作业与实际容器执行也分别列明。比较应覆盖已完成训练的索引顺序、更新边界、参数、momentum 与未完成窗口状态，而不只看最终 loss 接近。

## 工程文件与复现入口

以下入口绑定本轮工程提交。

- [联合训练器与快照实现](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/src/pytorch_lab/joint_recovery.py)。
- [新进程故障与恢复实验 CLI](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/src/pytorch_lab/joint_recovery_cli.py)。
- [工程协议与运行边界](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/docs/joint-training-recovery.md)。
- [约定与边界测试](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/tests/test_joint_recovery.py)。
- [CLI 验证测试](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/tests/test_joint_recovery_cli.py)。
- [独立数值与故障审查测试](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/tests/test_joint_recovery_independent.py)。
- [原始实验 JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/results/2026-10-30-joint-recovery.json)。
- [执行验证记录](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/results/2026-10-30-joint-recovery-verification.md)。
- [独立审查结果](https://github.com/zjDing1024/pytorch-from-zero/blob/4b14ff94261026422edf69444aa6c23fdcc2c37d/results/2026-10-30-joint-recovery-independent-review.json)。

按工程说明安装后，使用尚不存在的输出文件：

```bash
python -m pytorch_lab.joint_recovery_cli --output results/local-joint-recovery.json
```

CLI 协议分别启动基线、故障和恢复进程，每个 seed 的故障／恢复进程处理四个切点。注入的是 Python 异常，故障进程检查拒绝行为后按协议退出；不是杀进程或断电实验。实际案例数、进程数和比较结果以执行记录为准。

复现需要相同的受支持配置、数据身份与运行时条件，并使用新的输出路径。帮助命令通过不等于实际完成恢复实验；单个受控 CPU 模型的轨迹一致不外推为任意训练任务或跨平台保证。

## 官方来源研究

本轮研究 [Hugging Face Accelerate](https://github.com/huggingface/accelerate) 如何组织模型、优化器、数据加载器和随机状态的保存，继续参考 [TorchData](https://github.com/meta-pytorch/data) 的状态归属，并结合 PyTorch 的梯度与优化器接口。Accelerate 的固定版本 [checkpointing.py](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/src/accelerate/checkpointing.py)提供状态覆盖清单的参考；本项目不据其分组件保存流程推定原子训练提交。

TorchData 0.11 [StatefulDataLoader 官方说明](https://meta-pytorch.org/data/0.11/torchdata.stateful_dataloader.html)把加载器进度、sampler / dataset 状态组织起来；[官方教程](https://meta-pytorch.org/data/0.11/stateful_dataloader_tutorial.html)也分别讨论采样器和数据变换的状态。本项目借此追问训练器还需共同保存哪些状态，没有引入 Accelerate 或 TorchData 运行时依赖，也没有复刻其 worker 或预取实现。

[PyTorch backward 文档](https://docs.pytorch.org/docs/2.14/generated/torch.Tensor.backward.html)说明梯度会累积在叶张量上；[SGD 文档](https://docs.pytorch.org/docs/2.14/generated/torch.optim.SGD.html)说明 momentum 更新。把两者与数据进度放在一起，是本轮独立设计的状态约定，不是上游框架为本项目提供的事务保证。项目结构、源码观察、许可与推导见[原创学习笔记](../../notes/深度学习笔记/2026-10-30-joint-training-recovery.md)。

## GitHub 交付

- 工程精确提交：[本轮提交](https://github.com/zjDing1024/pytorch-from-zero/commit/4b14ff94261026422edf69444aa6c23fdcc2c37d)。
- 该精确提交的 CI 运行：[本次运行](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/40911238763)。
- CI 结论、实际 source / container 覆盖及 artifact 核验：成功。source 作业通过 1,183 + 59 + 45 + 34 = 1,321 项测试、12 个 CLI、Ruff lint 与 116 个文件格式检查；实际 Docker 的 12 个 installed CLI 通过，容器没有执行完整测试套件。远端联合恢复报告为 12 案例／9 worker 进程／147 个精确安全点比较，最终参数差 0。两个 artifact ZIP 完整性及 SHA-256 与 GitHub 元数据一致；source baseline CLI 结果在日志中，既有上传 glob 未收录其单独 JSON。source 作业 8 分 56 秒，Docker 作业 4 分 24 秒，均在配置预算内。
- 本日报所属成长仓库提交以实际 Git 历史为准，不预填自身未来 SHA。

本次已按工程提交核对日志和产物。既有 Wine 数值负结果、历史错误记录和原协议仍按原验证范围解释。

## 对训练工程的价值

本项用于展示如何把数据顺序、梯度累积和优化器更新组织成可检查的恢复状态机：先定义失败含义，再设计可证伪的恢复比较。可用于解释模型为何在恢复后出现偏移、为何“样本集合相同”仍可能对应不同更新轨迹，以及为何完整性摘要不等于真实历史或可信来源。没有据此宣称训练精度提高、吞吐提升或具备生产级故障容错。

本人待自测：手画一批从发出到提交的状态变化；分别在 fetch 后、backward 后和更新后指出哪些状态可能已经改变；构造游标超前、遗漏待用梯度和重置 RNG 的反例；解释从旧快照重算与“每条数据只执行一次”的区别。完成独立解释、改写和失败修复记录前，能力仍为待验证。

## 不足与下一步

本轮不覆盖任意 DataLoader、worker、预取队列、随机数据变换、随机前向、并发消费者、GPU / AMP / DDP 或跨版本快照交换。文件校验只在既定可信输入边界内帮助发现错误，不承担恶意文件安全或存储系统的持久性保证。

明日工程计划：单独定义随机前向的 RNG 状态边界，先用 CPU Dropout 对照检验恢复随机状态的必要性，再评估如何扩展联合快照。暂不扩展 worker 或预取；这一计划尚未实现，本人独立自测仍需单独完成。
