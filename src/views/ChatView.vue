<template>
  <div class="flex h-screen w-full bg-gray-800 text-white">
    <aside class="w-1/4">
      <ContactList
        :online-users="onlineUsers"
        :current-user="username"
        :is-loading="isLoadingUsers"
        @logout="handleLogout"
      />
    </aside>

    <main class="w-3/4 p-8 flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
      <transition name="fade" mode="out-in">
        <ChatWindow
          v-if="sharedKey"
          :contact-name="selectedContact || 'Contato'"
          :messages="messages"
          :my-fingerprint="myFingerprint"
          :contact-fingerprint="contactFingerprint"
          @send-message="handleSendMessage"
        />

        <div v-else class="w-full max-w-2xl text-center">
          <div v-if="isConnecting" class="flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" color="cyan" />
            <p class="mt-4 text-lg" :class="connectionStatusClass">
              {{ connectionStatusText }}
            </p>
          </div>

          <div v-else>
            <h1 class="text-3xl font-bold mb-4">Conexão P2P Manual</h1>
            <p class="text-gray-400 mb-8">Para conectar sem um servidor central, um usuário cria um convite e o outro o aceita.</p>
            <div class="space-y-6">
              <div>
                <button @click="createInvitation" class="bg-cyan-600 hover:bg-cyan-700 text-black font-bold py-2 px-4 rounded-md transition w-full">
                  1. Criar Código de Convite
                </button>
                <textarea
                  v-if="invitationCode"
                  :value="invitationCode"
                  @focus="$event.target.select()"
                  readonly
                  class="w-full h-24 mt-2 p-2 bg-gray-800 border border-gray-600 rounded-md text-gray-300 font-mono text-xs"
                ></textarea>
              </div>
              <div>
                <textarea
                  v-model="pastedCode"
                  class="w-full h-24 p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 font-mono text-xs"
                  placeholder="Cole o código de convite ou de resposta aqui..."
                ></textarea>
                <button @click="acceptCode" class="bg-green-600 hover:bg-green-700 text-black font-bold py-2 px-4 rounded-md transition w-full mt-2">
                  2. Conectar com o Código
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </main>
  </div>
</template>

<style>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useNetworkStore } from '../stores/network';
import { useRouter } from 'vue-router';
import ContactList from '../components/ContactList.vue';
import ChatWindow from '../components/ChatWindow.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import { loadIdentity, clearIdentity } from '../services/storage';
import { createPeer } from '../services/p2p';
import { deriveSharedKey, encryptMessage, decryptMessage, init as initCrypto, generateFingerprint } from '../services/crypto';

// --- State ---
const router = useRouter();
const networkStore = useNetworkStore();
const identity = ref(null);
const username = computed(() => identity.value?.username);

const myFingerprint = ref('');
const contactFingerprint = ref('');

const messages = ref([]);
const invitationCode = ref('');
const pastedCode = ref('');
const selectedContact = ref(null);
const connectionStatusText = ref('');
const connectionStatusClass = ref('text-gray-400');
const isConnecting = ref(false);


let peer = null;
let sharedKey = ref(null);

// Crie uma computed property para a lista de usuários
const onlineUsers = computed(() => networkStore.onlineUsers);
// Crie um estado para o carregamento da lista
const isLoadingUsers = computed(() => networkStore.status === 'connecting' && networkStore.onlineUsers.length === 0);

// --- Lifecycle Hooks ---
onMounted(async () => {
  const loadedIdentity = await loadIdentity();
  if (!loadedIdentity?.username) {
    router.replace('/');
    return;
  }
  identity.value = loadedIdentity;
  await initCrypto();
  // Gera o nosso próprio fingerprint assim que a identidade é carregada
  myFingerprint.value = await generateFingerprint(identity.value.publicKey);

  // INICIALIZA O SERVIÇO DE REDE COM A IDENTIDADE DO USUÁRIO
  networkStore.initialize(loadedIdentity);
});

// --- Lógica de Conexão Manual ---
const createInvitation = () => {
  if (peer) peer.destroy();
  resetConnectionState();
  
  isConnecting.value = true;

  peer = createPeer(true);
  updateConnectionStatus('Aguardando o outro usuário aceitar o convite...', 'text-yellow-400');
  
  peer.on('signal', (signalData) => {
    invitationCode.value = btoa(JSON.stringify(signalData));
  });

  setupPeerEvents();
};

const acceptCode = () => {
  if (!pastedCode.value.trim()) {
    updateConnectionStatus('Por favor, cole um código válido.', 'text-red-400');
    return;
  }

  isConnecting.value = true;

  try {
    const signalData = JSON.parse(atob(pastedCode.value));

    if (!peer) {
      resetConnectionState();
      peer = createPeer(false);
      updateConnectionStatus('Código de convite recebido. Gerando resposta...', 'text-yellow-400');
      
      peer.on('signal', (responseSignal) => {
        invitationCode.value = btoa(JSON.stringify(responseSignal));
        updateConnectionStatus('Resposta gerada! Copie o código acima e envie de volta ao primeiro usuário.', 'text-cyan-400');
      });

      setupPeerEvents();
    }
    
    peer.signal(signalData);
    pastedCode.value = '';

  } catch (error) {
    console.error("Erro ao processar o código:", error);
    updateConnectionStatus('Código inválido. Verifique o texto copiado.', 'text-red-400');
  }
};

// --- Lógica do Chat ---
const handleSendMessage = async (messageText) => {
  if (!peer || !sharedKey.value) return;

  try {
    const { ciphertext, nonce } = await encryptMessage(messageText, sharedKey.value);
    const payload = {
      type: 'chat',
      ciphertext: Array.from(ciphertext),
      nonce: Array.from(nonce),
    };
    peer.send(JSON.stringify(payload));
    messages.value.push({ text: messageText, sender: 'me' });
  } catch (error) {
    console.error("Erro ao criptografar ou enviar mensagem:", error);
  }
};

// --- Funções de Suporte ---
const setupPeerEvents = () => {
  peer.on('error', (err) => {
    console.error('Erro no P2P:', err);
    updateConnectionStatus('Conexão falhou. Tente novamente.', 'text-red-400');
    resetConnectionState();
    isConnecting.value = false;
  });

  peer.on('connect', () => {
    updateConnectionStatus('Canal P2P estabelecido. Realizando handshake...', 'text-cyan-400');
    if (peer.initiator) {
      peer.send(JSON.stringify({ type: 'handshake', publicKey: Array.from(identity.value.publicKey) }));
    }
  });

  peer.on('data', async (data) => {
    const message = JSON.parse(data.toString());

    if (message.type === 'handshake' || message.type === 'handshake-reply') {
      const theirPublicKey = new Uint8Array(message.publicKey);

      // Gera o fingerprint do contato durante o handshake!
      contactFingerprint.value = await generateFingerprint(theirPublicKey);

      const keys = await deriveSharedKey(identity.value.privateKey, theirPublicKey);
      sharedKey.value = keys.sharedTx;
      updateConnectionStatus('Conexão Segura Estabelecida!', 'text-green-400');
      if (message.type === 'handshake') {
        peer.send(JSON.stringify({ type: 'handshake-reply', publicKey: Array.from(identity.value.publicKey) }));
      }
      return;
    }

    if (message.type === 'chat' && sharedKey.value) {
      try {
        const ciphertext = new Uint8Array(message.ciphertext);
        const nonce = new Uint8Array(message.nonce);
        const decryptedText = await decryptMessage(ciphertext, nonce, sharedKey.value);
        if (decryptedText !== null) {
          messages.value.push({ text: decryptedText, sender: 'them' });
        }
      } catch (error) {
        console.error("Erro ao processar mensagem recebida:", error);
      }
    }
  });
  
  peer.on('close', () => {
    updateConnectionStatus('Conexão encerrada.', 'text-gray-400');
    if (peer) peer.destroy();
    peer = null;
    sharedKey.value = null;
    isConnecting.value = false;
  });
};

const resetConnectionState = () => {
  messages.value = [];
  sharedKey.value = null;
  invitationCode.value = '';
  pastedCode.value = '';
  connectionStatusText.value = '';
  selectedContact.value = 'Contato Anônimo';
  contactFingerprint.value = ''; // Limpa o fingerprint ao resetar
};

const updateConnectionStatus = (text, cssClass) => {
  connectionStatusText.value = text;
  connectionStatusClass.value = cssClass;
};

const handleLogout = async () => {
  if (confirm('Tem certeza que deseja sair? Sua identidade local será apagada.')) {
    await clearIdentity();
    router.push('/');
  }
};
</script>