export declare const Backend: {
    DesktopSize: typeof DesktopSize;
    InputTransaction: typeof InputTransaction;
    SessionBuilder: typeof SessionBuilder;
    ClipboardData: typeof ClipboardData;
    DeviceEvent: typeof DeviceEvent;
};

/**
 * In-memory Blob storage backend.
 *
 * Downloads are buffered as {@link Uint8Array} chunks in a plain array and
 * assembled into a single {@link Blob} when the transfer completes.  This
 * is the universal fallback that works in every browser context.
 *
 * **Trade-offs:**
 * - Peak RAM ~2x file size (chunk array + final Blob).
 * - No persistent storage; data is lost on page unload.
 * - No setup cost; works even in non-secure contexts and private browsing.
 */
export declare class BlobStorageBackend implements FileStorageBackend {
    readonly name = "blob";
    createWriteHandle(_fileName: string, _expectedSize: number): Promise<FileWriteHandle>;
    dispose(): Promise<void>;
}

declare class ClipboardData {
    free(): void;
    [Symbol.dispose](): void;
    addBinary(mime_type: string, binary: Uint8Array): void;
    addText(mime_type: string, text: string): void;
    constructor();
    isEmpty(): boolean;
    items(): ClipboardItem_2[];
}

declare class ClipboardItem_2 {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    mimeType(): string;
    value(): any;
}

declare class DesktopSize {
    free(): void;
    [Symbol.dispose](): void;
    constructor(width: number, height: number);
    height: number;
    width: number;
}

/**
 * Detect the best available storage backend for the current browser
 * context.
 *
 * When `preference` is `'auto'` (default), the function probes for OPFS
 * support with a full round-trip smoke test.  If OPFS is available, an
 * {@link OpfsStorageBackend} is returned; otherwise a
 * {@link BlobStorageBackend} is used as the universal fallback.
 *
 * When `preference` is `'blob'`, OPFS detection is skipped entirely and
 * the Blob backend is returned immediately.
 *
 * @param preference - `'auto'` to detect, `'blob'` to force in-memory.
 * @param sessionId  - Optional session identifier used as the OPFS
 *                    subdirectory name.  When omitted a unique ID is
 *                    generated from the current timestamp.
 * @returns The selected backend, ready to use.
 */
export declare function detectStorageBackend(preference?: StorageBackendPreference, sessionId?: string): Promise<FileStorageBackend>;

declare class DeviceEvent {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    static keyPressed(scancode: number): DeviceEvent;
    static keyReleased(scancode: number): DeviceEvent;
    static mouseButtonPressed(button: number): DeviceEvent;
    static mouseButtonReleased(button: number): DeviceEvent;
    static mouseMove(x: number, y: number): DeviceEvent;
    static unicodePressed(unicode: string): DeviceEvent;
    static unicodeReleased(unicode: string): DeviceEvent;
    static wheelRotations(vertical: boolean, rotation_amount: number, rotation_unit: RotationUnit): DeviceEvent;
}

export declare function displayControl(enable: boolean): Extension;

/**
 * Result of initiating a file download via {@link RdpFileTransferProvider.downloadFile}.
 */
export declare interface DownloadHandle {
    /** Unique identifier for this download, available synchronously before the download completes */
    transferId: number;
    /** Promise that resolves with the downloaded file blob */
    completion: Promise<Blob>;
}

/**
 * A file extracted from a drag-and-drop event, with optional path metadata
 * from directory traversal via the File and Directory Entries API.
 *
 * When a folder is dropped, its contents are recursively enumerated and each
 * file is returned with a {@link path} relative to the drop root.  Directory
 * entries themselves are included with {@link isDirectory} set to `true` and a
 * `null` {@link file} handle (they carry no data, only structure).
 */
export declare interface DroppedFile {
    /** Browser File handle.  `null` for directory-only entries. */
    file: File | null;
    /** File or directory basename (e.g. `"report.pdf"` or `"images"`). */
    name: string;
    /** Size in bytes.  Always 0 for directory entries. */
    size: number;
    /** Last-modified timestamp (ms since Unix epoch, same as `File.lastModified`). */
    lastModified: number;
    /**
     * Relative directory path within the dropped collection, using `\` as
     * separator to match the Windows wire convention (MS-RDPECLIP 3.1.1.2).
     * `undefined` for entries at the drop root.
     *
     * @example
     * // File "photo.png" inside dropped folder "docs/images":
     * { name: "photo.png", path: "docs\\images", ... }
     */
    path?: string;
    /** Whether this entry represents a directory rather than a file. */
    isDirectory?: boolean;
}

export declare function enableCredssp(enable: boolean): Extension;

export declare function enableServerPointer(enable: boolean): Extension;

/**
 * Allow unencrypted Standard RDP Security over a trusted RDCleanPath transport.
 *
 * Enabling this disables TLS and CredSSP protocol negotiation. Use it only when
 * the WebSocket and proxy-to-server transports already provide the required
 * confidentiality and peer authentication.
 */
export declare function enableStandardRdpSecurity(enable: boolean): Extension;

declare type EventHandler<T extends unknown[]> = (...args: T) => void;

declare type EventMap = {
    'download-progress': [TransferProgress];
    'upload-progress': [TransferProgress];
    'download-complete': [FileInfo, Blob, number, number];
    'upload-complete': [File, number, number];
    /** Emitted when an upload batch begins (both initial paste and re-paste).
     *  Provides the full batch of transferIds and DroppedFile metadata so
     *  listeners can register all transfers eagerly before progress events arrive. */
    'upload-batch-started': [Map<number, number>, DroppedFile[]];
    'files-available': [FileInfo[]];
    /** Remote's response to one of our outbound Format Lists: `true` = accepted
     *  (CB_RESPONSE_OK), `false` = rejected (CB_RESPONSE_FAIL). Fires for every
     *  outbound advertise, so consumers can drive paste from it (e.g. inject the
     *  paste keystroke on accept, retry on reject). */
    'format-list-response': [boolean];
    error: [FileTransferError];
};

declare class Extension {
    free(): void;
    [Symbol.dispose](): void;
    constructor(ident: string, value: any);
}

/**
 * Minimal session interface for extension-based file transfer.
 * Protocol-agnostic - only requires invokeExtension().
 */
declare interface ExtensionSession {
    invokeExtension(ext: Extension): unknown;
}

/**
 * FileContentsFlags values per [MS-RDPECLIP] 2.2.5.3
 *
 * Used in FileContentsRequest to specify the type of operation.
 */
export declare const FileContentsFlags: {
    /**
     * Request file size (8-byte unsigned integer).
     * When set: position must be 0, size must be 8.
     */
    readonly SIZE: 1;
    /**
     * Request byte range from file.
     * When set: position and size define the requested range.
     */
    readonly RANGE: 2;
};

export declare type FileContentsFlags = (typeof FileContentsFlags)[keyof typeof FileContentsFlags];

/**
 * File contents request from remote (when remote requests file upload from client).
 *
 * The client should read the requested file chunk and respond via CLIPRDR.
 */
export declare interface FileContentsRequest {
    /** Stream identifier for this file transfer */
    streamId: number;
    /** File index in the file list (0-based) */
    index: number;
    /**
     * FileContentsFlags bitmask - use FileContentsFlags.SIZE or FileContentsFlags.RANGE
     * - FileContentsFlags.SIZE (0x1): Request file size
     * - FileContentsFlags.RANGE (0x2): Request byte range
     */
    flags: number;
    /** Byte offset for RANGE requests */
    position: number;
    /** Number of bytes requested for RANGE requests */
    size: number;
    /** Optional clipboard lock ID from LockClipData PDU */
    dataId?: number;
}

export declare function fileContentsRequestCallback(cb: (request: {
    streamId: number;
    index: number;
    flags: number;
    position: number;
    size: number;
    dataId?: number;
}) => void): Extension;

/**
 * File contents response from remote (when remote sends file download to client).
 *
 * This is the response to a client's file contents request.
 */
export declare interface FileContentsResponse {
    /** Stream identifier for this file transfer */
    streamId: number;
    /** If true, the request failed (data unavailable/access denied) */
    isError: boolean;
    /**
     * Response data:
     * - For SIZE requests: 8-byte little-endian u64
     * - For RANGE requests: requested byte range
     */
    data: Uint8Array;
}

export declare function fileContentsResponseCallback(cb: (response: {
    streamId: number;
    isError: boolean;
    data: Uint8Array;
}) => void): Extension;

/**
 * File metadata for file transfer operations.
 *
 * When remote copies files, this metadata is provided to the client.
 * File names are limited to 259 characters per MS-RDPECLIP spec.
 */
export declare interface FileInfo {
    /** File basename (including extension, without directory path) */
    name: string;
    /**
     * Relative directory path within the copied collection.
     * Uses `\` as separator (matching the Windows wire protocol convention).
     * Absent or undefined for root-level files.
     *
     * Per MS-RDPECLIP 3.1.1.2, file lists use relative paths to describe
     * directory structure (e.g., `"temp\\subdir"`).
     *
     * @example
     * // File at root level:
     * { name: "readme.txt", size: 100, lastModified: 0 }
     * // File inside "docs" folder:
     * { name: "report.pdf", path: "docs", size: 2048, lastModified: 0 }
     * // File inside nested folder:
     * { name: "image.png", path: "docs\\images", size: 4096, lastModified: 0 }
     */
    path?: string;
    /** File size in bytes (0 for empty files or unknown size) */
    size: number;
    /**
     * Last write time as a JavaScript timestamp (milliseconds since Unix epoch,
     * same as `File.lastModified`). The WASM layer converts to Windows FILETIME
     * for the RDP protocol. 0 indicates unknown or not applicable.
     */
    lastModified: number;
    /**
     * Whether this entry represents a directory rather than a file.
     * Directory entries are used to describe the folder structure of a copied
     * collection and typically have size 0.
     */
    isDirectory?: boolean;
}

export declare function filesAvailableCallback(cb: (files: FileInfo[], clipDataId?: number) => void): Extension;

/**
 * Pluggable storage backend for file transfer downloads.
 *
 * The backend determines *where* incoming file chunks are buffered during
 * a download.  Protocol-specific file transfer providers delegate all
 * storage concerns to the active backend, keeping download orchestration
 * logic storage-agnostic.
 *
 * Three backends are planned:
 *
 * | Backend | Buffering          | Peak RAM      | Browser support           |
 * |---------|--------------------|---------------|---------------------------|
 * | Blob    | In-memory array    | ~2x file size | Universal                 |
 * | OPFS    | Origin Private FS  | ~chunk size   | Baseline (September 2025) |
 * | FSAPI   | User-chosen file   | ~chunk size   | Chromium-only (future)    |
 */
export declare interface FileStorageBackend {
    /** Human-readable backend name, used in log messages. */
    readonly name: string;
    /**
     * Create a write handle for a new download.
     *
     * @param fileName   - Sanitized file basename (used for the temp file
     *                     name in persistent backends).
     * @param expectedSize - Expected total size in bytes.  Backends may use
     *                     this for pre-allocation or quota checks.  A value
     *                     of 0 means the size is unknown or the file is
     *                     empty.
     */
    createWriteHandle(fileName: string, expectedSize: number): Promise<FileWriteHandle>;
    /**
     * Release all backend resources.
     *
     * For persistent backends this deletes the session directory and any
     * temp files.  Safe to call multiple times.
     */
    dispose(): Promise<void>;
}

/**
 * Error information for file transfer operations.
 */
export declare interface FileTransferError {
    /** Error message */
    message: string;
    /** Unique transfer identifier (if applicable) */
    transferId?: number;
    /** File index that failed (if applicable) */
    fileIndex?: number;
    /** File name that failed (if applicable) */
    fileName?: string;
    /** Transfer direction that caused the error (if applicable) */
    direction?: 'download' | 'upload';
    /** Underlying error cause */
    cause?: unknown;
}

/**
 * A write handle for streaming file data to a storage backend.
 *
 * Created once per download via {@link FileStorageBackend.createWriteHandle}.
 * Chunks are appended via {@link write}, and on success {@link finalize}
 * returns the assembled data as a {@link Blob} (or {@link File}, which
 * extends Blob).  On failure or cancellation, {@link abort} releases all
 * resources held by the handle.
 *
 * Implementations may buffer in memory (Blob backend), stream to the
 * Origin Private File System (OPFS backend), or stream to a user-chosen
 * location (future FSAPI backend).
 */
export declare interface FileWriteHandle {
    /** Append a chunk of data.
     *
     *  Backends may buffer the chunk in memory or flush it to persistent
     *  storage immediately.  The returned promise resolves once the chunk
     *  has been accepted (not necessarily persisted). */
    write(chunk: Uint8Array): Promise<void>;
    /**
     * Finalize the file and return the result as a Blob.
     *
     * For in-memory backends this assembles a Blob from buffered chunks.
     * For persistent backends (e.g. OPFS) this closes the writable stream
     * and returns a {@link File} (which extends Blob) backed by the on-disk
     * data, keeping peak RAM close to zero.
     *
     * After calling finalize the handle must not be reused.
     */
    finalize(): Promise<Blob>;
    /**
     * Discard all written data and release resources.
     *
     * Safe to call multiple times.  After abort the handle must not be
     * reused.
     */
    abort(): Promise<void>;
    /** Number of bytes successfully written so far. */
    readonly bytesWritten: number;
}

export declare function init(log_level: string): Promise<void>;

export declare function initiateFileCopy(files: FileInfo[]): Extension;

declare class InputTransaction {
    free(): void;
    [Symbol.dispose](): void;
    addEvent(event: DeviceEvent): void;
    constructor();
}

export declare function kdcProxyUrl(url: string): Extension;

export declare function legacyGraphics(enable: boolean): Extension;

export declare function lockCallback(cb: (dataId: number) => void): Extension;

export declare function locksExpiredCallback(cb: (clipDataIds: Uint32Array) => void): Extension;

/**
 * Storage backend that streams download chunks to the Origin Private File
 * System (OPFS).
 *
 * OPFS is a browser-provided, origin-scoped file system that requires no
 * user permission prompts and is available on the main thread (async
 * only).  This backend requires the {@link FileSystemWritableFileStream}
 * API, which reached Baseline across all major browsers in September 2025
 * (Chrome 86+, Firefox 111+, Safari 17.2+, Edge 86+).  Older browsers
 * are detected automatically via {@link OpfsStorageBackend.probe} and
 * fall back to the Blob backend.
 *
 * **How it works:**
 * 1. On construction, a per-session subdirectory is created under
 *    `ironrdp-transfers/` in the OPFS root.
 * 2. Each download opens a {@link FileSystemWritableFileStream} inside
 *    that directory and flushes chunks to disk as they arrive.
 * 3. On completion, the stream is closed and a lazy {@link File} handle is
 *    returned.  The File extends Blob, so existing consumers that expect
 *    a Blob work without changes.
 * 4. On dispose, the entire session directory is deleted.
 *
 * **Trade-offs vs Blob backend:**
 * - Peak RAM drops from ~2x file size to ~chunk size (typically 64 KB).
 * - Moderate write latency per chunk (async disk I/O), but the download
 *   is already async and network-bound.
 * - Storage is subject to the origin's quota (typically 60% of disk).
 * - May be unavailable in some private browsing modes.
 *
 * **Construction:** Use the static {@link OpfsStorageBackend.create}
 * factory method.  The constructor is private because initialization
 * requires async OPFS directory setup.
 */
export declare class OpfsStorageBackend implements FileStorageBackend {
    private readonly opfsRoot;
    private sessionDir;
    private readonly sessionId;
    readonly name = "opfs";
    /** Sequence counter for generating unique temp file names. */
    private sequence;
    private constructor();
    /**
     * Create an OPFS backend, including the per-session directory.
     *
     * Call {@link probe} first to verify OPFS is available before
     * constructing -- this factory assumes OPFS works.
     */
    static create(opfsRoot: FileSystemDirectoryHandle, sessionId?: string): Promise<OpfsStorageBackend>;
    /** Maximum age (in milliseconds) before a session directory is considered stale. */
    private static readonly STALE_SESSION_THRESHOLD_MS;
    /**
     * Remove session directories older than {@link STALE_SESSION_THRESHOLD_MS}.
     *
     * Session IDs generated by {@link create} embed a timestamp in the
     * format `s-{Date.now()}-{random}`.  This method parses that timestamp
     * to determine age.  Directories with unparsable names or those
     * belonging to the current session are skipped.
     */
    private static cleanupStale;
    /**
     * Probe whether OPFS is usable in the current context.
     *
     * Performs a full round-trip: creates a temp file, opens a writable,
     * closes it, and deletes it.  This catches environments where the API
     * exists but throws at runtime (e.g., some private browsing modes).
     */
    static probe(opfsRoot: FileSystemDirectoryHandle): Promise<boolean>;
    createWriteHandle(fileName: string, _expectedSize: number): Promise<FileWriteHandle>;
    dispose(): Promise<void>;
}

export declare function outboundMessageSizeLimit(limit: number): Extension;

export declare function preConnectionBlob(pcb: string): Extension;

export declare function printerDeviceId(id: number): Extension;

export declare const PrinterDriverName: {
    readonly PostScript: "MS Publisher Imagesetter";
    readonly MicrosoftPrintToPdf: "Microsoft Print to PDF";
};

export declare function printerDriverName(driverName: string): Extension;

export declare function printerName(name: string): Extension;

export declare interface PrintJobStreamCallbacks {
    onJobStart?: (fileId: number) => void;
    onJobData: (fileId: number, chunk: Uint8Array) => void;
    onJobComplete: (fileId: number) => void;
    onJobError?: (fileId: number) => void;
}

export declare function printJobStreamCallbacks(callbacks: PrintJobStreamCallbacks): Extension;

/**
 * RDCleanPath error codes reported by `RDCleanPathDetails.errorCode`.
 *
 * Same values as the constants of the `ironrdp-rdcleanpath` crate, whose README specifies them.
 * Codes 16384 to 32767 are implementation-specific: their meaning depends on the proxy.
 *
 * Unlike `FileContentsFlags`, no union type of these values is exported: the code space is open,
 * so `errorCode` stays a `number` and may carry codes not listed here.
 */
export declare const RDCleanPathErrorCode: {
    /** General error, without a more specific reason. */
    readonly GENERAL: 1;
    /** The proxy credential has expired. */
    readonly EXPIRED: 100;
    /** The proxy credential is not valid yet. */
    readonly NOT_YET_VALID: 101;
    /** The proxy credential has been revoked. */
    readonly REVOKED: 102;
    /** The proxy could not connect to the target. */
    readonly TARGET_UNREACHABLE: 103;
    /** The proxy could not resolve the target host name. */
    readonly DNS_RESOLUTION_FAILED: 104;
    /** The TLS handshake between the proxy and the target failed. */
    readonly TLS_HANDSHAKE_FAILED: 105;
};

export declare class RdpFile {
    free(): void;
    [Symbol.dispose](): void;
    constructor();
    getInt(key: string): number | undefined;
    getStr(key: string): string | undefined;
    insertInt(key: string, value: number): void;
    insertStr(key: string, value: string): void;
    parse(config: string): void;
    write(): string;
}

/**
 * RdpFileTransferProvider provides a high-level API for bidirectional file transfer
 * in browser-based RDP sessions.
 *
 * This class wraps the low-level WASM file transfer API and handles:
 * - State management for downloads and uploads
 * - Chunking and reassembly
 * - Progress tracking
 * - Browser integration helpers (file picker, drag-and-drop)
 *
 * ## Clipboard Locking
 *
 * Clipboard locks are managed automatically by the Rust cliprdr processor. When
 * the remote copies files (FormatList containing FileGroupDescriptorW), a lock
 * is acquired automatically. The lock ID is passed to RdpFileTransferProvider via
 * the filesAvailable callback and used in all subsequent FileContentsRequest
 * PDUs. Lock lifecycle (expiry on clipboard change, Unlock PDU emission) is
 * handled entirely by the Rust layer - no explicit lock/unlock calls are needed.
 *
 * ## Error Handling Best Practices
 *
 * Production applications should implement comprehensive error handling:
 *
 * @example Basic Usage
 * ```typescript
 * const provider = new RdpFileTransferProvider({ chunkSize: 64 * 1024 });
 * component.enableFileTransfer(provider);
 * await component.connect(config);
 *
 * // Handle downloads from remote
 * provider.on('files-available', async (files) => {
 *   for (const file of files) {
 *     const { completion } = provider.downloadFile(file, files.indexOf(file));
 *     const blob = await completion;
 *     saveAs(blob, file.name);
 *   }
 * });
 *
 * // Handle uploads using file picker
 * const files = await provider.showFilePicker({ multiple: true });
 * provider.uploadFiles(files);
 * ```
 *
 * @example Error Handling
 * ```typescript
 * provider.on('error', (error) => {
 *   console.error('Transfer error:', error.message);
 *   if (error.fileName) {
 *     showNotification(`Failed to transfer ${error.fileName}: ${error.message}`);
 *   }
 * });
 * ```
 *
 * @example Handling Lock Expiration
 * ```typescript
 * provider.on('error', (error) => {
 *   if (error.message.includes('lock expired')) {
 *     showNotification(
 *       'File download timed out',
 *       'The transfer took too long. Try a faster connection or smaller files.',
 *       'warning'
 *     );
 *   }
 * });
 * ```
 */
export declare class RdpFileTransferProvider {
    /** Maximum file size for downloads (2GB) to prevent browser out-of-memory errors */
    private static readonly MAX_FILE_SIZE;
    /** Timeout for FileReader operations (60 seconds) to prevent stalled uploads */
    private static readonly FILE_READER_TIMEOUT_MS;
    /**
     * How long to keep clipboard monitoring suppressed after advertising an upload
     * while waiting for the remote to pull the files (first FileContentsRequest),
     * before giving up. Matches the Rust cliprdr lock inactivity timeout (60s), so
     * the JS side gives up exactly when the protocol lock does. If the remote never
     * requests contents (the paste landed in a non-file target, or the advertise was
     * clobbered), the watchdog resumes monitoring and fails the upload so its state
     * cannot wedge later uploads.
     */
    private static readonly PASTE_ACK_TIMEOUT_MS;
    /**
     * Upload inactivity window. After the remote starts pulling, each FileContentsRequest
     * resets this; if pulls then stop for this long -- e.g. the remote grabbed the
     * clipboard with a text/image copy that never reaches handleFilesAvailable -- the
     * upload is failed so `uploadState` is released and later uploads aren't wedged. A
     * slow-but-progressing transfer keeps resetting it, so it is never killed.
     */
    private static readonly UPLOAD_INACTIVITY_TIMEOUT_MS;
    /** Timeout for storage backend write handle initialization (30 seconds). */
    private static readonly WRITE_HANDLE_INIT_TIMEOUT_MS;
    /** Maximum recursion depth when traversing dropped directories. */
    private static readonly MAX_DIRECTORY_DEPTH;
    /** Maximum total entries (files + directories) collected from a single drop. */
    private static readonly MAX_DIRECTORY_ENTRIES;
    private session?;
    private readonly chunkSize;
    private readonly onUploadStarted?;
    private readonly onUploadFinished?;
    private readonly storagePreference;
    private readonly eventHandlers;
    private storageBackend?;
    private storageBackendReady?;
    private activeDownloads;
    private uploadState?;
    private pasteAckTimeout?;
    private uploadInactivityTimeout?;
    private uploadMonitoringSuppressed;
    private retainedFiles?;
    private availableFiles;
    private clipDataId?;
    private nextStreamId;
    private disposed;
    constructor(options?: RdpFileTransferProviderOptions);
    /**
     * Set the session instance after connection is established.
     * Called by the web component's connect() flow via the FileTransferProvider interface.
     */
    setSession(session: ExtensionSession): void;
    private ensureSession;
    /**
     * Lazily initialize and return the storage backend.
     *
     * Detection is performed once and cached.  Concurrent callers share
     * the same initialization promise so the probe only runs once.
     * If detection fails the cached promise is cleared so subsequent
     * downloads can retry.
     */
    private ensureStorageBackend;
    private sendRequestFileContents;
    private sendSubmitFileContents;
    private sendInitiateFileCopy;
    /**
     * Returns the extension objects to register on the SessionBuilder before connect().
     * Implements the FileTransferProvider interface.
     */
    getBuilderExtensions(): Extension[];
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
    on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void;
    /**
     * Unregister an event handler.
     *
     * @param event - Event name
     * @param handler - Event handler function to remove
     */
    off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void;
    /**
     * Emit an event to all registered handlers.
     */
    private emit;
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
    downloadFile(fileInfo: FileInfo, fileIndex: number): DownloadHandle;
    /**
     * Internal: execute the async download workflow for a single file.
     */
    private executeDownload;
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
    downloadFiles(files: FileInfo[]): AsyncGenerator<{
        file: FileInfo;
        blob: Blob;
        transferId: number;
    }>;
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
    downloadFilesConcurrent(files: FileInfo[], options?: {
        maxConcurrent?: number;
    }): Promise<Map<number, Blob>>;
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
    uploadFiles(files: File[] | DroppedFile[]): UploadHandle;
    /** Whether an upload batch is currently advertised or in flight (a fresh upload, or a re-paste
     *  rebuilt from retained files). */
    isUploadInProgress(): boolean;
    /** Suppress clipboard monitoring for an upload's paste window. Idempotent: a supersede keeps
     *  monitoring suppressed across the old->new upload, so this must not re-fire `onUploadStarted`. */
    private suppressUploadMonitoring;
    /** Resume clipboard monitoring (idempotent: fires onUploadFinished at most once
     *  per upload, since the resume point is now deferred past the wire send). */
    private resumeUploadMonitoring;
    /** Arm the paste-acknowledgment watchdog for the current upload. */
    private armPasteAckWatchdog;
    /** Disarm the paste-acknowledgment watchdog, if armed. */
    private clearPasteAckWatchdog;
    /**
     * (Re)arm the upload inactivity watchdog (see {@link UPLOAD_INACTIVITY_TIMEOUT_MS}).
     * Called on every FileContentsRequest, so continued pulls keep resetting it and a
     * slow-but-progressing transfer is never killed; if pulls stop for the window the
     * upload is failed (releasing uploadState). Skipped for re-pastes, matching the
     * paste-ack watchdog.
     */
    private resetUploadInactivityWatchdog;
    /** Disarm the upload inactivity watchdog, if armed. */
    private clearUploadInactivityWatchdog;
    /**
     * The remote acknowledged the paste by requesting file contents: the clobber
     * window is over, so disarm the paste-ack watchdog and resume clipboard monitoring.
     * Called on every FileContentsRequest; only the first disarms/resumes. Every request
     * also (re)arms the inactivity watchdog so a stall after pulling began is recovered.
     */
    private acknowledgePaste;
    /**
     * Abort any in-flight chunk reads for a batch and clear their timeouts. Without this, a read
     * still running when the batch is torn down keeps its FileReader and a 60s reader-timeout
     * alive. Shared by every upload teardown path (fail, supersede, dispose).
     */
    private abortInFlightReads;
    /**
     * Fail the in-flight upload (reject its completion, emit an upload error, clear
     * uploadState) and resume monitoring. Used when the advertise is rejected or the
     * paste is never pulled, so `uploadState` is released instead of lingering and
     * throwing "Upload already in progress" on every later upload.
     */
    private failPendingUpload;
    /**
     * Tear down the current upload because a new paste is replacing it. Unlike
     * {@link failPendingUpload}, this emits no error and leaves monitoring suppressed (a new upload
     * is starting); it aborts in-flight reads, clears the state, and *resolves* the old completion
     * (a replacement, not a failure).
     */
    private supersedeUpload;
    /**
     * Finalize a fully-accounted upload batch (every counted file either served in full
     * or permanently failed). Stops the inactivity watchdog so it cannot linger past
     * completion, retains the DroppedFile metadata so a re-paste from the remote can serve
     * the data again, clears `uploadState`, and resolves the completion promise.
     */
    private finishUploadBatch;
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
    showFilePicker(options?: {
        multiple?: boolean;
        accept?: string;
    }): Promise<File[]>;
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
    handleDrop(event: DragEvent): Promise<DroppedFile[]>;
    /**
     * Normalize a plain `File[]` or `DroppedFile[]` into `DroppedFile[]`.
     * Allows `uploadFiles` to accept either type for backward compatibility.
     */
    private static normalizeToDroppedFiles;
    /**
     * Recursively traverse a FileSystemEntry, collecting files and directory
     * entries into `results`.
     */
    private traverseEntry;
    /**
     * Read all entries from a FileSystemDirectoryReader.  Chromium-based
     * browsers return at most 100 entries per `readEntries()` call, so we
     * must loop until an empty batch is returned.
     */
    private static readAllDirectoryEntries;
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
    handleDragOver(event: DragEvent): void;
    /**
     * Cleanup resources and unregister callbacks.
     *
     * Call this when the session is terminating or RdpFileTransferProvider is no longer needed.
     */
    dispose(): void;
    private handleFilesAvailable;
    /* Excluded from this release type: sanitizeFileName */
    /* Excluded from this release type: sanitizePath */
    private handleFileContentsRequest;
    /**
     * Mark a single upload file as fully served: record it, emit upload-complete once, and
     * finalize the batch once every counted file is accounted for. Shared by the RANGE onload
     * path (final chunk served) and the SIZE path for 0-byte files (which get no RANGE request).
     */
    private markUploadFileComplete;
    /**
     * Lazily rebuild uploadState from retainedFiles when the remote re-pastes
     * after the original upload completed. This lets the main code path in
     * handleFileContentsRequest handle progress and completion identically.
     * No external promise - resolve/reject are no-ops.
     */
    private rebuildUploadStateFromRetained;
    private handleFileContentsResponse;
    /**
     * Create a write handle for the given transfer and request the first
     * data chunk.  Runs asynchronously because backend initialization
     * (especially OPFS) is async.
     *
     * The init promise is stored on `state.writeHandleReady` so that
     * DATA responses arriving before the handle is ready can await it.
     */
    private initWriteHandleAndRequestFirstChunk;
    /**
     * Write a data chunk to the storage backend and advance the download.
     *
     * If the write handle is not yet ready (DATA response arrived before
     * backend init completed), this method awaits `state.writeHandleReady`
     * to preserve chunk ordering -- each concurrent caller awaits the same
     * promise in sequence.
     */
    private handleDataChunk;
    /** Abort and clean up a write handle, ignoring errors. */
    private abortWriteHandle;
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
    private handleFormatListResponse;
    private handleLock;
    private handleUnlock;
    private handleLocksExpired;
    private requestNextChunk;
    private generateStreamId;
}

/**
 * Configuration options for RdpFileTransferProvider.
 */
export declare interface RdpFileTransferProviderOptions {
    /**
     * Chunk size in bytes for file transfers.
     * Default: 65536 (64KB)
     */
    chunkSize?: number;
    /**
     * Called when an upload begins (before the FormatList is sent to the remote).
     * Use this to suppress clipboard monitoring so the 100ms polling loop does
     * not clobber the file upload's FormatList with a text/image update.
     */
    onUploadStarted?: () => void;
    /**
     * Called when an upload finishes (success, failure, or dispose).
     * Use this to resume clipboard monitoring after {@link onUploadStarted}.
     */
    onUploadFinished?: () => void;
    /**
     * Storage backend for downloads.
     *
     * Accepts either a preference string or a pre-constructed backend
     * instance (useful for testing or custom backends):
     *
     * - `'auto'` (default): use OPFS when available, fall back to
     *   in-memory Blob.  OPFS reduces peak RAM from ~2x file size to
     *   ~chunk size.
     * - `'blob'`: force in-memory Blob storage.
     * - `FileStorageBackend`: use the provided backend instance directly,
     *   bypassing auto-detection.
     */
    storageBackend?: StorageBackendPreference | FileStorageBackend;
}

export declare function requestFileContents(params: {
    stream_id: number;
    file_index: number;
    flags: number;
    position: number;
    size: number;
    clip_data_id?: number;
}): Extension;

declare enum RotationUnit {
    Pixel = 0,
    Line = 1,
    Page = 2,
}

declare class Session {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    applyInputs(transaction: InputTransaction): void;
    desktopSize(): DesktopSize;
    invokeExtension(ext: Extension): any;
    onClipboardPaste(content: ClipboardData): Promise<void>;
    releaseAllInputs(): void;
    resize(width: number, height: number, scale_factor?: number | null, physical_width?: number | null, physical_height?: number | null): void;
    run(): Promise<SessionTerminationInfo>;
    shutdown(): void;
    supportsUnicodeKeyboardShortcuts(): boolean;
    synchronizeLockKeys(scroll_lock: boolean, num_lock: boolean, caps_lock: boolean, kana_lock: boolean): void;
}

declare class SessionBuilder {
    free(): void;
    [Symbol.dispose](): void;
    authToken(token: string): SessionBuilder;
    canvasResizedCallback(callback: Function): SessionBuilder;
    connect(): Promise<Session>;
    constructor();
    desktopSize(desktop_size: DesktopSize): SessionBuilder;
    destination(destination: string): SessionBuilder;
    extension(ext: Extension): SessionBuilder;
    forceClipboardUpdateCallback(callback: Function): SessionBuilder;
    password(password: string): SessionBuilder;
    proxyAddress(address: string): SessionBuilder;
    remoteClipboardChangedCallback(callback: Function): SessionBuilder;
    renderCanvas(canvas: HTMLCanvasElement): SessionBuilder;
    serverDomain(server_domain: string): SessionBuilder;
    setCursorStyleCallbackContext(context: any): SessionBuilder;
    setCursorStyleCallback(callback: Function): SessionBuilder;
    username(username: string): SessionBuilder;
    webSocketProtocols(protocols: Array<any>): SessionBuilder;
}

declare class SessionTerminationInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    reason(): string;
}

/**
 * Storage backend preference for downloads.
 *
 * - `'auto'` - detect the best available backend (OPFS with Blob
 *   fallback).  OPFS reduces peak download RAM from ~2x file size to
 *   ~chunk size.
 * - `'blob'` - force in-memory Blob storage regardless of OPFS
 *   availability.
 */
export declare type StorageBackendPreference = 'auto' | 'blob';

export declare function submitFileContents(params: {
    stream_id: number;
    is_error: boolean;
    data: Uint8Array;
}): Extension;

/**
 * Progress information for file transfer operations.
 */
export declare interface TransferProgress {
    /** Unique identifier for this transfer operation, stable across the lifetime of the transfer */
    transferId: number;
    /** File index in the transfer list */
    fileIndex: number;
    /** File name */
    fileName: string;
    /** Number of bytes transferred so far */
    bytesTransferred: number;
    /** Total file size in bytes */
    totalBytes: number;
    /** Transfer progress as percentage (0-100) */
    percentage: number;
}

export declare function unlockCallback(cb: (dataId: number) => void): Extension;

/**
 * Result of initiating a file upload via {@link RdpFileTransferProvider.uploadFiles}.
 */
export declare interface UploadHandle {
    /** Map of file index to unique transfer identifier for each file in the batch */
    transferIds: Map<number, number>;
    /** Promise that resolves when all files in the batch have been uploaded */
    completion: Promise<void>;
}

export declare function vmConnect(vmId: string, mode?: VmConnectMode): Extension;

export declare type VmConnectMode = 'enhanced' | 'basic';

export { }
