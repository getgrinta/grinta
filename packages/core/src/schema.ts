import { z } from "zod";

export const APP_MODE = {
  INITIAL: "INITIAL",
  NOTES: "NOTES",
  CLIPBOARD: "CLIPBOARD",
  CALENDAR: "CALENDAR",
} as const;

export const appModeEnum = z.nativeEnum(APP_MODE);

export const customizableAppModeEnum = z.union([appModeEnum, z.string()]);

// The order is important for command sorting.
export const COMMAND_HANDLER = {
  SYSTEM: "SYSTEM",
  APP: "APP",
  CHANGE_MODE: "CHANGE_MODE",
  COPY_TO_CLIPBOARD: "COPY_TO_CLIPBOARD",
  RUN_SHORTCUT: "RUN_SHORTCUT",
  OPEN_NOTE: "OPEN_NOTE",
  CREATE_NOTE: "CREATE_NOTE",
  URL: "URL",
  EMBEDDED_URL: "EMBEDDED_URL",
  FS_ITEM: "FS_ITEM",
  OPEN_CALENDAR: "OPEN_CALENDAR",
} as const;

export const commandHandlerEnum = z.nativeEnum(COMMAND_HANDLER);

export const customizableCommandHandlerEnum = z.union([
  commandHandlerEnum,
  z.string(),
]);

export const CalendarSchema = z.object({
  backgroundColor: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  calendarIdentifier: z.string().optional(),
  eventId: z.string().optional(),
  isAllDay: z.boolean().default(false),
});

export const MetadataSchema = z.object({
  contentType: z.string().optional(),
  path: z.string().optional(),
  ranAt: z.date().optional(),
  updatedAt: z.date().optional(),
  calendarSchema: CalendarSchema.optional(),
});

export const COMMAND_PRIORITY = {
  LOW: 0,
  MEDIUM: 10,
  HIGH: 100,
  TOP: 1000,
} as const;

export const ExecutableCommandSchema = z.object({
  label: z.string(),
  localizedLabel: z.string(),
  value: z.string(),
  metadata: MetadataSchema.default({}),
  handler: customizableCommandHandlerEnum,
  appModes: z.array(customizableAppModeEnum).min(1),
  smartMatch: z.boolean().default(false),
  priority: z.number().default(COMMAND_PRIORITY.LOW),
});

export const THEME = {
  SYSTEM: "SYSTEM",
  DARK: "DARK",
  LIGHT: "LIGHT",
} as const;

export type Theme = keyof typeof THEME;

export const ACCENT_COLOR = {
  MARE: "MARE",
  IRIS: "IRIS",
  FOAM: "FOAM",
  ATOM: "ATOM",
} as const;

export type AccentColor = keyof typeof ACCENT_COLOR;

export const LANGUAGE = {
  EN: "en",
  PL: "pl",
  DE: "de",
} as const;

// Create a reverse mapping from language code to enum key
const LANGUAGE_CODE_TO_ENUM = Object.entries(LANGUAGE).reduce(
  (acc, [key, value]) => {
    acc[value] = key as keyof typeof LANGUAGE;
    return acc;
  },
  {} as Record<string, keyof typeof LANGUAGE>,
);

export type Language = (typeof LANGUAGE)[keyof typeof LANGUAGE];

export const LANGUAGE_NATIVE_NAME = {
  [LANGUAGE.EN]: "English",
  [LANGUAGE.PL]: "Polski",
  [LANGUAGE.DE]: "Deutsch",
} as const;

export const BASE_CURRENCY = {
  EUR: "EUR",
  PLN: "PLN",
  CHF: "CHF",
  GBP: "GBP",
  USD: "USD",
} as const;

export type BaseCurrency = keyof typeof BASE_CURRENCY;

export const baseCurrencies = Object.keys(BASE_CURRENCY);

// Schema for a single custom quick link
export const CustomQuickLinkSchema = z.object({
  shortcut: z
    .string()
    .min(1, { message: "Shortcut be 1 or 2 characters long" })
    .max(2, { message: "Shortcut be 1 or 2 characters long" })
    .regex(/^[a-zA-Z0-9]{1,2}$/, { message: "Shortcut must be alphanumeric" }),
  name: z.string().min(1, { message: "Name cannot be empty" }),
  urlTemplate: z
    .string()
    .url({ message: "Must be a valid URL template" })
    .refine((val) => val.includes("{query}"), {
      message: 'URL template must include "{query}"',
    }),
});

export type CustomQuickLink = z.infer<typeof CustomQuickLinkSchema>;

// Get browser language or default to English
const getBrowserLanguage = (): Language => {
  if (typeof window === "undefined") return LANGUAGE.EN;

  const browserLang = window.navigator.language.split("-")[0];

  const enumKey = LANGUAGE_CODE_TO_ENUM[browserLang];
  return enumKey ? LANGUAGE[enumKey] : LANGUAGE.EN;
};

export const SEARCH_ENGINE = {
  STARTPAGE: "STARTPAGE",
  GOOGLE: "GOOGLE",
  DUCKDUCKGO: "DUCKDUCKGO",
  SCIRA: "SCIRA",
} as const;

export const SEARCH_ENGINE_STYLED = {
  [SEARCH_ENGINE.STARTPAGE]: "Startpage",
  [SEARCH_ENGINE.GOOGLE]: "Google",
  [SEARCH_ENGINE.DUCKDUCKGO]: "DuckDuckGo",
  [SEARCH_ENGINE.SCIRA]: "Scira",
} as const;

export const SettingsSchema = z.object({
  onboardingCompleted: z.boolean().default(false),
  toggleShortcut: z.string().default("CommandOrControl+Space"),
  theme: z.nativeEnum(THEME).default(THEME.SYSTEM),
  accentColor: z.nativeEnum(ACCENT_COLOR).default(ACCENT_COLOR.MARE),
  language: z.nativeEnum(LANGUAGE).default(getBrowserLanguage()),
  clipboardRecordingEnabled: z.boolean().default(true),
  defaultSearchEngine: z
    .nativeEnum(SEARCH_ENGINE)
    .default(SEARCH_ENGINE.STARTPAGE),
  notesDir: z.array(z.string()).default(["Grinta", "notes"]),
  proAutocompleteEnabled: z.boolean().default(true),
  incognitoEnabled: z.boolean().default(false),
  showWidgetLabels: z.boolean().default(true),
  baseCurrency: z.nativeEnum(BASE_CURRENCY).default(BASE_CURRENCY.USD),
  fsSearchOnlyInHome: z.boolean().default(false),
  fsSearchAdditionalExtensions: z.array(z.string()).default([]),
  accessibilityPermissions: z.boolean().default(false),
  fsPermissions: z.boolean().default(false),
  selectedCalendarIdentifiers: z.array(z.string()).default([]),
  ignoredEventIds: z.array(z.string()).default([]),
  customQuickLinks: z.array(CustomQuickLinkSchema).default([]),
});
