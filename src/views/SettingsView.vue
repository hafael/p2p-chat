<template>
  <div class="flex flex-col items-center min-h-screen p-4 sm:p-8">
    <header class="w-full max-w-2xl mb-8">
      <h1 class="text-3xl font-bold text-white">Configurações de Rede P2P</h1>
      <p class="text-gray-400">Gerencie sua conexão e contribua para a rede descentralizada.</p>
    </header>

    <div class="w-full max-w-2xl mb-8 p-4 rounded-lg" :class="statusBoxClass">
      <h3 class="font-bold text-lg">{{ statusTitle }}</h3>
      <p class="text-sm">{{ statusDescription }}</p>
    </div>

    <div class="w-full max-w-2xl space-y-8">
      <div class="bg-gray-800 p-6 rounded-lg">
        <h3 class="text-xl font-bold text-green-400 mb-2">1. Conectar a um Supernó</h3>
        <p class="text-sm text-gray-400 mb-4">Para encontrar contatos, cole o código de convite de um supernó.</p>
        
        <textarea v-model="pastedSupernodeCode" class="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 transition" placeholder="Cole o código de convite aqui..."></textarea>
        <button @click="connectToSupernode" :disabled="networkStore.status === 'connecting'" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition w-full mt-4 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">
          {{ networkStore.status === 'connecting' ? 'Conectando...' : 'Conectar' }}
        </button>

        <div v-if="clientResponseCode" class="mt-4 p-3 bg-gray-900 rounded">
          <p class="text-sm text-yellow-300 font-bold">Ação Necessária:</p>
          <p class="text-sm text-gray-300 mt-1">Copie o código abaixo e envie de volta para o usuário do supernó.</p>
          <textarea :value="clientResponseCode" @focus="$event.target.select()" readonly class="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 font-mono text-xs mt-2 h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"></textarea>
        </div>
      </div>

      <div class="bg-gray-800 p-6 rounded-lg">
        <h3 class="text-xl font-bold text-cyan-400 mb-2">2. Ser um Supernó</h3>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-400">Ajudar outros usuários a se conectarem.</p>
          <Switch v-model="isSupernodeEnabled" :class="isSupernodeEnabled ? 'bg-cyan-600' : 'bg-gray-600'" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors">
            <span :class="isSupernodeEnabled ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
          </Switch>
        </div>

        <div v-if="isSupernodeEnabled" class="mt-4 space-y-4">
          <div>
            <p class="text-sm font-bold text-gray-300">Passo A: Compartilhe seu código de convite</p>
            <textarea :value="mySupernodeCode" @focus="$event.target.select()" readonly class="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 font-mono text-xs mt-2 h-24 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"></textarea>
          </div>
          <div>
            <p class="text-sm font-bold text-gray-300">Passo B: Cole a resposta do cliente</p>
            <textarea v-model="pastedClientResponse" class="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 font-mono text-xs mt-2" placeholder="Cole a resposta do cliente aqui..."></textarea>
            <button @click="acceptClient" class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition w-full mt-4 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">Aceitar Cliente</button>
          </div>
        </div>
      </div>
    </div>
    
    <footer class="mt-8">
      <router-link to="/chat" class="text-cyan-400 hover:underline">&larr; Voltar para o Chat</router-link>
    </footer>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue';
  import { Switch } from '@headlessui/vue';
  import { useNetworkStore } from '../stores/network';

  const networkStore = useNetworkStore();
  const pastedSupernodeCode = ref('');
  const pastedClientResponse = ref('');

  // --- Lógica do Switch ---
  const isSupernodeEnabled = computed({
    get: () => networkStore.isSupernodeEnabled,
    set: (value) => { value ? networkStore.enableSupernodeMode() : networkStore.disableSupernodeMode(); }
  });

  // --- Vínculo com o Store ---
  const mySupernodeCode = computed(() => networkStore.mySupernodeCode);
  const clientResponseCode = computed(() => networkStore.clientResponseCode);

  // --- Ações do Usuário ---
  const connectToSupernode = () => {
    if (pastedSupernodeCode.value.trim()) {
      networkStore.connectToSupernode(pastedSupernodeCode.value);
      pastedSupernodeCode.value = '';
    }
  };
  const acceptClient = () => {
    if (pastedClientResponse.value.trim()) {
      networkStore.acceptClientConnection(pastedClientResponse.value);
      pastedClientResponse.value = '';
    }
  };

  // --- Lógica do Painel de Status ---
  const statusBoxClass = computed(() => {
    switch (networkStore.status) {
      case 'connected': return 'bg-green-500 bg-opacity-20 text-green-300';
      case 'connecting': return 'bg-yellow-500 bg-opacity-20 text-yellow-300';
      default: return 'bg-red-500 bg-opacity-20 text-red-300';
    }
  });
  const statusTitle = computed(() => {
      switch (networkStore.status) {
      case 'connected': return 'Conectado à Rede';
      case 'connecting': return 'Conectando...';
      default: return 'Desconectado';
    }
  });
  const statusDescription = computed(() => {
      switch (networkStore.status) {
      case 'connected': return `Você está conectado a um supernó e pode ver contatos online na tela de chat.`;
      case 'connecting': return 'Aguardando o estabelecimento da conexão P2P com o supernó.';
      default: return 'Você não está conectado a um supernó. Conecte-se a um ou ative o seu próprio modo para encontrar contatos.';
    }
  });
</script>