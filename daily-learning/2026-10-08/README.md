# AI Engineer Daily Report

日期：2026-10-08，Asia/Kuala_Lumpur（UTC+08:00；本次执行对应 UTC 日期同为 2026-10-08）。

执行方式：AI 助理准备与验证工程材料；个人掌握程度尚待学习者独立自测。

## 今日学习主题

阶段 1：Tensor 的 shape/stride 与存储共享、广播反向、Autograd 累加、MSE 梯度推导、可复现训练与输入边界。

## 今日研究项目

- 项目：PyTorch
- GitHub：https://github.com/pytorch/pytorch
- 作者：PyTorch Team 与社区贡献者
- 解决问题：张量计算、自动微分与神经网络训练基础设施
- 核心技术：张量布局、动态图自动微分、Python/C++ 接口与底层算子
- 代码结构：torch Python API；torch/csrc 自动微分等 C++ 实现；aten 张量算子；tools/autograd 导数规则；docs 文档
- 技术价值：把 API 行为、数学预期和源码接口连起来，减少形状及梯度误用
- 阅读范围：v2.5.1 固定提交的 backward/grad、引擎入口和少量布局/广播片段；另补查运行环境 2.14.1+cpu 的 Python 累加标志
- 当前阶段适配：无需大模型或 GPU，即可验证训练核心概念
- 借鉴到项目：显式输入契约、累加与返回梯度的区别、布局实验和广播梯度测试

完整版本边界和官方链接见 [源码阅读](../../notes/深度学习笔记/2026-10-08-pytorch-source.md)。没有复制上游实现代码，也没有宣称读懂完整 C++ 引擎。

## 今日完成内容

### 代码

独立工程 [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)：

- 原创张量布局/广播/梯度累加实验
- 仿射 MSE、解析梯度、中心差分与 Autograd 对照
- CPU float64 训练循环、独立 96/32/32 数据划分、均值预测和最小二乘基线
- CLI 输出原始 JSON，拒绝覆盖已有证据，异常返回非零退出码
- 52 项测试，覆盖多输出、非连续输入、坏维度、NaN/Inf、确定性和 CLI
- 依赖声明、src 布局、CI 配置、ruff 和文档

### 文件

成长仓库新增路线、技能地图、当前能力分析、源码笔记、实验索引、论文阅读规范与当日日报。工程仓库新增 src、tests、examples、docs、requirements、README、结果记录和 CI 配置。

### 实验

已在 Linux/Python 3.12.14/PyTorch 2.14.1+cpu 上运行；无 CUDA。配置、时间和完整数据保存在工程 `results/2026-10-08-cpu.json`。

| 项目 | 实测 |
|---|---:|
| 解析梯度 vs Autograd 最大绝对误差 | 5.55e-17 |
| 中心差分 vs Autograd 最大绝对误差 | 8.99e-10 |
| 训练 MSE，初始 → 200 步 | 7.805889 → 0.003311 |
| 验证 / 测试 MSE | 0.002961 / 0.004406 |
| 训练均值基线的测试 MSE | 3.891327 |
| 梯度下降与最小二乘参数最大差距 | 3.56e-14 |

pytest 52 项、ruff 检查/格式、pip check、完整 CLI 通过。独立复核还按 README 在无 system-site-packages 的新环境完成安装与同样检查，测试 MSE 一致。原始检查命令见工程验证日志。

## 技术理解

### 今天真正掌握

**学习者：待自测，尚无独立掌握证据。** 本次已经由运行结果核验的技术事实：

- 多输出 MSE 对 N×K 个元素求均值，解析梯度必须保留 K 的缩放。
- 偏置共享到多行时，反向把这些行的贡献相加。
- 两次独立前向后反向会累加叶子 `.grad`；累加不等同于保留同一次计算图。
- 本例转置共享存储，直接展平 view 失败，reshape 产生副本；不能无条件推广到所有布局。
- 参数值有限仍可能在平方损失中溢出，需要检查计算结果。

### 遇到的问题与修复

初始运行环境缺少 PyTorch，已从官方 CPU 源安装并验证。独立审查发现超大学习率可能让有限输入的损失溢出；已显式拒绝非有限损失并增加三个回归测试。临时依赖快照不是完整锁文件，最终采用固定顶层版本并明确边界，未提交本地绝对安装路径。

## GitHub 变化

- 新增公开仓库：ai-learning-roadmap、pytorch-from-zero
- 新增文件：上述成长记录与可运行工程文件
- 首次成长记录 Commit：[672116e4238a6d5460631b76bd1f8f5b561e9710](https://github.com/zjDing1024/ai-learning-roadmap/commit/672116e4238a6d5460631b76bd1f8f5b561e9710)，已核对 main 与全部 9 个文件的内容哈希。本报告的发布证据补记属于后续独立文档提交。
- 首次工程 Commit：[00d55e32293ab91456cc0e36f25b02be5455bb6f](https://github.com/zjDing1024/pytorch-from-zero/commit/00d55e32293ab91456cc0e36f25b02be5455bb6f)，已核对 main 与全部 22 个文件的内容哈希。
- 远程 CI：以上工程提交的 [CPU checks #37745868861](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37745868861) 已成功完成。依赖和项目安装、Ruff 检查/格式、52 项测试及 CLI 的 10 项实验断言全部通过；测试保留 1 条未安装可选 NumPy 的警告。成长仓库未配置工作流，不将“无运行”表述为 CI 通过。

## 求职价值分析

- 对应岗位：AI/ML/Deep Learning Engineer 的基础工程部分
- 体现材料：数学与实现对照、可失败测试、数据隔离、原始证据与诚实局限说明
- 当前限制：仅小型合成线性问题，无生产数据、GPU、部署、恢复或真实性能评估；不能单凭本增量证明岗位胜任力

## 当前能力变化

- 新增工程证据：有一个能独立运行和复核的 PyTorch 基础实验项目
- 个人新增技能：等待自测后确认
- 不足：起点能力与学习时间未知；nn.Module、DataLoader、Optimizer/Scheduler、checkpoint、CUDA 等尚未完成

## 明日计划

- 学习：先完成梯度、广播、布局与训练循环自测；根据结果补 Python/数学短板
- 工程：将当前数学基线扩展为 nn.Module + Dataset/DataLoader 的小批次训练，并增加参数注册、模式切换与损失加权测试
- 原因：现有全批次基线已建立，下一步需要把数学正确性迁移到可扩展训练结构
- 完成门槛：保留基线可比较，新增实现真实运行并有失败路径测试；未执行的计划不标完成
