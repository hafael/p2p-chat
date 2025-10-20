<template>
  <div class="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
    <h2 class="text-2xl font-bold mb-2 text-cyan-400">Create Your Secure Identity</h2>
    <p class="text-gray-400 mb-6 text-center">Your username is your identifier on the decentralized network.</p>

    <form @submit.prevent="handleRegister" class="w-full">
      <div class="mb-4">
        <label for="username" class="block text-sm font-medium text-gray-300 mb-2">Username</label>
        <input
          id="username"
          v-model="username"
          type="text"
          :disabled="isLoading"
          placeholder="e.g., crypto_rebel"
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition duration-300"
          required
        />
      </div>

      <button
        type="submit"
        :disabled="isLoading"
        class="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <LoadingSpinner v-if="isLoading" size="sm" color="white" />
        <span v-else>Create Identity & Enter</span>
      </button>

      <p v-if="error" class="text-red-400 text-sm mt-4 text-center">{{ error }}</p>
    </form>
  </div>
</template>
  
<script setup>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { generateKeyPair, init as initCrypto } from '../services/crypto.js';
  import { saveIdentity } from '../services/storage.js';
  import LoadingSpinner from './LoadingSpinner.vue';
  
  const username = ref('');
  const isLoading = ref(false);
  const error = ref(null);
  const router = useRouter();
  
  const handleRegister = async () => {
    if (!username.value.trim()) {
      error.value = 'O nome de usuário não pode ser vazio.';
      return;
    }
  
    isLoading.value = true;
    error.value = null;
  
    try {
      // Passo 1: Inicializa o módulo de criptografia
      await initCrypto();
  
      // Passo 2: Gera o par de chaves
      const { publicKey, privateKey } = await generateKeyPair();
  
      // Passo 3: Salva a identidade completa no armazenamento local
      await saveIdentity({
        username: username.value,
        publicKey,
        privateKey,
      });
  
      // Passo 4: Redireciona para a tela de chat
      router.push('/chat');
  
    } catch (err) {
      console.error('Falha ao registrar identidade:', err);
      error.value = 'Ocorreu um erro ao criar sua identidade. Tente novamente.';
    } finally {
      isLoading.value = false;
    }
  };
  </script>