import type { Session } from './@types/session.js'
import { createSecret, encryptWithAES, getPublicKey } from './crypto.js'

export const createNewSession = async (
  passphrase: string
): Promise<{ decrypted: Session; encrypted: Session }> => {
  const secret = createSecret()
  const publicKey = getPublicKey(secret)
  const encrypted = encryptWithAES(secret, passphrase)
  const id = publicKey

  return { encrypted: { secret: encrypted, id }, decrypted: { secret, id } }
}
