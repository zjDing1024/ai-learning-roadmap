# AI Engineer Daily Report：2026-11-02 特征缩放与条件数增量

时区：Asia/Kuala_Lumpur。同日第四项增量，接续[学习率稳定性](LR_STABILITY.md)；此前[随机联合恢复](README.md)和[训练诊断](TRAINING_DIAGNOSTICS.md)独立保留，不重复计数。

## 学习主题与研究项目

上一项建立了曲率与标量学习率稳定性的关系。本项保持同一个预测问题，改变参数坐标，解释为什么“模型表达能力没变”并不意味着 SGD 的训练轨迹不变。不是继续枚举更多学习率，而是加入等价性、条件数和坐标映射的对照。

研究官方 [PyTorch SGD 固定版本源码](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/optim/sgd.py)及其 [BSD 风格三条款许可证](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)，确认参数组可分别使用学习率。公式、实验和实现均为本任务原创，未复制上游代码。完整推导见[源码与数学笔记](../../notes/深度学习笔记/2026-11-02-feature-conditioning.md)。

## 预声明协议与比较口径

五个输入 x=[−1,−0.5,0,0.5,1]、目标 y=2x+0.5，CPU float64；令 z=sx、预测为 θz+b，映射回原输入坐标的斜率 a=sθ。全部从 θ=b=0 开始，初始预测完全相同，初始 loss 均为 2.25。

执行前冻结 s∈{0.25,1,4} 与三种策略，每组 12 步，共 **9 组、108 个实际 SGD 更新**：

- shared：两参数共同使用 0.15。
- curvature：两参数共同使用 0.5/max(s²,2)。
- mapped：θ 使用 0.15/s²，偏置使用 0.15。

损失为 L=0.5(sθ−2)²+(b−0.5)²，Hessian=diag(s²,2)。三个尺度下条件数分别为 32、2、8，标量 SGD 的严格渐近稳定范围分别为 0<η<1、0<η<1、0<η<0.125。条件数依赖当前参数坐标，不是数据集不变的固有分数。

各实际轨迹与独立闭式公式以预声明 atol=rtol=1e-12 核对。跨尺度比较使用 a、b、预测及预测空间 RMSE／更新 RMS，而不是直接比较不同坐标中 θ 的范数。mapped 是对角学习率对照，不是“同一标量学习率也不受缩放影响”的证据。

## 实际实验结果

以下第 12 步后 MSE 直接读取原始 JSON：

| 尺度 s | shared | curvature | mapped |
|---|---:|---:|---:|
| 0.25 | 1.5953862599253499 | 1.3705150583645511 | 0.04051333025421664 |
| 1 | 0.04051333025421664 | 0.0020067974562678614 | 0.04051333025421664 |
| 4 | 6428.39944873079 | 0.053119211151493186 | 0.04051333025421664 |

九条实际轨迹均满足闭式对照；原报告九个验收标志全部为 true。三个 mapped 轨迹的原坐标参数与预测满足和 s=1 shared 的逐步等价检查。三个 curvature 轨迹的 loss 逐步下降；s=4 shared 最终 loss 大于初值，s=0.25 shared 的最终 loss 大于 s=1 shared。

shared 的原坐标斜率误差倍率为 1−0.15s²：s=4 时为 −1.4，交替放大；s=0.25 时为 0.990625，收缩缓慢。curvature 恢复稳定性，但并未抹平不同方向的收敛速度；s=4 时斜率接近目标，偏置误差仍主导剩余 loss。mapped 抵消参数变换带来的 s² 因子，使斜率／偏置误差倍率恢复为 0.85／0.7。

原始报告保留每步参数、预测、前后 loss、坐标梯度、原坐标梯度、原坐标更新和闭式比较，不只展示最终 loss。本地这些 mapped 数值相同，不代表跨设备、框架版本或任意缩放的逐位一致保证。

## 实现、验收与交付

本项新增特征缩放核心、CLI、冻结计划、协议、原始轨迹与测试，接入现有包及 CI；原有 16 条 CLI 元组保持不变，新增第 17 条。工程变更 18 个文件，完整树 336 个文件，旧学习率压力负结果和阈值保持。

本地源码主套件 1,668 项通过（393.46 秒），三个独立目录分别 59／45／34 项通过，合计 **1,806 项，新增 85 项**。Ruff lint、155 文件格式检查、compileall、pip check 通过；既有缺少可选 NumPy 的警告保留。本次聚焦和独立审查没有失败或阈值修改。

干净环境从离线 wheelhouse 核对并安装 10 个 hash-lock 运行依赖，非 editable 项目 wheel 的 **17 个实际 CLI 全部通过**；43 个包文件的最终源码、wheel 与安装字节一致。原始实验 JSON 与 CLI stdout 的 SHA-256 一致。本地未运行 Docker、GPU 或 wheel 环境完整 pytest，不能把 CLI 验证写成完整安装后测试套件。

工程已发布为 [e3be1f16](https://github.com/zjDing1024/pytorch-from-zero/commit/e3be1f1680c6014ef3238ec66731de2e959ec1e6)，远端 main 与全部 336 个文件 blob 已核对。

[精确提交 CI 41464767786](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41464767786) 已成功完成。远端源码主套件 1,668 项通过（373.16 秒），三个独立目录 59／45／34 项通过，合计 1,806 项；17 个 source CLI 通过。远端日志为 **156 个文件格式检查**，与本地 155 个分别记录，不混写为同一计数。实际 Docker 内的 17 个 installed CLI 也全部通过，容器没有执行完整 pytest；可选 NumPy 缺失警告仍存在。

两份 artifact ZIP 的 SHA-256 与 GitHub 元数据一致，ZIP CRC 完整性检查通过。source artifact 包含 19 份 JSON，均通过其科学检查；source 与 container 均保留完整 9 组／108 步特征缩放轨迹，所有主实验检查通过。artifact 结果限定为该提交和运行环境，不外推跨平台逐位一致或生产模型表现。

独立审查 33 项通过，属于最终主套件子集，不另加总。它使用 Python 标量闭式公式核对六个尺度（含非二进制精确尺度 1.3）×三策略×12 步，共 216 个步骤；另在非零参数点用 autograd 计算三个实际 Hessian，核对条件数与稳定上界。真实优化器 no-op 干预使观测参数保持不变且闭式标志失败，证明报告没有被解析答案替代；非有限更新被拒绝，并检查重复运行与调用者 CPU RNG 保持。审查未发现生产缺陷，没有修改冻结容差或协议；autograd Hessian 检查并非独立数值内核。

## GitHub 代码与交付入口

以下链接固定到本次工程提交，不受后续 main 更新影响：

- [核心实现](https://github.com/zjDing1024/pytorch-from-zero/blob/e3be1f1680c6014ef3238ec66731de2e959ec1e6/src/pytorch_lab/feature_conditioning.py)。
- [命令行实验](https://github.com/zjDing1024/pytorch-from-zero/blob/e3be1f1680c6014ef3238ec66731de2e959ec1e6/src/pytorch_lab/feature_conditioning_cli.py)。
- [运行前冻结计划](https://github.com/zjDing1024/pytorch-from-zero/blob/e3be1f1680c6014ef3238ec66731de2e959ec1e6/docs/feature-conditioning-plan.json)。
- [实验协议](https://github.com/zjDing1024/pytorch-from-zero/blob/e3be1f1680c6014ef3238ec66731de2e959ec1e6/docs/feature-conditioning.md)。
- [九组／108步原始结果](https://github.com/zjDing1024/pytorch-from-zero/blob/e3be1f1680c6014ef3238ec66731de2e959ec1e6/results/2026-11-02-feature-conditioning.json)。
- [本地验收记录](https://github.com/zjDing1024/pytorch-from-zero/blob/e3be1f1680c6014ef3238ec66731de2e959ec1e6/results/2026-11-02-feature-conditioning-verification.md)。
- [独立数学审查](https://github.com/zjDing1024/pytorch-from-zero/blob/e3be1f1680c6014ef3238ec66731de2e959ec1e6/results/2026-11-02-feature-conditioning-independent-review.md)。
- [干净安装包验证](https://github.com/zjDing1024/pytorch-from-zero/blob/e3be1f1680c6014ef3238ec66731de2e959ec1e6/results/2026-11-02-conditioning-installed-wheel-summary.json)。

成长仓库本次更新七份文档；此前同日三份报告保留，学习率报告仅附加导航。本文自身提交以 Git 历史为准，不预填未来 SHA。

## 技术理解、已验证能力与求职价值

- 相同函数类、相同初始预测与相同目标，不足以保证相同标量 SGD 轨迹；参数化同时改变优化的几何。
- 最大曲率限制标量步长，条件数影响不同方向收缩速度的差异；稳定不等于快速。
- 参数组学习率可以构造对角预条件对照，但本实验未证明这是所有问题的最佳策略。
- 已验证工程覆盖预声明协议、真实优化器轨迹、独立解析对照、预测空间指标和数值边界。可在作品集面试中解释为何比较模型训练时要固定初始化、预算和测量坐标，而不是仅凭最终 loss 或参数范数做结论。

巩固时可从 a=sθ 出发推导学习率映射，或说明为何 s=4 的 curvature 结果仍有偏置误差；不把这类练习作为继续工程推进的前置条件。

## 不足与下一步

这是单个确定性两参数凸二次问题，没有随机梯度、动量、权重衰减、Adam 或 GPU／AMP／DDP；缩放常数人为固定，不是训练集统计量拟合。不能由此声称真实数据标准化必然提高准确率、泛化能力或墙钟速度。

下一项回到已有 Wine 真实数据训练，在锁定的数据划分与预处理合同下，加入训练集上的优化诊断和梯度／更新观测。先冻结观测指标、预算及比较边界，不查看测试集后重调超参数；本项到此完成概念闭环，不再自动扩展单维玩具变体。
