import browser, { tabs } from "webextension-polyfill";
import { onMessage, sendMessage } from "webext-bridge/background";
import type { BridgeMessage } from "webext-bridge";

async function getTabs() {
  const allTabs = await tabs.query({});
  return allTabs;
}

async function activateTab(message: BridgeMessage<{ tabId: number }>) {
  await tabs.update(message.data.tabId, { active: true });
}

async function swapTabs(
  message: BridgeMessage<{ fromIndex: number; toIndex: number }>,
) {
  const allTabs = await tabs.query({});
  const fromId = allTabs[message.data.fromIndex]?.id;
  const toId = allTabs[message.data.toIndex]?.id;
  if (!fromId || !toId) return;
  try {
    await tabs.move(fromId, { index: message.data.toIndex });
    await tabs.move(toId, { index: message.data.fromIndex });
  } catch (error) {
    console.error(error);
  }
}

async function closeTab(message: BridgeMessage<{ tabId: number }>) {
  const allTabs = await tabs.query({});
  if (allTabs.length === 1) {
    await tabs.create({});
  }
  await tabs.remove(message.data.tabId);
}

async function newTab(
  message: BridgeMessage<{ tabId?: number; groupId?: number }>,
) {
  if (!message.data.tabId) {
    const tab = await tabs.create({ active: true, index: 0 });
    if (!message.data.groupId) return;
    return chrome.tabs.group({
      tabIds: [tab.id ?? 0],
      groupId: message.data.groupId,
    });
  }
  const index = (await tabs.get(message.data.tabId)).index;
  const tab = await tabs.create({ index: index + 1, active: true });
  if (!message.data.groupId) return;
  return chrome.tabs.group({
    tabIds: [tab.id ?? 0],
    groupId: message.data.groupId,
  });
}

async function reloadTab(message: BridgeMessage<{ tabId: number }>) {
  await tabs.reload(message.data.tabId);
}

async function duplicateTab(message: BridgeMessage<{ tabId: number }>) {
  await tabs.duplicate(message.data.tabId);
}

async function togglePinTab(message: BridgeMessage<{ tabId: number }>) {
  const tab = await tabs.get(message.data.tabId);
  await tabs.update(message.data.tabId, { pinned: !tab.pinned });
}

async function toggleMuteTab(message: BridgeMessage<{ tabId: number }>) {
  const tab = await tabs.get(message.data.tabId);
  const muted = tab.mutedInfo?.muted ?? false;
  await tabs.update(message.data.tabId, { muted: !muted });
}

async function closeOtherTabs(message: BridgeMessage<{ tabId: number }>) {
  const allTabs = await tabs.query({});
  const currentTab = allTabs.find((tab) => tab.id === message.data.tabId);
  if (!currentTab) return;
  const otherTabs = allTabs.filter((tab) => tab.id !== message.data.tabId);
  await tabs.remove(
    otherTabs.map((tab) => tab.id).filter((id) => id !== undefined),
  );
}

async function fetchPage(message: BridgeMessage<{ tabId: number }>) {
  const destination = `content-script@${message.data.tabId}`;
  const content = await sendMessage(
    "grinta_getContent",
    { tabId: message.data.tabId },
    destination,
  );
  return content;
}

async function getGroups() {
  const allGroups = chrome.tabGroups.query({});
  return allGroups;
}

async function activateGroup(message: BridgeMessage<{ groupId: number }>) {
  const allGroups = await getGroups();
  for (const group of allGroups) {
    await chrome.tabGroups.update(group.id, { collapsed: true });
  }
  await chrome.tabGroups.update(message.data.groupId, { collapsed: false });
  const groupTabs = await chrome.tabs.query({ groupId: message.data.groupId });
  const firstTabId = groupTabs[0].id;
  if (!firstTabId) return;
  await chrome.tabs.update(firstTabId, { active: true });
}

async function deleteGroup(message: BridgeMessage<{ groupId: number }>) {
  const tabIds = await chrome.tabs.query({ groupId: message.data.groupId });
  await chrome.tabs.ungroup(tabIds.map((tab) => tab.id ?? 0));
}

async function newGroup(
  message: BridgeMessage<{ color: string; title: string }>,
) {
  const group = await chrome.tabs.group({ tabIds: [] });
  await chrome.tabGroups.update(group, {
    color: message.data.color as chrome.tabGroups.ColorEnum,
    title: message.data.title,
  });
}

async function updateGroup(
  message: BridgeMessage<{ groupId: number; color: string; title: string }>,
) {
  await chrome.tabGroups.update(message.data.groupId, {
    color: message.data.color as chrome.tabGroups.ColorEnum,
    title: message.data.title,
  });
}

onMessage("grinta_getTabs", getTabs);
onMessage("grinta_activateTab", activateTab);
onMessage("grinta_swapTabs", swapTabs);
onMessage("grinta_closeTab", closeTab);
onMessage("grinta_newTab", newTab);
onMessage("grinta_reloadTab", reloadTab);
onMessage("grinta_duplicateTab", duplicateTab);
onMessage("grinta_togglePinTab", togglePinTab);
onMessage("grinta_toggleMuteTab", toggleMuteTab);
onMessage("grinta_closeOtherTabs", closeOtherTabs);
onMessage("grinta_fetchPage", fetchPage);
onMessage("grinta_getGroups", getGroups);
onMessage("grinta_activateGroup", activateGroup);
onMessage("grinta_deleteGroup", deleteGroup);
onMessage("grinta_newGroup", newGroup);
onMessage("grinta_updateGroup", updateGroup);

browser.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});
