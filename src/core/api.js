const fetch = require('node-fetch')

// ── Structured errors ──

class APIError extends Error {
  constructor(message, code, status, raw) {
    super(message)
    this.name = 'APIError'
    this.code = code      // 'auth' | 'rate_limit' | 'server' | 'network' | 'parse'
    this.status = status  // HTTP status if applicable
    this.raw = raw        // original response text
  }
}

/**
 * Unified API call layer — OpenAI-compatible chat completions format.
 * Returns the model's text response, or throws an APIError.
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

  const controller = new AbortController()
  const timeoutMs = config.timeout_ms || 120000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new APIError(
        `请求超时（${Math.round(timeoutMs / 1000)}s）：API 未在预期时间内响应。请检查网络或增加超时时间。`,
        'timeout', null, null
      )
    }
    throw new APIError(
      `网络连接失败：无法访问 ${config.api_base}。请检查网络或 API 地址。`,
      'network', null, err.message
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const status = response.status

    if (status === 401 || status === 403) {
      throw new APIError(
        '认证失败：API Key 无效或没有权限。请在设置中检查 Key 是否正确。',
        'auth', status, text
      )
    }
    if (status === 429) {
      throw new APIError(
        '请求过于频繁，API 限流。请稍等片刻再试。',
        'rate_limit', status, text
      )
    }
    if (status >= 500) {
      throw new APIError(
        `API 服务器错误 (${status})，可能是服务商暂时故障。请稍后重试。`,
        'server', status, text
      )
    }
    throw new APIError(
      `API 返回错误 (${status})`,
      'api', status, text
    )
  }

  let data
  try {
    data = await response.json()
  } catch (err) {
    throw new APIError(
      '无法解析 API 返回的响应，可能返回了非 JSON 内容。',
      'parse', null, err.message
    )
  }

  const content = data.choices?.[0]?.message?.content
  if (!content && content !== '') {
    throw new APIError(
      'API 返回了空响应，可能是模型不支持或参数有误。',
      'parse', null, JSON.stringify(data).slice(0, 500)
    )
  }

  return content
}

/**
 * Streaming variant — yields content chunks via SSE parsing.
 */
async function* callAPIStream(systemPrompt, userMessage, config) {
  const url = `${config.api_base}${config.endpoint}`
  const body = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    max_tokens: config.max_tokens || 4096,
    temperature: config.temperature ?? 0.3,
    stream: true
  }

  const controller = new AbortController()
  const timeoutMs = config.timeout_ms || 120000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new APIError(
        `请求超时（${Math.round(timeoutMs / 1000)}s）：API 未在预期时间内响应。请检查网络或增加超时时间。`,
        'timeout', null, null
      )
    }
    throw new APIError(
      `网络连接失败：无法访问 ${config.api_base}。请检查网络或 API 地址。`,
      'network', null, err.message
    )
  }

  if (!response.ok) {
    clearTimeout(timer)
    const text = await response.text().catch(() => '')
    const status = response.status

    if (status === 401 || status === 403) {
      throw new APIError(
        '认证失败：API Key 无效或没有权限。请在设置中检查 Key 是否正确。',
        'auth', status, text
      )
    }
    if (status === 429) {
      throw new APIError(
        '请求过于频繁，API 限流。请稍等片刻再试。',
        'rate_limit', status, text
      )
    }
    if (status >= 500) {
      throw new APIError(
        `API 服务器错误 (${status})，可能是服务商暂时故障。请稍后重试。`,
        'server', status, text
      )
    }
    throw new APIError(
      `API 返回错误 (${status})`,
      'api', status, text
    )
  }

  let buffer = ''
  try {
    for await (const chunk of response.body) {
      clearTimeout(timer)
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') return

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch (_) {
          // skip unparseable SSE lines
        }
      }
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new APIError(
        `请求超时（${Math.round(timeoutMs / 1000)}s）：API 未在预期时间内响应。请检查网络或增加超时时间。`,
        'timeout', null, null
      )
    }
    throw new APIError(
      `流式连接中断：${err.message}`,
      'network', null, err.message
    )
  }
}

/**
 * Parse a JSON block from model output — handles markdown code fences.
 */
function parseJSON(content) {
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : content.trim()
  return JSON.parse(jsonStr)
}

module.exports = { callAPI, callAPIStream, parseJSON, APIError }
