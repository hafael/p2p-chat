// src/stores/network.js
import { defineStore } from 'pinia';
import * as networkService from '../services/networkService';

export const useNetworkStore = defineStore('network', {
  state: () => ({
    status: 'disconnected',
    isSupernodeEnabled: false,
    mySupernodeCode: '',
    knownSupernodes: [],
    activeSupernodeIndex: -1,
    clientResponseCode: '',
    activeChats: {},
    currentChatUsername: null,
  }),

  getters: {
    activeChat: (state) => {
      return state.currentChatUsername ? state.activeChats[state.currentChatUsername] : null;
    }
  },

  actions: {
    initialize(identity) {
      const savedNodes = localStorage.getItem('knownSupernodes');
      if (savedNodes) {
        this.knownSupernodes = JSON.parse(savedNodes);
      }
      networkService.initialize(identity);
      this.connectToNetwork();
    },

    // --- Ações de Gestão de Supernós ---

    addSupernode(inviteCode) {
      if (!inviteCode.trim() || this.knownSupernodes.some(n => n.code === inviteCode)) {
        return;
      }
      this.knownSupernodes.push({ code: inviteCode, status: 'pending' });
      localStorage.setItem('knownSupernodes', JSON.stringify(this.knownSupernodes));
      if (this.status !== 'connected') {
        this.connectToNetwork();
      }
    },

    removeSupernode(index) {
      const wasActive = this.activeSupernodeIndex === index;
      this.knownSupernodes.splice(index, 1);
      localStorage.setItem('knownSupernodes', JSON.stringify(this.knownSupernodes));
      if (wasActive) {
        networkService.disconnectFromUpstream();
        this.connectToNetwork();
      }
    },

    /**
     * CORRIGIDO: Esta ação agora adiciona o nó e inicia o ciclo de conexão.
     * @param {string} inviteCode - O código de convite P2P do supernó.
     */
    connectToSupernode(inviteCode) {
      if (!inviteCode.trim()) return;
      this.addSupernode(inviteCode); // Reutiliza a lógica de adicionar
    },

    /**
     * Ação principal para iniciar ou reiniciar o ciclo de conexão com failover.
     */
    connectToNetwork() {
      if (this.knownSupernodes.length > 0) {
        networkService.connectToNetwork(this.knownSupernodes);
      } else {
        console.log("Nenhum supernó conhecido para conectar.");
      }
    },

    // --- Ações do Modo Supernó ---

    enableSupernodeMode() {
      this.isSupernodeEnabled = true;
      networkService.enableSupernodeMode();
    },

    disableSupernodeMode() {
      this.isSupernodeEnabled = false;
      this.mySupernodeCode = '';
      networkService.disableSupernodeMode();
    },

    acceptClientConnection(responseCode) {
      networkService.acceptClientConnection(responseCode);
    },

    // --- Ações de Chat ---

    startOrShowChat(targetUsername) {
      if (!this.activeChats[targetUsername]) {
        this.activeChats[targetUsername] = {
          contactUsername: targetUsername,
          messages: [],
          status: 'connecting',
          contactFingerprint: null,
        };
        networkService.startChatSession(targetUsername);
      }
      this.currentChatUsername = targetUsername;
    },

    sendMessage(messageText) {
      if (this.activeChat) {
        networkService.sendChatMessage(this.activeChat.contactUsername, messageText);
        this.activeChat.messages.push({ text: messageText, sender: 'me' });
      }
    },

    // --- Ações Internas (Mutations) ---

    _setConnectionStatus(status) {
      this.status = status;
    },
    _updateOnlineUsers(users) {
      this.onlineUsers = users;
    },
    _setClientResponseCode(code) {
      this.clientResponseCode = code;
    },
    _addMessageToChat(fromUsername, message) {
      if (this.activeChats[fromUsername]) {
        this.activeChats[fromUsername].messages.push(message);
      }
    },
    _setChatStatus(username, status) {
      if (this.activeChats[username]) {
        this.activeChats[username].status = status;
      }
    },
    _setChatFingerprint(username, fingerprint) {
      if (this.activeChats[username]) {
        this.activeChats[username].contactFingerprint = fingerprint;
      }
    },
  },
});