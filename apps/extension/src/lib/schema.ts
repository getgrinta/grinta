import { z } from "zod";

export const GetContentSchema = z.object({
  content: z.string(),
  title: z.string(),
  url: z.string(),
});

export const EssentialTabSchema = z.object({
  name: z.string(),
  url: z.string(),
  faviconUrl: z.string(),
});

export const SpaceTabSchema = z.object({
  tabId: z.number(),
});

export const SpaceSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string(),
  essentialTabs: z.array(EssentialTabSchema).default([]),
  tabs: z.array(SpaceTabSchema).default([]),
});

export const OpenerSchema = z.object({
  openerId: z.number(),
  childId: z.number(),
});
