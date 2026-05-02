# ZhiCrit（知友）架构设计

## 项目概述

中文文章批判性分析工具。输入一篇文章，输出结构化的批判性分析报告（Markdown格式）。

---

## 技术栈

- **前端**：Electron + Vue 3（或 React）
- **后端**：Node.js（Electron 主进程）
- **AI 接口**：OpenAI 兼容格式（默认 DeepSeek，可切换任意兼容 API）
- **报告输出**：Markdown，前端内置渲染预览

---

## 核心流程

```
用户粘贴文章 → 预判（值不值得分析） → 结构提取 → 问题标记 → 生成报告
```

### Step 1：预判（Triage）

快速判断文章是否值得深度分析。用一次轻量 API 调用完成。

**输入**：文章全文
**输出**：三级判断
- `skip`：质量太低，给一句话定性（如"循环论证，不值得细拆"）
- `quick`：问题明显，一击定性即可，输出 3-5 句分析
- `deep`：值得深读，进入完整分析流程

**Prompt 设计要点**：
- 让模型先判断文章类型（鸡汤/观点文/分析文/叙事文）
- 判断论证密度：有没有可拆的论证链，还是纯情绪输出
- 检测 AI 生成特征：结构过于整齐、"不是……而是……"高频使用、每段等长、零语病

### Step 2：结构提取（Structure Extraction）

提取文章的论证骨架。

**输出格式**：
```json
{
  "core_claim": "作者的核心主张",
  "premises": [
    { "id": "P1", "content": "前提1", "explicit": true },
    { "id": "P2", "content": "前提2（隐含）", "explicit": false }
  ],
  "reasoning_chain": [
    { "from": "P1", "to": "P2", "type": "因果推理" },
    { "from": "P2", "to": "conclusion", "type": "归纳" }
  ],
  "conclusion": "作者的结论",
  "scope_claimed": "作者声称的适用范围",
  "scope_supported": "论证实际支撑的范围"
}
```

### Step 3：问题标记（Issue Detection）

对着论证链逐项检查，标记以下问题类型：

| 问题类型 | 说明 | 示例 |
|---------|------|------|
| `domain_shift` | 论证域滑移：在A域论证，结论扩展到B域 | 职场逻辑扩展到人生全部 |
| `circular` | 循环论证：结论被用作前提 | 穷人穷因为浪费时间，浪费时间因为穷 |
| `single_cause` | 单因果归因：复杂现象归因于单一变量 | 贫困是代际寄托的唯一原因 |
| `strawman` | 稻草人：否定一个没人主张的观点 | GPT常用的"不是A而是B"中A不存在 |
| `false_attribution` | 错误归因：把结果归因于错误的原因 | 补短板行为归因于九年义务教育 |
| `survivorship` | 幸存者偏差：只看成功案例做归纳 | 用乔布斯证明直觉比分析更好 |
| `scope_overflow` | 覆盖范围溢出：结论超出论证支撑的范围 | 论证了职场策略，结论是"人生的正道" |
| `term_swap` | 偷换概念/换词提供正当性 | 把"优秀"批判完换成"强大" |
| `missing_argument` | 论证缺失：关键判断无论证支撑 | "做人需要离群"直接断言 |

**每个问题标记输出**：
```json
{
  "type": "domain_shift",
  "location": "第3段到结论",
  "description": "在商业逻辑内论证了长板策略的合理性，但结论扩展为'成年人的世界'和'人生'的普遍规则",
  "severity": "critical | major | minor",
  "one_line": "人不只存在于职场中"
}
```

### Step 4：报告生成（Report Generation）

将以上三步的输出整合为 Markdown 报告。

**报告结构**：
```markdown
# 文章分析报告

## 基本信息
- 来源：[链接]
- 字数：xxx
- AI 生成概率：（手动填写或后续集成）

## 总体判断
一句话定性 + 分析等级（skip / quick / deep）

## 论证结构
核心主张 → 前提 → 推理路径 → 结论
（标注隐含前提）

## 问题清单
按严重程度排序的问题列表，每条附带位置、描述、一句话总结

## 收束
对整篇文章的整体评价（2-3句）
```

---

## 模块架构

```
zhicrit/
├── electron/
│   ├── main.js              # Electron 主进程
│   └── preload.js            # 预加载脚本
├── src/
│   ├── App.vue               # 主界面
│   ├── components/
│   │   ├── ArticleInput.vue   # 文章输入区（粘贴 / URL抓取）
│   │   ├── AnalysisPanel.vue  # 分析结果展示
│   │   ├── ReportView.vue     # Markdown 报告渲染
│   │   └── Settings.vue       # API 配置（endpoint / key / model）
│   ├── core/
│   │   ├── triage.js          # Step 1：预判
│   │   ├── extract.js         # Step 2：结构提取
│   │   ├── detect.js          # Step 3：问题标记
│   │   ├── report.js          # Step 4：报告生成
│   │   └── api.js             # 统一 API 调用层（OpenAI 兼容格式）
│   └── prompts/
│       ├── triage.md          # 预判 prompt
│       ├── extract.md         # 结构提取 prompt
│       ├── detect.md          # 问题标记 prompt
│       └── report.md          # 报告生成 prompt
├── output/                    # 生成的报告存放目录
├── package.json
└── README.md
```

---

## API 配置设计

```json
{
  "api_base": "https://api.deepseek.com",
  "api_key": "sk-xxx",
  "model": "deepseek-chat",
  "endpoint": "/v1/chat/completions",
  "max_tokens": 4096,
  "temperature": 0.3
}
```

用户可在 Settings 页面修改，支持任何 OpenAI 兼容 API（DeepSeek、GPT、本地模型等）。配置持久化到本地 JSON 文件。

---

## Prompt 策略

每一步使用独立的 prompt 文件（存放在 `src/prompts/` 下），便于迭代优化。

**关键 prompt 设计原则**：
1. 让模型先判断再分析，不要直接输出结论
2. 要求模型区分"我没发现问题"和"不存在问题"
3. 问题标记时要求给出具体位置（第几段、哪句话）
4. 收束时不要求全面，要求准确——宁可少说不可多说
5. 中文输出，术语保留英文标注

---

## 后续可扩展

- **AI 检测集成**：接 GPTZero API，在预判阶段自动检测
- **URL 抓取**：输入知乎链接自动提取正文
- **历史记录**：本地 SQLite 存储已分析的文章和报告
- **批量分析**：一次导入多篇文章，生成对比报告
- **Prompt 编辑器**：在 Settings 中直接编辑各步骤的 prompt
- **导出**：报告导出为 PDF / HTML
