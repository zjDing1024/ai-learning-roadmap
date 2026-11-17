# 源码研究：同题换证据与同输出测推理

## Attributed-QA：把问题一起纳入证据核对

Google Research 的 [Attributed-QA](https://github.com/google-research-datasets/Attributed-QA/tree/01f114b203ac98e9374471d26dba5e5e07f93409)（[Apache-2.0](https://github.com/google-research-datasets/Attributed-QA/blob/01f114b203ac98e9374471d26dba5e5e07f93409/LICENSE)）评估答案是否可归因于给出的来源。[README](https://github.com/google-research-datasets/Attributed-QA/blob/01f114b203ac98e9374471d26dba5e5e07f93409/README.md)用同一人口问题展示不同时间口径下可归因的答案并不相同；[evaluation.py](https://github.com/google-research-datasets/Attributed-QA/blob/01f114b203ac98e9374471d26dba5e5e07f93409/evaluation.py#L150-L174)把问题和答案共同表达为假设、来源作为前提。只核对答案字符串或编号存在，不足以验证证据满足问题的主体、时间和口径。

本轮借鉴条件化评价思想：问题不变，换掉目标证据；语法、引用来源、语义和正确拒答各自计分。这是原创的成对诊断，不复现论文任务、不复制实现或导入数据，也不借用 AutoAIS 数值作为本项目结果。只用文档可答、运行时不可答的设计会让不读证据的规则看似有效，必须交叉覆盖这两类问题的可答与不可答情况。

[llama.cpp b12359 的 GBNF 文档](https://github.com/ggml-org/llama.cpp/blob/b1b770d90d94cad9e9ea5b993bdbc383a522fb28/grammars/README.md#json-schemas---gbnf)（[MIT](https://github.com/ggml-org/llama.cpp/blob/b1b770d90d94cad9e9ea5b993bdbc383a522fb28/LICENSE)）说明 JSON Schema 只支持子集，且只约束输出，不自动成为提示文本。旧实验 10 条无效生成落在请求 schema 允许、应用校验拒绝的两类组合；这不是模型忽略请求 schema 的证据，也不应靠自动填引用来掩盖。

## PyTorch Benchmark：可比性先于数字

[PyTorch v2.9.1 Timer 实现](https://github.com/pytorch/pytorch/blob/v2.9.1/torch/utils/benchmark/utils/timer.py)（[BSD 风格许可](https://github.com/pytorch/pytorch/blob/v2.9.1/LICENSE)）明确了预热、线程池控制与重复测量的设计。参考版本不是本次推理运行时版本；只学习设计，不复制 Timer 实现。缓存 append 会改变下次的输入形状，不能无限重复把它当成固定工作量。完整前缀与增量路径必须比较同一输出和相同请求边界；计时变化来自整条路径，不能直接归因于注意力核。进程峰值 RSS 与 K/V 张量大小是不同度量。
