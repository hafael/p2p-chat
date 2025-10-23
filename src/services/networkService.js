// src/services/networkService.js
import { createLibp2p } from 'libp2p';
// Removed: import { peerIdFromString } from '@libp2p/peer-id' // Not needed anymore
import { bootstrap } from '@libp2p/bootstrap';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { dcutr } from '@libp2p/dcutr'; // Correct import
import { identify } from '@libp2p/identify';
// Removed: import { webTransport } from '@libp2p/webtransport'; // Keep it simple for now
import { mplex } from '@libp2p/mplex'; // Reverting to mplex for broader compatibility, yamux is also fine
import { yamux } from '@chainsafe/libp2p-yamux'; // Keeping yamux as requested
import { noise } from '@chainsafe/libp2p-noise';
import { gossipsub } from '@libp2p/gossipsub';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
// REMOVED: import { all } from '@libp2p/websockets/filters'; // Ensure this is removed
import { fromString as uint8ArrayFromString, toString as uint8ArrayToString } from 'uint8arrays';
import { pipe } from 'it-pipe';
// Removed: import first from 'it-first'; // Not needed anymore
import { sha256 } from 'multiformats/hashes/sha2';
// Removed: import { createDelegatedRoutingV1HttpApiClient } from '@helia/delegated-routing-v1-http-api-client'; // Not needed anymore

import { useNetworkStore } from '../stores/network';

// --- Constants ---

// Public bootstrap nodes. These are essential for finding other peers and relays.
const BOOTSTRAP_NODES = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
];

// Topic for discovering peers specifically interested in this chat app via PubSub.
const PUBSUB_PEER_DISCOVERY_TOPIC = `/libp2p/example-chat/peer-discovery`;

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
    // Custom message ID function for gossipsub (as provided by user)
    const msgIdFnStrictNoSign = async function msgIdFnStrictNoSign(msg) {
      const signedMessage = msg;
      const encodedSeqNum = uint8ArrayFromString(signedMessage.sequenceNumber.toString())
      const hash = await sha256.digest(encodedSeqNum);
      return hash.bytes; // Return the Uint8Array hash digest
    }

    libp2pNode = await createLibp2p({
      addresses: {
        // We listen on the WebRTC transport - the actual address will be determined
        // via identify, STUN, and potentially relays.
        listen: ['/webrtc'],
      },
      transports: [
        webSockets(), // Connect to bootstrap/relay nodes
        webRTC(),     // For direct P2P connections
        circuitRelayTransport({
          // Enable relay discovery through connected peers (like bootstraps)
          discoverRelays: 2
        })
      ],
      connectionEncryption: [noise()],
      // Use Yamux as requested, mplex is also a valid alternative
      streamMuxers: [yamux()],
      peerDiscovery: [
        // Bootstrap is the primary mechanism to find initial entry points
        bootstrap({
          list: BOOTSTRAP_NODES,
          timeout: 1000, // ms
        }),
        // pubsubPeerDiscovery helps find peers interested in our app specifically
        pubsubPeerDiscovery({
          interval: 10000, // Discover frequently (every 10 seconds)
          topics: [PUBSUB_PEER_DISCOVERY_TOPIC], // Topic dedicated to finding chat peers
          listenOnly: false
        })
      ],
      services: {
        identify: identify(),
        // dcutr is essential for upgrading relayed connections to direct
        dcutr: dcutr(),
        pubsub: gossipsub({
          allowPublishToZeroPeers: true,
          canRelayMessage: true,
          msgIdFn: msgIdFnStrictNoSign, // Use the custom message ID function
          // ignoreDuplicatePublishError: true, // Generally safe to keep default (false)
        }),
        // ping: ping(), // Ping can be useful for diagnostics
      },
    });

    // Set up handlers for incoming connections and messages
    setupNodeListeners();

    await libp2pNode.start();
    console.log('[NetworkService] Libp2p node started with PeerId:', libp2pNode.peerId.toString());

    // Event listener to log updated listening addresses (including relayed ones when available)
    libp2pNode.addEventListener('self:peer:update', () => {
      console.log('[NetworkService] Peer Update - Listening on addresses:');
      libp2pNode.getMultiaddrs().forEach(addr => console.log(addr.toString()));
    });

    // Log initial addresses (might not include relayed ones immediately)
    console.log('[NetworkService] Initial listening addresses:');
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
    console.error("Initialization Error Details:", error.message, error.stack); // More detailed error logging
    if (error.code === 'ERR_NO_VALID_ADDRESSES') {
      console.error("Could not find valid addresses. Check network connectivity and bootstrap node availability.");
    }
  }
}


// --- The rest of the file remains the same ---
// setupNodeListeners, shutdown, announcePresence, handlePubSubMessage,
// startDirectChat, handleDirectChatStream, sendDirectMessage,
// createGroup, sendGroupMessage, sendGroupControlCommand, handleGroupControlMessage,
// addUserToGroup, removeUserFromGroup, clearGroupMessages, deleteGroup

/**
 * Sets up the global event listeners for the libp2p node for debugging and functionality.
 */
function setupNodeListeners() {
    libp2pNode.addEventListener('peer:discovery', (evt) => {
        const peerId = evt.detail.id.toString();
        // console.log(`[NetworkService] Discovered peer: ${peerId}`); // Can be noisy
    });

    libp2pNode.addEventListener('peer:connect', (evt) => {
        const peerId = evt.detail.toString();
        console.log(`✅ [NetworkService] Peer connected: ${peerId}`);
        setTimeout(announcePresence, 500);
    });

    libp2pNode.addEventListener('peer:disconnect', (evt) => {
        const peerId = evt.detail.toString();
        console.log(`❌ [NetworkService] Peer disconnected: ${peerId}`);
        useNetworkStore()._removeOnlineUser(peerId);
    });

    libp2pNode.handle(DIRECT_CHAT_PROTOCOL, ({ stream }) => {
        console.log(`[NetworkService] Received direct chat stream from ${stream.remotePeer.toString()}`);
        handleDirectChatStream(stream);
    });

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
    // Also publish presence on the dedicated discovery topic
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

        // Handle presence updates from either the general presence topic or the discovery topic
        if (topic === PRESENCE_TOPIC || topic === PUBSUB_PEER_DISCOVERY_TOPIC) {
            if (message.type === 'online') {
                networkStore._addOnlineUser({ id: from.toString(), username: message.username });
            } else if (message.type === 'offline') {
                // Note: Offline messages might not always be reliably received in PubSub.
                // Relying on disconnect events might be more robust.
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
        // Optional: Maybe focus the chat window here
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
    // Ensure we don't accidentally handle the same stream twice if dial/handle race
    if (directChatStreams.has(peerId)) {
      console.warn(`[NetworkService] Already handling stream for ${peerId}. Closing new stream.`);
      stream.abort(new Error('Duplicate stream detected'));
      return;
    }
    directChatStreams.set(peerId, stream);
    const networkStore = useNetworkStore();
    networkStore._setChatStatus(peerId, 'connected');
    console.log(`[NetworkService] Direct chat stream with ${peerId} established.`);

    // Read messages from the stream
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
        // This catch block handles errors during the reading process (pipe execution)
        console.error(`[NetworkService] Pipe error on stream with ${peerId}:`, error.message);
        // Abort might be redundant if close is called, but safer
        if (stream.status === 'open') stream.abort(error);
    }).finally(() => {
        // This finally block ensures cleanup regardless of how the pipe ends (error or completion)
        if (directChatStreams.has(peerId)) {
             console.log(`[NetworkService] Pipe finished for stream with ${peerId}. Cleaning up.`);
             directChatStreams.delete(peerId);
             networkStore._setChatStatus(peerId, 'disconnected');
        }
    });

    // We don't need the separate stream.close() handling block anymore,
    // as pipe's catch/finally should handle cleanup when the source ends or errors.
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
    directChatStreams.delete(peerId); // Clean up potentially dead stream reference
    return;
  }
  try {
    const message = JSON.stringify({ text });
    await pipe([uint8ArrayFromString(message)], stream.sink);
  } catch (error) {
    console.error(`[NetworkService] Failed to send direct message to ${peerId}:`, error);
     // Abort the stream on send error, assuming it's unrecoverable
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
    const groupId = `/secure-p2p-chat/group/${Date.now()}-${Math.random().toString(16).substring(2)}`; // More unique ID
    const adminId = libp2pNode.peerId.toString();
    const currentUser = { id: adminId, username: localIdentity.username };

    useNetworkStore()._addGroup({
        id: groupId,
        name: groupName,
        adminId,
        members: [currentUser], // Start with the admin as the only member
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
 * @param {string} command - The command to execute (e.g., 'add_user').
 * @param {object} payload - Data for the command.
 */
async function sendGroupControlCommand(groupId, command, payload) {
    if (!libp2pNode || libp2pNode.status !== 'started') return;
    const group = useNetworkStore().groups[groupId];

    // Ensure the sender is the admin
    if (!group || group.adminId !== libp2pNode.peerId.toString()) {
        return console.error('[NetworkService] Action denied: You are not the admin of this group.');
    }

    const controlMessage = {
        type: 'group-control',
        command,
        payload,
        adminId: group.adminId, // Include adminId for verification by recipients
    };

    try {
        await libp2pNode.services.pubsub.publish(groupId, uint8ArrayFromString(JSON.stringify(controlMessage)));
        // Apply the action locally immediately for UI responsiveness
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

    // Security check: Verify sender is the admin listed in the message and matches the local group admin
    if (!group || group.adminId !== fromPeerId || message.adminId !== group.adminId) {
        return console.warn(`[NetworkService] Unauthorized control message for group ${groupId} from ${fromPeerId}. Expected admin: ${group?.adminId}`);
    }

    const { command, payload } = message;

    switch (command) {
        case 'add_user':
            if (payload.user && payload.user.id && payload.user.username) {
              networkStore._addUserToGroup(groupId, payload.user);
              // If the current user was added, subscribe to the group topic.
              if (payload.user.id === libp2pNode.peerId.toString()) {
                  libp2pNode.services.pubsub.subscribe(groupId);
                  // Ensure the group exists locally if maybe added by another client first
                  if (!networkStore.groups[groupId]) {
                      networkStore._addGroup({ id: groupId, name: 'Unknown Group', adminId: fromPeerId, members: [payload.user] }); // Add with minimal info
                  }
              }
            } else {
                 console.warn(`[NetworkService] Invalid 'add_user' payload for group ${groupId}:`, payload);
            }
            break;

        case 'remove_user':
            if (payload.userId) {
                networkStore._removeUserFromGroup(groupId, payload.userId);
                // If the current user was removed, unsubscribe and delete the group locally.
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
            // All members should unsubscribe and remove the group
            libp2pNode.services.pubsub.unsubscribe(groupId);
            networkStore._removeGroup(groupId);
            break;

        default:
            console.warn(`[NetworkService] Received unknown group command: '${command}'`);
    }
}


// --- Public API for Group Admin Actions ---

// Ensure user object has { id: string, username: string }
export const addUserToGroup = (groupId, user) => sendGroupControlCommand(groupId, 'add_user', { user });
export const removeUserFromGroup = (groupId, userId) => sendGroupControlCommand(groupId, 'remove_user', { userId });
export const clearGroupMessages = (groupId) => sendGroupControlCommand(groupId, 'clear_messages', {});
export const deleteGroup = (groupId) => sendGroupControlCommand(groupId, 'delete_group', {});