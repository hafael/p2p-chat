import { useNetworkStore } from '../stores/network';
import { createPeer } from './p2p';
import { deriveSharedKey, encryptMessage, decryptMessage, generateFingerprint } from './crypto';

// --- Estado Interno do Serviço ---

let localIdentity = null;
// Mapa para gerenciar múltiplos clientes que se conectam a nós (quando somos supernó)
const hostPeers = new Map();
let nextPeerId = 0;

// Nossa conexão P2P com o supernó que usamos para descoberta
let upstreamConnection = null;

// Mapa para gerenciar as conexões de chat diretas e suas chaves de sessão
// Estrutura: Map<username, { peer: Peer.Instance, sharedKey: Uint8Array | null }>
const chatPeers = new Map();

// --- Lógica de Conexão com Failover ---
let knownSupernodesCache = [];
let currentSupernodeIndex = -1;
let isAttemptingConnection = false;


/**
 * Inicializa o serviço de rede com a identidade do usuário.
 */
export function initialize(identity) {
  localIdentity = identity;
  console.log(`[NetworkService] Inicializado para o usuário: ${identity.username}`);
}

// --- LÓGICA DO MODO SUPERNÓ (HOST) ---

/**
 * Ativa o modo supernó, gerando um código de convite para o primeiro cliente.
 */
export function enableSupernodeMode() {
  console.log('[NetworkService] Habilitando modo supernó...');
  createNewHostPeer();
}

/**
 * Cria uma nova instância de peer para aceitar um cliente, gerando um novo código de convite.
 */
function createNewHostPeer() {
  const networkStore = useNetworkStore();
  const peerId = nextPeerId++;
  const peer = createPeer(true); // O supernó sempre inicia a conexão

  peer.on('signal', (offer) => {
    const inviteCode = btoa(JSON.stringify(offer));
    networkStore.mySupernodeCode = inviteCode;
  });

  peer.on('connect', () => {
    console.log(`[Supernó] Cliente (id: ${peerId}) estabeleceu conexão P2P.`);
    // Aguarda a mensagem de 'identify' do cliente.
  });

  peer.on('data', (data) => {
    handleSupernodeData(peerId, JSON.parse(data.toString()));
  });

  peer.on('close', () => {
    const clientUsername = hostPeers.get(peerId)?.username;
    console.log(`[Supernó] Cliente ${clientUsername || `(id: ${peerId})`} desconectado.`);
    hostPeers.delete(peerId);
    broadcastUserList(); // Atualiza a lista para os clientes restantes
  });

  peer.on('error', (err) => {
    console.error(`[Supernó] Erro no peer host (id: ${peerId}):`, err);
    hostPeers.delete(peerId);
    broadcastUserList();
  });

  hostPeers.set(peerId, { peer, username: null });
}

/**
 * Aceita a resposta de um cliente e finaliza a conexão P2P com ele.
 */
export function acceptClientConnection(responseCode) {
    const pendingPeerEntry = Array.from(hostPeers.entries()).find(([, p]) => !p.peer.connected);
    if (!pendingPeerEntry) return console.error('[Supernó] Nenhum peer aguardando conexão.');
    
    const peer = pendingPeerEntry[1].peer;
    try {
      const answer = JSON.parse(atob(responseCode));
      peer.signal(answer);
      // Após aceitar, gera um novo código para o próximo cliente
      createNewHostPeer();
    } catch (err) {
      console.error('[Supernó] Código de resposta do cliente inválido:', err);
    }
}

/**
 * Processa mensagens recebidas dos clientes conectados.
 */
function handleSupernodeData(fromPeerId, message) {
  const client = hostPeers.get(fromPeerId);
  if (!client) return;

  if (message.type === 'identify') {
    client.username = message.username;
    broadcastUserList();
  } 
  // Encaminha sinais de chat para o destinatário correto
  else if (['chat-offer', 'chat-answer', 'chat-signal'].includes(message.type)) {
    const targetPeer = Array.from(hostPeers.values()).find(p => p.username === message.to);
    if (targetPeer && targetPeer.peer.connected) {
      console.log(`[Supernó] Encaminhando ${message.type} de ${client.username} para ${message.to}`);
      // Adiciona a informação de origem para o destinatário saber quem enviou
      const forwardedMessage = { ...message, from: client.username };
      targetPeer.peer.send(JSON.stringify(forwardedMessage));
    }
  }
}

/**
 * Envia a lista de todos os usuários conectados para todos os clientes.
 */
function broadcastUserList() {
  const users = [localIdentity.username]; // O supernó também está na lista
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


// --- LÓGICA DO MODO CLIENTE (COM FAILOVER) ---

/**
 * Inicia o processo de conexão à rede, iterando sobre a lista de supernós conhecidos.
 * @param {Array} supernodes - A lista de supernós do store.
 */
export function connectToNetwork(supernodes) {
  if (isAttemptingConnection || (upstreamConnection && upstreamConnection.connected)) {
    return; // Já conectado ou a tentar conectar
  }
  
  console.log('[Cliente] Iniciando ciclo de conexão à rede...');
  knownSupernodesCache = supernodes;
  currentSupernodeIndex = -1; // Começa do início
  tryNextSupernode();
}

/**
 * Tenta conectar-se ao próximo supernó disponível na lista.
 */
function tryNextSupernode() {
  const networkStore = useNetworkStore();
  currentSupernodeIndex++;

  if (currentSupernodeIndex >= knownSupernodesCache.length) {
    console.log('[Cliente] Tentou todos os supernós conhecidos. Nenhuma conexão estabelecida.');
    networkStore._setConnectionStatus('disconnected');
    isAttemptingConnection = false;
    return;
  }

  isAttemptingConnection = true;
  networkStore._setConnectionStatus('connecting');
  
  const node = knownSupernodesCache[currentSupernodeIndex];
  console.log(`[Cliente] Tentando conectar ao supernó #${currentSupernodeIndex + 1}...`);

  try {
    const offer = JSON.parse(atob(node.code));
    
    if (upstreamConnection) upstreamConnection.destroy();
    
    upstreamConnection = createPeer(false);

    const connectionTimeout = setTimeout(() => {
      console.warn(`[Cliente] Timeout ao conectar com o supernó #${currentSupernodeIndex + 1}.`);
      upstreamConnection.destroy();
    }, 15000);

    upstreamConnection.on('signal', (answer) => {
      const responseCode = btoa(JSON.stringify(answer));
      networkStore._setClientResponseCode(responseCode);
    });

    upstreamConnection.on('connect', () => {
      clearTimeout(connectionTimeout);
      console.log(`[Cliente] Conectado ao supernó #${currentSupernodeIndex + 1} com sucesso!`);
      isAttemptingConnection = false;
      networkStore.activeSupernodeIndex = currentSupernodeIndex;
      networkStore._setConnectionStatus('connected');
      upstreamConnection.send(JSON.stringify({ type: 'identify', username: localIdentity.username }));
    });

    upstreamConnection.on('data', (data) => handleUpstreamData(JSON.parse(data.toString())));
    
    upstreamConnection.on('close', () => {
      clearTimeout(connectionTimeout);
      console.log(`[Cliente] Conexão com o supernó #${currentSupernodeIndex + 1} fechada.`);
      if (!isAttemptingConnection) {
        tryNextSupernode();
      }
    });

    upstreamConnection.on('error', (err) => {
      clearTimeout(connectionTimeout);
      console.error(`[Cliente] Erro na conexão com o supernó #${currentSupernodeIndex + 1}:`, err);
    });

    upstreamConnection.signal(offer);
  } catch (err) {
    console.error(`[Cliente] Código de convite do supernó #${currentSupernodeIndex + 1} é inválido.`, err);
    tryNextSupernode();
  }
}

/**
 * Desconecta do supernó atual.
 */
export function disconnectFromUpstream() {
    if (upstreamConnection) {
        upstreamConnection.destroy();
        upstreamConnection = null;
    }
    isAttemptingConnection = false;
    currentSupernodeIndex = -1;
    const networkStore = useNetworkStore();
    networkStore._setConnectionStatus('disconnected');
    networkStore._updateOnlineUsers([]);
}

/**
 * Processa mensagens recebidas do supernó.
 */
function handleUpstreamData(message) {
  const networkStore = useNetworkStore();
  
  if (message.type === 'user-list') {
    networkStore._updateOnlineUsers(message.users);
  } else if (message.type === 'chat-offer') {
    const fromUsername = message.from;
    console.log(`[Cliente] Recebendo oferta de chat de ${fromUsername}`);
    
    const peer = createPeer(false);
    peer.on('signal', (signal) => {
      sendUpstream({ type: 'chat-answer', to: fromUsername, signal });
    });
    
    setupChatPeerEvents(fromUsername, peer);
    peer.signal(message.signal);
    chatPeers.set(fromUsername, { peer, sharedKey: null });
    networkStore.startOrShowChat(fromUsername);
  } else if (message.type === 'chat-answer') {
    const peerData = chatPeers.get(message.from);
    if (peerData) {
      peerData.peer.signal(message.signal);
    }
  }
}

/**
 * Envia uma mensagem para o supernó ao qual estamos conectados.
 */
function sendUpstream(message) {
  if (upstreamConnection && upstreamConnection.connected) {
    upstreamConnection.send(JSON.stringify(message));
  } else {
    console.error("[Cliente] Não conectado a um supernó para enviar mensagem.");
  }
}


// --- LÓGICA DE CHAT DIRETO (P2P) ---

/**
 * Inicia uma nova sessão de chat com um usuário-alvo.
 */
export function startChatSession(targetUsername) {
  console.log(`[Cliente] Iniciando sessão de chat com ${targetUsername}`);
  const peer = createPeer(true); // O iniciador do chat

  peer.on('signal', (signal) => {
    sendUpstream({ type: 'chat-offer', to: targetUsername, signal });
  });

  setupChatPeerEvents(targetUsername, peer);
  chatPeers.set(targetUsername, { peer, sharedKey: null });
}

/**
 * Configura todos os eventos para uma conexão de chat P2P.
 */
function setupChatPeerEvents(username, peer) {
  const networkStore = useNetworkStore();
  
  peer.on('connect', () => {
    console.log(`[Chat] Conexão P2P direta com ${username} estabelecida.`);
    if (peer.initiator) {
      peer.send(JSON.stringify({ type: 'handshake', publicKey: Array.from(localIdentity.publicKey) }));
    }
  });

  peer.on('data', async (data) => {
    const message = JSON.parse(data.toString());
    const peerData = chatPeers.get(username);
    
    if (['handshake', 'handshake-reply'].includes(message.type)) {
      const theirPublicKey = new Uint8Array(message.publicKey);
      const fingerprint = await generateFingerprint(theirPublicKey);
      networkStore._setChatFingerprint(username, fingerprint);

      const keys = await deriveSharedKey(localIdentity.privateKey, theirPublicKey);
      if(peerData) peerData.sharedKey = keys.sharedTx;

      networkStore._setChatStatus(username, 'connected');

      if (message.type === 'handshake') {
        peer.send(JSON.stringify({ type: 'handshake-reply', publicKey: Array.from(localIdentity.publicKey) }));
      }
      return;
    }
    
    if (message.type === 'chat' && peerData?.sharedKey) {
      try {
        const ciphertext = new Uint8Array(message.ciphertext);
        const nonce = new Uint8Array(message.nonce);
        const decryptedText = await decryptMessage(ciphertext, nonce, peerData.sharedKey);
        if (decryptedText !== null) {
          networkStore._addMessageToChat(username, { text: decryptedText, sender: 'them' });
        }
      } catch (error) {
        console.error("Erro ao processar mensagem recebida:", error);
      }
    }
  });

  peer.on('close', () => {
    console.log(`[Chat] Conexão com ${username} fechada.`);
    networkStore._setChatStatus(username, 'disconnected');
    chatPeers.delete(username);
  });
  
  peer.on('error', (err) => {
    console.error(`[Chat] Erro na conexão com ${username}:`, err);
    peer.destroy();
  });
}

/**
 * Envia uma mensagem de chat criptografada para um usuário.
 */
export async function sendChatMessage(targetUsername, messageText) {
  const peerData = chatPeers.get(targetUsername);
  
  if (peerData && peerData.peer.connected && peerData.sharedKey) {
    try {
      const { ciphertext, nonce } = await encryptMessage(messageText, peerData.sharedKey);
      const payload = {
        type: 'chat',
        ciphertext: Array.from(ciphertext),
        nonce: Array.from(nonce),
      };
      peerData.peer.send(JSON.stringify(payload));
    } catch (error) {
      console.error("[Chat] Erro ao criptografar ou enviar mensagem:", error);
    }
  } else {
    console.error(`[Chat] Não é possível enviar mensagem para ${targetUsername}. Conexão não está pronta ou segura.`);
  }
}