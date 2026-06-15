import { getCode, setCode } from './editor.js'
import { showResult, showEmpty } from './output.js'

let tabs = []
let activeId = null
let tabBarContainer = null
const listeners = {}
const connTabState = new Map() // connId → { tabs, activeId }

function on(event, fn) {
  listeners[event] = listeners[event] || []
  listeners[event].push(fn)
}

function emit(event, data) {
  ;(listeners[event] || []).forEach(fn => fn(data))
}

export function initTabs(container) {
  tabBarContainer = container
  addTab()
  render(container)
}

export function getActiveTab() {
  return tabs.find(t => t.id === activeId) || null
}

export function addTab() {
  saveActiveCode()
  const tab = { id: crypto.randomUUID(), code: '', output: null, name: null, snippetId: null, snippetName: null, snippetOriginalCode: null }
  tabs.push(tab)
  activateTab(tab.id)
  setTimeout(() => document.querySelector('.cm-editor .cm-content')?.focus(), 50)
  return tab
}

export function closeTab(id) {
  if (tabs.length === 1) return
  const idx = tabs.findIndex(t => t.id === id)
  if (idx === -1) return
  if (activeId === id) {
    const next = tabs[idx + 1] || tabs[idx - 1]
    activateTab(next.id, true)
  }
  tabs = tabs.filter(t => t.id !== id)
  emit('change')
}

export function activateTab(id, skipSave = false) {
  if (id === activeId && !skipSave) return
  if (!skipSave) saveActiveCode()
  activeId = id
  const tab = tabs.find(t => t.id === id)
  if (!tab) return
  setCode(tab.code)
  if (tab.output) showResult(tab.output)
  else showEmpty()
  emit('change')
}

export function saveActiveCode() {
  const tab = getActiveTab()
  if (tab) tab.code = getCode()
}

export function saveActiveOutput(result) {
  const tab = getActiveTab()
  if (tab) tab.output = result
}

export function setTabSnippet(snippetId, snippetName, code) {
  const tab = getActiveTab()
  if (!tab) return
  tab.snippetId = snippetId
  tab.snippetName = snippetName
  tab.snippetOriginalCode = code
  tab.code = code
  tab.name = null  // let snippetName drive the label
  setCode(code, true)
  emit('change')
}

export function saveTabsForConnection(connId) {
  if (!connId) return
  saveActiveCode()
  connTabState.set(connId, { tabs: tabs.map(t => ({ ...t })), activeId })
}

export function restoreTabsForConnection(connId) {
  const state = connTabState.get(connId)
  if (state) {
    tabs = state.tabs.map(t => ({ ...t }))
    activeId = state.activeId
    const tab = tabs.find(t => t.id === activeId)
    if (tab) {
      setCode(tab.code)
      if (tab.output) showResult(tab.output)
      else showEmpty()
    }
  } else {
    tabs = [{ id: crypto.randomUUID(), code: '', output: null, name: null, snippetId: null, snippetName: null, snippetOriginalCode: null }]
    activeId = tabs[0].id
    setCode('')
    showEmpty()
  }
  emit('change')
}

export function clearSnippetOrigins(snippetIds) {
  const idSet = new Set(snippetIds)
  tabs.forEach(tab => {
    if (tab.snippetId && idSet.has(tab.snippetId)) {
      tab.snippetId = null
      tab.snippetName = null
      tab.snippetOriginalCode = null
      tab.name = null
    }
  })
  emit('change')
}

export function updateDirtyIndicator() {
  if (!tabBarContainer) return
  const tab = getActiveTab()
  if (!tab) return
  const el = tabBarContainer.querySelector(`.tab[data-id="${tab.id}"] .tab-label`)
  if (!el) return
  const dirty = isTabDirty(tab, getCode())
  const base = tabLabel(tab, tabs.indexOf(tab))
  el.textContent = dirty ? `${base} •` : base
}

function isTabDirty(tab, currentCode) {
  if (tab.snippetOriginalCode === null) return false
  return currentCode !== tab.snippetOriginalCode
}

export function renderTabBar(container) {
  container.innerHTML = ''
  tabs.forEach((tab, i) => {
    const el = document.createElement('button')
    el.className = 'tab' + (tab.id === activeId ? ' tab--active' : '')
    el.dataset.id = tab.id

    const dirty = isTabDirty(tab, tab.id === activeId ? getCode() : tab.code)
    const base = tabLabel(tab, i)

    const label = document.createElement('span')
    label.className = 'tab-label'
    label.textContent = dirty ? `${base} •` : base
    label.title = 'Double-click to rename'
    label.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      startRename(tab, label, i)
    })

    const close = document.createElement('button')
    close.className = 'tab-close'
    close.innerHTML = '×'
    close.title = 'Close tab'
    close.addEventListener('click', (e) => {
      e.stopPropagation()
      closeTab(tab.id)
    })

    el.appendChild(label)
    if (tabs.length > 1) el.appendChild(close)
    el.addEventListener('click', () => activateTab(tab.id))
    container.appendChild(el)
  })

  const addBtn = document.createElement('button')
  addBtn.className = 'tab-add'
  addBtn.title = 'New tab (⌘T)'
  addBtn.textContent = '+'
  addBtn.addEventListener('click', () => addTab())
  container.appendChild(addBtn)
}

function tabLabel(tab, i) {
  if (tab.name) return tab.name
  if (tab.snippetName) return tab.snippetName
  const firstLine = tab.code.trim().split('\n')[0]
  if (!firstLine) return `Tab ${i + 1}`
  return firstLine.length > 22 ? firstLine.slice(0, 22) + '…' : firstLine
}

function startRename(tab, labelEl, i) {
  const input = document.createElement('input')
  input.className = 'tab-rename-input'
  input.value = tab.name || tabLabel(tab, i)
  input.style.width = Math.max(60, labelEl.offsetWidth) + 'px'

  labelEl.replaceWith(input)
  input.select()

  const commit = () => {
    const val = input.value.trim()
    tab.name = val || null
    emit('change')
  }

  input.addEventListener('blur', commit)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur() }
    if (e.key === 'Escape') { tab.name = tab.name; input.blur() }
    e.stopPropagation()
  })
}

function render(container) {
  renderTabBar(container)
  on('change', () => renderTabBar(container))
}

export { on }
