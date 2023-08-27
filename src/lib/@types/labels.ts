/** BIP329 */
export type Label = {
  type: 'tx' | 'addr' | 'pubkey' | 'input' | 'output' | 'xpub' | 'invoice'
  ref: string
  label: string
  /**Optional key origin information referencing the wallet associated with the label */
  origin?: string
  spendable?: boolean
}
