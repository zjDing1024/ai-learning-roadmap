# AI 学习路线

路线依据：用户的长期公开 AI Engineer Portfolio 目标。推进依靠验收结果，暂不编造学习者时间预算或熟练程度。

## 阶段 1：基础工程与 PyTorch

顺序与输出：

1. **起点诊断**：Python 函数/类/类型与测试、Linux 文件/进程、Git 分支/冲突、线性代数与求导、NumPy 向量化。根据自测补缺口，避免重复已掌握内容。
2. **Tensor / Autograd**：shape、stride、存储共享、广播、链式法则、梯度累加、原地修改。首个增量已实现并运行，个人自测待完成。
3. **训练核心**：nn.Module、Dataset、DataLoader、Loss、Optimizer、Scheduler、训练/验证模式与小批次统计。已完成Module、Dataset/DataLoader、小批次SGD、模式与尾批加权，保留手写基线并运行三种子对照；个人自测待完成，Scheduler尚未实现。
4. **工程可靠性**：配置、日志、seed、异常路径、checkpoint恢复、依赖管理、测试和CI；再加入Docker。同日第三增量已加入固定CPU float64仿射实验的完整epoch边界恢复，保存模型、momentum优化器、配置、历史及两个局部Generator；三种子新进程恢复参数差均为0，本地及精确提交远程CI各319项测试与三条CLI通过，已完成公开发布。仅加载可信文件，不支持mid-batch、AMP、GPU、DDP或scheduler；最新完整测试与发布证据见[当日日报](../daily-learning/2026-10-08/README.md)，个人独立恢复能力仍待自测。
5. **数据工具与数学补强**：NumPy/Pandas、划分与泄漏、统计和误差分析；用实际项目问题决定补课深度。
6. **GPU 与规模化**：CUDA 基础、AMP、正确计时、显存分析、分布式训练。先确认可用环境和成本，不捏造 CPU 环境未测的结果。

主要输出：[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)。

阶段门槛：能够独立解释和改写训练循环，排查形状/梯度问题，恢复中断训练，设计公平基线并复现实验。代码能运行、测试覆盖失败路径、README 完整，并有个人独立验证记录。

## 阶段 2：深度学习模型与论文复现

按复杂度研究 CNN → RNN/序列建模 → Transformer → ViT → Diffusion。每个选题必须先回答“哪条假设/结构值得复现”，避免只堆名字。

流程：论文阅读 → 官方或高质量实现阅读 → 独立写核心代码 → 在明确任务和预算下比较 → 分析设计取舍、复现偏差与失败结果。

候选项目：cnn-from-scratch、transformer-from-scratch、bert-reproduction、diffusion-study。只在有独立工程内容时建仓，不提前创建空项目。

阶段门槛：可复查的论文笔记、实现对应关系、基线、指标、消融或误差分析；解释结果差异而不宣称未达到的论文性能。

## 阶段 3：现代 AI 工程

主题：LLM、Embedding、RAG、向量数据库、知识图谱、Agent、多 Agent。根据项目需要研究 Hugging Face、LangChain、LlamaIndex、AutoGen、CrewAI、OpenAI Agents SDK；不把工具清单等同学习成果。

工程重点：数据摄取与版本、检索评估、失败归因、提示/模型配置、权限和安全、缓存、可观察性、成本与延迟、离线评估和回归测试。比较自建小基线与框架实现，阅读实际调用链。

候选项目：production-rag-system、agent-framework、multi-agent-platform。涉及外部 API 或算力费用时，先确认预算与权限。

阶段门槛：系统有可评估的真实用途，能解释为何选此架构；模型质量、成本、延迟和故障表现有实际证据。

## 阶段 4：高级方向

根据前三阶段结果和岗位侧重选择：LLM Training、Fine-tuning、LoRA、RLHF/DPO、量化、模型压缩、分布式、推理优化、AI Infrastructure、多 Agent 协调。不同时推进全部方向。

门槛：问题明确、比较公平、资源可控、结论可重复，技术贡献足以区别于普通教程；根据发展持续更新路线。

## 每日工作协议

1. 查找一个对当前瓶颈有帮助的优秀项目，以质量、结构、维护活动和技术价值筛选。
2. 记录名称、URL、作者/维护者、问题、技术、结构、可学部分、当前阶段适配与可借鉴设计。
3. 学习材料进入本仓库；独立可运行成果进入项目仓库。
4. 至少完成源码阅读、代码/测试、实验验证、项目扩展或实质文档改进之一。
5. 更新 README、结构和规范 commit；记录实际远程状态。
6. 用日报总结证据和缺口。优先闭合当前实验，再考虑新框架。
