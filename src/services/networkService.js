// src/services/networkService.js
import { useNetworkStore } from '../stores/network';
import { createLibp2p } from 'libp2p';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { gossipsub } from '@libp2p/gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { identify } from '@libp2p/identify';
import { ping } from '@libp2p/ping';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { dcutr } from '@libp2p/dcutr';
import { autoNAT } from '@libp2p/autonat';
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString } from 'uint8arrays';
import { pipe } from 'it-pipe';

// Crypto services for the chat
import { deriveSharedKey, encryptMessage, decryptMessage, generateFingerprint } from './crypto';

// --- Internal Service State ---
let localIdentity = null;
let libp2pNode = null;
const chatStreams = new Map();

// --- Libp2p Config ---
const bootstrapNodes = [
  "/ip4/104.131.131.82/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
        "/dnsaddr/bootstrap.libp2p.io/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
        "/dnsaddr/bootstrap.libp2p.io/ipfs/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
];
const CHAT_PROTOCOL = '/secure-p2p-chat/1.0.0';
const DISCOVERY_TOPIC = 'p2p-chat-discovery-topic-2025-v2';

/**
 * Initializes the network service and the libp2p node.
 */
export async function initialize(identity) {
  if (libp2pNode) return;
  localIdentity = identity;
  console.log(`[NetworkService] Initializing for: ${identity.username}`);
  
  const networkStore = useNetworkStore();
  networkStore._setConnectionStatus('connecting');

  try {
    libp2pNode = await createLibp2p({
      transports: [
        webSockets(),
        webRTC(),
        // This transport is essential for NAT traversal.
        // It allows us to connect to peers through a relay.
        circuitRelayTransport({
          discoverRelays: 2 // Discover and use up to 2 relays
        })
      ],
      connectionEncryption: [noise()],
      streamMuxers: [mplex()],
      peerDiscovery: [
        bootstrap({
          list: bootstrapNodes
        })
      ],
      services: {
        identify: identify({
          protocolPrefix: 'libp2p', // Ensure the identify protocol is properly configured
        }),
        dht: kadDHT({
          clientMode: true, // A browser node must be a client
        }),
        autoNAT: autoNAT(), // Helps the node understand its network condition
        dcutr: dcutr(), // Helps upgrade relayed connections to direct ones
        ping: ping(),
        pubsub: gossipsub({ 
          // allowPublishToZeroPeers: true, 
          // emitSelf: false 
        }),
      }
    });

    // Add diagnostic listeners
    libp2pNode.addEventListener('peer:discovery', (evt) => {
      console.log(`[Diagnostic] Discovered peer: ${evt.detail.id.toString()}`);
    });
    libp2pNode.addEventListener('peer:connect', (evt) => {
      console.log(`[Diagnostic] Connected to peer: ${evt.detail.toString()}`);
    });
    libp2pNode.addEventListener('peer:disconnect', (evt) => {
        console.log(`[Diagnostic] Disconnected from peer: ${evt.detail.toString()}`);
    });

    await libp2pNode.start();
    networkStore._setConnectionStatus('connected');
    console.log('[NetworkService] Libp2p node started. PeerId:', libp2pNode.peerId.toString());

    // Log all addresses, including relayed ones
    console.log('[NetworkService] Listening on addresses:');
    libp2pNode.getMultiaddrs().forEach(addr => console.log(addr.toString()));

    await libp2pNode.handle(CHAT_PROTOCOL, ({ stream }) => {
      const peerId = stream.remotePeer.toString();
      console.log(`[NetworkService] Received new chat connection from: ${peerId}`);
      setupChatStreamEvents(peerId, stream, false);
    });

    // Subscribe to the discovery topic
    libp2pNode.services.pubsub.subscribe(DISCOVERY_TOPIC);
    libp2pNode.services.pubsub.addEventListener('message', (evt) => {
      console.log('received pubsub message on topic:', evt.detail.topic);
      try {
        if (evt.detail.topic !== DISCOVERY_TOPIC) return;
        
        const message = JSON.parse(uint8ArrayToString(evt.detail.data));
        if (message.peerId === libp2pNode.peerId.toString()) return;

        if (message.type === 'user-presence') {
          const networkStore = useNetworkStore();
          const currentUsers = networkStore.onlineUsers;
          if (!currentUsers.some(u => u.id === message.peerId)) {
            const newUser = { id: message.peerId, username: message.username };
            console.log(`[NetworkService] User presence received: ${newUser.username}`);
            networkStore._updateOnlineUsers([...currentUsers, newUser]);
          }
        }
      } catch (e) {
        console.warn("Received malformed discovery message:", e);
      }
    });
    
    // Announce our presence on the network periodically
    const announcePresence = async () => {
      console.log('[NetworkService] Announcing presence on the network...');
      if (libp2pNode?.status !== 'started') return;

      const peersSubscribed = libp2pNode.services.pubsub.getSubscribers(DISCOVERY_TOPIC);
      if (!peersSubscribed) {
        console.warn('[NetworkService] No peers subscribed to the discovery topic. Announcing presence anyway.');
      }

      const presenceMessage = JSON.stringify({
        type: 'user-presence',
        peerId: libp2pNode.peerId.toString(),
        username: localIdentity.username,
      });
      
      try {
        await libp2pNode.services.pubsub.publish(DISCOVERY_TOPIC, uint8ArrayFromString(presenceMessage));
      } catch (err) {
        console.warn(`[NetworkService] Could not publish presence: ${err.message}`);
      }
    };

    setInterval(announcePresence, 15000);
    setTimeout(announcePresence, 5000);

  } catch (err) {
    console.error("[NetworkService] Failed to start libp2p node:", err);
    networkStore._setConnectionStatus('disconnected');
  }
}

// ... the rest of the file remains the same ...

export async function startChatSession(targetPeerId) {
  if (!libp2pNode) return;
  console.log(`[Chat] Starting new chat session with: ${targetPeerId}`);
  try {
    const stream = await libp2pNode.dialProtocol(targetPeerId, CHAT_PROTOCOL);
    console.log(`[Chat] Stream to ${targetPeerId} established.`);
    setupChatStreamEvents(targetPeerId, stream, true);
  } catch (err) {
    console.error(`[Chat] Failed to connect with ${targetPeerId}:`, err);
    useNetworkStore()._setChatStatus(targetPeerId, 'failed');
  }
}

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
        console.error("Error processing incoming stream message:", error);
      }
    }
  }).catch(err => {
    console.error(`[Chat] Stream with ${peerId} closed with error:`, err);
    networkStore._setChatStatus(peerId, 'disconnected');
    chatStreams.delete(peerId);
  });
}

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
      console.error("[Chat] Error encrypting or sending message:", error);
    }
  } else {
    console.error(`[Chat] Cannot send message to ${targetPeerId}. Secure connection not ready.`);
  }
}