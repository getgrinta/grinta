// Defines the structure for a Quick Search mode
export type QuickSearchMode = {
  shortcut: string;
  name: string;
  bgColorClass: string;
  textColorClass: string;
  searchUrl: (query: string) => string;
};

// Default Quick Search providers
export const defaultQuickSearchModes: QuickSearchMode[] = [
  {
    shortcut: "G",
    name: "Google",
    bgColorClass: "blue-500",
    textColorClass: "text-white",
    searchUrl: (query: string) =>
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    shortcut: "Y",
    name: "YouTube",
    bgColorClass: "red-500",
    textColorClass: "text-white",
    searchUrl: (query: string) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
  },
  {
    shortcut: "C",
    name: "ChatGPT",
    bgColorClass: "green-600",
    textColorClass: "text-white",
    searchUrl: (query: string) =>
      `https://www.google.com/search?q=site%3Achat.openai.com+${encodeURIComponent(query)}`, // Placeholder
  },
  {
    shortcut: "W",
    name: "Wikipedia",
    bgColorClass: "gray-200",
    textColorClass: "text-black",
    searchUrl: (query: string) =>
      `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
  },
  {
    shortcut: "P",
    name: "Perplexity",
    bgColorClass: "blue-800",
    textColorClass: "text-white",
    searchUrl: (query: string) =>
      `https://www.perplexity.ai/search?q=${encodeURIComponent(query)}`,
  },
  {
    shortcut: "R",
    name: "Reddit",
    bgColorClass: "orange-500",
    textColorClass: "text-white",
    searchUrl: (query: string) =>
      `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
  },
  {
    shortcut: "F",
    name: "Figma",
    bgColorClass: "purple-500",
    textColorClass: "text-white",
    searchUrl: (query: string) =>
      `https://www.figma.com/community/search?query=${encodeURIComponent(query)}`,
  },
  {
    shortcut: "J",
    name: "Jira",
    bgColorClass: "sky-600",
    textColorClass: "text-white",
    searchUrl: (query: string) =>
      `https://www.google.com/search?q=site%3Aatlassian.com+${encodeURIComponent(query)}`, // Placeholder
  },
  {
    shortcut: "X",
    name: "X (Twitter)",
    bgColorClass: "black",
    textColorClass: "text-white",
    searchUrl: (query: string) =>
      `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query`,
  },
];
