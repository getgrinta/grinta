import type { ExecutableCommand, Settings } from "@getgrinta/core";
import type { fetch } from "@tauri-apps/plugin-http";
import type { z } from "zod/v3";
import { AppStateContextSchema } from "./schema";

export type AppStateContext = z.infer<typeof AppStateContextSchema>;

export type PluginContext = {
  fetch: typeof fetch;
  exec: (command: ExecutableCommand) => Promise<boolean | void>;
  t: (key: string, interpolation: Record<string, string>) => string;
  fail: (reason: string) => void;
  app: AppStateContext;
  settings: Settings;
};

export type PluginInit = {
  name: string;
  onRegister?: (context: PluginContext) => Promise<void>;
  handleCommand?: (
    command: ExecutableCommand,
    context: PluginContext,
  ) => Promise<{ matched: boolean }>;
  addAppModes?: (context: PluginContext) => Promise<string[]>;
  addSearchResults?: (
    query: string,
    context: PluginContext,
  ) => Promise<ExecutableCommand[]>;
};

export type PluginInstance = {
  register: () => Promise<PluginInstance>;
  handleCommand: (command: ExecutableCommand) => Promise<{ matched: boolean }>;
  addAppModes?: () => Promise<string[]>;
  addSearchResults?: (query: string) => Promise<ExecutableCommand[]>;
};

export type Plugin = (context: PluginContext) => PluginInstance;
