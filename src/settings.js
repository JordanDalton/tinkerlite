import 'vanilla-colorful/hex-color-picker.js'
import {
  COLOR_DEFS, getColor, applyInterfaceColors, PRESETS,
  getAllThemes, getActiveThemeId, getActiveColors, setActiveThemeId,
  saveActiveColor, resetActiveTheme, createUserTheme, createUserThemeFromBase,
  deleteUserTheme, renameUserTheme,
} from './theme.js'
import { updateEditorColors } from './editor.js'

let stored = {}
let panel = null
let activePicker = null

export function initSettings() {
  stored = getActiveColors()
  panel = document.getElementById('panel-settings')

  document.getElementById('btn-theme').addEventListener('click', openPanel)
  document.getElementById('btn-settings-close').addEventListener('click', closePanel)
  document.getElementById('btn-settings-dock').addEventListener('click', dockPanel)
  document.getElementById('btn-settings-reset').addEventListener('click', () => {
    resetActiveTheme()
    stored = getActiveColors()
    applyInterfaceColors(stored)
    updateEditorColors(stored)
    dismissPicker()
    renderRows()
  })

  document.addEventListener('mousedown', (e) => {
    if (!activePicker) return
    if (!activePicker.popover.contains(e.target) && e.target !== activePicker.swatch) {
      dismissPicker()
    }
  })

  makeDraggable(panel)
  restorePanelPos(panel)
  buildThemeBar()
  renderRows()
}

function openPanel() { panel.classList.remove('hidden') }

function closePanel() {
  dismissPicker()
  panel.classList.add('hidden')
}

function dockPanel() {
  panel.classList.remove('panel-floating')
  panel.style.left = ''
  panel.style.top = ''
  panel.style.right = ''
  panel.style.bottom = ''
  document.getElementById('btn-settings-dock').classList.add('hidden')
  localStorage.removeItem('tinkerlite.theme-panel-pos')
}

function makeDraggable(p) {
  const header = p.querySelector('.settings-header')
  let dragging = false, ox = 0, oy = 0

  header.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return

    if (!p.classList.contains('panel-floating')) {
      const rect = p.getBoundingClientRect()
      p.classList.add('panel-floating')
      p.style.right = 'auto'
      p.style.left = rect.left + 'px'
      p.style.top = rect.top + 'px'
      document.getElementById('btn-settings-dock').classList.remove('hidden')
    }

    dragging = true
    const rect = p.getBoundingClientRect()
    ox = e.clientX - rect.left
    oy = e.clientY - rect.top
    document.body.style.userSelect = 'none'
    e.preventDefault()
  })

  document.addEventListener('mousemove', e => {
    if (!dragging) return
    const x = Math.max(0, Math.min(window.innerWidth - p.offsetWidth, e.clientX - ox))
    const y = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - oy))
    p.style.left = x + 'px'
    p.style.top = y + 'px'
  })

  document.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    document.body.style.userSelect = ''
    if (p.classList.contains('panel-floating')) {
      localStorage.setItem('tinkerlite.theme-panel-pos', JSON.stringify({
        left: p.style.left, top: p.style.top,
      }))
    }
  })
}

function restorePanelPos(p) {
  try {
    const raw = localStorage.getItem('tinkerlite.theme-panel-pos')
    if (!raw) return
    const { left, top } = JSON.parse(raw)
    p.classList.add('panel-floating')
    p.style.right = 'auto'
    p.style.left = left
    p.style.top = top
    document.getElementById('btn-settings-dock').classList.remove('hidden')
  } catch {}
}

// ── Theme switcher bar ────────────────────────────────────────────────────────

function buildThemeBar() {
  const existing = panel.querySelector('.settings-theme-bar')
  if (existing) existing.remove()

  const bar = document.createElement('div')
  bar.className = 'settings-theme-bar'

  // Select dropdown
  const select = document.createElement('select')
  select.className = 'settings-theme-select'
  rebuildOptions(select)

  select.addEventListener('change', () => {
    setActiveThemeId(select.value)
    stored = getActiveColors()
    applyInterfaceColors(stored)
    updateEditorColors(stored)
    syncButtons()
    renderRows()
  })

  // New theme button
  const newBtn = makeBarBtn(
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    'New theme'
  )
  newBtn.addEventListener('click', () => {
    showNewThemeModal((name, baseId) => {
      createUserThemeFromBase(name, baseId)
      stored = getActiveColors()
      applyInterfaceColors(stored)
      updateEditorColors(stored)
      rebuildOptions(select)
      syncButtons()
      renderRows()
    })
  })

  // Duplicate button
  const dupBtn = makeBarBtn(
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    'Duplicate current theme'
  )
  dupBtn.addEventListener('click', () => {
    const current = getAllThemes().find(t => t.id === getActiveThemeId())
    const name = window.prompt('Duplicate theme name:', `${current?.name || 'Theme'} copy`)
    if (!name?.trim()) return
    createUserTheme(name.trim())
    stored = getActiveColors()
    applyInterfaceColors(stored)
    updateEditorColors(stored)
    rebuildOptions(select)
    syncButtons()
    renderRows()
  })

  // Rename button
  const renameBtn = makeBarBtn(
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    'Rename theme'
  )
  renameBtn.addEventListener('click', () => {
    const id = getActiveThemeId()
    const current = getAllThemes().find(t => t.id === id)
    if (!current || current.builtIn) return
    const name = window.prompt('Rename theme:', current.name)
    if (!name?.trim()) return
    renameUserTheme(id, name.trim())
    rebuildOptions(select)
  })

  // Delete button
  const deleteBtn = makeBarBtn(
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
    'Delete theme'
  )
  deleteBtn.classList.add('settings-theme-btn--danger')
  deleteBtn.addEventListener('click', () => {
    const id = getActiveThemeId()
    const theme = getAllThemes().find(t => t.id === id)
    if (!theme || theme.builtIn) return
    if (!window.confirm(`Delete "${theme.name}"?`)) return
    deleteUserTheme(id)
    stored = getActiveColors()
    applyInterfaceColors(stored)
    updateEditorColors(stored)
    rebuildOptions(select)
    syncButtons()
    renderRows()
  })

  bar.appendChild(select)
  bar.appendChild(newBtn)
  bar.appendChild(dupBtn)
  bar.appendChild(renameBtn)
  bar.appendChild(deleteBtn)

  const body = panel.querySelector('.settings-body')
  body.insertBefore(bar, body.firstChild)

  function syncButtons() {
    const isBuiltIn = getAllThemes().find(t => t.id === getActiveThemeId())?.builtIn ?? true
    renameBtn.disabled = isBuiltIn
    deleteBtn.disabled = isBuiltIn
  }

  syncButtons()
}

function showNewThemeModal(onCreate) {
  const overlay = document.createElement('div')
  overlay.className = 'modal'

  const box = document.createElement('div')
  box.className = 'modal-box'
  box.style.maxWidth = '340px'

  const heading = document.createElement('h2')
  heading.textContent = 'New Theme'

  const nameLabel = document.createElement('label')
  nameLabel.textContent = 'Name'
  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.placeholder = 'My Theme'
  nameLabel.appendChild(nameInput)

  const baseLabel = document.createElement('label')
  baseLabel.textContent = 'Based on'
  const baseSelect = document.createElement('select')
  baseSelect.className = 'modal-select'
  PRESETS.forEach(p => {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = p.name
    baseSelect.appendChild(opt)
  })
  baseLabel.appendChild(baseSelect)

  const actions = document.createElement('div')
  actions.className = 'modal-actions'

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'btn-ghost'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', close)

  const createBtn = document.createElement('button')
  createBtn.className = 'btn-accent'
  createBtn.textContent = 'Create'
  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim()
    if (!name) { nameInput.focus(); return }
    close()
    onCreate(name, baseSelect.value)
  })

  actions.appendChild(cancelBtn)
  actions.appendChild(createBtn)
  box.appendChild(heading)
  box.appendChild(nameLabel)
  box.appendChild(baseLabel)
  box.appendChild(actions)
  overlay.appendChild(box)
  document.body.appendChild(overlay)

  nameInput.focus()

  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') close()
    if (e.key === 'Enter' && e.target !== cancelBtn) createBtn.click()
  })
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close() })

  function close() { overlay.remove() }
}

function rebuildOptions(select) {
  select.innerHTML = ''
  const themes = getAllThemes()
  const activeId = getActiveThemeId()

  const builtIns = themes.filter(t => t.builtIn)
  const userThemes = themes.filter(t => !t.builtIn)

  const builtInGroup = document.createElement('optgroup')
  builtInGroup.label = 'Built-in'
  builtIns.forEach(t => {
    const opt = document.createElement('option')
    opt.value = t.id
    opt.textContent = t.name
    opt.selected = t.id === activeId
    builtInGroup.appendChild(opt)
  })
  select.appendChild(builtInGroup)

  if (userThemes.length) {
    const userGroup = document.createElement('optgroup')
    userGroup.label = 'My Themes'
    userThemes.forEach(t => {
      const opt = document.createElement('option')
      opt.value = t.id
      opt.textContent = t.name
      opt.selected = t.id === activeId
      userGroup.appendChild(opt)
    })
    select.appendChild(userGroup)
  }
}

function makeBarBtn(svg, title) {
  const btn = document.createElement('button')
  btn.className = 'settings-theme-btn'
  btn.title = title
  btn.innerHTML = svg
  return btn
}

// ── Color rows ────────────────────────────────────────────────────────────────

function renderRows() {
  stored = getActiveColors()
  const groups = ['Theme Panel', 'Buttons', 'Interface', 'Tabs', 'Output', 'Syntax', 'Editor']
  for (const group of groups) {
    const container = document.getElementById(`settings-group-${group.toLowerCase()}`)
    if (!container) continue
    container.innerHTML = ''
    for (const def of COLOR_DEFS.filter(d => d.group === group)) {
      container.appendChild(buildRow(def))
    }
  }
}

function buildWeightRow(def, options) {
  const current = stored[def.key] ?? def.default

  const row = document.createElement('div')
  row.className = 'color-row'

  const label = document.createElement('span')
  label.className = 'color-row-label'
  label.textContent = def.label

  const group = document.createElement('div')
  group.className = 'weight-btn-group'

  for (const opt of options) {
    const btn = document.createElement('button')
    btn.className = 'weight-btn' + (current === opt.value ? ' weight-btn--active' : '')
    btn.textContent = opt.label
    btn.title = opt.title
    btn.addEventListener('click', () => {
      stored[def.key] = opt.value
      saveActiveColor(def.key, opt.value)
      group.querySelectorAll('.weight-btn').forEach((b, i) => {
        b.classList.toggle('weight-btn--active', options[i].value === opt.value)
      })
      updateEditorColors(stored)
    })
    group.appendChild(btn)
  }

  row.appendChild(label)
  row.appendChild(group)
  return row
}

function buildRow(def) {
  if (def.type === 'weight') return buildWeightRow(def, [
    { value: '300', label: 'L', title: 'Light' },
    { value: 'normal', label: 'N', title: 'Normal' },
    { value: 'bold', label: 'B', title: 'Bold' },
  ])
  if (def.type === 'style') return buildWeightRow(def, [
    { value: 'normal', label: 'N', title: 'Normal' },
    { value: 'italic', label: 'I', title: 'Italic' },
  ])
  const current = getColor(def.key, stored)

  const row = document.createElement('div')
  row.className = 'color-row'

  const label = document.createElement('span')
  label.className = 'color-row-label'
  label.textContent = def.label

  const inputs = document.createElement('div')
  inputs.className = 'color-row-inputs'

  const swatch = document.createElement('button')
  swatch.className = 'color-swatch'
  swatch.style.background = current
  swatch.title = 'Pick color'

  const hex = document.createElement('input')
  hex.type = 'text'
  hex.value = current
  hex.maxLength = 7
  hex.className = 'color-hex'
  hex.spellcheck = false

  const apply = (value) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return
    stored[def.key] = value
    saveActiveColor(def.key, value)
    swatch.style.background = value
    hex.value = value
    if (activePicker) activePicker.picker.color = value
    if (def.group === 'Interface' || def.group === 'Tabs' || def.group === 'Output' || def.group === 'Buttons') applyInterfaceColors(stored)
    if (def.group === 'Syntax' || def.group === 'Editor') updateEditorColors(stored)
  }

  swatch.addEventListener('click', (e) => {
    e.stopPropagation()
    if (activePicker?.swatch === swatch) { dismissPicker(); return }
    dismissPicker()
    showPicker(def, swatch, hex, apply)
  })

  hex.addEventListener('input', () => {
    const v = hex.value.startsWith('#') ? hex.value : '#' + hex.value
    if (/^#[0-9a-fA-F]{6}$/.test(v)) apply(v)
  })

  hex.addEventListener('blur', () => {
    hex.value = getColor(def.key, stored)
    swatch.style.background = hex.value
  })

  inputs.appendChild(swatch)
  inputs.appendChild(hex)
  row.appendChild(label)
  row.appendChild(inputs)
  return row
}

function showPicker(def, swatch, hex, apply) {
  const popover = document.createElement('div')
  popover.className = 'color-popover'

  const picker = document.createElement('hex-color-picker')
  picker.color = getColor(def.key, stored)

  picker.addEventListener('color-changed', (e) => {
    apply(e.detail.value)
  })

  popover.appendChild(picker)
  document.body.appendChild(popover)

  const rect = swatch.getBoundingClientRect()
  const popH = 240
  const spaceBelow = window.innerHeight - rect.bottom
  if (spaceBelow >= popH + 8) {
    popover.style.top = `${rect.bottom + 6}px`
  } else {
    popover.style.top = `${rect.top - popH - 6}px`
  }
  popover.style.left = `${Math.max(8, rect.left - 100)}px`

  activePicker = { popover, picker, swatch, hex, def, apply }
}

function dismissPicker() {
  if (!activePicker) return
  activePicker.popover.remove()
  activePicker = null
}
