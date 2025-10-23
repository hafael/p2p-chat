// src/stores/network.js
import { defineStore } from 'pinia';
import * as networkService from '../services/networkService';

export const useNetworkStore = defineStore('network', {
  state: () => ({
    // General network connection status: 'disconnected', 'connecting', 'connected'
    status: 'disconnected',
    // The PeerId of the local user, once connected.
    peerId: null,
    // A map of online users for efficient lookups. { [peerId]: { id, username } }
    onlineUsers: {},
    // Stores direct (1-to-1) chat sessions. { [peerId]: { messages: [], status, ... } }
    directChats: {},
    // Stores group chat sessions. { [groupId]: { id, name, adminId, members: [], messages: [] } }
    groups: {},
    // The ID of the currently active chat (can be a peerId or a groupId).
    activeChatId: null,
    // The type of the currently active chat: 'direct' or 'group'.
    activeChatType: null,
  }),

  getters: {
    /**
     * Returns the list of online users as an array, excluding the current user.
     */
    onlineUsersList: (state) => {
      return Object.values(state.onlineUsers).filter(user => user.id !== state.peerId);
    },

    /**
     * Returns the currently active chat object (either a direct chat or a group).
     */
    activeChat: (state) => {
      if (!state.activeChatId || !state.activeChatType) {
        return null;
      }
      if (state.activeChatType === 'direct') {
        return state.directChats[state.activeChatId];
      }
      if (state.activeChatType === 'group') {
        return state.groups[state.activeChatId];
      }
      return null;
    },
  },

  actions: {
    // --- Actions called by UI components ---

    /**
     * Initializes the network service.
     * @param {object} identity - User's identity.
     */
    initialize(identity) {
      networkService.initialize(identity);
    },

    /**
     * Shuts down the network service gracefully.
     */
    shutdown() {
      networkService.shutdown();
    },

    /**
     * Sets the currently active chat window.
     * @param {string} chatId - The ID of the chat (peerId or groupId).
     * @param {'direct' | 'group'} chatType - The type of chat.
     */
    setActiveChat(chatId, chatType) {
      if (chatType === 'direct' && !this.directChats[chatId]) {
        // Automatically create a local chat instance when a user is clicked
        const user = this.onlineUsers[chatId];
        if (user) {
          this.directChats[chatId] = {
            contactId: user.id,
            contactUsername: user.username,
            messages: [],
            status: 'new', // Represents a new, unopened chat
          };
          // Initiate the connection
          networkService.startDirectChat(chatId);
        }
      }
      this.activeChatId = chatId;
      this.activeChatType = chatType;
    },

    /**
     * Sends a direct message and adds it optimistically to the local state.
     * @param {string} peerId - The recipient's peerId.
     * @param {string} text - The message content.
     */
    sendDirectMessage(peerId, text) {
        if (!this.directChats[peerId]) return;
        const message = { text, sender: 'me', timestamp: Date.now() };
        this.directChats[peerId].messages.push(message);
        networkService.sendDirectMessage(peerId, text);
    },
    
    /**
     * Creates a new group chat.
     * @param {string} groupName - The name for the new group.
     */
    createGroup(groupName) {
        networkService.createGroup(groupName);
    },

    /**
     * Sends a group message and adds it optimistically to the local state.
     * @param {string} groupId - The group's ID.
     * @param {string} text - The message content.
     */
    sendGroupMessage(groupId, text) {
      if (!this.groups[groupId]) return;
      const message = {
        text,
        senderId: this.peerId,
        senderUsername: 'Me', // Simplified for local display
        timestamp: Date.now(),
      };
      this.groups[groupId].messages.push(message);
      networkService.sendGroupMessage(groupId, text);
    },

    // --- Group Admin Actions ---
    addUserToGroup: networkService.addUserToGroup,
    removeUserFromGroup: networkService.removeUserFromGroup,
    clearGroupMessages: networkService.clearGroupMessages,
    deleteGroup: networkService.deleteGroup,


    // --- Internal Actions (called by networkService to sync state) ---

    _setConnectionStatus(status) {
      this.status = status;
    },

    _setPeerId(peerId) {
        this.peerId = peerId;
    },

    _addOnlineUser(user) {
      if (user.id !== this.peerId) {
        this.onlineUsers[user.id] = user;
      }
    },

    _removeOnlineUser(peerId) {
      delete this.onlineUsers[peerId];
    },
    
    _setChatStatus(peerId, status) {
        if (this.directChats[peerId]) {
            this.directChats[peerId].status = status;
        }
    },

    _addDirectMessage(peerId, message) {
        // Ensure chat exists before adding a message
        if (!this.directChats[peerId]) {
            const user = this.onlineUsers[peerId];
            this.directChats[peerId] = {
                contactId: peerId,
                contactUsername: user ? user.username : 'Unknown',
                messages: [],
                status: 'connected',
            };
        }
        this.directChats[peerId].messages.push(message);
    },

    _addGroup(group) {
        this.groups[group.id] = {
            messages: [],
            ...group,
        };
    },
    
    _removeGroup(groupId) {
        if (this.activeChatId === groupId) {
            this.activeChatId = null;
            this.activeChatType = null;
        }
        delete this.groups[groupId];
    },

    _addMessageToGroup(groupId, message) {
        if (this.groups[groupId]) {
            this.groups[groupId].messages.push(message);
        }
    },

    _addUserToGroup(groupId, user) {
        if (this.groups[groupId] && !this.groups[groupId].members.some(m => m.id === user.id)) {
            this.groups[groupId].members.push(user);
        }
    },

    _removeUserFromGroup(groupId, userId) {
        if (this.groups[groupId]) {
            this.groups[groupId].members = this.groups[groupId].members.filter(m => m.id !== userId);
        }
    },

    _clearGroupMessages(groupId) {
        if (this.groups[groupId]) {
            this.groups[groupId].messages = [];
        }
    }
  },
});