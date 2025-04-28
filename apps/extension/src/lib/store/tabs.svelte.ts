import { sendMessage } from "webext-bridge/popup";

export class TabsStore {
  tabs = $state<chrome.tabs.Tab[]>([]);
  groups = $state<chrome.tabGroups.TabGroup[]>([]);

  async updateTabs() {
    const updatedTabs = (await sendMessage(
      "grinta_getTabs",
      {},
      "background",
    )) as unknown as chrome.tabs.Tab[];
    this.tabs = updatedTabs;
  }

  async updateGroups() {
    const updatedGroups = (await sendMessage(
      "grinta_getGroups",
      {},
      "background",
    )) as unknown as chrome.tabGroups.TabGroup[];
    this.groups = updatedGroups;
  }

  registerListeners() {
    chrome.tabs.onUpdated.addListener(() => this.updateTabs());
    chrome.tabs.onRemoved.addListener(() => this.updateTabs());
    chrome.tabs.onCreated.addListener(() => this.updateTabs());
    chrome.tabs.onMoved.addListener(() => this.updateTabs());
    chrome.tabs.onActivated.addListener(() => this.updateTabs());
    chrome.tabs.onReplaced.addListener(() => this.updateTabs());
    chrome.tabGroups.onUpdated.addListener(() => this.updateGroups());
    chrome.tabGroups.onCreated.addListener(() => this.updateGroups());
    chrome.tabGroups.onRemoved.addListener(() => this.updateGroups());
    chrome.tabGroups.onMoved.addListener(() => this.updateGroups());
  }

  unregisterListeners() {
    chrome.tabs.onUpdated.removeListener(() => this.updateTabs());
    chrome.tabs.onRemoved.removeListener(() => this.updateTabs());
    chrome.tabs.onCreated.removeListener(() => this.updateTabs());
    chrome.tabs.onMoved.removeListener(() => this.updateTabs());
    chrome.tabs.onActivated.removeListener(() => this.updateTabs());
    chrome.tabs.onReplaced.removeListener(() => this.updateTabs());
    chrome.tabGroups.onUpdated.removeListener(() => this.updateGroups());
    chrome.tabGroups.onCreated.removeListener(() => this.updateGroups());
    chrome.tabGroups.onRemoved.removeListener(() => this.updateGroups());
    chrome.tabGroups.onMoved.removeListener(() => this.updateGroups());
  }
}

export const tabsStore = new TabsStore();
