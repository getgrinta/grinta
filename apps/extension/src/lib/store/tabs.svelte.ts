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

  currentTab = $derived(
    this.tabs.find((tab) => tab.active),
  );
  currentSpaceId = $derived(
    this.currentTab?.groupId,
  );
  currentSpace = $derived(
    this.groups.find((group) => group.id === this.currentSpaceId),
  );

  async addGroup() {
    const randomColor = rand(TAB_COLOR);
    await sendMessage("grinta_newGroup", {
      color: randomColor,
      title: generateUsername(),
    });
  }

  async nextSpace() {
    if (!this.currentSpaceId) return;
    const index = this.groups.findIndex(
      (group) => group.id === this.currentSpaceId,
    );
    const nextIndex = index + 1;
    const nextSpaceId = this.groups[nextIndex]?.id;
    if (!nextSpaceId) {
      await sendMessage("grinta_activateGroup", { groupId: this.groups[0].id }, "background");
    }
    return sendMessage("grinta_activateGroup", { groupId: nextSpaceId }, "background");
  }

  async prevSpace() {
    if (!this.currentSpaceId) return;
    const index = this.groups.findIndex(
      (group) => group.id === this.currentSpaceId,
    );
    const prevIndex = index - 1;
    const prevSpaceId = this.groups[prevIndex]?.id;
    if (!prevSpaceId) {
      await sendMessage("grinta_activateGroup", { groupId: this.groups[this.groups.length - 1].id }, "background");
    }
    return sendMessage("grinta_activateGroup", { groupId: prevSpaceId }, "background");
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
