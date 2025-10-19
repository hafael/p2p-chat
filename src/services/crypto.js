// src/services/crypto.js
import sodium from 'libsodium-wrappers';

/**
 * Inicializa o módulo libsodium. Essencial ser chamado antes de qualquer operação criptográfica.
 */
export async function init() {
  await sodium.ready;
  console.log('libsodium inicializado com sucesso.');
}

/**
 * Gera um par de chaves X25519 para o usuário.
 * @returns {Promise<{publicKey: Uint8Array, privateKey: Uint8Array}>}
 */
export async function generateKeyPair() {
  await sodium.ready;
  const { publicKey, privateKey } = sodium.crypto_box_keypair();
  return { publicKey, privateKey };
}

/**
 * Deriva uma chave de sessão compartilhada usando o handshake Diffie-Hellman (X25519).
 * @param {Uint8Array} myPrivateKey - A chave privada do usuário local.
 * @param {Uint8Array} theirPublicKey - A chave pública do contato.
 * @returns {Promise<{sharedRx: Uint8Array, sharedTx: Uint8Array}>} - Chaves para receber e enviar mensagens.
 */
export async function deriveSharedKey(myPrivateKey, theirPublicKey) {
  await sodium.ready;
  // Para comunicação P2P, as chaves são derivadas em ambas as direções
  const sharedKey = sodium.crypto_box_beforenm(theirPublicKey, myPrivateKey);
  // No protótipo, podemos usar a mesma chave para Rx e Tx para simplificar.
  // Em uma implementação mais robusta, as chaves seriam diferentes.
  return { sharedRx: sharedKey, sharedTx: sharedKey };
}

/**
 * Criptografa uma mensagem usando uma chave de sessão simétrica (ChaCha20-Poly1305).
 * @param {string} message - A mensagem a ser criptografada.
 * @param {Uint8Array} sharedKey - A chave de sessão compartilhada.
 * @returns {Promise<{ciphertext: Uint8Array, nonce: Uint8Array}>}
 */
export async function encryptMessage(message, sharedKey) {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, sharedKey);
  return { ciphertext, nonce };
}

/**
 * Decriptografa uma mensagem.
 * @param {Uint8Array} ciphertext - A mensagem cifrada.
 * @param {Uint8Array} nonce - O nonce usado na criptografia.
 * @param {Uint8Array} sharedKey - A chave de sessão compartilhada.
 * @returns {Promise<string|null>} - A mensagem decifrada ou null se a verificação falhar.
 */
export async function decryptMessage(ciphertext, nonce, sharedKey) {
  await sodium.ready;
  const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, sharedKey);
  // Retorna a mensagem como string UTF-8
  return sodium.to_string(decrypted);
}

/**
 * Gera um fingerprint (impressão digital) legível de uma chave pública.
 * Usa um hash criptográfico (BLAKE2b) e o formata para fácil comparação visual.
 * @param {Uint8Array} publicKey - A chave pública a ser processada.
 * @returns {Promise<string>} - Uma string formatada como 'XXXXX XXXXX XXXXX'.
 */
export async function generateFingerprint(publicKey) {
  await sodium.ready;
  // Gera um hash de 15 bytes da chave pública
  const hash = sodium.crypto_generichash(15, publicKey);
  
  // Converte os bytes do hash para uma string de números (ex: 255 -> "255")
  const numericString = Array.from(hash)
    .map(byte => byte.toString().padStart(3, '0'))
    .join('');
  
  // Agrupa a string numérica em 3 blocos de 5 dígitos para facilitar a leitura
  const part1 = numericString.slice(0, 5);
  const part2 = numericString.slice(5, 10);
  const part3 = numericString.slice(10, 15);

  return `${part1} ${part2} ${part3}`;
}