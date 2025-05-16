import { Storage } from "@plasmohq/storage";

export const syncStorage = new Storage();

export const sessionStorage = new Storage({
  area: "session",
});

export const localStorage = new Storage({
  area: "local",
});
