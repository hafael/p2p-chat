<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-10">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-50" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-cyan-400">Criar Novo Grupo</DialogTitle>
              <form @submit.prevent="handleCreate">
                <div class="mt-4">
                  <label for="groupName" class="text-sm text-gray-300">Nome do Grupo</label>
                  <input id="groupName" v-model="groupName" type="text" class="input-style mt-1" placeholder="# geral" />
                </div>

                <div class="mt-6 flex justify-end gap-4">
                  <button type="button" @click="closeModal" class="btn-secondary bg-gray-600 hover:bg-gray-500">Cancelar</button>
                  <button type="submit" class="btn-primary">Criar</button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref } from 'vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';

const isOpen = ref(false);
const groupName = ref('');

const emit = defineEmits(['create-group']);

const openModal = () => {
  isOpen.value = true;
};

const closeModal = () => {
  isOpen.value = false;
  groupName.value = '';
};

const handleCreate = () => {
  if (groupName.value.trim()) {
    emit('create-group', groupName.value);
    closeModal();
  }
};

// Expose openModal to parent component
defineExpose({ openModal });
</script>
