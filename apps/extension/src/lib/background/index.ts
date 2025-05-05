import { bookmarks, runtime, tabs } from "webextension-polyfill";
import { onMessage, sendMessage } from "webext-bridge/background";
import type { BridgeMessage } from "webext-bridge";
import { generateUsername, rand, sortByIdOrder } from "$lib/utils.svelte";
import { TAB_COLOR } from "$lib/const";
import { sessionStorage } from "$lib/storage";
import { uniq } from "rambda";

async function _getTabs(groupId?: number) {
  const allTabs = await chrome.tabs.query(groupId ? { groupId } : {});
  return allTabs;
}

async function getTabs(message: BridgeMessage<{ groupId?: number }>) {
  return _getTabs(message.data.groupId);
}

async function _activateTab(tabId: number) {
  await tabs.update(tabId, { active: true });
}

async function activateTab(message: BridgeMessage<{ tabId: number }>) {
  await _activateTab(message.data.tabId);
}

async function _moveTab(tabId: number, index: number) {
  return tabs.move(tabId, { index });
}

async function swapTabs(
  message: BridgeMessage<{ fromId: number; toId: number }>,
) {
  const allTabs = await _getTabs();
  const fromIndex = allTabs.findIndex((tab) => tab.id === message.data.fromId);
  const toIndex = allTabs.findIndex((tab) => tab.id === message.data.toId);
  try {
    await _moveTab(message.data.fromId, toIndex);
    await _moveTab(message.data.toId, fromIndex);
  } catch (error) {
    console.error(error);
  }
}

async function closeTab(message: BridgeMessage<{ tabId: number }>) {
  const allTabs = await _getTabs();
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
  const allTabs = await _getTabs();
  const currentTab = allTabs.find((tab) => tab.id === message.data.tabId);
  if (!currentTab) return;
  const otherTabs = allTabs.filter((tab) => tab.id !== message.data.tabId);
  await tabs.remove(
    otherTabs.map((tab) => tab.id).filter((id) => id !== undefined),
  );
}

async function fetchPage(message: BridgeMessage<{ tabId: number }>) {
  const tab = await tabs.get(message.data.tabId);
  const destination = `content-script@${message.data.tabId}`;
  const parsed = (await sendMessage(
    "grinta_getContent",
    { tabId: message.data.tabId },
    destination,
  )) as { content: string };
  return { url: tab.url, title: tab.title, content: parsed.content };
}

async function getGroups() {
  const allGroups = await chrome.tabGroups.query({});
  const allTabs = await _getTabs();
  const groupsOrder = Array.from(
    new Set(
      allTabs.map((tab) => (tab as unknown as { groupId: number }).groupId),
    ),
  );
  const sortedGroups = sortByIdOrder(allGroups, groupsOrder);
  return sortedGroups;
}

async function _activateGroup(groupId: number) {
  const allGroups = await getGroups();
  for (const group of allGroups) {
    await chrome.tabGroups.update(group.id, { collapsed: true });
  }
  await chrome.tabGroups.update(groupId, { collapsed: false });
  const groupTabs = await chrome.tabs.query({ groupId });
  const firstTabId = groupTabs[0]?.id;
  if (!firstTabId) return;
  await chrome.tabs.update(firstTabId, { active: true });
}

async function activateGroup(message: BridgeMessage<{ groupId: number }>) {
  return _activateGroup(message.data.groupId);
}

async function deleteGroup(message: BridgeMessage<{ groupId: number }>) {
  const tabIds = await chrome.tabs.query({ groupId: message.data.groupId });
  await chrome.tabs.ungroup(tabIds.map((tab) => tab.id ?? 0));
}

async function _newGroup(color: string, title: string) {
  const blankTab = await chrome.tabs.create({});
  const group = await chrome.tabs.group({ tabIds: [blankTab?.id ?? 0] });
  await chrome.tabGroups.update(group, {
    color: color as chrome.tabGroups.ColorEnum,
    title,
  });
  const allGroups = await getGroups();
  for (const group of allGroups) {
    await chrome.tabGroups.update(group.id, { collapsed: true });
  }
  await chrome.tabGroups.update(group, { collapsed: false });
  await chrome.tabGroups.move(group, { index: -1 });
  return group;
}

async function newGroup(
  message: BridgeMessage<{ color: string; title: string }>,
) {
  return _newGroup(message.data.color, message.data.title);
}

async function updateGroup(
  message: BridgeMessage<{ groupId: number; color: string; title: string }>,
) {
  await chrome.tabGroups.update(message.data.groupId, {
    color: message.data.color as chrome.tabGroups.ColorEnum,
    title: message.data.title,
  });
}

async function _addTabsToGroup(tabIds: number[], groupId: number) {
  await chrome.tabs.group({
    tabIds,
    groupId,
  });
}

async function addTabsToGroup(
  message: BridgeMessage<{ tabIds: number[]; groupId: number }>,
) {
  await _addTabsToGroup(message.data.tabIds, message.data.groupId);
  await _activateTab(message.data.tabIds[0]);
}

async function swapGroups(
  message: BridgeMessage<{ fromIndex: number; toIndex: number }>,
) {
  let { fromIndex, toIndex } = message.data;
  if (fromIndex === toIndex) return;
  const allGroups = await getGroups();
  const fromId = allGroups[fromIndex]?.id;
  const toId = allGroups[toIndex]?.id;
  if (!fromId || !toId) return;
  await chrome.tabGroups.move(fromId, { index: toIndex });
  await chrome.tabGroups.move(toId, { index: fromIndex });
}

async function _createEssentialsFolder(title: string) {
  const rootBookmarksFolder = await _getRootBookmarksFolder();
  return bookmarks.create({
    parentId: rootBookmarksFolder.id,
    title,
  });
}

async function createEssentialsFolder(
  message: BridgeMessage<{ title: string }>,
) {
  return _createEssentialsFolder(message.data.title);
}

async function _findEssentialsFolder(title: string) {
  const searchResult = await bookmarks.search({ title });
  return searchResult[0];
}

async function addToEssentials(message: BridgeMessage<{ tabId: number }>) {
  let folderId: string;
  const tab = await chrome.tabs.get(message.data.tabId);
  const tabGroup = await chrome.tabGroups.get(tab.groupId);
  if (!tabGroup?.title) return;
  const essentialsFolder = await _findEssentialsFolder(tabGroup.title);
  folderId = essentialsFolder?.id;
  if (!essentialsFolder) {
    const createResult = await _createEssentialsFolder(tabGroup.title);
    folderId = createResult.id;
  }
  await bookmarks.create({
    parentId: folderId,
    title: tab.title,
    url: tab.url,
  });
}

async function findEssentialsFolder(message: BridgeMessage<{ title: string }>) {
  return _findEssentialsFolder(message.data.title);
}

async function updateFolder(
  message: BridgeMessage<{ folderId: string; title: string }>,
) {
  await bookmarks.update(message.data.folderId, { title: message.data.title });
}

async function deleteFolder(message: BridgeMessage<{ folderId: string }>) {
  await bookmarks.remove(message.data.folderId);
}

async function _getRootBookmarksFolder() {
  const rootBookmarksFolder = await bookmarks.search({ title: "Grinta" });
  if (rootBookmarksFolder.length === 0) {
    await bookmarks.create({ title: "Grinta" });
  }
  return rootBookmarksFolder[0];
}

async function stateUpdate() {
  const activeGroupId = (await chrome.tabs.query({ active: true }))[0]?.groupId;
  if (activeGroupId && activeGroupId !== -1) {
    await sessionStorage.set("currentSpaceId", activeGroupId.toString());
  }
  const currentSpaceId = await sessionStorage.get("currentSpaceId");
  const rootBookmarksFolder = await _getRootBookmarksFolder();
  const updatedTabs = await _getTabs();
  const ungroupedTabs = updatedTabs
    .filter((tab) => tab.groupId === -1)
    .map((tab) => tab.id ?? 0);
  const updatedGroups = await getGroups();
  if (updatedGroups.length === 0) {
    const randomColor = rand(TAB_COLOR);
    const newGroup = await _newGroup(randomColor, generateUsername());
    await sessionStorage.set("currentSpaceId", newGroup.toString());
  }
  if (currentSpaceId && ungroupedTabs.length > 0) {
    await _addTabsToGroup(ungroupedTabs, parseInt(currentSpaceId));
    await _activateGroup(parseInt(currentSpaceId));
    await _moveTab(ungroupedTabs[0], 0);
    await _activateTab(ungroupedTabs[0]);
  }
  const savedOpeners = await sessionStorage.get("openers");
  const openers = updatedTabs
    .filter((tab) => tab.openerTabId)
    .map((tab) => ({
      openerId: tab.openerTabId ?? 0,
      childId: tab.id ?? 0,
    }));
  const allOpeners = uniq([
    ...openers,
    ...(savedOpeners ? JSON.parse(savedOpeners) : []),
  ]);
  await sessionStorage.set("openers", JSON.stringify(allOpeners));
  const essentialFolders = await bookmarks.getChildren(rootBookmarksFolder.id);
  const essentials: Record<string, chrome.bookmarks.BookmarkTreeNode[]> = {};
  for (const folder of essentialFolders) {
    const children = await chrome.bookmarks.getChildren(folder.id);
    essentials[folder.title] = children;
  }
  await sessionStorage.set(
    "state",
    JSON.stringify({
      tabs: updatedTabs,
      groups: updatedGroups,
      openers: allOpeners,
      essentials,
    }),
  );
}

async function openEssential(message: BridgeMessage<{ essentialId: string }>) {
  const essential = await chrome.bookmarks.get(message.data.essentialId);
  if (!essential[0]?.url) return;
  const currentSpaceId = await sessionStorage.get("currentSpaceId");
  if (!currentSpaceId) return;
  const existingTabs = await chrome.tabs.query({
    url: essential[0].url,
    pinned: true,
  });
  if (existingTabs.length > 0) {
    await _activateTab(existingTabs[0].id ?? 0);
    return;
  }
  const tab = await chrome.tabs.create({ url: essential[0].url, pinned: true });
  await _activateTab(tab.id ?? 0);
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
onMessage("grinta_addTabsToGroup", addTabsToGroup);
onMessage("grinta_swapGroups", swapGroups);
onMessage("grinta_addToEssentials", addToEssentials);
onMessage("grinta_createEssentialsFolder", createEssentialsFolder);
onMessage("grinta_findEssentialsFolder", findEssentialsFolder);
onMessage("grinta_updateFolder", updateFolder);
onMessage("grinta_deleteFolder", deleteFolder);
onMessage("grinta_updateState", stateUpdate);
onMessage("grinta_openEssential", openEssential);

runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onUpdated.addListener(stateUpdate);
chrome.tabs.onRemoved.addListener(stateUpdate);
chrome.tabs.onCreated.addListener(stateUpdate);
chrome.tabs.onMoved.addListener(stateUpdate);
chrome.tabs.onActivated.addListener(stateUpdate);
chrome.tabs.onReplaced.addListener(stateUpdate);
chrome.tabGroups.onUpdated.addListener(stateUpdate);
chrome.tabGroups.onCreated.addListener(stateUpdate);
chrome.tabGroups.onRemoved.addListener(stateUpdate);
chrome.tabGroups.onMoved.addListener(stateUpdate);
chrome.bookmarks.onCreated.addListener(stateUpdate);
chrome.bookmarks.onRemoved.addListener(stateUpdate);
chrome.bookmarks.onChanged.addListener(stateUpdate);
