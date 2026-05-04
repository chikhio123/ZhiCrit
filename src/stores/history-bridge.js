// Shared logic between analysis and history stores.
// analysis.js imports addHistoryEntry from here instead of importing history.js.
// history.js imports loadHistoryReport from here and calls initHistoryBridge once.

let _store = null

/** Called once by history store after Pinia activates it. */
export function initHistoryBridge(store) {
  _store = store
}

/**
 * Create a history entry and insert it into the history store's list.
 * analysis.js calls this without importing history.js — the bridge holds the reference.
 */
export function addHistoryEntry(articleText, result) {
  if (!_store) return
  const list = _store.list

  const now = new Date()
  const id = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const wordCount = articleText.length
  const preview = articleText.replace(/\s+/g, '').slice(0, 40)
  const issueCount = (result.issueCount ?? (result.annotations || []).length) || 0

  // Deduplicate
  const dupIdx = list.findIndex(e => e.articleText === articleText)
  if (dupIdx !== -1) {
    const oldId = list[dupIdx].id
    list.splice(dupIdx, 1)
    try { localStorage.removeItem(`zhicrit-history-${oldId}`) } catch (_) {}
  }

  const entry = {
    id,
    date: now.toISOString(),
    preview,
    wordCount,
    level: result.level,
    issueCount,
    outputMode: result.outputMode,
    articleText
  }
  list.unshift(entry)

  if (result.report) {
    try { localStorage.setItem(`zhicrit-history-${id}`, result.report) } catch (_) {}
  }

  _store._syncLocal()
  return entry
}

/**
 * Load a history report and its annotations.
 * Returns null if the report is missing or empty.
 */
export async function loadHistoryReport(id, { getMarkdown, getAnnotations }) {
  const markdown = await getMarkdown(id)
  if (markdown == null || markdown === '') return null
  const annotations = await getAnnotations(id)
  return { markdown, annotations: annotations || [] }
}
