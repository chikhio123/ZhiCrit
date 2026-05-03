const { callAPI, parseJSON } = require('./api')

/**
 * Step 5: Annotate — mark specific sentences in the original text.
 *
 * Three mark types:
 *   yellow — suspected AI-generated patterns
 *   red    — logical fallacies / argument issues
 *   green  — strengths / valid insights
 *
 * Returns:
 *   { annotations: [{ quote, mark, reason }] }
 */
async function annotate(articleText, triageResult, extractResult, detectResult, config, loadPrompt) {
  const systemPrompt = loadPrompt('annotate.md')

  const context = {
    triage: {
      ai_probability: triageResult?.ai_probability,
      ai_signs: triageResult?.ai_signs || [],
      strengths: triageResult?.strengths || ''
    },
    extract: {
      strengths: extractResult?.strengths || [],
      core_observation_valid: extractResult?.core_observation_valid
    },
    detect: {
      issues: detectResult?.issues || [],
      strengths: detectResult?.strengths || [],
      strength_level: detectResult?.strength_level
    }
  }

  const userMessage =
    `以下分析结果仅供参考——你必须独立判断，如果你发现了分析结果没提到的问题或优点，同样要标记出来。\n\n分析结果：\n${JSON.stringify(context, null, 2)}\n\n原文：\n${articleText}\n\n请逐段扫描原文，找出每一个需要标记的句子。不要漏掉断言无支撑、虚假二分、空洞金句。优点也要同等力度标记。`

  const content = await callAPI(systemPrompt, userMessage, config)

  try {
    return parseJSON(content)
  } catch {
    return { annotations: [], raw: content }
  }
}

module.exports = { annotate }
