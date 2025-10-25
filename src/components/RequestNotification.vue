<template>
  <div v-if="requests.length > 0" class="p-4">
    <h3 class="text-lg font-semibold text-cyan-400 mb-3">Solicitações de Contato</h3>
    <ul class="space-y-3">
      <li v-for="request in requests" :key="request.peerId" class="p-3 bg-gray-700 rounded-lg flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img :src="request.avatarUrl || '/p2p-chat/vite.svg'" class="w-10 h-10 rounded-full bg-gray-600 object-cover" />
          <div>
            <p class="font-bold text-white">{{ request.displayName }}</p>
            <p class="text-sm text-gray-400">@{{ request.username }}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="handleResponse(request.peerId, true)" class="btn-primary text-sm">Aceitar</button>
          <button @click="handleResponse(request.peerId, false)" class="btn-secondary bg-red-600 hover:bg-red-700 text-sm">Recusar</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useNetworkStore } from '../stores/network';

const networkStore = useNetworkStore();
const requests = computed(() => networkStore.contactRequests);

const handleResponse = (peerId, accepted) => {
  networkStore.respondToContactRequest(peerId, accepted);
};
</script>
