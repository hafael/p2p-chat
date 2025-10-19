<template>
  <div class="flex h-screen w-full bg-gray-800 text-white">
    <aside class="w-1/4">
      <ContactList
        :online-users="onlineUsers"
        :current-user="username"
        :is-loading="isLoadingUsers"
        @select-contact="startChat"
        @logout="handleLogout"
      />
    </aside>

    <main class="w-3/4 p-8 flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
      <transition name="fade" mode="out-in">
        <ChatWindow
            v-if="activeChat"
            :contact-name="activeChat.contactUsername"
            :messages="activeChat.messages"
            :my-fingerprint="myFingerprint"
            :contact-fingerprint="activeChat.contactFingerprint"
            @send-message="handleSendMessage"
        />
        
        <div v-else class="text-center">
          <h1 class="text-3xl font-bold">Bem-vindo ao Chat P2P Seguro</h1>
          <p v-if="networkStore.status === 'connected'" class="text-gray-400 mt-4">Selecione um contato na lista à esquerda para iniciar uma conversa segura.</p>
          <p v-else class="text-gray-400 mt-4">
            Você está desconectado da rede. Vá para as
            <router-link to="/settings" class="text-cyan-400 hover:underline">Configurações</router-link>
            para se conectar.
          </p>
        </div>
      </transition>
    </main>
  </div>
</template>

<style>
/* ... (estilos de fade existentes) ... */
</style>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useNetworkStore } from '../stores/network';
import { useRouter } from 'vue-router';
import ContactList from '../components/ContactList.vue';
import ChatWindow from '../components/ChatWindow.vue';
import { loadIdentity, clearIdentity } from '../services/storage';
import { init as initCrypto, generateFingerprint } from '../services/crypto';

// --- State ---
const router = useRouter();
const networkStore = useNetworkStore();
const identity = ref(null);
const username = computed(() => identity.value?.username);
const myFingerprint = ref('');
const onlineUsers = computed(() => networkStore.onlineUsers);
const isLoadingUsers = computed(() => networkStore.status === 'connecting' && onlineUsers.value.length === 0);

// TODO: A lógica de chat (activeChat, startChat, handleSendMessage) será movida para o networkService/store.
const activeChat = computed(() => networkStore.activeChat);
const messages = ref([]); // Temporário

// --- Lifecycle Hooks ---
onMounted(async () => {
  const loadedIdentity = await loadIdentity();
  if (!loadedIdentity?.username) {
    router.replace('/');
    return;
  }
  identity.value = loadedIdentity;
  await initCrypto();
  myFingerprint.value = await generateFingerprint(identity.value.publicKey);
  networkStore.initialize(loadedIdentity);
});

// Ações de chat agora chamam o store
const startChat = (contactUsername) => {
  networkStore.startOrShowChat(contactUsername);
};
const handleSendMessage = (messageText) => {
  networkStore.sendMessage(messageText);
};

const handleLogout = async () => {
  if (confirm('Tem certeza que deseja sair? Sua identidade local será apagada.')) {
    await clearIdentity();
    router.push('/');
  }
};
</script>