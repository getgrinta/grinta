import { getMasterKey } from "$lib/grinta-invoke";
import { type Store, load } from "@tauri-apps/plugin-store";
import { AesGcm, Bytes, Hex } from "ox";
import superjson from "superjson";
import type { ZodSchema } from "zod/v3";

/**
 * Configuration parameters for SecureStore
 */
type SecureStoreConfig = {
  /** Zod schema for data validation */
  schema: ZodSchema;
  /** Filename for persistent storage */
  fileName: string;
  /** Storage key name (defaults to "vault") */
  storageKey: string;
  /** Custom error handler */
  onError?: (
    error: Error,
    operation: "restore" | "persist" | "encryption",
  ) => void;
};

/**
 * Abstract class for secure data storage with encryption
 * Uses AES-GCM encryption and Zod validation
 */
export abstract class SecureStore<T extends object> {
  private readonly schema: ZodSchema;
  private readonly fileName: string;
  private readonly storageKey: string;
  private readonly onError?: (
    error: Error,
    operation: "restore" | "persist" | "encryption",
  ) => void;
  private storeInstance: Store | null = null;
  #data = $state<T>({} as T);
  #initialized = $state(false);

  constructor({ schema, fileName, storageKey, onError }: SecureStoreConfig) {
    this.schema = schema;
    this.fileName = fileName;
    this.storageKey = storageKey;
    this.onError = onError;
  }

  /**
   * Update store data and persist changes
   * @param data - New data to validate and store
   * @returns Promise resolving when data is persisted
   */
  async setData(data: unknown): Promise<void> {
    try {
      this.#data = this.schema.parse(data) as T;
      await this.persist();
    } catch (error) {
      this.handleError(error as Error, "persist");
      throw error;
    }
  }

  /**
   * Update specific fields in the store
   * @param partialData - Partial data to merge with existing data
   * @returns Promise resolving when data is persisted
   */
  async updateData(partialData: Partial<T>): Promise<void> {
    return this.setData({ ...this.data, ...partialData });
  }

  /**
   * Get current store data
   */
  get data(): T {
    return this.#data;
  }

  /**
   * Check if the store has been initialized
   */
  get isInitialized(): boolean {
    return this.#initialized;
  }

  /**
   * Get encryption key from environment
   * @returns Promise resolving to encryption key
   * @throws Error if encryption key is not set
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    try {
      let salt: string;

      if (process.env.NODE_ENV === "development") {
        salt = "test";
      } else {
        salt = await getMasterKey();
      }

      return AesGcm.getKey({
        password: "",
        salt: Bytes.fromString(salt),
      });
    } catch (error) {
      this.handleError(error as Error, "encryption");
      throw error;
    }
  }

  /**
   * Get store instance (cached)
   * @returns Promise resolving to store instance
   */
  private async getStore(): Promise<Store> {
    if (!this.storeInstance) {
      this.storeInstance = await load(this.fileName);
      // Ensure store is initialized
      await this.storeInstance.save();
    }
    return this.storeInstance;
  }

  /**
   * Handle errors with custom error handler or default to console.error
   * @param error - Error to handle
   * @param operation - Operation that caused the error
   */
  private handleError(
    error: Error,
    operation: "restore" | "persist" | "encryption",
  ): void {
    if (this.onError) {
      this.onError(error, operation);
    } else {
      console.error(`SecureStore error during ${operation}:`, error);
    }
  }

  /**
   * Restore data from persistent storage
   * @returns Promise resolving when data is restored
   */
  async restore(): Promise<void> {
    try {
      const encryptionKey = await this.getEncryptionKey();
      const store = await this.getStore();

      const vaultString = await store.get<Hex.Hex>(this.storageKey);

      if (!vaultString) {
        // Initialize with empty data if vault doesn't exist
        await this.setData(this.schema.parse({}));
        this.#initialized = true;
        return;
      }

      // Validate that vaultString is in the expected format (Hex)
      if (typeof vaultString !== "string" || !vaultString.startsWith("0x")) {
        throw new Error("Invalid vault data format");
      }

      const decryptedHex = await AesGcm.decrypt(vaultString, encryptionKey);
      const decrypted = Hex.toString(decryptedHex);
      const parsed = superjson.parse(decrypted);
      const validated = this.schema.parse(parsed);

      // Set data without persisting to avoid circular persistence
      this.#data = validated as T;
      this.#initialized = true;
    } catch (error) {
      this.handleError(error as Error, "restore");
      // Initialize with empty data on error
      await this.clear();
      this.#data = this.schema.parse({}) as T;
      this.#initialized = true;
    }
  }

  /**
   * Persist data to storage
   * @returns Promise resolving when data is persisted
   */
  async persist(): Promise<void> {
    try {
      const encryptionKey = await this.getEncryptionKey();
      const store = await this.getStore();

      const vaultString = superjson.stringify(this.data);
      const vaultHex = Hex.fromString(vaultString);
      const encryptedHex = await AesGcm.encrypt(vaultHex, encryptionKey);

      await store.set(this.storageKey, encryptedHex);
      await store.save();
    } catch (error) {
      this.handleError(error as Error, "persist");
      throw error;
    }
  }

  /**
   * Clear all data from the store
   * @returns Promise resolving when data is cleared
   */
  async clear(): Promise<void> {
    try {
      const store = await this.getStore();
      await store.delete(this.storageKey);
      await store.save();
      this.#data = this.schema.parse({}) as T;
    } catch (error) {
      this.handleError(error as Error, "persist");
      throw error;
    }
  }
}
