# AI Engineer Daily Report

日期：2026-11-08（Asia/Kuala_Lumpur，UTC+8；本轮执行开始于11-07 UTC）。

## 今日学习主题

把上一轮选定的 Wine 训练配置变成可独立重载的推理产物：将模型权重、训练集标准化、输入特征顺序和类别映射绑定，验证文件往返与新进程预测，并拒绝错误输入。不继续搜索调度参数，不新增一次验证排名。

## 今日研究项目

[PyTorch v2.14.1](https://github.com/pytorch/pytorch/tree/v2.14.1)，由 PyTorch 社区与贡献者维护。其 nn.Module 提供模型参数／缓冲状态与模块模式，适合当前阶段从训练循环过渡到可靠推理交付。

实际阅读 [torch/nn/modules/module.py](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/nn/modules/module.py) 的 load_state_dict 与 eval：strict=True 要求状态键匹配，但并不替应用验证特征语义、预处理或类别映射；eval 等价于 train(False)，不是关闭梯度记录。可借鉴的是参数状态与执行模式分开处理，外层显式定义输入和产物合同。[官方许可证](https://github.com/pytorch/pytorch/blob/v2.14.1/LICENSE) 为 BSD 风格及组件声明。实验实现与笔记为原创，不复制上游源码。

## 实际完成代码、文件与结果

工程仓库：[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)。

- [wine_model_bundle.py](https://github.com/zjDing1024/pytorch-from-zero/blob/aca507c1e6569e81acd0aa1700314590c34f48ab/src/pytorch_lab/wine_model_bundle.py)：固定模型训练、严格JSON产物解析、元数据／张量形状检查、原始特征预测。
- [wine_model_bundle_cli.py](https://github.com/zjDing1024/pytorch-from-zero/blob/aca507c1e6569e81acd0aa1700314590c34f48ab/src/pytorch_lab/wine_model_bundle_cli.py)：训练导出验证与读取bundle／request执行推理两种路径，新进程从实际文件重载，不覆盖已有输出。
- [冻结协议](https://github.com/zjDing1024/pytorch-from-zero/blob/aca507c1e6569e81acd0aa1700314590c34f48ab/docs/wine-model-bundle-plan.json)与[原始报告](https://github.com/zjDing1024/pytorch-from-zero/blob/aca507c1e6569e81acd0aa1700314590c34f48ab/results/2026-11-08-model-bundle.json)：记录完整bundle、预测、实际工作与对照结果。
- [学习笔记](../../notes/深度学习笔记/2026-11-08-model-bundle.md)：区分推理产物、训练checkpoint、完整性与来源真实性；路线／实验／能力索引同步更新。

沿用此前验证选定的 mlp16／constant／epoch20，具体种子预先固定42，即已有种子列表第一项，**不是按验证分数选择最优种子**。这次重新训练一个明确配置，不是声称找回上一轮未保存模型。CPU float64、batch16、SGD lr0.05、momentum0.9、weight_decay0.0001，107训练行拟合标准化。

实际 **140次更新、2140次训练样本访问**。对107训练行做推理一致性检查，不计算本轮验证／测试分数。新进程重载后的logits与训练进程参考相同；新进程与同进程重载的完整预测相同。输出包括logits、softmax概率、类别索引与名称；概率不是已经校准的可信度，预测相同也不是泛化证据。

产物使用严格JSON、确定序列化后的payload SHA-256，不使用pickle模型反序列化。合同限制文件最多1000000字节、请求1至1024行且每行13维、数值有限且绝对值不超过1000000；拒绝重复JSON键、NaN／Infinity、布尔数值、错误顺序、错误字段／形状、过小scale和已有输出覆盖。特征名称与顺序必须精确对应，调用方仍要提供原始测量单位。数值界限不等于科学合理性或分布外检测，调用方也可能错误标注列名。训练过程仍加载并验证完整公开CSV，不能声称从未读取测试集字节，只能说本轮未使用其评分或特征训练。

独立审查核对本次模型与11-07相同seed终点的参数摘要相同，训练mean／scale只由训练行计算，污染非训练特征不改变导出；手写融合addmm前向核对logits与概率、RNG不变，并覆盖重新计算摘要后的非法metadata／shape等拒绝分支。真实优化器与CE调用也被计数，而非只相信报告字段。

[独立模型文件](https://github.com/zjDing1024/pytorch-from-zero/blob/aca507c1e6569e81acd0aa1700314590c34f48ab/results/2026-11-08-wine-model.json)、[107行公开请求样例](https://github.com/zjDing1024/pytorch-from-zero/blob/aca507c1e6569e81acd0aa1700314590c34f48ab/results/2026-11-08-wine-request.json)与[预测文件](https://github.com/zjDing1024/pytorch-from-zero/blob/aca507c1e6569e81acd0aa1700314590c34f48ab/results/2026-11-08-predictions.json)一并保留，可用CLI实际重载，不只在报告中展示摘要。

## 技术理解

1. 权重文件不足以定义预测函数。原始输入必须经过训练时的mean／scale，13列顺序与输出类别顺序也是模型接口的一部分；仅形状正确可能依然得出错误答案。
2. state_dict 的键匹配不等于业务schema匹配。外层合同负责schema版本、dtype、特征与类别、固定配置、训练行身份和数值范围，之后才构建固定模型并严格加载。
3. SHA-256能检出未同步修改摘要的损坏，**不能证明发布者身份**。攻击者可同时改payload与摘要；字段合规且重新计算摘要的权重仍可能被接受，不把此方案称为签名、可信来源校验或通用恶意模型防护。
4. eval与no_grad承担不同责任，前者切换模块行为，后者关闭本次梯度记录。推理bundle只含预测所需状态，不含优化器／scheduler／训练游标，不具备训练恢复合同。
5. 本轮新进程往返证明限定环境下可重新构造预测，不保证其他运行时逐位一致，也不等于持久化写入的崩溃原子性或在线服务可用性。

## 验收与 GitHub 变化

本地完整主套件 **2003 passed，388.83秒**；另独立59／45／34项分别4.91／5.26／1.037秒通过，共 **2141项唯一测试**。新增20项核心测试与23项独立审查已包含在2003内，不重复累计。Ruff lint／format按既有历史冻结文件排除规则通过，compileall与pip check通过；Python3.12.14、PyTorch2.14.1+cpu。

首次完整套件1978通过、2失败（396.37秒），两个旧断言仍要求24个CLI，更新准确25入口列表后完整重跑通过。独立oracle初次使用matmul加bias而非融合addmm，观察1.78e-15运算差异，修正为匹配的融合公式后严格通过，没有扩大容差。独立套件初次相对解释器路径错误，未执行测试；改正后全部重跑。全树lint初次包含原已排除的历史冻结源码，使用既有CI排除规则而非重写历史。

最终重建并安装非editable wheel后，59个包源码／数据文件与source逐字节一致，从无关目录实际执行全部25个已安装CLI通过。最终完整bundle实验JSON在本机与source完全相同。巨大整数拒绝顺序修正已包含在最终源码与wheel中。没有安装环境全量pytest或本地Docker，不能将主套件测试数称为安装环境测试数。

[完整本地验收](https://github.com/zjDing1024/pytorch-from-zero/blob/aca507c1e6569e81acd0aa1700314590c34f48ab/results/2026-11-08-model-bundle-verification.md)。旧全套Wine测试另行执行既有固定test评分，不能写成本轮导出实验新增的准确率或选择依据。

工程提交：[aca507c1e6569e81acd0aa1700314590c34f48ab](https://github.com/zjDing1024/pytorch-from-zero/commit/aca507c1e6569e81acd0aa1700314590c34f48ab)。学习仓库基线b835d71d684761d0516f3a075e03313aba8aa1aa，已核对最新11-07记录，无11-08重复日报。历史日报保留，仅新增本轮原创技术资料与索引；未公开私有内容、凭据或个人敏感信息，未使用收费资源。新增独立仓库：无，成果继续深化现有工程仓库。

工程main已核验为上述SHA，27个修改／新增文件的blob与mode与本地一致，远端共424文件。

[精确提交CI #42390607209](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/42390607209) 已完成且 **success**，source与installed-cpu-container两作业均成功。

- 远端source主套件2003通过（327.21秒）；独立59／45／34项分别4.25／4.41／1.031秒通过，共2141项。25个source CLI执行成功。
- 真实container内25个已安装CLI全部通过，不将source测试数记成容器全量pytest。
- source artifact 13581547183实际下载，包含27个JSON，ZIP SHA-256为476cb7cf829cfd34d6eed73ecc800af1e696c4e59e53f214e04d85a84ca75fb4；container artifact 13581378105实际下载，ZIP SHA-256为a849fb78fe9766610ee7aab3d2978f1a299d898360c5146d5963e7091c91210b。两者均与API摘要匹配并通过ZIP CRC检查。
- source／container新bundle检查均通过，140更新／2140训练访问、107行推理往返；本次source新bundle完整JSON与本地／container相同。只描述这次核验，不保证其他硬件、版本或未来执行逐位一致。没有新增留出评分、吞吐或泛化结论。

学习记录初次发布 [19c5afc526429de8c27078f17f1cc28a2675d49d](https://github.com/zjDing1024/ai-learning-roadmap/commit/19c5afc526429de8c27078f17f1cc28a2675d49d) 后，59个远端文件blob均与本地内容一致。本次补记仅更新本日报的实际CI终态，学习仓库没有工作流，不声称其CI通过。

## 求职价值与能力边界

对应 AI Engineer／ML Engineer 的模型交付、训练与推理一致性、数据接口设计和失败处理能力，价值在于将“能训练”推进到“能重新加载并检查输入”。本轮验证的是代码和交付流程，不将助理完成的工程自动表述为个人已熟练掌握。

不足包括单一小数据集、固定模型／schema、无独立新数据评估、无概率校准、无签名信任链、无通用checkpoint迁移或GPU／AMP／分布式证据。尚未部署线上服务，不宣称生产安全、性能或SLA。

## 明日计划

下一项为小型批量推理接口：给出明确的逐请求错误，测量端到端成本，并把解析／验证／标准化与模型前向成本分开，不使用已经复用的验证分数追逐优化。保留现有固定推理合同，先验证实用输入与错误处理，不提前扩张线上服务。该项尚未实施。
