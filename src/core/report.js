const { callAPI } = require('./api')

/**
 * Step 4: Report Generation — integrate outputs from steps 1–3 into a Markdown report.
 */
async function report(articleText, triageResult, structure, detectResult, config, loadPrompt) {
  const systemPrompt = loadPrompt('report.md')

  const triageStr = JSON.stringify(triageResult, null, 2)

  const isQuick = !structure

  const parts = [
    '请根据以下分析结果生成最终 Markdown 报告：',
    '',
    '## 原文',
    articleText,
    '',
    '## 预判结果',
    triageStr
  ]

  if (!isQuick) {
    parts.push('', '## 论证结构', JSON.stringify(structure, null, 2), '', '## 问题标记', JSON.stringify(detectResult, null, 2))
  } else {
    parts.push('', '## 注意', '本次为快速分析（quick），跳过了结构提取和问题标记步骤。请仅根据预判结果组织报告，论证结构和问题清单部分标注"快速分析模式，跳过此步骤"即可。')
  }

  const userMessage = parts.join('\n')

  const content = await callAPI(systemPrompt, userMessage, { ...config, max_tokens: 8192 })
  return content
}

module.exports = { report }
