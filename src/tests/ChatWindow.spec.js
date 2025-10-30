import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatWindow from '@/components/ChatWindow.vue'

describe('ChatWindow.vue', () => {
  const directChat = {
    type: 'direct',
    contact: { displayName: 'Alice', isOnline: true },
    messages: [
      { text: 'Hello', sender: 'me', timestamp: Date.now() },
      { text: 'Hi', sender: 'alice', timestamp: Date.now() },
    ],
  }

  const groupChat = {
    type: 'group',
    name: 'Test Group',
    messages: [
      { text: 'Welcome', sender: 'me', timestamp: Date.now() },
      { text: 'Thanks', sender: 'bob', senderUsername: 'bob', timestamp: Date.now() },
    ],
  }

  it('should render correctly for a direct chat', () => {
    const wrapper = mount(ChatWindow, { props: { chat: directChat } })

    expect(wrapper.find('h2').text()).toBe('Alice')
    expect(wrapper.findAll('.flex.mb-4')).toHaveLength(2)
  })

  it('should render correctly for a group chat', () => {
    const wrapper = mount(ChatWindow, { props: { chat: groupChat } })

    expect(wrapper.find('h2').text()).toBe('# Test Group')
    expect(wrapper.findAll('.flex.mb-4')).toHaveLength(2)
  })

  it('should emit send-message when the form is submitted', async () => {
    const wrapper = mount(ChatWindow, { props: { chat: directChat } })

    await wrapper.find('input').setValue('New message')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted()['send-message']).toBeTruthy()
    expect(wrapper.emitted()['send-message'][0][0]).toBe('New message')
    expect(wrapper.vm.newMessage).toBe('')
  })

  it('should not emit send-message if the message is empty', async () => {
    const wrapper = mount(ChatWindow, { props: { chat: directChat } })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted()['send-message']).toBeFalsy()
  })
})
