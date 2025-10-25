<template>
  <div class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-cyan-400">Grupos</h2>
      <button @click="emit('open-create-group')" class="text-cyan-400 hover:text-cyan-300">
        <PlusCircleIcon class="w-6 h-6" />
      </button>
    </div>
    <ul v-if="groups.length > 0" class="space-y-2">
      <li
        v-for="group in groups"
        :key="group.id"
        @click="emit('select-group', group)"
        class="p-2 rounded-md hover:bg-gray-700 cursor-pointer transition"
        :class="{ 'bg-cyan-800': selectedGroup?.id === group.id }"
      >
        <p class="font-semibold text-white"># {{ group.name }}</p>
      </li>
    </ul>
    <p v-else class="text-sm text-gray-500">Você não está em nenhum grupo.</p>
  </div>
</template>

<script setup>
import { PlusCircleIcon } from '@heroicons/vue/24/solid';

defineProps({
  groups: { type: Array, required: true },
  selectedGroup: { type: Object, default: null },
});

const emit = defineEmits(['select-group', 'open-create-group']);
</script>
