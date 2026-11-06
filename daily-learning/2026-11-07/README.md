# AI Engineer Daily Report

日期：2026-11-07（Asia/Kuala_Lumpur，UTC+8）；执行开始于2026-11-06 UTC。承接11-06更新时钟实验，不覆盖既有记录。

## 今日学习主题

真实训练的固定长期预算、训练／验证曲线、验证集终点选择，以及可复查的候选快照。将“更低的训练损失”与“验证选择”明确分开，避免用已暴露的历史测试集继续调参。

## 今日研究项目

项目：[PyTorch](https://github.com/pytorch/pytorch)，维护者PyTorch社区。深入阅读v2.14.1的 [Module源码](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/nn/modules/module.py) 中train/eval/state_dict：eval递归切换模块模式但不关闭autograd，state_dict浅复制仍引用参数存储。官方[autograd说明](https://docs.pytorch.org/docs/2.14/notes/autograd.html)与[保存模型教程](https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html)支撑评估和深复制边界；[scikit-learn交叉验证说明](https://scikit-learn.org/stable/modules/cross_validation.html)说明选择偏差。

上游[PyTorch许可证](https://github.com/pytorch/pytorch/blob/v2.14.1/LICENSE)为BSD风格及分组件声明；本轮原创实现，没有复制上游代码。Wine原有CC BY4.0数据许可与scikit-learn BSD-3-Clause署名保留。当前仓库自身未选开源许可证。

## 实际完成内容

工程代码仍集中于pytorch-from-zero，成长内容集中于本仓库，没有为同类实验另建仓库。

- 原创wine_learning_curves模块：冻结20轮、每轮7更新，固定两架构／三种子／constant与step7，总12条轨迹。
- 每轮记录训练和验证CE、参数摘要、访问预算、最后使用和下步学习率。两分支共享初始化与样本顺序；标准化只拟合107训练行。
- 验证选择器完整保留16候选（epoch2／5／10／20），以三种子mean CE选择，精确平局优先更早轮次、linear、constant。缺少轨迹、重复或非有限值均失败，不丢掉“不好”的种子。
- 候选state_dict深复制，在完整训练之后回载并核对参数hash与验证CE。是可信内存终点证据，不是已导出的部署模型或训练恢复文件。
- 新CLI拒绝覆盖结果，加入source CI与安装wheel的第24个CLI；独立测试验证验证集扰动不改训练、test污染不进入开发张量、手写学习率oracle、实际调用计数与选择器负对照。

## 实验结果与预算

实际1680次optimizer更新、25680次训练样本访问；480次曲线评估、34320次评估访问；另48次回载验证、1728次评估访问。合计528次评估／36048访问。独立spy与实际轨迹计数吻合。

选中 **mlp16／constant／epoch20**，三种子验证CE均值 **0.039579834990927085**，各为0.058118638180000376、0.01839533840648161、0.04222552838629926。linear／constant／epoch20为0.03991817977688174，差距仅0.0003383447859546529。

constant在两架构更长预算下仍具有较低验证CE。step7保持原设置，20轮后下步LR=.05×.5^20，约4.77e-8，后期已接近冻结。因此结论只针对这个激进衰减配置，不能说scheduler普遍无效。选中最后一个候选只说明当前固定预算边界最好，不说明已收敛，也不据此事后延长训练。

本轮实验读取固定CSV但不对test行索引、拟合或评分。36行验证集已在旧研究中使用，候选选择后的分数有选择偏差；三种子不估计数据抽样不确定性。没有新鲜留出泛化结论。旧全量回归交付另行运行原Wine benchmark，包含历史test评分，但不进入本选择器。

## 技术理解

1. full-training CE在同一组终点权重下计算，与权重不断变化的在线batch loss均值不是同一量。
2. eval控制Dropout／BatchNorm等行为，no_grad控制梯度记录；需要二者并恢复调用者模式。本轮模型没有这两类随机／状态层，不外推任意模型的非干扰性。
3. state_dict不是独立历史快照，必须deepcopy；“最终训练完再读最优state_dict引用”会误取后期权重。
4. 验证选最优会产生乐观偏差，选中候选的验证分数不是独立测试成绩。

## 求职价值与能力边界

对应AI／ML Engineer的实验设计、数据隔离、训练预算计量、候选选择合同、测试与发布证据能力。上述均为助理完成并验证的工程产物，**不等于本人已经掌握**。

本人可选自测：解释为什么要保留所有种子；在选择器中构造中间epoch胜出和精确平局；预测移除deepcopy后的失败；说明为什么不能用这36行验证成绩宣称生产性能。练习不是继续工程推进的前置门槛。

## 不足与下一步

单一小数据集和复用验证集；没有独立新数据、统计显著性、GPU／AMP／DDP、通用模型评估器或部署包。下一步应冻结推理输入合同，将验证选定终点与训练集预处理封装成可重载产物，验证预测一致性及畸形输入拒绝，而非继续扫描scheduler变体追逐验证分数。

导出前还需冻结具体种子或明示ensemble方案。本轮选择的是跨三种子聚合的架构／调度／终点配置，不是某个特定种子模型；不能再按验证成绩挑最好种子。

## 验收、GitHub变化与发布状态

本地最终主套件 **1960 passed，586.81秒**，另独立59／45／34项通过，共 **2098项唯一测试**。新增CLI20项与独立科学审查14项已包含在1960内，不重复累计。Ruff、格式、compileall和pip check通过。

新建当前工程wheel，安装到既有独立非editable CPU环境；56个包源码／数据文件与source逐字节一致。从无关目录实际执行24条安装CLI全部通过，新实验完整JSON在同宿主与source相同。不是全新依赖安装，没有本地Docker或安装环境全量pytest。可选NumPy缺失警告保留。

首次完整主套件有2处旧CLI列表／计数断言仍要求23，新增第24条CLI后失败，其余1944项通过。更新准确命令列表和计数后，最终整套1960项通过；没有调整科学容差。独立测试验证真实调用计数、验证集扰动不影响训练、test污染不进入开发张量、手写学习率训练oracle及选择器失败分支。

工程提交已发布：[837141c9366ba99866cad0b21aa62bb225fd3edd](https://github.com/zjDing1024/pytorch-from-zero/commit/837141c9366ba99866cad0b21aa62bb225fd3edd)。远端main已核验为该SHA，25个变更／新增文件与本地git blob匹配；从基线98c55d4推进，无历史文件删除。仅本任务原创代码和技术资料，未公开私有内容或使用收费资源。

- [完整设计与官方来源](https://github.com/zjDing1024/pytorch-from-zero/blob/837141c9366ba99866cad0b21aa62bb225fd3edd/docs/wine-learning-curves.md)
- [最终原始JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/837141c9366ba99866cad0b21aa62bb225fd3edd/results/2026-11-07-wine-learning-curves-final.json)
- [本地验收](https://github.com/zjDing1024/pytorch-from-zero/blob/837141c9366ba99866cad0b21aa62bb225fd3edd/results/2026-11-07-learning-curves-verification.md)
- [安装wheel摘要](https://github.com/zjDing1024/pytorch-from-zero/blob/837141c9366ba99866cad0b21aa62bb225fd3edd/results/2026-11-07-learning-curves-wheel-summary.json)
- [精确SHA CI #42252188021](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/42252188021)：已完成且success，source与installed-cpu-container两个作业均成功。下节为实际核验。本学习仓库无工作流，不称其CI通过。


## 精确提交CI终态核验

工程SHA837141c9366ba99866cad0b21aa62bb225fd3edd对应的CI于2026-11-06 16:36 UTC完成，结论success。

- 远端source主套件1960通过（368.28秒）；独立59／45／34项分别5.10／5.15／0.987秒，共2098项。Ruff和格式步骤成功，24条source CLI与两条既有独立validation脚本执行成功。
- 真实Docker构建成功；非root、只读、断网容器中的24条已安装CLI全部通过。未运行容器全量pytest，不将2098个source测试写成容器测试。
- 实际下载source artifact（26个JSON）与container artifact（1个完整报告），均与API提供的ZIP SHA-256匹配，ZIP CRC检查通过。
- source artifact ID13522290046，SHA-256 f6a0edb52fc9b35c176315220434dcd01a53730c04061091e7a1e2539841971c；container ID13520553352，SHA-256 945c8880f363380c4bcec8b3586185185b190bc508cafb0dcb5a698caf6dd195。artifact按CI策略保留30天，持久实验原始结果在工程提交中。
- source Python3.12.16、container Python3.12.14，均PyTorch2.14.1+cpu。两路新实验检查通过，均1680更新／25680训练访问／528评估／36048评估访问，均选择mlp16／constant／epoch20。
- source选定均值0.03957983499092707；container与本地为0.039579834990927085。source与container全部曲线CE最大绝对差1.1102230246251565e-16；完整JSON及参数轨迹不逐位相同。每个环境内部终点回载检查通过，不宣称跨运行时逐位复现。本次container新实验完整JSON与本地相同，仅限已核验环境。

学习记录首个发布提交：[fde799d97bb8d8f51550888c72a877763e93a39f](https://github.com/zjDing1024/ai-learning-roadmap/commit/fde799d97bb8d8f51550888c72a877763e93a39f)，7个修改／新增文件blob已核验。当前补充只修改本日报以记录实际CI终态，不改变工程代码或实验协议。新增独立仓库：无。
