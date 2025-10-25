<template>
  <div class="flex flex-col items-center min-h-screen p-4 sm:p-8 text-white">
    <header class="w-full max-w-2xl mb-8">
      <h1 class="text-3xl font-bold">Configurações</h1>
      <p class="text-gray-400">Ajuste as configurações da sua conta e da rede.</p>
    </header>

    <!-- Seção de Status da Rede -->
    <div class="w-full max-w-2xl p-6 bg-gray-800 rounded-lg mb-8">
      <h2 class="text-xl font-semibold mb-4">Status da Rede</h2>
      <div class="p-4 rounded-lg" :class="statusBoxClass">
        <div class="flex items-center">
          <LoadingSpinner v-if="networkStore.status === 'connecting'" color="yellow" class="mr-3" />
          <div>
            <h3 class="font-bold text-lg">{{ statusTitle }}</h3>
            <p class="text-sm">{{ statusDescription }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Seção de Controle de Conexão -->
    <div class="w-full max-w-2xl p-6 bg-gray-800 rounded-lg mb-8">
      <h2 class="text-xl font-semibold mb-4">Controle de Conexão</h2>
      <div class="flex items-center justify-between">
        <span class="text-gray-300">Aparecer como Online</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="userStatus" @change="handleStatusChange" class="sr-only peer">
          <div class="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
      </div>
      <p class="text-sm text-gray-400 mt-2">
        Se desativado, você aparecerá como offline para seus contatos e não poderá enviar ou receber mensagens.
      </p>
    </div>

    <!-- Seção de Gerenciamento da Conta -->
    <div class="w-full max-w-2xl p-6 bg-gray-800 rounded-lg">
      <h2 class="text-xl font-semibold mb-4">Gerenciamento da Conta</h2>
      <button @click="downloadKey" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300">
        Baixar Chave da Conta
      </button>
      <p class="text-sm text-gray-400 mt-2">
        Faça o download da sua chave privada para fazer backup ou usar sua identidade em outro dispositivo. Mantenha esta chave segura!
      </p>
    </div>

    <footer class="mt-8">
      <router-link to="/chat" class="text-cyan-400 hover:underline">&larr; Voltar para o Chat</router-link>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNetworkStore } from '../stores/network';
import { loadIdentity } from '../services/storage';
import { exportKeyToString } from '../services/crypto';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const networkStore = useNetworkStore();
const userStatus = ref(false);

onMounted(() => {
  userStatus.value = !networkStore.isOffline;
});

const handleStatusChange = async () => {
  networkStore.setOfflineStatus(!userStatus.value);
};

const downloadKey = async () => {
  try {
    const identity = await loadIdentity();
    if (!identity || !identity.privateKeyString) {
      alert("Chave privada não encontrada. Não é possível fazer o download.");
      return;
    }

    const blob = new Blob([identity.privateKeyString], { type: 'text/plain;charset=utf-g' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure-p2p-chat-key_${identity.username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao preparar a chave para download:", error);
    alert("Ocorreu um erro ao tentar baixar sua chave.");
  }
};

const statusBoxClass = computed(() => {
  switch (networkStore.status) {
    case 'connected': return 'bg-green-900/50 text-green-300';
    case 'connecting': return 'bg-yellow-900/50 text-yellow-300';
    default: return 'bg-red-900/50 text-red-300';
  }
});

const statusTitle = computed(() => {
  switch (networkStore.status) {
    case 'connected': return 'Conectado';
    case 'connecting': return 'Conectando...';
    default: return 'Offline';
  }
});

const statusDescription = computed(() => {
  switch (networkStore.status) {
    case 'connected': return 'Você está online e visível para seus contatos.';
    case 'connecting': return 'Iniciando o nó P2P e conectando-se à rede de descoberta...';
    default: return 'Você está offline. Ative a conexão para conversar.';
  }
});
</script>