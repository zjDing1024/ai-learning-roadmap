# 批量推理接口：错误隔离与成本边界

本轮在2026-11-10（Asia/Kuala_Lumpur）真实执行，接续11月8日固定推理产物。11月9日没有可验证的新提交或日报，不把这次工程工作倒填为过去某天完成。

## 实际源码学习

研究项目：PyTorch v2.14.1，PyTorch社区／贡献者维护。它提供张量、自动微分和模块管理，适合当前从训练工程转向可靠推理交付的阶段。

实际读取 [torch/nn/modules/module.py 的 train/eval](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/nn/modules/module.py#L2894-L2935) 与 [torch/autograd/grad_mode.py 的 inference_mode](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/autograd/grad_mode.py#L213-L280) 文档与实现入口。

- eval等价于train(False)，影响Dropout／BatchNorm等模块行为，不等于关闭自动微分。
- inference_mode关闭自动微分及额外跟踪，但不自动调用eval，而且产生的tensor不适合后续进入训练图。本接口只返回普通数字／列表，不将其tensor交给训练。
- 因此在模型加载时设置eval，在服务前向局部使用inference_mode。没有进行no_grad对照，不能宣称它在这里带来特定加速。

借鉴职责分离而非复制源码。PyTorch为[BSD风格及组件许可](https://github.com/pytorch/pytorch/blob/v2.14.1/LICENSE)；UCI Wine与scikit-learn既有数据署名保持。工程实现、实验和本文为原创。

## 接口的两层失败

整批JSON必须先满足可解析、字节上限、无重复键、字段正确、特征顺序正确和1–1024行的合同。这些全局错误不能被伪装成某一条的错误，也不能用通用except静默吞掉。

每一行再检查13列、数值类型、有限性与绝对值上限。不合法行返回index、ok=false和稳定error.code；合法行合并为一个tensor一次forward，再按原始下标写回。这既保留失败，也避免一条坏数据取消其他正常行；全部无效时不运行模型。CLI请求被处理成功不表示每条都成功，调用方必须检查summary.failed和items。

JSON里NaN被严格解析器拒绝，是全局错误；Python API直接收到NaN可定位到行，是局部错误。两者位于不同边界，没有矛盾。布尔值虽然是Python int子类，这里不接受；超大整数先比绝对值再isfinite，避免隐式float转换溢出。

## 时间从哪里开始，到哪里结束

只计model(x)会漏掉加载、解析、验证、张量化、标准化、softmax、返回结果和文件处理。本轮分开测量：

1. 常驻模型的内存请求：验证、预处理、模型forward、后处理和总时长。
2. 父进程包围一次全新Python子进程的file-to-file总时长：包含启动、导入、设线程、读取／解析、模型验证／加载、推理、序列化／关闭输出和退出。
3. 子进程内部诊断到输出编码前结束，明确不能冒充完整端到端时间。

固定1／16／107／1024行，一次预热加三次保留样本。1024行来自107条公开训练特征的循环重复，不是新增数据。文件大小作为实际字节成本保留，未假定任何云单价。新进程不意味着清空操作系统页缓存，三次测量也不支持p99或SLA。

## 工程价值与限制

这个增量把可重载模型变成了可调用、可定位错误、可测成本的本地接口。它能展示输入合同、故障隔离、向量化、包交付与计量意识，但不是HTTP部署／并发服务／安全沙箱。概率没有校准；没有新泛化结果；摘要校验不是来源签名。仍需用户独立解释和改写，再确认个人能力。

实际结果、测试、提交与CI见[日报](../../daily-learning/2026-11-10/README.md)。下一步先补调用示例与服务层超时／背压设计，再按真实需要决定是否采用HTTP框架，避免继续堆叠微型实验数量。
