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
    `论证结构：\n${structureStr}\n\n原文：\n${articleText}\n\n请对照论证结构，逐项检查是否存在逻辑问题。`

  const content = await callAPI(systemPrompt, userMessage, config)

  try {
    return parseJSON(content)
  } catch {
    return { issues: [], raw: content }
  }
}

module.exports = { detect }
