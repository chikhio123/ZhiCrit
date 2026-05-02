const { callAPI, parseJSON } = require('./api')

/**
 * Step 1: Triage — quickly judge whether the article is worth deep analysis.
 *
 * Returns:
 *   { level: 'skip'|'quick'|'deep', verdict: string, ... }
 */
async function triage(articleText, config, loadPrompt) {
  const systemPrompt = loadPrompt('triage.md')
  const userMessage = `请判断以下文章是否值得深度分析，并给出你的判断：\n\n${articleText}`

  const content = await callAPI(systemPrompt, userMessage, config)

  try {
    return parseJSON(content)
  } catch {
    // Fallback: treat raw response as the verdict
    const lower = content.toLowerCase()
    if (lower.includes('skip') || lower.includes('跳过')) {
      return { level: 'skip', verdict: content }
    }
    if (lower.includes('quick') || lower.includes('快速')) {
      return { level: 'quick', verdict: content }
    }
    return { level: 'deep', verdict: content }
  }
}

module.exports = { triage }
