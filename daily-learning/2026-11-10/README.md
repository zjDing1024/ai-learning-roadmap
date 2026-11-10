# AI Engineer Daily Report

日期：2026-11-10（Asia/Kuala_Lumpur，UTC+8），本轮为当天实际补充工作。

## 今日学习主题

从可重载模型产物推进到可靠批量推理：一批请求中的坏行单独返回错误，正常行共享一次forward；测量输入验证、预处理、模型前向和结果处理，并另行实测新进程file-to-file总时长。

## 记录缺口与真实基线

开始前核对工程main为aca507c1e6569e81acd0aa1700314590c34f48ab、学习main为5549fc1e7da52fe5ea7fe888219ae88ba0eafd27，最新原有日报为11月8日。没有找到11月9日可验证的新代码／日报，不回填虚构历史。旧工作目录的修改保留，本轮使用精确公开提交的干净副本，不覆盖其他工作。

## 今日研究项目

[PyTorch v2.14.1](https://github.com/pytorch/pytorch/tree/v2.14.1)，作者为PyTorch社区与贡献者。实际阅读nn/modules/module.py的train/eval与autograd/grad_mode.py的inference_mode，理解模型行为模式与自动微分开关各自负责的边界。可借鉴之处是推理时明确设置eval，同时在局部前向关闭AD；不是引入通用服务框架或复制上游实现。[具体源码、许可与原创笔记](../../notes/深度学习笔记/2026-11-10-batch-inference.md)。

## 今日完成内容

工程仓库：[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)。新增wine_batch_inference.py、wine_batch_inference_cli.py、原始实验、冻结协议、接口文档、可直接运行的混合错误输入样例、28项核心测试及29项独立审查测试，并纳入source CI和第26个已安装CLI。

请求仍为精确features顺序与rows列表，最多1024行、每行13个原始测量值。模型加载一次；正常行聚合一次forward再散回原序号。错误行返回invalid_shape／invalid_number，且不回显原始输入。全局schema／模型／解析错误终止请求，NaN JSON也在解析层整体拒绝。全部无效时不运行模型。CLI exit0表示整批处理完毕，不等于每条成功；需检查summary.failed。

保留原有有限数值范围、1,000,000字节严格JSON、重复键拒绝与独占输出创建。没有覆盖历史原始结果。新API与文件路径均不使用凭据、收费服务或私人数据，没有HTTP监听与上线部署。

## 实验与成本

固定CPU单线程float64、批大小1／16／107／1024，一次预热后三次保留；107条公开训练特征循环扩为1024行。验证fixture沿用既定配置重新训练140更新／2140训练访问，训练完全排除在延迟边界之外。本轮没有计算新的验证／测试准确率。

内存总时长涵盖验证到Python结果组装；模型forward仅是其中一段。真正file-to-file总时长由父进程围住全新子进程，含解释器／PyTorch导入、线程设置、模型加载、JSON读写和进程退出。子进程内部指标到输出编码前结束，不冒充总时长。未fsync，未清空OS缓存，未测并发吞吐或SLA。

- 1行：内存总时长中位数 0.400 ms，模型forward 0.129 ms，新进程file-to-file 1.409 s。
- 16行：内存总时长中位数 0.608 ms，模型forward 0.140 ms，新进程file-to-file 1.400 s。
- 107行：内存总时长中位数 0.876 ms，模型forward 0.145 ms，新进程file-to-file 1.307 s。
- 1024行：内存总时长中位数 3.304 ms，模型forward 0.197 ms，新进程file-to-file 1.403 s。

最终独立运行68/68检查通过；主机上没有同时运行本任务其他测试或安装检查。初步测量与安装验证过程的样本也保留，但存在与回归测试重叠，不能据此作性能排序。这里的差距说明只报告模型forward会遗漏大量应用成本，不推导精确启动耗时或云费用。CPU型号及宿主负载未由runner记录，进一步限制跨机器比较。

## 技术理解

- eval与inference_mode不同，二者需分别设置；本轮未比较no_grad，不宣称它带来特定性能收益。
- 局部错误须保持原始下标，不能在过滤坏行后让预测错配输入。
- 正常行共享一次forward体现向量化，模型只加载一次体现生命周期；新进程请求是另一种成本边界。
- 模型前向很短不等于应用端到端很短。只公布计时边界与实际样本，不将不同边界相减作为精确启动成本。
- SHA256仍只验证完整性，概率仍非校准置信度；输入范围不等于分布外检测。

## 验收与 GitHub 变化

最终完整source套件 **2060 passed，437.42秒**。三个独立套件分别59／45／34项通过，共 **2198项唯一测试**；新增28＋29项已在2060项内，不重复累计。Ruff lint／format、compileall、git diff检查与source／wheel的pip check通过。Python3.12.14／PyTorch2.14.1+cpu；仅缺可选NumPy而产生已有警告，本轮不使用NumPy转换。

非editable wheel离线构建并安装后，61个源码／包数据文件逐字节与source相同。从无关目录运行的26个已安装CLI全部通过，包括本轮68项检查。没有在wheel环境跑全部pytest，也没有本地Docker，不将这些范围混写。真实容器结果以发布后的精确提交CI为准。

首轮完整回归2056通过、3失败、479.38秒：两个旧测试仍断言25条CLI，另一个独立审查测试把百万字节样本放入参数ID，导致PYTEST_CURRENT_TEST环境过大、子进程无法启动。修正接口断言与测试短ID，并新增最后一项审查后，全套2060项重跑通过。未因此修改推理算法或放宽容差。最终针对性146项也通过，报告中的实际测量与计时边界另经核对。

本轮64项数值／类别对照，加4项混合错误合同检查，共68/68通过。单独执行的公开混合文件样例得到2成功／2错误并保留全部下标。

工程已发布并核实main为 [21d5997d51b8668a8952065b77ec17be140ffe96](https://github.com/zjDing1024/pytorch-from-zero/commit/21d5997d51b8668a8952065b77ec17be140ffe96)。27个新增／修改文件的远端blob与mode均与本地一致。

- [接口源码](https://github.com/zjDing1024/pytorch-from-zero/blob/21d5997d51b8668a8952065b77ec17be140ffe96/src/pytorch_lab/wine_batch_inference.py)
- [接口与计量协议](https://github.com/zjDing1024/pytorch-from-zero/blob/21d5997d51b8668a8952065b77ec17be140ffe96/docs/wine-batch-inference.md)
- [最终原始测量](https://github.com/zjDing1024/pytorch-from-zero/blob/21d5997d51b8668a8952065b77ec17be140ffe96/results/2026-11-10-batch-inference-final.json)
- [完整本地验收](https://github.com/zjDing1024/pytorch-from-zero/blob/21d5997d51b8668a8952065b77ec17be140ffe96/results/2026-11-10-batch-inference-verification.md)
- [可运行混合输入样例](https://github.com/zjDing1024/pytorch-from-zero/blob/21d5997d51b8668a8952065b77ec17be140ffe96/examples/wine-batch-mixed-request.json)

[精确提交CI #42825707887](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/42825707887)已完成且 **success**，核对head SHA仍为21d5997d51b8668a8952065b77ec17be140ffe96。source与installed-cpu-container两个作业均成功。

- 远端source主套件2060项通过（385.77秒），三个独立套件59／45／34项分别4.92／5.11／1.164秒通过，共2198项唯一测试。26条source CLI全部成功。
- 真实Docker构建及断网／只读／非root运行完成，容器内26条已安装CLI全部通过。不是容器内全量pytest。
- 实际下载source artifact 13768414307，包含28个JSON，ZIP SHA-256为c8c819fc9586f12d2de3f31eeaa0bce2f9da0db36a20296383f08d3a6ec427af；container artifact 13769277562的ZIP SHA-256为aa5962afe8783cc6812aa6c91c4f1276ad7e758764791d7daa35f8c2631c1022。两者均与API摘要一致，且ZIP CRC检查通过。
- 两份artifact里的本轮批量实验均68/68检查通过，fixture均140更新／2140训练访问。source Python3.12.16，container与本地Python3.12.14；均PyTorch2.14.1+cpu、单线程float64。时间样本会变化，不声称跨运行完整JSON逐字节相同，也不因来源不同作性能排名。
- 本日报初版学习提交[4b138e3d0c5c441b646079c9abf2f3b5f064cc9b](https://github.com/zjDing1024/ai-learning-roadmap/commit/4b138e3d0c5c441b646079c9abf2f3b5f064cc9b)已核对7个改动文件的blob与mode。这次仅补记实际CI终态。学习仓库没有工作流，不声称其CI通过。

## 求职价值分析

对应AI Engineer／ML Engineer的输入合同、失败隔离、向量化推理、离线交付、延迟计量与自动验证能力。新增独立仓库：无，继续强化现有可运行工程，而非为数量制造Demo。

## 当前能力变化与不足

新增的是助理实现和验证的工程材料，不代表用户已独立掌握。仍处于基础工程阶段，HTTP服务、并发队列／背压／超时、生产鉴权、安全扫描、概率校准、新数据泛化、GPU／AMP／分布式均未由本轮证明。之前的历史全套Wine测试会复跑其既定留出协议，不作为本轮接口优化的模型选择依据。

## 下一步计划

先补清楚面向调用者的成功／部分失败／全局失败示例和超时、取消、背压合同，并进行独立讲解／改写自测；再按实际使用需求实现最小HTTP服务。避免继续通过微小变体或提交数拖延真正可演示的完整交付。
