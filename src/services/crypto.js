// src/services/crypto.js
import sodium from 'libsodium-wrappers';

/**
 * Initializes the libsodium module. Must be called before any crypto operations.
 */
export async function init() {
  await sodium.ready;
  console.log('libsodium initialized successfully.');
}

/**
 * Generates a X25519 key pair for the user.
 * @returns {Promise<{publicKey: Uint8Array, privateKey: Uint8Array}>}
 */
export async function generateKeyPair() {
  await sodium.ready;
  const { publicKey, privateKey } = sodium.crypto_box_keypair();
  return { publicKey, privateKey };
}

/**
 * Derives a shared session key using Diffie-Hellman handshake (X25519).
 * @param {Uint8Array} myPrivateKey - The local user's private key.
 * @param {Uint8Array} theirPublicKey - The contact's public key.
 * @returns {Promise<{sharedRx: Uint8Array, sharedTx: Uint8Array}>} - Keys for receiving and sending messages.
 */
export async function deriveSharedKey(myPrivateKey, theirPublicKey) {
  await sodium.ready;
  const sharedKey = sodium.crypto_box_beforenm(theirPublicKey, myPrivateKey);
  // For this prototype, we can use the same key for Rx and Tx to simplify.
  // In a more robust implementation, these keys would be different.
  return { sharedRx: sharedKey, sharedTx: sharedKey };
}

/**
 * Encrypts a message using a symmetric session key (ChaCha20-Poly1305).
 * @param {string} message - The message to be encrypted.
 * @param {Uint8Array} sharedKey - The shared session key.
 * @returns {Promise<{ciphertext: Uint8Array, nonce: Uint8Array}>}
 */
export async function encryptMessage(message, sharedKey) {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, sharedKey);
  return { ciphertext, nonce };
}

/**
 * Decrypts a message.
 * @param {Uint8Array} ciphertext - The encrypted message.
 * @param {Uint8Array} nonce - The nonce used for encryption.
 * @param {Uint8Array} sharedKey - The shared session key.
 * @returns {Promise<string|null>} - The decrypted message or null if verification fails.
 */
export async function decryptMessage(ciphertext, nonce, sharedKey) {
  await sodium.ready;
  const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, sharedKey);
  // Returns the message as a UTF-8 string
  return sodium.to_string(decrypted);
}

/**
 * Generates a human-readable fingerprint from a public key.
 * Uses a cryptographic hash (BLAKE2b) and formats it for easy visual comparison.
 * @param {Uint8Array} publicKey - The public key to process.
 * @returns {Promise<string>} - A formatted string like 'XXXXX XXXXX XXXXX'.
 */
export async function generateFingerprint(publicKey) {
  await sodium.ready;
  const hash = sodium.crypto_generichash(15, publicKey);
  
  const numericString = Array.from(hash)
    .map(byte => byte.toString().padStart(3, '0'))
    .join('');
  
  const part1 = numericString.slice(0, 5);
  const part2 = numericString.slice(5, 10);
  const part3 = numericString.slice(10, 15);

  return `${part1} ${part2} ${part3}`;
}