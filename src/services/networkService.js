// src/services/networkService.js

import { useNetworkStore } from '../stores/network';
import { createPeer } from './p2p'; // Usaremos nosso serviço P2P existente

let localIdentity = null;
let hostPeer = null; // O peer que usamos para aceitar clientes quando somos supernó
let upstreamConnection = null;

/**
 * Inicializa o serviço de rede com a identidade do usuário.
 * @param {{username: string, publicKey: Uint8Array, privateKey: Uint8Array}} identity
 */
export function initialize(identity) {
  localIdentity = identity;
  console.log(`[NetworkService] Inicializado para o usuário: ${identity.username}`);
}

/**
 * Ativa o modo supernó, gerando um código de convite e preparando para aceitar clientes.
 */
export function enableSupernodeMode() {
    const networkStore = useNetworkStore();
    if (hostPeer) hostPeer.destroy();
  
    hostPeer = createPeer(true); // Somos o iniciador da conexão
  
    hostPeer.on('signal', (offer) => {
      // Codifica a oferta para ser compartilhada como código de convite
      const inviteCode = btoa(JSON.stringify(offer));
      networkStore.mySupernodeCode = inviteCode;
    });
  
    hostPeer.on('connect', () => {
      console.log('[Supernó] Novo cliente conectado!');
      // TODO: Adicionar cliente à lista e gerenciar a rede
    });
  
    hostPeer.on('error', (err) => { console.error('[Supernó] Erro no host peer:', err); });
}

export function acceptClientConnection(responseCode) {
    if (!hostPeer) return console.error('[Supernó] Modo supernó não está ativo.');
    try {
      const answer = JSON.parse(atob(responseCode));
      hostPeer.signal(answer); // Finaliza a conexão
    } catch (err) {
      console.error('[Supernó] Código de resposta inválido:', err);
    }
}

/**
 * Desativa o modo supernó, desconectando todos os clientes.
 */
export function disableSupernodeMode() {
    if (hostPeer) hostPeer.destroy();
    hostPeer = null;
    console.log('[Supernó] Modo supernó desativado.');
}

/**
 * Conecta este cliente a um supernó usando um código de convite.
 * @param {string} inviteCode
 */
export function connectToSupernode(inviteCode) {
    const networkStore = useNetworkStore();
    if (upstreamConnection) upstreamConnection.destroy();
    
    try {
      const offer = JSON.parse(atob(inviteCode));
      upstreamConnection = createPeer(false); // Não somos o iniciador
  
      upstreamConnection.on('signal', (answer) => {
        // Codifica nossa resposta para ser enviada de volta ao supernó
        const responseCode = btoa(JSON.stringify(answer));
        networkStore._setClientResponseCode(responseCode);
      });
  
      upstreamConnection.on('connect', () => {
        console.log('[Cliente] Conectado ao supernó com sucesso!');
        networkStore._setConnectionStatus('connected');
        networkStore._setClientResponseCode(''); // Limpa o código de resposta
        // TODO: Pedir a lista de usuários
      });
  
      upstreamConnection.on('error', (err) => {
        console.error('[Cliente] Erro ao conectar com supernó:', err);
        networkStore._setConnectionStatus('disconnected');
      });
  
      upstreamConnection.signal(offer); // Inicia a conexão
    } catch (err) {
      console.error('[Cliente] Código de convite inválido:', err);
      networkStore._setConnectionStatus('disconnected');
    }
}

/**
 * Inicia uma sessão de chat com outro usuário.
 * @param {string} targetUsername
 */
export function startChatSession(targetUsername) {
    // TODO: Usar a conexão `upstreamConnection` para enviar um sinal de oferta.
}