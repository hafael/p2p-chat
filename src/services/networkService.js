// src/services/networkService.js

import { useNetworkStore } from '../stores/network';
import { createPeer } from './p2p'; // Usaremos nosso serviço P2P existente

let localIdentity = null;
let hostPeer = null; // O peer que usamos para aceitar clientes quando somos supernó
const hostPeers = new Map(); // Mapa para gerenciar múltiplos clientes se conectando a nós
let nextPeerId = 0;
let upstreamConnection = null; // Nossa conexão P2P com o supernó que usamos

/**
 * Inicializa o serviço de rede com a identidade do usuário.
 * @param {{username: string, publicKey: Uint8Array, privateKey: Uint8Array}} identity
 */
export function initialize(identity) {
  localIdentity = identity;
  console.log(`[NetworkService] Inicializado para o usuário: ${identity.username}`);
}

// --- LÓGICA DO MODO SUPERNÓ ---

export function enableSupernodeMode() {
    createNewHostPeer(); // Gera o primeiro código de convite
}

function createNewHostPeer() {
    const networkStore = useNetworkStore();
    const peerId = nextPeerId++;
    const peer = createPeer(true); // Somos o iniciador

    peer.on('signal', (offer) => {
        const inviteCode = btoa(JSON.stringify({ offer, from: localIdentity.username }));
        networkStore.mySupernodeCode = inviteCode;
    });

    peer.on('connect', () => {
        console.log(`[Supernó] Cliente (id: ${peerId}) estabeleceu conexão P2P.`);
        // O primeiro dado que o cliente nos enviará é sua identidade
    });

    peer.on('data', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'identify') {
        console.log(`[Supernó] Cliente se identificou como: ${message.username}`);
        hostPeers.get(peerId).username = message.username;
        broadcastUserList(); // Envia a lista atualizada para todos
        }
    });

    peer.on('close', () => {
        console.log(`[Supernó] Cliente ${hostPeers.get(peerId)?.username} desconectado.`);
        hostPeers.delete(peerId);
        broadcastUserList(); // Envia a lista atualizada
        createNewHostPeer(); // Gera um novo código para o próximo cliente
    });

    peer.on('error', (err) => {
        console.error(`[Supernó] Erro no peer host (id: ${peerId}):`, err);
        hostPeers.delete(peerId);
        broadcastUserList();
    });

    hostPeers.set(peerId, { peer, username: null });
}

export function acceptClientConnection(responseCode) {
    if (hostPeers.size === 0) return console.error('[Supernó] Nenhum peer aguardando conexão.');
    
    // Usa o último peer criado que ainda não tem username
    const lastEntry = Array.from(hostPeers.entries()).pop();
    if (lastEntry && !lastEntry[1].username) {
      const peer = lastEntry[1].peer;
      try {
        const answer = JSON.parse(atob(responseCode));
        peer.signal(answer);
      } catch (err) {
        console.error('[Supernó] Código de resposta inválido:', err);
      }
    }
}

function broadcastUserList() {
    const users = [localIdentity.username]; // Inclui a si mesmo
    for (const client of hostPeers.values()) {
      if (client.username) {
        users.push(client.username);
      }
    }
    
    console.log('[Supernó] Transmitindo lista de usuários:', users);
    const message = JSON.stringify({ type: 'user-list', users });
  
    for (const client of hostPeers.values()) {
      if (client.peer.connected) {
        client.peer.send(message);
      }
    }
  }

/**
 * Desativa o modo supernó, desconectando todos os clientes.
 */
export function disableSupernodeMode() {
    for (const { peer } of hostPeers.values()) {
      peer.destroy();
    }
    hostPeers.clear();
    nextPeerId = 0;
    console.log('[Supernó] Modo supernó desativado.');
}

// --- LÓGICA DO MODO CLIENTE ---

/**
 * Conecta este cliente a um supernó usando um código de convite.
 * @param {string} inviteCode
 */
export function connectToSupernode(inviteCode) {
    const networkStore = useNetworkStore();
    if (upstreamConnection) upstreamConnection.destroy();
    
    try {
      const { offer, from } = JSON.parse(atob(inviteCode));
      upstreamConnection = createPeer(false);
  
      upstreamConnection.on('signal', (answer) => {
        const responseCode = btoa(JSON.stringify(answer));
        networkStore._setClientResponseCode(responseCode);
      });
  
      upstreamConnection.on('connect', () => {
        console.log('[Cliente] Conectado ao supernó com sucesso!');
        networkStore._setConnectionStatus('connected');
        networkStore._setClientResponseCode('');
        
        // Assim que conectar, envia nossa identidade para o supernó
        upstreamConnection.send(JSON.stringify({ type: 'identify', username: localIdentity.username }));
      });
  
      upstreamConnection.on('data', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'user-list') {
          console.log('[Cliente] Lista de usuários recebida:', message.users);
          networkStore._updateOnlineUsers(message.users);
        }
      });
  
      upstreamConnection.on('error', (err) => {
        console.error('[Cliente] Erro na conexão com supernó:', err);
        networkStore._setConnectionStatus('disconnected');
      });
      
      upstreamConnection.on('close', () => {
        networkStore._setConnectionStatus('disconnected');
        networkStore._updateOnlineUsers([]);
      });
  
      upstreamConnection.signal(offer);
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