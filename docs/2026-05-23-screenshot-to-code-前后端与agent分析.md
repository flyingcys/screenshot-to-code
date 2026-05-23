# screenshot-to-code 前后端、Agent 与提示词分析

## 1. 文档目标

本文基于当前仓库源码，梳理以下问题：

- 当前前端与后端分别使用了哪些技术栈
- 前后端如何协作完成“截图/文本/视频 -> 代码”的服务闭环
- 后端 Agent 是如何实现的
- 系统提示词（system prompt）是什么、起什么作用
- “新建”面板里的 4 种模式分别是什么、实现上有什么差别
- 各种模式最终用到的提示词结构分别是什么

说明：

- 本文以当前源码为准，而不是以历史设计文档为准
- 例如 `design-docs/variant-system.md` 中仍写着默认 3 个 variants，但当前源码 `backend/config.py` 已经是 `NUM_VARIANTS = 4`、`NUM_VARIANTS_VIDEO = 2`

---

## 2. 总体架构一句话结论

这是一个“前端发起多模态输入请求 -> 后端组装 Prompt -> 后端按模型/Provider 启动 Agent 工具调用循环 -> 通过 WebSocket 把代码和中间状态持续流回前端”的单页式 AI 代码生成系统。

核心分层：

- 前端：负责输入、状态、版本历史、变体切换、代码预览、设置管理
- 后端：负责截图抓取、Prompt 组装、模型选择、Agent 执行、导出、Design System 存储、评测接口
- Agent 层：位于后端内部，通过模型原生 tool-calling 驱动 `create_file` / `edit_file` / `generate_images` 等工具，最终产出单文件 `index.html`

---

## 3. 前端技术栈

### 3.1 核心框架

前端主栈来自 `frontend/package.json`：

- React 18
- TypeScript 5
- Vite 4
- React Router 6
- Zustand

入口在：

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`

### 3.2 UI 与交互层

主要 UI/交互相关依赖：

- Tailwind CSS
- Radix UI（Dialog、Tabs、Select、Popover、AlertDialog 等）
- react-hot-toast
- react-icons
- CodeMirror
- react-dropzone

这说明前端不是传统多页网站，而是一个以工作台为中心的交互式 SPA：

- 左侧/顶部负责输入与控制
- 中间/右侧负责预览、代码、版本、设置
- 用户操作几乎都不刷新页面

### 3.3 前端路由结构

在 `frontend/src/main.tsx` 中，前端主要暴露两类页面：

1. 主应用页
   - `/`
2. 评测相关页
   - `/evals`
   - `/evals/single`
   - `/evals/pairwise`
   - `/evals/best-of-n`
   - `/evals/run`
   - `/evals/openai-input-compare`

也就是说，当前前端除了用户面向的“生成工作台”，还内置了一套模型评测工具界面。

### 3.4 前端状态管理

前端状态主要分两类：

1. 应用状态
   - `frontend/src/store/app-store.ts`
2. 项目/版本状态
   - `frontend/src/store/project-store.ts`

其中 `project-store` 是主线：

- 保存当前输入模式 `inputMode`
- 保存 commits / variants
- 保存每个 variant 的 `code`、`history`、`status`
- 保存 agent 流式思考、工具事件、执行日志

也就是说，前端不是简单拿到一个最终 HTML 就结束，而是维护了一整套：

- 版本树
- 变体比较
- 更新历史
- agent 活动轨迹

---

## 4. 后端技术栈

### 4.1 Web 框架与运行时

后端主栈来自 `backend/pyproject.toml`：

- Python 3.10
- FastAPI
- Uvicorn
- websockets
- Pydantic v2
- httpx

入口在：

- `backend/main.py`

后端没有启用 OpenAPI 文档页：

- `FastAPI(openapi_url=None, docs_url=None, redoc_url=None)`

这说明它更像一个内部受控 API 服务，而不是面向第三方开发者开放的通用 API 平台。

### 4.2 AI / 多模型 Provider

后端支持三类主模型 Provider：

- OpenAI
- Anthropic
- Gemini（Google）

对应依赖：

- `openai`
- `anthropic`
- `google-genai`

模型枚举和 provider 映射在：

- `backend/llm.py`

当前实现不是“只支持某一家模型”，而是做了统一抽象层，把不同模型都纳入同一个 Agent 执行框架。

### 4.3 图像/视频与导出相关

后端还包含这些能力：

- 截图抓取：通过 ScreenshotOne API 抓网页截图
- 图片下载与导出：`BeautifulSoup` + `httpx` + zip 打包
- 视频相关：`moviepy`
- 图像处理：`pillow`
- 图片生成/去背景：结合 OpenAI / Replicate

说明这个后端不是单纯的 LLM 网关，而是把“素材采集、Prompt 输入、Agent 生成、静态导出”串成了完整闭环。

### 4.4 观测与调试

后端还带有：

- Langfuse
- OpenAI 输入日志
- prompt preview / prompt summary 调试能力

相关目录包括：

- `backend/fs_logging/`
- `backend/debug/`
- `backend/utils.py`

---

## 5. 后端暴露的主要服务能力

当前后端路由主要分为 5 类：

### 5.1 主生成链路

- WebSocket：`/generate-code`
- 文件：`backend/routes/generate_code.py`

这是最核心的生成服务入口。

### 5.2 URL 截图服务

- HTTP POST：`/api/screenshot`
- 文件：`backend/routes/screenshot.py`

用于把 URL 模式里的网页地址转成图片 Data URL，再交给主生成链路。

### 5.3 导出服务

- HTTP POST：`/api/export`
- 文件：`backend/routes/export.py`

用于把当前 HTML 和依赖图片整理成 zip；失败时前端会回退为直接下载 `index.html`。

### 5.4 Design System 配置存储

- `GET /api/design-systems`
- `POST /api/design-systems`
- `DELETE /api/design-systems/{id}`
- 文件：`backend/routes/design_systems.py`

默认持久化位置为：

- `~/.screenshot-to-code/design-systems.json`

### 5.5 评测与模型对比

- `/evals`
- `/pairwise-evals`
- `/run_evals`
- `/openai-input-compare`
- `/models`

说明仓库不仅是产品代码，也包含内部模型评测基础设施。

---

## 6. 前后端如何配合完成服务

### 6.1 主流程概览

正常生成流程大致如下：

1. 用户在前端“新建”面板选择一种输入模式
2. 前端把输入、设置、stack、模型、design system 等封装成请求参数
3. 前端通过 WebSocket 连接后端 `/generate-code`
4. 后端校验参数，组装 Prompt，选择模型
5. 后端为每个 variant 启动一个 Agent 执行任务
6. Agent 通过工具调用逐步生成或编辑 `index.html`
7. 后端把中间状态和最终代码持续流回前端
8. 前端把每个 variant 的代码、状态、历史、日志写入 store
9. 用户在前端预览、切换 variant、继续 update 或导出

### 6.2 前端如何发起生成

前端主入口在 `frontend/src/App.tsx`：

- `doCreate(...)`
- `doCreateFromText(...)`
- `doUpdate(...)`
- `doGenerateCode(...)`

关键点：

- Create 请求默认预建 4 个 variants
- Update 请求默认预建 2 个 variants
- 设置会与请求参数合并后一起发送
- Design System 内容会直接塞入请求

也就是说，前端不是只传“提示词文本”，而是传：

- 输入模式
- 当前 prompt 内容
- 版本历史
- 当前文件快照
- 选项代码
- API keys / base URL / stack / model / design system / locale 等设置

### 6.3 WebSocket 是主协作通道

前端生成代码使用：

- `frontend/src/generateCode.ts`

后端对应：

- `backend/routes/generate_code.py`

WebSocket 负责传递以下类型消息：

- `status`
- `setCode`
- `thinking`
- `assistant`
- `toolStart`
- `toolResult`
- `variantComplete`
- `variantError`
- `variantCount`

这意味着前后端协作并不是“请求一次，返回一次”，而是：

- 长连接
- 多阶段流式更新
- 既传最终代码，也传推理过程与工具执行过程

### 6.4 URL 模式的特殊路径

URL 模式不是直接把 URL 交给大模型，而是分两步：

1. 前端调用 `POST /api/screenshot`
2. 后端用 ScreenshotOne 抓图并转成 Data URL
3. 前端再把该 Data URL 当成 image 模式输入，继续走 `/generate-code`

也就是说：

- URL 模式本质上是“网页截图 -> 图片模式”
- 它不是单独的一套 Prompt Builder

### 6.5 导入模式的特殊路径

Import 模式完全不调用后端生成。

前端在 `importFromCode(...)` 中：

- 直接把用户粘贴/导入的代码变成一个本地 commit
- 设置 `AppState.CODE_READY`
- 允许用户从这个已有代码继续做后续 update

所以 Import 模式本质上是：

- “把已有 HTML 项目纳入当前版本系统”
- 不是“新建并让 AI 生成”

---

## 7. 后端 Agent 的实现方式

## 7.1 本质：后端内部的多 Provider Agentic Loop

这个后端的 Agent 不是外部 CLI，也不是独立进程编排器，而是：

- 在 Python 后端内部运行的 Agent 引擎
- 按不同 LLM Provider 统一抽象
- 通过 tool-calling 让模型自己创建/编辑单文件 HTML

主入口：

- `backend/routes/generate_code.py` 中的 `AgenticGenerationStage`
- `backend/agent/runner.py`
- `backend/agent/engine.py`

### 7.2 WebSocket 请求先进入 Pipeline

`/generate-code` 不直接写一大块逻辑，而是走一个中间件式 Pipeline：

1. `WebSocketSetupMiddleware`
2. `ParameterExtractionMiddleware`
3. `StatusBroadcastMiddleware`
4. `PromptCreationMiddleware`
5. `CodeGenerationMiddleware`
6. `PostProcessingMiddleware`

好处是职责拆分清晰：

- 参数校验
- 模型选择
- Prompt 组装
- 变体执行
- 结果收尾

### 7.3 每个 variant 都是一个独立 Agent 任务

后端会为每个 variant 并发启动任务：

- Create：4 个
- Update：2 个
- Video：2 个

执行方式在：

- `AgenticGenerationStage.process_variants(...)`

它使用 `asyncio.create_task(...)` 并发跑多个 `_run_variant(...)`。

所以“多方案对比”不是前端伪装，而是后端真并发生成。

### 7.4 AgentEngine 的主循环

Agent 的核心循环在：

- `backend/agent/engine.py` -> `AgentEngine._run_with_session(...)`

主逻辑是：

1. 发起一轮 provider 调用
2. 流式接收 assistant / thinking / tool_call delta
3. 如果本轮没有 tool call，则结束
4. 如果有 tool call，则执行工具
5. 把 tool result 追加回会话上下文
6. 再发下一轮模型调用
7. 最多循环 20 轮

这本质上是一个标准的 agentic tool loop。

### 7.5 Agent 并不直接操作真实文件系统

虽然工具名叫 `create_file` / `edit_file`，但默认不是改仓库磁盘文件，而是改内存里的文件状态：

- `AgentFileState(path=\"index.html\", content=\"...\")`

对应文件：

- `backend/agent/state.py`
- `backend/agent/tools/runtime.py`

也就是说，Agent 的“文件”是逻辑文件，不是仓库物理文件。

### 7.6 Agent 支持的工具

当前 canonical tools 包括：

- `create_file`
- `edit_file`
- `generate_images`
- `remove_background`
- `retrieve_option`

定义在：

- `backend/agent/tools/definitions.py`

其中：

- `create_file`：一次性创建完整 HTML
- `edit_file`：基于精确字符串替换修改现有 HTML
- `generate_images`：补生成素材图
- `remove_background`：处理透明图
- `retrieve_option`：读取某个 variant 的完整 HTML 供引用

### 7.7 Provider 抽象方式

Provider 工厂：

- `backend/agent/providers/factory.py`

Provider 实现：

- `backend/agent/providers/openai.py`
- `backend/agent/providers/anthropic/provider.py`
- `backend/agent/providers/gemini.py`

统一抽象是：

- 输入：统一接收 OpenAI 风格的 prompt messages
- 过程：各自做协议转换与流式解析
- 输出：统一回到 `ProviderTurn` / `ToolCall` / `StreamEvent`

三家模型的差异被封装在 Provider 层，而不是污染上层业务逻辑。

### 7.8 当前 Agent 的重要设计取向

1. **单文件目标**
   - 主要目标是生成 `index.html`
2. **优先工具调用**
   - Create 用 `create_file`
   - Update 用 `edit_file`
3. **支持流式预览**
   - `create_file` 参数流式到达时，前端可提前看到逐步成形的代码
4. **模型无关**
   - OpenAI / Anthropic / Gemini 都走统一 Agent 引擎
5. **以文件状态为真相**
   - 最终输出优先取 `file_state.content`
   - 若没有，再从 assistant 文本里提取 HTML

---

## 8. 系统提示词（System Prompt）是什么

系统提示词定义在：

- `backend/prompts/system_prompt.py`

它不是一条短 prompt，而是一整套“全局运行规则 + stack-specific 约束”。

### 8.1 系统提示词的核心职责

它主要做 4 件事：

1. 定义 Agent 身份
   - “你是一个擅长做前端的 coding agent”
2. 规定回复风格
   - 简洁
   - 不在聊天里直接输出代码
   - 最后只用 1~2 句总结结果
   - 用用户语言回复
3. 规定工具使用方式
   - 新建时用一次 `create_file`
   - 更新时优先 `edit_file`
   - 不要把 HTML 直接写在 chat 文本中
4. 规定不同 stack 的脚本/CDN 用法
   - Tailwind
   - React
   - Vue
   - Bootstrap
   - Ionic

### 8.2 系统提示词里的关键约束

最关键的约束包括：

- 主文件默认叫 `index.html`
- brand new app 必须 `create_file` 一次性写完整 HTML
- update 只能精确替换，不要整页重写
- 当可用时，用 `generate_images` 补缺失素材
- 当可用时，用 `retrieve_option` 读取其他选项代码

这直接决定了：

- 为什么生成结果是单文件中心
- 为什么 update 更强调局部编辑而不是完全重做
- 为什么前端能看到工具调用事件

### 8.3 系统提示词的 stack-specific 内容

系统 prompt 还内置了 stack 对应的运行规范，例如：

- Tailwind：必须注入 CDN 脚本
- React：必须使用 UMD + Babel standalone
- Vue：必须使用 global build
- Ionic：必须带 ionic script / stylesheet / ionicons
- html_css：禁止用 Tailwind

因此，真正控制输出代码风格的，不只是“用户选了什么 stack”，而是：

- 前端把 stack 传给后端
- Prompt builder 把 `Selected stack: xxx` 写入用户 prompt
- system prompt 再把这个 stack 的实际运行规则补齐

---

## 9. “新建”里的 4 种模式分别是什么

前端“新建”面板在：

- `frontend/src/components/unified-input/UnifiedInputPane.tsx`

4 个 UI Tab 分别是：

1. Upload
2. URL
3. Text
4. Import

注意：

- 这 4 个是前端新建入口的 4 种模式
- 其中 Upload 内部又进一步分成“图片上传”和“视频/录屏上传”

---

## 10. 4 种模式的功能区别与实现区别

## 10.1 Upload 模式

### 用户视角

- 上传一张或多张截图
- 或上传一个视频
- 或直接录屏

### 前端实现

文件：

- `frontend/src/components/unified-input/tabs/UploadTab.tsx`
- `frontend/src/components/recording/ScreenRecorder.tsx`

行为：

- 如果是图片，最终走 `doCreate(images, "image", textPrompt)`
- 如果是视频/录屏，最终走 `doCreate([video], "video", textPrompt)`

### 后端实现

最终都会进入 `/generate-code`，但 `inputMode` 不同：

- 图片：`inputMode = "image"`
- 视频：`inputMode = "video"`

### Prompt 差异

- 图片上传 -> 使用 `backend/prompts/create/image.py`
- 视频上传/录屏 -> 使用 `backend/prompts/create/video.py`

### 关键区别

- 图片模式主要强调“视觉复刻”
- 视频模式不仅要复刻界面，还要复刻交互行为和状态变化

---

## 10.2 URL 模式

### 用户视角

- 输入一个网页 URL
- 系统帮你抓图，再生成代码

### 前端实现

文件：

- `frontend/src/components/unified-input/tabs/UrlTab.tsx`

行为：

1. 调用 `POST /api/screenshot`
2. 拿回截图的 Data URL
3. 调用 `doCreate([res.url], "image")`

### 后端实现

文件：

- `backend/routes/screenshot.py`

行为：

- 使用 ScreenshotOne 把网页抓成 PNG
- 返回 Data URL 给前端

### Prompt 差异

URL 模式**没有自己独立的 Prompt Builder**。

它在截图完成后，会退化成普通图片模式，因此最后仍然使用：

- `backend/prompts/create/image.py`

### 关键区别

- 它比 Upload 图片模式多了一步“网页截图采集”
- 但真正生成代码时，和图片模式共用一套主 Prompt

---

## 10.3 Text 模式

### 用户视角

- 直接用自然语言描述要做什么 UI

### 前端实现

文件：

- `frontend/src/components/unified-input/tabs/TextTab.tsx`

行为：

- 调用 `doCreateFromText(text)`
- 进一步走 `doGenerateCode(...)`

### 后端实现

请求参数中：

- `generationType = "create"`
- `inputMode = "text"`
- `prompt = { text, images: [], videos: [] }`

### Prompt 差异

Text 模式使用：

- `backend/prompts/create/text.py`

它与图片/视频模式最大的不同是：

- 没有视觉素材输入
- Prompt 更强调现代感、专业 UI、UX best practices

### 关键区别

- Upload / URL / Video 都是“给素材，让模型还原”
- Text 是“只给描述，让模型自主构造界面”

---

## 10.4 Import 模式

### 用户视角

- 粘贴已有 HTML
- 选定 stack
- 直接进入工作台继续编辑

### 前端实现

文件：

- `frontend/src/components/unified-input/tabs/ImportTab.tsx`

行为：

- 调用 `importFromCode(code, stack)`
- 直接创建本地 commit
- 不调用 `/generate-code`

### 后端实现

- 无生成请求
- 无 prompt builder
- 无模型参与

### Prompt 差异

- **Import 模式没有 create prompt**
- 它只是把用户已有代码导入系统，供后续 update 使用

### 关键区别

Import 不是“新生成”，而是“把外部代码纳入版本/预览/后续 AI 修改体系”。

---

## 11. 各种提示词具体怎么样

## 11.1 Prompt 总装配入口

统一入口在：

- `backend/prompts/pipeline.py`

逻辑：

- create -> `create_from_input`
- update + 有历史 -> `update_from_history`
- update + 无历史但有 file snapshot -> `update_from_file_snapshot`

也就是说，Prompt 不是单文件里硬编码死的，而是按任务类型走不同 builder。

---

## 11.2 图片新建 Prompt

文件：

- `backend/prompts/create/image.py`

结构核心：

1. system prompt
2. 用户图片（可多张）
3. 一段“严格按截图复刻”的用户指令文本
4. stack 说明
5. design system 说明（可选）
6. 图片生成策略说明
7. 用户额外补充指令（可选）

这类 prompt 的特点：

- 强调“looks exactly like the screenshot”
- 强调“Use the exact text from the screenshot”
- 对多张图给出组织策略（多页面、多 tab、无关图分组）
- 移动端图明确要求“不要带设备外壳，只还原 UI”

适合：

- 还原设计稿
- 还原静态页面
- 从 Figma/截图生成页面结构

---

## 11.3 文本新建 Prompt

文件：

- `backend/prompts/create/text.py`

结构核心：

1. system prompt
2. 一条 `Generate UI for {text_prompt}.`
3. stack 说明
4. design system 说明（可选）
5. 通用风格要求：
   - modern and sleek
   - modern, professional fonts and colors
   - follow UX best practices
   - image generation policy

这类 prompt 的特点：

- 不要求“和某张图一模一样”
- 更像“带设计审美约束的 UI 生成”
- 对模型的创造性依赖更高

适合：

- 从 PRD/想法/一句话描述生成初版界面

---

## 11.4 视频新建 Prompt

文件：

- `backend/prompts/create/video.py`

结构核心：

1. system prompt
2. 视频作为多模态输入
3. 一段强调“复刻交互行为”的用户指令
4. stack 说明
5. design system 说明（可选）
6. 用户补充指令（可选）

这类 prompt 的特点：

- 要求“看完整个视频”
- 要求理解所有交互和 UI 状态变化
- 要求“功能也要可运行”
- 如果原始交互依赖后端，可以 mock 数据

它比 image prompt 多出的关键要求是：

- 不只还原静态 UI
- 还要还原动态行为

因此视频模式强依赖更强的多模态与时序理解能力，这也是为什么当前视频模式只允许 Gemini 视频模型。

---

## 11.5 Update（基于历史）Prompt

文件：

- `backend/prompts/update/from_history.py`

适用条件：

- 当前 commit/variant 已经有结构化历史消息

做法：

- 把第一条 user message 加上 stack / image policy / design system 前缀
- 后续 user / assistant 历史按顺序完整保留
- assistant 历史会被包成 `<file path=\"index.html\">...</file>`

这类 prompt 的特点：

- 更像连续对话
- 让模型理解“之前版本怎么来的、用户后来又要求了什么”
- 适合多轮迭代更新

---

## 11.6 Update（基于文件快照）Prompt

文件：

- `backend/prompts/update/from_file_snapshot.py`

适用条件：

- 没有结构化历史
- 但有当前文件内容 `fileState.content`

做法：

- 把当前代码直接包装成：

  - `<current_file path=\"index.html\">...</current_file>`

- 把变更请求包装成：

  - `<change_request>...</change_request>`

这类 prompt 的特点：

- 不依赖多轮历史
- 直接给模型一个“当前文件 + 当前修改要求”的编辑任务
- 更像文件级 patch 指令

---

## 11.7 Design System 对 Prompt 的影响

如果用户在前端选择了 design system，后端会把它插入到 prompt 中：

- `backend/prompts/design_system.py`

格式是：

- `## Design system`
- `<design_system> ... </design_system>`

并且明确规定：

- 如果 design system 与其他指令冲突，优先 design system

这说明 design system 不是纯前端 UI 配置，而是直接进入 LLM Prompt 的硬约束。

---

## 12. 模型选择与 Prompt/模式的关系

模型选择发生在：

- `backend/routes/generate_code.py` -> `ModelSelectionStage`

当前逻辑：

- Video 模式：固定只用 Gemini 的视频变体模型
- Text Create：如果三家 key 都有，会走一组偏文本创作的模型组合
- Update：默认只用 2 个 variants，模型组合更保守
- Create Image：默认 4 个 variants
- 如果用户在设置中选了具体模型，则所有 variants 都用这一个模型复制展开

这意味着：

- 模式不同，不只 Prompt 不同
- 连默认模型池也不同

---

## 13. 当前仓库最值得记住的几个实现事实

1. **真正的主入口是 WebSocket `/generate-code`**
   - 而不是普通 REST 生成接口

2. **Agent 生成目标是单文件 `index.html`**
   - 多文件工程不是当前主模型

3. **Import 模式不走 AI**
   - 只是建立本地版本基线

4. **URL 模式本质上是图片模式的前置截图步骤**

5. **视频模式和图片模式不是一回事**
   - 视频 Prompt 更强调行为重建
   - 模型选择也不同

6. **Update 有两种 Prompt 构建策略**
   - 基于历史
   - 基于当前文件快照

7. **前端不仅展示最终代码**
   - 还展示 thinking / assistant / toolStart / toolResult 等 agent 过程

---

## 14. 关键文件导航

### 前端

- 应用入口：`frontend/src/main.tsx`
- 主工作台：`frontend/src/App.tsx`
- 新建面板：`frontend/src/components/unified-input/UnifiedInputPane.tsx`
- 四种模式：
  - `frontend/src/components/unified-input/tabs/UploadTab.tsx`
  - `frontend/src/components/unified-input/tabs/UrlTab.tsx`
  - `frontend/src/components/unified-input/tabs/TextTab.tsx`
  - `frontend/src/components/unified-input/tabs/ImportTab.tsx`
- 录屏：`frontend/src/components/recording/ScreenRecorder.tsx`
- 项目状态：`frontend/src/store/project-store.ts`
- 配置：`frontend/src/types.ts`
- WebSocket 客户端：`frontend/src/generateCode.ts`

### 后端

- 服务入口：`backend/main.py`
- 主生成链路：`backend/routes/generate_code.py`
- URL 截图：`backend/routes/screenshot.py`
- 导出：`backend/routes/export.py`
- Design System 存储：`backend/routes/design_systems.py`
- 模型集合：`backend/routes/model_choice_sets.py`
- 模型枚举：`backend/llm.py`
- 环境配置：`backend/config.py`

### Prompt / Agent

- 系统提示词：`backend/prompts/system_prompt.py`
- Prompt 总装配：`backend/prompts/pipeline.py`
- 图片 Prompt：`backend/prompts/create/image.py`
- 文本 Prompt：`backend/prompts/create/text.py`
- 视频 Prompt：`backend/prompts/create/video.py`
- Update Prompt（历史）：`backend/prompts/update/from_history.py`
- Update Prompt（快照）：`backend/prompts/update/from_file_snapshot.py`
- Agent 主循环：`backend/agent/engine.py`
- Provider 工厂：`backend/agent/providers/factory.py`
- OpenAI Provider：`backend/agent/providers/openai.py`
- Anthropic Provider：`backend/agent/providers/anthropic/provider.py`
- Gemini Provider：`backend/agent/providers/gemini.py`
- 工具定义：`backend/agent/tools/definitions.py`
- 工具运行时：`backend/agent/tools/runtime.py`

---

## 15. 总结

如果把这个项目压缩成一句话，它就是：

> 一个以 React 工作台为前端、以 FastAPI + WebSocket + 多 Provider Agent 工具调用循环为后端、目标是生成和迭代单文件 `index.html` 的多模态 AI 前端代码生成系统。

而“新建”里的 4 种模式并不是 4 套完全独立后端：

- Upload / URL / Text 会进入真正的 AI 生成链路
- Import 不会生成，只会导入
- URL 最终复用 image prompt
- Upload 内部又能细分为 image 与 video 两条不同 prompt / model 路径
