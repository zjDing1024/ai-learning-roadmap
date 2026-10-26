# AI Engineer Daily Report：2026-10-27

时区：Asia/Kuala_Lumpur。主题：不等长微批次的梯度累积与有效批次对照。

## 为什么做这一项

10 月 26 日的四批积压成果已经公开发布，本轮不重复发布审计或继续堆积数值诊断器。阶段 1 的训练循环仍有一个实用缺口：把多个微批次合并为一次优化器更新时，尾批和不完整累积窗口如何保持正确的损失权重。

研究对象是 [Hugging Face Accelerate](https://github.com/huggingface/accelerate) 的累积机制，结合 PyTorch 的 MSE 归一化规则与 SGD 更新机制。工程实现放在既有 `pytorch-from-zero`，成长记录保留于本仓库；不为一个相关增量另建空项目。

## 本次工程内容与实际结果

- 采用独立原创的 CPU float64 梯度累积实现，保持原有逐批次训练和历史科学记录不变。
- 对照按相同样本顺序拼接的真实有效批次，检查每次更新的参数与 momentum 状态，而不仅检查最后一个 loss。
- 验收覆盖尾批、不完整末窗口，以及“微批次均值再平均”和“固定除数缩放尾窗口”的错误对照。具体可复查结果：3 个种子 × 3 个设置共 9 个 case 均通过逐更新参数与 momentum 对照，最大绝对差 2.22e-16；两类错误归一化对照均被检出。另用手工仿射梯度和手工 SGD 更新验证 96 个配置 × 4 个 epoch，最大差 4.44e-16，符合预声明的 1e-12 标准；该独立检查与单元测试分开计数。
- 本次实际运行的测试、命令行与安装验证：本地主套件 920 项（257.90 秒）及三个独立套件 59 + 45 + 34 项，共 1,058 项测试通过，其中新增 40 项；干净非 editable wheel 在源码目录之外、隔离导入下完成 9 个 CLI；Ruff lint 与 97 个 Python 文件格式检查通过。本地没有运行 Docker，实际容器结果以远端 CI 为准。首轮 918 通过 / 1 失败来自旧“8 个 CLI”清单断言，窄修复后已完整重跑，未修改算法或科学标准。

以上测试仅说明记录范围内的工程行为；10 月 26 日的旧测试不计为本轮新执行结果。

## 可复查文件与运行入口

工程文件与验证入口：

- [训练实现](https://github.com/zjDing1024/pytorch-from-zero/blob/db976faca4dbcc399923cd0d6fe137d39bef2cbc/src/pytorch_lab/accumulation.py)与[对照实验 CLI](https://github.com/zjDing1024/pytorch-from-zero/blob/db976faca4dbcc399923cd0d6fe137d39bef2cbc/src/pytorch_lab/accumulation_cli.py)。
- [自动化测试](https://github.com/zjDing1024/pytorch-from-zero/blob/db976faca4dbcc399923cd0d6fe137d39bef2cbc/tests/test_accumulation.py)与[工程协议](https://github.com/zjDing1024/pytorch-from-zero/blob/db976faca4dbcc399923cd0d6fe137d39bef2cbc/docs/gradient-accumulation.md)。
- [原始实验 JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/db976faca4dbcc399923cd0d6fe137d39bef2cbc/results/2026-10-27-gradient-accumulation.json)与[执行验证记录](https://github.com/zjDing1024/pytorch-from-zero/blob/db976faca4dbcc399923cd0d6fe137d39bef2cbc/results/2026-10-27-gradient-accumulation-verification.md)。

本轮实际对照覆盖种子 42、7、123 与三组 `(样本数, 微批次上限, 累积步数)`：`(23, 5, 3)`、`(11, 4, 2)`、`(10, 4, 3)`。每组 3 个 epoch，3 输入 / 2 输出的仿射模型，SGD learning rate 0.03、momentum 0.8、weight decay 0.01。比较容差事先限定为该 CPU float64 实验的 `atol=1e-12, rtol=1e-12`，不视为一般误差上界。实际执行和负对照结果以上方记录为准。

在按工程 README 完成安装后，可选择尚不存在的结果文件运行：

```bash
python -I -m pytorch_lab.accumulation_cli --output results/local-accumulation.json
```

该命令仅是复现入口；本轮实际执行结果见验证记录，不把展示命令计作已运行。

## 技术理解

对窗口中的第 j 个微批次，先求平方误差之和 S_j。窗口目标是所有误差之和除以实际目标元素总数 M，即 L = sum(S_j) / M。MSE 的均值分母包含输出维度，固定 K 个输出时 M = 样本数 × K，不能一律只除以行数。

本轮采用先累积各微批次的求和损失梯度、到窗口边界再统一除以 M 的设计。边界只执行一次 `optimizer.step()`，随后清空梯度；末窗口按实际收到的数据结束。逐微批次更新 momentum 会改变优化轨迹，即使最终处理的样本总数相同。

例如 23 个样本、微批次上限 5、每 3 个微批次更新一次，两个有效窗口为 15 和 8。末窗口的两个微批次大小为 5 和 3；其均值损失应按 5/8、3/8 加权，而不是各占一半。这个例子用于解释验收设计，实际运行数值以结果记录为准。

## 来源、许可与独立实现

- [Accelerate 官方梯度累积指南](https://huggingface.co/docs/accelerate/usage_guides/gradient_accumulation)，重点阅读可变样本大小的归一化问题。
- 固定版本 [accelerator.py](https://github.com/huggingface/accelerate/blob/8c83b448d19f6356d4facd65c1d4763bf9fa51b2/src/accelerate/accelerator.py) 与 [Apache-2.0 许可证](https://github.com/huggingface/accelerate/blob/8c83b448d19f6356d4facd65c1d4763bf9fa51b2/LICENSE)。只研究机制，不复制上游代码，也未增加 Accelerate 运行时依赖。
- [PyTorch MSELoss](https://docs.pytorch.org/docs/2.14/generated/torch.nn.MSELoss.html)、[SGD](https://docs.pytorch.org/docs/2.14/generated/torch.optim.SGD.html)。完整推导、源码阅读和适用范围见[来源笔记](../../notes/深度学习笔记/2026-10-27-gradient-accumulation.md)。

## GitHub 交付

- 工程：[本次精确提交](https://github.com/zjDing1024/pytorch-from-zero/commit/db976faca4dbcc399923cd0d6fe137d39bef2cbc)。
- 对应该 SHA 的 [CI 运行](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/40357413110)：成功。精确提交的 source 作业通过 920 + 59 + 45 + 34 = 1,058 项测试、9 个 CLI、Ruff lint 和 97 个文件格式检查；主套件耗时 261.29 秒。实际 Docker 容器完成 9 个 CLI，未运行完整测试套件；两路结果 artifact 均已上传。
- 本日报所属成长仓库提交以 Git 历史为准，不预填自己的未来 SHA。

## 求职价值、已验证与待自测能力

这项材料用于展示训练循环中的数值计算规则、优化器更新粒度、边界测试和有意义的错误对照，适合 AI / ML 训练工程案例。验证对象是助理实现的产物；学习者个人是否能够独立实现、讲解或调试仍待验证。

建议本人不看代码推导 5+3 尾窗口的权重，重写最小循环，预测 optimizer/zero_grad 的调用次数，再构造一个能抓住错误分母的反例并保留失败及修复证据。未完成这些自测前，不标记“已掌握梯度累积”。

## 不足与下一步

- 结论限于实际验证的 CPU float64、逐样本可分的无随机层模型与 MSE/SGD 范围；不把数值近似相等写成任意环境逐位相等。
- 未验证 BatchNorm、Dropout、AMP、DDP、梯度裁剪或中途累积状态恢复；没有 GPU 显存节省、吞吐提升或任务精度提升数据。
- 不对 Wine 已观察测试集继续选参，不修改既有 strict / 8-ULP 失败及历史归因边界。
- 下一步优先本人独立自测；后续工程只选择一个明确问题，例如累积窗口内中断的恢复契约，先定义状态与失败边界，再决定是否实施，不把本轮结果自动推广过去。
