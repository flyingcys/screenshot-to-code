# Agent Runner 重构规格说明

## 目标
- 减少 OpenAI/Anthropic/Gemini runner 之间重复的流式处理逻辑。
- 集中管理工具 schema 和遥测格式化。
- 让 agent 流水线更容易测试、扩展和理解。

## 决策：统一流式循环 + Provider 适配器
- 引入一个与 provider 无关的统一流式循环，用于消费标准化事件
  （assistant_delta、thinking_delta、tool_call_delta、tool_call_complete、done）。
- 为每个 provider 增加适配器，将原生流转换为标准化事件。
- 将工具执行、`toolStart`/`toolResult` 发送以及 `setCode` 预览流式处理
  集中放到统一循环中。
- 保持各 provider 适配器足够小，只关注 provider 特定 payload 的解析。

## 决策：规范化工具定义 + 序列化层
- 以一种规范化表示方式定义一次工具 schema。
- 增加序列化辅助方法，从规范形式生成 OpenAI Responses、Anthropic 和 Gemini 的工具 schema。
- 集中管理工具输入/输出摘要，保持不同 provider 的 UI 遥测一致，并减少重复逻辑。

## 计划移除项

### 图片缓存
- 移除 agent 工具层中基于 prompt 到 URL 的图片缓存。
- 理由：简化状态，减少隐藏的跨 variant 耦合。
- 后续：在需要时确保图片生成仍然对每次请求具备确定性
  （例如传入显式 seed，或在更高层暴露缓存能力）。

### OpenAI ChatCompletion 路径
- 移除遗留的 ChatCompletion 流式路径。
- 所有 OpenAI 模型统一走 Responses API 实现。
- 更新模型列表和运行时检查，消除 ChatCompletion 分支。

### 非 Agent 化生成路径（例如 Video）
保留视频生成能力，但通过 agent runner 统一接入：
- 用 agent runner 对视频输入的支持替换掉视频专用的流式辅助逻辑。
- 移除 create/update 视频时绕过 agent 路径的条件分支。
- 保留视频特有的 prompt 和媒体处理，但将其整合进
  agent 工具/流式处理流水线。
- 更新测试和文档，反映一条支持视频输入的统一 agent 生成路径。

## 文件 / 模块拆分
- `agent/runner.py`：编排 + 共享流式循环。
- `agent/providers/`：provider 适配器（openai、responses、anthropic、gemini）。
- `agent/tools.py`：工具定义、序列化和执行。
- `agent/state.py`：文件状态 + seeding 工具。

## 非目标
- 除上述移除项外，不做功能层面的 UX 改动。
- 不重新设计前端 agent activity UI；它应继续消费
  相同的 tool/assistant/thinking 事件。
