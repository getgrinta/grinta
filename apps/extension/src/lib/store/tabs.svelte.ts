import { sendMessage } from "webext-bridge/popup";
import { generateUsername, rand } from "$lib/utils.svelte";
import { TAB_COLOR } from "$lib/const";

type Opener = {
  openerId: number;
  childId: number;
};

export class TabsStore {
  tabs = $state<chrome.tabs.Tab[]>([]);
  groups = $state<chrome.tabGroups.TabGroup[]>([]);
  openers = $state<Opener[]>([]);
  essentials = $state<Record<string, chrome.bookmarks.BookmarkTreeNode[]>>({});

  async addGroup() {
    const randomColor = rand(TAB_COLOR);
    await sendMessage("grinta_newGroup", {
      color: randomColor,
      title: generateUsername(),
    });
  }

  async syncState(newState: {
    tabs: chrome.tabs.Tab[];
    groups: chrome.tabGroups.TabGroup[];
    openers: Opener[];
    essentials: Record<string, chrome.bookmarks.BookmarkTreeNode[]>;
  }) {
    if (!newState?.tabs) return;
    this.tabs = newState.tabs;
    this.groups = newState.groups;
    this.openers = newState.openers;
    this.essentials = newState.essentials;
  }
}

export const tabsStore = new TabsStore();
