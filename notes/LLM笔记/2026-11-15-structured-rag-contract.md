# 结构化 RAG 输出：语法、引用身份与语义支持

本轮阅读 [ggml-org/llama.cpp b12359](https://github.com/ggml-org/llama.cpp/tree/b12359)，由 ggml 社区维护，[MIT 许可](https://github.com/ggml-org/llama.cpp/blob/b12359/LICENSE)。它将本地模型运行时与 HTTP 服务结合；项目采用固定版本服务协议，不复制上游代码。

- [HTTP 服务文档](https://github.com/ggml-org/llama.cpp/blob/b12359/tools/server/README.md)中的 `/v1/chat/completions` 接受 JSON Schema 的 `response_format`，同时由聊天模板决定消息如何传给模型。
- [Grammar 文档](https://github.com/ggml-org/llama.cpp/blob/b12359/grammars/README.md)说明如何将 JSON Schema 的一部分转为 GBNF。约束可以限制生成语法，但不会把字段意图自动写进提示词；不要依靠未支持的 Schema 特性执行应用规则。
- 应用应把模型输出视为不可信：解析、校验字段与状态一致性、拒绝未知或重复的引用 ID。引用 ID 对得上只能证明指向某个候选，不能证明该候选支持该论断。看不到证据时应拒答；模型超时、HTTP 错误、截断或格式破坏则属于运行或协议失败，不能混报为成功拒答。
- 评测分两条：固定问题和模型，只更换充分／不足上下文，隔离生成行为；真实检索到生成另行运行，观察证据找错、引用错和拒答错分别发生在哪一步。新题用于首测，后续改规则时降级为回归集，不反复将其称作新鲜验证。
