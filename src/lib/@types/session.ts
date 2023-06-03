export type Session = {
  /** the session secret that is used for connections
   * which is encrypted at rest and must be decrypted
   * with a user passphrase
   */
  secret: string
}
