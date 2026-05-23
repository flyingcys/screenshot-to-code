# Prompt 历史重构（前端 -> 后端）

## 目标
简化编辑提示词历史，这样我们就不再需要通过 commit 祖先关系和索引奇偶性来重建对话状态。

新的模型是：
- 前端为每个 variant 存储显式的对话历史。
- 前端向后端发送显式的、基于角色的历史。
- 后端信任结构化历史，只负责组装消息。

## 关键决策（最终版）
- 不需要 `sourceVersionNumber` 字段。
  - 被选中的 variant 就是“下一次要扩展哪段历史”的唯一事实来源。
- 这个重构不需要后端持久化或迁移工作。
  - Prompt 历史状态属于前端侧的会话/项目状态。
- 不保留旧版重建兼容路径。
  - 旧的重建/索引奇偶性行为会被移除，而不是保留。

## 之前的行为（已移除）
在这次重构之前：
- 前端通过遍历 commit 父链接，使用 `extractHistory(...)` 重建历史。
- 后端通过数组索引奇偶性推断消息角色（偶数为 `assistant`，奇数为 `user`）。
- 历史状态是隐式且脆弱的，尤其在分支和 variant 选择场景下更明显。

## 新的前端存储模型

### 1) 每个 variant 的显式历史
每个 variant 现在都携带自己的历史：
- `Variant.history: VariantHistoryMessage[]`
- `VariantHistoryMessage`：
  - `role: "user" | "assistant"`
  - `text: string`
  - `imageAssetIds: string[]`
  - `videoAssetIds: string[]`

这份历史就是该 variant 的权威记录。

### 2) 共享媒体资源存储
前端把媒体统一保存在一个共享 map 中：
- `assetsById: Record<string, PromptAsset>`
- `PromptAsset`：
  - `id`
  - `type: "image" | "video"`
  - `dataUrl`

Variant 历史通过 ID 引用媒体，而不是直接内嵌体积很大的 base64 字符串。

### 3) 从 `App.tsx` 中提取工具函数
Prompt 历史 / 媒体辅助逻辑已迁移到：
- `frontend/src/lib/prompt-history.ts`

关键辅助函数：
- `cloneVariantHistory(...)`
- `registerAssetIds(...)`
- `toRequestHistory(...)`
- `buildUserHistoryMessage(...)`
- `buildAssistantHistoryMessage(...)`

## 现在如何构建请求

### Create 流程
- Create 会用一条 `user` 消息来初始化 `variantHistory`。
- 图片/视频会注册到 `assetsById` 中，并通过 ID 被 variant 历史引用。
- 请求负载包含：
  - `prompt`（create 输入）
  - `variantHistory`（用于本地 commit 状态）

### Update 流程
- 以当前选中的 variant 作为事实来源。
- 基础历史 = 选中 variant 的历史（如果为空，则回退到当前代码的助手快照）。
- 追加新的 `user` 更新消息（以及可选的媒体 ID）。
- 通过 `toRequestHistory(...)` 将 variant 历史转换为请求历史（`role`、`text`、`images`、`videos`）。

### 完成后的行为
在 variant 完成时：
- 最终生成的代码会作为一条 `assistant` 历史消息，追加到该 variant 自己的历史中。

## 分支行为
我们仍然保留扁平版本标签（v1、v2、...），但编辑可以从任意选中的版本 / variant 分支出去。

重要细节：
- 当前激活并选中的 variant 的显式历史，就是下一次编辑要扩展的那段历史。
- 这样无需再从全局 commit 祖先关系中重建历史，也能自然支持分支。

## 请求负载结构（简化版）
发送编辑请求时，前端会发送显式的角色历史，例如：
- `history[i].role`: `"user"` 或 `"assistant"`
- `history[i].text`: 文本指令或生成出的代码
- `history[i].images`: 该消息的图片输入 data URL
- `history[i].videos`: 该消息的视频输入 data URL

后端不再根据索引推断角色；它会直接使用提供的角色。

## 后端解析与提示词组装

### 请求解析已提取
原始请求归一化逻辑迁移到了：
- `backend/prompts/request_parsing.py`

函数：
- `parse_prompt_content(raw_prompt)`
- `parse_prompt_history(raw_history)`

`generate_code.py` 现在会调用这些辅助函数，因此路由文件更小，解析逻辑也更集中。

### 提示词组装变更
`backend/prompts/builders.py` 现在：
- 消费显式的 `PromptHistoryMessage` 条目。
- 直接使用提供的 `role`（不再基于索引奇偶性推断）。
- 在生成更新时，构建：
  - `system` 消息
  - 后接所有提供的显式历史消息

### 导入代码路径
导入代码后的更新逻辑现在也基于显式角色历史工作，并且可以更清晰地选择最新的相关 `user` 指令。

## 日志 / 可观测性更新
- 从生成路径中移除了运行时 `PROMPT SUMMARY` 日志。
- 在模型执行前新增了紧凑的 `PROMPT PREVIEW` 日志。
- 大段文本 / 代码会被折叠，以提高可读性。

## 已更新 / 新增的测试

### 后端
- 将提示词组装的期望更新为显式角色历史：
  - `backend/tests/test_prompts.py`
- 合并并删除了重复文件：
  - 删除 `backend/tests/test_prompts_additional.py`
- 新增请求解析器测试：
  - `backend/tests/test_request_parsing.py`
- 新增提示词预览测试：
  - `backend/tests/test_prompt_summary.py`

### 前端
- 移除了旧版 `extractHistory` 测试并更新了夹具：
  - `frontend/src/components/history/utils.test.ts`
- 为提取出的 prompt-history 工具函数新增了测试：
  - `frontend/src/lib/prompt-history.test.ts`

## 最终结果
现在的 prompt-history 流水线已经变成显式、variant 局部化，且更容易理解：
- 不再有隐式角色推断。
- 编辑提示词不再需要树状重建。
- 通过选中 variant 的历史，分支处理更清晰。
- 通过专门的解析模块，路由层的解析面更小。
