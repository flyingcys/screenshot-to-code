# Variant 系统

## 概览

Variant 系统会并行生成多个代码选项，让用户可以比较不同的 AI 生成实现。系统默认生成 3 个 variant，并且只需修改配置中的 `NUM_VARIANTS` 就能自动扩展。

## 配置

**关键设置：** `backend/config.py` 中的 `NUM_VARIANTS = 3`

修改这个值后，整个系统会自动扩展，以支持任意数量的 variants。

## 模型选择

模型会根据可用的 API key 进行轮换：

```python
# Both API keys present
models = [claude_model, Llm.GPT_4_1_NANO_2025_04_14]

# Claude only  
models = [claude_model, Llm.CLAUDE_4_5_SONNET_2025_09_29]

# OpenAI only
models = [Llm.GPT_4O_2024_11_20]
```

**轮换方式：** 如果 `models = [A, B]` 且 `NUM_VARIANTS = 5`，结果就是 `[A, B, A, B, A]`

**生成类型：**
- **Create**：主模型为 Claude 3.7 Sonnet
- **Update**：主模型为 Claude Sonnet 4.5

## 前端

### 网格布局
- **2 个 variants**：2 列
- **3 个 variants**：2 列（第 3 个换到下一行，避免过度挤压）
- **4 个 variants**：2x2 网格  
- **5-6 个 variants**：3 列
- **7 个及以上**：4 列

### 键盘快捷键
- **Option/Alt + 1、2、3...**：切换 variants
- 全局生效，即使光标在文本输入框中也可使用
- 使用 `event.code` 以保证跨平台兼容性
- 视觉指示会显示 ⌥1、⌥2、⌥3

## 架构

### 后端
- `StatusBroadcastMiddleware` 向前端发送 `variantCount`
- `ModelSelectionStage` 负责轮换可用模型
- 流水线通过 WebSocket 并行生成 variants

### 前端  
- 从后端动态获知 variant 数量
- `resizeVariants()` 会根据后端数量自适应 UI
- 每个 variant 都有独立的错误处理和状态展示

## WebSocket 消息

```typescript
"variantCount" | "chunk" | "status" | "setCode" | "variantComplete" | "variantError"
```

## 实现说明

✅ **可扩展**：修改 `NUM_VARIANTS` 后，所有部分都会自适应  
✅ **跨平台**：键盘快捷键可在 Mac / Windows 使用  
✅ **响应式**：网格布局会根据数量调整  
✅ **简单**：模型轮换机制可处理任意 variant 数量  

## 关键文件

- `backend/config.py` - `NUM_VARIANTS` 设置
- `backend/routes/generate_code.py` - 模型选择流水线  
- `frontend/src/components/variants/Variants.tsx` - UI 与快捷键
- `frontend/src/store/project-store.ts` - 状态管理
