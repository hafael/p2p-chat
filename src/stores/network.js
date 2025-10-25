// src/stores/network.js
import { defineStore } from 'pinia';
import * as networkService from '../services/networkService';

export const useNetworkStore = defineStore('network', {
  state: () => ({ // Add isOffline state
    isOffline: false,
    status: 'disconnected',
    peerId: null,
    contacts: [],
    contactRequests: [],
    directChats: {},
    groups: {},
    activeChatId: null,
    activeChatType: null, // 'direct' or 'group'
    peerCount: 0,
  }),

  getters: {
    activeChat: (state) => {
      if (!state.activeChatId || !state.activeChatType) return null;

      if (state.activeChatType === 'direct') {
        const contact = state.contacts.find(c => c.peerId === state.activeChatId);
        const chatHistory = state.directChats[state.activeChatId];
        return { contact, ...chatHistory, type: 'direct' };
      } else {
        const group = state.groups[state.activeChatId];
        return { ...group, type: 'group' };
      }
    },
  },

  actions: {
    // --- UI Actions ---
    initialize(identity) { networkService.initialize(identity); },
    shutdown() { networkService.shutdown(); },
    findUserByUsername(username) { return networkService.findUser(username); },
    sendContactRequest(peerId) { networkService.sendContactRequest(peerId); },
    respondToContactRequest(peerId, accepted) {
      networkService.respondToContactRequest(peerId, accepted);
      this.contactRequests = this.contactRequests.filter(req => req.peerId !== peerId);
    },

    setActiveChat(chatId, chatType) {
      if (chatType === 'direct' && !this.directChats[chatId]) {
        this.directChats[chatId] = { messages: [] };
        networkService.ensureConnection(chatId);
      }
      this.activeChatId = chatId;
      this.activeChatType = chatType;
    },

    sendMessage(text) {
      if (!this.activeChatId) return;
      const message = { text, sender: 'me', timestamp: Date.now() };
      if (this.activeChatType === 'direct') {
        this.directChats[this.activeChatId].messages.push(message);
        networkService.sendMessage(this.activeChatId, text);
      } else {
        networkService.sendGroupMessage(this.activeChatId, text);
      }
    },

    createGroup(groupName) {
      networkService.createGroup(groupName);
    },

    updateProfile(identity) {
      // TODO: Broadcast profile update to contacts
    },

    setOfflineStatus(isOffline) {
      this.isOffline = isOffline;
    },

    // --- Internal Actions ---
    _setConnectionStatus(status) { this.status = status; },
    _setPeerId(peerId) { this.peerId = peerId; },
    _addContact(contact) {
      if (!this.contacts.some(c => c.peerId === contact.peerId)) {
        this.contacts.push({ ...contact, isOnline: true });
      }
    },
    _removeContact(peerId) {
      this.contacts = this.contacts.filter(c => c.peerId !== peerId);
      if (this.activeChatId === peerId && this.activeChatType === 'direct') {
        this.activeChatId = null;
      }
    },
    _setContactOnlineStatus(peerId, isOnline) {
      const contact = this.contacts.find(c => c.peerId === peerId);
      if (contact) contact.isOnline = isOnline;
    },
    _addContactRequest(request) {
      if (!this.contactRequests.some(r => r.peerId === request.peerId)) {
        this.contactRequests.push(request);
      }
    },
    _addDirectMessage(peerId, message) {
      if (!this.directChats[peerId]) {
        this.directChats[peerId] = { messages: [] };
      }
      this.directChats[peerId].messages.push(message);
    },
    _addGroup(group) {
      if (!this.groups[group.id]) {
        this.groups[group.id] = { messages: [], members: [], ...group };
      }
    },
    _setPeerCount(count) { this.peerCount = count; },
    _addMessageToGroup(groupId, message) {
      if (this.groups[groupId]) {
        this.groups[groupId].messages.push(message);
      }
    },
  },
});