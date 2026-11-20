# 源码笔记：默认值的证据、缓存的提交边界

日期：2026-11-21（马来西亚时间）。固定版本阅读；第三方源码仅作外部参照，本作品不复制实现。

## CPython：构造默认值与显式开关不同

[CPython 3.13.0 argparse 源码](https://github.com/python/cpython/blob/60403a5409ff2c3f3b07dd2ca91a7a3e096839c7/Lib/argparse.py)与 [3.14.0 源码](https://github.com/python/cpython/blob/ebf955df7a89ed0c7968f79faec1de49f61ed7cb/Lib/argparse.py#L1877-L1881)给出参数签名。旧版没有 `suggest_on_error` 和 `color`，新版本分别默认 `False` 和 `True`，`allow_abbrev` 在两版均为 `True`。[3.14.0 上游测试](https://github.com/python/cpython/blob/ebf955df7a89ed0c7968f79faec1de49f61ed7cb/Lib/test/test_argparse.py#L2285-L2306)区分显式启用和禁用，[另有省略设置的测试](https://github.com/python/cpython/blob/ebf955df7a89ed0c7968f79faec1de49f61ed7cb/Lib/test/test_argparse.py#L2333-L2341)。行为用例可互证，但不能仅从一次没有建议反推出字面默认值。完整旧签名可支持“这个参数不存在”，不能支持“这个参数默认 False”。许可：[PSF License](https://github.com/python/cpython/blob/ebf955df7a89ed0c7968f79faec1de49f61ed7cb/LICENSE)。

## Express：行为相同不保证配置值相同

[Express 4.21.2](https://github.com/expressjs/express/blob/1faf228935aa0a13111f92c28ee795be64ce3f0f/lib/application.js#L80-L86)的 `query parser` 初始为 `extended`；[5.1.0](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/lib/application.js#L93-L100)为 `simple`。[5.1.0 上游用例](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/test/req.query.js#L17-L30)对照了默认行为和显式启用扩展解析，[显式 true](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/test/req.query.js#L71-L77)又能在该用例产生与默认模式一样的输出；因此方法名、同一版本和一个输出例都不能替代默认设置源码。许可：[MIT](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/LICENSE)。

对文档 RAG，版本、键和“默认／显式配置／存在性”应分开。先问回答是否符合外部真值，再问模型实际能看到的引用材料是否直接支撑它。来源不同是扩大覆盖的第一步；同一事实换一种语言不会增加独立事实数量。

## Hugging Face Transformers：预分配是一种写入策略，不等于事务

[Transformers v4.57.1 StaticLayer](https://github.com/huggingface/transformers/blob/8cb5963cc22174954e7dca2c0a3320b7dc2f4edc/src/transformers/cache_utils.py#L248-L354)先确定存储形状，再尝试原位写入固定槽位；索引和对外提交长度不是同一概念。作品采用单会话可见状态合同：只改有效前缀之后的槽位，注意力只能读到本次计算的有效区间；成功后再更新提交长度。后缀可能保留失败写入，不能当作有效数据，也不是安全擦除。对比正常与失败重试时，应分别核对可见长度、已提交内容以及 backing storage 的身份和容量。逻辑字节、预分配字节、进程峰值和速度不能相互替代。许可：[Apache-2.0](https://github.com/huggingface/transformers/blob/8cb5963cc22174954e7dca2c0a3320b7dc2f4edc/LICENSE)。

[当天实践](../../daily-learning/2026-11-21/README.md)记录实际工程结果；本页不把上游测试源码描述成已执行，也不把阅读记录当作个人独立实现证明。
