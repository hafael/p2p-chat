<template>
  <div class="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
    <h2 class="text-3xl font-bold mb-2 text-cyan-400">Bem-vindo ao Chat P2P</h2>
    <p class="text-gray-400 mb-6 text-center">Sua identidade segura e descentralizada.</p>

    <form @submit.prevent="handleAuth" class="w-full">
      <!-- Campos de Perfil -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-300 mb-2">Username</label>
          <input id="username" v-model="form.username" type="text" :disabled="isLoading" placeholder="seu_username" class="w-full input-style" required />
        </div>
        <div>
          <label for="displayName" class="block text-sm font-medium text-gray-300 mb-2">Nome de Exibição</label>
          <input id="displayName" v-model="form.displayName" type="text" :disabled="isLoading" placeholder="Seu Nome" class="w-full input-style" />
        </div>
      </div>
      <div class="mb-4">
        <label for="avatarUpload" class="block text-sm font-medium text-gray-300 mb-2">Avatar</label>
        <div class="flex items-center gap-4">
          <img :src="form.avatarUrl || '/p2p-chat/vite.svg'" alt="Avatar Preview" class="w-16 h-16 rounded-full bg-gray-700 object-cover" />
          <input id="avatarUpload" type="file" @change="handleImageUpload" accept="image/jpeg,image/png" class="hidden" ref="fileInput" />
          <button type="button" @click="triggerFileInput" class="btn-secondary">Carregar Imagem</button>
        </div>
      </div>

      <!-- Ações de Autenticação -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-300 mb-2">Como deseja entrar?</label>
        <div class="flex rounded-md shadow-sm">
          <button type="button" @click="setAuthMode('new')" :class="authMode === 'new' ? 'btn-active' : 'btn-inactive'" class="flex-1 rounded-l-md">Criar Nova Identidade</button>
          <button type="button" @click="setAuthMode('existing')" :class="authMode === 'existing' ? 'btn-active' : 'btn-inactive'" class="flex-1 rounded-r-md">Usar Chave Existente</button>
        </div>
      </div>

      <!-- Input da Chave Existente -->
      <div v-if="authMode === 'existing'" class="mb-4">
        <label for="privateKey" class="block text-sm font-medium text-gray-300 mb-2">Sua Chave Privada</label>
        <textarea id="privateKey" v-model="form.privateKey" :disabled="isLoading" placeholder="Cole sua chave privada aqui..." class="w-full input-style h-24"></textarea>
      </div>

      <!-- Botão de Ação Principal -->
      <button type="submit" :disabled="isLoading || !form.username" class="w-full btn-primary">
        <LoadingSpinner v-if="isLoading" size="sm" color="white" />
        <span v-else>{{ authMode === 'new' ? 'Criar Identidade e Entrar' : 'Entrar com Chave' }}</span>
      </button>

      <p v-if="error" class="text-red-400 text-sm mt-4 text-center">{{ error }}</p>
    </form>

    <!-- Download da Chave -->
    <div v-if="generatedIdentity" class="mt-6 p-4 bg-gray-700 rounded-lg w-full text-center">
      <p class="text-green-400 font-semibold">Identidade criada com sucesso!</p>
      <p class="text-gray-300 text-sm mb-4">Guarde sua chave em um local seguro. Ela é a única forma de acessar sua conta.</p>
      <button @click="downloadKey" class="btn-secondary">Baixar Chave Privada</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { generateKeyPair, importKeyFromString, exportKeyToString } from '../services/crypto.js';
import { saveIdentity } from '../services/storage.js';
import LoadingSpinner from './LoadingSpinner.vue';

// Estado do componente
const router = useRouter();
const isLoading = ref(false);
const error = ref(null);
const authMode = ref('new'); // 'new' ou 'existing'
const generatedIdentity = ref(null);

const form = reactive({
  username: '',
  displayName: '',
  avatarUrl: '',
  privateKey: '',
});

const fileInput = ref(null);

// Funções
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

      // Center crop
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

      // Compress and get Base64 URL
      form.avatarUrl = canvas.toDataURL('image/jpeg', 0.8);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

const setAuthMode = (mode) => {
  authMode.value = mode;
  error.value = null;
  generatedIdentity.value = null;
};

const handleAuth = async () => {
  if (!form.username.trim()) {
    error.value = 'O nome de usuário é obrigatório.';
    return;
  }

  isLoading.value = true;
  error.value = null;
  generatedIdentity.value = null;

  try {
    let identity;
    if (authMode.value === 'new') {
      identity = await createNewIdentity();
      generatedIdentity.value = identity; // Guarda a identidade para o download
    } else {
      identity = await useExistingKey();
    }

    await saveIdentity(identity);
    router.push('/chat');

  } catch (err) {
    console.error(`Falha ao autenticar (${authMode.value}):`, err);
    error.value = err.message || 'Ocorreu um erro. Verifique os dados e tente novamente.';
  } finally {
    isLoading.value = false;
  }
};

const createNewIdentity = async () => {
  const { publicKey, privateKey } = await generateKeyPair();
  const privateKeyString = await exportKeyToString(privateKey);

  return {
    username: form.username,
    displayName: form.displayName || form.username,
    avatarUrl: form.avatarUrl,
    publicKey,
    privateKey,
    privateKeyString, // Armazena a versão em string para download
  };
};

const useExistingKey = async () => {
  if (!form.privateKey.trim()) {
    throw new Error('A chave privada é obrigatória para autenticar.');
  }
  const { publicKey, privateKey } = await importKeyFromString(form.privateKey);

  return {
    username: form.username,
    displayName: form.displayName || form.username,
    avatarUrl: form.avatarUrl,
    publicKey,
    privateKey,
    privateKeyString: form.privateKey, // Mantém a chave original
  };
};

const downloadKey = () => {
  if (!generatedIdentity.value || !generatedIdentity.value.privateKeyString) return;

  const blob = new Blob([generatedIdentity.value.privateKeyString], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${generatedIdentity.value.username}_private_key.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

</script>


