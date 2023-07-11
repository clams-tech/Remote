import { Subject } from 'rxjs'

export function formatLog(type: 'INFO' | 'WARN' | 'ERROR', msg: string): string {
  return `[${type} - ${new Date().toLocaleTimeString()}]: ${msg}`
}

export const logger = {
  info: (msg: string) => log$.next(formatLog('INFO', msg)),
  warn: (msg: string) => log$.next(formatLog('WARN', msg)),
  error: (msg: string) => log$.next(formatLog('ERROR', msg))
}

// debug logs
export const log$ = new Subject<string>()

log$.subscribe(console.log)
