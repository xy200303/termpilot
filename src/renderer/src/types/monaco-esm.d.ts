/* monaco-editor 的 exports 只给子路径暴露运行时文件，没有类型入口。
   这里把子路径的类型指回根包，editor.api 的公开 API 与根包一致。 */
declare module 'monaco-editor/editor/editor.api' {
  export * from 'monaco-editor'
}

declare module 'monaco-editor/basic-languages/monaco.contribution'
declare module 'monaco-editor/language/json/monaco.contribution'
