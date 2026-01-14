export const IPC_CHANNELS = {
  // Window Management
  WINDOW: {
    OPEN_HUB: 'window:open-hub',
    CLOSE_HUB: 'window:close-hub',
    TOGGLE_HUB: 'window:toggle-hub',
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    SET_IGNORE_MOUSE: 'window:set-ignore-mouse',
  },

  // PhiVision
  PHIVISION: {
    TRIGGER: 'phivision:trigger',
    CAPTURE: 'phivision:capture',
    ANALYZE: 'phivision:analyze',
    RESULT: 'phivision:result',
    ANALYSIS_RESULT: 'phivision:analysis-result',
    GET_PENDING: 'phivision:get-pending',
    CLOSE: 'phivision:close',
    STATUS: 'phivision:status',
  },

  // AI Assistant
  AI: {
    SEND_MESSAGE: 'ai:send-message',
    STREAM_START: 'ai:stream-start',
    STREAM_CHUNK: 'ai:stream-chunk',
    STREAM_END: 'ai:stream-end',
    STREAM_ERROR: 'ai:stream-error',
    GET_PROVIDERS: 'ai:get-providers',
    SET_PROVIDER: 'ai:set-provider',
    CANCEL: 'ai:cancel',
  },

  // Auth
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    REGISTER: 'auth:register',
    GET_SESSION: 'auth:get-session',
    SESSION_CHANGED: 'auth:session-changed',
  },

  // Storage
  STORAGE: {
    GET: 'storage:get',
    SET: 'storage:set',
    DELETE: 'storage:delete',
  },

  // Local Conversations Storage
  LOCAL_CONVERSATIONS: {
    GET_ALL: 'local-conversations:get-all',
    GET_BY_ID: 'local-conversations:get-by-id',
    CREATE: 'local-conversations:create',
    UPDATE_TITLE: 'local-conversations:update-title',
    DELETE: 'local-conversations:delete',
    ARCHIVE: 'local-conversations:archive',
    TOGGLE_PIN: 'local-conversations:toggle-pin',
    ADD_MESSAGE: 'local-conversations:add-message',
  },

  // PPP (Plan Personnalisé de Prévention)
  PPP: {
    PRINT: 'ppp:print',
  },

  // Inter-window
  INTER_WINDOW: 'inter-window',
  BROADCAST: 'broadcast',
} as const
