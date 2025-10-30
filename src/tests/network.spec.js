import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNetworkStore } from '@/stores/network.js'

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

describe('network.js store', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance and make it active
    setActivePinia(createPinia())
  })

  it('should have a correct initial state', () => {
    const store = useNetworkStore()
    expect(store.isOffline).toBe(false)
    expect(store.status).toBe('disconnected')
    expect(store.peerId).toBe(null)
    expect(store.contacts).toEqual([])
    expect(store.contactRequests).toEqual([])
    expect(store.directChats).toEqual({})
    expect(store.groups).toEqual({})
    expect(store.activeChatId).toBe(null)
    expect(store.activeChatType).toBe(null)
    expect(store.peerCount).toBe(0)
  })

  it('should set offline status', () => {
    const store = useNetworkStore()
    store.setOfflineStatus(true)
    expect(store.isOffline).toBe(true)
  })

  it('should add a contact', () => {
    const store = useNetworkStore()
    const contact = { peerId: '123', username: 'test' }
    store._addContact(contact)
    expect(store.contacts).toHaveLength(1)
    expect(store.contacts[0]).toEqual({ ...contact, isOnline: true })
  })

  it('should not add a duplicate contact', () => {
    const store = useNetworkStore()
    const contact = { peerId: '123', username: 'test' }
    store._addContact(contact)
    store._addContact(contact)
    expect(store.contacts).toHaveLength(1)
  })

  it('should remove a contact', () => {
    const store = useNetworkStore()
    const contact = { peerId: '123', username: 'test' }
    store._addContact(contact)
    store._removeContact('123')
    expect(store.contacts).toHaveLength(0)
  })

  it('should set active chat', () => {
    const store = useNetworkStore()
    store.setActiveChat('123', 'direct')
    expect(store.activeChatId).toBe('123')
    expect(store.activeChatType).toBe('direct')
    expect(store.directChats['123']).toBeDefined()
  })

  it('should add a direct message', () => {
    const store = useNetworkStore()
    const message = { text: 'hello', sender: 'other' }
    store._addDirectMessage('123', message)
    expect(store.directChats['123'].messages).toHaveLength(1)
    expect(store.directChats['123'].messages[0]).toEqual(message)
  })
})
