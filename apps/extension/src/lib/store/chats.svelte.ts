import { PersistedStore } from "$lib/utils.svelte";
import { ChatMessageSchema, type ChatMessageData } from "@getgrinta/core";
import { z } from "zod";

export const ChatDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(ChatMessageSchema),
});

export type ChatData = z.infer<typeof ChatDataSchema>;

export const ChatsSchema = z.object({
  chats: z.array(ChatDataSchema).default([]),
});

export type Chats = z.infer<typeof ChatsSchema>;

export class ChatsStore extends PersistedStore<Chats> {
  data = $state<Chats>(ChatsSchema.parse({}));

  async appendMessage(chatId: string, message: ChatMessageData) {
    const { chat, index } = this.getChat(chatId);
    if (!chat) return;
    chat.messages.push({
      ...message,
      createdAt: message.createdAt ?? new Date(),
    });
    this.data.chats[index] = chat;
    await this.persist();
  }

  getChat(chatId: string) {
    const index = this.data.chats.findIndex((chat) => chat.id === chatId);
    return {
      chat: this.data.chats[index],
      index,
    };
  }

  getChatUpdatedAt(chatId: string) {
    const { chat } = this.getChat(chatId);
    return chat?.messages.at(-1)?.createdAt;
  }

  getMessages(chatId: string) {
    const { chat } = this.getChat(chatId);
    return chat?.messages ?? [];
  }

  async createChat() {
    const chat = ChatDataSchema.parse({
      id: crypto.randomUUID(),
      title: "Untitled",
      messages: [],
    });
    this.data.chats.push(chat);
    await this.persist();
    return chat;
  }

  async setTitle(chatId: string, title: string) {
    const { chat, index } = this.getChat(chatId);
    if (!chat) return;
    chat.title = title;
    this.data.chats[index] = chat;
    await this.persist();
  }

  async setMessages(chatId: string, messages: ChatMessageData[]) {
    const { chat, index } = this.getChat(chatId);
    if (!chat) return;
    chat.messages = messages;
    this.data.chats[index] = chat;
    await this.persist();
  }

  async deleteChat(chatId: string) {
    const { index } = this.getChat(chatId);
    if (index === -1) return; // nothing to delete
    this.data.chats.splice(index, 1);
    await this.persist();
  }
}

export const chatsStore = new ChatsStore({
  storageKey: "chats",
  schema: ChatsSchema,
});
