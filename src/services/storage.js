// src/services/storage.js
import localforage from 'localforage';

// Configura o localforage para usar um nome específico para nosso app
localforage.config({
  name: 'ChatP2PSeguro',
  storeName: 'identidade',
  description: 'Armazenamento seguro da identidade do usuário (chaves e username)',
});

const IDENTITY_KEY = 'user_identity';

/**
 * Salva a identidade completa do usuário (username, chaves) no armazenamento local.
 * As chaves são armazenadas como Uint8Array.
 * @param {object} identity
 * @param {string} identity.username
 * @param {Uint8Array} identity.publicKey
 * @param {Uint8Array} identity.privateKey
 * @returns {Promise<object>} - A identidade que foi salva.
 */
export async function saveIdentity({ username, publicKey, privateKey }) {
  const identity = { username, publicKey, privateKey };
  return localforage.setItem(IDENTITY_KEY, identity);
}

/**
 * Carrega a identidade do usuário do armazenamento local.
 * @returns {Promise<object|null>} - O objeto de identidade ou null se não existir.
 */
export async function loadIdentity() {
  return localforage.getItem(IDENTITY_KEY);
}

/**
 * Remove a identidade do usuário do armazenamento local (para logout ou reset).
 * @returns {Promise<void>}
 */
export async function clearIdentity() {
  return localforage.removeItem(IDENTITY_KEY);
}