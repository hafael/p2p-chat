// src/services/networkService.js
import { useNetworkStore } from '../stores/network';
import { createLibp2p } from 'libp2p';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { gossipsub } from '@libp2p/gossipsub';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { identify } from '@libp2p/identify';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { dcutr } from '@libp2p/dcutr';
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString } from 'uint8arrays';
import { pipe } from 'it-pipe';

// Serviços de criptografia para o chat
import { deriveSharedKey, encryptMessage, decryptMessage, generateFingerprint } from './crypto';

// --- Estado Interno do Serviço ---
let localIdentity = null;
let libp2pNode = null;
const chatStreams = new Map();

// --- Configuração do libp2p ---
const bootstrapNodes = [
  '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTf5zyDhrS3Saz8KVK',
  '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcXoagJQ'
];
const CHAT_PROTOCOL = '/p2p-chat-seguro/1.0.0';
const DISCOVERY_TOPIC = 'p2p-chat-discovery-topic-2025-v2';

/**
 * Inicializa o serviço de rede e o nó libp2p.
 */
export async function initialize(identity) {
  if (libp2pNode) return;
  localIdentity = identity;
  console.log(`[NetworkService] A inicializar para: ${identity.username}`);
  
  const networkStore = useNetworkStore();
  networkStore._setConnectionStatus('connecting');

  try {
    libp2pNode = await createLibp2p({
      transports: [
        webSockets(),
        webRTC(),
        circuitRelayTransport({
          discoverRelays: 1 // Tenta descobrir pelo menos 1 relay na rede
        })
      ],
      connectionEncryption: [noise()],
      streamMuxers: [mplex()],
      peerDiscovery: [
        pubsubPeerDiscovery({
          interval: 1000, // Procura por novos peers a cada segundo
          topics: [DISCOVERY_TOPIC]
        })
      ],
      services: {
        identify: identify(),
        pubsub: gossipsub({ allowPublishToZeroPeers: true, emitSelf: true }),
        dcutr: dcutr()
      }
    });

    await libp2pNode.start();
    networkStore._setConnectionStatus('connected');
    console.log('[NetworkService] Nó libp2p iniciado com PubSub Discovery. PeerId:', libp2pNode.peerId.toString());

    await libp2pNode.handle(CHAT_PROTOCOL, ({ stream }) => {
      const peerId = stream.remotePeer.toString();
      console.log(`[NetworkService] Recebida nova conexão de chat de: ${peerId}`);
      setupChatStreamEvents(peerId, stream, false);
    });

    libp2pNode.services.pubsub.subscribe(DISCOVERY_TOPIC);
    libp2pNode.services.pubsub.addEventListener('message', (evt) => {
      try {
        const message = JSON.parse(uint8ArrayToString(evt.detail.data));
        if (message.type === 'user-presence' && message.peerId !== libp2pNode.peerId.toString()) {
          const networkStore = useNetworkStore();
          const currentUsers = networkStore.onlineUsers;
          if (!currentUsers.some(u => u.id === message.peerId)) {
            const newUser = { id: message.peerId, username: message.username };
            networkStore._updateOnlineUsers([...currentUsers, newUser]);
          }
        }
      } catch (e) {
        console.warn("Recebida mensagem de descoberta malformada:", e);
      }
    });
    
    // Anuncia a nossa presença na rede periodicamente
    setInterval(() => {
      if (libp2pNode && libp2pNode.status === 'started') {
        const presenceMessage = JSON.stringify({
          type: 'user-presence',
          peerId: libp2pNode.peerId.toString(),
          username: localIdentity.username,
        });
        libp2pNode.services.pubsub.publish(DISCOVERY_TOPIC, uint8ArrayFromString(presenceMessage));
      }
    }, 10000);
    
    // Anúncio inicial após um breve atraso
    setTimeout(() => {
        if (libp2pNode && libp2pNode.status === 'started') {
            const presenceMessage = JSON.stringify({
                type: 'user-presence',
                peerId: libp2pNode.peerId.toString(),
                username: localIdentity.username,
            });
            libp2pNode.services.pubsub.publish(DISCOVERY_TOPIC, uint8ArrayFromString(presenceMessage));
        }
    }, 2000);

  } catch (err) {
    console.error("[NetworkService] Falha ao iniciar o nó libp2p:", err);
    networkStore._setConnectionStatus('disconnected');
  }
}

/**
 * Inicia uma nova sessão de chat com um peer-alvo.
 */
export async function startChatSession(targetPeerId) {
  if (!libp2pNode) return;

  console.log(`[Chat] A iniciar nova sessão de chat com: ${targetPeerId}`);
  try {
    const stream = await libp2pNode.dialProtocol(targetPeerId, CHAT_PROTOCOL);
    console.log(`[Chat] Stream para ${targetPeerId} estabelecido.`);
    setupChatStreamEvents(targetPeerId, stream, true);
  } catch (err) {
    console.error(`[Chat] Falha ao conectar com ${targetPeerId}:`, err);
    useNetworkStore()._setChatStatus(targetPeerId, 'failed');
  }
}

/**
 * Configura todos os eventos para um stream de chat P2P.
 */
async function setupChatStreamEvents(peerId, stream, isInitiator = false) {
  const networkStore = useNetworkStore();
  let sharedKey = null;

  chatStreams.set(peerId, { stream, sharedKey: null });

  if (isInitiator) {
    const payload = JSON.stringify({ type: 'handshake', publicKey: Array.from(localIdentity.publicKey) });
    await pipe([uint8ArrayFromString(payload)], stream.sink);
  }

  pipe(stream.source, async function (source) {
    for await (const msg of source) {
      try {
        const message = JSON.parse(uint8ArrayToString(msg.subarray()));
        
        if (['handshake', 'handshake-reply'].includes(message.type)) {
          const theirPublicKey = new Uint8Array(message.publicKey);
          const fingerprint = await generateFingerprint(theirPublicKey);
          networkStore._setChatFingerprint(peerId, fingerprint);

          const keys = await deriveSharedKey(localIdentity.privateKey, theirPublicKey);
          sharedKey = keys.sharedTx;
          chatStreams.get(peerId).sharedKey = sharedKey;

          networkStore._setChatStatus(peerId, 'connected');

          if (message.type === 'handshake') {
            const replyPayload = JSON.stringify({ type: 'handshake-reply', publicKey: Array.from(localIdentity.publicKey) });
            await pipe([uint8ArrayFromString(replyPayload)], stream.sink);
          }
          continue;
        }

        if (message.type === 'chat' && sharedKey) {
          const ciphertext = new Uint8Array(message.ciphertext);
          const nonce = new Uint8Array(message.nonce);
          const decryptedText = await decryptMessage(ciphertext, nonce, sharedKey);
          if (decryptedText !== null) {
            networkStore._addMessageToChat(peerId, { text: decryptedText, sender: 'them' });
          }
        }
      } catch (error) {
        console.error("Erro ao processar mensagem recebida no stream:", error);
      }
    }
  }).catch(err => {
    console.error(`[Chat] Stream com ${peerId} fechado com erro:`, err);
    networkStore._setChatStatus(peerId, 'disconnected');
    chatStreams.delete(peerId);
  });
}

/**
 * Envia uma mensagem de chat encriptada para um utilizador.
 */
export async function sendChatMessage(targetPeerId, messageText) {
  const chatState = chatStreams.get(targetPeerId);
  
  if (chatState && chatState.stream && chatState.sharedKey) {
    try {
      const { ciphertext, nonce } = await encryptMessage(messageText, chatState.sharedKey);
      const payload = {
        type: 'chat',
        ciphertext: Array.from(ciphertext),
        nonce: Array.from(nonce),
      };
      await pipe([uint8ArrayFromString(JSON.stringify(payload))], chatState.stream.sink);
    } catch (error) {
      console.error("[Chat] Erro ao encriptar ou enviar mensagem:", error);
    }
  } else {
    console.error(`[Chat] Não é possível enviar mensagem para ${targetPeerId}. A conexão segura não está pronta.`);
  }
}