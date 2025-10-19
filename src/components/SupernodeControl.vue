<template>
    <div class="bg-gray-800 p-6 rounded-lg shadow-lg max-w-lg w-full">
      <h3 class="text-xl font-bold text-cyan-400 mb-4">Gerenciamento de Supernó</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300">Endereço do Supernó (Simulado)</label>
          <input
            type="text"
            disabled
            value="Simulação em Memória"
            class="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400 cursor-not-allowed"
          />
          <p class="text-xs text-gray-500 mt-1">
            No protótipo, o supernó é simulado localmente.
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300">Status da Conexão</label>
          <p class="mt-1 text-lg" :class="statusClass">
            {{ statusText }}
          </p>
        </div>
        <div class="pt-2">
          <button
            @click="reconnect"
            class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition disabled:bg-gray-500"
            :disabled="isConnecting"
          >
            {{ isConnecting ? 'Conectando...' : 'Forçar Reconexão' }}
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  const props = defineProps({
    statusText: {
      type: String,
      required: true
    },
    statusClass: {
      type: String,
      required: true
    },
    isConnecting: {
        type: Boolean,
        default: false
    }
  });
  
  const emit = defineEmits(['reconnect']);
  
  const reconnect = () => {
    emit('reconnect');
  };
  </script>