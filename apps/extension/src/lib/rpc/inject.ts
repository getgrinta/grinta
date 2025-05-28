import type { BridgeMessage } from "webext-bridge";
import {
  allowWindowMessaging,
  onMessage,
  sendMessage,
} from "webext-bridge/content-script";
import { runtime } from "webextension-polyfill";

allowWindowMessaging("grinta");

async function clickElement(
  message: BridgeMessage<{ selector: string; tabId: number }>,
) {
  return sendMessage(
    "grinta_clickElement",
    { selector: message.data.selector, tabId: message.data.tabId },
    "window",
  );
}

onMessage("grinta_clickElement", clickElement);

async function fillElement(
  message: BridgeMessage<{ selector: string; value: string; tabId: number }>,
) {
  return sendMessage(
    "grinta_fillElement",
    {
      selector: message.data.selector,
      value: message.data.value,
      tabId: message.data.tabId,
    },
    "window",
  );
}

onMessage("grinta_fillElement", fillElement);

async function scrollToElement(
  message: BridgeMessage<{ selector: string; tabId: number }>,
) {
  return sendMessage(
    "grinta_scrollToElement",
    { selector: message.data.selector, tabId: message.data.tabId },
    "window",
  );
}

onMessage("grinta_scrollToElement", scrollToElement);

async function getElement(
  message: BridgeMessage<{ selector: string; tabId: number }>,
) {
  return sendMessage(
    "grinta_getElement",
    { selector: message.data.selector, tabId: message.data.tabId },
    "window",
  );
}

onMessage("grinta_getElement", getElement);

async function startRecording(message: BridgeMessage<{ tabId: number }>) {
  return sendMessage(
    "grinta_startRecording",
    { tabId: message.data.tabId },
    "window",
  );
}

onMessage("grinta_startRecording", startRecording);

async function stopRecording(message: BridgeMessage<{ tabId: number }>) {
  return sendMessage(
    "grinta_stopRecording",
    { tabId: message.data.tabId },
    "window",
  );
}

onMessage("grinta_stopRecording", stopRecording);

async function fetchSession() {
  return sendMessage("grinta_fetchSession", {}, "popup");
}

onMessage("grinta_fetchSession", fetchSession);

const inject = () => {
  if (typeof document === "undefined") return;
  const script = document.createElement("script");
  script.src = runtime.getURL("/provider.js");
  script.type = "module";
  document.documentElement.appendChild(script);
};

inject();
