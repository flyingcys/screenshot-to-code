# Agent 工具调用流程（后端）

本文档精确说明在 prompt 消息构建完成、某个 variant 开始在 agent 中运行之后，会发生什么。

## 入口点

对每个 variant，都会从以下位置调用 `Agent(...).run(model, prompt_messages)`：

- `backend/routes/generate_code.py` (`AgenticGenerationStage._run_variant`)

`Agent` 是 `AgentEngine` 的一个轻量封装：

- `backend/agent/runner.py`
- `backend/agent/engine.py`

## 核心工具调用循环

主循环位于：

- `backend/agent/engine.py` -> `AgentEngine._run_with_session(...)`

循环行为：

1. 启动当前 turn 的流式状态。
- 为 assistant/thinking 流创建事件 ID。
- 初始化：
  - `started_tool_ids`
  - `streamed_lengths`

2. 流式处理一次 provider turn。
- 调用 `turn = await session.stream_turn(on_event)`
- `on_event` 处理流式增量：
  - `assistant_delta` -> websocket `assistant`
  - `thinking_delta` -> websocket `thinking`
  - `tool_call_delta` -> `_handle_streamed_tool_delta(...)`

3. 按工具调用分支处理。
- 如果 `turn.tool_calls` 为空：收尾并返回。
- 否则执行每个工具调用，发送工具生命周期消息，并收集结果。

4. 携带工具结果继续对话。
- 调用 `session.append_tool_results(turn, executed_tool_calls)`
- 下一轮循环会基于更新后的历史再次发送一个模型 turn。

5. 护栏限制。
- 最多允许 20 个工具 turn；超过则抛出异常。

## 工具执行

工具运行时：

- `backend/agent/tools/runtime.py` -> `AgentToolRuntime.execute(...)`

工具定义：

- `backend/agent/tools/definitions.py` -> `canonical_tool_definitions(...)`

支持的工具：

- `create_file`
- `edit_file`
- `generate_images`
- `remove_background`
- `retrieve_option`

每次工具调用的执行生命周期：

1. 发送 `toolStart`（如果流式参数阶段尚未发送过）。
2. 如果是 `create_file`，则在参数仍在到达时流式输出预览代码块。
3. 在 runtime 中执行工具。
4. 如果工具返回 `updated_content`，发送 `setCode`。
5. 发送 `toolResult`，内容为 `{ name, output, ok }`。

### `create_file` 的实时流式预览

引擎会通过以下方法，从 provider 的增量数据中解析部分工具参数：

- `backend/agent/tools/parsing.py`：
  - `extract_content_from_args(...)`
  - `extract_path_from_args(...)`

然后由 `engine.py` 中的 `_handle_streamed_tool_delta(...)`：

- 为 `create_file` 提前发送 `toolStart`
- 随着 `content` 增长，发送增量 `setCode` 更新

这样一来，在真正的工具执行完成之前，前端就能先看到预览。

## Provider 特定的续写方式

Provider 契约：

- `backend/agent/providers/base.py`
  - `ProviderSession`
  - `ProviderTurn`

每个 provider 都会返回一个 `ProviderTurn`，其中包含：

- `assistant_text`
- `tool_calls`
- `assistant_turn`（provider 原生的 turn 对象，续写时需要用到）

工具执行完成后，每个 provider 追加工具结果的方式都不同。

### OpenAI 的续写

- `backend/agent/providers/openai.py` -> `OpenAIProviderSession.append_tool_results(...)`

行为：

1. 将上一次 assistant 的输出项（`turn.assistant_turn`）追加到请求历史。
2. 为每个工具结果追加一个 `function_call_output`：
- `{"type":"function_call_output","call_id":...,"output": json_string}`

下一次 `responses.create(...)` turn 会使用这份更新后的 item 列表。

### Anthropic 的续写

- `backend/agent/providers/anthropic.py` -> `AnthropicProviderSession.append_tool_results(...)`

行为：

1. 追加 assistant message blocks：
- 可选的文本 block
- tool_use blocks（`id`、`name`、`input`）
2. 追加一个带有 tool_result blocks 的 user message：
- `tool_use_id`、序列化后的结果内容、`is_error`

下一次 `messages.stream(...)` turn 会从这些 blocks 继续。

### Gemini 的续写

- `backend/agent/providers/gemini.py` -> `GeminiProviderSession.append_tool_results(...)`

行为：

1. 追加原始模型内容（`turn.assistant_turn`）。
2. 为每个工具追加 `role="tool"` 的内容，内部使用 `Part.from_function_response(...)`。

这样可以保留可靠续写所需的模型 part 结构（包括对 thought-signature 敏感的流程）。

## 向前端流式返回响应

生成期间发往前端的 websocket 消息类型：

- `assistant`
- `thinking`
- `toolStart`
- `toolResult`
- `setCode`

它们的来源：

1. Provider 解析器在 `stream_turn(...)` 期间发出 `StreamEvent` 增量。
2. 引擎通过 `send_message(...)` 立即转发这些增量。
3. 工具执行阶段会额外补充显式的生命周期事件和代码更新。

一个典型 turn 的流式顺序：

1. thinking/assistant 增量
2. 工具调用增量（可选）
3. `toolStart`
4. `setCode` 预览（针对 `create_file`，可选）
5. `toolResult`
6. 下一次模型 turn 开始，重复以上流程

最终收尾：

- 如果没有更多工具调用，引擎会从内存中的文件状态返回最终代码。
- 如果文件状态为空，引擎会尝试从最终 assistant 文本中提取 HTML。

## 模块映射

- 引擎编排：`backend/agent/engine.py`
- Agent 入口：`backend/agent/runner.py`
- Provider 工厂：`backend/agent/providers/factory.py`
- Provider 契约：`backend/agent/providers/base.py`
- Provider 实现：
  - `backend/agent/providers/openai.py`
  - `backend/agent/providers/anthropic.py`
  - `backend/agent/providers/gemini.py`
- 工具系统：
  - `backend/agent/tools/definitions.py`
  - `backend/agent/tools/runtime.py`
  - `backend/agent/tools/parsing.py`
  - `backend/agent/tools/summaries.py`
