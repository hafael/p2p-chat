<template>
  <div class="p-4 border-b border-gray-700">
    <div class="relative">
      <input
        v-model="searchTerm"
        type="text"
        placeholder="Filtrar seus contatos..."
        class="input-style w-full pr-8"
      />
      <XCircleIcon v-if="searchTerm" @click="searchTerm = ''" class="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 cursor-pointer" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { XCircleIcon } from '@heroicons/vue/24/solid';

const emit = defineEmits(['update-filter']);
const searchTerm = ref('');

watch(searchTerm, (newVal) => {
  emit('update-filter', newVal);
});
</script>