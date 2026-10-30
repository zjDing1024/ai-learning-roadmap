# AI Engineer Daily Report：2026-10-31

时区：Asia/Kuala_Lumpur。主题：CPU Dropout 随机前向的 RNG 状态边界。

## 阶段与实际问题

任务书、最新路线、实验索引与 10 月 30 日记录已核对。本轮承接昨日提出的随机前向缺口，继续阶段 1。工程归入 [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)，学习记录归入本仓库，不新建重复项目。

本项使用固定参数的 CPU float64 网络：Linear 4→8、Dropout、Linear 8→2。每步进行前向与求和平方误差 backward，记录输出、损失、输入梯度与参数梯度，但没有优化器更新。因此这是随机前向／反向重放，不是完整随机训练恢复，也没有扩展昨日的 JointTrainer。

## 研究项目与技术价值

研究 [PyTorch](https://github.com/pytorch/pytorch) v2.14.1 的 Dropout、默认 CPU RNG、fork_rng、Linear 初始化和模块状态接口，源码固定到 [5c488690](https://github.com/pytorch/pytorch/commit/5c4886908584029761b579af026dcfb627c84070)，许可为 [BSD 风格三条款](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)。同时研究 [Accelerate](https://github.com/huggingface/accelerate) 固定版本 [checkpointing.py](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/src/accelerate/checkpointing.py) 的状态恢复次序与错误处理，采用 [Apache 2.0](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/LICENSE)。没有复制上游代码或引入新框架依赖。

价值是解释“相同权重、相同 seed，为什么仍未接上原轨迹”，而非展示随机输出。项目结构、具体源码观察、推导与接入条件见[原创学习笔记](../../notes/深度学习笔记/2026-10-31-dropout-rng-boundary.md)。

## 实际代码、实验与结果

新增随机前向／反向重放模块、独立进程 CLI、边界测试与独立审查测试，以及工程说明和原始实验记录。实现持有自己的 CPU RNG 字节状态，通过短暂切换默认 CPU RNG 执行 Dropout，再恢复调用者状态；快照还固定权重、模式、概率、配置与步数。

| 验证层次 | 实际结果 |
|---|---|
| 源码测试与静态检查 | 最终主套件 1,265 项通过（554.91 秒），独立交付套件 59 + 45 + 34 项通过，合计 1,403 项，较基线新增 82 项；Ruff lint、123 个文件格式检查（含 Markdown 代码块）、compileall、pip check 通过 |
| 新进程实验 | seed 7、42、123，各在完成第 1、3、5 步后保存并恢复到第 8 步；6 个 worker 进程、9 个案例、45 个恢复后步骤的完整记录及最终快照精确一致 |
| 错误恢复对照 | 三个 seed 中，“只重设 seed”与“恢复 RNG 后额外构造一个 Linear 消耗随机数”均造成实际输出差异；前者单次 loss 绝对差范围为 0.107408–0.864593，后者为 0.732731–1.237141，不将其解释为性能指标 |
| 模式与调用者隔离 | 默认 p=0.35、相同初始随机状态下，train 与 train + no_grad 输出相同且都推进 RNG，后者不记录梯度；eval 不推进本次 Dropout RNG，仍可记录梯度；调用间外部随机采样未改变探针重放，调用者 CPU RNG 得以保留 |
| 独立方程审查 | 39 项审查测试属于主套件子集，不另加总；18 组配置、72 步手写前向／链式梯度方程比较通过（atol=rtol=1e-12，本次最大绝对差 0），逐步快照重放精确一致；另有 4 个真实消耗随机数或写梯度后抛异常的案例通过。掩码仍来自同一 PyTorch Dropout 算子，独立的是方程而非 RNG 算法 |
| 干净非 editable wheel | 13 个 installed CLI 全部通过；35 个包文件与最终源码及安装后字节一致，10 个运行时 wheel 哈希复核通过，pip check 通过；未在 wheel 环境重跑完整 pytest |
| 本地 Docker | 未执行；实际远端 Docker 与源码作业分别见下方精确提交 CI |

首次 focused 检查因复用环境仍指向旧源码，子进程找不到新模块而出现 42 项通过、1 项失败；正确安装本轮源码后 43 项通过。随后一轮主套件收集到 1,257 项并全部通过，最后 8 项独立审查测试在该轮收集后加入，因此未将分离执行数拼成完整通过。首次包含最终全部 1,265 项的主套件实际为 1,264 项通过、1 项失败，用时 617.05 秒。失败是既有联合恢复 CLI 集成测试的外层 60 秒超时，该 CLI 聚合 9 个 worker；该生产实现与前次基线相同，单项复查在 59.28 秒通过。具体主机负载或启动耗时成因未建立。经独立审查，仅将这个集成测试的外层超时调整为 120 秒，单 worker 的 60 秒限制、CI 的 15／20 分钟预算及数值断言保持不变。最终完整重跑结果见上表，不把首次失败隐藏或归因于 Dropout 算法。

计数中的测试项、恢复案例、worker 进程和后缀步骤不是同一个量，不相加。所有步骤的优化器更新数为 0。错误初始化对照只是插入一个 Linear 构造，并非完整模型重建流程的端到端实验。

本次固定无可变 buffer 的网络允许在失败后重试：仅成功调用推进对象的私有 RNG 和步数，失败 backward 可能残留的梯度由下一次调用先清空，调用者 RNG 由上下文恢复。上述重试结论限于被测前向、反向与结果提取阶段的受控异常，最终私有 RNG／步数提交和返回之间的任意异步中断不保证原子性。指定阶段注入 KeyboardInterrupt 不等于杀进程实验。它不是任意 Module 的内存事务回滚；外部修改模型、hook 或并发随机消费者不在支持范围内。JSON 格式校验与 SHA-256 用于误配／损坏检测，不证明训练历史或可信来源。

源码、测试、协议及原始数据入口：

- [随机前向重放实现](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/src/pytorch_lab/dropout_rng.py)。
- [新进程实验 CLI](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/src/pytorch_lab/dropout_rng_cli.py)。
- [协议与失败边界](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/docs/dropout-rng-boundary.md)。
- [核心测试](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/tests/test_dropout_rng.py)。
- [CLI 测试](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/tests/test_dropout_rng_cli.py)。
- [独立审查测试](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/tests/test_dropout_rng_independent.py)。
- [原始实验 JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/results/2026-10-31-dropout-rng.json)。
- [本地验收记录](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/results/2026-10-31-dropout-rng-verification.md)。
- [独立方程与失败审查](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/results/2026-10-31-dropout-rng-independent-review.json)。
- [干净 wheel 验收摘要](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/results/2026-10-31-installed-wheel-summary.json)。

本地源码实际执行了新增 Dropout CLI，全部 13 个本地 CLI 的通过记录来自已安装 wheel。未将本地 wheel 执行写成源码 13 个 CLI 或实际 Docker。另修正远端 artifact 路径，使原有 baseline 的 local-ci.json 与其他 local-ci-*.json 同时留存，不改实验结果。

安装后运行 python -m pytorch_lab.dropout_rng_cli --output results/local-dropout-rng.json，输出路径必须不存在。CLI 实际实验通过不同于仅运行帮助命令。

## 技术理解

- 初始 seed 与断点处 RNG 状态不同；模型构造也会消耗随机数，恢复顺序必须受控。
- 标准 Linear／Dropout 的权重 state_dict 不自动携带 Dropout 概率与训练模式。模型相同不能只比较权重。
- no_grad 控制反向图记录，eval 控制模块行为；训练模式 Dropout 在 no_grad 下仍有随机性。
- fork_rng 可以保留并还原调用者 CPU 随机状态，但不提供线程互斥，也不自动解决所有训练状态的事务问题。

## GitHub 交付

工程提交：[feat: verify CPU Dropout RNG replay boundaries](https://github.com/zjDing1024/pytorch-from-zero/commit/07a1a9fbe2f851a127909a1c24a856ce23c74628)。远端 main 与该提交及其 291 个文件的 Git blob 均已核验；本轮 17 项变更为 7 个修改、10 个新增，无历史文件删除。成长仓库新增本日报与学习笔记，并更新 README、实验索引及两份路线／能力文档，共 6 份文件。

精确工程提交的 [CI 运行 41092384716](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41092384716) 已成功。source 作业通过主套件 1,265 项（302.19 秒）及 59 + 45 + 34 项独立套件，合计 1,403 项；Ruff lint、123 个文件格式检查及 13 个 source CLI 通过。实际 Docker 作业的 13 个 installed CLI 也通过，容器未运行完整 pytest。

source artifact 包含 15 份 JSON，即 13 个 CLI 与 2 个既有独立探针结果，baseline 的 local-ci.json 已实际收录。Dropout 的完整 source JSON 核验为 9 个恢复案例、6 个 worker、45 个后缀步骤精确一致，优化器更新为 0，错误对照及模式／RNG 检查通过。Docker artifact 对新 Dropout CLI 保留的是通过摘要，不包含这份完整案例矩阵，不能将 source 矩阵冒充容器原始记录。

source 作业用时 9 分 03 秒，Docker 作业 4 分 19 秒，均在既有预算内。两个 artifact ZIP 的完整性及 SHA-256 均与 GitHub 元数据核验一致。source 使用 Python 3.12.15，container 与本地使用 3.12.14；上述结论限定各执行环境内的检查，未进行跨运行时快照交换，也不宣称跨平台逐位复现。

成长仓库本日报的实际提交以 Git 历史为准，不预填自身未来 SHA。

## 求职价值与能力边界

可作为 ML / Deep Learning / Research Engineer 的实验诊断材料：从状态归属、失败对照和执行次序定位复现问题，并用完整后缀而非最终 loss 接近来验收。没有据此宣称模型精度、收敛或吞吐提升。

已验证能力指工程产物在本日报列出的实际条件下通过检查；学习者本人能力仍待独立自测。本人需解释并改写最小例子，预测恢复 seed、恢复顺序、train/eval/no_grad 的结果，给出失败及修复记录。没有这些证据，不标记“已掌握”。

## 不足与明日计划

不覆盖优化器更新后的随机训练、JointTrainer 集成、任意模块／数据读取、worker、预取、随机增强、并发消费者、GPU / AMP / DDP 或跨版本快照交换；不恢复半途 Autograd 图，也没有断电或外部副作用恰好一次保证。

明日工程计划：依据本次证据，限定一个 CPU 随机前向与联合训练器的集成验收，将随机流、待用梯度、SGD 与索引绑定同一安全点。该项尚未实现。恢复机制连续推进多日，集成闭合后转向训练诊断或优化，不继续拆出重复 checkpoint demo；本人独立自测仍需单独完成。
