<template>
  <div class="flex flex-col h-full bg-gray-800">
    <div class="p-4 border-b border-gray-700 flex justify-between items-center">
      <h2 class="text-xl font-bold text-cyan-400">Contatos</h2>
      <button @click="addContactModal.openModal()" class="p-2 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600">
        <UserPlusIcon class="w-5 h-5" />
      </button>
    </div>

    <!-- Filtro -->
    <ContactSearch @update-filter="filterTerm = $event" />
    
    <!-- Notificações -->
    <RequestNotification />

    <!-- Lista de Contatos -->
    <div class="flex-1 p-4 overflow-y-auto">
      <!-- Online -->
      <div v-if="filteredOnline.length > 0">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Online — {{ filteredOnline.length }}</h3>
        <ul class="space-y-2">
          <li v-for="contact in filteredOnline" :key="contact.peerId" @click="selectContact(contact)" :class="itemClass(contact)">
            <ContactListItem :contact="contact" />
          </li>
        </ul>
      </div>

      <!-- Offline -->
      <div v-if="filteredOffline.length > 0" class="mt-6">
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Offline — {{ filteredOffline.length }}</h3>
        <ul class="space-y-2">
          <li v-for="contact in filteredOffline" :key="contact.peerId" @click="selectContact(contact)" :class="itemClass(contact)">
            <ContactListItem :contact="contact" />
          </li>
        </ul>
      </div>

      <div v-if="contacts.length === 0 && !isLoading" class="text-center text-gray-500 pt-10">
        <p>Nenhum contato adicionado.</p>
      </div>
       <div v-if="isLoading" class="text-center text-gray-500 pt-10">
        <LoadingSpinner />
      </div>
    </div>

    <!-- Menu do Usuário -->
    <div class="p-4 border-t border-gray-700 mt-auto">
      <Menu as="div" class="relative">
        <MenuButton class="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition">
          <div class="flex items-center gap-3">
            <div class="relative">
              <img :src="currentUser.avatarUrl || '/p2p-chat/vite.svg'" class="w-10 h-10 rounded-full bg-gray-900 object-cover" />
              <span :class="[userStatusClass, 'absolute bottom-0 right-0 w-3 h-3 border-2 border-gray-800 rounded-full']"></span>
            </div>
            <div>
              <p class="font-semibold text-white">{{ currentUser.displayName }}</p>
              <p class="text-xs text-gray-400">@{{ currentUser.username }}</p>
            </div>
          </div>
          <ChevronUpIcon class="h-5 w-5 text-gray-400" />
        </MenuButton>
        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <MenuItems class="absolute bottom-full mb-2 w-full origin-bottom-right bg-gray-700 divide-y divide-gray-600 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
             <div class="px-1 py-1">
              <MenuItem v-slot="{ active }">
                <router-link to="/profile" :class="[active ? 'bg-cyan-600 text-white' : 'text-gray-200', 'group flex w-full items-center rounded-md px-2 py-2 text-sm']">
                  <UserIcon class="mr-2 h-5 w-5" aria-hidden="true" />
                  Perfil
                </router-link>
              </MenuItem>
            </div>
            <div class="px-1 py-1">
              <MenuItem v-slot="{ active }">
                <router-link to="/settings" :class="[active ? 'bg-cyan-600 text-white' : 'text-gray-200', 'group flex w-full items-center rounded-md px-2 py-2 text-sm']">
                  <Cog6ToothIcon class="mr-2 h-5 w-5" aria-hidden="true" />
                  Configurações
                </router-link>
              </MenuItem>
            </div>
            <div class="px-1 py-1">
              <MenuItem v-slot="{ active }">
                <button @click="emit('logout')" :class="[active ? 'bg-red-600 text-white' : 'text-gray-200', 'group flex w-full items-center rounded-md px-2 py-2 text-sm']">
                  <ArrowRightOnRectangleIcon class="mr-2 h-5 w-5" aria-hidden="true" />
                  Sair
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>
    </div>

    <AddContactModal ref="addContactModal" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useNetworkStore } from '../stores/network';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
import { ChevronUpIcon, ArrowRightOnRectangleIcon, UserIcon, UserPlusIcon, Cog6ToothIcon } from '@heroicons/vue/24/solid';
import ContactSearch from './ContactSearch.vue';
import RequestNotification from './RequestNotification.vue';
import LoadingSpinner from './LoadingSpinner.vue';
import AddContactModal from './AddContactModal.vue';

// Helper component for list items
const ContactListItem = {
  props: ['contact'],
  template: `
    <div class="relative">
      <img :src="contact.avatarUrl || '/p2p-chat/vite.svg'" class="w-10 h-10 rounded-full bg-gray-600 object-cover" />
      <span v-if="contact.isOnline" class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></span>
    </div>
    <div>
      <p class="font-semibold text-white">{{ contact.displayName }}</p>
      <p class="text-xs text-gray-400">@{{ contact.username }}</p>
    </div>
  `
};

const networkStore = useNetworkStore();
const filterTerm = ref('');
const addContactModal = ref(null);

const props = defineProps({
  currentUser: { type: Object, required: true },
  selectedContact: { type: Object, default: null },
  isLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['selectContact', 'logout']);

const contacts = computed(() => networkStore.contacts);

const sortedContacts = computed(() => {
  return [...contacts.value].sort((a, b) => a.displayName.localeCompare(b.displayName));
});

const onlineContacts = computed(() => sortedContacts.value.filter(c => c.isOnline));
const offlineContacts = computed(() => sortedContacts.value.filter(c => !c.isOnline));

const filterContacts = (contactList) => {
  if (!filterTerm.value) return contactList;
  return contactList.filter(c => 
    c.displayName.toLowerCase().includes(filterTerm.value.toLowerCase()) ||
    c.username.toLowerCase().includes(filterTerm.value.toLowerCase())
  );
};

const filteredOnline = computed(() => filterContacts(onlineContacts.value));
const filteredOffline = computed(() => filterContacts(offlineContacts.value));

const userStatusClass = computed(() => {
  if (networkStore.isOffline) {
    return 'bg-gray-500';
  }
  switch (networkStore.status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
});

const selectContact = (contact) => {
  emit('selectContact', contact);
};

const itemClass = (contact) => {
  return [
    'p-2 rounded-md hover:bg-gray-700 cursor-pointer transition flex items-center gap-3',
    { 'bg-cyan-800': props.selectedContact?.peerId === contact.peerId }
  ];
};
</script>