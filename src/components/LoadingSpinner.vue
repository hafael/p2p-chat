<template>
    <div
      class="animate-spin rounded-full border-solid"
      :class="[spinnerSize, spinnerColor]"
      :style="{ borderTopColor: 'transparent' }"
    ></div>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  
  const props = defineProps({
    size: {
      type: String,
      default: 'md', // 'sm', 'md', 'lg'
    },
    color: {
      type: String,
      default: 'cyan', // 'cyan', 'white', etc.
    },
  });
  
  const spinnerSize = computed(() => {
    switch (props.size) {
      case 'sm':
        return 'w-6 h-6 border-2';
      case 'lg':
        return 'w-12 h-12 border-4';
      case 'md':
      default:
        return 'w-8 h-8 border-4';
    }
  });
  
  const spinnerColor = computed(() => `border-${props.color}-400`);
  </script>