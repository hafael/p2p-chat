<template>
  <div class="flex flex-col items-center min-h-screen p-4 sm:p-8">
    <header class="w-full max-w-2xl mb-8">
      <h1 class="text-3xl font-bold text-white">Configurações de Rede P2P</h1>
      <p class="text-gray-400">Estado da sua conexão com a rede descentralizada.</p>
    </header>

    <div class="w-full max-w-2xl mb-8 p-4 rounded-lg" :class="statusBoxClass">
      <div class="flex items-center">
        <LoadingSpinner v-if="networkStore.status === 'connecting'" color="yellow" class="mr-3" />
        <div>
          <h3 class="font-bold text-lg">{{ statusTitle }}</h3>
          <p class="text-sm">{{ statusDescription }}</p>
        </div>
      </div>
    </div>
    
    <footer class="mt-8">
      <router-link to="/chat" class="text-cyan-400 hover:underline">&larr; Voltar para o Chat</router-link>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useNetworkStore } from '../stores/network';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const networkStore = useNetworkStore();

const statusBoxClass = computed(() => { /* ... (lógica de classe existente) */ });
const statusTitle = computed(() => { /* ... (lógica de título existente) */ });
const statusDescription = computed(() => {
    switch (networkStore.status) {
    case 'connected': return `Conectado à rede DHT. Agora você pode descobrir outros usuários.`;
    case 'connecting': return 'A iniciar o nó P2P e a conectar-se à rede de descoberta...';
    default: return 'Você está offline. A aplicação tentará reconectar-se automaticamente.';
  }
});
</script>