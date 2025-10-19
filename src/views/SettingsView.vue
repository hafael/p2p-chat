<template>
  <div class="flex flex-col items-center min-h-screen p-8">
    <header class="w-full max-w-xl mb-8">
      <h1 class="text-3xl font-bold text-white">Configurações de Rede P2P</h1>
      <p class="text-gray-400">Gerencie sua conexão e contribua para a rede descentralizada.</p>
    </header>

    <div class="w-full max-w-xl space-y-6 bg-gray-800 p-6 rounded-lg">
      <div>
        <h3 class="text-xl font-bold text-green-400 mb-2">Conectar a um Supernó</h3>
        <p class="text-sm text-gray-400 mb-4">Cole o código de convite do supernó abaixo para se conectar à rede.</p>
        <textarea v-model="pastedSupernodeCode" class="input-base rounded-lg bg-white w-full p-2 text-gray-800" rows="3" placeholder="Cole o código de convite..."></textarea>
        <button @click="connectToSupernode" class="btn-primary w-full mt-4 text-black">Conectar</button>
        <textarea v-if="clientResponseCode" :value="clientResponseCode" readonly class="input-base mt-4 h-24" placeholder="Sua resposta para o supernó..."></textarea>
      </div>

      <div class="pt-6 border-t border-gray-700">
        <h3 class="text-xl font-bold text-cyan-400 mb-2">Seja um Supernó Voluntário</h3>
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-400">Permitir que outros se conectem a você.</p>
          <Switch v-model="isSupernodeEnabled" :class="isSupernodeEnabled ? 'bg-cyan-600' : 'bg-gray-600'" class="switch-base">
            <span :class="isSupernodeEnabled ? 'translate-x-6' : 'translate-x-1'" class="switch-handle" />
          </Switch>
        </div>
        <div v-if="isSupernodeEnabled" class="mt-4">
          <p class="text-sm text-gray-300 mb-2">1. Compartilhe seu código de convite:</p>
          <textarea :value="mySupernodeCode" readonly class="input-base h-24"></textarea>
          <p class="text-sm text-gray-300 mt-4 mb-2">2. Cole a resposta do cliente aqui:</p>
          <textarea v-model="pastedClientResponse" class="input-base" placeholder="Cole o código de resposta do cliente..."></textarea>
          <button @click="acceptClient" class="btn-secondary w-full mt-4">Aceitar Cliente</button>
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

  const isSupernodeEnabled = computed({
    get: () => networkStore.isSupernodeEnabled,
    set: (value) => { value ? networkStore.enableSupernodeMode() : networkStore.disableSupernodeMode(); }
  });

  const mySupernodeCode = computed(() => networkStore.mySupernodeCode);
  const clientResponseCode = computed(() => networkStore.clientResponseCode);

  const connectToSupernode = () => {
    if (pastedSupernodeCode.value.trim()) {
      networkStore.connectToSupernode(pastedSupernodeCode.value);
    }
  };
  const acceptClient = () => {
    if (pastedClientResponse.value.trim()) {
      networkStore.acceptClientConnection(pastedClientResponse.value);
      pastedClientResponse.value = ''; // Limpa o campo
    }
  };
</script>