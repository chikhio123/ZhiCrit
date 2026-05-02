/**
 * Unified API call layer — OpenAI-compatible chat completions format.
 */

async function callAPI(systemPrompt, userMessage, config) {
  const url = `${config.api_base}${config.endpoint}`
  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: config.max_tokens || 4096,
    temperature: config.temperature ?? 0.3
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API error ${response.status}: ${text}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * Parse a JSON block from model output — handles markdown code fences.
 */
function parseJSON(content) {
  // Try to extract from ```json ... ``` block
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : content.trim()
  return JSON.parse(jsonStr)
}

module.exports = { callAPI, parseJSON }
