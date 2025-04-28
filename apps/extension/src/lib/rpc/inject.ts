import type { BridgeMessage } from "webext-bridge";
import {
  allowWindowMessaging,
  onMessage,
  sendMessage,
} from "webext-bridge/content-script";
import { runtime } from "webextension-polyfill";

allowWindowMessaging("grinta");

async function getContent(message: BridgeMessage<{ tabId: number }>) {
  const response = await sendMessage(
    "grinta_getContent",
    { tabId: message.data.tabId },
    "window",
  );
  return response;
}

onMessage("grinta_getContent", getContent);

const inject = () => {
  if (typeof document === "undefined") return;
  const script = document.createElement("script");
  script.src = runtime.getURL("/provider.js");
  script.type = "module";
  document.documentElement.appendChild(script);
};

inject();
