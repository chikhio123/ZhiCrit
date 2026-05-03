# 知友 ZhiCrit

中文文章批判性分析工具。粘贴一篇文章，AI 逐段检查论证质量——不是贴逻辑谬误标签，而是校准论证边界。

## 两种输出模式

| 模式 | 产出 | 适合 |
|------|------|------|
| **分析报告** | 结构化 Markdown 报告（总体判断→可取之处→论证结构→问题清单→收束） | 深度理解一篇文章的论证质量 |
| **原文标注** | 三色高亮（🟡 AI 痕迹 / 🔴 逻辑问题 / 🟢 可取之处） | 快速定位原文中的具体问题 |

## 两种深度

| 深度 | 步骤 | 耗时 |
|------|------|------|
| **深度** | 预判 → 结构提取 → 问题标记 → 报告/标注 | 较长，但判断更准 |
| **快速** | 预判 → 报告/标注 | 快，适合快速扫一眼 |

## 分析管线

```
文章 → 预判 → 结构提取 → 问题标记 → ┬ 报告生成（Markdown）
                                        └ 原文标注（三色高亮）
```

- **预判**：判断文章是否值得深度分析
- **结构提取**：提取前提、推理链、核心主张
- **问题标记**：15 种类型逐项排查（含 charitable reading 校准）
- **报告/标注**：按需生成

## 特性

- **多 API 配置管理** — 保存多套 API（DeepSeek / OpenAI / Ollama / Gemini），一键切换
- **支持任意 OpenAI 兼容接口** — 内置 OpenAI Chat Completions / Responses / Anthropic Messages 端点预设
- **模型列表拉取** — 一键获取 API 可用模型
- **步骤复用** — 同一篇文章切换模式时，已完成的步骤自动跳过
- **本地存储** — API Key 存在本地，不上传
- **报告导出** — 分析报告可保存为 Markdown 文件
- **毛玻璃设置面板** — 不打断分析流程

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```

## 配置

1. 点击右上角「设置」
2. 填写 API 信息：
   - **API Base URL** — 如 `https://api.deepseek.com`
   - **Endpoint** — 下拉选择（OpenAI / Anthropic 格式）
   - **API Key** — 你的密钥
   - **Model** — 模型名，可点「拉取」自动获取
   - **Max Tokens** / **Temperature** — 可选调整
3. 点击「保存配置」
4. 可以添加多套配置，通过下拉菜单切换

## 技术栈

- **前端**：Vue 3 + Pinia + Vite
- **桌面**：Electron
- **样式**：CSS 变量 + 毛玻璃效果
- **Markdown**：marked + DOMPurify
- **API**：OpenAI 兼容 chat/completions 格式

## License

MIT
