// src/services/networkService.js
import { createLibp2p } from 'libp2p';
import { peerIdFromString } from '@libp2p/peer-id';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';
import { yamux } from '@chainsafe/libp2p-yamux';
import { noise } from '@chainsafe/libp2p-noise';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { ping } from '@libp2p/ping';
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString } from 'uint8arrays';
import { pipe } from 'it-pipe';

import { useNetworkStore } from '../stores/network';

// --- Constants ---
const BOOTSTRAP_MULTIADDRS = [
  "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
  "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
];

const USER_DISCOVERY_TOPIC = '/secure-p2p-chat/user-discovery/1.0.0';
const CONTACT_REQUEST_PROTOCOL = '/secure-p2p-chat/contact-request/1.0.0';
const DIRECT_CHAT_PROTOCOL = '/secure-p2p-chat/direct-message/1.0.0';
const GROUP_CHAT_TOPIC_PREFIX = '/secure-p2p-chat/group/';

// --- Internal State ---
let libp2pNode = null;
let localIdentity = null;
const directChatStreams = new Map();
const pendingUserQueries = new Map();

// --- Core Network Functions ---
export async function initialize(identity) {
  if (libp2pNode) return;
  localIdentity = identity;
  const networkStore = useNetworkStore();
  networkStore._setConnectionStatus('connecting');

  try {
    libp2pNode = await createLibp2p({
      transports: [webSockets(), webRTC(), circuitRelayTransport({ discoverRelays: 1 })],
      connectionEncryption: [noise()],
      streamMuxers: [yamux()],
      peerDiscovery: [
        bootstrap({ list: BOOTSTRAP_MULTIADDRS }),
        pubsubPeerDiscovery({
          interval: 1000, // Every second
          topics: [USER_DISCOVERY_TOPIC]
        })
      ],
      services: {
        identify: identify(),
        ping: ping(),
        pubsub: gossipsub({ allowPublishToZeroPeers: true }),
      },
    });

    setupNodeListeners();
    await libp2pNode.start();

    networkStore._setConnectionStatus('connected');
    networkStore._setPeerId(libp2pNode.peerId.toString());
    networkStore._setPeerCount(libp2pNode.getPeers().length);

    libp2pNode.services.pubsub.subscribe(USER_DISCOVERY_TOPIC);

  } catch (error) {
    console.error('[NetworkService] Failed to initialize libp2p node:', error);
    networkStore._setConnectionStatus('disconnected');
  }
}

function setupNodeListeners() {
  libp2pNode.addEventListener('peer:connect', (evt) => {
    const peerId = evt.detail.toString();
    const networkStore = useNetworkStore();
    networkStore._setContactOnlineStatus(peerId, true);
    networkStore._setPeerCount(libp2pNode.getPeers().length);
  });

  libp2pNode.addEventListener('peer:disconnect', (evt) => {
    const peerId = evt.detail.toString();
    const networkStore = useNetworkStore();
    networkStore._setContactOnlineStatus(peerId, false);
    networkStore._setPeerCount(libp2pNode.getPeers().length);
  });

  libp2pNode.handle(DIRECT_CHAT_PROTOCOL, handleDirectChatStream);
  libp2pNode.handle(CONTACT_REQUEST_PROTOCOL, handleContactRequestStream);
  libp2pNode.services.pubsub.addEventListener('message', handlePubSubMessage);
}

export async function shutdown() {
  if (!libp2pNode) return;
  await libp2pNode.stop();
  libp2pNode = null;
  localIdentity = null;
  directChatStreams.clear();
  pendingUserQueries.clear();
  useNetworkStore().$reset();
}

// --- User Discovery ---
export async function findUser(username) {
  const queryId = `${username}-${Date.now()}`;
  const query = { type: 'query', username, queryId };

  const promise = new Promise((resolve) => {
    pendingUserQueries.set(queryId, resolve);
    setTimeout(() => {
      if (pendingUserQueries.has(queryId)) {
        pendingUserQueries.delete(queryId);
        resolve(null); // Timeout
      }
    }, 10000); // 10-second timeout
  });

  await libp2pNode.services.pubsub.publish(USER_DISCOVERY_TOPIC, uint8ArrayFromString(JSON.stringify(query)));
  return promise;
}

function handlePubSubMessage(evt) {
  const { from, topic, data } = evt.detail;
  if (from.toString() === libp2pNode.peerId.toString()) return;

  try {
    const networkStore = useNetworkStore();
    const message = JSON.parse(uint8ArrayToString(data));

    if (topic === USER_DISCOVERY_TOPIC) {
      if (networkStore.isOffline) {
        return; // Ignore discovery messages when offline
      }
      if (message.type === 'query' && message.username === localIdentity.username) {
        const response = {
          type: 'response',
          queryId: message.queryId,
          user: {
            peerId: libp2pNode.peerId.toString(),
            username: localIdentity.username,
            displayName: localIdentity.displayName,
            avatarUrl: localIdentity.avatarUrl,
          },
        };
        libp2pNode.services.pubsub.publish(USER_DISCOVERY_TOPIC, uint8ArrayFromString(JSON.stringify(response)));
      } else if (message.type === 'response' && pendingUserQueries.has(message.queryId)) {
        const resolve = pendingUserQueries.get(message.queryId);
        resolve(message.user);
        pendingUserQueries.delete(message.queryId);
      }
    } else if (topic.startsWith(GROUP_CHAT_TOPIC_PREFIX)) {
      const networkStore = useNetworkStore();
      networkStore._addMessageToGroup(topic, { ...message, senderId: from.toString() });
    }
  } catch (error) {
    console.warn(`[NetworkService] Error handling pubsub message on topic ${topic}:`, error);
  }
}

// --- Group Chat ---
export function createGroup(groupName) {
  const groupId = `${GROUP_CHAT_TOPIC_PREFIX}${Date.now()}`;
  libp2pNode.services.pubsub.subscribe(groupId);
  const networkStore = useNetworkStore();
  networkStore._addGroup({ id: groupId, name: groupName });
  // Automatically select the new group
  networkStore.setActiveChat(groupId, 'group');
}

export async function sendGroupMessage(groupId, text) {
  const message = {
    text,
    senderUsername: localIdentity.displayName || localIdentity.username,
    timestamp: Date.now(),
  };
  await libp2pNode.services.pubsub.publish(groupId, uint8ArrayFromString(JSON.stringify(message)));
}

// --- Contact Management ---
async function handleContactRequestStream({ stream }) {
  const networkStore = useNetworkStore();
  if (networkStore.isOffline) {
    stream.close();
    return;
  }
  const peerId = stream.remotePeer.toString();
  try {
    await pipe(stream, async (source) => {
      for await (const msg of source) {
        const message = JSON.parse(uint8ArrayToString(msg.subarray()));
        const networkStore = useNetworkStore();

        if (message.type === 'request') {
          networkStore._addContactRequest({ ...message.profile, peerId });
        } else if (message.type === 'response') {
          if (message.accepted) {
            networkStore._addContact({ ...message.profile, peerId });
          }
        }
      }
    });
  } catch (err) {
    console.error(`Error handling contact request from ${peerId}:`, err);
  }
}

export async function sendContactRequest(peerId) {
  const stream = await libp2pNode.dialProtocol(peerId, CONTACT_REQUEST_PROTOCOL);
  const request = {
    type: 'request',
    profile: {
      username: localIdentity.username,
      displayName: localIdentity.displayName,
      avatarUrl: localIdentity.avatarUrl,
    },
  };
  await pipe([uint8ArrayFromString(JSON.stringify(request))], stream);
}

export async function respondToContactRequest(peerId, accepted) {
  const stream = await libp2pNode.dialProtocol(peerId, CONTACT_REQUEST_PROTOCOL);
  const response = {
    type: 'response',
    accepted,
    profile: {
      username: localIdentity.username,
      displayName: localIdentity.displayName,
      avatarUrl: localIdentity.avatarUrl,
    },
  };
  await pipe([uint8ArrayFromString(JSON.stringify(response))], stream);
}

// --- Direct Chat ---
export async function ensureConnection(peerId) {
  if (libp2pNode.getConnections(peerIdFromString(peerId)).length > 0) return;
  await libp2pNode.dial(peerIdFromString(peerId));
}

function handleDirectChatStream({ stream }) {
  const peerId = stream.remotePeer.toString();
  directChatStreams.set(peerId, stream);
  const networkStore = useNetworkStore();

  pipe(stream.source, async (source) => {
    for await (const msg of source) {
      const message = JSON.parse(uint8ArrayToString(msg.subarray()));
      networkStore._addDirectMessage(peerId, { text: message.text, sender: 'them', timestamp: Date.now() });
    }
  }).catch(err => console.error(`Pipe error in direct chat with ${peerId}:`, err));
}

export async function sendMessage(peerId, text) {
  const stream = directChatStreams.get(peerId);
  if (!stream) throw new Error(`No active stream to peer ${peerId}`);
  const message = JSON.stringify({ text });
  await pipe([uint8ArrayFromString(message)], stream.sink);
}
