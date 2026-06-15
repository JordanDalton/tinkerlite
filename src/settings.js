import 'vanilla-colorful/hex-color-picker.js'
import { COLOR_DEFS, loadStoredColors, saveStoredColors, resetColors,
         applyInterfaceColors, getColor } from './theme.js'
import { updateEditorColors } from './editor.js'

let stored = {}
let panel = null
let activePicker = null   // { popover, def, swatch, hex }

export function initSettings() {
  stored = loadStoredColors()
  panel = document.getElementById('panel-settings')

  document.getElementById('btn-theme').addEventListener('click', openPanel)
  document.getElementById('btn-settings-close').addEventListener('click', closePanel)
  document.getElementById('btn-settings-reset').addEventListener('click', () => {
    resetColors()
    stored = {}
    applyInterfaceColors(stored)
    updateEditorColors(stored)
    dismissPicker()
    renderRows()
  })

  // Click outside popover to dismiss
  document.addEventListener('mousedown', (e) => {
    if (!activePicker) return
    if (!activePicker.popover.contains(e.target) && e.target !== activePicker.swatch) {
      dismissPicker()
    }
  })

  renderRows()
}

function openPanel() {
  panel.classList.remove('hidden')
}

function closePanel() {
  dismissPicker()
  panel.classList.add('hidden')
}

function renderRows() {
  const groups = ['Interface', 'Tabs', 'Syntax', 'Editor']
  for (const group of groups) {
    const container = document.getElementById(`settings-group-${group.toLowerCase()}`)
    if (!container) continue
    container.innerHTML = ''
    for (const def of COLOR_DEFS.filter(d => d.group === group)) {
      container.appendChild(buildRow(def))
    }
  }
}

function buildRow(def) {
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
    saveStoredColors(stored)
    swatch.style.background = value
    hex.value = value
    if (activePicker) activePicker.picker.color = value
    if (def.group === 'Interface' || def.group === 'Tabs') applyInterfaceColors(stored)
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

  // Position below the swatch
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
