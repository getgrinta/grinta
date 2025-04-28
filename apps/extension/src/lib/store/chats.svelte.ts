import { PersistedStore } from "$lib/utils.svelte";
import { z } from "zod";

export const AttachmentSchema = z.object({
  name: z.string(),
  contentType: z.string(),
  url: z.string(),
});

export const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  experimental_attachments: z.array(AttachmentSchema).default([]),
  role: z.enum(["system", "user", "assistant", "data"]),
  createdAt: z.date().optional(),
  parts: z.any(),
});

export type MessageData = z.infer<typeof MessageSchema>;

export const ChatDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(MessageSchema),
});

export type ChatData = z.infer<typeof ChatDataSchema>;

export const ChatsSchema = z.object({
  chats: z.array(ChatDataSchema),
});

export type Chats = z.infer<typeof ChatsSchema>;

export class ChatStore extends PersistedStore<Chats> {
  data = $state<Chats>(ChatsSchema.parse({}));

  appendMessage(chatId: string, message: MessageData) {
    const chat = this.data.chats.find((chat) => chat.id === chatId);
    if (!chat) return;
    chat.messages.push(message);
    this.persist();
  }

  createChat(title: string) {
    const chat = ChatDataSchema.parse({
      id: crypto.randomUUID(),
      title,
      messages: [],
    });
    this.data.chats.push(chat);
    this.persist();
  }

  generateResponse(chatId: string) {}
}

export const chatStore = new ChatStore({
  storageKey: "chats",
  schema: ChatsSchema,
});
