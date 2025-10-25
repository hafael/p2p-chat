<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black bg-opacity-50" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-cyan-400">Adicionar Novo Contato</DialogTitle>
              
              <div class="mt-4">
                <p class="text-sm text-gray-400 mb-2">Busque por um usuário na rede pelo seu username.</p>
                <input v-model="searchTerm" type="text" placeholder="Digite o username..." class="input-style w-full" />
              </div>

              <div v-if="isLoading" class="mt-4 text-center">
                <LoadingSpinner />
              </div>

              <div v-if="searchResult" class="mt-4 p-3 bg-gray-700 rounded-lg">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <img :src="searchResult.avatarUrl || '/p2p-chat/vite.svg'" class="w-10 h-10 rounded-full bg-gray-600 object-cover" />
                    <div>
                      <p class="font-bold text-white">{{ searchResult.displayName }}</p>
                      <p class="text-sm text-gray-400">@{{ searchResult.username }}</p>
                    </div>
                  </div>
                  <button @click="sendRequest" class="btn-primary text-sm" :disabled="requestSent">{{ requestSent ? 'Enviado' : 'Adicionar' }}</button>
                </div>
              </div>
              <p v-if="searchError" class="text-red-400 text-sm mt-2">{{ searchError }}</p>

              <div class="mt-6 flex justify-end">
                <button type="button" @click="closeModal" class="btn-secondary bg-gray-600 hover:bg-gray-500">Fechar</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useNetworkStore } from '../stores/network';
import { TransitionRoot, TransitionChild, Dialog, DialogPanel, DialogTitle } from '@headlessui/vue';
import LoadingSpinner from './LoadingSpinner.vue';

const networkStore = useNetworkStore();
const isOpen = ref(false);
const searchTerm = ref('');
let debounceTimer = null;

const isLoading = ref(false);
const searchResult = ref(null);
const searchError = ref(null);
const requestSent = ref(false);

const openModal = () => { isOpen.value = true; };
const closeModal = () => {
  isOpen.value = false;
  searchTerm.value = '';
  searchResult.value = null;
  searchError.value = null;
  requestSent.value = false;
};

defineExpose({ openModal });

watch(searchTerm, (newVal) => {
  clearTimeout(debounceTimer);
  searchResult.value = null;
  searchError.value = null;
  requestSent.value = false;

  if (newVal.trim().length > 2) {
    isLoading.value = true;
    debounceTimer = setTimeout(() => {
      handleNetworkSearch(newVal);
    }, 500);
  } else {
    isLoading.value = false;
  }
});

const handleNetworkSearch = async (username) => {
  if (networkStore.peerCount === 0) {
    searchError.value = 'Nenhum par conectado. Verifique sua conexão e tente novamente.';
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  try {
    const user = await networkStore.findUserByUsername(username);
    if (user) {
      searchResult.value = user;
    } else {
      searchError.value = 'Usuário não encontrado na rede.';
    }
  } catch (err) {
    console.log('Error searching user:', err);
    searchError.value = 'Erro ao buscar usuário.';
  } finally {
    isLoading.value = false;
  }
};

const sendRequest = () => {
  if (!searchResult.value) return;
  networkStore.sendContactRequest(searchResult.value.peerId);
  requestSent.value = true;
};
</script>
