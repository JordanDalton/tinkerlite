import { invoke } from '@tauri-apps/api/core'

export function initPathAutocomplete(input, fetchFn = null) {
  let dropdown = null
  let items = []
  let cursor = -1
  let debounceTimer = null
  let suppressNext = false

  function createDropdown() {
    dropdown = document.createElement('div')
    dropdown.className = 'path-dropdown'
    document.body.appendChild(dropdown)
    positionDropdown()
  }

  function positionDropdown() {
    if (!dropdown) return
    const rect = input.getBoundingClientRect()
    dropdown.style.left = `${rect.left}px`
    dropdown.style.top = `${rect.bottom + 3}px`
    dropdown.style.width = `${rect.width}px`
  }

  function renderDropdown() {
    if (!dropdown) createDropdown()
    dropdown.innerHTML = ''
    cursor = -1
    items.forEach((item, i) => {
      const el = document.createElement('div')
      el.className = 'path-dropdown-item'

      const lastSlash = item.lastIndexOf('/')
      const name = item.slice(lastSlash + 1)
      const parent = item.slice(0, lastSlash + 1)

      const nameEl = document.createElement('span')
      nameEl.className = 'path-dropdown-name'
      nameEl.textContent = name

      const parentEl = document.createElement('span')
      parentEl.className = 'path-dropdown-parent'
      parentEl.textContent = parent

      el.appendChild(nameEl)
      el.appendChild(parentEl)

      el.addEventListener('mousedown', (e) => {
        e.preventDefault()
        accept(item)
      })
      dropdown.appendChild(el)
    })
    dropdown.classList.toggle('hidden', items.length === 0)
  }

  function setCursor(i) {
    const els = dropdown?.querySelectorAll('.path-dropdown-item') ?? []
    els.forEach(el => el.classList.remove('active'))
    cursor = Math.max(-1, Math.min(i, items.length - 1))
    if (cursor >= 0) els[cursor]?.classList.add('active')
  }

  function accept(value) {
    input.value = value + '/'
    close()
    suppressNext = true
  }

  function close() {
    dropdown?.classList.add('hidden')
    cursor = -1
  }

  async function query(value) {
    try {
      items = fetchFn ? await fetchFn(value) : await invoke('list_dir', { path: value })
      renderDropdown()
    } catch {
      items = []
      close()
    }
  }

  input.addEventListener('input', () => {
    if (suppressNext) { suppressNext = false; return }
    clearTimeout(debounceTimer)
    const val = input.value
    if (!val) { close(); return }
    debounceTimer = setTimeout(() => query(val), 80)
  })

  input.addEventListener('keydown', (e) => {
    if (!dropdown || dropdown.classList.contains('hidden')) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(cursor + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(cursor - 1) }
    else if (e.key === 'Tab' || e.key === 'Enter') {
      if (cursor >= 0 && items[cursor]) { e.preventDefault(); accept(items[cursor]) }
      else close()
    } else if (e.key === 'Escape') { close() }
  })

  input.addEventListener('blur', () => setTimeout(close, 120))
  input.addEventListener('focus', () => { if (input.value) query(input.value) })
}
