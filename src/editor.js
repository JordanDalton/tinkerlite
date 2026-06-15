import { basicSetup } from 'codemirror'
import { EditorState, Compartment, Prec } from '@codemirror/state'
import { EditorView, keymap, rectangularSelection } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { autocompletion, completeFromList, startCompletion } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import { php } from '@codemirror/lang-php'
import { indentWithTab } from '@codemirror/commands'
import { getColor } from './theme.js'

const syntaxComp = new Compartment()
const chromeComp = new Compartment()
const completionComp = new Compartment()
let view = null

function buildSyntax(stored) {
  const c = {
    keyword:  getColor('syn-keyword',  stored),
    string:   getColor('syn-string',   stored),
    number:   getColor('syn-number',   stored),
    fn:       getColor('syn-fn',       stored),
    type:     getColor('syn-type',     stored),
    property: getColor('syn-property', stored),
    operator: getColor('syn-operator', stored),
    comment:  getColor('syn-comment',  stored),
    text:     getColor('syn-text',     stored),
  }
  const hl = HighlightStyle.define([
    { tag: tags.keyword,                                                    color: c.keyword },
    { tag: [tags.name, tags.deleted, tags.character, tags.macroName],      color: c.property },
    { tag: tags.propertyName,                                              color: c.property },
    { tag: [tags.function(tags.variableName), tags.labelName],             color: c.fn },
    { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: c.number },
    { tag: [tags.definition(tags.name), tags.separator],                   color: c.text },
    { tag: [tags.typeName, tags.className, tags.changed, tags.annotation,
            tags.modifier, tags.self, tags.namespace],                     color: c.type },
    { tag: tags.number,                                                    color: c.number },
    { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape,
            tags.regexp, tags.link, tags.special(tags.string)],            color: c.operator },
    { tag: [tags.meta, tags.comment],                                      color: c.comment },
    { tag: tags.strong,     fontWeight: 'bold' },
    { tag: tags.emphasis,   fontStyle:  'italic' },
    { tag: tags.link,       color: c.comment, textDecoration: 'underline' },
    { tag: [tags.atom, tags.bool, tags.special(tags.variableName)],        color: c.number },
    { tag: [tags.processingInstruction, tags.string, tags.inserted],       color: c.string },
    { tag: tags.invalid,    color: '#ffffff' },
  ])
  return syntaxHighlighting(hl)
}

function buildChrome(stored) {
  const bg     = getColor('ed-bg',     stored)
  const cursor = getColor('ed-cursor', stored)
  const gutter = getColor('ed-gutter', stored)
  return EditorView.theme({
    '&': { height: '100%', background: bg, fontSize: '13px' },
    '.cm-content': {
      padding: '16px 0',
      caretColor: cursor,
      fontFamily: "ui-monospace, 'JetBrains Mono', 'Fira Code', monospace",
    },
    '.cm-gutters': { background: bg, borderRight: '1px solid #252538', color: gutter },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '3.2em', padding: '0 10px 0 4px', fontVariantNumeric: 'tabular-nums',
    },
    '.cm-activeLine':      { background: 'rgba(255,255,255,0.025)' },
    '.cm-activeLineGutter':{ background: 'rgba(255,255,255,0.03)' },
    '.cm-selectionBackground, ::selection': { background: 'rgba(255,77,61,0.16) !important' },
    '.cm-matchingBracket': { background: 'rgba(255,77,61,0.18)', outline: '1px solid rgba(255,77,61,0.38)' },
    '.cm-foldGutter':      { color: gutter },
    '.cm-foldGutter:hover':{ color: '#b4b4cc' },
    '.cm-tooltip': {
      background: '#191926', border: '1px solid #252538',
      borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { background: 'rgba(255,77,61,0.15)' },
    '.cm-cursor': { borderLeftColor: cursor },
  })
}

let updateCallback = null
export function onEditorUpdate(fn) { updateCallback = fn }

export function initEditor(container, onRun, stored = {}) {
  const state = EditorState.create({
    doc: 'User::count();',
    extensions: [
      Prec.highest(keymap.of([
        { key: 'Mod-Enter', run: () => { onRun(); return true } },
        { key: 'Ctrl-.', run: startCompletion },
        { key: 'Mod-p', run: startCompletion },
        indentWithTab,
      ])),
      basicSetup,
      rectangularSelection({ eventFilter: e => e.button === 1 }),
      php({ plain: true }),
      EditorView.updateListener.of(u => { if (u.docChanged && updateCallback) updateCallback() }),
      syntaxComp.of(buildSyntax(stored)),
      chromeComp.of(buildChrome(stored)),
      completionComp.of(autocompletion()),
    ],
  })
  view = new EditorView({ state, parent: container })
  return view
}

export function setCompletions(classes, functions) {
  if (!view) return
  const items = [
    ...classes.map(label => ({ label, type: 'class' })),
    ...functions.map(label => ({ label, type: 'function' })),
  ]
  view.dispatch({
    effects: completionComp.reconfigure(
      autocompletion({ override: [completeFromList(items)], activateOnTyping: true })
    ),
  })
}

export function updateEditorColors(stored) {
  if (!view) return
  view.dispatch({
    effects: [
      syntaxComp.reconfigure(buildSyntax(stored)),
      chromeComp.reconfigure(buildChrome(stored)),
    ],
  })
}

export function getCode() {
  return view ? view.state.doc.toString() : ''
}

export function getSelection() {
  if (!view) return ''
  const { from, to } = view.state.selection.main
  return from === to ? '' : view.state.doc.sliceString(from, to)
}

export function setCode(code, cursorAtEnd = false) {
  if (!view) return
  const tr = { changes: { from: 0, to: view.state.doc.length, insert: code } }
  if (cursorAtEnd) tr.selection = { anchor: code.length }
  view.dispatch(tr)
}

export function insertCodeAtCursor(code) {
  if (!view) return
  const cursor = view.state.selection.main.head
  view.dispatch({
    changes: { from: cursor, insert: code },
    selection: { anchor: cursor + code.length },
  })
  view.focus()
}

export function appendCode(code) {
  if (!view) return
  const end = view.state.doc.length
  view.dispatch({
    changes: { from: end, insert: code },
    selection: { anchor: end + code.length },
  })
  view.focus()
}
