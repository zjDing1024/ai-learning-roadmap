# AI Engineer Daily Report：Wine 等预算动量对照

日期：2026-11-03，Asia/Kuala_Lumpur。同日用户要求继续后的工程增量；此前[训练观测日报](README.md)原文保留，不将同一成果重复计为新实验。已核对任务书、远端最新路线和实验索引，实施上一项明确留下的有／无 momentum 对照。

## 学习主题与研究项目

保持训练输入、初始化、批次顺序、名义学习率及更新预算一致，仅切换 SGD momentum=0 与 0.9，分开检验局部更新机制与两轮训练的总体差异。代码仍进入独立项目 `pytorch-from-zero`，学习记录集中于本仓库，不另建空项目。

研究 [PyTorch](https://github.com/pytorch/pytorch) 的 SGD 状态更新和 [PyTorch Examples](https://github.com/pytorch/examples) 的训练／评估边界，官方固定源码、作者／维护者、设计分析及 BSD 许可证见[原创学习笔记](../../notes/深度学习笔记/2026-11-03-wine-momentum-comparison.md)。本项没有复制上游代码，也未下载新数据、调用收费资源。数据沿用 [UCI Wine](https://archive.ics.uci.edu/dataset/109/wine)，CC BY 4.0，既有数据来源与许可保持不变。

## 预声明问题与实际预算

冻结协议 `docs/wine-momentum-plan.json` 的 SHA-256 为 `ce5abc56ef68aa4d6fd622d01d6c42f4c4e9bac1fd787f7d508a2e2fcbc8c421`。冻结后不按结果改学习率、seed、终点或阈值。

- 既有划分仍为 107 训练／36 验证／35 测试；预处理只拟合训练集。
- linear 13→3 与 mlp16 13→16→3，各种子 42、7、123，共 6 个配对、12 条训练分支。
- CPU float64，batch16 并保留 11 条尾批，lr=0.05、weight_decay=1e-4、dampening=0、无 Nesterov，仅 momentum 不同。
- 每分支固定 2 轮、14 更新、214 样本访问。主对照合计 **168 更新、2,568 训练样本访问**。
- 每轮末各评估一次完整训练 CE，共 **24 次完整训练集 forward**，即额外 2,568 次评估样本访问。没有初始全训练集评估，也没有主 JSON 内额外重放。评估 forward 与训练样本访问分别计数。
- 本项不评分验证／测试集，不作模型选择；不是历史每分支 120 轮／840 更新的正式分类实验替代品。既有交付回归仍可能运行历史完整 Wine CLI，须与本项隔离解释。

## 原创代码与实际实验结果

新增[核心配对实验](https://github.com/zjDing1024/pytorch-from-zero/blob/f58d60f86de8d1cfc405436bcf09c236d67dab62/src/pytorch_lab/wine_momentum.py)、[CLI](https://github.com/zjDing1024/pytorch-from-zero/blob/f58d60f86de8d1cfc405436bcf09c236d67dab62/src/pytorch_lab/wine_momentum_cli.py)、[冻结协议](https://github.com/zjDing1024/pytorch-from-zero/blob/f58d60f86de8d1cfc405436bcf09c236d67dab62/docs/wine-momentum-plan.json)、[工程说明](https://github.com/zjDing1024/pytorch-from-zero/blob/f58d60f86de8d1cfc405436bcf09c236d67dab62/docs/wine-momentum.md)、配对轨迹 JSON 及测试。记录每步原始／有效梯度范数、实际参数差、缓冲范数、累计路径长度、配对参数距离及审计哈希。具体最终变更清单与验收见后文。

[原始输出](https://github.com/zjDing1024/pytorch-from-zero/blob/f58d60f86de8d1cfc405436bcf09c236d67dab62/results/2026-11-03-wine-momentum.json)：Python 3.12.14、Torch 2.14.1+cpu、单线程，SHA-256 为 `582162de5a620811b02a34c0f83bb18ef53fa4c201897262fe2191cf46ca5c4b`。下表为第 14 次更新之后完整训练集 CE；路径长度是各步实际参数差的整体 L2 范数之和，不是净位移。

| 架构 | seed | μ=0 训练 CE | μ=0.9 训练 CE | μ=0 路径长度 | μ=0.9 路径长度 |
|---|---:|---:|---:|---:|---:|
| linear | 42 | 0.475531263 | 0.091532547 | 0.809294 | 2.533330 |
| linear | 7 | 0.496512743 | 0.110625801 | 0.780420 | 2.455203 |
| linear | 123 | 0.442215929 | 0.094449431 | 0.707916 | 2.321489 |
| mlp16 | 42 | 0.866991545 | 0.274933430 | 0.531662 | 1.928340 |
| mlp16 | 7 | 0.805984798 | 0.273297940 | 0.530977 | 1.938551 |
| mlp16 | 123 | 0.814937705 | 0.200184599 | 0.484646 | 1.887985 |

六个配对的八项检查均通过：初始参数、首步更新、第二步更新前参数及原始梯度相同；第二步更新差符合动量项；预算相同；全部更新方程及缓冲递推符合预声明。168 条分支更新的方程最大绝对残差为 `6.245004513516506e-17`，合同容差仍为 `atol=rtol=1e-12`。

在这些固定短轨迹中，μ=0.9 的末端训练 CE 更低，同时累计参数路径更长。此结果不证明它具有更好的泛化、最终收敛值、等时间效率或普遍优势，也不证明其效果独立于有效步幅。三个种子共享同一数据划分，不构成三个独立数据集。

[独立审查](https://github.com/zjDing1024/pytorch-from-zero/blob/f58d60f86de8d1cfc405436bcf09c236d67dab62/results/2026-11-03-wine-momentum-independent-review.md)实际执行 7 项测试（2.36 秒），覆盖全部六个架构／seed 配对及完整实验隔离。直接包裹真实 `SGD.step`，以克隆快照独立重建衰减、动量和实际参数差，在 `atol=rtol=1e-14` 下通过；无动量分支无缓冲。第三步的原始梯度已不同，符合轨迹分岔后的预期。

每个分支还与原始未插入观测的 `wine.fit_candidate` 在相应 momentum 下独立运行的最终参数、online／final history 及预算精确一致。第七项测试污染留出特征为 NaN、标签为 -100，禁止重新划分和留出评分，并守卫 forward 只能接收标准化训练行；实际计数仍为 168／2,568／24，调用者 CPU RNG 和线程数保持不变。独立参考重跑及其他测试另有验证成本，不包含在主 JSON 预算中。7 项已包含在总测试数中，只计一次。

审查曾发现配对参数距离使用不同减法顺序重构更新后参数，已将生产测量改为直接读取两组更新后张量再做差。重生成了上述最终 JSON；初步输出保留在发布范围外。此修正改变观测的计算方式，不改变训练代码的更新语义、学习率、预算、阈值或历史实验。不能把本次修正写成“只改了测试”。最终训练 CE 与累计路径长度未因此改变。开发阶段还修正了核心测试求和顺序的假设；一次 CLI 子进程解析到旧 editable 安装，重新安装当前源码后解决。没有为此放宽科学容差或降低训练预算。

## 技术理解

1. 相同 η 并不让实际更新相同。动量把历史有效梯度叠入当前方向，可能累积、抵消或产生惯性。
2. 同起点且无旧缓冲时首步相同；第二步之前的参数和梯度仍相同，更新差可归因于 `−ημq₀`。第二步之后轨迹分岔，后续原始梯度差异也是干预结果。
3. 耦合 weight decay 进入缓冲。固定衰减系数不意味着不同轨迹经历相同有效正则化。
4. 在线 CE、完整训练 CE、累计路径长度和净位移回答不同问题，不能互相替代。训练 CE 不是留出集指标。
5. 对照记录既回答实现是否符合 SGD 方程，也回答实验是否只改变目标因素；两者均须有独立检查，不能把下降曲线当作正确性证明。

## 测试、交付与远端状态

第一次完整主套件实际为 **1,772 passed、1 failed，369.27 秒**：`tests/test_accumulation.py` 中历史已安装 CLI 预期列表仍只有 18 项，未包含新增第 19 个命令。修正的是该集成断言列表，不是删除旧命令或放松新实验判据；最终完整重跑与远端状态另行记录，不能将本次失败写成全量通过。

三套独立脚本包分别 59、45、34 项通过。全新离线非 editable wheel 的 47 个包文件在 source／wheel／安装目录逐字节一致，使用 10 个哈希锁定依赖；从无关工作目录实际执行 19 个已安装 CLI 全部通过。此次安装环境不是完整 pytest，也不是本地 Docker。新探针的已安装 JSON 与同一运行环境中的本地 source 原始 JSON 相同；不据此推断跨环境逐位一致。

修正集成断言后，最终完整主套件实际 **1,773 passed，340.68 秒**；加独立脚本包共 **1,911 = 1,773 + 59 + 45 + 34**。新增 43 项（16 核心、20 CLI、7 独立审查），已包含在 1,773 中，聚焦重跑不重复累计。Ruff lint／171 文件格式检查、compileall、source 与 wheel 的 pip check 通过。保留可选 NumPy 缺失警告，实验不依赖 NumPy。早期聚焦测试的七项失败、一次 lint 顺序修正和完整套件失败均记录于工程验收，未用部分通过拼凑最终结果。

工程变更为 20 文件（9 修改、11 新增），最终本地树 358 文件；没有删除或改写历史原始结果／数据。[本地完整验收](https://github.com/zjDing1024/pytorch-from-zero/blob/f58d60f86de8d1cfc405436bcf09c236d67dab62/results/2026-11-03-wine-momentum-verification.md)及[安装 wheel 汇总](https://github.com/zjDing1024/pytorch-from-zero/blob/f58d60f86de8d1cfc405436bcf09c236d67dab62/results/2026-11-03-momentum-installed-wheel-summary.json)固定于本轮工程提交。

## GitHub 提交与远端验证

- 工程仓库：[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)。基线 `1c4aaaf7eee34d32b7dab1f5f34bf3232efa8fb0`，新提交 [f58d60f86de8d1cfc405436bcf09c236d67dab62](https://github.com/zjDing1024/pytorch-from-zero/commit/f58d60f86de8d1cfc405436bcf09c236d67dab62) 已在 main，远端 358 个文件与最终清单逐 Git blob 一致，无额外文件或删除。
- 学习仓库：[ai-learning-roadmap](https://github.com/zjDing1024/ai-learning-roadmap)，本轮基线 `87b1313d8b5e6698bd8a33e5c90a0fb2af90262d`。45 个基线文件逐 blob 校验后恢复；保留同日原报告，新增本增量报告和学习笔记，更新 README、路线、实验索引及能力记录。
- 精确提交 [CI #41575750094](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41575750094)已完成且 **success**；`test` 与 `installed-cpu-container` 两作业成功。
- 远端 source 实际通过 **1,911 = 1,773 + 59 + 45 + 34** 测试；主套件 247.57 秒，另三套为 3.42／3.66／0.805 秒。Ruff lint 与 **172 文件**格式检查通过；此数是远端日志读数，不把本地 **171 文件**记录回写成 172。
- **19 个 source CLI** 与真实 Docker 中 **19 个已安装 CLI** 均实际成功。容器未运行全量 pytest，不把 source 测试数称为容器测试。
- 两份 artifact 实际下载并通过 API SHA-256 及 ZIP CRC 校验；source 内 21 个 JSON，container 内 1 份完整安装验收报告。两处 momentum 均为六配对、84 个配对步骤／168 个分支更新、2,568 训练访问、24 次完整训练集评估；所有配对八项检查通过，最大 SGD 方程残差均为 `6.245004513516506e-17`。
- source Python 3.12.15，container Python 3.12.14，均 Torch 2.14.1+cpu。各自内部对照和验收通过，不声称完整跨环境 JSON 逐位相等。
- 保留可选 NumPy 缺失、Action Node.js 20 自动使用 24、punycode／url.parse 弃用提示。镜像构建时有 pip root 警告，实际容器验收运行用户为非 root；警告不等于测试失败，也不隐去。
- 本轮不新增仓库，不发布其他仓库内容、凭据或个人敏感信息。学习仓库没有工作流，不宣称其 CI 通过。

## 求职价值与当前能力变化

这项材料对应 AI／ML Engineer 的公平实验设计、优化器机制审查与训练调试。相比只展示一条收敛曲线，可展示明确干预、相同起点、实际预算、局部数学预测和结论边界。学习与工程按实际验收推进，不将巩固练习作为继续工作的前置条件。

不足仍是单一小数据集、CPU float64、固定短预算和有限模型；未验证 GPU、AMP、分布式、wall-clock 效率或独立泛化优势。可选巩固：从第二步更新差手推缓冲贡献，并说明为什么“同学习率”不等于“等效步幅”。

## 后续计划

在本轮验收闭合后，研究固定 Wine 参数点上的小批次梯度估计与采样噪声：保持模型不更新，对比完整训练梯度与预声明训练子批的梯度；按实际样本数处理尾批，区分加权梯度恒等式、有限采样偏差与优化轨迹。先冻结采样方式、批量大小、样本访问和指标，不增加验证／测试反馈，不直接改 batch size 后用不同更新数比较 loss。这是尚未执行的新问题，不重复 momentum 配置排列。
