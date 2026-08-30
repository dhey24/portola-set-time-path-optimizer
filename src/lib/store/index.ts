import { Store } from "./types";

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    store = require("./supabaseStore").supabaseStore as Store;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    store = require("./fileStore").fileStore as Store;
  }
  return store;
}

export * from "./types";
