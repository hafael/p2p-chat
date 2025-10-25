// src/services/storage.js
import localforage from 'localforage';

// Configure localforage to use a specific name for our app
localforage.config({
  name: 'SecureP2PChat',
  storeName: 'identity',
  description: 'Secure storage for the user identity (keys and username)',
});

const IDENTITY_KEY = 'user_identity';

/**
 * Saves the complete user identity (profile, keys) to local storage.
 * @param {object} identity
 * @param {string} identity.username
 * @param {string} identity.displayName
 * @param {string} identity.avatarUrl
 * @param {Uint8Array} identity.publicKey
 * @param {Uint8Array} identity.privateKey
 * @param {string} identity.privateKeyString - The portable string representation of the private key.
 * @returns {Promise<object>} - The identity that was saved.
 */
export async function saveIdentity(identity) {
  return localforage.setItem(IDENTITY_KEY, identity);
}

/**
 * Loads the user identity from local storage.
 * @returns {Promise<object|null>} - The identity object or null if it doesn't exist.
 */
export async function loadIdentity() {
  return localforage.getItem(IDENTITY_KEY);
}

/**
 * Removes the user identity from local storage (for logout or reset).
 * @returns {Promise<void>}
 */
export async function clearIdentity() {
  return localforage.removeItem(IDENTITY_KEY);
}