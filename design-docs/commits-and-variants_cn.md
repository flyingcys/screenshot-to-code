# Commit 与非阻塞 Variants

本文档说明 screenshot-to-code 中的 commit 系统，以及非阻塞 variant 生成机制如何工作。

## Commit 系统

### 什么是 Commit？

Commit 表示应用历史中的离散版本。每个 commit 包含：

- **Hash**：唯一标识符（使用 `nanoid()` 生成）
- **Parent Hash**：指向上一个 commit，用于追踪历史
- **Variants**：多个代码生成选项（通常为 2 个）
- **Selected Variant**：用户当前正在查看的 variant
- **Status**：该 commit 仍在编辑中（`isCommitted: false`）还是已最终确定（`isCommitted: true`）

### Commit 类型

```typescript
type CommitType = "ai_create" | "ai_edit" | "code_create";
```

- **ai_create**：基于截图/视频的初始生成
- **ai_edit**：根据用户指令进行更新
- **code_create**：从已有代码导入

### 数据结构

```typescript
type Commit = {
  hash: CommitHash;
  parentHash: CommitHash | null;
  dateCreated: Date;
  isCommitted: boolean;
  variants: Variant[];
  selectedVariantIndex: number;
  type: CommitType;
  inputs: any; // Type-specific inputs
}

type Variant = {
  code: string;
  status: VariantStatus;
}

type VariantStatus = "generating" | "complete" | "cancelled";
```

### 存储与管理

Commit 以扁平 record 的形式存放在 project store 中：

```typescript
commits: Record<CommitHash, Commit>
head: CommitHash | null  // 当前激活的 commit
```

`head` 指针用于追踪当前激活的是哪个 commit。历史记录则通过沿着 `parentHash` 链接回溯来重建。

## 非阻塞 Variant

### 传统 Variant 生成方式（之前）

```
Start Generation → Wait for ALL variants → Show results
User Experience: [Loading...........................] → Ready
```

问题：
- 用户必须等待最慢的 variant
- 所有 variant 完成前无法交互
- 感知性能较差

### 非阻塞 Variant 生成方式（之后）

```
Start Generation → Show results as each variant completes
User Experience: [Loading.....] → Ready (Option 1)
                 [Loading..........] → Ready (Option 2)
```

收益：
- 第一个 variant 完成后即可立刻交互
- 其余 variant 仍在生成时，也可以切换查看已完成的 variant
- 显著提升感知性能

### 实现概览

#### 前端改动

**App.tsx**：增强事件处理
```typescript
// New WebSocket events
onVariantComplete: (variantIndex) => {
  updateVariantStatus(commit.hash, variantIndex, complete);
}
onVariantError: (variantIndex, error) => {
  updateVariantStatus(commit.hash, variantIndex, cancelled);
}
```

**Sidebar.tsx**：双条件 UI
```typescript
// Show update UI when either condition is true
{(appState === AppState.CODE_READY || isSelectedVariantComplete) && (
  <UpdateInterface />
)}
```

**Variants.tsx**：实时状态指示器
- 绿点：已完成的 variant
- 红点：已取消的 variant  
- Spinner：当前仍在生成的 variant

#### 后端改动

**generate_code.py**：独立处理每个 variant
```python
# Process each variant independently
async def process_variant_completion(index: int, task: asyncio.Task):
    completion = await task  # Wait for THIS variant only
    
    # Process images immediately
    processed_html = await perform_image_generation(...)
    
    # Send to frontend immediately
    await send_message("setCode", processed_html, index)
    await send_message("variantComplete", "Variant generation complete", index)
```

### 状态管理

#### App State 与 Variant Status

系统采用一种**混合状态方案**：

- **AppState**：全局生成状态（`INITIAL` → `CODING` → `CODE_READY`）
- **Variant Status**：单个 variant 的状态（`generating` → `complete`/`cancelled`）

#### UI 逻辑

```typescript
// UI shows update interface when either:
const canUpdate = 
  appState === AppState.CODE_READY ||           // All variants done
  isSelectedVariantComplete;                    // Selected variant done

// User can interact immediately when their selected variant completes
```

### WebSocket 协议

#### 来自后端的事件

```typescript
type WebSocketResponse = {
  type: "chunk" | "status" | "setCode" | "variantComplete" | "variantError";
  value: string;
  variantIndex: number;
}
```

- **chunk**：生成过程中流式返回的代码内容
- **status**：状态更新（例如 `"Generating images..."`）
- **setCode**：某个 variant 的最终代码
- **variantComplete**：variant 成功完成
- **variantError**：variant 因错误失败

#### 事件流

```
Backend: Generate Variant 1 → "setCode" → "variantComplete"
Frontend: Update UI → Allow interaction

Backend: Generate Variant 2 → "setCode" → "variantComplete"  
Frontend: Update UI → User can switch to this variant

Backend: Generate Variant 3 → "variantError"
Frontend: Show error → Mark as cancelled
```

### 用户体验流程

1. **用户开始生成**
   - 所有 variant 都标记为 `status: "generating"`
   - UI 显示带 spinner 的加载状态

2. **第一个 variant 完成**
   - 收到 `variantComplete` 事件
   - 状态更新为 `"complete"`
   - 如果它正好是当前选中的 variant → UI 立即允许更新
   - 用户可以在其余 variant 仍在生成时开始编辑

3. **用户切换 variant**
   - 可以立即切换到任意已完成的 variant
   - 也可以切换到仍在生成的 variant（会持续显示加载，直到完成）

4. **用户开始更新**
   - 会自动取消所有其他仍在生成的 variant
   - 避免浪费计算资源

### 收益

1. **感知性能**：用户看到结果的速度提升 2-3 倍
2. **并行处理**：多个模型可同时生成
3. **灵活交互**：在其他选项仍在工作时，可切换查看已就绪选项
4. **资源效率**：用户做出修改后，可取消未使用的 variant
5. **优雅降级**：即使部分 variant 失败，系统仍可继续工作

### 技术注意点

#### Variant 取消

当用户开始更新时，其余仍在生成的 variant 会被取消：

```typescript
// Cancel generating variants when user updates
currentCommit.variants.forEach((variant, index) => {
  if (index !== selectedVariantIndex && variant.status === generating) {
    wsRef.current.send(JSON.stringify({
      type: "cancel_variant",
      variantIndex: index
    }));
  }
});
```

#### 错误处理

每个 variant 都独立处理错误：
- 失败的 variant 不会阻塞成功的 variant
- 用户会看到每个 variant 对应的具体错误消息
- 即使部分 variant 失败，系统也保持可用

#### WebSocket 生命周期

- 新一轮生成会替换掉之前的 WebSocket 连接
- 旧连接会被关闭，避免资源泄漏
- 后端在发送消息前会先检查连接状态

这种架构在保持系统可靠性和资源效率的同时，也带来了响应式、非阻塞的用户体验。
