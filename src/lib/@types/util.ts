export type Notification = {
  id: string
  type: 'error' | 'hint' | 'success'
  heading: string
  message: string
}

export type Logger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export type ParsedNodeAddress = {
  publicKey: string
  ip: string
  port?: number
}
