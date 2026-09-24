/** IPC 通道常量，main / preload / renderer 共用 */
export const IPC = {
  sessionList: 'session:list',
  sessionCreate: 'session:create',
  sessionUpdate: 'session:update',
  sessionDelete: 'session:delete',
  sessionDuplicate: 'session:duplicate',
  /** main → renderer，Agent 改了会话列表 */
  sessionChanged: 'session:changed',

  termCreate: 'term:create',
  termInput: 'term:input',
  termResize: 'term:resize',
  termClose: 'term:close',
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

  reverseStart: 'reverse:start',
  reverseStop: 'reverse:stop',
  reverseBind: 'reverse:bind',
  reverseState: 'reverse:state',
  reverseIncoming: 'reverse:incoming'
} as const
