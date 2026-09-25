/** IPC 通道常量，main / preload / renderer 共用 */
export const IPC = {
  sessionList: 'session:list',
  sessionCreate: 'session:create',
  sessionUpdate: 'session:update',
  sessionDelete: 'session:delete',
  sessionDuplicate: 'session:duplicate',
  /** main → renderer，Agent 改了会话列表 */
  sessionChanged: 'session:changed',
  hostNoteList: 'host:note-list',
  hostNoteSet: 'host:note-set',

  termSaved: 'term:saved',
  termBindView: 'term:bind-view',
  termCreate: 'term:create',
  termInput: 'term:input',
  termResize: 'term:resize',
  termClose: 'term:close',
  /** renderer → main，窗口短标题变了 */
  termLabel: 'term:label',
  /** main → renderer，助手改了终端备注 */
  termMeta: 'term:meta',
  /** main → renderer 事件 */
  termData: 'term:data',
  termStatus: 'term:status',

  /** 反向监听：本机 127.0.0.1，公网由 cpolar 等外部工具暴露 */
  sftpList: 'sftp:list',
  sftpMkdir: 'sftp:mkdir',
  sftpRemove: 'sftp:remove',
  sftpUpload: 'sftp:upload',
  sftpDownload: 'sftp:download',
  sftpRead: 'sftp:read',
  sftpWrite: 'sftp:write',
  sftpRename: 'sftp:rename',
  /** main → renderer，安装 SFTP 的进度和远程日志 */
  sftpInstall: 'sftp:install',

  mcpAgents: 'mcp:agents',
  mcpApplyAgent: 'mcp:apply-agent',
  mcpAudit: 'mcp:audit',
  mcpGet: 'mcp:get',
  mcpSave: 'mcp:save',

  appearanceGet: 'appearance:get',
  appearanceSave: 'appearance:save',
  mcpState: 'mcp:state',
  mcpStateEvent: 'mcp:state-event',
  mcpBound: 'mcp:bound',
  mcpOpenTab: 'mcp:open-tab',
  mcpCloseTab: 'mcp:close-tab',
  mcpConfirm: 'mcp:confirm',
  mcpConfirmReply: 'mcp:confirm-reply',

  /** 截取页面上真实的终端视图 */
  capturePage: 'capture:page',
  captureSave: 'capture:save',
  captureReveal: 'capture:reveal',
  captureCopy: 'capture:copy',
  captureRead: 'capture:read',
  captureRun: 'capture:run',
  captureReply: 'capture:reply',
  termLines: 'term:lines',
  termLinesReply: 'term:lines-reply',
  termMode: 'term:mode',
  termModeReply: 'term:mode-reply',

  reverseStart: 'reverse:start',
  reverseStop: 'reverse:stop',
  reverseBind: 'reverse:bind',
  reverseState: 'reverse:state',
  reverseIncoming: 'reverse:incoming',

  appVersion: 'app:version',
  appCheckUpdate: 'app:check-update',
  appOpenRelease: 'app:open-release'
} as const
