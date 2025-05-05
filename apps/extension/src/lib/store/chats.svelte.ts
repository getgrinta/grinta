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
    const chat = this.data.chats.find((chat) => chat.id === chatId);
    if (!chat) return;
    chat.messages.push(message);
    await this.persist();
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
    const chat = this.data.chats.find((chat) => chat.id === chatId);
    if (!chat) return;
    chat.title = title;
    await this.persist();
  }
}

export const chatsStore = new ChatsStore({
  storageKey: "chats",
  schema: ChatsSchema,
});
