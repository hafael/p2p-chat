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
  }),

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
    }
  },
});