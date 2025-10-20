// src/services/networkService.js
import { createLibp2p } from 'libp2p';
import { bootstrap } from '@libp2p/bootstrap';
import { circuitRelayTransport, circuitRelayServer } from '@libp2p/circuit-relay-v2';
import { dcutr } from '@libp2p/dcutr';
import { identify } from '@libp2p/identify';
import { mplex } from '@libp2p/mplex';
import { noise } from '@chainsafe/libp2p-noise';
import { gossipsub } from '@libp2p/gossipsub';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString } from 'uint8arrays';
import { pipe } from 'it-pipe';
import { multiaddr } from '@multiformats/multiaddr';

import { useNetworkStore } from '../stores/network';

// --- Constants ---

// A known, public WebRTC relay node. This is the crucial part for browser connectivity.
const RELAY_NODE = '/ip4/159.223.189.83/udp/4001/webrtc-direct/certhash/uEiAIc3s_eros01-k5FfA6nI7smf3Eygz0rG22pB52r93zQ';

// PubSub topic for broadcasting user presence (online/offline status).
const PRESENCE_TOPIC = '/secure-p2p-chat/presence/1.0.0';

// Protocol ID for direct, one-to-one chat streams.
const DIRECT_CHAT_PROTOCOL = '/secure-p2p-chat/direct/1.0.0';

// --- Internal State ---
let libp2pNode = null;
let localIdentity = null;
const directChatStreams = new Map(); // Stores active direct chat streams: { peerId: Stream }

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
    libp2pNode = await createLibp2p({
      // Addresses to listen on.
      addresses: {
        listen: [
          '/webrtc', // Listen for WebRTC connections
        ],
      },
      transports: [
        // WebSockets with a filter to only connect to public bootstrap nodes
        webSockets(),
        webRTC(),
        // Circuit relay is essential for NAT traversal.
        circuitRelayTransport({
          discoverRelays: 1, // We will also use a hardcoded relay
        }),
      ],
      connectionEncryption: [noise()],
      streamMuxers: [mplex()],
      peerDiscovery: [
        bootstrap({
          list: [
            // Add the public relay to the bootstrap list
            RELAY_NODE,
          ],
        }),
      ],
      services: {
        identify: identify(),
        // dcutr allows upgrading a relayed connection to a direct one.
        dcutr: dcutr(),
        pubsub: gossipsub({ allowPublishToZeroPeers: true, canRelayMessage: true }),
      },
    });

    // Set up handlers for incoming connections and messages
    setupNodeListeners();

    await libp2pNode.start();
    console.log('[NetworkService] Libp2p node started with PeerId:', libp2pNode.peerId.toString());

    // Dial the public relay to establish a connection and get a listenable address
    console.log(`[NetworkService] Dialing public relay: ${RELAY_NODE}`);
    await libp2pNode.dial(multiaddr(RELAY_NODE));

    // Log all listening addresses, including relayed ones.
    console.log('[NetworkService] Listening on addresses:');
    libp2pNode.getMultiaddrs().forEach(addr => console.log(addr.toString()));

    networkStore._setConnectionStatus('connected');
    networkStore._setPeerId(libp2pNode.peerId.toString());

    // Subscribe to the presence topic to see who is online
    libp2pNode.services.pubsub.subscribe(PRESENCE_TOPIC);
    
    // Announce our presence to the network
    setInterval(announcePresence, 20000); // Announce every 20 seconds
    setTimeout(announcePresence, 2000); // Announce quickly after startup

  } catch (error) {
    console.error('[NetworkService] Failed to initialize libp2p node:', error);
    networkStore._setConnectionStatus('disconnected');
  }
}

/**
 * Sets up the global event listeners for the libp2p node for debugging and functionality.
 */
function setupNodeListeners() {
    // Fired when the node discovers a new peer. Should fire frequently.
    libp2pNode.addEventListener('peer:discovery', (evt) => {
        const peerId = evt.detail.id.toString();
        console.log(`[NetworkService] Discovered peer: ${peerId}`);
    });

    // Fired when a connection is successfully established. This should now fire.
    libp2pNode.addEventListener('peer:connect', (evt) => {
        const peerId = evt.detail.toString();
        console.log(`✅ [NetworkService] Peer connected: ${peerId}`);
        // Announce presence so the new peer sees us immediately.
        setTimeout(announcePresence, 500); 
    });

    // Fired when a peer disconnects.
    libp2pNode.addEventListener('peer:disconnect', (evt) => {
        const peerId = evt.detail.toString();
        console.log(`❌ [NetworkService] Peer disconnected: ${peerId}`);
        useNetworkStore()._removeOnlineUser(peerId);
    });

    // Listen for incoming direct chat connections
    libp2pNode.handle(DIRECT_CHAT_PROTOCOL, ({ stream }) => {
        console.log(`[NetworkService] Received direct chat stream from ${stream.remotePeer.toString()}`);
        handleDirectChatStream(stream);
    });

    // Listen for messages on all subscribed pubsub topics
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

        if (topic === PRESENCE_TOPIC) {
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
        console.log(`[NetworkService] Direct chat with ${peerId} already exists.`);
        return;
    }
    console.log(`[NetworkService] Dialing ${peerId} for a direct chat...`);
    try {
        const stream = await libp2pNode.dialProtocol(peerId, DIRECT_CHAT_PROTOCOL);
        handleDirectChatStream(stream);
    } catch (error) {
        console.error(`[NetworkService] Failed to dial protocol for direct chat with ${peerId}:`, error);
        useNetworkStore()._setChatStatus(peerId, 'failed');
    }
}

/**
 * Handles a newly established direct chat stream (both incoming and outgoing).
 * @param {import('libp2p').Stream} stream - The libp2p stream object.
 */
function handleDirectChatStream(stream) {
    const peerId = stream.remotePeer.toString();
    directChatStreams.set(peerId, stream);
    const networkStore = useNetworkStore();
    networkStore._setChatStatus(peerId, 'connected');

    // Listen for incoming messages on this specific stream
    pipe(stream.source, async function (source) {
        for await (const msg of source) {
            try {
                const message = JSON.parse(uint8ArrayToString(msg.subarray()));
                networkStore._addDirectMessage(peerId, { text: message.text, sender: 'them' });
            } catch (error) {
                console.error(`[NetworkService] Error processing direct message from ${peerId}:`, error);
            }
        }
    }).catch(error => {
        console.error(`[NetworkService] Stream with ${peerId} ended with error:`, error);
    });

    // Handle stream ending or errors
    stream.close().then(() => {
        console.log(`[NetworkService] Stream with ${peerId} closed.`);
        directChatStreams.delete(peerId);
        networkStore._setChatStatus(peerId, 'disconnected');
    });
}

/**
 * Sends a message over an established direct chat stream.
 * @param {string} peerId - The recipient's PeerId.
 * @param {string} text - The message to send.
 */
export async function sendDirectMessage(peerId, text) {
  const stream = directChatStreams.get(peerId);
  if (!stream) {
    console.error(`[NetworkService] No active direct stream to ${peerId}. Cannot send message.`);
    return;
  }
  try {
    const message = JSON.stringify({ text });
    await pipe([uint8ArrayFromString(message)], stream.sink);
  } catch (error) {
    console.error(`[NetworkService] Failed to send direct message to ${peerId}:`, error);
  }
}


// --- Group Chat & Management (PubSub) ---

/**
 * Creates a new group, subscribes to its topic, and informs the network.
 * @param {string} groupName - The desired name for the group.
 * @returns {string} The unique ID (topic) of the newly created group.
 */
export function createGroup(groupName) {
    const groupId = `/secure-p2p-chat/group/${Date.now()}-${Math.random()}`;
    const adminId = libp2pNode.peerId.toString();
    
    useNetworkStore()._addGroup({
        id: groupId,
        name: groupName,
        adminId,
        members: [{ id: adminId, username: localIdentity.username }],
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
    const message = {
        type: 'group-chat',
        text,
        senderUsername: localIdentity.username,
        timestamp: Date.now(),
    };
    await libp2pNode.services.pubsub.publish(groupId, uint8ArrayFromString(JSON.stringify(message)));
}

/**
 * Sends a control command for managing a group (admin only).
 * @param {string} groupId - The group's topic.
 * @param {string} command - The command to execute (e.g., 'add_user').
 * @param {object} payload - Data for the command.
 */
async function sendGroupControlCommand(groupId, command, payload) {
    const group = useNetworkStore().groups[groupId];
    if (!group || group.adminId !== libp2pNode.peerId.toString()) {
        return console.error('[NetworkService] Action denied: You are not the admin of this group.');
    }

    const controlMessage = {
        type: 'group-control',
        command,
        payload,
        adminId: group.adminId, // Include adminId for verification by recipients
    };

    await libp2pNode.services.pubsub.publish(groupId, uint8ArrayFromString(JSON.stringify(controlMessage)));
    // Also apply the action locally for immediate UI update
    handleGroupControlMessage(groupId, group.adminId, controlMessage);
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
    
    // Security check: Only the declared admin can issue commands.
    if (!group || group.adminId !== fromPeerId || message.adminId !== group.adminId) {
        return console.warn(`[NetworkService] Unauthorized control message for group ${groupId} from ${fromPeerId}`);
    }

    const { command, payload } = message;

    switch (command) {
        case 'add_user':
            networkStore._addUserToGroup(groupId, payload.user);
            // If the current user was added, subscribe to the group topic.
            if (payload.user.id === libp2pNode.peerId.toString()) {
                libp2pNode.services.pubsub.subscribe(groupId);
                networkStore._addGroup({ ...group, id: groupId }); // Add group to local state if not present
            }
            break;

        case 'remove_user':
            networkStore._removeUserFromGroup(groupId, payload.userId);
             // If the current user was removed, unsubscribe and delete the group locally.
            if (payload.userId === libp2pNode.peerId.toString()) {
                libp2pNode.services.pubsub.unsubscribe(groupId);
                networkStore._removeGroup(groupId);
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
