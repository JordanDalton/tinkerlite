const content = document.getElementById('output-content')

// --- Search state ---
let searchMatches = []
let searchIndex = -1
let searchQuery = ''
let searchCountEl = null

export function showEmpty() {
  content.innerHTML = '<div class="output-empty">Run code (⌘↵) to see output here.</div>'
}

export function showResult(result) {
  content.innerHTML = ''

  const raw = result.stdout || ''

  // \x1E = value block marker (from tl_out), \x1F = error block marker (from catch)
  // Split while keeping the delimiter so we know block type
  const parts = raw.split(/([\x1e\x1f])/)

  // parts[0] is any raw echo/print output before the first marker
  if (parts[0].trim()) {
    addBlock(content, 'echo', parts[0].trim())
  }

  for (let i = 1; i < parts.length; i += 2) {
    const marker = parts[i]
    const text = (parts[i + 1] || '').trim()
    if (!text) continue
    addBlock(content, marker === '\x1e' ? 'value' : 'error', text)
  }

  if (result.stderr) {
    addBlock(content, 'stderr', result.stderr.trim())
  }

  if (!raw.trim() && !result.stderr) {
    const empty = document.createElement('div')
    empty.className = 'output-empty'
    empty.textContent = result.ok ? '(no output)' : '(no output — check status)'
    content.appendChild(empty)
  }

  if (searchQuery) applyHighlights()
}

function addBlock(parent, type, text) {
  const block = document.createElement('div')
  block.className = `output-block output-block--${type}`
  block.dataset.outputText = text

  const toggleBtn = document.createElement('button')
  toggleBtn.className = 'output-block-toggle'
  toggleBtn.title = 'Collapse / expand'
  toggleBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
  toggleBtn.addEventListener('click', () => block.classList.toggle('output-block--minimized'))

  const preview = document.createElement('span')
  preview.className = 'output-block-preview'
  preview.textContent = text.split('\n')[0]

  const body = document.createElement('div')
  body.className = 'output-block-body'
  body.dataset.rawText = text
  body.textContent = text

  const copyBtn = document.createElement('button')
  copyBtn.className = 'output-block-copy-btn'
  copyBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy'
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    flashCopy(copyBtn, text)
  })

  block.appendChild(toggleBtn)
  block.appendChild(preview)
  block.appendChild(body)
  block.appendChild(copyBtn)

  parent.appendChild(block)
}

function flashCopy(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML
    btn.textContent = 'Copied!'
    setTimeout(() => { btn.innerHTML = orig }, 1400)
  })
}

// --- Search ---

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlightedHtml(raw, re) {
  let html = ''
  let last = 0
  let m
  re.lastIndex = 0
  while ((m = re.exec(raw)) !== null) {
    html += escapeHtml(raw.slice(last, m.index))
    html += `<mark class="output-search-match">${escapeHtml(m[0])}</mark>`
    last = re.lastIndex
    if (m[0].length === 0) re.lastIndex++
  }
  html += escapeHtml(raw.slice(last))
  return html
}

function applyHighlights() {
  searchMatches = []
  searchIndex = -1

  if (!searchQuery) {
    document.querySelectorAll('.output-block-body').forEach(body => {
      body.textContent = body.dataset.rawText
    })
    updateCount()
    return
  }

  const re = new RegExp(escapeRegExp(searchQuery), 'gi')

  document.querySelectorAll('.output-block-body').forEach(body => {
    const raw = body.dataset.rawText
    body.innerHTML = buildHighlightedHtml(raw, re)
    body.querySelectorAll('.output-search-match').forEach(m => searchMatches.push(m))
  })

  if (searchMatches.length) {
    searchIndex = 0
    activateMatch(0)
  }
  updateCount()
}

function activateMatch(idx) {
  searchMatches.forEach((m, i) => m.classList.toggle('output-search-match--active', i === idx))
  searchMatches[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function stepMatch(dir) {
  if (!searchMatches.length) return
  searchIndex = (searchIndex + dir + searchMatches.length) % searchMatches.length
  activateMatch(searchIndex)
  updateCount()
}

function updateCount() {
  if (!searchCountEl) return
  if (!searchQuery) { searchCountEl.textContent = ''; return }
  searchCountEl.textContent = searchMatches.length
    ? `${searchIndex + 1} / ${searchMatches.length}`
    : 'No matches'
}

export function initSearch() {
  const bar   = document.getElementById('output-search')
  const input = document.getElementById('output-search-input')
  searchCountEl = document.getElementById('output-search-count')
  const prevBtn  = document.getElementById('output-search-prev')
  const nextBtn  = document.getElementById('output-search-next')
  const closeBtn = document.getElementById('output-search-close')

  function openSearch() {
    bar.classList.remove('hidden')
    input.focus()
    input.select()
  }

  function closeSearch() {
    bar.classList.add('hidden')
    input.value = ''
    searchQuery = ''
    applyHighlights()
  }

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
      e.preventDefault()
      openSearch()
    }
    if (e.key === 'Escape' && !bar.classList.contains('hidden')) {
      closeSearch()
    }
  })

  input.addEventListener('input', () => {
    searchQuery = input.value
    applyHighlights()
  })

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      stepMatch(e.shiftKey ? -1 : 1)
    }
  })

  prevBtn.addEventListener('click', () => stepMatch(-1))
  nextBtn.addEventListener('click', () => stepMatch(1))
  closeBtn.addEventListener('click', closeSearch)
}
