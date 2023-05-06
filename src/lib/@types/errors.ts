export type Error = {
  /** timestamp unix milliseconds */
  timestamp: number
  /** error msg */
  message: string
  /** string indicating what the app was trying to do
   * at the time of error
   */
  context: string
  /** Optional code (usually from CLN) */
  code?: number
  /** the node this error was associated with */
  nodeId: string
}
