// src/services/networkService.js
import { createLibp2p } from 'libp2p';
import { peerIdFromString } from '@libp2p/peer-id';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { identify } from '@libp2p/identify';
import { yamux } from '@chainsafe/libp2p-yamux';
import { noise } from '@chainsafe/libp2p-noise';
import { gossipsub } from '@libp2p/gossipsub';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { webRTC, webRTCDirect } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { webTransport } from '@libp2p/webtransport';
import { ping } from '@libp2p/ping';
import { createDelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client';
import { multiaddr as Multiaddr } from '@multiformats/multiaddr';
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString } from 'uint8arrays';
import { pipe } from 'it-pipe';
import first from 'it-first';
import { sha256 } from 'multiformats/hashes/sha2';

import { useNetworkStore } from '../stores/network';

// --- Constants ---

// Public bootstrap peer IDs. We will resolve their multiaddrs using a delegated router.
const BOOTSTRAP_PEER_IDS = [
  '12D3KooWFhXabKDwALpzqMbto94sB7rvmZ6M28hs9Y9xSopDKwQr'
];

// Topic for discovering peers specifically interested in this chat app via PubSub.
const PUBSUB_PEER_DISCOVERY_TOPIC = 'secure-p2p-chat-browser-peer-discovery';

// PubSub topic for broadcasting user presence (online/offline status).
const PRESENCE_TOPIC = 'secure-p2p-chat';

// Protocol ID for direct, one-to-one chat streams.
const DIRECT_CHAT_PROTOCOL = '/secure-p2p-chat/direct-message/1.0.0';

// --- Internal State ---
let libp2pNode = null;
let localIdentity = null;
const directChatStreams = new Map(); // Stores active direct chat streams: { peerId: Stream }

// --- Helper Functions (from reference) ---

/**
 * Constructs a multiaddr string for a circuit relay v2 listen address.
 * @param {Multiaddr} maddr - The multiaddress of the relay.
 * @param {import('@libp2p/interface').PeerId} peer - The PeerId of the relay.
 * @returns {string}
 */
const getRelayListenAddr = (maddr, peer) =>
  `${maddr.toString()}/p2p/${peer.toString()}/p2p-circuit`;

/**
 * Resolves bootstrap PeerIDs to multiaddrs dialable from the browser.
 * @param {import('@helia/delegated-routing-v1-http-api-client').DelegatedRoutingV1HttpApiClient} client
 * @returns {Promise<string[]>}
 */
async function getRelayListenAddrs(client) {
  const peers = await Promise.all(BOOTSTRAP_PEER_IDS.map((peerId) => first(client.getPeers(peerIdFromString(peerId)))));

  const relayListenAddrs = [];
  for (const p of peers) {
    if (p && p.Addrs.length > 0) {
      for (const maddr of p.Addrs) {
        const multiaddr = Multiaddr(maddr);
        const protos = multiaddr.getComponents().map(c => c.name);
        // Filter for secure websockets over IPv4 to avoid potential issues
        if (protos.includes('wss')) {
          if (multiaddr.getComponents().some(c => c.name === 'ip4' && c.value === '127.0.0.1')) continue; // skip loopback
          relayListenAddrs.push(getRelayListenAddr(multiaddr, p.ID));
        }
      }
    }
  }
  return relayListenAddrs;
}

/**
 * Dials a list of WebRTC multiaddrs one by one until a connection is established.
 * @param {import('libp2p').Libp2p} libp2p
 * @param {Multiaddr[]} multiaddrs
 */
async function dialWebRTCMaddrs(libp2p, multiaddrs) {
  const webRTCMaddrs = multiaddrs.filter((m) => m.getComponents().map(c => c.name).includes('webrtc'));
  if (webRTCMaddrs.length === 0) return;

  console.log(`[NetworkService] Dialing ${webRTCMaddrs.length} WebRTC multiaddrs...`);
  for (const addr of webRTCMaddrs) {
    try {
      console.log(`[NetworkService] Attempting to dial WebRTC multiaddr: ${addr}`);
      await libp2p.dial(addr);
      return; // Success, no need to try other addresses
    } catch (error) {
      console.warn(`[NetworkService] Failed to dial WebRTC multiaddr: ${addr}`, error.message);
    }
  }
}


// --- Core Network Functions ---

/**
 * Initializes the libp2p node, sets up services, and connects to the network.
 * @param {object} identity - The user's identity { username }.
 */
export async function initialize(identity) {
  if (libp2pNode) {
    console.warn('[NetworkService] Node is already initialized.');
    return;
  }
  localIdentity = identity;
  const networkStore = useNetworkStore();
  networkStore._setConnectionStatus('connecting');

  try {
    // Use a public delegated routing endpoint to find bootstrap peers
    const delegatedClient = createDelegatedRoutingV1HttpApiClient('https://delegated-ipfs.dev');
    const relayListenAddrs = await getRelayListenAddrs(delegatedClient);
    console.log(`[NetworkService] Starting libp2p with ${relayListenAddrs.length} relay listen addresses.`);

    // Custom message ID function for gossipsub
    const msgIdFnStrictNoSign = async function(msg) {
      const signedMessage = msg;
      const encodedSeqNum = uint8ArrayFromString(signedMessage.sequenceNumber.toString());
      const hash = await sha256.digest(encodedSeqNum);
      return hash.bytes;
    };

    libp2pNode = await createLibp2p({
      addresses: {
        listen: [
          '/webrtc', // Listen for direct WebRTC connections
          ...relayListenAddrs, // Listen on discovered relays
        ],
      },
      transports: [
        webTransport(),
        webSockets(),
        webRTC(),
        webRTCDirect(), // Required for direct connections with peers like the Rust peer
        circuitRelayTransport(), // Required for hole punching
      ],
      connectionEncryption: [noise()],
      streamMuxers: [yamux()],
      connectionGater: {
        denyDialMultiaddr: async () => false, // Allow all dials
      },
      peerDiscovery: [
        pubsubPeerDiscovery({
          topics: [PUBSUB_PEER_DISCOVERY_TOPIC],
          listenOnly: false,
        }),
      ],
      services: {
        identify: identify(),
        ping: ping(),
        pubsub: gossipsub({
          allowPublishToZeroPeers: true,
          msgIdFn: msgIdFnStrictNoSign,
          ignoreDuplicatePublishError: true,
        }),
        // Delegated routing helps discover ephemeral multiaddrs of bootstrap peers
        delegatedRouting: () => delegatedClient,
      },
    });

    // Set up handlers for incoming connections and messages
    setupNodeListeners();

    // Explicitly dial peers discovered via pubsub to improve connectivity
    libp2pNode.addEventListener('peer:discovery', (evt) => {
      const { id, multiaddrs } = evt.detail;
      if (libp2pNode.getConnections(id)?.length > 0) {
        console.log(`[NetworkService] Already connected to ${id}, skipping dial.`);
        return;
      }
      dialWebRTCMaddrs(libp2pNode, multiaddrs);
    });

    await libp2pNode.start();
    console.log('[NetworkService] Libp2p node started with PeerId:', libp2pNode.peerId.toString());

    networkStore._setConnectionStatus('connected');
    networkStore._setPeerId(libp2pNode.peerId.toString());

    // Subscribe to the presence topic to see who is online
    libp2pNode.services.pubsub.subscribe(PRESENCE_TOPIC);
    //libp2pNode.services.pubsub.subscribe(PUBSUB_PEER_DISCOVERY_TOPIC);

    // Announce our presence to the network
    setInterval(announcePresence, 20000); // Announce every 20 seconds
    setTimeout(announcePresence, 2000); // Announce quickly after startup

  } catch (error) {
    console.error('[NetworkService] Failed to initialize libp2p node:', error);
    networkStore._setConnectionStatus('disconnected');
    if (error.code === 'ERR_NO_VALID_ADDRESSES') {
      console.error("Could not find valid addresses. Check network connectivity and bootstrap node availability.");
    }
  }
}

/**
 * Sets up the global event listeners for the libp2p node for debugging and functionality.
 */
function setupNodeListeners() {
    libp2pNode.addEventListener('self:peer:update', () => {
      console.log('[NetworkService] Peer Update - Listening on addresses:');
      libp2pNode.getMultiaddrs().forEach(addr => console.log(addr.toString()));
    });

    libp2pNode.addEventListener('peer:connect', (evt) => {
        const peerId = evt.detail.toString();
        console.log(`✅ [NetworkService] Peer connected: ${peerId}`);
        setTimeout(announcePresence, 500); // Announce presence after connecting to a new peer
    });

    libp2pNode.addEventListener('peer:disconnect', (evt) => {
        const peerId = evt.detail.toString();
        console.log(`❌ [NetworkService] Peer disconnected: ${peerId}`);
        useNetworkStore()._removeOnlineUser(peerId);
    });

    // Handler for incoming direct chat streams
    libp2pNode.handle(DIRECT_CHAT_PROTOCOL, ({ stream }) => {
        console.log(`[NetworkService] Received direct chat stream from ${stream.remotePeer.toString()}`);
        handleDirectChatStream(stream);
    });

    // Handler for all pubsub messages
    libp2pNode.services.pubsub.addEventListener('message', handlePubSubMessage);
}


/**
 * Gracefully stops the libp2p node and cleans up connections.
 */
export async function shutdown() {
  if (!libp2pNode) return;

  try {
    const offlineMessage = JSON.stringify({ type: 'offline' });
    await libp2pNode.services.pubsub.publish(PRESENCE_TOPIC, uint8ArrayFromString(offlineMessage));
  } catch (error) {
    console.warn('[NetworkService] Could not publish offline presence:', error.message);
  }

  await libp2pNode.stop();
  libp2pNode = null;
  localIdentity = null;
  directChatStreams.clear();
  useNetworkStore().$reset(); // Reset the entire store to initial state
  console.log('[NetworkService] Libp2p node has been stopped.');
}

// --- Presence and Discovery (PubSub) ---

/**
 * Periodically broadcasts an 'online' message to the presence topic.
 */
async function announcePresence() {
  if (libp2pNode?.status !== 'started') return;
  const presenceMsg = JSON.stringify({
    type: 'online',
    username: localIdentity.username,
  });
  try {
    // Publish to both topics for discovery and presence

    console.log(`[NetworkService] Peers in gossip for topic ${PRESENCE_TOPIC}:`, libp2pNode.services.pubsub.getSubscribers(PRESENCE_TOPIC).toString())

    await libp2pNode.services.pubsub.publish(PUBSUB_PEER_DISCOVERY_TOPIC, uint8ArrayFromString(presenceMsg));
    await libp2pNode.services.pubsub.publish(PRESENCE_TOPIC, uint8ArrayFromString(presenceMsg));
  } catch (error) {
    console.warn('[NetworkService] Failed to announce presence:', error.message);
  }
}

/**
 * Handles incoming messages from PubSub topics (presence and group chats).
 */
function handlePubSubMessage(evt) {
    const { from, topic, data } = evt.detail;
    if (from.toString() === libp2pNode.peerId.toString()) return; // Ignore our own messages

    try {
        const message = JSON.parse(uint8ArrayToString(data));
        const networkStore = useNetworkStore();

        if (topic === PRESENCE_TOPIC || topic === PUBSUB_PEER_DISCOVERY_TOPIC) {
            if (message.type === 'online') {
                networkStore._addOnlineUser({ id: from.toString(), username: message.username });
            } else if (message.type === 'offline') {
                networkStore._removeOnlineUser(from.toString());
            }
        } else { // It's a group chat message
            const groupId = topic;
            if (message.type === 'group-chat') {
                networkStore._addMessageToGroup(groupId, { ...message, senderId: from.toString() });
            } else if (message.type === 'group-control') {
                handleGroupControlMessage(groupId, from.toString(), message);
            }
        }
    } catch (error) {
        console.warn(`[NetworkService] Error handling pubsub message on topic ${topic}:`, error);
    }
}


// --- Direct Chat (1-to-1 via Protocol Streams) ---

/**
 * Dials a peer to establish a direct, encrypted chat stream.
 * @param {string} peerId - The PeerId of the user to connect with.
 */
export async function startDirectChat(peerId) {
    if (directChatStreams.has(peerId)) {
        console.log(`[NetworkService] Direct chat stream with ${peerId} already open.`);
        return;
    }
    console.log(`[NetworkService] Dialing ${peerId} for protocol ${DIRECT_CHAT_PROTOCOL}...`);
    try {
        const stream = await libp2pNode.dialProtocol(peerId, DIRECT_CHAT_PROTOCOL);
        console.log(`[NetworkService] Successfully dialed ${peerId} for direct chat.`);
        handleDirectChatStream(stream);
    } catch (error) {
        console.error(`[NetworkService] Failed to dial protocol ${DIRECT_CHAT_PROTOCOL} with ${peerId}:`, error);
        useNetworkStore()._setChatStatus(peerId, 'failed');
    }
}

/**
 * Handles a newly established direct chat stream (both incoming and outgoing).
 * @param {import('libp2p').Stream} stream - The libp2p stream object.
 */
function handleDirectChatStream(stream) {
    const peerId = stream.remotePeer.toString();
    if (directChatStreams.has(peerId)) {
      console.warn(`[NetworkService] Already handling stream for ${peerId}. Closing new stream.`);
      stream.abort(new Error('Duplicate stream detected'));
      return;
    }
    directChatStreams.set(peerId, stream);
    const networkStore = useNetworkStore();
    networkStore._setChatStatus(peerId, 'connected');
    console.log(`[NetworkService] Direct chat stream with ${peerId} established.`);

    pipe(
        stream.source,
        async function (source) {
            for await (const msg of source) {
                try {
                    const data = msg.subarray ? msg.subarray() : msg;
                    const message = JSON.parse(uint8ArrayToString(data));
                    networkStore._addDirectMessage(peerId, { text: message.text, sender: 'them', timestamp: Date.now() });
                } catch (error) {
                    console.error(`[NetworkService] Error processing direct message from ${peerId}:`, error);
                }
            }
        }
    ).catch(error => {
        console.error(`[NetworkService] Pipe error on stream with ${peerId}:`, error.message);
        if (stream.status === 'open') stream.abort(error);
    }).finally(() => {
        if (directChatStreams.has(peerId)) {
             console.log(`[NetworkService] Pipe finished for stream with ${peerId}. Cleaning up.`);
             directChatStreams.delete(peerId);
             networkStore._setChatStatus(peerId, 'disconnected');
        }
    });
}


/**
 * Sends a message over an established direct chat stream.
 * @param {string} peerId - The recipient's PeerId.
 * @param {string} text - The message to send.
 */
export async function sendDirectMessage(peerId, text) {
  const stream = directChatStreams.get(peerId);
  if (!stream || stream.status !== 'open') {
    console.error(`[NetworkService] No active/open direct stream to ${peerId}. Cannot send message.`);
    useNetworkStore()._setChatStatus(peerId, 'disconnected');
    directChatStreams.delete(peerId);
    return;
  }
  try {
    const message = JSON.stringify({ text });
    await pipe([uint8ArrayFromString(message)], stream.sink);
  } catch (error) {
    console.error(`[NetworkService] Failed to send direct message to ${peerId}:`, error);
     stream.abort(error);
     directChatStreams.delete(peerId);
     useNetworkStore()._setChatStatus(peerId, 'failed');
  }
}


// --- Group Chat & Management (PubSub) ---

/**
 * Creates a new group, subscribes to its topic.
 * @param {string} groupName - The desired name for the group.
 * @returns {string} The unique ID (topic) of the newly created group.
 */
export function createGroup(groupName) {
    const groupId = `/secure-p2p-chat/group/${Date.now()}-${Math.random().toString(16).substring(2)}`;
    const adminId = libp2pNode.peerId.toString();
    const currentUser = { id: adminId, username: localIdentity.username };

    useNetworkStore()._addGroup({
        id: groupId,
        name: groupName,
        adminId,
        members: [currentUser],
    });

    libp2pNode.services.pubsub.subscribe(groupId);
    console.log(`[NetworkService] Created and subscribed to group '${groupName}' (${groupId})`);
    return groupId;
}

/**
 * Sends a chat message to a specific group topic.
 * @param {string} groupId - The topic string of the group.
 * @param {string} text - The message content.
 */
export async function sendGroupMessage(groupId, text) {
    if (!libp2pNode || libp2pNode.status !== 'started') return;

    const message = {
        type: 'group-chat',
        text,
        senderUsername: localIdentity.username,
        timestamp: Date.now(),
    };
    try {
        await libp2pNode.services.pubsub.publish(groupId, uint8ArrayFromString(JSON.stringify(message)));
    } catch (error) {
        console.error(`[NetworkService] Failed to publish group message to ${groupId}:`, error);
    }
}

/**
 * Sends a control command for managing a group (admin only).
 * @param {string} groupId - The group's topic.
 * @param {string} command - The command to execute.
 * @param {object} payload - Data for the command.
 */
async function sendGroupControlCommand(groupId, command, payload) {
    if (!libp2pNode || libp2pNode.status !== 'started') return;
    const group = useNetworkStore().groups[groupId];

    if (!group || group.adminId !== libp2pNode.peerId.toString()) {
        return console.error('[NetworkService] Action denied: You are not the admin of this group.');
    }

    const controlMessage = {
        type: 'group-control',
        command,
        payload,
        adminId: group.adminId,
    };

    try {
        await libp2pNode.services.pubsub.publish(groupId, uint8ArrayFromString(JSON.stringify(controlMessage)));
        handleGroupControlMessage(groupId, group.adminId, controlMessage);
    } catch (error) {
        console.error(`[NetworkService] Failed to publish group control command to ${groupId}:`, error);
    }
}


/**
 * Handles incoming group control messages and updates the store.
 * @param {string} groupId - The group topic.
 * @param {string} fromPeerId - The sender of the command.
 * @param {object} message - The parsed control message.
 */
function handleGroupControlMessage(groupId, fromPeerId, message) {
    const networkStore = useNetworkStore();
    const group = networkStore.groups[groupId];

    if (!group || group.adminId !== fromPeerId || message.adminId !== group.adminId) {
        return console.warn(`[NetworkService] Unauthorized control message for group ${groupId} from ${fromPeerId}.`);
    }

    const { command, payload } = message;

    switch (command) {
        case 'add_user':
            if (payload.user && payload.user.id && payload.user.username) {
              networkStore._addUserToGroup(groupId, payload.user);
              if (payload.user.id === libp2pNode.peerId.toString()) {
                  libp2pNode.services.pubsub.subscribe(groupId);
                  if (!networkStore.groups[groupId]) {
                      networkStore._addGroup({ id: groupId, name: 'Unknown Group', adminId: fromPeerId, members: [payload.user] });
                  }
              }
            } else {
                 console.warn(`[NetworkService] Invalid 'add_user' payload for group ${groupId}:`, payload);
            }
            break;

        case 'remove_user':
            if (payload.userId) {
                networkStore._removeUserFromGroup(groupId, payload.userId);
                if (payload.userId === libp2pNode.peerId.toString()) {
                    libp2pNode.services.pubsub.unsubscribe(groupId);
                    networkStore._removeGroup(groupId);
                }
            } else {
                 console.warn(`[NetworkService] Invalid 'remove_user' payload for group ${groupId}:`, payload);
            }
            break;

        case 'clear_messages':
            networkStore._clearGroupMessages(groupId);
            break;

        case 'delete_group':
            libp2pNode.services.pubsub.unsubscribe(groupId);
            networkStore._removeGroup(groupId);
            break;

        default:
            console.warn(`[NetworkService] Received unknown group command: '${command}'`);
    }
}


// --- Public API for Group Admin Actions ---

export const addUserToGroup = (groupId, user) => sendGroupControlCommand(groupId, 'add_user', { user });
export const removeUserFromGroup = (groupId, userId) => sendGroupControlCommand(groupId, 'remove_user', { userId });
export const clearGroupMessages = (groupId) => sendGroupControlCommand(groupId, 'clear_messages', {});
export const deleteGroup = (groupId) => sendGroupControlCommand(groupId, 'delete_group', {});