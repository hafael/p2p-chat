// src/services/supernode.js

const STORAGE_KEY = 'supernode_user_table';
const REGISTRATION_TTL = 60000; // Tempo de vida de um registro em ms (60 segundos)

/**
 * Carrega a tabela de usuários do localStorage.
 * @returns {Map<string, object>}
 */
function loadTableFromStorage() {
  const tableJSON = localStorage.getItem(STORAGE_KEY);
  if (!tableJSON) {
    return new Map();
  }
  // JSON.parse com um 'reviver' para converter arrays de volta para Uint8Array
  const parsed = JSON.parse(tableJSON, (key, value) => {
    if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
      return new Uint8Array(value.data);
    }
    return value;
  });
  return new Map(Object.entries(parsed));
}

/**
 * Salva a tabela de usuários no localStorage.
 * @param {Map<string, object>} table
 */
function saveTableToStorage(table) {
  // Converte o Map para um objeto antes de salvar
  const obj = Object.fromEntries(table);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

/**
 * Remove registros expirados da tabela.
 */
function cleanupExpiredUsers() {
  const table = loadTableFromStorage();
  const now = Date.now();
  let changed = false;
  for (const [username, userData] of table.entries()) {
    if (now - userData.timestamp > REGISTRATION_TTL) {
      table.delete(username);
      console.log(`[Supernode SIM] Registro expirado e removido para: ${username}`);
      changed = true;
    }
  }
  if (changed) {
    saveTableToStorage(table);
  }
}

// Executa a limpeza periodicamente
setInterval(cleanupExpiredUsers, 15000);

/**
 * Simula o registro de um usuário no supernó.
 */
export async function registerUser(username, publicKey) {
  console.log(`[Supernode SIM] Tentando registrar: ${username}`);
  const table = loadTableFromStorage();
  table.set(username, {
    publicKey,
    signalingData: [],
    timestamp: Date.now(),
  });
  saveTableToStorage(table);
  return { success: true, message: 'Usuário registrado com sucesso.' };
}

/**
 * Adiciona um sinal à fila de um usuário.
 */
export async function sendSignal(toUsername, signalData) {
    const table = loadTableFromStorage();
    if (table.has(toUsername)) {
        const userData = table.get(toUsername);
        userData.signalingData.push(signalData);
        table.set(toUsername, userData);
        saveTableToStorage(table);
        console.log(`[Supernode SIM] Sinal para ${toUsername} enfileirado.`);
        return { success: true };
    }
    return { success: false, message: 'Usuário de destino não encontrado.' };
}

/**
 * Simula a consulta de um usuário, agora retornando também os sinais pendentes.
 */
export async function findUser(username) {
  const table = loadTableFromStorage();
  const userData = table.get(username);

  if (userData) {
    const signals = [...userData.signalingData];
    // Limpa a fila de sinais após a consulta e salva a alteração
    if (signals.length > 0) {
        userData.signalingData = [];
        table.set(username, userData);
        saveTableToStorage(table);
    }
    return {
      found: true,
      user: {
        publicKey: userData.publicKey,
        signals: signals,
      }
    };
  }
  return { found: false };
}

/**
 * Simula a obtenção da lista de todos os usuários online.
 */
export async function listOnlineUsers() {
  cleanupExpiredUsers(); // Garante que a lista está atualizada
  const table = loadTableFromStorage();
  return Array.from(table.keys());
}