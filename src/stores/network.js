// src/stores/network.js
import { defineStore } from 'pinia';
// Importa todas as funções exportadas do networkService
import * as networkService from '../services/networkService';

export const useNetworkStore = defineStore('network', {
  state: () => ({
    // Estado Geral
    status: 'disconnected', // 'disconnected', 'connecting', 'connected'
    isSupernodeEnabled: false,
    
    // Nosso Papel como Supernó
    mySupernodeCode: '', // Nosso código de convite para outros usarem
    downstreamClients: [], // Clientes conectados a nós para sinalização
    
    // Nossa Conexão como Cliente
    upstreamSupernode: null, // A conexão com o supernó que estamos usando
    onlineUsers: [], // Lista de usuários online recebida do nosso supernó
    clientResponseCode: '', // Código de resposta gerado quando tentamos nos conectar a um supernó

    // NOVO: Estado para gerenciar chats
    activeChats: {}, // Um objeto para armazenar cada chat. Ex: { 'username': { messages: [], ... } }
    currentChatUsername: null, // O username do chat que está sendo exibido
  }),

  getters: {
    // Getter para obter o chat ativo no momento
    activeChat: (state) => {
      return state.currentChatUsername ? state.activeChats[state.currentChatUsername] : null;
    }
  },

  actions: {

    /**
     * Inicializa todo o sistema de rede com a identidade do usuário.
     * Esta ação deve ser chamada uma vez que o login é bem-sucedido.
     */
    initialize(identity) {
      networkService.initialize(identity);
    },

    /**
     * Inicia a funcionalidade de Supernó Voluntário.
     */
    enableSupernodeMode() {
      this.isSupernodeEnabled = true;
      networkService.enableSupernodeMode();
    },

    /**
     * Desabilita a funcionalidade de Supernó.
     */
    disableSupernodeMode() {
      this.isSupernodeEnabled = false;
      this.mySupernodeCode = '';
      this.downstreamClients = [];
      networkService.disableSupernodeMode();
    },

    /**
     * Inicia a conexão com um supernó externo.
     * @param {string} inviteCode - O código de convite P2P do supernó.
     */
    connectToSupernode(inviteCode) {
      if (!inviteCode.trim()) return;
      this.status = 'connecting';
      networkService.connectToSupernode(inviteCode);
    },

    // Chamada pelo supernó para finalizar a conexão com um cliente
    acceptClientConnection(responseCode) {
      networkService.acceptClientConnection(responseCode);
    },

    // --- NOVAS AÇÕES DE CHAT ---

    /**
     * Inicia ou abre uma sessão de chat com um contato.
     * @param {string} targetUsername 
     */
    startOrShowChat(targetUsername) {
      if (!this.activeChats[targetUsername]) {
        // Se o chat não existe, inicia a conexão
        this.activeChats[targetUsername] = {
          contactUsername: targetUsername,
          messages: [],
          status: 'connecting', // 'connecting', 'connected'
          contactFingerprint: null,
        };
        networkService.startChatSession(targetUsername);
      }
      this.currentChatUsername = targetUsername;
    },

    /**
     * Envia uma mensagem no chat ativo.
     * @param {string} messageText 
     */
    sendMessage(messageText) {
      if (this.activeChat) {
        networkService.sendChatMessage(this.activeChat.contactUsername, messageText);
        // Adiciona a mensagem localmente de forma otimista
        this.activeChat.messages.push({ text: messageText, sender: 'me' });
      }
    },

    // Ações internas (chamadas pelo networkService)
    _setConnectionStatus(status) {
      this.status = status;
    },

    _updateOnlineUsers(users) {
      this.onlineUsers = users;
    },

    // Chamada pelo networkService para exibir o código de resposta
    _setClientResponseCode(code) {
      this.clientResponseCode = code;
    },

    // NOVAS AÇÕES INTERNAS PARA GERENCIAR O ESTADO DO CHAT
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