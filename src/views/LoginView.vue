<template>
  <div class="flex items-center justify-center min-h-screen">
    <div v-if="isChecking" class="text-gray-400">
      <p>Verificando identidade...</p>
    </div>
    <UsernameRegister v-else />
  </div>
</template>
  
<script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { loadIdentity } from '../services/storage.js';
  import UsernameRegister from '../components/UsernameRegister.vue';
  
  const router = useRouter();
  const isChecking = ref(true);
  
  onMounted(async () => {
    try {
      const identity = await loadIdentity();
      if (identity && identity.username) {
        // Se a identidade existe, vai direto para o chat
        console.log(`Identidade encontrada para: ${identity.username}. Redirecionando...`);
        router.replace('/chat');
      } else {
        // Se não existe, permite o registro
        isChecking.value = false;
      }
    } catch (error) {
      console.error('Erro ao carregar identidade:', error);
      // Em caso de erro, permite o registro
      isChecking.value = false;
    }
  });
  </script>