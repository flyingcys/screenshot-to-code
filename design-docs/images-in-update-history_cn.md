# 更新历史中的图片

## 状态：✅ 已实现

后端已完整支持在更新历史中包含多张图片。

## 实现

### 核心函数
- `prompts/__init__.py` 中的 `create_message_from_history_item()` 负责处理图片
- 带有 `images` 数组的用户消息会创建多部分内容（图片 + 文本）
- 助手消息仍然仅包含文本（代码）
- 空的 `images` 数组会优雅地回退为仅文本

### 支持的流程
- ✅ 带图片的常规更新
- ✅ 带图片的导入代码更新  
- ✅ 每条消息支持多张图片
- ✅ 向后兼容（无图片）

### 测试
- ✅ 历史中的单张图片（`test_prompts.py`）
- ✅ 历史中的多张图片（`test_prompts.py`、`test_prompts_additional.py`）
- ✅ 带图片的导入代码（`test_prompts.py`、`test_prompts_additional.py`）
- ✅ 空的图片数组（`test_prompts_additional.py`）

## 用法
前端可以发送如下更新历史项：
```typescript
{
  text: "Update instructions",
  images: ["data:image/png;base64,img1", "data:image/png;base64,img2"]
}
```

后端会自动为 AI 模型创建正确的多部分消息。
