declare global {
  interface Window {
    grinta: {
      fetchSession: () => Promise<void>;
    };
  }
}

import { setNamespace, onMessage, sendMessage } from "webext-bridge/window";
import type { BridgeMessage } from "webext-bridge";
import { userEvent } from "@testing-library/user-event";
import { parse } from "@ryuz/utevo";

const user = userEvent.setup();
let mediaRecorder: MediaRecorder | undefined;
let recordedChunks: Blob[] = [];
let audioStream: MediaStream | undefined;
let recordingPromise: Promise<string> | undefined;
let recordingResolve: ((value: string) => void) | undefined;

setNamespace("grinta");

onMessage("grinta_getElements", (message) => {
  if (message.sender.context !== "content-script") return;
  const result = parse(document.body.innerHTML);
  return result.toJSON();
});

onMessage(
  "grinta_clickElement",
  async (message: BridgeMessage<{ selector: string }>) => {
    if (message.sender.context !== "content-script") return;
    const element = document.querySelector(message.data.selector);
    if (!element) return { error: "Element not found" };
    (element as HTMLElement).scrollIntoView();
    await user.click(element as HTMLElement);
    return true;
  },
);

onMessage(
  "grinta_fillElement",
  (message: BridgeMessage<{ selector: string; value: string }>) => {
    if (message.sender.context !== "content-script") return;
    const element = document.querySelector(
      message.data.selector,
    ) as HTMLElement;
    element.scrollIntoView();
    user.type(element, message.data.value);
    return true;
  },
);

onMessage(
  "grinta_scrollToElement",
  (message: BridgeMessage<{ selector: string }>) => {
    if (message.sender.context !== "content-script") return;
    const element = document.querySelector(
      message.data.selector,
    ) as HTMLElement;
    element.scrollIntoView();
    return true;
  },
);

onMessage(
  "grinta_getElement",
  (message: BridgeMessage<{ selector: string }>) => {
    if (message.sender.context !== "content-script") return;
    const element = document.querySelector(
      message.data.selector,
    ) as HTMLElement;
    const result = parse(element.innerHTML);
    return result.toHtml();
  },
);

onMessage("grinta_startRecording", async (message) => {
  if (message.sender.context !== "content-script") return;
  if (mediaRecorder && mediaRecorder.state === "recording") {
    // Already recording
    return { status: "already-recording" };
  }
  try {
    recordedChunks = [];
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(audioStream);
    recordingPromise = new Promise((resolve) => {
      recordingResolve = resolve;
    });
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "audio/wav" });
      const base64 = await blobToBase64(blob);
      if (recordingResolve) recordingResolve(base64 as string);
      recordedChunks = [];
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
        audioStream = undefined;
      }
      mediaRecorder = undefined;
      recordingResolve = undefined;
      recordingPromise = undefined;
    };
    mediaRecorder.start();
    return { status: "recording" };
  } catch (error) {
    console.error(error);
    return { status: "error", error: error?.message || error };
  }
});

function blobToBase64(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

onMessage("grinta_stopRecording", async (message) => {
  if (message.sender.context !== "content-script") return;
  if (!mediaRecorder || mediaRecorder.state !== "recording") {
    return { status: "not-recording" };
  }
  mediaRecorder.stop();
  // Wait for onstop to resolve the promise
  if (recordingPromise) {
    const base64 = await recordingPromise;
    return { status: "stopped", audio: base64 };
  }
  return { status: "error", error: "No recordingPromise" };
});

function injectRpc() {
  window.grinta = {
    fetchSession: async () => {
      await sendMessage("grinta_fetchSession", {}, "content-script");
    },
  };
}

injectRpc();

console.log("[Grinta] RPC initialized");
