// src/stores/network.js
import { defineStore } from 'pinia';
import * as networkService from '../services/networkService';

export const useNetworkStore = defineStore('network', {
  state: () => ({
    // Connection status with the DHT network
    status: 'disconnected', // 'disconnected', 'connecting', 'connected'
    
    // List of discovered users on the network. Structure: { id: string, username: string }
    onlineUsers: [],
    
    // State to manage active chats
    activeChats: {}, // Object to store each chat. Ex: { 'peerId': { messages: [], ... } }
    currentChatPeerId: null, // The PeerId of the chat currently being displayed
  }),

  getters: {
    // Getter to get the currently active chat
    activeChat: (state) => {
      return state.currentChatPeerId ? state.activeChats[state.currentChatPeerId] : null;
    }
  },

  actions: {
    /**
     * Initializes the network service and tries to connect to the DHT network.
     * This is the main entry point for all network functionality.
     */
    initialize(identity) {
      networkService.initialize(identity);
    },

    /**
     * Starts or opens a chat session with a contact.
     * @param {{id: string, username: string}} targetUser - The target user object.
     */
    startOrShowChat(targetUser) {
      if (!targetUser || !targetUser.id) {
        console.error('[Store] startOrShowChat called with invalid targetUser:', targetUser);
        return;
      }
      if (this.currentChatPeerId === targetUser.id) return;

      if (!this.activeChats[targetUser.id]) {
        this.activeChats[targetUser.id] = {
          contactPeerId: targetUser.id,
          contactUsername: targetUser.username,
          messages: [],
          status: 'connecting',
          contactFingerprint: null,
        };
        networkService.startChatSession(targetUser.id);
      }
      this.currentChatPeerId = targetUser.id;
    },

    /**
     * Sends a message in the active chat.
     * @param {string} messageText 
     */
    sendMessage(messageText) {
      if (this.activeChat) {
        networkService.sendChatMessage(this.activeChat.contactPeerId, messageText);
        // Add the message locally optimistically
        this.activeChat.messages.push({ text: messageText, sender: 'me' });
      }
    },

    // --- Internal Actions (Called by networkService to keep the state in sync) ---

    _setConnectionStatus(status) {
      this.status = status;
    },
    _updateOnlineUsers(users) {
      this.onlineUsers = users;
    },
    _addMessageToChat(fromPeerId, message) {
      if (this.activeChats[fromPeerId]) {
        this.activeChats[fromPeerId].messages.push(message);
      }
    },
    _setChatStatus(peerId, status) {
      if (this.activeChats[peerId]) {
        this.activeChats[peerId].status = status;
      }
    },
    _setChatFingerprint(peerId, fingerprint) {
      if (this.activeChats[peerId]) {
        this.activeChats[peerId].contactFingerprint = fingerprint;
      }
    },
  },
});