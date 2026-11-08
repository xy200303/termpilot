declare type Callback<T> = (_: T) => void;

declare interface CanvasResizedCallback {
    (): void;
}

export declare interface ClipboardData {
    addText(mimeType: string, text: string): void;
    addBinary(mimeType: string, binary: Uint8Array): void;
    items(): ClipboardItem_2[];
    isEmpty(): boolean;
}

declare interface ClipboardItem_2 {
    mimeType(): string;
    value(): string | Uint8Array;
}
export { ClipboardItem_2 as ClipboardItem }

export declare class Config {
    readonly username: string;
    readonly password: string;
    readonly destination: string;
    readonly proxyAddress: string;
    readonly webSocketProtocols?: string[];
    readonly serverDomain: string;
    readonly authToken: string;
    readonly desktopSize?: DesktopSize;
    readonly extensions: Extension[];
    constructor(userData: {
        username: string;
        password: string;
    }, proxyData: {
        address: string;
        authToken: string;
    }, configOptions: {
        destination: string;
        serverDomain: string;
        webSocketProtocols?: string[];
        extensions: Extension[];
        desktopSize?: DesktopSize;
    });
}

/**
 * Builder class for creating Config objects with a fluent interface.
 *
 * @example
 * ```typescript
 * const configBuilder = new ConfigBuilder(createExtensionFunction);
 * const config = configBuilder
 *   .withDestination(destination)
 *   .withProxyAddress(proxyAddress)
 *   .withAuthToken(authToken)
 *   ...
 *   .build();
 * ```
 */
export declare class ConfigBuilder {
    private username;
    private password;
    private destination;
    private proxyAddress;
    private webSocketProtocols;
    private serverDomain;
    private authToken;
    private desktopSize?;
    private extensions;
    /**
     * Creates a new ConfigBuilder instance.
     */
    constructor();
    /**
     * Optional parameter
     *
     * @param username - The username to use for authentication
     * @returns The builder instance for method chaining
     */
    withUsername(username: string): ConfigBuilder;
    /**
     * Optional parameter
     *
     * @param password - The password for authentication
     * @returns The builder instance for method chaining
     */
    withPassword(password: string): ConfigBuilder;
    /**
     * Required parameter
     *
     * @param destination - The destination address to connect to
     * @returns The builder instance for method chaining
     */
    withDestination(destination: string): ConfigBuilder;
    /**
     * Required parameter
     *
     * @param proxyAddress - The address of the proxy server
     * @returns The builder instance for method chaining
     */
    withProxyAddress(proxyAddress: string): ConfigBuilder;
    /**
     * Optional parameter
     *
     * @param protocols - The WebSocket subprotocols offered during the opening handshake
     * @returns The builder instance for method chaining
     */
    withWebSocketProtocols(protocols: readonly string[]): ConfigBuilder;
    /**
     * Optional parameter
     *
     * @param serverDomain - The server domain to connect to
     * @returns The builder instance for method chaining
     */
    withServerDomain(serverDomain: string): ConfigBuilder;
    /**
     * Required parameter
     *
     * @param authToken - JWT token to connect to the proxy
     * @returns The builder instance for method chaining
     */
    withAuthToken(authToken: string): ConfigBuilder;
    /**
     * Optional parameter
     *
     * @param ext - The extension
     * @returns The builder instance for method chaining
     */
    withExtension(ext: Extension): ConfigBuilder;
    /**
     * Optional
     *
     * @param desktopSize - The desktop size configuration object
     * @returns The builder instance for method chaining
     */
    withDesktopSize(desktopSize: DesktopSize): ConfigBuilder;
    /**
     * Builds a new Config instance.
     *
     * @throws {Error} If required parameters (destination, proxyAddress, authToken) are not set
     * @returns A new Config instance with the configured values
     */
    build(): Config;
}

export declare interface DesktopSize {
    width: number;
    height: number;
}

export declare type DeviceEvent = unknown;

declare type Extension = unknown;

/**
 * Protocol-agnostic interface for file transfer providers.
 *
 * Implementations live in protocol-specific packages (e.g., `RdpFileTransferProvider`
 * in `iron-remote-desktop-rdp`) and are injected into the web component via
 * `enableFileTransfer()`.
 */
export declare interface FileTransferProvider {
    /** Extensions to register on the SessionBuilder before connect(). */
    getBuilderExtensions(): Extension[];
    /** Called after connect() with the live session. */
    setSession(session: Session): void;
    /** Called when an upload begins (use for monitoring suppression). */
    onUploadStarted?: () => void;
    /** Called when an upload ends or is abandoned. */
    onUploadFinished?: () => void;
    /** Clean up resources. */
    dispose(): void;
}

declare interface ForceClipboardUpdateCallback {
    (): void;
}

export declare interface InputTransaction {
    addEvent(event: DeviceEvent): void;
}

export declare interface IronError {
    backtrace: () => string;
    kind: () => IronErrorKind;
    rdcleanpathDetails: () => RDCleanPathDetails | undefined;
}

export declare enum IronErrorKind {
    General = 0,
    WrongPassword = 1,
    LogonFailure = 2,
    AccessDenied = 3,
    RDCleanPath = 4,
    ProxyConnect = 5,
    NegotiationFailure = 6
}

export declare interface NewSessionInfo {
    sessionId: number;
    websocketPort: number;
    initialDesktopSize: DesktopSize;
    run: () => Promise<SessionTerminationInfo>;
}

export declare interface RDCleanPathDetails {
    readonly httpStatusCode?: number;
    readonly wsaErrorCode?: number;
    readonly tlsAlertCode?: number;
    /** RDCleanPath error code; codes 16384 to 32767 are specific to the proxy implementation. */
    readonly errorCode?: number;
}

declare interface RemoteClipboardChangedCallback {
    (data: ClipboardData): void;
}

export declare interface ResizeEvent {
    sessionId: number;
    desktopSize: DesktopSize;
}

declare enum ScreenScale {
    Fit = 1,
    Full = 2,
    Real = 3
}

export declare interface Session {
    run(): Promise<SessionTerminationInfo>;
    desktopSize(): DesktopSize;
    applyInputs(transaction: InputTransaction): void;
    releaseAllInputs(): void;
    synchronizeLockKeys(scrollLock: boolean, numLock: boolean, capsLock: boolean, kanaLock: boolean): void;
    shutdown(): void;
    onClipboardPaste(data: ClipboardData): Promise<void>;
    resize(width: number, height: number, scaleFactor?: number | null, physicalWidth?: number | null, physicalHeight?: number | null): void;
    supportsUnicodeKeyboardShortcuts(): boolean;
    /**
     * Invoke a protocol-specific extension at runtime.
     *
     * File transfer operations (requestFileContents, submitFileContents,
     * initiateFileCopy) are protocol-specific and routed through this
     * method rather than living on Session directly.
     */
    invokeExtension(ext: Extension): unknown;
}

export declare interface SessionBuilder {
    /**
     * Required
     */
    username(username: string): SessionBuilder;
    /**
     * Required
     */
    destination(destination: string): SessionBuilder;
    /**
     * Optional
     */
    serverDomain(serverDomain: string): SessionBuilder;
    /**
     * Required
     */
    password(password: string): SessionBuilder;
    /**
     * Required
     */
    proxyAddress(address: string): SessionBuilder;
    /**
     * Optional
     * Copies the offered subprotocols. An empty array disables subprotocol negotiation.
     * Non-array inputs or non-string entries cause connect() to reject.
     */
    webSocketProtocols(protocols: string[]): SessionBuilder;
    /**
     * Required
     */
    authToken(token: string): SessionBuilder;
    /**
     * Optional
     */
    desktopSize(desktopSize: DesktopSize): SessionBuilder;
    /**
     * Optional
     */
    renderCanvas(canvas: HTMLCanvasElement): SessionBuilder;
    /**
     * Required.
     *
     * # Cursor kinds:
     * - `default` (default system cursor); other arguments are `UNDEFINED`
     * - `none` (hide cursor); other arguments are `UNDEFINED`
     * - `url` (custom cursor data URL); `cursor_data` contains the data URL with Base64-encoded
     *   cursor bitmap; `hotspot_x` and `hotspot_y` are set to the cursor hotspot coordinates.
     */
    setCursorStyleCallback(callback: SetCursorStyleCallback): SessionBuilder;
    /**
     * Required.
     */
    setCursorStyleCallbackContext(context: unknown): SessionBuilder;
    /**
     * Optional
     */
    remoteClipboardChangedCallback(callback: RemoteClipboardChangedCallback): SessionBuilder;
    /**
     * Optional
     */
    forceClipboardUpdateCallback(callback: ForceClipboardUpdateCallback): SessionBuilder;
    /**
     * Optional
     */
    canvasResizedCallback(callback: CanvasResizedCallback): SessionBuilder;
    /**
     * Register a protocol-specific extension.
     *
     * File transfer callbacks (filesAvailableCallback, lockCallback, etc.) are
     * protocol-specific and registered through this method via extension factory
     * functions from the RDP backend package.
     */
    extension(ext: Extension): SessionBuilder;
    connect(): Promise<Session>;
}

export declare interface SessionTerminationInfo {
    reason(): string;
}

declare interface SetCursorStyleCallback {
    (cursorKind: string, cursorData: string | undefined, hotspotX: number | undefined, hotspotY: number | undefined): void;
}

export declare interface UserInteraction {
    setVisibility(state: boolean): void;
    setScale(scale: ScreenScale): void;
    configBuilder(): ConfigBuilder;
    connect(config: Config): Promise<NewSessionInfo>;
    setKeyboardUnicodeMode(useUnicode: boolean): void;
    ctrlAltDel(): void;
    metaKey(): void;
    ctrlC(): void;
    ctrlV(): void;
    shutdown(): void;
    setCursorStyleOverride(style: string | null): void;
    onWarningCallback(callback: Callback<string>): void;
    onClipboardRemoteUpdateCallback(callback: Callback<void>): void;
    resize(width: number, height: number, scale?: number): void;
    setEnableClipboard(enable: boolean): void;
    setEnableAutoClipboard(enable: boolean): void;
    saveRemoteClipboardData(): Promise<void>;
    sendClipboardData(): Promise<void>;
    invokeExtension(ext: Extension): void;
    /**
     * Enable file transfer support. Must be called before connect().
     * The provider becomes active after connect() resolves.
     * Implicitly enables clipboard (required for file transfer protocol).
     *
     * @param provider - Protocol-specific file transfer provider (e.g., RdpFileTransferProvider)
     * @returns The same provider, with monitoring hooks composed in
     */
    enableFileTransfer(provider: FileTransferProvider): FileTransferProvider;
}

export { }
