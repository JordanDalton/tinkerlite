// Central color definitions. Each entry is one row in the theme editor.
export const COLOR_DEFS = [
  // Interface
  { key: '--accent',        label: 'Accent',              group: 'Interface', default: '#414c6b' },
  { key: '--base',          label: 'App background',      group: 'Interface', default: '#29293d' },
  { key: '--mantle',        label: 'Sidebar / toolbar',   group: 'Interface', default: '#1e1e36' },
  { key: '--surface-0',     label: 'Cards / inputs',      group: 'Interface', default: '#14141e' },
  { key: '--surface-1',     label: 'Modals',              group: 'Interface', default: '#191926' },
  { key: '--divider',       label: 'Panel dividers',      group: 'Interface', default: '#252538' },
  { key: '--overlay-0',     label: 'Card borders',        group: 'Interface', default: '#252538' },
  { key: '--overlay-1',     label: 'Strong borders',      group: 'Interface', default: '#373754' },
  { key: '--input-border',  label: 'Input border',        group: 'Interface', default: '#252538' },
  { key: '--text',          label: 'Primary text',        group: 'Interface', default: '#e2e2f0' },
  { key: '--subtext-1',     label: 'Secondary text',      group: 'Interface', default: '#b4b4cc' },
  { key: '--subtext-0',     label: 'Muted text',          group: 'Interface', default: '#9a9ab8' },
  { key: '--muted',         label: 'Very muted',          group: 'Interface', default: '#64647d' },
  { key: '--ok',            label: 'Success',             group: 'Interface', default: '#3dd68c' },
  { key: '--error',         label: 'Error',               group: 'Interface', default: '#f87171' },
  { key: '--warning',       label: 'Warning',             group: 'Interface', default: '#bf9c43' },

  // Tabs
  { key: '--tab-bar-bg',      label: 'Tab bar background', group: 'Tabs', default: '#29294a' },
  { key: '--tab-active-bg',   label: 'Active tab',         group: 'Tabs', default: '#464673' },
  { key: '--tab-active-text', label: 'Active tab text',    group: 'Tabs', default: '#e2e2f0' },
  { key: '--tab-text',        label: 'Inactive tab text',  group: 'Tabs', default: '#9a9ab8' },
  { key: '--tab-border',      label: 'Tab bar border',     group: 'Tabs', default: '#252538' },

  // Buttons
  { key: '--btn-run',          label: 'Run button',            group: 'Buttons', default: '#414c6b' },
  { key: '--btn-primary',      label: 'Primary actions',       group: 'Buttons', default: '#414c6b' },
  { key: '--btn-ghost-text',   label: 'New Project text',      group: 'Buttons', default: '#9a9ab8' },
  { key: '--btn-ghost-border', label: 'New Project border',    group: 'Buttons', default: '#252538' },

  // Theme Panel
  { key: '--settings-bg',     label: 'Panel background',  group: 'Theme Panel', default: '#191926' },
  { key: '--settings-border', label: 'Panel border',      group: 'Theme Panel', default: '#252538' },
  { key: '--settings-label',  label: 'Section labels',    group: 'Theme Panel', default: '#64647d' },
  { key: '--settings-row-hover', label: 'Row hover',      group: 'Theme Panel', default: '#252538' },

  // Output
  { key: '--out-value-border',  label: 'Value border',       group: 'Output', default: '#414c6b' },
  { key: '--out-echo-border',   label: 'Echo border',        group: 'Output', default: '#64647d' },
  { key: '--out-block-bg',      label: 'Block background',   group: 'Output', default: '#14141e' },
  { key: '--out-btn-bg',        label: 'Clear/Copy background', group: 'Output', default: '#1e1e36' },
  { key: '--out-btn-text',      label: 'Clear/Copy text',       group: 'Output', default: '#9a9ab8' },
  { key: '--out-btn-border',    label: 'Clear/Copy border',     group: 'Output', default: '#373754' },

  // Syntax
  { key: 'syn-keyword',     label: 'Keywords',             group: 'Syntax', default: '#c678dd' },
  { key: 'syn-string',      label: 'Strings',              group: 'Syntax', default: '#98c379' },
  { key: 'syn-number',      label: 'Numbers / booleans',   group: 'Syntax', default: '#d19a66' },
  { key: 'syn-fn',          label: 'Functions',            group: 'Syntax', default: '#61afef' },
  { key: 'syn-type',        label: 'Classes / types',      group: 'Syntax', default: '#d9c9ab' },
  { key: 'syn-variable',    label: 'Variables',            group: 'Syntax', default: '#e5c07b' },
  { key: 'syn-property',    label: 'Properties',           group: 'Syntax', default: '#dbdada' },
  { key: 'syn-operator',    label: 'Operators',            group: 'Syntax', default: '#56b6c2' },
  { key: 'syn-punctuation', label: 'Punctuation',          group: 'Syntax', default: '#abb2bf' },
  { key: 'syn-comment',     label: 'Comments',             group: 'Syntax', default: '#7d8799' },
  { key: 'syn-text',        label: 'Default text',         group: 'Syntax', default: '#abb2bf' },
  // Syntax font weight / style toggles
  { key: 'syn-keyword-weight',  label: 'Keywords',    group: 'Syntax', type: 'weight', default: 'normal' },
  { key: 'syn-fn-weight',       label: 'Functions',   group: 'Syntax', type: 'weight', default: 'normal' },
  { key: 'syn-type-weight',     label: 'Classes',     group: 'Syntax', type: 'weight', default: 'normal' },
  { key: 'syn-variable-weight', label: 'Variables',   group: 'Syntax', type: 'weight', default: 'normal' },
  { key: 'syn-property-weight', label: 'Properties',  group: 'Syntax', type: 'weight', default: 'normal' },
  { key: 'syn-comment-style',   label: 'Comments',    group: 'Syntax', type: 'style',  default: 'italic' },

  // Editor chrome
  { key: 'ed-bg',             label: 'Background',         group: 'Editor', default: '#2e2e45' },
  { key: 'ed-cursor',         label: 'Cursor',             group: 'Editor', default: '#414c6b' },
  { key: 'ed-gutter',         label: 'Gutter text',        group: 'Editor', default: '#6d6d73' },
  { key: 'ed-gutter-border',  label: 'Gutter border',      group: 'Editor', default: '#252538' },
  { key: 'ed-tooltip-bg',     label: 'Tooltip background', group: 'Editor', default: '#2e2e45' },
  { key: 'ed-selection',      label: 'Selection',          group: 'Editor', default: '#414c6b' },
  { key: 'ed-line-highlight', label: 'Active line',        group: 'Editor', default: '#ffffff' },
]

// ── Built-in presets ──────────────────────────────────────────────────────────

export const PRESETS = [
  {
    id: 'tinkerlite',
    name: 'TinkerLite',
    colors: {
      '--accent': '#414c6b', '--base': '#29293d', '--mantle': '#1e1e36',
      '--surface-0': '#14141e', '--surface-1': '#191926',
      '--divider': '#252538', '--overlay-0': '#252538', '--overlay-1': '#373754', '--input-border': '#252538',
      '--text': '#e2e2f0', '--subtext-1': '#b4b4cc', '--subtext-0': '#9a9ab8',
      '--muted': '#64647d', '--ok': '#3dd68c', '--error': '#f87171', '--warning': '#bf9c43',
      '--tab-bar-bg': '#29294a', '--tab-active-bg': '#464673', '--tab-active-text': '#e2e2f0',
      '--tab-text': '#9a9ab8', '--tab-border': '#252538',
      '--btn-run': '#414c6b', '--btn-primary': '#414c6b',
      '--btn-ghost-text': '#9a9ab8', '--btn-ghost-border': '#252538',
      '--settings-bg': '#191926', '--settings-border': '#252538', '--settings-label': '#64647d', '--settings-row-hover': '#252538',
      '--out-value-border': '#414c6b', '--out-echo-border': '#64647d', '--out-block-bg': '#14141e',
      '--out-btn-bg': '#1e1e36', '--out-btn-text': '#9a9ab8', '--out-btn-border': '#373754',
      'syn-keyword': '#c678dd', 'syn-string': '#98c379', 'syn-number': '#d19a66',
      'syn-fn': '#61afef', 'syn-type': '#d9c9ab', 'syn-variable': '#e5c07b',
      'syn-property': '#dbdada', 'syn-operator': '#56b6c2', 'syn-punctuation': '#abb2bf',
      'syn-comment': '#7d8799', 'syn-text': '#abb2bf',
      'syn-keyword-weight': 'normal', 'syn-fn-weight': 'normal', 'syn-type-weight': 'normal',
      'syn-variable-weight': 'normal', 'syn-property-weight': 'normal', 'syn-comment-style': 'italic',
      'ed-bg': '#2e2e45', 'ed-cursor': '#414c6b', 'ed-gutter': '#6d6d73', 'ed-gutter-border': '#252538',
      'ed-tooltip-bg': '#2e2e45', 'ed-selection': '#414c6b', 'ed-line-highlight': '#ffffff',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      '--accent': '#bd93f9', '--base': '#282a36', '--mantle': '#21222c',
      '--surface-0': '#191a21', '--surface-1': '#1e1f29',
      '--divider': '#44475a', '--overlay-0': '#44475a', '--overlay-1': '#6272a4', '--input-border': '#44475a',
      '--text': '#f8f8f2', '--subtext-1': '#e2e0df', '--subtext-0': '#b0b0b8',
      '--muted': '#6272a4', '--ok': '#50fa7b', '--error': '#ff5555', '--warning': '#ffb86c',
      '--tab-bar-bg': '#21222c', '--tab-active-bg': '#44475a', '--tab-active-text': '#f8f8f2',
      '--tab-text': '#6272a4', '--tab-border': '#191a21',
      '--btn-run': '#bd93f9', '--btn-primary': '#bd93f9',
      '--btn-ghost-text': '#b0b0b8', '--btn-ghost-border': '#44475a',
      '--settings-bg': '#1e1f29', '--settings-border': '#44475a', '--settings-label': '#6272a4', '--settings-row-hover': '#44475a',
      '--out-value-border': '#bd93f9', '--out-echo-border': '#6272a4', '--out-block-bg': '#191a21',
      '--out-btn-bg': '#21222c', '--out-btn-text': '#b0b0b8', '--out-btn-border': '#6272a4',
      'syn-keyword': '#ff79c6', 'syn-string': '#f1fa8c', 'syn-number': '#bd93f9',
      'syn-fn': '#50fa7b', 'syn-type': '#8be9fd', 'syn-variable': '#f8f8f2',
      'syn-property': '#f8f8f2', 'syn-operator': '#ff79c6', 'syn-punctuation': '#f8f8f2',
      'syn-comment': '#6272a4', 'syn-text': '#f8f8f2',
      'syn-keyword-weight': 'normal', 'syn-fn-weight': 'normal', 'syn-type-weight': 'normal',
      'syn-variable-weight': 'normal', 'syn-property-weight': 'normal', 'syn-comment-style': 'italic',
      'ed-bg': '#282a36', 'ed-cursor': '#f8f8f2', 'ed-gutter': '#6272a4', 'ed-gutter-border': '#44475a',
      'ed-tooltip-bg': '#282a36', 'ed-selection': '#bd93f9', 'ed-line-highlight': '#44475a',
    },
  },
  {
    id: 'one-dark',
    name: 'One Dark Pro',
    colors: {
      '--accent': '#61afef', '--base': '#282c34', '--mantle': '#21252b',
      '--surface-0': '#1a1d23', '--surface-1': '#1e2227',
      '--divider': '#3e4451', '--overlay-0': '#3e4451', '--overlay-1': '#545862', '--input-border': '#3e4451',
      '--text': '#abb2bf', '--subtext-1': '#9da5b4', '--subtext-0': '#828997',
      '--muted': '#545862', '--ok': '#98c379', '--error': '#e06c75', '--warning': '#e5c07b',
      '--tab-bar-bg': '#21252b', '--tab-active-bg': '#282c34', '--tab-active-text': '#abb2bf',
      '--tab-text': '#545862', '--tab-border': '#181a1f',
      '--btn-run': '#61afef', '--btn-primary': '#61afef',
      '--btn-ghost-text': '#828997', '--btn-ghost-border': '#3e4451',
      '--settings-bg': '#1e2227', '--settings-border': '#3e4451', '--settings-label': '#545862', '--settings-row-hover': '#3e4451',
      '--out-value-border': '#61afef', '--out-echo-border': '#545862', '--out-block-bg': '#1a1d23',
      '--out-btn-bg': '#21252b', '--out-btn-text': '#828997', '--out-btn-border': '#545862',
      'syn-keyword': '#c678dd', 'syn-string': '#98c379', 'syn-number': '#d19a66',
      'syn-fn': '#61afef', 'syn-type': '#e5c07b', 'syn-variable': '#e06c75',
      'syn-property': '#abb2bf', 'syn-operator': '#56b6c2', 'syn-punctuation': '#abb2bf',
      'syn-comment': '#5c6370', 'syn-text': '#abb2bf',
      'syn-keyword-weight': 'normal', 'syn-fn-weight': 'normal', 'syn-type-weight': 'normal',
      'syn-variable-weight': 'normal', 'syn-property-weight': 'normal', 'syn-comment-style': 'italic',
      'ed-bg': '#282c34', 'ed-cursor': '#528bff', 'ed-gutter': '#4b5263', 'ed-gutter-border': '#3e4451',
      'ed-tooltip-bg': '#282c34', 'ed-selection': '#61afef', 'ed-line-highlight': '#ffffff',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    colors: {
      '--accent': '#cba6f7', '--base': '#1e1e2e', '--mantle': '#181825',
      '--surface-0': '#13131d', '--surface-1': '#1e1e2e',
      '--divider': '#313244', '--overlay-0': '#313244', '--overlay-1': '#45475a', '--input-border': '#313244',
      '--text': '#cdd6f4', '--subtext-1': '#bac2de', '--subtext-0': '#a6adc8',
      '--muted': '#6c7086', '--ok': '#a6e3a1', '--error': '#f38ba8', '--warning': '#fab387',
      '--tab-bar-bg': '#181825', '--tab-active-bg': '#313244', '--tab-active-text': '#cdd6f4',
      '--tab-text': '#6c7086', '--tab-border': '#11111b',
      '--btn-run': '#cba6f7', '--btn-primary': '#cba6f7',
      '--btn-ghost-text': '#a6adc8', '--btn-ghost-border': '#313244',
      '--settings-bg': '#1e1e2e', '--settings-border': '#313244', '--settings-label': '#6c7086', '--settings-row-hover': '#313244',
      '--out-value-border': '#cba6f7', '--out-echo-border': '#6c7086', '--out-block-bg': '#13131d',
      '--out-btn-bg': '#181825', '--out-btn-text': '#a6adc8', '--out-btn-border': '#45475a',
      'syn-keyword': '#cba6f7', 'syn-string': '#a6e3a1', 'syn-number': '#fab387',
      'syn-fn': '#89b4fa', 'syn-type': '#f9e2af', 'syn-variable': '#cdd6f4',
      'syn-property': '#cdd6f4', 'syn-operator': '#89dceb', 'syn-punctuation': '#a6adc8',
      'syn-comment': '#6c7086', 'syn-text': '#cdd6f4',
      'syn-keyword-weight': 'normal', 'syn-fn-weight': 'normal', 'syn-type-weight': 'normal',
      'syn-variable-weight': 'normal', 'syn-property-weight': 'normal', 'syn-comment-style': 'italic',
      'ed-bg': '#1e1e2e', 'ed-cursor': '#f5c2e7', 'ed-gutter': '#585b70', 'ed-gutter-border': '#313244',
      'ed-tooltip-bg': '#1e1e2e', 'ed-selection': '#cba6f7', 'ed-line-highlight': '#ffffff',
    },
  },
]

// ── Storage ───────────────────────────────────────────────────────────────────

const STORE_KEY  = 'tinkerlite.themes'
const LEGACY_KEY = 'tinkerlite.theme'

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw)
    // Migrate from the old single-theme storage key
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const store = { activeId: 'tinkerlite', overrides: { tinkerlite: JSON.parse(legacy) }, userThemes: [] }
      saveStore(store)
      localStorage.removeItem(LEGACY_KEY)
      return store
    }
  } catch { /* ignore */ }
  return { activeId: 'tinkerlite', overrides: {}, userThemes: [] }
}

function saveStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllThemes() {
  const { userThemes } = loadStore()
  return [
    ...PRESETS.map(p => ({ id: p.id, name: p.name, builtIn: true })),
    ...(userThemes || []).map(u => ({ id: u.id, name: u.name, builtIn: false })),
  ]
}

export function getActiveThemeId() {
  return loadStore().activeId
}

export function getActiveColors() {
  const store = loadStore()
  const id = store.activeId

  const preset = PRESETS.find(p => p.id === id)
  if (preset) {
    return { ...preset.colors, ...(store.overrides?.[id] || {}) }
  }

  const userTheme = (store.userThemes || []).find(u => u.id === id)
  if (userTheme) {
    const base = PRESETS.find(p => p.id === userTheme.baseId) || PRESETS[0]
    return { ...base.colors, ...(userTheme.overrides || {}) }
  }

  return { ...PRESETS[0].colors }
}

export function setActiveThemeId(id) {
  const store = loadStore()
  store.activeId = id
  saveStore(store)
}

export function saveActiveColor(key, value) {
  const store = loadStore()
  const id = store.activeId
  if (PRESETS.some(p => p.id === id)) {
    store.overrides = store.overrides || {}
    store.overrides[id] = store.overrides[id] || {}
    store.overrides[id][key] = value
  } else {
    const theme = (store.userThemes || []).find(u => u.id === id)
    if (theme) {
      theme.overrides = theme.overrides || {}
      theme.overrides[key] = value
    }
  }
  saveStore(store)
}

export function resetActiveTheme() {
  const store = loadStore()
  const id = store.activeId
  if (PRESETS.some(p => p.id === id)) {
    if (store.overrides) store.overrides[id] = {}
  } else {
    const theme = (store.userThemes || []).find(u => u.id === id)
    if (theme) theme.overrides = {}
  }
  saveStore(store)
}

export function createUserThemeFromBase(name, baseId) {
  const store = loadStore()
  const id = `user-${Date.now()}`
  store.userThemes = store.userThemes || []
  store.userThemes.push({ id, name, baseId, overrides: {} })
  store.activeId = id
  saveStore(store)
  return id
}

export function createUserTheme(name) {
  const store = loadStore()
  const id = `user-${Date.now()}`
  const activeId = store.activeId
  const isBuiltIn = PRESETS.some(p => p.id === activeId)
  const baseId = isBuiltIn
    ? activeId
    : ((store.userThemes || []).find(u => u.id === activeId)?.baseId ?? 'tinkerlite')
  const currentOverrides = isBuiltIn
    ? { ...(store.overrides?.[activeId] || {}) }
    : { ...((store.userThemes || []).find(u => u.id === activeId)?.overrides || {}) }
  store.userThemes = store.userThemes || []
  store.userThemes.push({ id, name, baseId, overrides: currentOverrides })
  store.activeId = id
  saveStore(store)
  return id
}

export function deleteUserTheme(id) {
  const store = loadStore()
  store.userThemes = (store.userThemes || []).filter(u => u.id !== id)
  if (store.activeId === id) store.activeId = 'tinkerlite'
  saveStore(store)
}

export function renameUserTheme(id, name) {
  const store = loadStore()
  const theme = (store.userThemes || []).find(u => u.id === id)
  if (theme) theme.name = name
  saveStore(store)
}

// ── Kept for backward compatibility (main.js uses loadStoredColors) ───────────

export function loadStoredColors() {
  return getActiveColors()
}

export function saveStoredColors() { /* no-op — use saveActiveColor() */ }

export function resetColors() {
  resetActiveTheme()
}

export function getColor(key, stored) {
  return stored[key] ?? COLOR_DEFS.find(d => d.key === key)?.default ?? '#000000'
}

// ── CSS application ───────────────────────────────────────────────────────────

export function applyInterfaceColors(stored) {
  const root = document.documentElement
  for (const def of COLOR_DEFS.filter(d => d.key.startsWith('--'))) {
    root.style.setProperty(def.key, getColor(def.key, stored))
  }
  const accent = getColor('--accent', stored)
  root.style.setProperty('--accent-hover',  lighten(accent, 18))
  root.style.setProperty('--accent-dim',    hexToRgba(accent, 0.14))
  root.style.setProperty('--accent-glow',   hexToRgba(accent, 0.08))
  root.style.setProperty('--accent-bg',     hexToRgba(accent, 0.12))
  root.style.setProperty('--accent-shadow', hexToRgba(accent, 0.38))
  const btnRun = getColor('--btn-run', stored)
  root.style.setProperty('--btn-run-hover',  lighten(btnRun, 18))
  root.style.setProperty('--btn-run-shadow', hexToRgba(btnRun, 0.38))
  const btnPrimary = getColor('--btn-primary', stored)
  root.style.setProperty('--btn-primary-shadow', hexToRgba(btnPrimary, 0.38))
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function lighten(hex, amt) {
  const clamp = v => Math.min(255, Math.max(0, v))
  const r = clamp(parseInt(hex.slice(1,3), 16) + amt)
  const g = clamp(parseInt(hex.slice(3,5), 16) + amt)
  const b = clamp(parseInt(hex.slice(5,7), 16) + amt)
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')
}
