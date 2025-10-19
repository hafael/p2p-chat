// src/stores/network.js
import { defineStore } from 'pinia';
import * as networkService from '../services/networkService';

export const useNetworkStore = defineStore('network', {
  state: () => ({
    // Estado de conexão com a rede DHT
    status: 'disconnected', // 'disconnected', 'connecting', 'connected'
    
    // Lista de utilizadores descobertos na rede. Estrutura: { id: string, username: string }
    onlineUsers: [],
    
    // Estado para gerir os chats ativos
    activeChats: {}, // Objeto para armazenar cada chat. Ex: { 'peerId': { messages: [], ... } }
    currentChatPeerId: null, // O PeerId do chat que está a ser exibido
  }),

  getters: {
    // Getter para obter o chat ativo no momento
    activeChat: (state) => {
      return state.currentChatPeerId ? state.activeChats[state.currentChatPeerId] : null;
    }
  },

  actions: {
    /**
     * Inicializa o serviço de rede e tenta conectar-se à rede DHT.
     * Este é o ponto de entrada principal para toda a funcionalidade de rede.
     */
    initialize(identity) {
      networkService.initialize(identity);
    },

    /**
     * Inicia ou abre uma sessão de chat com um contacto.
     * @param {{id: string, username: string}} targetUser - O objeto do utilizador alvo.
     */
    startOrShowChat(targetUser) {
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
     * Envia uma mensagem no chat ativo.
     * @param {string} messageText 
     */
    sendMessage(messageText) {
      if (this.activeChat) {
        networkService.sendChatMessage(this.activeChat.contactPeerId, messageText);
        // Adiciona a mensagem localmente de forma otimista
        this.activeChat.messages.push({ text: messageText, sender: 'me' });
      }
    },

    // --- Ações Internas (Chamadas pelo networkService para manter o estado sincronizado) ---

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