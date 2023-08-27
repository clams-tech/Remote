export interface AppError {
  /** the i18n key that maps to a generic message to display to the user */
  key: string
  detail: {
    /** unix timestamp in seconds */
    timestamp: number
    /** the message direct from the implementation that gives
     * specific details on what went wrong to help with debugging
     */
    message: string
    /** the context the error occured. ie what was the app trying to do
     * at the time of error?
     */
    context: string
    /** if this error is associated with a specific wallet id */
    walletId?: string
  }
}
