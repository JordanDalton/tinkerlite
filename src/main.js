import { invoke } from '@tauri-apps/api/core'
import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { initEditor, getCode, setCode, setCompletions, onEditorUpdate, appendCode, getSelection } from './editor.js'
import { initTabs, addTab, closeTab, saveActiveOutput, saveActiveCode, setTabSnippet, updateDirtyIndicator, getActiveTab, clearSnippetOrigins, saveTabsForConnection, restoreTabsForConnection } from './tabs.js'
import { setProjects, getProjects, setActiveConnection, getActiveConnection, on as onSidebar } from './sidebar.js'
import { showEmpty, showResult } from './output.js'
import { loadStoredColors, applyInterfaceColors } from './theme.js'
import { initSettings } from './settings.js'
import { initPathAutocomplete } from './path-autocomplete.js'

// ── Bootstrap ──────────────────────────────────────────────────────────────

const dot = document.getElementById('status-dot')
const statusLabel = document.getElementById('status-label')
const btnRun = document.getElementById('btn-run')

// Apply saved theme before anything renders
const storedColors = loadStoredColors()
applyInterfaceColors(storedColors)
initEditor(document.getElementById('editor-container'), runCode, storedColors)
initSettings()
initPathAutocomplete(document.getElementById('conn-project-path'))
initPathAutocomplete(document.getElementById('proj-project-path'))
initTabs(document.getElementById('tab-bar'))
onEditorUpdate(updateDirtyIndicator)

const STORAGE_CONN_KEY = 'tinkerlite.activeConnectionId'
const STORAGE_CODE_KEY = 'tinkerlite.editorCode'

const modalWelcome = document.getElementById('modal-welcome')
const workspaceEl  = document.getElementById('workspace')
const workspaceZero = document.getElementById('workspace-zero')
const tabBarEl     = document.getElementById('tab-bar')

function updateWorkspaceState() {
  const hasConn = !!getActiveConnection()
  const hasProjects = getProjects().length > 0
  workspaceEl.classList.toggle('hidden', !hasConn)
  workspaceZero.classList.toggle('hidden', hasConn || !hasProjects)
  tabBarEl.classList.toggle('hidden', !hasConn)
  btnRun.classList.toggle('hidden', !hasConn)
  document.getElementById('toolbar').classList.toggle('hidden', !hasConn)
}

document.getElementById('btn-zero-add-conn').addEventListener('click', () => {
  const projects = getProjects()
  if (projects.length === 1) {
    openConnectionModal(projects[0], null)
  } else if (projects.length > 1) {
    // Expand first project in sidebar — just open modal for first project
    openConnectionModal(projects[0], null)
  }
})

document.getElementById('btn-welcome-start').addEventListener('click', () => {
  hide(modalWelcome)
  openProjectModal(null)
})

// Load projects from Rust store, then restore last active connection
async function loadProjects() {
  const projects = await invoke('list_projects')
  setProjects(projects)

  if (projects.length === 0) {
    show(modalWelcome)
    updateWorkspaceState()
    return
  }

  hide(modalWelcome)

  const savedId = localStorage.getItem(STORAGE_CONN_KEY)
  const allConns = projects.flatMap(p => p.connections)

  if (savedId && allConns.some(c => c.id === savedId)) {
    setActiveConnection(savedId)
    const conn = allConns.find(c => c.id === savedId)
    if (conn) scanAndApplyCompletions(conn)
  } else if (allConns.length === 1) {
    setActiveConnection(allConns[0].id)
    localStorage.setItem(STORAGE_CONN_KEY, allConns[0].id)
    scanAndApplyCompletions(allConns[0])
  }

  updateWorkspaceState()
}

loadProjects()
showEmpty()

// ── Run ────────────────────────────────────────────────────────────────────

function friendlyRunError(msg, conn) {
  const s = msg.toLowerCase()
  if (s.includes('failed to run php') && (s.includes('no such file') || s.includes('os error 2') || s.includes('not found'))) {
    const binary = conn?.phpBinary || 'php'
    return `PHP binary not found: "${binary}"\n\nEdit the connection and choose a valid PHP binary, or ensure PHP is installed and on your PATH.`
  }
  return msg
}

async function runCode() {
  const conn = getActiveConnection()
  if (!conn) {
    alert('Select a connection first.')
    return
  }

  const code = getCode()
  setRunning(true)

  try {
    const result = await invoke('run_code', { conn, code })
    showResult(result)
    saveActiveOutput(result)
    setStatus(result.ok ? 'ok' : 'error', result.ok ? `${result.durationMs}ms` : 'error')
  } catch (err) {
    const msg = String(err)
    if (msg.startsWith('UNKNOWN_HOST:')) {
      await handleUnknownHost(conn, code, msg.slice('UNKNOWN_HOST:'.length))
    } else {
      showResult({ ok: false, stdout: '', stderr: friendlyRunError(msg, conn), durationMs: 0 })
      setStatus('error', 'error')
    }
  } finally {
    setRunning(false)
  }
}

async function handleUnknownHost(conn, code, fingerprint) {
  const trusted = confirm(
    `Unknown host: ${conn.ssh?.host}\n\nFingerprint: ${fingerprint}\n\nTrust this host and continue?`
  )
  if (!trusted) {
    showResult({ ok: false, stdout: '', stderr: 'Connection cancelled — host not trusted.', durationMs: 0 })
    setStatus('error', 'error')
    return
  }

  try {
    await invoke('trust_host', { host: conn.ssh.host, port: conn.ssh.port })
    const result = await invoke('run_code', { conn, code })
    showResult(result)
    setStatus(result.ok ? 'ok' : 'error', result.ok ? `${result.durationMs}ms` : 'error')
  } catch (err) {
    showResult({ ok: false, stdout: '', stderr: String(err), durationMs: 0 })
    setStatus('error', 'error')
  }
}

function setRunning(isRunning) {
  btnRun.disabled = isRunning
  if (isRunning) {
    dot.className = 'dot-running'
    statusLabel.textContent = 'running…'
  }
}

function setStatus(state, label) {
  dot.className = `dot-${state}`
  statusLabel.textContent = label
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    openSaveSnippetModal()
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault()
    openProjectModal(null)
  }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    const projects = getProjects()
    if (!projects.length) { openProjectModal(null); return }
    const activeConn = getActiveConnection()
    const target = projects.find(p => p.connections.some(c => c.id === activeConn?.id)) ?? projects[0]
    openConnectionModal(target, null)
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 't') {
    e.preventDefault()
    saveActiveCode()
    addTab()
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
    e.preventDefault()
    const active = document.querySelector('.tab--active')
    if (active) closeTab(active.dataset.id)
  }
  if (e.key === 'Escape') closeAllModals()
})

// ── Sidebar events ─────────────────────────────────────────────────────────

async function scanAndApplyCompletions(conn) {
  try {
    const json = await invoke('scan_completions', { conn })
    const data = JSON.parse(json)
    setCompletions(data.classes ?? [], data.functions ?? [])
  } catch (e) {
    console.warn('Completion scan failed:', e)
  }
}

onSidebar('select-connection', ({ connection }) => {
  saveTabsForConnection(getActiveConnection()?.id)
  setActiveConnection(connection.id)
  restoreTabsForConnection(connection.id)
  localStorage.setItem(STORAGE_CONN_KEY, connection.id)
  setStatus('idle', '')
  dot.className = 'dot-idle'
  scanAndApplyCompletions(connection)
  updateWorkspaceState()
})

onSidebar('select-connection-by-id', ({ id }) => {
  saveTabsForConnection(getActiveConnection()?.id)
  setActiveConnection(id)
  restoreTabsForConnection(id)
  localStorage.setItem(STORAGE_CONN_KEY, id)
  setStatus('idle', '')
  dot.className = 'dot-idle'
  const conn = getProjects().flatMap(p => p.connections).find(c => c.id === id)
  if (conn) scanAndApplyCompletions(conn)
  updateWorkspaceState()
})

onSidebar('new-project', () => openProjectModal(null))
onSidebar('edit-project', ({ project }) => openProjectModal(project))
onSidebar('new-connection', ({ project }) => openConnectionModal(project, null))
onSidebar('edit-connection', ({ project, connection }) => openConnectionModal(project, connection))
onSidebar('new-snippet', ({ project }) => openSnippetModal(project, null))

onSidebar('delete-project', async ({ project }) => {
  if (!confirm(`Delete project "${project.name}" and all its connections/snippets?`)) return
  clearSnippetOrigins((project.snippets ?? []).map(s => s.id))
  await invoke('delete_project', { id: project.id })
  await loadProjects()
})

onSidebar('delete-connection', async ({ project, connection }) => {
  if (!confirm(`Delete connection "${connection.name}"?`)) return
  project.connections = project.connections.filter(c => c.id !== connection.id)
  await invoke('save_project', { project })
  await loadProjects()
})

onSidebar('delete-snippet', async ({ project, snippet }) => {
  clearSnippetOrigins([snippet.id])
  project.snippets = project.snippets.filter(s => s.id !== snippet.id)
  await invoke('save_project', { project })
  await loadProjects()
})

onSidebar('edit-snippet', ({ project, snippet }) => {
  openSnippetModal(project, snippet)
})

onSidebar('load-snippet', ({ snippet }) => {
  const active = getActiveTab()
  const isEmpty = !active || active.code.trim() === ''
  if (isEmpty) {
    setTabSnippet(snippet.id, snippet.name, snippet.code + '\n\n')
  } else {
    appendCode('\n' + snippet.code + '\n\n')
  }
  focusEditor()
})

// ── New project button ─────────────────────────────────────────────────────

document.getElementById('btn-new-project').addEventListener('click', () => {
  openProjectModal(null)
})

document.getElementById('btn-run').addEventListener('click', runCode)

// ── Copy buttons ───────────────────────────────────────────────────────────

function flashCopyBtn(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML
    btn.textContent = 'Copied!'
    setTimeout(() => { btn.innerHTML = orig }, 1400)
  })
}

document.getElementById('btn-copy-editor').addEventListener('click', () => {
  const text = getSelection() || getCode()
  flashCopyBtn(document.getElementById('btn-copy-editor'), text)
})

document.getElementById('btn-clear-output').addEventListener('click', () => {
  showEmpty()
  saveActiveOutput(null)
})

document.getElementById('btn-copy-output-all').addEventListener('click', () => {
  const blocks = document.querySelectorAll('#output-content .output-block')
  const text = Array.from(blocks).map(b => b.dataset.outputText || '').filter(Boolean).join('\n\n')
  flashCopyBtn(document.getElementById('btn-copy-output-all'), text)
})

// ── Modal: Project ─────────────────────────────────────────────────────────

const modalProject = document.getElementById('modal-project')
const projName = document.getElementById('proj-name')
let editingProject = null

projName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-proj-save').click()
})

document.getElementById('btn-proj-choose-path').addEventListener('click', async () => {
  const dir = await openDialog({ directory: true, multiple: false })
  if (dir) document.getElementById('proj-project-path').value = dir
})

const PROJECT_COLORS = ['#ff4d3d','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16']
function autoColor() {
  return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]
}

function openProjectModal(project) {
  editingProject = project
  const isNew = !project
  document.getElementById('modal-project-title').textContent = isNew ? 'New Project' : 'Edit Project'
  projName.value = project?.name ?? ''
  document.getElementById('proj-project-path').value = ''
  document.getElementById('proj-path-section').classList.toggle('hidden', !isNew)
  show(modalProject)
  setTimeout(() => projName.focus(), 50)
}

document.getElementById('btn-proj-cancel').addEventListener('click', () => hide(modalProject))

document.getElementById('btn-proj-save').addEventListener('click', async () => {
  const name = projName.value.trim()
  if (!name) return
  const isNew = !editingProject

  const project = isNew
    ? { id: crypto.randomUUID(), name, color: autoColor(), connections: [], snippets: [] }
    : { ...editingProject, name }

  if (isNew) {
    const path = document.getElementById('proj-project-path').value.trim()
    if (path) {
      const php = await invoke('detect_php')
      const conn = { id: crypto.randomUUID(), name: 'Local', type: 'local', projectPath: path, phpBinary: php, ssh: null }
      project.connections = [conn]
    }
  }

  await invoke('save_project', { project })
  hide(modalProject)
  await loadProjects()

  if (isNew && project.connections.length > 0) {
    setActiveConnection(project.connections[0].id)
    restoreTabsForConnection(project.connections[0].id)
    localStorage.setItem(STORAGE_CONN_KEY, project.connections[0].id)
    updateWorkspaceState()
    focusEditor()
    scanAndApplyCompletions(project.connections[0])
  }
})

// ── Modal: Connection ──────────────────────────────────────────────────────

const modalConn = document.getElementById('modal-connection')
let editingConnection = null
let editingConnProject = null
let connType = 'local'
let authMethod = 'password'
let connTempId = null       // temp id used during SSH two-step flow
let selectedPhpBinary = 'php'

document.getElementById('conn-type-local').addEventListener('click', () => setConnType('local'))
document.getElementById('conn-type-ssh').addEventListener('click', () => setConnType('ssh'))
document.getElementById('conn-auth-password').addEventListener('click', () => setAuthMethod('password'))
document.getElementById('conn-auth-key').addEventListener('click', () => setAuthMethod('key'))

function setConnType(type) {
  connType = type
  document.getElementById('conn-type-local').classList.toggle('active', type === 'local')
  document.getElementById('conn-type-ssh').classList.toggle('active', type === 'ssh')
  document.getElementById('conn-local-fields').classList.toggle('hidden', type !== 'local')
  document.getElementById('ssh-fields').classList.toggle('hidden', type !== 'ssh')
  // For local: show Save directly. For SSH new: show Continue. For SSH edit: show Save.
  const isNewSsh = type === 'ssh' && !editingConnection
  document.getElementById('btn-conn-step1-save').classList.toggle('hidden', isNewSsh)
  document.getElementById('btn-conn-continue').classList.toggle('hidden', !isNewSsh)
}

function setAuthMethod(method) {
  authMethod = method
  document.getElementById('conn-auth-password').classList.toggle('active', method === 'password')
  document.getElementById('conn-auth-key').classList.toggle('active', method === 'key')
  document.getElementById('ssh-password-fields').classList.toggle('hidden', method !== 'password')
  document.getElementById('ssh-key-fields').classList.toggle('hidden', method !== 'key')
}

document.getElementById('btn-choose-path').addEventListener('click', async () => {
  const dir = await openDialog({ directory: true, multiple: false })
  if (dir) document.getElementById('conn-project-path').value = dir
})

async function openConnectionModal(project, connection) {
  editingConnProject = project
  editingConnection = connection

  // Project picker — show when creating a new connection and there are multiple projects
  const projects = getProjects()
  const projectRow = document.getElementById('conn-project-row')
  const projectSelect = document.getElementById('conn-project-select')
  const showPicker = !connection && projects.length > 1
  projectRow.classList.toggle('hidden', !showPicker)
  if (showPicker) {
    projectSelect.innerHTML = projects.map(p =>
      `<option value="${p.id}"${p.id === project?.id ? ' selected' : ''}>${p.name}</option>`
    ).join('')
  }
  connTempId = null
  selectedPhpBinary = connection?.phpBinary ?? 'php'
  document.getElementById('conn-project-path-ssh')._autocompleteInit = false

  document.getElementById('modal-conn-title').textContent = connection ? 'Edit Connection' : 'New Connection'
  document.getElementById('conn-name').value = connection?.name ?? ''
  document.getElementById('conn-project-path').value = connection?.projectPath ?? ''

  // Always start on step 1
  document.getElementById('conn-step-1').classList.remove('hidden')
  document.getElementById('conn-step-2').classList.add('hidden')
  document.getElementById('conn-test-result').className = 'hidden'
  document.getElementById('conn-test-result').textContent = ''

  const type = connection?.type ?? 'local'
  // Set editing connection before setConnType so it can read it
  setConnType(type)

  // For edits: show Save button regardless of type
  if (connection) {
    document.getElementById('btn-conn-step1-save').classList.remove('hidden')
    document.getElementById('btn-conn-continue').classList.add('hidden')
  }

  if (connection?.ssh) {
    document.getElementById('conn-ssh-host').value = connection.ssh.host ?? ''
    document.getElementById('conn-ssh-port').value = connection.ssh.port ?? 22
    document.getElementById('conn-ssh-user').value = connection.ssh.username ?? ''
    setAuthMethod(connection.ssh.auth.method ?? 'password')
    document.getElementById('conn-ssh-key-path').value = connection.ssh.auth.privateKeyPath ?? ''
  } else {
    document.getElementById('conn-ssh-host').value = ''
    document.getElementById('conn-ssh-port').value = 22
    document.getElementById('conn-ssh-user').value = ''
    setAuthMethod('password')
    document.getElementById('conn-ssh-key-path').value = ''
  }

  if (connection) {
    const hasPw = await invoke('has_secret', { connectionId: connection.id })
    document.getElementById('conn-secret-stored').classList.toggle('hidden', !hasPw)
    document.getElementById('conn-passphrase-stored').classList.toggle('hidden', !hasPw)
  } else {
    document.getElementById('conn-secret-stored').classList.add('hidden')
    document.getElementById('conn-passphrase-stored').classList.add('hidden')
  }

  document.getElementById('conn-ssh-password').value = ''
  document.getElementById('conn-ssh-passphrase').value = ''

  show(modalConn)
  setTimeout(() => document.getElementById('conn-name').focus(), 50)
}

function buildConnFromStep1(id) {
  const ssh = connType === 'ssh' ? {
    host: document.getElementById('conn-ssh-host').value.trim(),
    port: parseInt(document.getElementById('conn-ssh-port').value) || 22,
    username: document.getElementById('conn-ssh-user').value.trim(),
    auth: {
      method: authMethod,
      privateKeyPath: authMethod === 'key'
        ? document.getElementById('conn-ssh-key-path').value.trim() || null
        : null,
    },
  } : null

  return {
    id,
    name: document.getElementById('conn-name').value.trim(),
    type: connType,
    projectPath: document.getElementById('conn-project-path').value.trim(),
    phpBinary: selectedPhpBinary,
    ssh,
  }
}

async function saveSecret(connectionId) {
  const pw = document.getElementById('conn-ssh-password').value
  const passphrase = document.getElementById('conn-ssh-passphrase').value
  const secret = authMethod === 'key' ? passphrase : pw
  if (secret) await invoke('set_secret', { connectionId, secret })
}

async function doSaveConnection(conn) {
  const isNew = !editingConnection
  // If the project picker was shown, use the selected project instead of editingConnProject
  const projectRow = document.getElementById('conn-project-row')
  if (isNew && !projectRow.classList.contains('hidden')) {
    const selectedId = document.getElementById('conn-project-select').value
    editingConnProject = getProjects().find(p => p.id === selectedId) ?? editingConnProject
  }
  const project = { ...editingConnProject }
  if (editingConnection) {
    project.connections = project.connections.map(c => c.id === conn.id ? conn : c)
  } else {
    project.connections = [...project.connections, conn]
  }
  await invoke('save_project', { project })
  hide(modalConn)
  await loadProjects()
  if (isNew) {
    saveTabsForConnection(getActiveConnection()?.id)
    setActiveConnection(conn.id)
    localStorage.setItem(STORAGE_CONN_KEY, conn.id)
    restoreTabsForConnection(conn.id)
    updateWorkspaceState()
    scanAndApplyCompletions(conn)
  }
  if (getActiveConnection()) focusEditor()
}

document.getElementById('btn-conn-cancel').addEventListener('click', () => hide(modalConn))

// Local save / SSH edit save (step 1 save button)
document.getElementById('btn-conn-step1-save').addEventListener('click', async () => {
  const name = document.getElementById('conn-name').value.trim()
  if (!name) return
  const id = editingConnection?.id ?? crypto.randomUUID()
  const conn = buildConnFromStep1(id)
  if (connType === 'ssh') await saveSecret(id)
  if (!editingConnection) conn.phpBinary = await invoke('detect_php_remote', { conn })
  await doSaveConnection(conn)
})

// SSH new: "Continue →" — test then advance to step 2
document.getElementById('btn-conn-continue').addEventListener('click', async () => {
  const name = document.getElementById('conn-name').value.trim()
  if (!name) return

  connTempId = connTempId ?? crypto.randomUUID()
  const conn = buildConnFromStep1(connTempId)
  await saveSecret(connTempId)

  const resultEl = document.getElementById('conn-test-result')
  resultEl.className = ''
  resultEl.textContent = 'Connecting…'

  const ok = await testConnWithTrust(conn, resultEl)
  if (!ok) return

  resultEl.className = 'hidden'

  // Advance to step 2
  document.getElementById('conn-step-1').classList.add('hidden')
  document.getElementById('conn-step-2').classList.remove('hidden')
  const sshPathInput = document.getElementById('conn-project-path-ssh')
  sshPathInput.value = ''
  document.getElementById('conn-php-list').innerHTML = '<div class="conn-php-detecting">Detecting PHP…</div>'

  // Init path autocomplete once per modal open (re-create with current conn captured in closure)
  if (!sshPathInput._autocompleteInit) {
    sshPathInput._autocompleteInit = true
    initPathAutocomplete(sshPathInput, (path) => invoke('list_dir_remote', { conn, path }))
    sshPathInput.addEventListener('keydown', (e) => {
      const dropdown = document.querySelector('.path-dropdown:not(.hidden)')
      if (e.key === 'Enter') {
        if (e.defaultPrevented || dropdown) return
        e.preventDefault()
        document.getElementById('btn-conn-save').click()
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (dropdown) return // let autocomplete handle arrows
      e.preventDefault()
      const options = [...document.getElementById('conn-php-list').querySelectorAll('.php-option')]
      if (options.length < 2) return
      const cur = options.findIndex(o => o.classList.contains('php-option--selected'))
      const next = Math.max(0, Math.min(options.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)))
      if (next === cur) return
      options[cur].classList.remove('php-option--selected')
      options[next].classList.add('php-option--selected')
      selectedPhpBinary = options[next].dataset.phpPath
      options[next].scrollIntoView({ block: 'nearest' })
    })
  }

  setTimeout(() => sshPathInput.focus(), 50)

  // Detect PHP versions in background
  invoke('list_php_binaries', { conn }).then(binaries => renderPhpList(binaries))
})

// Step 2 back
document.getElementById('btn-conn-back').addEventListener('click', () => {
  document.getElementById('conn-step-2').classList.add('hidden')
  document.getElementById('conn-step-1').classList.remove('hidden')
})

// Step 2 save
document.getElementById('btn-conn-save').addEventListener('click', async () => {
  const path = document.getElementById('conn-project-path-ssh').value.trim()
  if (!path) { document.getElementById('conn-project-path-ssh').focus(); return }

  const conn = buildConnFromStep1(connTempId)
  conn.projectPath = path
  conn.phpBinary = selectedPhpBinary
  await doSaveConnection(conn)
})

function renderPhpList(binaries) {
  const el = document.getElementById('conn-php-list')
  if (!binaries.length) {
    el.innerHTML = '<div class="conn-php-detecting">No PHP found — will use <code>php</code></div>'
    selectedPhpBinary = 'php'
    return
  }
  selectedPhpBinary = binaries[0].path
  el.innerHTML = ''
  binaries.forEach((b, i) => {
    const row = document.createElement('div')
    row.className = 'php-option' + (i === 0 ? ' php-option--selected' : '')
    row.dataset.phpPath = b.path
    row.innerHTML = `
      <span class="php-option-binary">${b.binary}</span>
      <span class="php-option-version">${b.version}</span>
      <span class="php-option-path">${b.path}</span>
    `
    row.addEventListener('click', () => {
      el.querySelectorAll('.php-option').forEach(r => r.classList.remove('php-option--selected'))
      row.classList.add('php-option--selected')
      selectedPhpBinary = b.path
    })
    el.appendChild(row)
  })
}

// Test button (available in step 1 for both types when editing)
document.getElementById('btn-conn-test').addEventListener('click', async () => {
  const id = editingConnection?.id ?? connTempId ?? 'test-' + crypto.randomUUID()
  const conn = buildConnFromStep1(id)
  if (connType === 'ssh') await saveSecret(id)
  const resultEl = document.getElementById('conn-test-result')
  resultEl.className = ''
  resultEl.textContent = 'Testing…'
  await testConnWithTrust(conn, resultEl)
})

function friendlyConnError(raw) {
  const s = String(raw).toLowerCase()
  if (s.includes('authentication failed') || s.includes('wrong password') || s.includes('publickey'))
    return 'Authentication failed — check username, password or SSH key'
  if (s.includes('connection refused'))
    return 'Connection refused — verify the host and port are correct'
  if (s.includes('no route to host') || s.includes('network unreachable') || s.includes('host unreachable'))
    return 'Host unreachable — check the hostname or your network connection'
  if (s.includes('timed out') || s.includes('timeout'))
    return 'Connection timed out — the host may be offline or behind a firewall'
  if (s.includes('name or service not known') || s.includes('could not resolve'))
    return 'Hostname not found — double-check the hostname'
  if (s.includes('permission denied'))
    return 'Permission denied — wrong credentials or key not authorized'
  if (s.includes('no such file') || s.includes('key file'))
    return 'SSH key file not found — check the key path'
  return String(raw).replace(/^Error: /, '')
}

async function testConnWithTrust(conn, resultEl) {
  try {
    const result = await invoke('test_connection', { conn })
    resultEl.className = result.ok ? 'ok' : 'error'
    resultEl.textContent = result.ok
      ? `✓ Connected`
      : `✗ ${friendlyConnError(result.stderr || 'Run failed')}`
    return result.ok
  } catch (err) {
    const msg = String(err)
    if (msg.startsWith('UNKNOWN_HOST:')) {
      const fingerprint = msg.slice('UNKNOWN_HOST:'.length)
      const trusted = confirm(`Unknown host: ${conn.ssh?.host}\n\nFingerprint: ${fingerprint}\n\nTrust this host?`)
      if (!trusted) {
        resultEl.className = 'error'
        resultEl.textContent = '✗ Host not trusted'
        return false
      }
      try {
        await invoke('trust_host', { host: conn.ssh.host, port: conn.ssh.port })
        const result = await invoke('test_connection', { conn })
        resultEl.className = result.ok ? 'ok' : 'error'
        resultEl.textContent = result.ok ? `✓ Connected` : `✗ ${friendlyConnError(result.stderr || 'Run failed')}`
        return result.ok
      } catch (e2) {
        resultEl.className = 'error'
        resultEl.textContent = `✗ ${friendlyConnError(e2)}`
        return false
      }
    }
    resultEl.className = 'error'
    resultEl.textContent = `✗ ${friendlyConnError(msg)}`
    return false
  }
}

// ── Modal: Snippet ─────────────────────────────────────────────────────────

const modalSnippet = document.getElementById('modal-snippet')
let snippetProject = null
let snippetEditing = null
let snippetCodeToSave = null

function openSnippetModal(project, snippet) {
  snippetProject = project
  snippetEditing = snippet
  snippetCodeToSave = snippet ? snippet.code : (getSelection() || getCode())

  const isEdit = !!snippet
  document.getElementById('modal-snippet-title').textContent = isEdit ? 'Edit Snippet' : 'Save Snippet'
  document.getElementById('snip-name').value = snippet?.name ?? ''

  // Show code editor only when editing an existing snippet
  const codeRow = document.getElementById('snip-code-row')
  const codeArea = document.getElementById('snip-code')
  codeRow.classList.toggle('hidden', !isEdit)
  if (isEdit) codeArea.value = snippet.code

  const replaceRow = document.getElementById('snip-replace-row')
  const replaceSelect = document.getElementById('snip-replace-select')
  const matchNotice = document.getElementById('snip-match-notice')

  if (!snippet && project.snippets?.length > 0) {
    // Populate replace dropdown
    replaceSelect.innerHTML = '<option value="">— create new —</option>'
    project.snippets.forEach(s => {
      const opt = document.createElement('option')
      opt.value = s.id
      opt.textContent = s.name
      replaceSelect.appendChild(opt)
    })

    // Auto-detect exact code match
    const exactMatch = project.snippets.find(s => s.code.trim() === snippetCodeToSave.trim())
    if (exactMatch) {
      replaceSelect.value = exactMatch.id
      document.getElementById('snip-name').value = exactMatch.name
      matchNotice.textContent = `Matches "${exactMatch.name}" — saving will update it.`
      matchNotice.classList.remove('hidden')
    } else {
      replaceSelect.value = ''
      matchNotice.classList.add('hidden')
    }

    replaceSelect.onchange = onReplaceChange
    replaceRow.classList.remove('hidden')
  } else {
    replaceSelect.onchange = null
    replaceRow.classList.add('hidden')
    matchNotice.classList.add('hidden')
  }

  show(modalSnippet)
  setTimeout(() => document.getElementById('snip-name').focus(), 50)
}

function onReplaceChange() {
  const replaceSelect = document.getElementById('snip-replace-select')
  const nameInput = document.getElementById('snip-name')
  const matchNotice = document.getElementById('snip-match-notice')
  const selected = snippetProject?.snippets?.find(s => s.id === replaceSelect.value)
  if (selected) {
    nameInput.value = selected.name
    matchNotice.textContent = `Will replace "${selected.name}".`
    matchNotice.classList.remove('hidden')
  } else {
    matchNotice.classList.add('hidden')
  }
}

document.getElementById('snip-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-snip-save').click()
})

function openSaveSnippetModal() {
  const conn = getActiveConnection()
  if (!conn) return
  const project = getProjects().find(p => p.connections.some(c => c.id === conn.id))
  if (!project) return
  openSnippetModal(project, null)
}

document.getElementById('btn-snip-cancel').addEventListener('click', () => {
  hide(modalSnippet)
  focusEditor()
})

document.getElementById('btn-snip-save').addEventListener('click', async () => {
  const name = document.getElementById('snip-name').value.trim()
  if (!name || !snippetProject) return

  const codeArea = document.getElementById('snip-code')
  const code = snippetEditing
    ? codeArea.value
    : (snippetCodeToSave ?? getCode())
  const now = new Date().toISOString()
  const replaceId = document.getElementById('snip-replace-select').value

  if (snippetEditing) {
    snippetEditing.name = name
    snippetEditing.code = code
    snippetEditing.updatedAt = now
    snippetProject.snippets = snippetProject.snippets.map(s =>
      s.id === snippetEditing.id ? snippetEditing : s
    )
  } else if (replaceId) {
    snippetProject.snippets = snippetProject.snippets.map(s =>
      s.id === replaceId ? { ...s, name, code, updatedAt: now } : s
    )
  } else {
    snippetProject.snippets = [
      ...snippetProject.snippets,
      { id: crypto.randomUUID(), name, code, updatedAt: now },
    ]
  }

  await invoke('save_project', { project: snippetProject })
  hide(modalSnippet)
  await loadProjects()
  focusEditor()
})

// ── Utility ────────────────────────────────────────────────────────────────

function show(el) { el.classList.remove('hidden') }
function hide(el) { el.classList.add('hidden') }

function focusEditor() {
  setTimeout(() => document.querySelector('.cm-editor .cm-content')?.focus(), 50)
}

function closeAllModals() {
  // Don't close the connection modal while on SSH step 2 — Escape would lose their work
  const step2Open = !document.getElementById('conn-step-2').classList.contains('hidden')
  const snippetWasOpen = !modalSnippet.classList.contains('hidden')
  hide(modalProject)
  if (!step2Open) hide(modalConn)
  hide(modalSnippet)
  hide(modalShortcuts)
  // welcome modal stays open until user acts — don't close on Escape
  if (snippetWasOpen) focusEditor()
}

// ── Keyboard shortcuts modal ───────────────────────────────────────────────

const modalShortcuts = document.getElementById('modal-shortcuts')
document.getElementById('btn-shortcuts-close').addEventListener('click', () => hide(modalShortcuts))
document.getElementById('btn-shortcuts').addEventListener('click', () => show(modalShortcuts))

document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable
  if (e.key === '?' && !inInput && !e.metaKey && !e.ctrlKey) {
    e.preventDefault()
    modalShortcuts.classList.contains('hidden') ? show(modalShortcuts) : hide(modalShortcuts)
  }
})

// ── Resizable panels ───────────────────────────────────────────────────────

;(function initResizePanels() {
  const SIDEBAR_KEY = 'tinkerlite.sidebarWidth'
  const OUTPUT_KEY  = 'tinkerlite.outputWidth'

  const sidebar     = document.getElementById('sidebar')
  const outputPanel = document.getElementById('output-panel')
  const hSidebar    = document.getElementById('resize-sidebar')
  const hOutput     = document.getElementById('resize-output')

  // Restore saved widths
  const savedSidebar = parseInt(localStorage.getItem(SIDEBAR_KEY), 10)
  const savedOutput  = parseInt(localStorage.getItem(OUTPUT_KEY), 10)
  if (savedSidebar) sidebar.style.width = savedSidebar + 'px'
  if (savedOutput)  outputPanel.style.width = savedOutput + 'px'

  // sign: +1 means drag-right increases width (sidebar), -1 means drag-right decreases width (output)
  function makeDraggable(handle, el, min, max, storageKey, sign = 1) {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault()
      const startX = e.clientX
      const startW = el.offsetWidth
      handle.classList.add('dragging')
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      function onMove(e) {
        const w = Math.max(min, Math.min(max, startW + sign * (e.clientX - startX)))
        el.style.width = w + 'px'
      }

      function onUp() {
        handle.classList.remove('dragging')
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        localStorage.setItem(storageKey, el.offsetWidth)
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }

  makeDraggable(hSidebar, sidebar, 160, 480, SIDEBAR_KEY, 1)
  // Output handle is on the left edge of the panel: drag left = bigger output (sign -1)
  makeDraggable(hOutput, outputPanel, 180, 800, OUTPUT_KEY, -1)
})();
