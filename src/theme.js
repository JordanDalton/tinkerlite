// Central color definitions. Each entry is one row in the theme editor.
export const COLOR_DEFS = [
  // Interface
  { key: '--accent',    label: 'Accent',            group: 'Interface', default: '#414c6b' },
  { key: '--base',      label: 'App background',    group: 'Interface', default: '#29293d' },
  { key: '--mantle',    label: 'Sidebar / toolbar', group: 'Interface', default: '#1e1e36' },
  { key: '--surface-0', label: 'Cards / inputs',    group: 'Interface', default: '#14141e' },
  { key: '--surface-1', label: 'Modals',            group: 'Interface', default: '#191926' },
  { key: '--overlay-0', label: 'Borders',           group: 'Interface', default: '#252538' },
  { key: '--text',      label: 'Primary text',      group: 'Interface', default: '#e2e2f0' },
  { key: '--subtext-1', label: 'Secondary text',    group: 'Interface', default: '#b4b4cc' },
  { key: '--subtext-0', label: 'Muted text',        group: 'Interface', default: '#9a9ab8' },
  { key: '--muted',     label: 'Very muted',        group: 'Interface', default: '#64647d' },
  { key: '--ok',        label: 'Success',           group: 'Interface', default: '#3dd68c' },
  { key: '--error',     label: 'Error',             group: 'Interface', default: '#f87171' },
  { key: '--warning',   label: 'Warning',           group: 'Interface', default: '#bf9c43' },

  // Tabs
  { key: '--tab-bar-bg',      label: 'Tab bar background', group: 'Tabs', default: '#29294a' },
  { key: '--tab-active-bg',   label: 'Active tab',         group: 'Tabs', default: '#464673' },
  { key: '--tab-active-text', label: 'Active tab text',    group: 'Tabs', default: '#e2e2f0' },
  { key: '--tab-text',        label: 'Inactive tab text',  group: 'Tabs', default: '#9a9ab8' },
  { key: '--tab-border',      label: 'Tab bar border',     group: 'Tabs', default: '#252538' },

  // Syntax
  { key: 'syn-keyword',  label: 'Keywords',           group: 'Syntax', default: '#c678dd' },
  { key: 'syn-string',   label: 'Strings',            group: 'Syntax', default: '#98c379' },
  { key: 'syn-number',   label: 'Numbers / booleans', group: 'Syntax', default: '#d19a66' },
  { key: 'syn-fn',       label: 'Functions',          group: 'Syntax', default: '#61afef' },
  { key: 'syn-type',     label: 'Classes / types',    group: 'Syntax', default: '#d9c9ab' },
  { key: 'syn-property', label: 'Properties / vars',  group: 'Syntax', default: '#dbdada' },
  { key: 'syn-operator', label: 'Operators',          group: 'Syntax', default: '#56b6c2' },
  { key: 'syn-comment',  label: 'Comments',           group: 'Syntax', default: '#7d8799' },
  { key: 'syn-text',     label: 'Default text',       group: 'Syntax', default: '#abb2bf' },

  // Editor chrome
  { key: 'ed-bg',     label: 'Background',  group: 'Editor', default: '#2e2e45' },
  { key: 'ed-cursor', label: 'Cursor',      group: 'Editor', default: '#414c6b' },
  { key: 'ed-gutter', label: 'Gutter text', group: 'Editor', default: '#6d6d73' },
]

const STORAGE_KEY = 'tinkerlite.theme'

export function loadStoredColors() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }
  catch { return {} }
}

export function saveStoredColors(colors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
}

export function getColor(key, stored) {
  return stored[key] ?? COLOR_DEFS.find(d => d.key === key)?.default ?? '#000000'
}

export function resetColors() {
  localStorage.removeItem(STORAGE_KEY)
}

export function applyInterfaceColors(stored) {
  const root = document.documentElement
  for (const def of COLOR_DEFS.filter(d => d.group === 'Interface' || d.group === 'Tabs')) {
    root.style.setProperty(def.key, getColor(def.key, stored))
  }
  // Derive accent variants from --accent
  const accent = getColor('--accent', stored)
  root.style.setProperty('--accent-hover',  lighten(accent, 18))
  root.style.setProperty('--accent-dim',    hexToRgba(accent, 0.14))
  root.style.setProperty('--accent-glow',   hexToRgba(accent, 0.08))
  root.style.setProperty('--accent-bg',     hexToRgba(accent, 0.12))
  root.style.setProperty('--accent-shadow', hexToRgba(accent, 0.38))
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
