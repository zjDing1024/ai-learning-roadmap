# AI Engineer Daily Report

日期：2026-11-13（马来西亚时间，UTC+8；本轮从11月12日UTC开始执行）。

## 今日主题与路线推进

承接三线加速路线，本轮把Transformer核心接到真实文本训练目标，并推进RAG的检索与调用基础。PyTorch已有训练到预测主路径保持，不重复增加同类小实验。以下严格区分已执行实验、远端自动检查和下一步计划。

## Transformer：真实文本byte语言模型

已发布：[transformer-from-scratch](https://github.com/zjDing1024/transformer-from-scratch)，工程提交[b18569299464e1ea892361e2b64b610687a4f58f](https://github.com/zjDing1024/transformer-from-scratch/commit/b18569299464e1ea892361e2b64b610687a4f58f)，12个变更文件blob与本地验证版匹配。

### 研究项目与实现

研究[PyTorch官方word_language_model](https://github.com/pytorch/examples/blob/acc295dc7b90714f1bf47f06004fc19a7fe235c4/word_language_model/main.py)，维护者为PyTorch贡献者，BSD-3-Clause。重点为train／eval分离、next-token标签移位、梯度裁剪和validation选checkpoint；原创实现而非复制示例代码。原有显式attention与归一化接入始终启用因果遮罩的两层模型，没有cross-attention或encoder memory，不是原论文完整翻译模型。

99,968参数，固定256 byte词表，无需在留出文本上拟合词表。新增真实文本训练→验证选模→测试→checkpoint保存／重载→生成路径，并用train-only add-0.1 bigram作非神经参考。各文档先独立划分再建窗口，不训练或评分跨文档转移。

### 数据和冻结协议

使用Flask3.1.0官方技术文档，固定上游commit ab8149664182b662453a563161aa89013c806dc9，BSD-3-Clause；显式下载校验SHA-256并保留许可，不将第三方正文或checkpoint提交到工程仓库。

- 训练：quickstart／config／errorhandling，共79,535字节。
- 验证：logging，共5,927字节。
- 测试：testing，共10,448字节，评分10,447个byte target。
- seed20261113，固定600次更新，共614,400次target exposure；每100步验证一次，600步的validation NLL=2.447403为最低，选该终点。没有按test重试或调参。
- 本地Python3.12.14、PyTorch2.15.0+cpu、单CPU线程。15.66秒含训练、验证、最终测试、checkpoint与生成，只是这次执行耗时，不是可移植性能基准。

### 实际结果

| testing.rst，10,447 targets | NLL | byte PPL | bits/byte |
|---|---:|---:|---:|
| train-only add-0.1 bigram | 2.646989 | 14.111485 | 3.818798 |
| 两层Transformer | 2.419144 | 11.236234 | 3.490087 |

这是固定语料／文档划分上的更低byte NLL，不是统计显著性或普遍优越性。bigram看过全部训练文档内相邻对，神经模型重复抽样64-target窗口，因此不是等算力竞赛。byte PPL不可直接与word／subword PPL横比；文档虽分离，术语和模板可能重叠，没有去重或跨域评测。

生成样本以“The application plis aring_nas ertiche”开头，仍大体不连贯，不能称为可用LLM、Flask理解或编程能力。checkpoint同进程reload探针最大差0，另实际执行独立进程生成；只加载本地产生的checkpoint并使用weights_only=True，不声称任意外来模型安全。

[冻结协议](https://github.com/zjDing1024/transformer-from-scratch/blob/b18569299464e1ea892361e2b64b610687a4f58f/docs/text-protocol.md) · [数据manifest](https://github.com/zjDing1024/transformer-from-scratch/blob/b18569299464e1ea892361e2b64b610687a4f58f/data/text-manifest.json) · [原始曲线与结果](https://github.com/zjDing1024/transformer-from-scratch/blob/b18569299464e1ea892361e2b64b610687a4f58f/results/text-v1/text-training.json) · [设计与失败分析](https://github.com/zjDing1024/transformer-from-scratch/blob/b18569299464e1ea892361e2b64b610687a4f58f/docs/text-experiment.md)。

### 实际验收与CI

本地59项唯一CPU测试、Ruff、format、compileall通过。独立审查重跑相同59项并检查短文档采样，不重复累计测试数。覆盖因果性、梯度、无跨文档采样、评估尾部覆盖、baseline相同target集合、hash损坏拒绝及checkpoint／生成一致性。另隔离target安装wheel、项目外执行LM前向与生成smoke通过，不称安装环境全量测试。

[精确提交CI #43255190571](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/43255190571)已completed／success，日志59passed、1warning，Ruff通过，20文件格式通过，机制验证样例成功。**CI没有重跑600步真实文本训练**，训练结果来自上面明确的本地实验，不把单位测试冒充远端真实训练。

## RAG：检索基础与调用交付

工程仓库：[production-rag-system](https://github.com/zjDing1024/production-rag-system)。本轮将BM25检索接到标准库HTTP接口，增加透明中文词典展开与词汇覆盖门控，并保留逐项错误合同。**仍为retrieval-only**，响应明确answer=null、answerability=unverified，不调用LLM／embedding，不生成答案。

研究[CPython3.12 http.server](https://github.com/python/cpython/blob/3.12/Lib/http/server.py)，Python Software Foundation，[官方许可](https://github.com/python/cpython/blob/3.12/LICENSE)。借鉴HTTP framing、handler与业务服务的职责分离，使用标准库API并原创业务代码，没有复制上游实现。http.server不是生产服务器，真实socket可用不等于公网安全或可部署生产服务。

延续Flask3.1.0的6文件／91chunk与BSD-3-Clause来源，不引入新语料或模型权重。请求只允许query／k／expand_zh／gate；中文长词优先映射英文短语，公开实际替换，余下中文标记为未翻译。覆盖门仅计算ASCII英文／数字技术词在全语料词表中的比例，预设阈值0.6；不判断实体、时间或语义关系，忽略未翻译中文也可能掩盖语义缺口。

### 同开发集消融与失败边界

保留首日原始结果，对同22题（18可答、4不可答）运行三路消融：

| 方案 | 可答Hit@5 | 可答被门控 | 不可答仍返回 |
|---|---:|---:|---:|
| 原始BM25 | 17/18 | 0/18 | 3/4 |
| 显式中文词典 | 18/18 | 0/18 | 3/4 |
| 词典＋词汇覆盖门 | 18/18 | 0/18 | 0/4 |

这组问题已经看过，词典直接包含首日中文失败问题的关键短语，是针对开发失败的修复，不是跨语言泛化。虽然本轮没有搜索最优阈值，策略与词典仍有开发偏差。4个不可答样本不足以推断拒答率；新增负控制“What is my secret key?”实际仍返回候选，已保留而非继续改规则隐藏问题。18/18是检索命中，绝不是生成答案准确率。

本地45项唯一unittest通过（原34＋新11），覆盖真实127.0.0.1 socket、健康与检索请求、畸形JSON／UTF-8、字段类型、大小、路径和媒体类型。全量编译、首日评测JSON和示例输出逐字节复现。未测HTTP延迟、并发吞吐、公网安全或生成质量，不报告SLA。

已发布工程提交[9bdc8f61f49709de6844890696097dcb709ad72a](https://github.com/zjDing1024/production-rag-system/commit/9bdc8f61f49709de6844890696097dcb709ad72a)，远端main已回读核对。[精确提交CI #43254679640](https://github.com/zjDing1024/production-rag-system/actions/runs/43254679640)已completed／success；Python3.11与3.12两作业的“Compile and test”及“Reproduce frozen retrieval report”步骤均成功，不把两环境重复运行累计为新测试。

[实现与边界报告](https://github.com/zjDing1024/production-rag-system/blob/9bdc8f61f49709de6844890696097dcb709ad72a/docs/service-report.md) · [原始开发消融JSON](https://github.com/zjDing1024/production-rag-system/blob/9bdc8f61f49709de6844890696097dcb709ad72a/results/service-development.json)。

## 技术理解、求职价值与能力边界

Transformer体现从机制到目标函数、数据隔离、baseline与可追溯训练的工程链路；RAG体现数据来源、检索证据和输入／失败合同。两条线解决不同问题：语言模型的NLL不等于检索命中率，检索命中也不等于答案正确或不幻觉。成果是助理构建并验证的工程资料，不自动等于用户个人已掌握。

## 下一步

Transformer先完善可安装train／generate入口、checkpoint元数据和resume合同，再按预声明协议做多seed不确定性；不能把当前test不断变成调参集。RAG下一步以本轮实际局限为依据，在明确检索评测后才接入生成器与引用／拒答验证，不提前宣称完整生成式RAG。

## GitHub与记录范围

学习仓库基于988b2182c22b0bcd089987b475678e4f5c60cbc0更新，保留此前日报。当前工程增量沿用已有独立项目，没有为提交数量另建重复仓库。仅公开本任务原创代码、技术资料及有许可的数据引用，不公开私有内容、凭据或个人敏感信息，不使用收费资源。本学习仓库无工作流，不将工程CI状态当作学习仓库CI。
