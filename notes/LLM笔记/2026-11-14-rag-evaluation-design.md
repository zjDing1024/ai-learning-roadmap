# RAG 评测设计：检索相关，不等于证据充分

## 阅读对象

IBM RAGWorkbench，由 Matan Orbach、Assaf Toledo、Benjamin Sznajder、Odellia Boni 等维护，开源许可 [Apache-2.0](https://github.com/IBM/RagWorkbench/blob/98cc965b079f332ce27fc7ad87be6fcce69e1931/LICENSE)。这是评测编排框架，不是部署栈。本轮源码阅读固定在 [98cc965b](https://github.com/IBM/RagWorkbench/tree/98cc965b079f332ce27fc7ad87be6fcce69e1931)；未安装或运行上游项目，不引入其依赖或代码。

- [实验编排](https://github.com/IBM/RagWorkbench/blob/98cc965b079f332ce27fc7ad87be6fcce69e1931/src/ragworkbench/experiment.py) 将入库产物交给推理流程；评测再用逐题结果和数据集真值计算各自的指标，保留逐题分数和汇总，而不只给一个总分。
- [推理输出](https://github.com/IBM/RagWorkbench/blob/98cc965b079f332ce27fc7ad87be6fcce69e1931/src/ragworkbench/api/inference_result.py) 将回答、上下文 ID、上下文正文、执行轨迹及模型调用分开。上下文 ID 能追踪返回了什么，不等于该片段能支持答案。
- [指标注册表](https://github.com/IBM/RagWorkbench/blob/98cc965b079f332ce27fc7ad87be6fcce69e1931/src/ragworkbench/eval/metric_defs.yaml) 区分检索排序指标（如 MRR、MAP）与回答指标（如 BERTScore）。把两者混合就难以定位失误发生在检索还是生成。

## 本项目如何采用

当前只评检索：冻结语料、分块和用例，记录策略、证据 ID、名次和空/非空；分别看可答题的证据命中、相关但不充分和缺失题的候选返回。借鉴 [Sufficient Context（ICLR 2025）](https://arxiv.org/abs/2411.06037) 的关键区分：问题在全集中能回答，不等于当前 top-k 足以回答；相关片段不等于充分证据。本项目不用作者的打分器，亦不把少量自编题称为独立基准。

后续加生成时，应另测答案是否正确、每条引用是否真正支持对应论断，以及证据不足时是否拒答。配对控制在相同语料、相同问题和相同 k 下切换检索策略；以两个语言的绝对分母报告结果。英语与中文是语义配对，不能当成相互独立样本。保留失败样本，不用冻结评测集调阈值后再把原分数称为泛化。
