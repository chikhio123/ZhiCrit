const { callAPI, parseJSON } = require('./api')

/**
 * Step 2: Structure Extraction — extract the argument skeleton of the article.
 *
 * Returns:
 *   { core_claim, premises, reasoning_chain, conclusion, scope_claimed, scope_supported }
 */
async function extract(articleText, config, loadPrompt) {
  const systemPrompt = loadPrompt('extract.md')
  const userMessage = `请提取以下文章的论证结构：\n\n${articleText}`

  const content = await callAPI(systemPrompt, userMessage, config)

  try {
    return parseJSON(content)
  } catch {
    return {
      core_claim: '(解析失败)',
      premises: [],
      reasoning_chain: [],
      conclusion: '',
      scope_claimed: '',
      scope_supported: '',
      raw: content
    }
  }
}

module.exports = { extract }
