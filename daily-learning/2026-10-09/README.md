# AI Engineer Daily Report

日期：2026-10-09，Asia/Kuala_Lumpur（UTC+08:00；实际执行对应2026-10-08 UTC晚间）。执行方式：AI助理研究、实现和验证；个人独立掌握仍待自测。

## 今日学习主题

阶段1的下一步：从合成训练机制进入公开授权真实数据的分类评估。重点为数据来源/许可证、固定分层划分、训练集归一化、原始logits交叉熵、验证选择、简单基线、混淆矩阵及误差分析。

读取当前路线和前日日报后确认：Tensor/Autograd、Module/DataLoader、checkpoint、手写momentum和StepLR都已完成，不重复实现。公开记录没有新增学习者独立重写/解释证据，因此保留“待自测”，也不据此跳到复杂模型或Agent系统。

## 今日研究项目

- 项目：scikit-learn，https://github.com/scikit-learn/scikit-learn
- 作者/维护：scikit-learn开发者和社区
- 问题：为统计学习提供数据加载、预处理、模型选择和评估接口
- 核心技术/结构：datasets、preprocessing、model_selection、metrics；研究 `datasets/_base.py` 中Wine的CSV约定及官方泄漏/验证指导
- 固定源码：e316dbeeebfd8f38cf293d6443ce81aaa33686d3；数据文件Git blob为6c7fe81952aa6129023730ced4581b42ecd085af
- 适合当前阶段：此前合成数据不能证明真实数据来源和评估边界，本次补齐这些具体缺口，不因热门增加新框架
- 借鉴：职责分离、训练拟合/留出变换、固定数据来源；没有复制实现，也没有新增scikit-learn运行依赖
- 辅助研究：PyTorch CrossEntropyLoss的logits/class-index契约；[来源笔记](../../notes/深度学习笔记/2026-10-09-real-data-evaluation.md)

数据为[UCI Wine](https://archive.ics.uci.edu/dataset/109/wine)，178条/13特征/3类，不是Wine Quality；CC BY 4.0，引用Aeberhard与Forina (1992)，[DOI](https://doi.org/10.24432/C5PC7J)。上游描述存在署名矛盾，采用UCI推荐引用；原始CSV字节、格式变化、BSD软件通知和许可链接均保留。

## 今日完成内容

### 代码与文件

继续扩展独立工程 [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)，没有为小增量另建空仓。

- 新增原创 `wine.py`、`wine_cli.py`，固定数据/划分/来源/许可文件，两个聚焦测试文件
- 加入真实数据加载校验、全覆盖无重叠与完全重复特征检查、训练集标准化
- 实现42参数线性分类器与275参数小MLP，局部随机状态、尾批统计、固定训练预算
- 验证损失选择接口不接收测试分数；选完模型再计算最终测试指标；输出每行预测/概率、混淆矩阵和错误列表
- 加入数据卡/实验协议/署名、README、自测问题、新CLI的CI步骤和包数据声明
- 保留旧源码、旧测试和全部2026-10-08原始结果；本次新增独立日期的原始JSON

### 实验协议

固定107/36/35分层划分，训练类计数35/43/29；只在107条训练数据拟合均值和总体标准差。种子42/7/123控制初始化和shuffle，划分不随种子变化。两候选均120轮、batch16、SGD学习率0.05/momentum0.9/weight decay1e-4，每次840更新、12,840次样本访问。

在首次评分前固定“最终验证交叉熵三种子均值最小”作为选择规则；没有early stopping、额外搜索或挑最好种子。训练类先验概率基线同时给出多数类硬预测。

### 实测结果

| 模型 | 验证CE均值 | 测试准确率均值 | 测试macro-F1均值 | 测试CE均值 |
|---|---:|---:|---:|---:|
| 训练先验/多数类基线 | 不参与选择 | 40.00% | 0.190476 | 1.083496 |
| 线性42参数 | 0.017577 | 97.14% | 0.970110 | 0.085390 |
| MLP275参数，验证选中 | 0.014833 | 96.19% | 0.959791 | 0.111148 |

六次训练的训练/验证准确率均100%，测试仍有错误。线性三种子各34/35正确；MLP42/7为34/35、123为33/35。验证选中MLP后，测试表现不及线性，仍保留原选择，不看测试后倒改。三种子共享错误行68；MLP123多错行134。MLP对行68错误类别的softmax分数约0.942–0.956，比线性更高，说明自信错误会推高CE。

[工程完整协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/wine-evaluation.md)与[原始JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-09-wine-cpu.json)包含所有配置、完整行ID和误差明细。35条测试样本的一条错误对应2.86个百分点，三种子不是人口或数据划分不确定度。没有声明深度模型更好或差异具有统计显著性。

## 技术理解

### 今天真正掌握

学习者：仍待独立验证。本次通过工程验证的事实：

- 数据真实不等于评估可信；来源/许可、划分和拟合范围必须一起记录
- 没有使用测试标签，也可能通过全数据均值/方差泄漏
- CrossEntropyLoss接收原始logits与int64类别；softmax只用于展示概率
- 准确率相同也可能有不同CE；越自信的错误损失越大
- 验证选择无法保证在一个小测试集上胜出；不能事后按测试改选择
- 同一划分的三种子只反映训练随机性；相同样本/更新预算不等于相同FLOPs

### 遇到的问题

Wine在上游文字描述中存在冲突署名，已对照UCI原始元数据与当前推荐引用。数据很小且容易，三个种子的验证准确率均100%；因此用预声明CE选择并完整报告反例，而不是宣传“100%准确率”。不同操作系统/torch版本的末位数值不保证一致。

## GitHub变化

- 新增仓库：无；本次是现有PyTorch训练项目的连续扩展
- 远程基线：工程c3b889348cd3bbf5588d08c67bff2e372e29df99；成长记录52c2b9caf41ae79bff29b3064df7b809ff32c810
- 修改前已逐一核对远程54个工程文件、9个成长文件的Git blob，与本地一致
- 本次本地全量709项测试通过（246.06秒），独立新环境709项通过（237.98秒，1条可选NumPy警告）；Ruff/格式、pip check、compileall及五条CLI通过。120轮完整JSON新进程重放除时间戳外一致，离线wheel安装smoke通过。独立工程与最终冻结清单验收已完成，无遗留阻塞
- [工程增量a274382](https://github.com/zjDing1024/pytorch-from-zero/commit/a27438230cbb2a9b515a6ca355029e5c6889ec26)的[CPU checks #37808159705](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37808159705)已成功；补写三份发布证据文档后的[最终工程提交bd5ba68](https://github.com/zjDing1024/pytorch-from-zero/commit/bd5ba6883bee133f2fdbd68ebda168edea0ae767)对应[CPU checks #37809158872](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37809158872)也已成功。两次精确提交远程CI均通过709项测试、Ruff/格式和五条CLI。
- 工程增量完整SHA：`a27438230cbb2a9b515a6ca355029e5c6889ec26`；最终工程完整SHA：`bd5ba6883bee133f2fdbd68ebda168edea0ae767`
- 发布前后逐一核对工程66个文件的Git blob；原38个源码/测试/原始结果文件字节不变，原始Wine JSON也未被文档补记覆盖。本次17个工程文件变更（12个新增），之后仅3个文档证据补记。使用expected-SHA校验及非强制快进，零删除
- 成长记录11个文件，本次7个修改/新增（2个新增），保留2026-10-08完整日报等4个未改文件。成长仓库没有工作流，不宣称CI通过
- 当前验证细节：[本次验证记录](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-09-wine-verification.md)

## 求职价值分析

对应AI/ML Engineer基础工程：能展示真实数据治理、离线可复现、无泄漏方法、简单基线、公平预算和可检查错误。比继续添加合成状态测试更接近实际实验流程。

仍不足以代表成熟岗位能力：小而容易的历史数据、单一划分、没有组别/时间外部验证、没有部署/数据漂移/成本优化或GPU。所有材料由助理准备，个人独立实现仍需证据。

## 当前能力变化

新增工程证据为真实数据分类协议和诚实的验证/测试不一致案例。个人技能状态没有自动升级。GPU、Docker和跨数据集可靠性尚未实际验证。

## 明日计划

1. 优先收集独立自测：重写标准化与macro-F1，解释为何不能按已看过的测试分数改选模型。
2. 下一工程增量优先运行时可复现：构建与检查CPU容器/依赖、资源计量和最小测试矩阵；有可用环境才写已运行。
3. 如果继续研究模型/数据不确定度，先另写新评估协议；不能在本次测试集反复搜索仍称其最终留出集。
4. 不重复已完成momentum/StepLR/Wine实现；不为仓库数跳到复杂Agent。
