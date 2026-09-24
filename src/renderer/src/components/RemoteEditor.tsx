import { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker.js?worker'
import cssWorker from 'monaco-editor/language/css/css.worker.js?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker.js?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker'
import { readBuffer, writeBuffer } from '../editor/editorBuffers'
import { useAppStore, type EditorTab } from '../stores/useAppStore'

self.MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}
loader.config({ monaco })

/** 主区域里的远程文本编辑器。Ctrl/Cmd+S 写回 SSH 上的原文件。 */
export function RemoteEditor(props: { tab: EditorTab }) {
  const tab = props.tab
  const setEditorDirty = useAppStore((s) => s.setEditorDirty)
  const pinEditorTab = useAppStore((s) => s.pinEditorTab)
  const editorTheme = useAppStore((s) => (s.resolvedApp === 'dark' ? 'vs-dark' : 'vs'))
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const textRef = useRef('')
  const savedRef = useRef('')

  const remember = (next: string, saved: string) => {
    textRef.current = next
    savedRef.current = saved
    writeBuffer(tab.key, { text: next, saved, loaded: true, error: '' })
    const dirty = next !== saved
    const row = useAppStore.getState().editorTabs.find((t) => t.key === tab.key)
    if (row && row.dirty !== dirty) setEditorDirty(tab.key, dirty)
    if (row?.preview && dirty) pinEditorTab(tab.key)
  }

  const load = useCallback(async () => {
    const cached = readBuffer(tab.key)
    if (cached?.loaded) {
      textRef.current = cached.text
      savedRef.current = cached.saved
      setText(cached.text)
      setError(cached.error)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const content = await window.api.sftp.read(tab.sessionId, tab.path)
      textRef.current = content
      savedRef.current = content
      writeBuffer(tab.key, { text: content, saved: content, loaded: true, error: '' })
      setText(content)
    } catch (e) {
      const message = e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '') : String(e)
      writeBuffer(tab.key, { text: '', saved: '', loaded: true, error: message })
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [tab.key, tab.path, tab.sessionId])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(async () => {
    try {
      await window.api.sftp.write(tab.sessionId, tab.path, textRef.current)
      remember(textRef.current, textRef.current)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '') : String(e))
    }
  }, [tab.key, tab.path, tab.sessionId])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      {error && <p className="px-3 py-2 text-xs text-destructive">{error}</p>}
      <div className="min-h-0 flex-1">
        {!loading && !error && (
          <Editor
            height="100%"
            language={languageOf(tab.name)}
            theme={editorTheme}
            value={text}
            onChange={(value) => {
              const next = value ?? ''
              setText(next)
              remember(next, savedRef.current)
            }}
            onMount={(ed, api) => {
              ed.addCommand(api.KeyMod.CtrlCmd | api.KeyCode.KeyS, () => void save())
            }}
            options={{
              automaticLayout: true,
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on'
            }}
          />
        )}
      </div>
    </div>
  )
}

function languageOf(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  const known: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    py: 'python',
    sh: 'shell',
    bash: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    xml: 'xml',
    sql: 'sql',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    vue: 'html'
  }
  return known[ext] ?? 'plaintext'
}
