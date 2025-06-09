import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(LocalizedFormat);

export { PluginWebSearch } from "./plugin-web-search";
export { PluginNlp } from "./plugin-nlp";
export { PluginExactUrl } from "./plugin-exact-url";
