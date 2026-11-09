var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const kA = globalThis.__TERMPILOT_IRONRDP_WASM__;
class m {
  static __wrap(A) {
    const Q = Object.create(m.prototype);
    return Q.__wbg_ptr = A, t.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, t.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_clipboarddata_free(A, 0);
  }
  /**
   * @param {string} mime_type
   * @param {Uint8Array} binary
   */
  addBinary(A, Q) {
    const I = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), g = Y, E = lA(Q, C.__wbindgen_malloc), D = Y;
    C.clipboarddata_addBinary(this.__wbg_ptr, I, g, E, D);
  }
  /**
   * @param {string} mime_type
   * @param {string} text
   */
  addText(A, Q) {
    const I = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), g = Y, E = w(Q, C.__wbindgen_malloc, C.__wbindgen_realloc), D = Y;
    C.clipboarddata_addText(this.__wbg_ptr, I, g, E, D);
  }
  constructor() {
    const A = C.clipboarddata_create();
    return this.__wbg_ptr = A, t.register(this, this.__wbg_ptr, this), this;
  }
  /**
   * @returns {boolean}
   */
  isEmpty() {
    return C.clipboarddata_isEmpty(this.__wbg_ptr) !== 0;
  }
  /**
   * @returns {ClipboardItem[]}
   */
  items() {
    const A = C.clipboarddata_items(this.__wbg_ptr);
    var Q = hA(A[0], A[1]);
    return C.__wbindgen_free(A[0], A[1] * 4, 4), Q;
  }
}
Symbol.dispose && (m.prototype[Symbol.dispose] = m.prototype.free);
class K {
  static __wrap(A) {
    const Q = Object.create(K.prototype);
    return Q.__wbg_ptr = A, $.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, $.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_clipboarditem_free(A, 0);
  }
  /**
   * @returns {string}
   */
  mimeType() {
    let A, Q;
    try {
      const I = C.clipboarditem_mimeType(this.__wbg_ptr);
      return A = I[0], Q = I[1], M(I[0], I[1]);
    } finally {
      C.__wbindgen_free(A, Q, 1);
    }
  }
  /**
   * @returns {any}
   */
  value() {
    return C.clipboarditem_value(this.__wbg_ptr);
  }
}
Symbol.dispose && (K.prototype[Symbol.dispose] = K.prototype.free);
class l {
  static __wrap(A) {
    const Q = Object.create(l.prototype);
    return Q.__wbg_ptr = A, P.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, P.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_desktopsize_free(A, 0);
  }
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(A, Q) {
    const I = C.desktopsize_create(A, Q);
    return this.__wbg_ptr = I, P.register(this, this.__wbg_ptr, this), this;
  }
  /**
   * @returns {number}
   */
  get height() {
    return C.__wbg_get_desktopsize_height(this.__wbg_ptr);
  }
  /**
   * @returns {number}
   */
  get width() {
    return C.__wbg_get_desktopsize_width(this.__wbg_ptr);
  }
  /**
   * @param {number} arg0
   */
  set height(A) {
    C.__wbg_set_desktopsize_height(this.__wbg_ptr, A);
  }
  /**
   * @param {number} arg0
   */
  set width(A) {
    C.__wbg_set_desktopsize_width(this.__wbg_ptr, A);
  }
}
Symbol.dispose && (l.prototype[Symbol.dispose] = l.prototype.free);
class F {
  static __wrap(A) {
    const Q = Object.create(F.prototype);
    return Q.__wbg_ptr = A, AA.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, AA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_deviceevent_free(A, 0);
  }
  /**
   * @param {number} scancode
   * @returns {DeviceEvent}
   */
  static keyPressed(A) {
    const Q = C.deviceevent_keyPressed(A);
    return F.__wrap(Q);
  }
  /**
   * @param {number} scancode
   * @returns {DeviceEvent}
   */
  static keyReleased(A) {
    const Q = C.deviceevent_keyReleased(A);
    return F.__wrap(Q);
  }
  /**
   * @param {number} button
   * @returns {DeviceEvent}
   */
  static mouseButtonPressed(A) {
    const Q = C.deviceevent_mouseButtonPressed(A);
    return F.__wrap(Q);
  }
  /**
   * @param {number} button
   * @returns {DeviceEvent}
   */
  static mouseButtonReleased(A) {
    const Q = C.deviceevent_mouseButtonReleased(A);
    return F.__wrap(Q);
  }
  /**
   * @param {number} x
   * @param {number} y
   * @returns {DeviceEvent}
   */
  static mouseMove(A, Q) {
    const I = C.deviceevent_mouseMove(A, Q);
    return F.__wrap(I);
  }
  /**
   * @param {string} unicode
   * @returns {DeviceEvent}
   */
  static unicodePressed(A) {
    const Q = A.codePointAt(0);
    GA(Q);
    const I = C.deviceevent_unicodePressed(Q);
    return F.__wrap(I);
  }
  /**
   * @param {string} unicode
   * @returns {DeviceEvent}
   */
  static unicodeReleased(A) {
    const Q = A.codePointAt(0);
    GA(Q);
    const I = C.deviceevent_unicodeReleased(Q);
    return F.__wrap(I);
  }
  /**
   * @param {boolean} vertical
   * @param {number} rotation_amount
   * @param {RotationUnit} rotation_unit
   * @returns {DeviceEvent}
   */
  static wheelRotations(A, Q, I) {
    const g = C.deviceevent_wheelRotations(A, Q, I);
    return F.__wrap(g);
  }
}
Symbol.dispose && (F.prototype[Symbol.dispose] = F.prototype.free);
class k {
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, QA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_extension_free(A, 0);
  }
  /**
   * @param {string} ident
   * @param {any} value
   */
  constructor(A, Q) {
    const I = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), g = Y, E = C.extension_create(I, g, Q);
    return this.__wbg_ptr = E, QA.register(this, this.__wbg_ptr, this), this;
  }
}
Symbol.dispose && (k.prototype[Symbol.dispose] = k.prototype.free);
class f {
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, IA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_inputtransaction_free(A, 0);
  }
  /**
   * @param {DeviceEvent} event
   */
  addEvent(A) {
    H(A, F);
    var Q = A.__destroy_into_raw();
    C.inputtransaction_addEvent(this.__wbg_ptr, Q);
  }
  constructor() {
    const A = C.inputtransaction_create();
    return this.__wbg_ptr = A, IA.register(this, this.__wbg_ptr, this), this;
  }
}
Symbol.dispose && (f.prototype[Symbol.dispose] = f.prototype.free);
class z {
  static __wrap(A) {
    const Q = Object.create(z.prototype);
    return Q.__wbg_ptr = A, gA.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, gA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_ironerror_free(A, 0);
  }
  /**
   * @returns {string}
   */
  backtrace() {
    let A, Q;
    try {
      const I = C.ironerror_backtrace(this.__wbg_ptr);
      return A = I[0], Q = I[1], M(I[0], I[1]);
    } finally {
      C.__wbindgen_free(A, Q, 1);
    }
  }
  /**
   * @returns {IronErrorKind}
   */
  kind() {
    return C.ironerror_kind(this.__wbg_ptr);
  }
  /**
   * @returns {RDCleanPathDetails | undefined}
   */
  rdcleanpathDetails() {
    const A = C.ironerror_rdcleanpathDetails(this.__wbg_ptr);
    return A === 0 ? void 0 : q.__wrap(A);
  }
}
Symbol.dispose && (z.prototype[Symbol.dispose] = z.prototype.free);
class q {
  static __wrap(A) {
    const Q = Object.create(q.prototype);
    return Q.__wbg_ptr = A, BA.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, BA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_rdcleanpathdetails_free(A, 0);
  }
  /**
   * RDCleanPath error code sent by the proxy.
   *
   * Common values:
   * - 1: General error
   * - 100: Credential expired
   * - 103: Target unreachable
   *
   * Codes 16384 to 32767 are implementation-specific: their meaning depends on the proxy.
   * @returns {number | undefined}
   */
  get errorCode() {
    const A = C.rdcleanpathdetails_errorCode(this.__wbg_ptr);
    return A === 16777215 ? void 0 : A;
  }
  /**
   * HTTP status code if the error originated from an HTTP response.
   *
   * Common values:
   * - 403: Forbidden (e.g., deleted VNET, insufficient permissions)
   * - 404: Not Found
   * - 500: Internal Server Error
   * - 502: Bad Gateway
   * - 503: Service Unavailable
   * @returns {number | undefined}
   */
  get httpStatusCode() {
    const A = C.rdcleanpathdetails_httpStatusCode(this.__wbg_ptr);
    return A === 16777215 ? void 0 : A;
  }
  /**
   * TLS alert code if the error occurred during TLS handshake.
   *
   * Common values:
   * - 40: Handshake failure
   * - 42: Bad certificate
   * - 45: Certificate expired
   * - 48: Unknown CA
   * - 112: Unrecognized name
   * @returns {number | undefined}
   */
  get tlsAlertCode() {
    const A = C.rdcleanpathdetails_tlsAlertCode(this.__wbg_ptr);
    return A === 16777215 ? void 0 : A;
  }
  /**
   * Windows Socket API (WSA) error code.
   *
   * Common values:
   * - 10013: Permission denied (WSAEACCES) - often indicates deleted/invalid VNET
   * - 10060: Connection timed out (WSAETIMEDOUT)
   * - 10061: Connection refused (WSAECONNREFUSED)
   * - 10051: Network is unreachable (WSAENETUNREACH)
   * - 10065: No route to host (WSAEHOSTUNREACH)
   * @returns {number | undefined}
   */
  get wsaErrorCode() {
    const A = C.rdcleanpathdetails_wsaErrorCode(this.__wbg_ptr);
    return A === 16777215 ? void 0 : A;
  }
}
Symbol.dispose && (q.prototype[Symbol.dispose] = q.prototype.free);
class _ {
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, CA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_rdpfile_free(A, 0);
  }
  constructor() {
    const A = C.rdpfile_create();
    return this.__wbg_ptr = A, CA.register(this, this.__wbg_ptr, this), this;
  }
  /**
   * @param {string} key
   * @returns {number | undefined}
   */
  getInt(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y, g = C.rdpfile_getInt(this.__wbg_ptr, Q, I);
    return g === Number.MAX_SAFE_INTEGER ? void 0 : g;
  }
  /**
   * @param {string} key
   * @returns {string | undefined}
   */
  getStr(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y, g = C.rdpfile_getStr(this.__wbg_ptr, Q, I);
    let E;
    return g[0] !== 0 && (E = M(g[0], g[1]), C.__wbindgen_free(g[0], g[1] * 1, 1)), E;
  }
  /**
   * @param {string} key
   * @param {number} value
   */
  insertInt(A, Q) {
    const I = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), g = Y;
    C.rdpfile_insertInt(this.__wbg_ptr, I, g, Q);
  }
  /**
   * @param {string} key
   * @param {string} value
   */
  insertStr(A, Q) {
    const I = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), g = Y, E = w(Q, C.__wbindgen_malloc, C.__wbindgen_realloc), D = Y;
    C.rdpfile_insertStr(this.__wbg_ptr, I, g, E, D);
  }
  /**
   * @param {string} config
   */
  parse(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y;
    C.rdpfile_parse(this.__wbg_ptr, Q, I);
  }
  /**
   * @returns {string}
   */
  write() {
    let A, Q;
    try {
      const I = C.rdpfile_write(this.__wbg_ptr);
      return A = I[0], Q = I[1], M(I[0], I[1]);
    } finally {
      C.__wbindgen_free(A, Q, 1);
    }
  }
}
Symbol.dispose && (_.prototype[Symbol.dispose] = _.prototype.free);
class T {
  static __wrap(A) {
    const Q = Object.create(T.prototype);
    return Q.__wbg_ptr = A, EA.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, EA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_session_free(A, 0);
  }
  /**
   * @param {InputTransaction} transaction
   */
  applyInputs(A) {
    H(A, f);
    var Q = A.__destroy_into_raw();
    const I = C.session_applyInputs(this.__wbg_ptr, Q);
    if (I[1])
      throw U(I[0]);
  }
  /**
   * @returns {DesktopSize}
   */
  desktopSize() {
    const A = C.session_desktopSize(this.__wbg_ptr);
    return l.__wrap(A);
  }
  /**
   * @param {Extension} ext
   * @returns {any}
   */
  invokeExtension(A) {
    H(A, k);
    var Q = A.__destroy_into_raw();
    const I = C.session_invokeExtension(this.__wbg_ptr, Q);
    if (I[2])
      throw U(I[1]);
    return U(I[0]);
  }
  /**
   * @param {ClipboardData} content
   * @returns {Promise<void>}
   */
  onClipboardPaste(A) {
    return H(A, m), C.session_onClipboardPaste(this.__wbg_ptr, A.__wbg_ptr);
  }
  releaseAllInputs() {
    const A = C.session_releaseAllInputs(this.__wbg_ptr);
    if (A[1])
      throw U(A[0]);
  }
  /**
   * @param {number} width
   * @param {number} height
   * @param {number | null} [scale_factor]
   * @param {number | null} [physical_width]
   * @param {number | null} [physical_height]
   */
  resize(A, Q, I, g, E) {
    C.session_resize(this.__wbg_ptr, A, Q, R(I) ? Number.MAX_SAFE_INTEGER : I >>> 0, R(g) ? Number.MAX_SAFE_INTEGER : g >>> 0, R(E) ? Number.MAX_SAFE_INTEGER : E >>> 0);
  }
  /**
   * @returns {Promise<SessionTerminationInfo>}
   */
  run() {
    return C.session_run(this.__wbg_ptr);
  }
  shutdown() {
    const A = C.session_shutdown(this.__wbg_ptr);
    if (A[1])
      throw U(A[0]);
  }
  /**
   * @returns {boolean}
   */
  supportsUnicodeKeyboardShortcuts() {
    return C.session_supportsUnicodeKeyboardShortcuts(this.__wbg_ptr) !== 0;
  }
  /**
   * @param {boolean} scroll_lock
   * @param {boolean} num_lock
   * @param {boolean} caps_lock
   * @param {boolean} kana_lock
   */
  synchronizeLockKeys(A, Q, I, g) {
    const E = C.session_synchronizeLockKeys(this.__wbg_ptr, A, Q, I, g);
    if (E[1])
      throw U(E[0]);
  }
}
Symbol.dispose && (T.prototype[Symbol.dispose] = T.prototype.free);
class J {
  static __wrap(A) {
    const Q = Object.create(J.prototype);
    return Q.__wbg_ptr = A, v.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, v.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_sessionbuilder_free(A, 0);
  }
  /**
   * @param {string} token
   * @returns {SessionBuilder}
   */
  authToken(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y, g = C.sessionbuilder_authToken(this.__wbg_ptr, Q, I);
    return J.__wrap(g);
  }
  /**
   * @param {Function} callback
   * @returns {SessionBuilder}
   */
  canvasResizedCallback(A) {
    const Q = C.sessionbuilder_canvasResizedCallback(this.__wbg_ptr, A);
    return J.__wrap(Q);
  }
  /**
   * @returns {Promise<Session>}
   */
  connect() {
    return C.sessionbuilder_connect(this.__wbg_ptr);
  }
  constructor() {
    const A = C.sessionbuilder_create();
    return this.__wbg_ptr = A, v.register(this, this.__wbg_ptr, this), this;
  }
  /**
   * @param {DesktopSize} desktop_size
   * @returns {SessionBuilder}
   */
  desktopSize(A) {
    H(A, l);
    var Q = A.__destroy_into_raw();
    const I = C.sessionbuilder_desktopSize(this.__wbg_ptr, Q);
    return J.__wrap(I);
  }
  /**
   * @param {string} destination
   * @returns {SessionBuilder}
   */
  destination(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y, g = C.sessionbuilder_destination(this.__wbg_ptr, Q, I);
    return J.__wrap(g);
  }
  /**
   * @param {Extension} ext
   * @returns {SessionBuilder}
   */
  extension(A) {
    H(A, k);
    var Q = A.__destroy_into_raw();
    const I = C.sessionbuilder_extension(this.__wbg_ptr, Q);
    return J.__wrap(I);
  }
  /**
   * @param {Function} callback
   * @returns {SessionBuilder}
   */
  forceClipboardUpdateCallback(A) {
    const Q = C.sessionbuilder_forceClipboardUpdateCallback(this.__wbg_ptr, A);
    return J.__wrap(Q);
  }
  /**
   * @param {string} password
   * @returns {SessionBuilder}
   */
  password(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y, g = C.sessionbuilder_password(this.__wbg_ptr, Q, I);
    return J.__wrap(g);
  }
  /**
   * @param {string} address
   * @returns {SessionBuilder}
   */
  proxyAddress(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y, g = C.sessionbuilder_proxyAddress(this.__wbg_ptr, Q, I);
    return J.__wrap(g);
  }
  /**
   * @param {Function} callback
   * @returns {SessionBuilder}
   */
  remoteClipboardChangedCallback(A) {
    const Q = C.sessionbuilder_remoteClipboardChangedCallback(this.__wbg_ptr, A);
    return J.__wrap(Q);
  }
  /**
   * @param {HTMLCanvasElement} canvas
   * @returns {SessionBuilder}
   */
  renderCanvas(A) {
    const Q = C.sessionbuilder_renderCanvas(this.__wbg_ptr, A);
    return J.__wrap(Q);
  }
  /**
   * @param {string} server_domain
   * @returns {SessionBuilder}
   */
  serverDomain(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y, g = C.sessionbuilder_serverDomain(this.__wbg_ptr, Q, I);
    return J.__wrap(g);
  }
  /**
   * @param {any} context
   * @returns {SessionBuilder}
   */
  setCursorStyleCallbackContext(A) {
    const Q = C.sessionbuilder_setCursorStyleCallbackContext(this.__wbg_ptr, A);
    return J.__wrap(Q);
  }
  /**
   * @param {Function} callback
   * @returns {SessionBuilder}
   */
  setCursorStyleCallback(A) {
    const Q = C.sessionbuilder_setCursorStyleCallback(this.__wbg_ptr, A);
    return J.__wrap(Q);
  }
  /**
   * @param {string} username
   * @returns {SessionBuilder}
   */
  username(A) {
    const Q = w(A, C.__wbindgen_malloc, C.__wbindgen_realloc), I = Y, g = C.sessionbuilder_username(this.__wbg_ptr, Q, I);
    return J.__wrap(g);
  }
  /**
   * @param {Array<any>} protocols
   * @returns {SessionBuilder}
   */
  webSocketProtocols(A) {
    const Q = C.sessionbuilder_webSocketProtocols(this.__wbg_ptr, A);
    return J.__wrap(Q);
  }
}
Symbol.dispose && (J.prototype[Symbol.dispose] = J.prototype.free);
class x {
  static __wrap(A) {
    const Q = Object.create(x.prototype);
    return Q.__wbg_ptr = A, DA.register(Q, Q.__wbg_ptr, Q), Q;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, DA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    C.__wbg_sessionterminationinfo_free(A, 0);
  }
  /**
   * @returns {string}
   */
  reason() {
    let A, Q;
    try {
      const I = C.sessionterminationinfo_reason(this.__wbg_ptr);
      return A = I[0], Q = I[1], M(I[0], I[1]);
    } finally {
      C.__wbindgen_free(A, Q, 1);
    }
  }
}
Symbol.dispose && (x.prototype[Symbol.dispose] = x.prototype.free);
function wA(B) {
  const A = w(B, C.__wbindgen_malloc, C.__wbindgen_realloc), Q = Y;
  C.setup(A, Q);
}
function MA() {
  return {
    __proto__: null,
    "./ironrdp_web_bg.js": {
      __proto__: null,
      __wbg___wbindgen_boolean_get_5b446f51afd21013: function(A) {
        const Q = A, I = typeof Q == "boolean" ? Q : void 0;
        return R(I) ? 16777215 : I ? 1 : 0;
      },
      __wbg___wbindgen_debug_string_4687d8d8c2017d52: function(A, Q) {
        const I = e(Q), g = w(I, C.__wbindgen_malloc, C.__wbindgen_realloc), E = Y;
        c().setInt32(A + 4, E, true), c().setInt32(A + 0, g, true);
      },
      __wbg___wbindgen_is_function_1f9d30630b8b1d3d: function(A) {
        return typeof A == "function";
      },
      __wbg___wbindgen_is_null_e343b7d08827ba72: function(A) {
        return A === null;
      },
      __wbg___wbindgen_is_string_90b56bc79aad6f6c: function(A) {
        return typeof A == "string";
      },
      __wbg___wbindgen_is_undefined_8865fb403f8fe9d8: function(A) {
        return A === void 0;
      },
      __wbg___wbindgen_number_get_2e0e7dee9f701a71: function(A, Q) {
        const I = Q, g = typeof I == "number" ? I : void 0;
        c().setFloat64(A + 8, R(g) ? 0 : g, true), c().setInt32(A + 0, !R(g), true);
      },
      __wbg___wbindgen_string_get_0380ccaa2f57f0d9: function(A, Q) {
        const I = Q, g = typeof I == "string" ? I : void 0;
        var E = R(g) ? 0 : w(g, C.__wbindgen_malloc, C.__wbindgen_realloc), D = Y;
        c().setInt32(A + 4, D, true), c().setInt32(A + 0, E, true);
      },
      __wbg___wbindgen_throw_41e9ee4f547fc59a: function(A, Q) {
        throw new Error(M(A, Q));
      },
      __wbg__wbg_cb_unref_dcc1a90847f04c41: function(A) {
        A._wbg_cb_unref();
      },
      __wbg_addEventListener_4d0db17c671ea324: function() {
        return o(function(A, Q, I, g) {
          A.addEventListener(M(Q, I), g);
        }, arguments);
      },
      __wbg_addEventListener_8d3235978b9c69a8: function() {
        return o(function(A, Q, I, g, E) {
          A.addEventListener(M(Q, I), g, E);
        }, arguments);
      },
      __wbg_apply_a910804df6e1e433: function() {
        return o(function(A, Q, I) {
          return A.apply(Q, I);
        }, arguments);
      },
      __wbg_arrayBuffer_f07be74819944ea2: function() {
        return o(function(A) {
          return A.arrayBuffer();
        }, arguments);
      },
      __wbg_call_1875a20c43a36133: function() {
        return o(function(A, Q, I, g) {
          return A.call(Q, I, g);
        }, arguments);
      },
      __wbg_call_187d372bd5fdd4aa: function() {
        return o(function(A, Q, I) {
          return A.call(Q, I);
        }, arguments);
      },
      __wbg_call_6137034ef55c9d0f: function() {
        return o(function(A, Q) {
          return A.call(Q);
        }, arguments);
      },
      __wbg_clearInterval_26ba580547547579: function(A) {
        return clearInterval(A);
      },
      __wbg_clearTimeout_3629d6209dfcc46e: function(A) {
        return clearTimeout(A);
      },
      __wbg_clipboarddata_new: function(A) {
        return m.__wrap(A);
      },
      __wbg_clipboarditem_new: function(A) {
        return K.__wrap(A);
      },
      __wbg_close_d3ed56b5763be5ae: function() {
        return o(function(A) {
          A.close();
        }, arguments);
      },
      __wbg_code_4cb6dbcfceec1eac: function(A) {
        return A.code;
      },
      __wbg_data_522f7abc70721269: function(A) {
        return A.data;
      },
      __wbg_debug_05be7ad0a1e623f8: function(A, Q, I, g) {
        console.debug(A, Q, I, g);
      },
      __wbg_debug_52bda05ddf50b736: function(A) {
        console.debug(A);
      },
      __wbg_dispatchEvent_57e1a8af186ff471: function() {
        return o(function(A, Q) {
          return A.dispatchEvent(Q);
        }, arguments);
      },
      __wbg_error_6614f5677eeead43: function(A, Q, I, g) {
        console.error(A, Q, I, g);
      },
      __wbg_error_757e9472f8410341: function(A, Q) {
        let I, g;
        try {
          I = A, g = Q, console.error(M(A, Q));
        } finally {
          C.__wbindgen_free(I, g, 1);
        }
      },
      __wbg_error_c9cf3fc2064683a9: function(A) {
        console.error(A);
      },
      __wbg_fetch_9b478faef8cda538: function(A) {
        return fetch(A);
      },
      __wbg_from_296ca31f8d0f1c52: function(A) {
        return Array.from(A);
      },
      __wbg_getContext_635e36719cad2623: function() {
        return o(function(A, Q, I) {
          const g = A.getContext(M(Q, I));
          return R(g) ? 0 : a(g);
        }, arguments);
      },
      __wbg_getRandomValues_436a51d0629d84e1: function() {
        return o(function(A, Q) {
          globalThis.crypto.getRandomValues(W(A, Q));
        }, arguments);
      },
      __wbg_getRandomValues_869eb80731672410: function() {
        return o(function(A, Q) {
          globalThis.crypto.getRandomValues(W(A, Q));
        }, arguments);
      },
      __wbg_getRandomValues_a608c4436c19407a: function() {
        return o(function(A, Q) {
          globalThis.crypto.getRandomValues(W(A, Q));
        }, arguments);
      },
      __wbg_getTime_f5a55efff2585d5d: function(A) {
        return A.getTime();
      },
      __wbg_get_31af05bd4842a84f: function() {
        return o(function(A, Q) {
          return Reflect.get(A, Q);
        }, arguments);
      },
      __wbg_get_6c896e0571ddae51: function(A, Q) {
        return A[Q >>> 0];
      },
      __wbg_get_unchecked_288889d017702237: function(A, Q) {
        return A[Q >>> 0];
      },
      __wbg_info_26925f73a2eee895: function(A) {
        console.info(A);
      },
      __wbg_info_b68ad4a35d1670c2: function(A, Q, I, g) {
        console.info(A, Q, I, g);
      },
      __wbg_instanceof_ArrayBuffer_a99f175873e5d9b8: function(A) {
        let Q;
        try {
          Q = A instanceof ArrayBuffer;
        } catch {
          Q = false;
        }
        return Q;
      },
      __wbg_instanceof_CanvasRenderingContext2d_769208c72dcbf5e6: function(A) {
        let Q;
        try {
          Q = A instanceof CanvasRenderingContext2D;
        } catch {
          Q = false;
        }
        return Q;
      },
      __wbg_instanceof_Error_80a725f81f2e102d: function(A) {
        let Q;
        try {
          Q = A instanceof Error;
        } catch {
          Q = false;
        }
        return Q;
      },
      __wbg_instanceof_Object_67a83cdc00c5d141: function(A) {
        let Q;
        try {
          Q = A instanceof Object;
        } catch {
          Q = false;
        }
        return Q;
      },
      __wbg_instanceof_Response_b8758567269c30b2: function(A) {
        let Q;
        try {
          Q = A instanceof Response;
        } catch {
          Q = false;
        }
        return Q;
      },
      __wbg_instanceof_Window_82d71df4eddf88bc: function(A) {
        let Q;
        try {
          Q = A instanceof Window;
        } catch {
          Q = false;
        }
        return Q;
      },
      __wbg_ironerror_new: function(A) {
        return z.__wrap(A);
      },
      __wbg_isArray_e15a2ff68ffdbef2: function(A) {
        return Array.isArray(A);
      },
      __wbg_length_7f3c00c40364105e: function(A) {
        return A.length;
      },
      __wbg_length_d4bdea10311bd9cf: function(A) {
        return A.length;
      },
      __wbg_message_5f8387f0c32b90a7: function(A) {
        return A.message;
      },
      __wbg_name_e2eac7cdfa054f65: function(A) {
        return A.name;
      },
      __wbg_navigator_2156486643462a87: function(A) {
        return A.navigator;
      },
      __wbg_new_0_72d020f0c63443d4: function() {
        return /* @__PURE__ */ new Date();
      },
      __wbg_new_1dbf7428bba60a42: function(A) {
        return new Uint8Array(A);
      },
      __wbg_new_227d7c05414eb861: function() {
        return new Error();
      },
      __wbg_new_4059fb0406225e04: function() {
        return o(function(A, Q) {
          return new WebSocket(M(A, Q));
        }, arguments);
      },
      __wbg_new_617a8cdb8bb1130e: function() {
        return new Object();
      },
      __wbg_new_820eb53f620ccf82: function() {
        return o(function(A, Q) {
          return new URL(M(A, Q));
        }, arguments);
      },
      __wbg_new_83ca405eae412a62: function() {
        return o(function() {
          return new Headers();
        }, arguments);
      },
      __wbg_new_d92488e3f585ed02: function() {
        return o(function() {
          return new URLSearchParams();
        }, arguments);
      },
      __wbg_new_ee2291f50781bf1d: function() {
        return new Array();
      },
      __wbg_new_from_slice_37a3c3a194266cb8: function(A, Q) {
        return new Uint32Array(aA(A, Q));
      },
      __wbg_new_from_slice_9a868026ffa4208a: function(A, Q) {
        return new Uint8Array(W(A, Q));
      },
      __wbg_new_typed_b01cb72a8af741a3: function(A, Q) {
        try {
          var I = { a: A, b: Q }, g = (D, G) => {
            const N = I.a;
            I.a = 0;
            try {
              return yA(N, I.b, D, G);
            } finally {
              I.a = N;
            }
          };
          return new Promise(g);
        } finally {
          I.a = 0;
        }
      },
      __wbg_new_with_event_init_dict_92dd01bedbb7ac30: function() {
        return o(function(A, Q, I) {
          return new CloseEvent(M(A, Q), I);
        }, arguments);
      },
      __wbg_new_with_str_2d1292ac88699448: function() {
        return o(function(A, Q) {
          return new Request(M(A, Q));
        }, arguments);
      },
      __wbg_new_with_str_and_init_4618dee4e950224f: function() {
        return o(function(A, Q, I) {
          return new Request(M(A, Q), I);
        }, arguments);
      },
      __wbg_new_with_str_sequence_f79e461d58fdeacc: function() {
        return o(function(A, Q, I) {
          return new WebSocket(M(A, Q), I);
        }, arguments);
      },
      __wbg_new_with_u8_array_sequence_f380e3e783ae5617: function() {
        return o(function(A) {
          return new Blob(A);
        }, arguments);
      },
      __wbg_new_with_u8_clamped_array_and_sh_af3f0dee40638e18: function() {
        return o(function(A, Q, I, g) {
          return new ImageData(OA(A, Q), I >>> 0, g >>> 0);
        }, arguments);
      },
      __wbg_now_aa4ccb83129e9e55: function() {
        return Date.now();
      },
      __wbg_now_d0b7f4bea9f38490: function(A) {
        return A.now();
      },
      __wbg_now_e7c6795a7f81e10f: function(A) {
        return A.now();
      },
      __wbg_of_d5dbecdc59e02e34: function(A) {
        return Array.of(A);
      },
      __wbg_ok_125878a7db256ecb: function(A) {
        return A.ok;
      },
      __wbg_performance_3fcf6e32a7e1ed0a: function(A) {
        return A.performance;
      },
      __wbg_performance_d0d7b03fc649b694: function(A) {
        const Q = A.performance;
        return R(Q) ? 0 : a(Q);
      },
      __wbg_prototypesetcall_bc27214492979395: function(A, Q, I) {
        Uint8Array.prototype.set.call(W(A, Q), I);
      },
      __wbg_push_2baf45db356cf468: function(A, Q) {
        return A.push(Q);
      },
      __wbg_putImageData_11570c06086c9e05: function() {
        return o(function(A, Q, I, g) {
          A.putImageData(Q, I, g);
        }, arguments);
      },
      __wbg_queueMicrotask_9833f9a49df95a49: function(A) {
        return A.queueMicrotask;
      },
      __wbg_queueMicrotask_a72f977e97f23c5f: function(A) {
        queueMicrotask(A);
      },
      __wbg_readyState_d8514376867e415b: function(A) {
        return A.readyState;
      },
      __wbg_reason_832acaf5f4083b7b: function(A, Q) {
        const I = Q.reason, g = w(I, C.__wbindgen_malloc, C.__wbindgen_realloc), E = Y;
        c().setInt32(A + 4, E, true), c().setInt32(A + 0, g, true);
      },
      __wbg_removeEventListener_6e68185345978771: function() {
        return o(function(A, Q, I, g) {
          A.removeEventListener(M(Q, I), g);
        }, arguments);
      },
      __wbg_resolve_0076e10020304ede: function(A) {
        return Promise.resolve(A);
      },
      __wbg_search_c401c3a62c560ce7: function(A, Q) {
        const I = Q.search, g = w(I, C.__wbindgen_malloc, C.__wbindgen_realloc), E = Y;
        c().setInt32(A + 4, E, true), c().setInt32(A + 0, g, true);
      },
      __wbg_send_5420ae0bcef8c110: function() {
        return o(function(A, Q) {
          A.send(Q);
        }, arguments);
      },
      __wbg_send_b5bdd806efe4baf6: function() {
        return o(function(A, Q, I) {
          A.send(M(Q, I));
        }, arguments);
      },
      __wbg_session_new: function(A) {
        return T.__wrap(A);
      },
      __wbg_sessionterminationinfo_new: function(A) {
        return x.__wrap(A);
      },
      __wbg_setInterval_cbf1c35c6a692d37: function() {
        return o(function(A, Q) {
          return setInterval(A, Q);
        }, arguments);
      },
      __wbg_setTimeout_56bcdccbad22fd44: function() {
        return o(function(A, Q) {
          return setTimeout(A, Q);
        }, arguments);
      },
      __wbg_set_145a351398b48c65: function() {
        return o(function(A, Q, I) {
          return Reflect.set(A, Q, I);
        }, arguments);
      },
      __wbg_set_af5932e3f78b5648: function() {
        return o(function(A, Q, I, g, E) {
          A.set(M(Q, I), M(g, E));
        }, arguments);
      },
      __wbg_set_binaryType_21835bf0df8f70aa: function(A, Q) {
        A.binaryType = jA[Q];
      },
      __wbg_set_body_1fb0f1008bfc7df6: function(A, Q) {
        A.body = Q;
      },
      __wbg_set_code_f385a2b721072cea: function(A, Q) {
        A.code = Q;
      },
      __wbg_set_headers_40ad33dcf016613f: function(A, Q) {
        A.headers = Q;
      },
      __wbg_set_height_c9789c1c77eaedff: function(A, Q) {
        A.height = Q >>> 0;
      },
      __wbg_set_method_dcb32343247ec427: function(A, Q, I) {
        A.method = M(Q, I);
      },
      __wbg_set_once_8c45bbbfb71d1b34: function(A, Q) {
        A.once = Q !== 0;
      },
      __wbg_set_reason_b18f2b84e16d9b48: function(A, Q, I) {
        A.reason = M(Q, I);
      },
      __wbg_set_search_de4e8694f3b52c24: function(A, Q, I) {
        A.search = M(Q, I);
      },
      __wbg_set_width_b0e1267db4b196b5: function(A, Q) {
        A.width = Q >>> 0;
      },
      __wbg_stack_3b0d974bbf31e44f: function(A, Q) {
        const I = Q.stack, g = w(I, C.__wbindgen_malloc, C.__wbindgen_realloc), E = Y;
        c().setInt32(A + 4, E, true), c().setInt32(A + 0, g, true);
      },
      __wbg_static_accessor_GLOBAL_266715b9d96ba635: function() {
        const A = typeof global > "u" ? null : global;
        return R(A) ? 0 : a(A);
      },
      __wbg_static_accessor_GLOBAL_THIS_10fb7dc1ae063179: function() {
        const A = typeof globalThis > "u" ? null : globalThis;
        return R(A) ? 0 : a(A);
      },
      __wbg_static_accessor_SELF_0b583911f537483a: function() {
        const A = typeof self > "u" ? null : self;
        return R(A) ? 0 : a(A);
      },
      __wbg_static_accessor_WINDOW_d7f903d1508cbdc4: function() {
        const A = typeof window > "u" ? null : window;
        return R(A) ? 0 : a(A);
      },
      __wbg_statusText_bceed558320dd590: function(A, Q) {
        const I = Q.statusText, g = w(I, C.__wbindgen_malloc, C.__wbindgen_realloc), E = Y;
        c().setInt32(A + 4, E, true), c().setInt32(A + 0, g, true);
      },
      __wbg_status_ce0a98d3c57125f3: function(A) {
        return A.status;
      },
      __wbg_then_c949d5a25a4e78f8: function(A, Q, I) {
        return A.then(Q, I);
      },
      __wbg_then_e71170d78fcf8954: function(A, Q) {
        return A.then(Q);
      },
      __wbg_toString_0a6162345e699dea: function(A) {
        return A.toString();
      },
      __wbg_toString_83fab3d7c865ecd3: function(A) {
        return A.toString();
      },
      __wbg_url_7bfada5c2297bc70: function(A, Q) {
        const I = Q.url, g = w(I, C.__wbindgen_malloc, C.__wbindgen_realloc), E = Y;
        c().setInt32(A + 4, E, true), c().setInt32(A + 0, g, true);
      },
      __wbg_userAgent_cde4c65cc98db425: function() {
        return o(function(A, Q) {
          const I = Q.userAgent, g = w(I, C.__wbindgen_malloc, C.__wbindgen_realloc), E = Y;
          c().setInt32(A + 4, E, true), c().setInt32(A + 0, g, true);
        }, arguments);
      },
      __wbg_warn_13abc63e0d4b3527: function(A) {
        console.warn(A);
      },
      __wbg_warn_88929063e36ba285: function(A, Q, I, g) {
        console.warn(A, Q, I, g);
      },
      __wbg_wasClean_b246ecade802c6ff: function(A) {
        return A.wasClean;
      },
      __wbindgen_generic_0000000000000001: function(A, Q) {
        return p(A, Q, RA);
      },
      __wbindgen_generic_0000000000000002: function(A, Q) {
        return p(A, Q, iA);
      },
      __wbindgen_generic_0000000000000003: function(A, Q) {
        return p(A, Q, ZA);
      },
      __wbindgen_generic_0000000000000004: function(A, Q) {
        return p(A, Q, FA);
      },
      __wbindgen_generic_0000000000000005: function(A, Q) {
        return p(A, Q, JA);
      },
      __wbindgen_generic_0000000000000006: function(A, Q) {
        return p(A, Q, cA);
      },
      __wbindgen_generic_0000000000000007: function(A) {
        return A;
      },
      __wbindgen_generic_0000000000000008: function(A, Q) {
        return M(A, Q);
      },
      __wbindgen_init_externref_table: function() {
        const A = C.__wbindgen_externrefs, Q = A.grow(4);
        A.set(0, void 0), A.set(Q + 0, void 0), A.set(Q + 1, null), A.set(Q + 2, true), A.set(Q + 3, false);
      }
    }
  };
}
function JA(B, A) {
  C.wasm_bindgen__convert__closures_____invoke__hccd2628eab9b1dfd(B, A);
}
function cA(B, A) {
  C.wasm_bindgen__convert__closures_____invoke__h0a72f3930d51f8bb(B, A);
}
function iA(B, A, Q) {
  C.wasm_bindgen__convert__closures_____invoke__h0f1643fa4322c4e0(B, A, Q);
}
function ZA(B, A, Q) {
  C.wasm_bindgen__convert__closures_____invoke__h0f1643fa4322c4e0_69(B, A, Q);
}
function FA(B, A, Q) {
  C.wasm_bindgen__convert__closures_____invoke__h0f1643fa4322c4e0_70(B, A, Q);
}
function RA(B, A, Q) {
  const I = C.wasm_bindgen__convert__closures_____invoke__h5671bd5cdd45c099(B, A, Q);
  if (I[1])
    throw U(I[0]);
}
function yA(B, A, Q, I) {
  C.wasm_bindgen__convert__closures_____invoke__h27292bb44e0b012e(B, A, Q, I);
}
const jA = ["blob", "arraybuffer"], t = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_clipboarddata_free(B, 1)), $ = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_clipboarditem_free(B, 1)), P = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_desktopsize_free(B, 1)), AA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_deviceevent_free(B, 1)), QA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_extension_free(B, 1)), IA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_inputtransaction_free(B, 1)), gA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_ironerror_free(B, 1)), BA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_rdcleanpathdetails_free(B, 1)), CA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_rdpfile_free(B, 1)), EA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_session_free(B, 1)), v = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_sessionbuilder_free(B, 1)), DA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbg_sessionterminationinfo_free(B, 1));
function a(B) {
  const A = C.__externref_table_alloc();
  return C.__wbindgen_externrefs.set(A, B), A;
}
function GA(B) {
  if (typeof B == "number" && (B >= 1114112 || B >= 55296 && B < 57344)) throw new Error(`expected a valid Unicode scalar value, found ${B}`);
}
function H(B, A) {
  if (!(B instanceof A))
    throw new Error(`expected instance of ${A.name}`);
}
const NA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((B) => C.__wbindgen_destroy_closure(B.a, B.b));
function e(B) {
  const A = typeof B;
  if (A == "number" || A == "boolean" || B == null)
    return `${B}`;
  if (A == "string")
    return `"${B}"`;
  if (A == "symbol") {
    const g = B.description;
    return g == null ? "Symbol" : `Symbol(${g})`;
  }
  if (A == "function") {
    const g = B.name;
    return typeof g == "string" && g.length > 0 ? `Function(${g})` : "Function";
  }
  if (Array.isArray(B)) {
    const g = B.length;
    let E = "[";
    g > 0 && (E += e(B[0]));
    for (let D = 1; D < g; D++)
      E += ", " + e(B[D]);
    return E += "]", E;
  }
  const Q = /\[object ([^\]]+)\]/.exec(toString.call(B));
  let I;
  if (Q && Q.length > 1)
    I = Q[1];
  else
    return toString.call(B);
  if (I == "Object")
    try {
      return "Object(" + JSON.stringify(B) + ")";
    } catch {
      return "Object";
    }
  return B instanceof Error ? `${B.name}: ${B.message}
${B.stack}` : I;
}
function hA(B, A) {
  B = B >>> 0;
  const Q = c(), I = [];
  for (let g = B; g < B + 4 * A; g += 4)
    I.push(C.__wbindgen_externrefs.get(Q.getUint32(g, true)));
  return C.__externref_drop_slice(B, A), I;
}
function aA(B, A) {
  return B = B >>> 0, UA().subarray(B / 4, B / 4 + A);
}
function W(B, A) {
  return B = B >>> 0, b().subarray(B / 1, B / 1 + A);
}
function OA(B, A) {
  return B = B >>> 0, mA().subarray(B / 1, B / 1 + A);
}
let O = null;
function c() {
  return (O === null || O.buffer.detached === true || O.buffer.detached === void 0 && O.buffer !== C.memory.buffer) && (O = new DataView(C.memory.buffer)), O;
}
function M(B, A) {
  return HA(B >>> 0, A);
}
let V = null;
function UA() {
  return (V === null || V.byteLength === 0) && (V = new Uint32Array(C.memory.buffer)), V;
}
let L = null;
function b() {
  return (L === null || L.byteLength === 0) && (L = new Uint8Array(C.memory.buffer)), L;
}
let d = null;
function mA() {
  return (d === null || d.byteLength === 0) && (d = new Uint8ClampedArray(C.memory.buffer)), d;
}
function o(B, A) {
  try {
    return B.apply(this, A);
  } catch (Q) {
    const I = a(Q);
    C.__wbindgen_exn_store(I);
  }
}
function R(B) {
  return B == null;
}
function p(B, A, Q) {
  const I = { a: B, b: A, cnt: 1 }, g = (...E) => {
    I.cnt++;
    const D = I.a;
    I.a = 0;
    try {
      return Q(D, I.b, ...E);
    } finally {
      I.a = D, g._wbg_cb_unref();
    }
  };
  return g._wbg_cb_unref = () => {
    --I.cnt === 0 && (C.__wbindgen_destroy_closure(I.a, I.b), I.a = 0, NA.unregister(I));
  }, NA.register(g, I, I), g;
}
function lA(B, A) {
  const Q = A(B.length * 1, 1) >>> 0;
  return b().set(B, Q / 1), Y = B.length, Q;
}
function w(B, A, Q) {
  if (Q === void 0) {
    const G = S.encode(B), N = A(G.length, 1) >>> 0;
    return b().subarray(N, N + G.length).set(G), Y = G.length, N;
  }
  let I = B.length, g = A(I, 1) >>> 0;
  const E = b();
  let D = 0;
  for (; D < I; D++) {
    const G = B.charCodeAt(D);
    if (G > 127) break;
    E[g + D] = G;
  }
  if (D !== I) {
    D !== 0 && (B = B.slice(D)), g = Q(g, I, I = D + B.length * 3, 1) >>> 0;
    const G = b().subarray(g + D, g + I), N = S.encodeInto(B, G);
    D += N.written, g = Q(g, I, D, 1) >>> 0;
  }
  return Y = D, g;
}
function U(B) {
  const A = C.__wbindgen_externrefs.get(B);
  return C.__externref_table_dealloc(B), A;
}
let n = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
n.decode();
const pA = 2146435072;
let u = 0;
function HA(B, A) {
  return u += A, u >= pA && (n = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), n.decode(), u = A), n.decode(b().subarray(B, B + A));
}
const S = new TextEncoder();
"encodeInto" in S || (S.encodeInto = function(B, A) {
  const Q = S.encode(B);
  return A.set(Q), {
    read: B.length,
    written: Q.length
  };
});
let Y = 0, C;
function bA(B, A) {
  return C = B.exports, O = null, V = null, L = null, d = null, C.__wbindgen_start(), C;
}
async function sA(B, A) {
  if (typeof Response == "function" && B instanceof Response) {
    if (!B.ok)
      throw new Error(`failed to fetch Wasm: ${B.status} ${B.statusText} fetching '${B.url}'`);
    if (typeof WebAssembly.instantiateStreaming == "function")
      try {
        return await WebAssembly.instantiateStreaming(B, A);
      } catch (g) {
        if (Q(B.type) && B.headers.get("Content-Type") !== "application/wasm")
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", g);
        else
          throw g;
      }
    const I = await B.arrayBuffer();
    return await WebAssembly.instantiate(I, A);
  } else {
    const I = await WebAssembly.instantiate(B, A);
    return I instanceof WebAssembly.Instance ? { instance: I, module: B } : I;
  }
  function Q(I) {
    switch (I) {
      case "basic":
      case "cors":
      case "default":
        return true;
    }
    return false;
  }
}
async function WA(B) {
  if (C !== void 0) return C;
  B !== void 0 && (Object.getPrototypeOf(B) === Object.prototype ? { module_or_path: B } = B : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), B === void 0 && (B = kA);
  const A = MA();
  (typeof B == "string" || typeof Request == "function" && B instanceof Request || typeof URL == "function" && B instanceof URL) && (B = fetch(B));
  const { instance: Q, module: I } = await sA(await B, A);
  return bA(Q);
}
const vA = {
  /** General error, without a more specific reason. */
  GENERAL: 1,
  /** The proxy credential has expired. */
  EXPIRED: 100,
  /** The proxy credential is not valid yet. */
  NOT_YET_VALID: 101,
  /** The proxy credential has been revoked. */
  REVOKED: 102,
  /** The proxy could not connect to the target. */
  TARGET_UNREACHABLE: 103,
  /** The proxy could not resolve the target host name. */
  DNS_RESOLUTION_FAILED: 104,
  /** The TLS handshake between the proxy and the target failed. */
  TLS_HANDSHAKE_FAILED: 105
}, X = {
  /**
   * Request file size (8-byte unsigned integer).
   * When set: position must be 0, size must be 8.
   */
  SIZE: 1,
  /**
   * Request byte range from file.
   * When set: position and size define the requested range.
   */
  RANGE: 2
};
function XA(B) {
  return new k("files_available_callback", B);
}
function VA(B) {
  return new k("file_contents_request_callback", B);
}
function LA(B) {
  return new k("file_contents_response_callback", B);
}
function dA(B) {
  return new k("lock_callback", B);
}
function SA(B) {
  return new k("unlock_callback", B);
}
function KA(B) {
  return new k("locks_expired_callback", B);
}
function zA(B) {
  return new k("format_list_response_callback", B);
}
const uA = {
  PostScript: "MS Publisher Imagesetter",
  MicrosoftPrintToPdf: "Microsoft Print to PDF"
};
function eA(B) {
  return new k("print_job_stream_callbacks", B);
}
function rA(B) {
  return new k("printer_name", B);
}
function _A(B) {
  return new k("printer_device_id", B);
}
function $A(B) {
  return new k("printer_driver_name", B);
}
function qA(B) {
  return new k("request_file_contents", B);
}
function TA(B) {
  return new k("submit_file_contents", B);
}
function xA(B) {
  return new k("initiate_file_copy", B);
}
class nA {
  constructor() {
    __publicField(this, "chunks", []);
    __publicField(this, "_bytesWritten", 0);
    __publicField(this, "finalized", false);
  }
  get bytesWritten() {
    return this._bytesWritten;
  }
  async write(A) {
    if (this.finalized)
      throw new Error("BlobWriteHandle: write after finalize/abort");
    this.chunks.push(A), this._bytesWritten += A.length;
  }
  async finalize() {
    if (this.finalized)
      throw new Error("BlobWriteHandle: already finalized or aborted");
    this.finalized = true;
    const A = new Blob(this.chunks);
    return this.chunks = [], A;
  }
  async abort() {
    this.finalized || (this.finalized = true, this.chunks = []);
  }
}
class oA {
  constructor() {
    __publicField(this, "name", "blob");
  }
  async createWriteHandle(A, Q) {
    return new nA();
  }
  async dispose() {
  }
}
class fA {
  constructor(A, Q, I, g) {
    __publicField(this, "writable");
    __publicField(this, "_bytesWritten", 0);
    __publicField(this, "finalized", false);
    this.fileHandle = A, this.sessionDir = Q, this.entryName = I, this.writable = g;
  }
  get bytesWritten() {
    return this._bytesWritten;
  }
  async write(A) {
    if (this.finalized || !this.writable)
      throw new Error("OpfsWriteHandle: write after finalize/abort");
    await this.writable.write(A), this._bytesWritten += A.length;
  }
  async finalize() {
    if (this.finalized)
      throw new Error("OpfsWriteHandle: already finalized or aborted");
    return this.finalized = true, this.writable && (await this.writable.close(), this.writable = void 0), this.fileHandle.getFile();
  }
  async abort() {
    if (!this.finalized) {
      if (this.finalized = true, this.writable) {
        try {
          await this.writable.abort();
        } catch {
        }
        this.writable = void 0;
      }
      try {
        await this.sessionDir.removeEntry(this.entryName);
      } catch {
      }
    }
  }
}
const _s = class _s {
  constructor(A, Q, I) {
    __publicField(this, "name", "opfs");
    /** Sequence counter for generating unique temp file names. */
    __publicField(this, "sequence", 0);
    this.opfsRoot = A, this.sessionDir = Q, this.sessionId = I;
  }
  /**
   * Create an OPFS backend, including the per-session directory.
   *
   * Call {@link probe} first to verify OPFS is available before
   * constructing -- this factory assumes OPFS works.
   */
  static async create(A, Q) {
    const I = Q ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, g = await A.getDirectoryHandle("ironrdp-transfers", { create: true }), E = await g.getDirectoryHandle(I, { create: true });
    return _s.cleanupStale(g, I), new _s(A, E, I);
  }
  // 24 hours
  /**
   * Remove session directories older than {@link STALE_SESSION_THRESHOLD_MS}.
   *
   * Session IDs generated by {@link create} embed a timestamp in the
   * format `s-{Date.now()}-{random}`.  This method parses that timestamp
   * to determine age.  Directories with unparsable names or those
   * belonging to the current session are skipped.
   */
  static async cleanupStale(A, Q) {
    const I = Date.now();
    try {
      for await (const g of A.keys()) {
        if (g === Q)
          continue;
        const E = /^s-(\d+)-/.exec(g);
        if (!E)
          continue;
        const D = Number(E[1]);
        if (I - D > _s.STALE_SESSION_THRESHOLD_MS)
          try {
            await A.removeEntry(g, { recursive: true });
          } catch {
          }
      }
    } catch {
    }
  }
  /**
   * Probe whether OPFS is usable in the current context.
   *
   * Performs a full round-trip: creates a temp file, opens a writable,
   * closes it, and deletes it.  This catches environments where the API
   * exists but throws at runtime (e.g., some private browsing modes).
   */
  static async probe(A) {
    try {
      return await (await (await A.getFileHandle(".ironrdp-opfs-probe", { create: true })).createWritable()).close(), await A.removeEntry(".ironrdp-opfs-probe"), true;
    } catch {
      return false;
    }
  }
  async createWriteHandle(A, Q) {
    if (!this.sessionDir)
      throw new Error("OpfsStorageBackend: backend has been disposed");
    const g = `${this.sequence++}-${tA(A)}`, E = await this.sessionDir.getFileHandle(g, { create: true }), D = await E.createWritable();
    return new fA(E, this.sessionDir, g, D);
  }
  async dispose() {
    if (!this.sessionDir)
      return;
    const A = this.sessionDir;
    this.sessionDir = void 0;
    try {
      const Q = await this.opfsRoot.getDirectoryHandle("ironrdp-transfers");
      await Q.removeEntry(this.sessionId, { recursive: true });
      let I = false;
      for await (const g of Q.values()) {
        I = true;
        break;
      }
      I || await this.opfsRoot.removeEntry("ironrdp-transfers");
    } catch (Q) {
      console.debug("OPFS session directory removal failed, falling back to per-file cleanup:", Q);
      try {
        for await (const I of A.keys())
          try {
            await A.removeEntry(I);
          } catch {
          }
      } catch {
      }
    }
  }
};
/** Maximum age (in milliseconds) before a session directory is considered stale. */
__publicField(_s, "STALE_SESSION_THRESHOLD_MS", 1440 * 60 * 1e3);
let s = _s;
function tA(B) {
  let A = B.replace(/[\u0000-\u001f]/g, "");
  A = A.replace(/[/\\]/g, "_"), A = A.replace(/^\.+/, ""), A.length === 0 && (A = "unnamed");
  const Q = new TextEncoder();
  if (Q.encode(A).byteLength > 200) {
    for (; Q.encode(A).byteLength > 200; )
      A = A.slice(0, -1);
    A.length === 0 && (A = "unnamed");
  }
  return A;
}
async function PA(B = "auto", A) {
  var _a, _b;
  if (B === "blob")
    return new oA();
  if (typeof ((_b = (_a = globalThis.navigator) == null ? void 0 : _a.storage) == null ? void 0 : _b.getDirectory) == "function")
    try {
      const Q = await navigator.storage.getDirectory();
      if (await s.probe(Q))
        return s.create(Q, A);
      console.debug("OPFS probe failed (createWritable not functional), falling back to blob storage");
    } catch (Q) {
      console.debug("OPFS unavailable, falling back to blob storage:", Q);
    }
  return new oA();
}
const _Z = class _Z {
  constructor(A) {
    __publicField(this, "session");
    __publicField(this, "chunkSize");
    __publicField(this, "onUploadStarted");
    __publicField(this, "onUploadFinished");
    __publicField(this, "storagePreference");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __publicField(this, "eventHandlers", /* @__PURE__ */ new Map());
    __publicField(this, "storageBackend");
    __publicField(this, "storageBackendReady");
    __publicField(this, "activeDownloads", /* @__PURE__ */ new Map());
    __publicField(this, "uploadState");
    // Upload paste-window watchdog. Armed when we advertise an upload, disarmed on the
    // first FileContentsRequest (the remote pulled the files). Being armed is the single
    // "advertised but not yet pulled" signal: on timeout it resumes monitoring and fails
    // the never-pulled upload, and handleFormatListResponse consults it to fail a refused
    // paste early (handleUnlock is a deliberate no-op: Unlock is not a reliable failure
    // signal). Upload completion/failure run only after that first request, so they need
    // not touch it.
    __publicField(this, "pasteAckTimeout");
    // Upload inactivity watchdog. Armed/reset on each FileContentsRequest once the remote
    // starts pulling; fires if pulls stop for UPLOAD_INACTIVITY_TIMEOUT_MS (a stalled or
    // clipboard-superseded paste) to release uploadState. Complements the paste-ack
    // watchdog above, which only covers the "advertised but never pulled" case.
    __publicField(this, "uploadInactivityTimeout");
    // True between onUploadStarted (suppress monitoring) and onUploadFinished
    // (resume), so resume fires exactly once even though it is now deferred until
    // the paste is pulled, times out, fails, or the provider is disposed.
    __publicField(this, "uploadMonitoringSuppressed", false);
    // DroppedFile metadata retained after upload completes so re-paste works
    // without re-dropping. Cleared when a new upload starts or the manager is disposed.
    __publicField(this, "retainedFiles");
    __publicField(this, "availableFiles", []);
    // Clipboard lock ID received with the most recent file list. The Rust layer
    // acquires this lock automatically when FileGroupDescriptorW is detected in
    // the FormatList. Downloads use it instead of explicit lock/unlock calls -
    // the lock lifecycle is managed entirely by the Rust cliprdr processor.
    __publicField(this, "clipDataId");
    __publicField(this, "nextStreamId", 1);
    __publicField(this, "disposed", false);
    this.chunkSize = (A == null ? void 0 : A.chunkSize) ?? 65536, this.onUploadStarted = A == null ? void 0 : A.onUploadStarted, this.onUploadFinished = A == null ? void 0 : A.onUploadFinished;
    const Q = A == null ? void 0 : A.storageBackend;
    if (typeof Q == "object" && Q !== null) {
      if (typeof Q.createWriteHandle != "function" || typeof Q.dispose != "function")
        throw new Error(
          "storageBackend: expected 'auto', 'blob', or a FileStorageBackend with createWriteHandle() and dispose() methods"
        );
      this.storageBackend = Q, this.storagePreference = "auto";
    } else {
      const I = Q ?? "auto";
      if (I !== "auto" && I !== "blob")
        throw new Error(
          `storageBackend: invalid preference '${I}', expected 'auto', 'blob', or a FileStorageBackend instance`
        );
      this.storagePreference = I;
    }
  }
  /**
   * Set the session instance after connection is established.
   * Called by the web component's connect() flow via the FileTransferProvider interface.
   */
  setSession(A) {
    this.session = A;
  }
  ensureSession() {
    if (this.session === void 0)
      throw new Error("RdpFileTransferProvider: Session not available. Ensure connect() has been called.");
    return this.session;
  }
  /**
   * Lazily initialize and return the storage backend.
   *
   * Detection is performed once and cached.  Concurrent callers share
   * the same initialization promise so the probe only runs once.
   * If detection fails the cached promise is cleared so subsequent
   * downloads can retry.
   */
  async ensureStorageBackend() {
    return this.storageBackend ? this.storageBackend : (this.storageBackendReady || (this.storageBackendReady = PA(this.storagePreference).then((A) => (this.storageBackend = A, console.debug(`File transfer storage: ${A.name}`), A)).catch((A) => {
      throw this.storageBackendReady = void 0, A;
    })), this.storageBackendReady);
  }
  // --- Extension-based session method wrappers ---
  // These replace direct session.requestFileContents() etc. calls
  // with invokeExtension() to keep the Session interface protocol-agnostic.
  sendRequestFileContents(A, Q, I, g, E, D) {
    this.ensureSession().invokeExtension(
      qA({
        stream_id: A,
        file_index: Q,
        flags: I,
        position: g,
        size: E,
        clip_data_id: D
      })
    );
  }
  sendSubmitFileContents(A, Q, I) {
    var _a;
    (_a = this.session) == null ? void 0 : _a.invokeExtension(TA({ stream_id: A, is_error: Q, data: I }));
  }
  sendInitiateFileCopy(A) {
    this.ensureSession().invokeExtension(xA(A));
  }
  /**
   * Returns the extension objects to register on the SessionBuilder before connect().
   * Implements the FileTransferProvider interface.
   */
  getBuilderExtensions() {
    return [
      XA(
        (A, Q) => this.handleFilesAvailable(A, Q)
      ),
      VA((A) => this.handleFileContentsRequest(A)),
      LA((A) => this.handleFileContentsResponse(A)),
      dA((A) => this.handleLock(A)),
      SA((A) => this.handleUnlock(A)),
      KA((A) => this.handleLocksExpired(A)),
      zA((A) => this.handleFormatListResponse(A))
    ];
  }
  /**
   * Register an event handler.
   *
   * @param event - Event name
   * @param handler - Event handler function
   *
   * @example
   * ```typescript
   * manager.on('download-progress', (progress) => {
   *   console.log(`${progress.fileName}: ${progress.percentage}%`);
   * });
   * ```
   */
  on(A, Q) {
    this.eventHandlers.has(A) || this.eventHandlers.set(A, /* @__PURE__ */ new Set()), this.eventHandlers.get(A).add(Q);
  }
  /**
   * Unregister an event handler.
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off(A, Q) {
    const I = this.eventHandlers.get(A);
    I && I.delete(Q);
  }
  /**
   * Emit an event to all registered handlers.
   */
  emit(A, ...Q) {
    const I = this.eventHandlers.get(A);
    if (I)
      for (const g of I)
        try {
          g(...Q);
        } catch (E) {
          console.error(`Error in ${A} handler:`, E);
        }
  }
  /**
   * Download a single file from the remote.
   *
   * Returns a {@link DownloadHandle} with a `transferId` available synchronously
   * (for immediate UI association) and a `completion` promise that resolves with
   * the downloaded blob.
   *
   * @param fileInfo - File metadata from 'files-available' event
   * @param fileIndex - Index of the file in the original file list
   * @returns Handle with synchronous transferId and async completion
   *
   * @example
   * ```typescript
   * const { transferId, completion } = manager.downloadFile(fileInfo, 0);
   * // transferId is available immediately for UI binding
   * const blob = await completion;
   * saveAs(blob, fileInfo.name);
   * ```
   */
  downloadFile(A, Q) {
    const I = this.generateStreamId(), g = this.executeDownload(A, Q, I);
    return { transferId: I, completion: g };
  }
  /**
   * Internal: execute the async download workflow for a single file.
   */
  async executeDownload(A, Q, I) {
    const g = this.clipDataId, E = new Promise((D, G) => {
      const N = {
        fileInfo: A,
        fileIndex: Q,
        streamId: I,
        clipDataId: g,
        bytesReceived: 0,
        resolve: D,
        reject: G
      };
      this.activeDownloads.set(I, N);
    });
    try {
      this.sendRequestFileContents(I, Q, X.SIZE, 0, 8, g);
    } catch (D) {
      this.activeDownloads.delete(I);
      const G = {
        message: "Failed to request file size",
        transferId: I,
        fileIndex: Q,
        fileName: A.name,
        direction: "download",
        cause: D
      };
      throw this.emit("error", G), new Error(G.message, { cause: D });
    }
    return E;
  }
  /**
   * Download multiple files sequentially.
   *
   * @param files - Array of FileInfo from 'files-available' event
   * @returns AsyncGenerator yielding file/blob pairs as they complete
   *
   * @example
   * ```typescript
   * for await (const { file, blob } of manager.downloadFiles(files)) {
   *   saveAs(blob, file.name);
   * }
   * ```
   */
  async *downloadFiles(A) {
    for (let Q = 0; Q < A.length; Q++) {
      const I = A[Q], { transferId: g, completion: E } = this.downloadFile(I, Q), D = await E;
      yield { file: I, blob: D, transferId: g };
    }
  }
  /**
   * Download multiple files concurrently with configurable parallelism.
   *
   * This method initiates multiple file downloads in parallel, improving
   * performance for multi-file transfers. Each file uses an independent
   * clipboard lock and stream ID.
   *
   * @param files - Array of FileInfo from 'files-available' event
   * @param options - Download options
   * @param options.maxConcurrent - Maximum concurrent downloads (default: 3)
   * @returns Promise resolving to map of fileIndex to Blob
   *
   * @example
   * ```typescript
   * const blobs = await manager.downloadFilesConcurrent(files, { maxConcurrent: 5 });
   * files.forEach((file, i) => saveAs(blobs.get(i)!, file.name));
   * ```
   */
  async downloadFilesConcurrent(A, Q = {}) {
    const I = Q.maxConcurrent ?? 3, g = /* @__PURE__ */ new Map(), E = [], D = A.map((N, i) => async () => {
      try {
        const { completion: h } = this.downloadFile(N, i), y = await h;
        g.set(i, y);
      } catch (h) {
        E.push({ index: i, error: h });
      }
    }), G = [];
    for (const N of D) {
      const i = N().finally(() => {
        G.splice(G.indexOf(i), 1);
      });
      G.push(i), G.length >= I && await Promise.race(G);
    }
    if (await Promise.all(G), E.length > 0)
      throw new Error(
        `Failed to download ${E.length} file(s): ` + E.map((N) => `file ${N.index}: ${N.error}`).join(", ")
      );
    return g;
  }
  /**
   * Upload files to the remote.
   *
   * Returns an {@link UploadHandle} with per-file `transferIds` available
   * synchronously (for immediate UI association) and a `completion` promise
   * that resolves when all files have been uploaded.
   *
   * @param files - Array of File objects to upload
   * @returns Handle with synchronous transferIds and async completion
   *
   * @example
   * ```typescript
   * const files = await manager.showFilePicker({ multiple: true });
   * const { transferIds, completion } = manager.uploadFiles(files);
   * // transferIds available immediately for UI binding
   * await completion;
   * ```
   */
  uploadFiles(A) {
    this.uploadState !== void 0 && this.supersedeUpload(), this.retainedFiles = void 0;
    const Q = _Z.normalizeToDroppedFiles(A), I = /* @__PURE__ */ new Map();
    for (let N = 0; N < Q.length; N++)
      I.set(N, this.generateStreamId());
    const g = Q.map((N) => ({
      name: N.name,
      size: N.size,
      lastModified: N.lastModified,
      path: N.path,
      isDirectory: N.isDirectory
    })), E = Q.filter((N) => N.isDirectory !== true).length, D = Q.map((N) => N.file), G = new Promise((N, i) => {
      this.uploadState = {
        files: D,
        droppedFiles: Q,
        failedFiles: /* @__PURE__ */ new Set(),
        expectedFileCount: E,
        completedFiles: /* @__PURE__ */ new Set(),
        bytesServed: /* @__PURE__ */ new Map(),
        activeReaders: /* @__PURE__ */ new Map(),
        readerTimeouts: /* @__PURE__ */ new Map(),
        transferIds: I,
        resolve: N,
        reject: i
      }, this.suppressUploadMonitoring();
      try {
        this.sendInitiateFileCopy(g), this.emit("upload-batch-started", I, Q);
      } catch (h) {
        this.uploadState = void 0, this.resumeUploadMonitoring();
        const y = {
          message: "Failed to initiate file upload",
          direction: "upload",
          cause: h
        };
        this.emit("error", y), i(new Error(y.message, { cause: h }));
        return;
      }
      this.armPasteAckWatchdog();
    });
    return { transferIds: I, completion: G };
  }
  /** Whether an upload batch is currently advertised or in flight (a fresh upload, or a re-paste
   *  rebuilt from retained files). */
  isUploadInProgress() {
    return this.uploadState !== void 0;
  }
  /** Suppress clipboard monitoring for an upload's paste window. Idempotent: a supersede keeps
   *  monitoring suppressed across the old->new upload, so this must not re-fire `onUploadStarted`. */
  suppressUploadMonitoring() {
    var _a;
    if (!this.uploadMonitoringSuppressed) {
      this.uploadMonitoringSuppressed = true;
      try {
        (_a = this.onUploadStarted) == null ? void 0 : _a.call(this);
      } catch (A) {
        console.error("Error in onUploadStarted callback:", A);
      }
    }
  }
  /** Resume clipboard monitoring (idempotent: fires onUploadFinished at most once
   *  per upload, since the resume point is now deferred past the wire send). */
  resumeUploadMonitoring() {
    var _a;
    if (this.uploadMonitoringSuppressed) {
      this.uploadMonitoringSuppressed = false;
      try {
        (_a = this.onUploadFinished) == null ? void 0 : _a.call(this);
      } catch (A) {
        console.error("Error in onUploadFinished callback:", A);
      }
    }
  }
  /** Arm the paste-acknowledgment watchdog for the current upload. */
  armPasteAckWatchdog() {
    this.clearPasteAckWatchdog(), this.clearUploadInactivityWatchdog(), this.pasteAckTimeout = setTimeout(() => {
      this.pasteAckTimeout = void 0;
      const A = this.uploadState;
      A !== void 0 && A.isRePaste !== true ? this.failPendingUpload("The remote did not request the files in time, so the paste was not completed") : this.resumeUploadMonitoring();
    }, _Z.PASTE_ACK_TIMEOUT_MS);
  }
  /** Disarm the paste-acknowledgment watchdog, if armed. */
  clearPasteAckWatchdog() {
    this.pasteAckTimeout !== void 0 && (clearTimeout(this.pasteAckTimeout), this.pasteAckTimeout = void 0);
  }
  /**
   * (Re)arm the upload inactivity watchdog (see {@link UPLOAD_INACTIVITY_TIMEOUT_MS}).
   * Called on every FileContentsRequest, so continued pulls keep resetting it and a
   * slow-but-progressing transfer is never killed; if pulls stop for the window the
   * upload is failed (releasing uploadState). Skipped for re-pastes, matching the
   * paste-ack watchdog.
   */
  resetUploadInactivityWatchdog() {
    this.clearUploadInactivityWatchdog(), this.uploadInactivityTimeout = setTimeout(() => {
      this.uploadInactivityTimeout = void 0;
      const A = this.uploadState;
      A !== void 0 && A.isRePaste !== true && this.failPendingUpload("The remote stopped requesting the files, so the paste did not complete");
    }, _Z.UPLOAD_INACTIVITY_TIMEOUT_MS);
  }
  /** Disarm the upload inactivity watchdog, if armed. */
  clearUploadInactivityWatchdog() {
    this.uploadInactivityTimeout !== void 0 && (clearTimeout(this.uploadInactivityTimeout), this.uploadInactivityTimeout = void 0);
  }
  /**
   * The remote acknowledged the paste by requesting file contents: the clobber
   * window is over, so disarm the paste-ack watchdog and resume clipboard monitoring.
   * Called on every FileContentsRequest; only the first disarms/resumes. Every request
   * also (re)arms the inactivity watchdog so a stall after pulling began is recovered.
   */
  acknowledgePaste() {
    this.pasteAckTimeout !== void 0 && (this.clearPasteAckWatchdog(), this.resumeUploadMonitoring());
    const A = this.uploadState;
    if (A !== void 0 && A.isRePaste !== true && A.expectedFileCount === 0) {
      this.finishUploadBatch(A);
      return;
    }
    this.resetUploadInactivityWatchdog();
  }
  /**
   * Abort any in-flight chunk reads for a batch and clear their timeouts. Without this, a read
   * still running when the batch is torn down keeps its FileReader and a 60s reader-timeout
   * alive. Shared by every upload teardown path (fail, supersede, dispose).
   */
  abortInFlightReads(A) {
    for (const Q of A.readerTimeouts.values())
      clearTimeout(Q);
    A.readerTimeouts.clear();
    for (const Q of A.activeReaders.values())
      Q.abort();
    A.activeReaders.clear();
  }
  /**
   * Fail the in-flight upload (reject its completion, emit an upload error, clear
   * uploadState) and resume monitoring. Used when the advertise is rejected or the
   * paste is never pulled, so `uploadState` is released instead of lingering and
   * throwing "Upload already in progress" on every later upload.
   */
  failPendingUpload(A) {
    this.clearPasteAckWatchdog(), this.clearUploadInactivityWatchdog(), this.resumeUploadMonitoring();
    const Q = this.uploadState;
    if (Q === void 0)
      return;
    this.abortInFlightReads(Q);
    const I = { message: A, direction: "upload" };
    this.emit("error", I);
    const { reject: g } = Q;
    this.uploadState = void 0, g(new Error(A));
  }
  /**
   * Tear down the current upload because a new paste is replacing it. Unlike
   * {@link failPendingUpload}, this emits no error and leaves monitoring suppressed (a new upload
   * is starting); it aborts in-flight reads, clears the state, and *resolves* the old completion
   * (a replacement, not a failure).
   */
  supersedeUpload() {
    this.clearPasteAckWatchdog(), this.clearUploadInactivityWatchdog();
    const A = this.uploadState;
    if (A === void 0)
      return;
    this.abortInFlightReads(A);
    const { resolve: Q } = A;
    this.uploadState = void 0, Q();
  }
  /**
   * Finalize a fully-accounted upload batch (every counted file either served in full
   * or permanently failed). Stops the inactivity watchdog so it cannot linger past
   * completion, retains the DroppedFile metadata so a re-paste from the remote can serve
   * the data again, clears `uploadState`, and resolves the completion promise.
   */
  finishUploadBatch(A) {
    this.clearUploadInactivityWatchdog(), this.retainedFiles = A.droppedFiles, this.uploadState = void 0, A.resolve();
  }
  /**
   * Show a file picker dialog and return selected files.
   *
   * Note: This must be called in response to a user gesture (e.g., button click)
   * due to browser security restrictions.
   *
   * @param options - File picker options
   * @returns Promise resolving to selected File objects
   *
   * @example
   * ```typescript
   * button.onclick = async () => {
   *   const files = await manager.showFilePicker({ multiple: true, accept: 'image/*' });
   *   await manager.uploadFiles(files);
   * };
   * ```
   */
  showFilePicker(A) {
    return new Promise((Q) => {
      const I = document.createElement("input");
      I.type = "file", I.style.display = "none", (A == null ? void 0 : A.multiple) === true && (I.multiple = true), (A == null ? void 0 : A.accept) !== void 0 && A.accept.length > 0 && (I.accept = A.accept), I.addEventListener("change", () => {
        const G = Array.from(I.files || []);
        E(), window.removeEventListener("focus", D), Q(G);
      });
      let g = false;
      const E = () => {
        g || (g = true, I.parentNode && document.body.removeChild(I));
      };
      I.addEventListener("cancel", () => {
        E(), window.removeEventListener("focus", D), Q([]);
      });
      const D = () => {
        setTimeout(() => {
          g || (E(), Q([])), window.removeEventListener("focus", D);
        }, 300);
      };
      window.addEventListener("focus", D), document.body.appendChild(I), I.click();
    });
  }
  /**
   * Extract files (and recursively traverse directories) from a drag-and-drop event.
   *
   * Uses the File and Directory Entries API (`webkitGetAsEntry`) which is
   * supported across all major browsers (Chrome, Firefox, Safari, Edge).
   * Falls back to `getAsFile()` when the Entries API is unavailable.
   *
   * Directory entries are included in the result with `isDirectory: true`
   * and a `null` file handle.  Files inside directories have their
   * {@link DroppedFile.path} set to the relative backslash-separated path.
   *
   * @param event - DragEvent from drop handler
   * @returns Promise resolving to an array of DroppedFile descriptors
   *
   * @example
   * ```typescript
   * dropZone.addEventListener('drop', async (e) => {
   *   const files = await manager.handleDrop(e);
   *   manager.uploadFiles(files);
   * });
   * ```
   */
  async handleDrop(A) {
    var _a, _b, _c;
    A.preventDefault();
    const Q = [];
    if ((_a = A.dataTransfer) == null ? void 0 : _a.items) {
      const I = [], g = [];
      for (const E of A.dataTransfer.items) {
        if (E.kind !== "file") continue;
        const D = (_b = E.webkitGetAsEntry) == null ? void 0 : _b.call(E);
        if (D)
          I.push(D);
        else {
          const G = E.getAsFile();
          G && g.push(G);
        }
      }
      for (const E of I)
        await this.traverseEntry(E, void 0, Q, 0);
      for (const E of g)
        Q.push({
          file: E,
          name: E.name,
          size: E.size,
          lastModified: E.lastModified
        });
    } else if ((_c = A.dataTransfer) == null ? void 0 : _c.files)
      for (const I of Array.from(A.dataTransfer.files))
        Q.push({
          file: I,
          name: I.name,
          size: I.size,
          lastModified: I.lastModified
        });
    return Q;
  }
  /**
   * Normalize a plain `File[]` or `DroppedFile[]` into `DroppedFile[]`.
   * Allows `uploadFiles` to accept either type for backward compatibility.
   */
  static normalizeToDroppedFiles(A) {
    return A.length === 0 ? [] : "file" in A[0] ? A : A.map((I) => ({
      file: I,
      name: I.name,
      size: I.size,
      lastModified: I.lastModified
    }));
  }
  /**
   * Recursively traverse a FileSystemEntry, collecting files and directory
   * entries into `results`.
   */
  async traverseEntry(A, Q, I, g) {
    if (!(I.length >= _Z.MAX_DIRECTORY_ENTRIES)) {
      if (g > _Z.MAX_DIRECTORY_DEPTH) {
        console.warn(
          `Skipping "${A.name}": directory depth exceeds ${_Z.MAX_DIRECTORY_DEPTH}`
        );
        return;
      }
      if (A.isFile) {
        const E = await new Promise((D, G) => {
          A.file(D, G);
        });
        I.push({
          file: E,
          name: E.name,
          size: E.size,
          lastModified: E.lastModified,
          path: Q
        });
      } else if (A.isDirectory) {
        const E = Q !== void 0 ? `${Q}\\${A.name}` : A.name;
        I.push({
          file: null,
          name: A.name,
          size: 0,
          lastModified: 0,
          path: Q,
          isDirectory: true
        });
        const D = A.createReader(), G = await _Z.readAllDirectoryEntries(D);
        for (const N of G)
          await this.traverseEntry(N, E, I, g + 1);
      }
    }
  }
  /**
   * Read all entries from a FileSystemDirectoryReader.  Chromium-based
   * browsers return at most 100 entries per `readEntries()` call, so we
   * must loop until an empty batch is returned.
   */
  static readAllDirectoryEntries(A) {
    return new Promise((Q, I) => {
      const g = [], E = () => {
        A.readEntries((D) => {
          D.length === 0 ? Q(g) : (g.push(...D), E());
        }, I);
      };
      E();
    });
  }
  /**
   * Prevent default drag-over behavior to enable drop target.
   *
   * This must be called in the dragover event handler for drag-and-drop to work.
   *
   * @param event - DragEvent from dragover handler
   *
   * @example
   * ```typescript
   * dropZone.addEventListener('dragover', (e) => manager.handleDragOver(e));
   * ```
   */
  handleDragOver(A) {
    A.preventDefault();
  }
  /**
   * Cleanup resources and unregister callbacks.
   *
   * Call this when the session is terminating or RdpFileTransferProvider is no longer needed.
   */
  dispose() {
    this.disposed = true, this.clearPasteAckWatchdog(), this.clearUploadInactivityWatchdog(), this.resumeUploadMonitoring();
    for (const A of this.activeDownloads.values())
      this.abortWriteHandle(A), A.reject(new Error("RdpFileTransferProvider disposed"));
    this.activeDownloads.clear(), this.uploadState !== void 0 && (this.abortInFlightReads(this.uploadState), this.uploadState.reject(new Error("RdpFileTransferProvider disposed"))), this.uploadState = void 0, this.retainedFiles = void 0, this.availableFiles = [], this.clipDataId = void 0, this.storageBackend && (this.storageBackend.dispose(), this.storageBackend = void 0, this.storageBackendReady = void 0), this.eventHandlers.clear();
  }
  // ==================== Callback Handlers ====================
  handleFilesAvailable(A, Q) {
    this.failPendingUpload("Upload interrupted: the remote clipboard changed");
    const I = A.map((g) => ({
      ...g,
      name: _Z.sanitizeFileName(g.name),
      path: g.path !== void 0 ? _Z.sanitizePath(g.path) : void 0
    }));
    this.availableFiles = I, this.clipDataId = Q, this.emit("files-available", I);
  }
  /**
   * Extract the basename from a file name, stripping any path traversal or
   * directory components. Returns "unnamed_file" if the name is empty or
   * consists entirely of path separators / traversal sequences.
   */
  /** @internal Visible for testing. */
  static sanitizeFileName(A) {
    const Q = A.split(/[/\\]/);
    for (let I = Q.length - 1; I >= 0; I--) {
      const g = Q[I];
      if (g.length > 0 && g !== "." && g !== "..")
        return g;
    }
    return "unnamed_file";
  }
  /**
   * Sanitize a relative directory path by stripping traversal components
   * (`.` and `..`) and absolute path prefixes. Returns undefined if the
   * path is empty after sanitization.
   */
  /** @internal Visible for testing. */
  static sanitizePath(A) {
    const I = A.split(/[/\\]/).filter((g) => g.length > 0 && g !== "." && g !== "..");
    if (I.length > 0 && (I[0] === "?" || I[0] === ".") && (I.shift(), I.length > 0 && /^[A-Za-z]:$/.test(I[0]) && I.shift()), I.length > 0 && /^[A-Za-z]:$/.test(I[0]) && I.shift(), I.length !== 0)
      return I.join("\\");
  }
  handleFileContentsRequest(A) {
    if (this.acknowledgePaste(), !this.uploadState) {
      if (!this.retainedFiles) {
        console.warn("Received file contents request but no upload in progress"), this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
        return;
      }
      this.rebuildUploadStateFromRetained();
    }
    const Q = this.uploadState, { files: I, droppedFiles: g } = Q;
    if (Q.failedFiles.has(A.index)) {
      this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    const E = I[A.index], D = g[A.index];
    if (D === void 0) {
      console.error(
        `File index ${A.index} out of range (stream ${A.streamId}, valid: 0..${g.length - 1})`
      ), this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    if (E == null) {
      if ((A.flags & X.SIZE) !== 0) {
        const N = new Uint8Array(8);
        this.sendSubmitFileContents(A.streamId, false, N);
      } else
        this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    const G = E;
    if ((A.flags & X.SIZE) !== 0) {
      const N = new Uint8Array(8);
      new DataView(N.buffer).setBigUint64(0, BigInt(G.size), true), this.sendSubmitFileContents(A.streamId, false, N), G.size === 0 && this.markUploadFileComplete(A.index, G, Q.transferIds.get(A.index) ?? -1);
    } else if ((A.flags & X.RANGE) !== 0) {
      const N = G.slice(A.position, A.position + A.size), i = new FileReader();
      Q.activeReaders.set(A.streamId, i);
      const h = setTimeout(() => {
        var _a;
        i.abort(), this.uploadState !== void 0 && (this.uploadState.activeReaders.delete(A.streamId), this.uploadState.readerTimeouts.delete(A.streamId)), this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
        const y = {
          message: `File read timeout after ${_Z.FILE_READER_TIMEOUT_MS / 1e3}s`,
          transferId: (_a = this.uploadState) == null ? void 0 : _a.transferIds.get(A.index),
          fileIndex: A.index,
          fileName: D.name,
          direction: "upload"
        };
        this.emit("error", y), this.uploadState !== void 0 && (this.uploadState.failedFiles.add(A.index), this.uploadState.completedFiles.add(A.index), this.uploadState.completedFiles.size >= this.uploadState.expectedFileCount && this.finishUploadBatch(this.uploadState));
      }, _Z.FILE_READER_TIMEOUT_MS);
      Q.readerTimeouts.set(A.streamId, h), i.onload = () => {
        if (this.uploadState !== void 0) {
          this.uploadState.activeReaders.delete(A.streamId);
          const j = this.uploadState.readerTimeouts.get(A.streamId);
          j !== void 0 && (clearTimeout(j), this.uploadState.readerTimeouts.delete(A.streamId));
        }
        const y = new Uint8Array(i.result);
        if (this.sendSubmitFileContents(A.streamId, false, y), this.uploadState !== void 0) {
          const j = (this.uploadState.bytesServed.get(A.index) ?? 0) + y.length;
          this.uploadState.bytesServed.set(A.index, j);
          const r = this.uploadState.transferIds.get(A.index) ?? -1, YA = {
            transferId: r,
            fileIndex: A.index,
            fileName: D.name,
            bytesTransferred: j,
            totalBytes: G.size,
            percentage: G.size === 0 ? 100 : Math.min(j / G.size * 100, 100)
          };
          this.emit("upload-progress", YA), j >= G.size && this.markUploadFileComplete(A.index, G, r);
        }
      }, i.onerror = () => {
        var _a, _b;
        if (this.uploadState !== void 0) {
          this.uploadState.activeReaders.delete(A.streamId);
          const j = this.uploadState.readerTimeouts.get(A.streamId);
          j !== void 0 && (clearTimeout(j), this.uploadState.readerTimeouts.delete(A.streamId));
        }
        if (((_a = this.uploadState) == null ? void 0 : _a.failedFiles.has(A.index)) === true)
          return;
        this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
        const y = {
          message: "Failed to read file chunk",
          transferId: (_b = this.uploadState) == null ? void 0 : _b.transferIds.get(A.index),
          fileIndex: A.index,
          fileName: D.name,
          direction: "upload",
          cause: i.error
        };
        this.emit("error", y), this.uploadState !== void 0 && (this.uploadState.failedFiles.add(A.index), this.uploadState.completedFiles.add(A.index), this.uploadState.completedFiles.size >= this.uploadState.expectedFileCount && this.finishUploadBatch(this.uploadState));
      }, i.readAsArrayBuffer(N);
    }
  }
  /**
   * Mark a single upload file as fully served: record it, emit upload-complete once, and
   * finalize the batch once every counted file is accounted for. Shared by the RANGE onload
   * path (final chunk served) and the SIZE path for 0-byte files (which get no RANGE request).
   */
  markUploadFileComplete(A, Q, I) {
    const g = this.uploadState;
    g === void 0 || g.completedFiles.has(A) || (g.completedFiles.add(A), this.emit("upload-complete", Q, A, I), g.completedFiles.size === g.expectedFileCount && this.finishUploadBatch(g));
  }
  /**
   * Lazily rebuild uploadState from retainedFiles when the remote re-pastes
   * after the original upload completed. This lets the main code path in
   * handleFileContentsRequest handle progress and completion identically.
   * No external promise - resolve/reject are no-ops.
   */
  rebuildUploadStateFromRetained() {
    const A = this.retainedFiles, Q = /* @__PURE__ */ new Map();
    for (let g = 0; g < A.length; g++)
      Q.set(g, this.generateStreamId());
    const I = A.filter((g) => g.isDirectory !== true).length;
    this.uploadState = {
      files: A.map((g) => g.file),
      droppedFiles: A,
      failedFiles: /* @__PURE__ */ new Set(),
      expectedFileCount: I,
      completedFiles: /* @__PURE__ */ new Set(),
      bytesServed: /* @__PURE__ */ new Map(),
      activeReaders: /* @__PURE__ */ new Map(),
      readerTimeouts: /* @__PURE__ */ new Map(),
      transferIds: Q,
      resolve: () => {
      },
      reject: () => {
      },
      isRePaste: true
    }, this.emit("upload-batch-started", Q, A);
  }
  handleFileContentsResponse(A) {
    const Q = this.activeDownloads.get(A.streamId);
    if (!Q) {
      console.warn(`Received response for unknown stream ${A.streamId}`);
      return;
    }
    if (A.isError) {
      this.activeDownloads.delete(A.streamId), this.abortWriteHandle(Q);
      const I = {
        message: "Remote failed to provide file contents",
        transferId: Q.streamId,
        fileIndex: Q.fileIndex,
        fileName: Q.fileInfo.name,
        direction: "download"
      };
      this.emit("error", I), Q.reject(new Error(I.message));
      return;
    }
    if (Q.expectedSize === void 0) {
      if (A.data.length < 8) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(Q);
        const E = {
          message: "Invalid SIZE response: expected 8 bytes for file size",
          transferId: Q.streamId,
          fileIndex: Q.fileIndex,
          fileName: Q.fileInfo.name,
          direction: "download"
        };
        this.emit("error", E), Q.reject(new Error(E.message));
        return;
      }
      const I = new DataView(A.data.buffer, A.data.byteOffset, A.data.byteLength), g = Number(I.getBigUint64(0, true));
      if (g > _Z.MAX_FILE_SIZE) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(Q);
        const E = {
          message: `File size ${(g / (1024 * 1024 * 1024)).toFixed(2)}GB exceeds maximum download limit of 2GB`,
          transferId: Q.streamId,
          fileIndex: Q.fileIndex,
          fileName: Q.fileInfo.name,
          direction: "download"
        };
        this.emit("error", E), Q.reject(new Error(E.message));
        return;
      }
      if (Q.expectedSize = g, g === 0) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(Q);
        const E = new Blob([]);
        this.emit("download-complete", Q.fileInfo, E, Q.fileIndex, Q.streamId), Q.resolve(E);
        return;
      }
      this.initWriteHandleAndRequestFirstChunk(Q);
    } else
      this.handleDataChunk(Q, A.data);
  }
  /**
   * Create a write handle for the given transfer and request the first
   * data chunk.  Runs asynchronously because backend initialization
   * (especially OPFS) is async.
   *
   * The init promise is stored on `state.writeHandleReady` so that
   * DATA responses arriving before the handle is ready can await it.
   */
  initWriteHandleAndRequestFirstChunk(A) {
    A.writeHandleReady = (async () => {
      try {
        const Q = (async () => (await this.ensureStorageBackend()).createWriteHandle(A.fileInfo.name, A.expectedSize ?? 0))(), I = _Z.WRITE_HANDLE_INIT_TIMEOUT_MS, g = await Promise.race([
          Q,
          new Promise(
            (E, D) => setTimeout(() => D(new Error(`Storage init timed out after ${I / 1e3}s`)), I)
          )
        ]);
        if (this.disposed || !this.activeDownloads.has(A.streamId)) {
          try {
            await g.abort();
          } catch {
          }
          return;
        }
        A.writeHandle = g;
      } catch (Q) {
        this.activeDownloads.delete(A.streamId);
        const I = {
          message: "Failed to initialize storage for download",
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          direction: "download",
          cause: Q
        };
        this.emit("error", I), A.reject(new Error(I.message, { cause: Q }));
        return;
      }
      this.requestNextChunk(A);
    })();
  }
  /**
   * Write a data chunk to the storage backend and advance the download.
   *
   * If the write handle is not yet ready (DATA response arrived before
   * backend init completed), this method awaits `state.writeHandleReady`
   * to preserve chunk ordering -- each concurrent caller awaits the same
   * promise in sequence.
   */
  async handleDataChunk(A, Q) {
    if (!A.writeHandle && (!A.writeHandleReady || this.disposed || !this.activeDownloads.has(A.streamId) || (await A.writeHandleReady, this.disposed || !this.activeDownloads.has(A.streamId))))
      return;
    const I = A.writeHandle;
    if (I) {
      try {
        await I.write(Q);
      } catch (g) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(A);
        const G = {
          message: g instanceof DOMException && g.name === "QuotaExceededError" ? `Storage quota exceeded while downloading "${A.fileInfo.name}"` : "Failed to write download chunk to storage",
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          direction: "download",
          cause: g
        };
        this.emit("error", G), A.reject(new Error(G.message, { cause: g }));
        return;
      }
      if (A.bytesReceived += Q.length, A.expectedSize !== void 0 && A.bytesReceived > A.expectedSize * 2) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(A);
        const g = {
          message: `Received ${A.bytesReceived} bytes but expected ${A.expectedSize} - aborting`,
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          direction: "download"
        };
        this.emit("error", g), A.reject(new Error(g.message));
        return;
      }
      if (A.expectedSize !== void 0) {
        const g = {
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          bytesTransferred: A.bytesReceived,
          totalBytes: A.expectedSize,
          percentage: Math.min(A.bytesReceived / A.expectedSize * 100, 100)
        };
        this.emit("download-progress", g);
      }
      if (A.expectedSize !== void 0 && A.bytesReceived >= A.expectedSize) {
        this.activeDownloads.delete(A.streamId);
        try {
          const g = await I.finalize();
          this.emit("download-complete", A.fileInfo, g, A.fileIndex, A.streamId), A.resolve(g);
        } catch (g) {
          this.abortWriteHandle(A);
          const E = {
            message: "Failed to finalize downloaded file",
            transferId: A.streamId,
            fileIndex: A.fileIndex,
            fileName: A.fileInfo.name,
            direction: "download",
            cause: g
          };
          this.emit("error", E), A.reject(new Error(E.message, { cause: g }));
        }
      } else
        this.requestNextChunk(A);
    }
  }
  /** Abort and clean up a write handle, ignoring errors. */
  async abortWriteHandle(A) {
    if (A.writeHandle) {
      try {
        await A.writeHandle.abort();
      } catch {
      }
      A.writeHandle = void 0;
    }
  }
  /**
   * Handle the remote's response to one of our outbound Format Lists, surfaced via
   * `on_format_list_response`. Always re-emitted as a `format-list-response` event so
   * a frontend can drive paste from it (inject on accept, retry on reject).
   *
   * On reject (`ok === false`) the remote silently discards the advertised clipboard
   * (MS-RDPECLIP), so an upload still waiting to be pulled can never complete --
   * previously this left `uploadState` set and every later upload threw "Upload
   * already in progress". The watchdog-armed check scopes the release to an upload
   * that was advertised but not yet pulled, so re-paste and an already-progressing
   * transfer are left alone.
   */
  handleFormatListResponse(A) {
    this.emit("format-list-response", A), !A && this.pasteAckTimeout !== void 0 && this.failPendingUpload("The remote rejected the file list, so the paste was not accepted");
  }
  handleLock(A) {
  }
  handleUnlock(A) {
  }
  handleLocksExpired(A) {
    const Q = /* @__PURE__ */ new Set();
    for (let I = 0; I < A.length; I++)
      Q.add(A[I]);
    for (const [I, g] of this.activeDownloads)
      if (g.clipDataId !== void 0 && Q.has(g.clipDataId)) {
        this.activeDownloads.delete(I), this.abortWriteHandle(g);
        const E = `File download timed out for "${g.fileInfo.name}". Clipboard lock expired due to inactivity. This can happen with slow network connections or large files. Try downloading smaller files, increasing chunk size, or checking your network connection.`;
        g.reject(new Error(E)), this.emit("error", {
          message: E,
          transferId: g.streamId,
          fileIndex: g.fileIndex,
          fileName: g.fileInfo.name,
          direction: "download"
        });
      }
  }
  // ==================== Helper Methods ====================
  requestNextChunk(A) {
    if (A.expectedSize === void 0 || A.expectedSize === 0)
      return;
    const Q = A.bytesReceived, I = A.expectedSize - Q, g = Math.min(this.chunkSize, I);
    try {
      this.sendRequestFileContents(
        A.streamId,
        A.fileIndex,
        X.RANGE,
        Q,
        g,
        A.clipDataId
      );
    } catch (E) {
      this.activeDownloads.delete(A.streamId), this.abortWriteHandle(A);
      const D = {
        message: "Failed to request file chunk",
        transferId: A.streamId,
        fileIndex: A.fileIndex,
        fileName: A.fileInfo.name,
        direction: "download",
        cause: E
      };
      this.emit("error", D), A.reject(new Error(D.message, { cause: E }));
    }
  }
  generateStreamId() {
    const A = this.activeDownloads.size + 2;
    for (let Q = 0; Q < A; Q++) {
      const I = this.nextStreamId;
      if (this.nextStreamId = (this.nextStreamId + 1) % 4294967296, this.nextStreamId === 0 && (this.nextStreamId = 1), !this.activeDownloads.has(I) && I !== 0)
        return I;
    }
    throw new Error("Unable to generate unique stream ID");
  }
};
/** Maximum file size for downloads (2GB) to prevent browser out-of-memory errors */
__publicField(_Z, "MAX_FILE_SIZE", 2 * 1024 * 1024 * 1024);
/** Timeout for FileReader operations (60 seconds) to prevent stalled uploads */
__publicField(_Z, "FILE_READER_TIMEOUT_MS", 60 * 1e3);
/**
 * How long to keep clipboard monitoring suppressed after advertising an upload
 * while waiting for the remote to pull the files (first FileContentsRequest),
 * before giving up. Matches the Rust cliprdr lock inactivity timeout (60s), so
 * the JS side gives up exactly when the protocol lock does. If the remote never
 * requests contents (the paste landed in a non-file target, or the advertise was
 * clobbered), the watchdog resumes monitoring and fails the upload so its state
 * cannot wedge later uploads.
 */
__publicField(_Z, "PASTE_ACK_TIMEOUT_MS", 60 * 1e3);
/**
 * Upload inactivity window. After the remote starts pulling, each FileContentsRequest
 * resets this; if pulls then stop for this long -- e.g. the remote grabbed the
 * clipboard with a text/image copy that never reaches handleFilesAvailable -- the
 * upload is failed so `uploadState` is released and later uploads aren't wedged. A
 * slow-but-progressing transfer keeps resetting it, so it is never killed.
 */
__publicField(_Z, "UPLOAD_INACTIVITY_TIMEOUT_MS", 60 * 1e3);
/** Timeout for storage backend write handle initialization (30 seconds). */
__publicField(_Z, "WRITE_HANDLE_INIT_TIMEOUT_MS", 30 * 1e3);
/** Maximum recursion depth when traversing dropped directories. */
__publicField(_Z, "MAX_DIRECTORY_DEPTH", 32);
/** Maximum total entries (files + directories) collected from a single drop. */
__publicField(_Z, "MAX_DIRECTORY_ENTRIES", 1e3);
let Z = _Z;
async function AQ(B) {
  await WA(), wA(B);
}
const QQ = {
  DesktopSize: l,
  InputTransaction: f,
  SessionBuilder: J,
  ClipboardData: m,
  DeviceEvent: F
};
function IQ(B) {
  return new k("pcb", B);
}
function gQ(B, A = "enhanced") {
  if (B.trim() === "")
    throw new Error("vmconnect requires a VM ID");
  const Q = A === "enhanced" ? `${B};EnhancedMode=1` : B;
  return new k("vmconnect", Q);
}
function BQ(B) {
  return new k("display_control", B);
}
function CQ(B) {
  return new k("kdc_proxy_url", B);
}
function EQ(B) {
  return new k("outbound_message_size_limit", B);
}
function DQ(B) {
  return new k("enable_credssp", B);
}
function GQ(B) {
  return new k("enable_standard_rdp_security", B);
}
function NQ(B) {
  return new k("enable_server_pointer", B);
}
function oQ(B) {
  return new k("legacy_graphics", B);
}
export {
  QQ as Backend,
  oA as BlobStorageBackend,
  X as FileContentsFlags,
  s as OpfsStorageBackend,
  uA as PrinterDriverName,
  vA as RDCleanPathErrorCode,
  _ as RdpFile,
  Z as RdpFileTransferProvider,
  PA as detectStorageBackend,
  BQ as displayControl,
  DQ as enableCredssp,
  NQ as enableServerPointer,
  GQ as enableStandardRdpSecurity,
  VA as fileContentsRequestCallback,
  LA as fileContentsResponseCallback,
  XA as filesAvailableCallback,
  AQ as init,
  xA as initiateFileCopy,
  CQ as kdcProxyUrl,
  oQ as legacyGraphics,
  dA as lockCallback,
  KA as locksExpiredCallback,
  EQ as outboundMessageSizeLimit,
  IQ as preConnectionBlob,
  eA as printJobStreamCallbacks,
  _A as printerDeviceId,
  $A as printerDriverName,
  rA as printerName,
  qA as requestFileContents,
  TA as submitFileContents,
  SA as unlockCallback,
  gQ as vmConnect
};
