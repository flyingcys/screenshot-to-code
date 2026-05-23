# 使用 Claude 3 将截图转换为代码

Claude 3 昨天刚发布，官方声称它在各种任务上都可以与 GPT-4 一较高下。我维护着一个非常受欢迎的开源项目“screenshot-to-code”（就是这个项目！），它使用 GPT-4 vision 将截图 / 设计稿转换为整洁的代码。自然地，我很想看看 Claude 3 在这个任务上的表现到底有多好。

**TLDR：** Claude 3 在截图转代码这件事上与 GPT-4 vision 基本处于同一水平，有些方面更好，也有一些方面更差。

## 评测设置

我不知道有没有公开的“截图转代码”基准，所以为了测试，我自己搭了一套简单的评测流程：

- **评测数据集**：16 张截图，覆盖多种 UI 元素、落地页、仪表盘以及热门网站。
<img width="784" alt="Screenshot 2024-03-05 at 3 05 52 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/c32af2db-eb5a-44c1-9a19-2f0c3dd11ab4">

- **评测指标**：复刻准确度，也就是“生成出来的代码看起来与截图有多接近？”当然，还有代码质量、速度等其他重要指标，但对这个仓库的大多数用户来说，这绝对是最重要的第一指标。
- **评测机制**：每个输出都由人工按 0 到 4 的量表进行主观评分。4 = 非常接近精确复刻，0 = 看起来完全不像原截图。对于 16 张截图来说，任意模型的满分都是 64。


为了让评测流程更容易执行，我写了一个 [Python 脚本](https://github.com/abi/screenshot-to-code/blob/main/backend/run_evals.py)，可以并行为所有输入运行生成。我还做了一个简单的 UI，用来并排比较输入和输出。

![Google Chrome](https://github.com/abi/screenshot-to-code/assets/23818/38126f8f-205d-4ed1-b8cf-039e81dcc3d0)


## 结果

先快速说明一下这次生成的代码类型：目前 screenshot-to-code 支持生成 HTML + Tailwind、React、Vue 以及其他一些框架的代码。技术栈会明显影响复刻准确度。比如由于 Bootstrap 使用了一套相对受限的 UI 元素，使用 Bootstrap 生成的结果往往会带有非常明显的“Bootstrap 风格”。

这次我只在 HTML/Tailwind 上跑了评测，因为这是 GPT-4 vision 通常表现最好的栈。

下面是结果（每个模型取 3 次运行的平均值）：

- GPT-4 Vision 得分 **65.10%** —— 这是我们想要超越的基线
- Claude 3 Sonnet 得分 **70.31%**，略好一些。
- 令人惊讶的是，按理说更聪明也更慢的 Claude 3 Opus，得分反而低于 GPT-4 vision 和 Claude 3 Sonnet，仅有 **61.46%**。

整体来看，Claude 3 的表现非常强。显然，这套评测里有不少主观因素，但 Claude 3 绝对已经达到 GPT-4 Vision 的水平，甚至可能更好。

你可以在这里查看 [Claude 3 Sonnet 某次运行的并排对比图](https://github.com/abi/screenshot-to-code-files/blob/main/sonnet%20results.png)。也可以在这里查看 [GPT-4 Vision 某次运行的并排对比图](https://github.com/abi/screenshot-to-code-files/blob/main/gpt%204%20vision%20results.png)。

其他一些备注：

- 使用的 prompts 是为 GPT-4 vision 优化的。稍微为 Claude 调整 prompt 确实带来了一点提升，但没有本质性变化，而且可能不值得为此维护两套 prompt。
- 所有模型在代码质量上都很出色——通常能达到与人工相当，甚至更好的水平。
- Claude 3 比 GPT-4 Vision 懒惰得少得多。比如让它重建 Hacker News 时，GPT-4 Vision 往往只会生成列表中的两项，并在代码里留下像 `<!-- Repeat for each news item -->` 和 `<!-- ... other news items ... -->` 这样的注释。
<img width="699" alt="Screenshot 2024-03-05 at 9 25 04 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/04b03155-45e0-40b0-8de0-b1f0b4382bee">

而 Claude 3 Sonnet 虽然有时也会偷懒，但大多数时候，它会照你要求的那样完成任务。

<img width="904" alt="Screenshot 2024-03-05 at 9 30 23 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/b7c7d1ba-47c1-414d-928f-6989e81cf41d">

- 出于某种原因，所有模型在并排的 “flex” 布局上都表现不佳
<img width="1090" alt="Screenshot 2024-03-05 at 9 20 58 PM" src="https://github.com/abi/screenshot-to-code/assets/23818/8957bb3a-da66-467d-997d-1c7cc24e6d9a">

- Claude 3 Sonnet 快得多
- Claude 3 经常会把背景色和文字颜色搞错！（就像上面的 Hacker News 图那样）
- 我怀疑 Claude 3 Opus 的结果可以通过更好的 prompt 调优，提升到与其他模型相当的水平
  
整体来说，Claude 3 Sonnet 在这个用例上的表现让我印象非常深刻。我已经把它作为 GPT-4 Vision 的替代选项加入这个开源仓库中（托管版更新也会很快上线）。

如果你也想参与这项工作，我在这里写了一些关于 [如何自己运行这些评测的文档](https://github.com/abi/screenshot-to-code/blob/main/Evaluation.md)。我也正在研究一种基于 Elo 评分的更好评测机制，如果你愿意帮忙，我会非常欢迎。
