<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold text-cyan-400 mb-6">Seu Perfil</h1>

    <form @submit.prevent="handleProfileUpdate" class="space-y-6 p-6 bg-gray-800 rounded-lg">
      <div class="flex items-center gap-6">
        <img :src="form.avatarUrl || '/p2p-chat/vite.svg'" class="w-24 h-24 rounded-full bg-gray-700 object-cover" />
        <div>
          <label for="avatarUpload" class="block text-sm font-medium text-gray-300 mb-2">Mudar Avatar</label>
          <input id="avatarUpload" type="file" @change="handleImageUpload" accept="image/jpeg,image/png" class="hidden" ref="fileInput" />
          <button type="button" @click="triggerFileInput" class="btn-secondary">Carregar Imagem</button>
        </div>
      </div>

      <div>
        <label for="displayName" class="block text-sm font-medium text-gray-300 mb-2">Nome de Exibição</label>
        <input id="displayName" v-model="form.displayName" type="text" class="input-style" />
      </div>

      <div>
        <label for="username" class="block text-sm font-medium text-gray-300 mb-2">Username</label>
        <input id="username" :value="identity?.username" type="text" class="input-style bg-gray-900 cursor-not-allowed" disabled />
        <p class="text-xs text-gray-500 mt-1">O username não pode ser alterado.</p>
      </div>

      <div class="flex justify-end gap-4">
        <router-link to="/chat" class="btn-secondary bg-gray-600 hover:bg-gray-500">Cancelar</router-link>
        <button type="submit" class="btn-primary" :disabled="isSaving">
          <LoadingSpinner v-if="isSaving" size="sm" />
          <span v-else>Salvar Alterações</span>
        </button>
      </div>
      <p v-if="successMessage" class="text-green-400 text-sm mt-2">{{ successMessage }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useNetworkStore } from '../stores/network';
import { loadIdentity, saveIdentity } from '../services/storage';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const networkStore = useNetworkStore();
const identity = ref(null);
const isSaving = ref(false);
const successMessage = ref('');
const fileInput = ref(null);

const form = reactive({
  displayName: '',
  avatarUrl: '',
});

onMounted(async () => {
  identity.value = await loadIdentity();
  if (identity.value) {
    form.displayName = identity.value.displayName;
    form.avatarUrl = identity.value.avatarUrl;
  }
});

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const targetSize = 600;

      let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
      if (srcWidth > srcHeight) {
        srcX = (srcWidth - srcHeight) / 2;
        srcWidth = srcHeight;
      } else if (srcHeight > srcWidth) {
        srcY = (srcHeight - srcWidth) / 2;
        srcHeight = srcWidth;
      }

      canvas.width = targetSize;
      canvas.height = targetSize;
      ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetSize, targetSize);
      form.avatarUrl = canvas.toDataURL('image/jpeg', 0.8);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

const handleProfileUpdate = async () => {
  if (!identity.value) return;

  isSaving.value = true;
  successMessage.value = '';

  const updatedIdentity = {
    ...identity.value,
    displayName: form.displayName,
    avatarUrl: form.avatarUrl,
  };

  await saveIdentity(updatedIdentity);
  identity.value = updatedIdentity;
  // Optionally, notify the network store to update the identity state
  networkStore.updateProfile(updatedIdentity);

  isSaving.value = false;
  successMessage.value = 'Perfil atualizado com sucesso!';
  setTimeout(() => (successMessage.value = ''), 3000);
};
</script>
