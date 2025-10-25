<template>
  <div class="flex h-screen w-full bg-gray-800 text-white">
    <!-- Sidebar -->
    <aside class="w-1/4 flex flex-col bg-gray-800">
      <div class="p-4 border-b border-gray-700">
        <div class="flex justify-around">
          <button @click="sidebarMode = 'contacts'" :class="sidebarMode === 'contacts' ? 'text-cyan-400' : 'text-gray-400'">Contatos</button>
          <button @click="sidebarMode = 'groups'" :class="sidebarMode === 'groups' ? 'text-cyan-400' : 'text-gray-400'">Grupos</button>
        </div>
      </div>

      <div v-if="sidebarMode === 'contacts'" class="flex-1 flex flex-col">
        <ContactList
          v-if="identity"
          :current-user="identity"
          :is-loading="isLoadingUsers"
          :selected-contact="activeChat?.type === 'direct' ? activeChat.contact : null"
          @select-contact="selectDirectChat"
          @logout="handleLogout"
        />
      </div>

      <div v-if="sidebarMode === 'groups'" class="flex-1">
        <GroupList
          :groups="Object.values(groups)"
          :selected-group="activeChat?.type === 'group' ? activeChat : null"
          @select-group="selectGroupChat"
          @open-create-group="isCreateGroupOpen = true"
        />
      </div>
    </aside>

    <!-- Main Chat Area -->
    <main class="w-3/4 p-8 flex flex-col items-center justify-center bg-gray-900 overflow-hidden">
      <ChatWindow v-if="activeChat" :chat="activeChat" @send-message="handleSendMessage" />
      <div v-else class="text-center">
        <h1 class="text-3xl font-bold">Bem-vindo ao Chat P2P Seguro</h1>
        <p class="text-gray-400 mt-4">Selecione um contato ou grupo para iniciar a conversa.</p>
      </div>
    </main>

    <!-- Create Group Modal -->
    <GroupCreate ref="createGroupModal" :is-open="isCreateGroupOpen" @close="isCreateGroupOpen = false" @create-group="handleCreateGroup" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useNetworkStore } from '../stores/network';
import { useRouter } from 'vue-router';
import { loadIdentity, clearIdentity } from '../services/storage';
import ContactList from '../components/ContactList.vue';
import ChatWindow from '../components/ChatWindow.vue';
import GroupList from '../components/groups/GroupList.vue';
import GroupCreate from '../components/groups/GroupCreate.vue';

const router = useRouter();
const networkStore = useNetworkStore();

const identity = ref(null);
const sidebarMode = ref('contacts'); // 'contacts' or 'groups'
const isCreateGroupOpen = ref(false);

const isLoadingUsers = computed(() => networkStore.status === 'connecting' && networkStore.contacts.length === 0);
const activeChat = computed(() => networkStore.activeChat);
const groups = computed(() => networkStore.groups);

onMounted(async () => {
  const loadedIdentity = await loadIdentity();
  if (!loadedIdentity?.username) {
    router.replace('/');
    return;
  }
  identity.value = loadedIdentity;
  networkStore.initialize(loadedIdentity);
});

const selectDirectChat = (contact) => {
  networkStore.setActiveChat(contact.peerId, 'direct');
};

const selectGroupChat = (group) => {
  networkStore.setActiveChat(group.id, 'group');
};

const handleSendMessage = (messageText) => {
  networkStore.sendMessage(messageText);
};

const handleCreateGroup = (groupName) => {
  networkStore.createGroup(groupName);
  isCreateGroupOpen.value = false;
};

const handleLogout = async () => {
  if (confirm('Tem certeza que deseja sair? Sua identidade local será apagada.')) {
    await clearIdentity();
    networkStore.shutdown();
    router.push('/');
  }
};
</script>
