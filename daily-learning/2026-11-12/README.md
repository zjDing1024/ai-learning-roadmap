# AI Engineer Daily Report

日期：2026-11-12。主题：加速路线第一步，三条工程线并行启动。

## 路线调整

从长期停留在同一小模型的细节验证，调整为三条有明确产物的工作线：收敛 PyTorch 主运行路径；建立 Transformer 核心模块；建立 RAG 数据与检索评测基础。第1天启动、第2至3天形成可运行版本、第4至7天增强项目说服力是目标节奏，不是已完成事项或无条件交付保证。本记录按实际验证与远端状态区分成果，不把计划写成已掌握的能力。

## 1. PyTorch：训练到预测主路径

**已发布**：[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)，工程commit [d81080d81c2ffdf6db7e699c6903ccd5e142f538](https://github.com/zjDing1024/pytorch-from-zero/commit/d81080d81c2ffdf6db7e699c6903ccd5e142f538)，main与18个变更文件blob已核验。

首页改为安装和一条可执行主路径，历史README逐字节归档到同目录README.history.md，旧链接和历史实验保留。新增wine_pipeline_cli组合现有组件：训练一次→复用validation评估→导出产物→新进程批量预测。不是增加一个模型变体或继续扫描参数。

固定已有mlp16／seed42／20轮，140更新、2140样本访问，36/36预测成功，5项产物与预测一致性核对通过。validation CE=0.05811863818000037，accuracy=35/36，macro-F1=0.974320987654321；复用验证集只提供描述值，不是新鲜泛化证据或模型改进。新主路径评分0条test数据，旧回归中历史benchmark的评分不用于本轮选择。

本地完整主套件2067通过（814.45秒），加59／45／34独立测试共2205项唯一测试。7项新集成测试已含在主套件中。Ruff／format／compileall通过，新建隔离非editable wheel主路径也通过，source与wheel模型digest相同；没有本地Docker，未在本地重跑全部26个历史installed CLI。首次未限制线程的全套因进展缓慢中断，不称通过，最终显式单线程完整重跑，耗时不是性能基准。

[运行说明](https://github.com/zjDing1024/pytorch-from-zero/blob/d81080d81c2ffdf6db7e699c6903ccd5e142f538/docs/project-path.md) · [原始结果](https://github.com/zjDing1024/pytorch-from-zero/blob/d81080d81c2ffdf6db7e699c6903ccd5e142f538/results/2026-11-12-project-path.json) · [验收记录](https://github.com/zjDing1024/pytorch-from-zero/blob/d81080d81c2ffdf6db7e699c6903ccd5e142f538/results/2026-11-12-project-path-verification.md)。

[精确提交CI #43152702049](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/43152702049) 已完成且 **success**，head为d81080d81c2ffdf6db7e699c6903ccd5e142f538，source与installed-cpu-container两作业成功，新增完整主路径步骤均成功。实际source日志主套件2067项通过（305.96秒），另59／45／34独立测试通过，共2205项；Ruff、26个既有CLI与新完整路径成功。容器成功不等于在容器运行了2205项全量pytest，不将源码测试数量移作容器证据。

学习记录首次发布[29487de0dc5d2fb0d2dfa312d806e70cb6091b02](https://github.com/zjDing1024/ai-learning-roadmap/commit/29487de0dc5d2fb0d2dfa312d806e70cb6091b02)已核验main及4个变更文件正文。本次补记只更新本日报的CI实际终态；两个新项目仍以各自下节的待发布状态为准。

## 2. Transformer：核心模块

**本地已实现并验证，公开仓库尚未创建，等待针对新公开仓库的确认**。项目transformer-from-scratch，本地commit20fe3003fbfc8a0b555308e49e601f101404f957，无已发布仓库链接或远端CI证据。

原创实现scaled dot-product attention、多头注意力、sin/cos位置编码、LayerNorm、残差、FFN和post-norm encoder block。理论来源为Vaswani等的 [Attention Is All You Need](https://arxiv.org/abs/1706.03762)，对照PyTorch官方API与源码，未复制实现或论文图表；原创项目采用MIT，依赖与参考保留各自许可。

52项CPU测试通过，Ruff、compileall和隔离安装wheel验证通过，项目外执行JSON逐字匹配源码。独立复核发现外层autocast可使低精度attention绕过float32中间计算并产生NaN，已修复并加入回归；独立7项复核已通过；上报的最终测试总数为52项，不另将复核运行累计为新增测试。float64参考前向最大误差6.66e-16、梯度误差4.44e-16。

2343参数合成smoke运行10步，loss从2.055674降至1.465322，只证明前向／反向／更新连接，不是论文复现、语言理解或真实任务效果。尚无完整encoder-decoder训练或WMT／BLEU结果。全遮罩行、padding及布尔mask语义均明确限定，未宣称CUDA AMP已验证。

## 3. RAG：数据、关键词检索与评测基础

本地已实现 `production-rag-system` 的检索基础：原创标准库导入器、固定180词窗口／40词重叠切分、倒排索引BM25、引用定位、CLI和评测。不调用LLM或embedding，不生成答案，仓库命名不表示已有生产级RAG。

使用 [Flask 3.1.0官方文档](https://github.com/pallets/flask/tree/ab8149664182b662453a563161aa89013c806dc9/docs) 的6篇文件，共99096字节，许可BSD-3-Clause；固定上游commit与文件校验，生成91个保留原文字符／行号位置的chunk。研究 [Lucene BM25Similarity](https://github.com/apache/lucene/blob/releases/lucene/9.12.0/lucene/core/src/java/org/apache/lucene/search/similarities/BM25Similarity.java)，来源Apache Lucene、Apache-2.0；借鉴评分公式与职责分离，原创实现，不宣称与Lucene结果等价。

预先固定22个开发问题：18可答、4不可答。Hit@1=12/18，Hit@3=16/18，Hit@5=17/18，MRR@5=0.7916667；中文问题未命中，3/4不可答问题仍返回片段。数据集作者可见语料，因此不是独立留出评测，也没有答案正确率、幻觉率或拒答能力证据。

34项源码unittest通过，新建独立环境安装wheel后同34项通过，完整评测JSON逐字节复现，不能累计成68种测试。单机220次暖检索median0.199ms／p95 0.304ms，单次load＋chunk＋index为29.65ms；不含进程启动、磁盘输出或模型调用，不作生产SLA。

发布状态：**仅本地完成，公开仓库尚未创建，等待针对新公开仓库的确认**。本地commit为55a7c5a8e2aa4267baa5f928b861f81e51e89529；源码与说明已打包供交付。没有可核验的远端仓库或远端CI，不给出假仓库链接。独立审查在当前声明范围内无阻断问题，尚未验证大规模语料、并发服务或生成环节。

## 工程价值与边界

三条线分别补齐“可运行交付”“模型机制实现”“检索应用评测”，避免将长测试列表当作唯一作品价值。测试通过证明限定输入与实现合同，并不自动证明个人熟练掌握、论文完整复现或生产系统能力。新项目名称只是目标定位，不据此宣称生产成熟度。

## 下一阶段

在已验证基础上，Transformer接入有目标函数的微型训练与基线；RAG补检索误差分析并逐步接入回答生成；PyTorch聚焦清晰使用路径与必要维护，不再为提交数量重复拆小实验。模型接入、环境或权限缺口会明确列出，未执行的下一阶段不计为当前成果。

## 学习仓库记录

基于远端5b569329f19553d757d2e5d7022d61946f90663e整理，保留历史日报和当时的结论。本轮新增11月12日记录，并更新首页、路线和实验索引。只发布本任务原创代码及技术资料，不公开既有私有仓库内容、凭据或个人敏感信息；不购买算力或使用收费资源。
