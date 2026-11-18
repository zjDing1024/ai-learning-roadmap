# 证据作用域与推理进程内存的测量边界

## Linux：为什么两个峰值不是同一件事

维护方：Linux 内核社区。参考固定版本 [v6.18](https://github.com/torvalds/linux/tree/v6.18)、
[许可说明](https://github.com/torvalds/linux/blob/v6.18/COPYING)（GPL-2.0 WITH Linux-syscall-note；
各文件可能另有兼容声明）。只研究接口与行为，未复制内核代码。

- [fs/exec.c](https://github.com/torvalds/linux/blob/v6.18/fs/exec.c#L796-L850) 换地址空间时保留旧地址空间峰值；
  [kernel/sys.c](https://github.com/torvalds/linux/blob/v6.18/kernel/sys.c#L1783-L1824)
  的进程自身资源使用统计还会考虑当前地址空间峰值。
- [fs/proc/task_mmu.c](https://github.com/torvalds/linux/blob/v6.18/fs/proc/task_mmu.c#L1682-L1688)
  中 mode 5 只重置当前地址空间峰值。[/proc 文档](https://github.com/torvalds/linux/blob/v6.18/Documentation/filesystems/proc.rst)
  区分常驻集大小 VmRSS 与峰值 VmHWM。采样不应混入延迟计时；测量不支持时不能以零替代。
- 对生成基准，先记录加载与准备后的绝对 VmRSS，再在请求边界重置和读取 VmHWM。
  缓存张量逻辑负载不是进程物理内存。即使正控能看到较大的分配，也不证明能稳定分辨小缓存差异，
  更不能解释旧基准数值为何相同。

独立预检（无模型）：Linux 6.18.57 上三个轻/重启动器配对，用相同参数启动普通 Python 工作进程。
重启动器先触碰并保持 64 MiB 私有匿名映射。工作进程启动时两组 VmHWM 均约 9.3 MiB，
但 `ru_maxrss` 轻组为 9,344 KiB、重组为 74,880–75,008 KiB。工作进程 mode 5
重置后再触碰并释放 16 MiB，两组 VmHWM 均记录 25,856 KiB，重组 `ru_maxrss`
仍保持原高位。该对照只说明粗粒度测量口径差异，不是模型内存实测，也不认定旧平台读数的原因。

## Qdrant：正文检索与带类型的作用域匹配分开

维护方 Qdrant；固定[源码快照](https://github.com/qdrant/qdrant/tree/23065a0bf6857c3e5da45f6c8939cc746cc0580e)（不是本项目依赖），
[Apache-2.0](https://github.com/qdrant/qdrant/blob/23065a0bf6857c3e5da45f6c8939cc746cc0580e/LICENSE)。
[匹配类型](https://github.com/qdrant/qdrant/blob/23065a0bf6857c3e5da45f6c8939cc746cc0580e/lib/segment/src/types.rs#L3192-L3267)
把字符串、整数、布尔与全文文本匹配分开；
[直接匹配](https://github.com/qdrant/qdrant/blob/23065a0bf6857c3e5da45f6c8939cc746cc0580e/lib/segment/src/payload_storage/condition_checker.rs#L224-L237)
比较字段值，字符串未隐式折叠大小写或规范化 Unicode。正文可做分词、归一化；版本、实例和快照时间则另定精确规则。
多约束应匹配同一条证据，不把甲实例的标识和乙实例的时间拼成一次命中。精确过滤只判断已知字段；
元数据真实性、调用方权限、引用是否真的支持答案，是另三件事。仅借鉴接口分层，不复制代码，也不引入 Qdrant 服务。

## PyTorch：重放分三层

[官方 v2.9.0 复现性说明](https://github.com/pytorch/pytorch/blob/0fabc3ba44823f257e70ce397d989c8de5e362c1/docs/source/notes/randomness.rst)
与 [BSD 风格许可](https://github.com/pytorch/pytorch/blob/0fabc3ba44823f257e70ce397d989c8de5e362c1/LICENSE)。
随机种子、数据顺序和确定性算法并不等同：同环境重复性、跨环境逐位相等、任务层数值/输出一致应分别验收。
历史快照与新诊断权重必须有独立身份，不能因为两条推理路径结果相同就说旧训练已重现。
该版本仅作官方文档参考，不能替代实验中实际记录的运行版本。

## 同一配置名在不同版本下可以有不同的正确答案

Pallets 的 Flask 文档是版本绑定的公开检查材料：
[1.1.4](https://github.com/pallets/flask/blob/1ca199f9b38b70a4e97cb47a4252ffd7fccc008c/docs/config.rst#L249-L256)
中 `SEND_FILE_MAX_AGE_DEFAULT` 的默认时长为 12 小时（43,200 秒）；
[3.1.2](https://github.com/pallets/flask/blob/2c1b30d0503cfb064f1cb252e6614a06915a362a/docs/config.rst#L250-L262)
中默认值为 Python `None`，用于条件请求，而非固定时长。两份原文的整文件 SHA-256
分别为 `0a97b13e433f2f5c897330cdcf99dcfc54178052a69f1cc23ab4f5a92bc18ffb`
和 `096ba095a405c0cc9e6c65f2e0374812a42160703d43445d53879ee8411d02e6`，是本轮重新从固定提交下载后核对的结果。
[BSD-3-Clause 许可](https://github.com/pallets/flask/blob/2c1b30d0503cfb064f1cb252e6614a06915a362a/LICENSE.txt)。
`None` 是实际、可引用的值，不能当成拒答或实例状态；旧版资料不是新版问题的证据，即使字面上提及同一配置。

两版的 [旧默认配置实现](https://github.com/pallets/flask/blob/1ca199f9b38b70a4e97cb47a4252ffd7fccc008c/src/flask/app.py#L310-L338)
和 [新默认配置实现](https://github.com/pallets/flask/blob/2c1b30d0503cfb064f1cb252e6614a06915a362a/src/flask/app.py#L175-L213)
也分别与文档一致。这是默认配置的源码交叉核对，没有启动这两个版本的 Flask 实例。
