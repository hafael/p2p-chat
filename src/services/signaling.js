// src/services/signaling.js
import { registerUser, findUser, listOnlineUsers, sendSignal as sendSignalToSupernode } from './supernode.js';

/**
 * Conecta-se ao supernó e registra a identidade do usuário atual.
 * @param {string} username - O nome do usuário.
 * @param {Uint8Array} publicKey - A chave pública do usuário.
 * @returns {Promise<any>}
 */
export async function connectAndRegister(username, publicKey) {
  console.log(`[Signaling] Registrando ${username} no supernó...`);
  // Em uma implementação real, aqui haveria uma chamada WebSocket ou HTTP/fetch.
  return registerUser(username, publicKey);
}

/**
 * Procura por um usuário na rede através do supernó.
 * @param {string} username - O username do contato desejado.
 * @returns {Promise<any>}
 */
export async function discoverUser(username) {
  console.log(`[Signaling] Procurando por ${username}...`);
  return findUser(username);
}

/**
 * Obtém a lista de usuários atualmente registrados no supernó.
 * @returns {Promise<string[]>}
 */
export async function getOnlineUsers() {
    console.log('[Signaling] Obtendo lista de usuários online...');
    return listOnlineUsers();
}

/**
 * Envia um sinal (oferta/resposta WebRTC) para um usuário através do supernó.
 * @param {string} toUsername - O destinatário do sinal.
 * @param {any} signalData - O payload de sinalização do simple-peer.
 */
export async function sendSignal(toUsername, signalData) {
  console.log(`[Signaling] Enviando sinal para ${toUsername}`);
  return sendSignalToSupernode(toUsername, signalData);
}

/**
* Verifica se há sinais pendentes para o usuário atual.
* @param {string} username - O nome do usuário atual.
* @returns {Promise<{user?: {publicKey: Uint8Array, signals: any[]}} | null>}
*/
export async function pollSignals(username) {
  // Reutilizamos a função findUser que agora retorna e limpa a fila de sinais
  const result = await findUser(username);
  if (result.found && result.user.signals.length > 0) {
      console.log(`[Signaling] ${result.user.signals.length} sinal(s) recebido(s) para ${username}`);
      return result;
  }
  return null;
}