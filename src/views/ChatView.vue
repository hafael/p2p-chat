<template>
  <div class="flex h-screen w-full bg-gray-800 text-white">
    <aside class="w-1/4">
      <ContactList
        :online-users="onlineUsers"
        :current-user="username"
        :is-loading="isLoadingUsers"
        :selected-contact="activeChat?.contactUsername"
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
          <h1 class="text-3xl font-bold">Welcome to Secure P2P Chat</h1>
          <p v-if="networkStore.status === 'connected'" class="text-gray-400 mt-4">Select a contact from the list on the left to start a secure conversation.</p>
          <p v-else-if="networkStore.status === 'connecting'" class="text-gray-400 mt-4">Connecting to the P2P network...</p>
          <p v-else class="text-gray-400 mt-4">
            You are disconnected. Go to
            <router-link to="/settings" class="text-cyan-400 hover:underline">Settings</router-link>
            to check your connection status.
          </p>
        </div>
      </transition>
    </main>
  </div>
</template>

<style>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
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

const activeChat = computed(() => networkStore.activeChat);

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

// --- Chat Actions ---
const startChat = (contactUser) => {
  networkStore.startOrShowChat(contactUser);
};
const handleSendMessage = (messageText) => {
  networkStore.sendMessage(messageText);
};

// --- Logout ---
const handleLogout = async () => {
  if (confirm('Are you sure you want to log out? Your local identity will be erased.')) {
    await clearIdentity();
    // Stop network service gracefully if possible (optional)
    router.push('/');
  }
};
</script>