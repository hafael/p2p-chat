<template>
    <div class="flex flex-col h-full w-full max-w-4xl bg-gray-800 rounded-lg shadow-xl">
      <header class="bg-gray-900 p-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-white">Conversa com {{ contactName }}</h2>
          <div class="flex items-center space-x-2">
              <span v-if="isVerified" class="text-sm text-green-400 font-semibold flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                  Verificado
              </span>
              <button @click="toggleVerificationDetails" title="Verificar Identidade" class="p-1 rounded-full hover:bg-gray-700">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </button>
          </div>
        </div>
        <div v-if="showVerification" class="mt-4 p-4 bg-gray-800 rounded-md border border-gray-700">
          <p class="text-sm text-gray-300 mb-3">Para garantir a segurança, compare estes códigos com seu contato por um canal confiável (ex: voz).</p>
          <div class="space-y-1">
            <p class="text-xs text-gray-400">Seu Fingerprint:</p>
            <p class="font-mono text-lg text-cyan-400 tracking-wider">{{ myFingerprint }}</p>
          </div>
          <div class="mt-3 space-y-1">
            <p class="text-xs text-gray-400">Fingerprint de {{ contactName }}:</p>
            <p class="font-mono text-lg text-yellow-400 tracking-wider">{{ contactFingerprint }}</p>
          </div>
          <div class="mt-4 text-right">
              <button @click="markAsVerified" class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-md text-sm transition">
                  Os códigos combinam. Marcar como Verificado.
              </button>
          </div>
        </div>
      </header>
  
      <div ref="messageContainer" class="flex-1 p-4 overflow-y-auto">
        <transition-group name="message" tag="div">
          <div v-for="(msg, index) in messages" :key="index" class="mb-4 w-full">
            <div class="flex" :class="msg.sender === 'me' ? 'justify-end' : 'justify-start'">
              <div
                class="max-w-md p-3 rounded-lg"
                :class="{
                  'bg-cyan-600 text-white': msg.sender === 'me',
                  'bg-gray-700 text-gray-200': msg.sender === 'them'
                }"
              >
                <p class="break-words">{{ msg.text }}</p>
              </div>
            </div>
          </div>
        </transition-group>
      </div>
  
      <footer class="p-4 bg-gray-900 rounded-b-lg">
        <form @submit.prevent="sendMessage" class="flex items-center">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Digite sua mensagem segura..."
            class="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-l-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            autocomplete="off"
          />
          <button
            type="submit"
            class="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-r-md transition"
          >
            Enviar
          </button>
        </form>
      </footer>
    </div>
</template>
  
<style scoped>
  .message-enter-active {
    transition: all 0.3s ease-out;
  }
  .message-leave-active {
    transition: all 0.2s ease-in;
  }
  .message-enter-from {
    opacity: 0;
    transform: translateY(20px);
  }
  .message-leave-to {
    opacity: 0;
    transform: translateY(-20px);
  }
</style>

<script setup>
  import { ref, watch, nextTick } from 'vue';
  
  const props = defineProps({
    contactName: { type: String, required: true },
    messages: { type: Array, required: true },
    myFingerprint: { type: String, required: true },
    contactFingerprint: { type: String, required: true },
  });
  
  const emit = defineEmits(['sendMessage']);
  
  const newMessage = ref('');
  const messageContainer = ref(null);
  const showVerification = ref(false);
  const isVerified = ref(false);
  
  const toggleVerificationDetails = () => { showVerification.value = !showVerification.value; };
  const markAsVerified = () => { isVerified.value = true; showVerification.value = false; };

  const sendMessage = () => {
    if (newMessage.value.trim()) {
      emit('sendMessage', newMessage.value);
      newMessage.value = '';
    }
  };
  
  // Auto-scroll para a última mensagem
  watch(
    () => props.messages,
    async () => {
      await nextTick();
      if (messageContainer.value) {
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
      }
    },
    { deep: true }
  );
  </script>