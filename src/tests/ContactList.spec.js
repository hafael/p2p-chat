import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useNetworkStore } from '@/stores/network'
import ContactList from '@/components/ContactList.vue'

// Mock the networkService
vi.mock('@/services/networkService', () => ({
  initialize: vi.fn(),
  shutdown: vi.fn(),
  findUser: vi.fn(),
  sendContactRequest: vi.fn(),
  respondToContactRequest: vi.fn(),
  ensureConnection: vi.fn(),
  sendMessage: vi.fn(),
  createGroup: vi.fn(),
  sendGroupMessage: vi.fn(),
}))

// Mock child components
const ContactSearch = {
  template: '<div class="contact-search-mock"></div>',
}
const RequestNotification = {
  template: '<div class="request-notification-mock"></div>',
}
const LoadingSpinner = {
  template: '<div class="loading-spinner-mock"></div>',
}
const AddContactModal = {
  template: '<div class="add-contact-modal-mock"></div>',
  methods: {
    openModal: vi.fn(),
  },
}

describe('ContactList.vue', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const currentUser = {
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: ''
  }

  it('should render correctly with no contacts', () => {
    const wrapper = mount(ContactList, {
      props: { currentUser },
      global: {
        plugins: [pinia],
        stubs: {
          ContactSearch,
          RequestNotification,
          LoadingSpinner,
          AddContactModal,
          'router-link': true,
        },
      },
    })

    expect(wrapper.find('h2').text()).toBe('Contatos')
    expect(wrapper.find('.text-center p').text()).toBe('Nenhum contato adicionado.')
  })

  it('should display online and offline contacts', async () => {
    const networkStore = useNetworkStore()
    networkStore.contacts = [
      { peerId: '1', displayName: 'Alice', username: 'alice', isOnline: true },
      { peerId: '2', displayName: 'Bob', username: 'bob', isOnline: false },
    ]

    const wrapper = mount(ContactList, {
      props: { currentUser },
      global: {
        plugins: [pinia],
        stubs: {
          ContactSearch,
          RequestNotification,
          LoadingSpinner,
          AddContactModal,
          'router-link': true,
        },
      },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('h3.text-gray-400').text()).toContain('Online')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('should emit selectContact when a contact is clicked', async () => {
    const networkStore = useNetworkStore()
    const contact = { peerId: '1', displayName: 'Alice', username: 'alice', isOnline: true }
    networkStore.contacts = [contact]

    const wrapper = mount(ContactList, {
      props: { currentUser },
      global: {
        plugins: [pinia],
        stubs: {
          ContactSearch,
          RequestNotification,
          LoadingSpinner,
          AddContactModal,
          'router-link': true,
        },
      },
    })

    await wrapper.vm.$nextTick()

    await wrapper.find('li').trigger('click')

    expect(wrapper.emitted().selectContact).toBeTruthy()
    expect(wrapper.emitted().selectContact[0][0]).toEqual(contact)
  })
})
