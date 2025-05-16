export const TAB_COLOR = [
  "grey",
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
];

export const colorVariant: Record<chrome.tabGroups.Color, string> = {
  grey: "bg-gray-800 dark:bg-gray-200 text-gray-200 dark:text-gray-800 shadow-gray-800 dark:shadow-gray-200 outline-gray-800 dark:outline-gray-200",
  blue: "bg-blue-800 dark:bg-blue-200 text-blue-200 dark:text-blue-800 shadow-blue-800 dark:shadow-blue-200 outline-blue-800 dark:outline-blue-200",
  cyan: "bg-cyan-800 dark:bg-cyan-200 text-cyan-200 dark:text-cyan-800 shadow-cyan-800 dark:shadow-cyan-200 outline-cyan-800 dark:outline-cyan-200",
  green:
    "bg-green-800 dark:bg-green-200 text-green-200 dark:text-green-800 shadow-green-800 dark:shadow-green-200 outline-green-800 dark:outline-green-200",
  orange:
    "bg-orange-800 dark:bg-orange-200 text-orange-200 dark:text-orange-800 shadow-orange-800 dark:shadow-orange-200 outline-orange-800 dark:outline-orange-200",
  pink: "bg-pink-800 dark:bg-pink-200 text-pink-200 dark:text-pink-800 shadow-pink-800 dark:shadow-pink-200 outline-pink-800 dark:outline-pink-200",
  purple:
    "bg-purple-800 dark:bg-purple-200 text-purple-200 dark:text-purple-800 shadow-purple-800 dark:shadow-purple-200 outline-purple-800 dark:outline-purple-200",
  red: "bg-red-800 dark:bg-red-200 text-red-200 dark:text-red-800 shadow-red-800 dark:shadow-red-200 outline-red-800 dark:outline-red-200",
  yellow:
    "bg-yellow-800 dark:bg-yellow-200 text-yellow-200 dark:text-yellow-800 shadow-yellow-800 dark:shadow-yellow-200 outline-yellow-800 dark:outline-yellow-200",
};
