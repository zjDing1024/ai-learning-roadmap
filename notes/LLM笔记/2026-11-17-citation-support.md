# 从引用可解析到可支撑：ALCE 源码阅读

- 项目：Princeton NLP 的 [ALCE](https://github.com/princeton-nlp/ALCE/tree/246c476a4edfc564266b7346b6e29ef4861ae937)，[代码 MIT 许可](https://github.com/princeton-nlp/ALCE/blob/246c476a4edfc564266b7346b6e29ef4861ae937/LICENSE)。外部模型或数据不自动继承仓库的代码许可。
- 问题：开放式生成回答中，引用是否支撑答案，而不只是格式看起来有效？
- 结构：该版本 `run.py` 生成、`retrieval.py` 检索、`eval.py` 评测，`human_eval/` 提供标注流程。[论文的引用评测章节](https://arxiv.org/html/2305.14627#S3.SS3) 说明指标定义。
- 源码：[compute_autoais](https://github.com/princeton-nlp/ALCE/blob/246c476a4edfc564266b7346b6e29ef4861ae937/eval.py#L301-L429) 先用该句全部引文作为前提测联合支持。联合支持成立时，一条引用如果单独就支持该句，或去掉它后剩余引用不再支持，会计入该指标的有效引用。[人工标注指南](https://github.com/princeton-nlp/ALCE/blob/246c476a4edfc564266b7346b6e29ef4861ae937/human_eval/README.md) 区分单篇完整、部分、无支持和整体联合支持。
- 边界：这是对已生成句子的事后评价，不是生成前拒答门。分句、蕴含模型及部分支持或冗余引用都会影响判断。不能把一个可解析的引用 ID，也不能把一个确实出现的逐字引文，当成回答正确或证据充分。
- 应用：先检查是否把足够证据送进模型，再检查引用是否可解析、所选片段是否支撑问题要求、最终答案是否正确。允许来自多个片段的联合支持。不移植 ALCE 代码、数据、模型或评分器。

示例：文档证明某设置的默认值，不等于证明运行中某个应用的配置；只有数字的截断片段也未必能说明数字属于哪个设置。核对引用必须回到问题所问的范围。
