// Sidebar rendering and CRUD for projects, connections, snippets.
// Calls back into main.js via events or the provided hooks.

let projects = []
let activeConnectionId = null

const projectList = document.getElementById('project-list')
const connectionSelect = document.getElementById('connection-select')

export function setProjects(data) {
  projects = data
  render()
  syncConnectionSelect()
}

export function getProjects() { return projects }

export function setActiveConnection(id) {
  activeConnectionId = id
  syncConnectionSelect()
  render()
}

export function getActiveConnection() {
  for (const p of projects) {
    const conn = p.connections.find(c => c.id === activeConnectionId)
    if (conn) return conn
  }
  return null
}

// ── Render ─────────────────────────────────────────────────────────────────

function render() {
  projectList.innerHTML = ''
  for (const project of projects) {
    projectList.appendChild(buildProjectNode(project))
  }
}

function buildProjectNode(project) {
  const wrapper = document.createElement('div')
  wrapper.dataset.projectId = project.id

  // Header row
  const header = document.createElement('div')
  header.className = 'project-header'

  const arrow = document.createElement('span')
  arrow.className = 'project-arrow'
  arrow.textContent = '▶'

  const name = document.createElement('span')
  name.className = 'project-name'
  name.textContent = project.name

  const actions = document.createElement('div')
  actions.className = 'project-actions'
  actions.innerHTML = `
    <button class="icon-btn" title="Edit project" data-action="edit-project">✎</button>
    <button class="icon-btn" title="New connection" data-action="new-connection">⊕</button>
    <button class="icon-btn danger" title="Delete project" data-action="delete-project">✕</button>
  `

  header.appendChild(arrow)
  header.appendChild(name)
  header.appendChild(actions)
  wrapper.appendChild(header)

  // Children
  const children = document.createElement('div')
  children.className = 'project-children'

  // Connections section
  if (project.connections.length > 0) {
    const label = document.createElement('div')
    label.className = 'section-label'
    label.textContent = 'Connections'
    children.appendChild(label)

    for (const conn of project.connections) {
      children.appendChild(buildConnectionRow(project, conn))
    }
  }

  // Snippets section
  const snippetLabel = document.createElement('div')
  snippetLabel.className = 'section-label'
  snippetLabel.innerHTML = `Snippets <button class="icon-btn" style="font-size:10px" data-action="new-snippet" data-project="${project.id}" title="New snippet">+</button>`
  children.appendChild(snippetLabel)

  // Snippet search (only shown when there are enough snippets to filter)
  const snippetSearch = document.createElement('input')
  snippetSearch.type = 'text'
  snippetSearch.placeholder = 'Filter snippets…'
  snippetSearch.className = 'snippet-search'
  snippetSearch.classList.toggle('hidden', project.snippets.length < 5)
  children.appendChild(snippetSearch)

  const snippetRows = []
  for (const snip of project.snippets) {
    const row = buildSnippetRow(project, snip)
    snippetRows.push({ row, name: snip.name.toLowerCase() })
    children.appendChild(row)
  }

  snippetSearch.addEventListener('input', () => {
    const q = snippetSearch.value.toLowerCase()
    snippetRows.forEach(({ row, name }) => {
      row.classList.toggle('hidden', !!q && !name.includes(q))
    })
  })

  wrapper.appendChild(children)

  // Toggle collapse
  let open = project.connections.some(c => c.id === activeConnectionId)
  if (open) {
    arrow.classList.add('open')
    children.classList.add('open')
  }

  header.addEventListener('click', (e) => {
    if (e.target.closest('[data-action]')) return
    open = !open
    arrow.classList.toggle('open', open)
    children.classList.toggle('open', open)
  })

  // Action buttons
  actions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    e.stopPropagation()
    const action = btn.dataset.action
    if (action === 'edit-project') dispatch('edit-project', { project })
    if (action === 'new-connection') dispatch('new-connection', { project })
    if (action === 'delete-project') dispatch('delete-project', { project })
  })

  // Snippet new button (inside section label)
  const snippetNewBtn = snippetLabel.querySelector('[data-action="new-snippet"]')
  if (snippetNewBtn) {
    snippetNewBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      dispatch('new-snippet', { project })
    })
  }

  return wrapper
}

function buildConnectionRow(project, conn) {
  const row = document.createElement('div')
  row.className = 'tree-row' + (conn.id === activeConnectionId ? ' active' : '')
  row.dataset.connId = conn.id

  const icon = document.createElement('span')
  icon.className = 'tree-icon'
  icon.textContent = conn.type === 'ssh' ? '⇄' : '◉'

  const label = document.createElement('span')
  label.className = 'tree-label'
  label.textContent = conn.name

  const badge = document.createElement('span')
  badge.className = 'tree-type-badge' + (conn.type === 'ssh' ? ' ssh' : '')
  badge.textContent = conn.type

  const rowActions = document.createElement('div')
  rowActions.className = 'tree-actions'
  rowActions.innerHTML = `
    <button class="icon-btn" title="Edit" data-action="edit-connection">✎</button>
    <button class="icon-btn danger" title="Delete" data-action="delete-connection">✕</button>
  `

  row.appendChild(icon)
  row.appendChild(label)
  row.appendChild(badge)
  row.appendChild(rowActions)

  row.addEventListener('click', (e) => {
    if (e.target.closest('[data-action]')) return
    dispatch('select-connection', { connection: conn })
  })

  rowActions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    e.stopPropagation()
    if (btn.dataset.action === 'edit-connection') dispatch('edit-connection', { project, connection: conn })
    if (btn.dataset.action === 'delete-connection') dispatch('delete-connection', { project, connection: conn })
  })

  return row
}

function buildSnippetRow(project, snip) {
  const row = document.createElement('div')
  row.className = 'tree-row'
  row.dataset.snippetId = snip.id

  const icon = document.createElement('span')
  icon.className = 'tree-icon'
  icon.textContent = '≡'

  const label = document.createElement('span')
  label.className = 'tree-label'
  label.textContent = snip.name

  const rowActions = document.createElement('div')
  rowActions.className = 'tree-actions'
  rowActions.innerHTML = `
    <button class="icon-btn" title="Edit snippet" data-action="edit-snippet">✎</button>
    <button class="icon-btn danger" title="Delete snippet" data-action="delete-snippet">✕</button>
  `

  row.appendChild(icon)
  row.appendChild(label)
  row.appendChild(rowActions)

  row.addEventListener('click', (e) => {
    if (e.target.closest('[data-action]')) return
    dispatch('load-snippet', { project, snippet: snip })
  })

  rowActions.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    e.stopPropagation()
    if (btn.dataset.action === 'edit-snippet') dispatch('edit-snippet', { project, snippet: snip })
    if (btn.dataset.action === 'delete-snippet') dispatch('delete-snippet', { project, snippet: snip })
  })

  return row
}

function syncConnectionSelect() {
  connectionSelect.innerHTML = '<option value="">— no connection —</option>'
  for (const p of projects) {
    if (!p.connections.length) continue
    const group = document.createElement('optgroup')
    group.label = p.name
    for (const conn of p.connections) {
      const opt = document.createElement('option')
      opt.value = conn.id
      opt.textContent = conn.name + (conn.type === 'ssh' ? ' (ssh)' : '')
      opt.selected = conn.id === activeConnectionId
      group.appendChild(opt)
    }
    connectionSelect.appendChild(group)
  }

  // Update visible toolbar indicator
  const nameEl    = document.getElementById('conn-indicator-name')
  const projectEl = document.getElementById('conn-indicator-project')
  const sepEl     = document.getElementById('conn-indicator-sep')
  const iconEl    = document.getElementById('conn-indicator-icon')

  let activeProject = null
  let active = null
  for (const p of projects) {
    const c = p.connections.find(c => c.id === activeConnectionId)
    if (c) { activeProject = p; active = c; break }
  }

  if (nameEl) {
    nameEl.textContent = active ? active.name : 'No connection'
    nameEl.classList.toggle('empty', !active)
  }
  if (projectEl) projectEl.textContent = activeProject ? activeProject.name : ''
  if (sepEl) sepEl.classList.toggle('hidden', !active)
  if (iconEl) {
    iconEl.textContent = active?.type === 'ssh' ? '⇄' : '◉'
    iconEl.classList.toggle('ssh', active?.type === 'ssh')
  }
}

connectionSelect.addEventListener('change', () => {
  const id = connectionSelect.value
  if (id) dispatch('select-connection-by-id', { id })
})

// ── Simple event bus ────────────────────────────────────────────────────────

const listeners = {}

export function on(event, fn) {
  if (!listeners[event]) listeners[event] = []
  listeners[event].push(fn)
}

function dispatch(event, detail) {
  ;(listeners[event] || []).forEach(fn => fn(detail))
}
