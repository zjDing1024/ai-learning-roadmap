# AI Engineer Daily Report｜2026-11-29

马来西亚时间（UTC+8）。计划起点为 11 月 28 日 16:00 UTC。

## 学习主题：结构化生成与证据正确性分开验收

上一次 CPython 小模型的三个回答数字正确，但都没有单位。这次在新的 libcurl 8.12.1 文档上固定检索证据，对照「短文本写数字与单位」和「数字、单位分字段」。分开统计字段结构、数值、原生单位、引用以及缺证据是否停止，不用新结果改写历史评分。

## 开源研究

[libcurl 8.12.1 源码](https://github.com/curl/curl/tree/57495c64871d18905a0941db9196ef90bafe9a29) · [curl 许可证](https://github.com/curl/curl/blob/57495c64871d18905a0941db9196ef90bafe9a29/COPYING) · [llama.cpp b12359 的 JSON Schema 约束说明](https://github.com/ggml-org/llama.cpp/blob/b12359/grammars/README.md#L141-L153) · [llama.cpp MIT 许可证](https://github.com/ggml-org/llama.cpp/blob/b12359/LICENSE) · [Qwen3.5-0.8B GGUF（Apache-2.0）](https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF/tree/004fd086eccea9f7cf867aa07ba328773beef81d)。

| 选项 | 文档默认值 |
| --- | --- |
| [CONNECTTIMEOUT](https://github.com/curl/curl/blob/57495c64871d18905a0941db9196ef90bafe9a29/docs/libcurl/opts/CURLOPT_CONNECTTIMEOUT.md#L30-L61) | 300 s |
| [CONNECTTIMEOUT_MS](https://github.com/curl/curl/blob/57495c64871d18905a0941db9196ef90bafe9a29/docs/libcurl/opts/CURLOPT_CONNECTTIMEOUT_MS.md#L31-L62) | 300000 ms |
| [TIMEOUT](https://github.com/curl/curl/blob/57495c64871d18905a0941db9196ef90bafe9a29/docs/libcurl/opts/CURLOPT_TIMEOUT.md#L31-L63) | 0 s，传输超时默认禁用 |
| [TIMEOUT_MS](https://github.com/curl/curl/blob/57495c64871d18905a0941db9196ef90bafe9a29/docs/libcurl/opts/CURLOPT_TIMEOUT_MS.md#L31-L38) | 0 ms，传输超时默认禁用 |
| [ACCEPTTIMEOUT_MS](https://github.com/curl/curl/blob/57495c64871d18905a0941db9196ef90bafe9a29/docs/libcurl/opts/CURLOPT_ACCEPTTIMEOUT_MS.md#L30-L35) | 60000 ms，主动 FTP 等待服务端连接 |

[选项写入源码](https://github.com/curl/curl/blob/57495c64871d18905a0941db9196ef90bafe9a29/lib/setopt.c#L852-L883)将秒接口乘以 1000 后写入内部毫秒字段，毫秒接口直接写入同一字段。两个接口可以描述同一时长，但回答某个具体接口时不能互换原生值与引用。本轮没有实际发起传输或 FTP 连接。

## 工程实践与实测

在固定 Qwen3.5-0.8B Q4_0 和 llama.cpp b12359 的 CPU 环境实际执行 10 次生成，每臂 5 次。每对使用相同问题、证据、种子和解码配置，交替先后，两边都明确列出 s/ms。

| 验收项 | 短文本（5 次） | 整数与单位分字段（5 次） |
| --- | --- | --- |
| 原始数值正确 | 5/5 | 5/5 |
| 原始单位正确 | 0/5，全部漏单位 | 5/5 |
| 只给出唯一且匹配的引用 ID | 5/5 | 3/5 |
| 数值、单位、引用全通过 | 0/5 | 3/5 |

结构化路径的两条失败发生在 CONNECTTIMEOUT_MS 和 ACCEPTTIMEOUT_MS。它们数值与单位正确，但把唯一可选的 ID 重复返回两次。沿用的解码约束允许引用数组有 1 至 3 项，而验收只允许一项；原始失败完整保留，没有去重后重新评分。每题只有一个打包的合法 ID，URL 是应用渲染的，因此引用分数是输出与绑定一致性的检查，不代表模型有多个来源可独立挑选。

两个缺证据对照只移除目标记录，其余四条保持不变，两臂共四次在排名前停止，无模型调用。另算无范围限制的 top-1，两例都误选主动 FTP 的超时记录；该诊断没有生成调用。不报告速度提升。

新增冻结问题、来源定位与预声明合同，保存真实请求与响应、离线复盘和 7 项定向回归测试，更新项目 README 与 CI。项目本地共 280 项测试通过。从干净检出独立复跑了新离线计划、原始结果回放，以及 CPython 和 PostgreSQL 历史回放。

[实验与复跑](https://github.com/zjDing1024/production-rag-system/blob/edc6b0657932360f29a126ee5b8265ada03e0a69/experiments/libcurl-typed-units-v1/README.md) · [RAG 提交](https://github.com/zjDing1024/production-rag-system/commit/edc6b0657932360f29a126ee5b8265ada03e0a69) · [CI](https://github.com/zjDing1024/production-rag-system/actions/runs/46162840323)。未新建仓库；PyTorch 和 Transformer 本轮远端未改。

## 技术理解与求职价值

类型和枚举约束可以限制模型输出的形状，正确的单位、数字和出处仍要分别检验。在本组五条上，只看选项名（末尾为 `_MS` 就选 ms，否则选 s）也能猜中 5/5 单位，不能据此证明模型读取了出处。两条删除实验仍留有可推断或换算的兄弟记录；停止是「需要原选项直接来源」这项产品规则的验收，不是断言问题无解。五个选项仅覆盖连接、传输和 FTP 三类，不能据此推断跨领域正确率。两臂提示词和输出合同同时不同，不单独归因于解码约束。

这组证据面向 LLM／RAG 工程岗位，可用于说明如何设计公平对照、拆分指标、保留可审计失败并设置证据门槛。本次验证的是项目，不把助理完成的工程记录算作本人已独立掌握的技能；本人能力本轮未测，不影响继续工程。

## 下一步

结束这组超时题的重复微调。下一轮用不同文档的非后缀事实做可运行的多字段问答入口，先把单引用从数组收敛为单字段，使解码合同与严格校验一致，再评估实际正确性和拒答；不回填本轮得分。PyTorch 和 Transformer 保留先前的可运行交付。
