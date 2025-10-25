<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-900 text-white">
    <div v-if="isChecking" class="text-gray-400">
      <LoadingSpinner size="lg" color="cyan" />
      <p class="mt-4 text-lg">Verificando identidade na rede...</p>
    </div>
    <UsernameRegister v-else />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { loadIdentity } from '../services/storage.js';
import UsernameRegister from '../components/UsernameRegister.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const router = useRouter();
const isChecking = ref(true);

onMounted(async () => {
  try {
    const identity = await loadIdentity();
    if (identity && identity.username) {
      console.log(`Identidade encontrada para: ${identity.username}. Redirecionando para o chat...`);
      router.replace('/chat');
    } else {
      isChecking.value = false;
    }
  } catch (error) {
    console.error('Erro ao carregar identidade:', error);
    isChecking.value = false;
  }
});
</script>
