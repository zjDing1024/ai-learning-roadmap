# 2026-10-11：完整科学输出、binary64步距与CPU dispatch

研究对象：PyTorch。维护者为PyTorch contributors / Foundation生态；它把张量、自动微分、训练API与多后端执行连接起来。今天研究不是增加新模型，而是让既有Wine实验的复现声明可被检验。

## 固定源码与许可

实际阅读安装版本torch 2.14.1+cpu对应git revision [5c4886908584029761b579af026dcfb627c84070](https://github.com/pytorch/pytorch/tree/5c4886908584029761b579af026dcfb627c84070)：

- [DispatchStub.cpp](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/aten/src/ATen/native/DispatchStub.cpp)：读取ATEN_CPU_CAPABILITY或硬件检测，缓存capability，并通过已编译kernel指针和fallback选择实现。全局capability不等于每个算子的指令轨迹。
- [torch/testing/_comparison.py](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/testing/_comparison.py)：树结构遍历、Pair类型、容差策略和错误路径分离。可学习职责划分，但本项目不调用私有函数，也不照抄宽泛类型转换。
- [根LICENSE](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)：BSD-3-Clause-style条件，需保留通知/免责声明，不能冒用上游背书；依赖另有各自许可。此次新代码均为原创。

主要目录含torch Python API、aten张量/native后端、c10底层设施、test测试与docs文档。本阶段借鉴“将比较策略与诊断分开”“验证干预确实发生”，比增加框架调用更贴合当前可靠性缺口。

## 三种问题不要混为一谈

1. 科学JSON canonical hash是否完全相同？原口径只排除顶层时间和运行环境，答案必须按真实hash报告。
2. 结构、协议、数据、离散决策是否相同？seed、划分、预测、混淆矩阵、选择和count-derived指标都必须精确。
3. 指定连续输出的相邻binary64步距是否在预声明边界？这是一道独立诊断，不是第1问的替代。

一般assert_close默认值不能代替本项目的容差理由。预声明8相邻可表示步是严格调查预算，没有训练误差理论保证；不设事后absolute floor，不按看到的75/144 ULP调宽。所有非有限值和重复JSON key拒绝。输入结构/type先于数值判断，避免Python的True==1==1.0遮掩类型变化。

按有限float的符号整数序计算步距，两个零在允许近似的路径归同一数值；其它精确路径仍按位比较。步距不是“改了几个低位”：跨指数边界和进位会让bit变化的数量误导。最大的绝对差和最大ULP差可以发生在不同概率上。

## 证据如何改变判断

恢复前次source CI完整Wine JSON后，重新确认历史1299个float差异、最大绝对差3.608224830031759e-16。新信息是最大75 ULP，932项超过8步，尽管离散/配置/计数型指标全部相同。它说明不能仅用很小的绝对差就宣称“严格末位一致”。该诊断失败保留，未改阈值。

本机ATen正常capability为AVX512，环境override=default的新进程报告DEFAULT，因此能实施单因素A-B-B-A。各条件内部严格重复，跨条件输出改变；这只表明当前主机/构建下该干预影响科学输出。它不等于所有运算变scalar、不覆盖全部MKL/oneDNN，也不证明历史CI的原因。旧CI缺CPU细节，无法事后补造。

## 官方语义

[PyTorch numerical accuracy](https://docs.pytorch.org/docs/2.14/notes/numerical_accuracy.html)与[reproducibility](https://docs.pytorch.org/docs/2.14/notes/randomness.html)解释顺序、后端和平台变化为何可能改变浮点结果。[Python math nextafter/ulp](https://docs.python.org/3.12/library/math.html#math.nextafter)说明可表示数与局部间隔。[PEP485近零讨论](https://peps.python.org/pep-0485/#behavior-near-zero)强调没有通用非零absolute floor；这些来源没有为8步预算给出理论保证。

[CPU capability API](https://docs.pytorch.org/docs/2.14/backends.html#torch.backends.cpu.get_cpu_capability)、[config API](https://docs.pytorch.org/docs/2.14/config_mod.html)、[线程环境变量](https://docs.pytorch.org/docs/2.14/threading_environment_variables.html)帮助把请求值与实际观测分开。

## 发布后的新增观测

修复后的[CI #38132126861](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132126861)保留完整source/container输出，两路数值捕获均记录AMD EPYC 9V74、AVX512和b7ab…科学hash；本地Intel Xeon/AVX512则为28ce…。此前首轮成功container为AMD EPYC 7763/AVX2及b7ab…。最终文档[CI #38132800285](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132800285)也记录source为AMD EPYC 9V74/AVX512及b7ab…、container为Intel Xeon Platinum 8370C/AVX512及28ce…；完整输出仍有1,299个float差异、最大75 ULP、932项超出8步。这说明capability标签单独不足以归因历史差异；硬件、构建和原生库路径仍需预声明受控验证。831项软件测试通过不改变原8步诊断失败。精确提交与最终文档CI见[日报](../../daily-learning/2026-10-11/README.md)。

## 自测与下一步

请独立实现8/9-step反例、解释正负零和near-zero、找到一个必须精确的浮点配置，并说明为何dispatch对照不足以归因历史CI。目前无个人独立证据，状态不升级。后续优先固定输入的逐阶段/逐算子最小对照，将训练变化与评估softmax变化区分；先写可证伪假设，不重复调Wine测试集。
