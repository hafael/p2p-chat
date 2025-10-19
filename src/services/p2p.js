// src/services/p2p.js
import Peer from 'simple-peer';

/**
 * Cria e gerencia uma conexão P2P.
 * @param {boolean} isInitiator - Define se este peer inicia a conexão.
 * @returns {Peer.Instance} - Uma instância do simple-peer.
 */
export function createPeer(isInitiator = false) {
  const peer = new Peer({
    initiator: isInitiator,
    trickle: false, // Desabilitar trickle ICE para simplificar a sinalização
  });

  return peer;
}