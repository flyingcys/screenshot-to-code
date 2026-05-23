# 默认生成代码存放位置分析

## 结论

当前 `screenshot-to-code` 服务默认生成的 HTML 代码**不会自动落盘到项目目录**。

默认行为是：

- 后端通过 WebSocket 把生成结果回传给前端
- 前端把代码写入内存态的 Zustand store
- 预览区、代码区都直接读取这份内存中的代码
- 只有用户主动点击下载时，才会把代码导出到浏览器默认下载目录

因此，项目仓库里默认**没有一个固定目录**专门保存每次生成出来的 `index.html`。

## 生成代码的主链路

### 1. 后端把完整代码通过 WebSocket 发回前端

前端在 `frontend/src/generateCode.ts` 中监听后端消息：

- 收到 `setCode` 消息时，调用 `callbacks.onSetCode(...)`

对应位置：

- `frontend/src/generateCode.ts:117`

### 2. 前端收到代码后写入项目状态 store

`App.tsx` 中把 `onSetCode` 绑定到 `setCommitCode(...)`：

- `frontend/src/App.tsx:400`

`setCommitCode(...)` 会把代码写入 Zustand store 的：

- `commits[hash].variants[numVariant].code`

对应实现：

- `frontend/src/store/project-store.ts:210`

追加流式 token 时，也会写入同一个 store：

- `frontend/src/store/project-store.ts:157`

### 3. 预览区和代码区直接读取内存中的代码

预览区当前展示的代码来自：

- `currentCommit.variants[currentCommit.selectedVariantIndex].code`

对应位置：

- `frontend/src/components/preview/PreviewPane.tsx:50`

这说明页面上的最终 HTML 主要存在于前端运行时内存，而不是某个磁盘目录。

## 为什么仓库里看不到默认输出目录

本次代码排查中，没有发现“生成完成后自动把 HTML 写入仓库目录”的默认逻辑。

相反，代码中能看到的是：

- 导出 zip 时把内容写成压缩包内的 `index.html`
- 导出失败时回退为浏览器直接下载 `index.html`

对应位置：

- `frontend/src/components/preview/download.ts:19`
- `frontend/src/components/preview/download.ts:42`
- `backend/routes/export.py:440`

这里的“写入”是**导出下载内容**，不是把文件保存到当前项目目录。

## 浏览器本地持久化了什么

当前前端有本地持久化，但持久化的是**设置项**，不是默认生成代码。

例如：

- `frontend/src/hooks/usePersistedState.ts:7`
- `frontend/src/hooks/usePersistedState.ts:13`

这套逻辑会把设置写进 `localStorage`，比如 API Key、模型选择、主题、语言等；并没有默认把每次生成出来的 HTML 代码保存到本地目录。

## 用户实际能拿到代码的方式

### 方式 1：在页面代码面板中复制

代码区支持直接复制当前生成结果：

- `frontend/src/components/preview/CodeTab.tsx:18`

### 方式 2：点击下载

下载时有两种结果：

1. 优先调用后端导出接口，下载 zip
2. 如果导出失败，则直接下载 `index.html`

对应位置：

- `frontend/src/components/preview/download.ts:19`
- `frontend/src/components/preview/download.ts:43`

下载后的文件位置取决于**浏览器默认下载目录**，而不是项目仓库目录。

## 补充说明

后端内部确实会把“主文件路径”默认视为 `index.html`，例如：

- `backend/agent/state.py:11`
- `backend/agent/engine.py:48`

但这里表示的是**生成上下文中的目标文件名**，不是说程序会自动把结果写到仓库根目录的 `index.html`。

## 最终结论

如果问题是：

> 服务默认生成的代码，会放在哪个目录？

答案是：

**默认不会放到项目里的任何目录。**

它默认只存在于：

- 前端页面内存状态（Zustand store）
- 用户主动下载后所在的浏览器默认下载目录

如果后续希望“每次生成后自动落盘”，需要额外实现一个保存逻辑，比如自动写到：

- `generated/<timestamp>/index.html`
- 或 `outputs/<commit-hash>/index.html`

当前仓库默认没有这条逻辑。
