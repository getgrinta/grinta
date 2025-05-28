declare global {
  const __BROWSER__: "chrome" | "firefox";
}

import { bookmarks, runtime, tabs } from "webextension-polyfill";
import { onMessage, sendMessage } from "webext-bridge/background";
import type { BridgeMessage } from "webext-bridge";
import { generateUsername, rand, sortByIdOrder } from "$lib/utils.svelte";
import { TAB_COLOR } from "$lib/const";
import { sessionStorage } from "$lib/storage";
import { uniq } from "rambda";
import pDebounce from "p-debounce";
import { load } from "cheerio";
import sanitizeHtml from "sanitize-html";
import html2md from "html-to-md";
import { htmlToMarkdownTree } from "$lib/dom";

async function _getTabs(groupId?: number) {
  const allTabs = await tabs.query(groupId ? ({ groupId } as never) : {});
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

async function _swapTabs(fromId: number, toId: number) {
  const allTabs = await _getTabs();
  const fromIndex = allTabs.findIndex((tab) => tab.id === fromId);
  const toIndex = allTabs.findIndex((tab) => tab.id === toId);
  await _moveTab(fromId, toIndex);
  return _moveTab(toId, fromIndex);
}

async function swapTabs(
  message: BridgeMessage<{ fromId: number; toId: number }>,
) {
  return _swapTabs(message.data.fromId, message.data.toId);
}

async function _closeTab(tabId: number) {
  await tabs.remove(tabId);
}

async function closeTab(message: BridgeMessage<{ tabId: number }>) {
  await _closeTab(message.data.tabId);
}

async function newTab(
  message: BridgeMessage<{ tabId?: number; groupId?: number; url?: string }>,
) {
  if (!message.data.tabId) {
    const tab = await tabs.create({
      active: true,
      index: 0,
      url: message.data.url,
    });
    if (!message.data.groupId) return;
    if (__BROWSER__ === "firefox") return;
    return chrome.tabs.group({
      tabIds: [tab.id ?? 0],
      groupId: message.data.groupId,
    });
  }
  const index = (await tabs.get(message.data.tabId)).index;
  const tab = await tabs.create({
    index: index + 1,
    active: true,
    url: message.data.url,
  });
  if (!message.data.groupId) return;
  if (__BROWSER__ === "firefox") return;
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
  const otherTabs = allTabs.filter(
    (tab) =>
      tab.id !== message.data.tabId && tab.groupId === currentTab.groupId,
  );
  await tabs.remove(
    otherTabs.map((tab) => tab.id).filter((id) => id !== undefined),
  );
}

async function getTabBody(tabId: number) {
  const debugee = {
    tabId,
  };
  await chrome.debugger.attach(debugee, "1.3");
  await chrome.debugger.sendCommand(debugee, "Accessibility.enable");
  await chrome.debugger.sendCommand(debugee, "DOM.enable");
  const documentInfo = (await chrome.debugger.sendCommand(
    debugee,
    "DOM.getDocument",
    {},
  )) as { root: { nodeId: number } };
  const rootNodeId = documentInfo?.root?.nodeId;
  try {
    const result = (await chrome.debugger.sendCommand(
      debugee,
      "DOM.getOuterHTML",
      { nodeId: rootNodeId },
    )) as { outerHTML: string };
    await chrome.debugger.detach(debugee);
    const $ = load(result.outerHTML);
    return $("body").html();
  } catch (error) {
    console.error(error);
    await chrome.debugger.detach(debugee);
    return "";
  }
}

async function fetchPage(message: BridgeMessage<{ tabId: number }>) {
  const tab = await tabs.get(message.data.tabId);
  const bodyHtml = await getTabBody(message.data.tabId);
  try {
    const purifiedBodyHtml = sanitizeHtml(bodyHtml?.toString() ?? "");
    const markdown = html2md(purifiedBodyHtml, {
      skipTags: [
        "iframe",
        "script",
        "style",
        "noscript",
        "object",
        "embed",
        "svg",
        "canvas",
        "link",
      ],
    });
    return { url: tab.url, title: tab.title, content: markdown };
  } catch (error) {
    console.error(error);
    return {
      url: tab.url,
      title: tab.title,
      content: "Failed to get page content.",
    };
  }
}

async function getGroups() {
  if (__BROWSER__ === "firefox") {
    return [];
  }
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
  if (__BROWSER__ === "firefox") return;
  const currentGroupId = await sessionStorage.get("currentSpaceId");
  if (currentGroupId === groupId.toString()) return;
  await sessionStorage.set("currentSpaceId", groupId.toString());
  const allGroups = await getGroups();
  for (const group of allGroups) {
    await chrome.tabGroups.update(group.id, { collapsed: true });
  }
  await chrome.tabGroups.update(groupId, { collapsed: false });
  const groupTabs = await chrome.tabs.query({ groupId });
  const firstTabId = groupTabs[0]?.id;
  if (!firstTabId) return;
  await tabs.update(firstTabId, { active: true });
}

async function activateGroup(message: BridgeMessage<{ groupId: number }>) {
  return _activateGroup(message.data.groupId);
}

async function deleteGroup(message: BridgeMessage<{ groupId: number }>) {
  if (__BROWSER__ === "firefox") return;
  const tabIds = await chrome.tabs.query({ groupId: message.data.groupId });
  await chrome.tabs.ungroup(tabIds.map((tab) => tab.id ?? 0));
  await Promise.all(tabIds.map((tab) => tabs.remove(tab.id ?? 0)));
  const allGroups = await getGroups();
  await _activateGroup(allGroups[allGroups.length - 1].id);
}

async function _newGroup(color: string, title: string) {
  if (__BROWSER__ === "firefox") return;
  const blankTab = await tabs.create({});
  const group = await chrome.tabs.group({ tabIds: [blankTab?.id ?? 0] });
  await chrome.tabGroups.update(group, {
    color: color as chrome.tabGroups.Color,
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
  if (__BROWSER__ === "firefox") return;
  const group = await chrome.tabGroups.get(message.data.groupId);
  if (!group?.title) return;
  const bookmarksFolder = await bookmarks.search({ title: group.title });
  if (bookmarksFolder.length > 0) {
    await bookmarks.update(bookmarksFolder[0].id, {
      title: message.data.title,
    });
  }
  await chrome.tabGroups.update(message.data.groupId, {
    color: message.data.color as chrome.tabGroups.Color,
    title: message.data.title,
  });
}

async function _addTabsToGroup(tabIds: number[], groupId: number) {
  if (__BROWSER__ === "firefox") return;
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

async function moveTabToGroup(
  message: BridgeMessage<{ tabId: number; groupId: number }>,
) {
  await _addTabsToGroup([message.data.tabId], message.data.groupId);
}

async function swapGroups(
  message: BridgeMessage<{ fromIndex: number; toIndex: number }>,
) {
  if (__BROWSER__ === "firefox") return;
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
  if (__BROWSER__ === "firefox") return;
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
  const activeGroupId = (await tabs.query({ active: true }))[0]?.groupId;
  if (activeGroupId && activeGroupId !== -1) {
    await sessionStorage.set("currentSpaceId", activeGroupId.toString());
  }
  let currentSpaceId = await sessionStorage.get("currentSpaceId");
  const rootBookmarksFolder = await _getRootBookmarksFolder();
  const updatedTabs = await _getTabs();
  const ungroupedTabs = updatedTabs
    .filter((tab) => tab.groupId === -1)
    .map((tab) => tab.id ?? 0);
  const updatedGroups = await getGroups();
  if (__BROWSER__ === "chrome" && updatedGroups.length === 0) {
    const randomColor = rand(TAB_COLOR);
    const newGroup = await _newGroup(randomColor, generateUsername());
    await sessionStorage.set("currentSpaceId", newGroup?.toString());
    currentSpaceId = newGroup?.toString();
  }
  if (currentSpaceId && ungroupedTabs.length > 0) {
    await _addTabsToGroup(ungroupedTabs, parseInt(currentSpaceId));
    await _activateGroup(parseInt(currentSpaceId));
    const updatedGroupTabs = await chrome.tabs.query({
      groupId: parseInt(currentSpaceId),
    });
    for (const tab of ungroupedTabs) {
      await _moveTab(tab, updatedGroupTabs[0].index);
    }
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

const debouncedStateUpdate = pDebounce(stateUpdate, 50);

async function openEssential(message: BridgeMessage<{ essentialId: string }>) {
  const essential = await chrome.bookmarks.get(message.data.essentialId);
  if (!essential[0]?.url) return;
  const currentSpaceId = (await _getTabs()).find((tab) => tab.active)?.groupId;
  if (!currentSpaceId) return;
  const groupTabs = await chrome.tabs.query({
    groupId: currentSpaceId,
  });
  const essentialUrl = new URL(essential[0].url);
  const existingTabs = groupTabs.filter((tab) =>
    tab.url?.startsWith(essentialUrl.origin),
  );
  if (existingTabs.length > 0) {
    await _activateTab(existingTabs[0].id ?? 0);
    return;
  }
  const tab = await chrome.tabs.create({ url: essential[0].url });
  await _addTabsToGroup([tab.id ?? 0], currentSpaceId);
  await _activateTab(tab.id ?? 0);
}

async function getCurrentTab() {
  const tab = await tabs.query({ active: true });
  return tab[0];
}

async function clickElement(
  message: BridgeMessage<{ tabId: number; selector: string }>,
) {
  const destination = `content-script@${message.data.tabId}`;
  return sendMessage(
    "grinta_clickElement",
    { selector: message.data.selector, tabId: message.data.tabId },
    destination,
  );
}

async function fillElement(
  message: BridgeMessage<{ tabId: number; selector: string; value: string }>,
) {
  const destination = `content-script@${message.data.tabId}`;
  return sendMessage(
    "grinta_fillElement",
    {
      selector: message.data.selector,
      value: message.data.value,
      tabId: message.data.tabId,
    },
    destination,
  );
}

async function getElements(message: BridgeMessage<{ tabId: number }>) {
  const bodyHtml = await getTabBody(message.data.tabId);
  if (!bodyHtml) return "";
  try {
    return htmlToMarkdownTree(bodyHtml);
  } catch (error) {
    console.error(error);
    return "";
  }
}

async function scrollToElement(
  message: BridgeMessage<{ tabId: number; selector: string }>,
) {
  const destination = `content-script@${message.data.tabId}`;
  return sendMessage(
    "grinta_scrollToElement",
    { selector: message.data.selector, tabId: message.data.tabId },
    destination,
  );
}

async function getElement(
  message: BridgeMessage<{ tabId: number; selector: string }>,
) {
  const destination = `content-script@${message.data.tabId}`;
  return sendMessage(
    "grinta_getElement",
    { selector: message.data.selector, tabId: message.data.tabId },
    destination,
  );
}

async function startRecording(message: BridgeMessage<{ tabId: number }>) {
  const destination = `content-script@${message.data.tabId}`;
  return sendMessage(
    "grinta_startRecording",
    { tabId: message.data.tabId },
    destination,
  );
}

async function stopRecording(message: BridgeMessage<{ tabId: number }>) {
  const destination = `content-script@${message.data.tabId}`;
  return sendMessage(
    "grinta_stopRecording",
    { tabId: message.data.tabId },
    destination,
  );
}

async function _moveBookmark(
  bookmarkId: string,
  index: number,
  parentId?: string,
) {
  return bookmarks.move(bookmarkId, { index, parentId });
}

async function swapEssentials(
  message: BridgeMessage<{
    folder: string;
    dragIndex: number;
    dropIndex: number;
  }>,
) {
  const folder = await _findEssentialsFolder(message.data.folder);
  const folderChildren = await chrome.bookmarks.getChildren(folder.id);
  const fromBookmark = folderChildren[message.data.dragIndex];
  const toBookmark = folderChildren[message.data.dropIndex];
  if (!fromBookmark || !toBookmark) return;
  await _moveBookmark(fromBookmark.id, toBookmark.index ?? 0, folder.id);
  return _moveBookmark(toBookmark.id, fromBookmark.index ?? 0, folder.id);
}

async function removeEssential(
  message: BridgeMessage<{ groupName: string; index: number }>,
) {
  const folder = await _findEssentialsFolder(message.data.groupName);
  const folderChildren = await chrome.bookmarks.getChildren(folder.id);
  const bookmark = folderChildren[message.data.index];
  if (!bookmark) return;
  await chrome.bookmarks.remove(bookmark.id);
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
onMessage("grinta_clickElement", clickElement);
onMessage("grinta_getElements", getElements);
onMessage("grinta_getElement", getElement);
onMessage("grinta_fillElement", fillElement);
onMessage("grinta_scrollToElement", scrollToElement);
onMessage("grinta_startRecording", startRecording);
onMessage("grinta_stopRecording", stopRecording);
onMessage("grinta_getGroups", getGroups);
onMessage("grinta_activateGroup", activateGroup);
onMessage("grinta_deleteGroup", deleteGroup);
onMessage("grinta_newGroup", newGroup);
onMessage("grinta_updateGroup", updateGroup);
onMessage("grinta_addTabsToGroup", addTabsToGroup);
onMessage("grinta_moveTabToGroup", moveTabToGroup);
onMessage("grinta_swapGroups", swapGroups);
onMessage("grinta_addToEssentials", addToEssentials);
onMessage("grinta_createEssentialsFolder", createEssentialsFolder);
onMessage("grinta_findEssentialsFolder", findEssentialsFolder);
onMessage("grinta_updateFolder", updateFolder);
onMessage("grinta_deleteFolder", deleteFolder);
onMessage("grinta_updateState", debouncedStateUpdate);
onMessage("grinta_openEssential", openEssential);
onMessage("grinta_getCurrentTab", getCurrentTab);
onMessage("grinta_swapEssentials", swapEssentials);
onMessage("grinta_removeEssential", removeEssential);

runtime.onInstalled.addListener(() => {
  if (__BROWSER__ === "chrome") {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

tabs.onUpdated.addListener(debouncedStateUpdate);
tabs.onRemoved.addListener(debouncedStateUpdate);
tabs.onCreated.addListener(debouncedStateUpdate);
tabs.onMoved.addListener(debouncedStateUpdate);
tabs.onActivated.addListener(debouncedStateUpdate);
tabs.onReplaced.addListener(debouncedStateUpdate);
if (__BROWSER__ === "chrome") {
  chrome.tabGroups.onUpdated.addListener(debouncedStateUpdate);
  chrome.tabGroups.onCreated.addListener(debouncedStateUpdate);
  chrome.tabGroups.onRemoved.addListener(debouncedStateUpdate);
  chrome.tabGroups.onMoved.addListener(debouncedStateUpdate);
}
bookmarks.onCreated.addListener(debouncedStateUpdate);
bookmarks.onRemoved.addListener(debouncedStateUpdate);
bookmarks.onChanged.addListener(debouncedStateUpdate);
bookmarks.onMoved.addListener(debouncedStateUpdate);
runtime.onConnect.addListener(debouncedStateUpdate);
