<template>
  <div class="flex flex-col h-full w-full bg-gray-900">
    <!-- Header -->
    <header class="p-4 border-b border-gray-700 flex justify-between items-center">
      <div>
        <h2 class="text-xl font-bold text-cyan-400">{{ chatName }}</h2>
        <p v-if="chat.type === 'direct'" class="text-xs text-gray-500">{{ chat.contact.isOnline ? 'Online' : 'Offline' }}</p>
      </div>
      <!-- Ações do Chat (ex: info do grupo) -->
    </header>

    <!-- Messages -->
    <div class="flex-1 p-4 overflow-y-auto" ref="messagesContainer">
      <div v-for="(message, index) in chat.messages" :key="index" class="flex mb-4" :class="message.sender === 'me' ? 'justify-end' : 'justify-start'">
        <div class="max-w-lg px-4 py-2 rounded-lg" :class="message.sender === 'me' ? 'bg-cyan-700' : 'bg-gray-700'">
          <p v-if="chat.type === 'group' && message.sender !== 'me'" class="text-xs text-cyan-300 font-bold">{{ message.senderUsername }}</p>
          <p class="text-white">{{ message.text }}</p>
          <p class="text-xs text-gray-400 mt-1 text-right">{{ new Date(message.timestamp).toLocaleTimeString() }}</p>
        </div>
      </div>
    </div>

    <!-- Input -->
    <footer class="p-4">
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <input v-model="newMessage" type="text" placeholder="Digite sua mensagem..." class="input-style flex-grow" />
        <button type="submit" class="btn-primary">Enviar</button>
      </form>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';

const props = defineProps({
  chat: { type: Object, required: true },
});

const emit = defineEmits(['send-message']);

const newMessage = ref('');
const messagesContainer = ref(null);

const chatName = computed(() => {
  if (props.chat.type === 'direct') {
    return props.chat.contact?.displayName || 'Chat Direto';
  } else {
    return `# ${props.chat.name}`;
  }
});

const sendMessage = () => {
  if (newMessage.value.trim()) {
    emit('send-message', newMessage.value);
    newMessage.value = '';
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

watch(() => props.chat.messages, scrollToBottom, { deep: true, immediate: true });
watch(() => props.chat.id, scrollToBottom, { immediate: true });
</script>
