const { callAPI, parseJSON } = require('./api')

/**
 * Step 3: Issue Detection — check the argument chain item by item.
 *
 * Returns:
 *   { issues: [{ type, location, description, severity, one_line }] }
 */
async function detect(articleText, structure, config, loadPrompt) {
  const systemPrompt = loadPrompt('detect.md')

  const structureStr = JSON.stringify(structure, null, 2)
  const userMessage =
    `论证结构：\n${structureStr}\n\n原文：\n${articleText}\n\n请沿推理链逐步检查，在断裂处给出判断。`

  const content = await callAPI(systemPrompt, userMessage, config)

  try {
    return parseJSON(content)
  } catch {
    return { core_insight_valid: false, core_insight_notes: '', reasoning_chain_assessment: [], issues: [], strengths: [], strength_level: 'none', summary: '解析失败', raw: content }
  }
}

module.exports = { detect }
