import { describe, it, expect, beforeAll } from 'vitest'
import {
  init,
  generateKeyPair,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  exportKeyToString,
  importKeyFromString,
  generateFingerprint,
} from '@/services/crypto.js'

describe('crypto.js', () => {
  beforeAll(async () => {
    await init()
  })

  it('should generate a valid key pair', async () => {
    const keyPair = await generateKeyPair()
    expect(keyPair.publicKey).toBeInstanceOf(Uint8Array)
    expect(keyPair.privateKey).toBeInstanceOf(Uint8Array)
  })

  it('should export and import a key pair', async () => {
    const keyPair = await generateKeyPair()
    const exportedKey = await exportKeyToString(keyPair.privateKey)
    const importedKeyPair = await importKeyFromString(exportedKey)

    expect(importedKeyPair.publicKey).toEqual(keyPair.publicKey)
    expect(importedKeyPair.privateKey).toEqual(keyPair.privateKey)
  })

  it('should derive a shared key', async () => {
    const aliceKeyPair = await generateKeyPair()
    const bobKeyPair = await generateKeyPair()

    const sharedKeyAlice = await deriveSharedKey(aliceKeyPair.privateKey, bobKeyPair.publicKey)
    const sharedKeyBob = await deriveSharedKey(bobKeyPair.privateKey, aliceKeyPair.publicKey)

    expect(sharedKeyAlice.sharedRx).toEqual(sharedKeyBob.sharedTx)
    expect(sharedKeyAlice.sharedTx).toEqual(sharedKeyBob.sharedRx)
  })

  it('should encrypt and decrypt a message', async () => {
    const aliceKeyPair = await generateKeyPair()
    const bobKeyPair = await generateKeyPair()

    const sharedKey = await deriveSharedKey(aliceKeyPair.privateKey, bobKeyPair.publicKey)

    const message = 'This is a secret message'
    const { ciphertext, nonce } = await encryptMessage(message, sharedKey.sharedTx)

    const decryptedMessage = await decryptMessage(ciphertext, nonce, sharedKey.sharedRx)

    expect(decryptedMessage).toBe(message)
  })

  it('should generate a fingerprint', async () => {
    const keyPair = await generateKeyPair()
    const fingerprint = await generateFingerprint(keyPair.publicKey)

    expect(fingerprint).toMatch(/^\d{5} \d{5} \d{5}$/)
  })
})
