<template>
  <div class="flex flex-col h-full bg-gray-800 p-4">
    <h2 class="text-xl font-bold text-cyan-400 mb-4">Online Contacts</h2>
    
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <LoadingSpinner />
    </div>

    <ul v-else-if="availableUsers.length > 0" class="flex-1 overflow-y-auto">
      <li
        v-for="user in availableUsers"
        :key="user.id"
        @click="selectContact(user)"
        class="p-2 rounded-md hover:bg-gray-700 cursor-pointer transition"
        :class="{ 'bg-cyan-800 text-white': selectedContact === user.username }"
      >
        {{ user.username }}
      </li>
    </ul>
    <div v-else class="flex-1 text-gray-500 text-sm p-2">
      <p>No other users online. Go to "Settings" to connect to the network.</p>
    </div>

    <div class="mt-auto pt-4 border-t border-gray-700">
      <Menu as="div" class="relative">
        <MenuButton class="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
          <span class="font-semibold text-white">{{ currentUser }}</span>
          <ChevronUpIcon class="h-5 w-5 text-gray-400" />
        </MenuButton>

        <transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <MenuItems class="absolute bottom-full mb-2 w-full origin-bottom-right bg-gray-700 divide-y divide-gray-600 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div class="px-1 py-1">
              <MenuItem v-slot="{ active }">
                <router-link
                  to="/settings"
                  :class="[
                    active ? 'bg-cyan-600 text-white' : 'text-gray-200',
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                  ]"
                >
                  <Cog6ToothIcon class="mr-2 h-5 w-5" aria-hidden="true" />
                  Settings
                </router-link>
              </MenuItem>
            </div>
            <div class="px-1 py-1">
              <MenuItem v-slot="{ active }">
                <button
                  @click="emit('logout')"
                  :class="[
                    active ? 'bg-red-600 text-white' : 'text-gray-200',
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                  ]"
                >
                  <ArrowRightOnRectangleIcon class="mr-2 h-5 w-5" aria-hidden="true" />
                  Logout
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>
    </div>
  </div>
</template>
  
<script setup>
  import { computed } from 'vue';
  import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
  import { ChevronUpIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/vue/24/solid';
  import LoadingSpinner from './LoadingSpinner.vue';
  
  const props = defineProps({
    onlineUsers: {
      type: Array,
      default: () => [],
    },
    currentUser: {
      type: String,
      required: true
    },
    selectedContact: {
      type: String,
      default: null
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  });
  
  const emit = defineEmits(['selectContact', 'logout']);
  
  const availableUsers = computed(() =>
    props.onlineUsers.filter(u => u.username !== props.currentUser)
  );
  
  const selectContact = (user) => {
    emit('selectContact', user);
  };
</script>