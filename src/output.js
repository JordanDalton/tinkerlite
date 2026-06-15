const content = document.getElementById('output-content')

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

}

function addBlock(parent, type, text) {
  const block = document.createElement('div')
  block.className = `output-block output-block--${type}`
  block.dataset.outputText = text
  block.textContent = text

  const copyBtn = document.createElement('button')
  copyBtn.className = 'output-block-copy-btn'
  copyBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy'
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    flashCopy(copyBtn, text)
  })
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
