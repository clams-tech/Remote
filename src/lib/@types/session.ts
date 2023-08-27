export type Session = {
  /** the session secret that is used for all sensisitive operations
   * which is encrypted at rest and must be decrypted
   * with a user passphrase
   */
  secret: string
  /** the secp256k1 derived public key */
  id: string
}
