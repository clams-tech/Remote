/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
  // interface Locals {}
  // interface Platform {}
  // interface Session {}
  // interface Stuff {}
}

declare namespace svelteHTML {
  interface HTMLAttributes {
    'on:swipe'?: (event: string) => void
  }
}

declare interface Window {
  __TAURI__: boolean
}

interface Window {
  NDEFMessage: NDEFMessage
}
declare class NDEFMessage {
  constructor(messageInit: NDEFMessageInit)
  records: ReadonlyArray<NDEFRecord>
}
declare interface NDEFMessageInit {
  records: NDEFRecordInit[]
}

declare type NDEFRecordDataSource = string | BufferSource | NDEFMessageInit

interface Window {
  NDEFRecord: NDEFRecord
}
declare class NDEFRecord {
  constructor(recordInit: NDEFRecordInit)
  readonly recordType: string
  readonly mediaType?: string
  readonly id?: string
  readonly data?: DataView
  readonly encoding?: string
  readonly lang?: string
  toRecords?: () => NDEFRecord[]
}
declare interface NDEFRecordInit {
  recordType: string
  mediaType?: string
  id?: string
  encoding?: string
  lang?: string
  data?: NDEFRecordDataSource
}

declare type NDEFMessageSource = string | BufferSource | NDEFMessageInit

interface Window {
  NDEFReader: NDEFReader
}
declare class NDEFReader extends EventTarget {
  constructor()
  onreading: (this: this, event: NDEFReadingEvent) => unknown
  onreadingerror: (this: this, error: Event) => unknown
  scan: (options?: NDEFScanOptions) => Promise<void>
  write: (message: NDEFMessageSource, options?: NDEFWriteOptions) => Promise<void>
}

interface Window {
  NDEFReadingEvent: NDEFReadingEvent
}
declare class NDEFReadingEvent extends Event {
  constructor(type: string, readingEventInitDict: NDEFReadingEventInit)
  serialNumber: string
  message: NDEFMessage
}
interface NDEFReadingEventInit extends EventInit {
  serialNumber?: string
  message: NDEFMessageInit
}

interface NDEFWriteOptions {
  overwrite?: boolean
  signal?: AbortSignal
}
interface NDEFScanOptions {
  signal: AbortSignal
}
