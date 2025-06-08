/**
 * A TypeScript service for interacting with the browser's localStorage.
 * It provides type-safe methods for getting and setting data,
 * automatically handling JSON serialization and parsing.
 * 
 * NOTE: This service is intended for the Electron Renderer process, as it relies on
 * the `window.localStorage` API which is not available in the Main process.
 */
export class LocalStorageService {

  constructor() {
    if (!window.localStorage) {
      throw new Error('LocalStorage is not available in this environment.');
    }
  }

  /**
   * Stores a value in localStorage under a given key.
   * The value is automatically serialized into a JSON string.
   * @param key The key to store the value under.
   * @param value The value to store. Can be any JSON-serializable type.
   */
  public setItem(key: string, value: unknown): void {
    try {
      const serializedValue = JSON.stringify(value);
      window.localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error(`Error setting item with key "${key}" in LocalStorage:`, error);
    }
  }

  /**
   * Retrieves a value from localStorage by its key.
   * The value is automatically parsed from a JSON string.
   * @param key The key of the item to retrieve.
   * @returns The parsed value, or null if the key doesn't exist or if parsing fails.
   */
  public getItem<T>(key: string): T | null {
    try {
      const serializedValue = window.localStorage.getItem(key);
      if (serializedValue === null) {
        return null; // Key does not exist
      }
      return JSON.parse(serializedValue) as T;
    } catch (error) {
      console.error(`Error getting item with key "${key}" from LocalStorage:`, error);
      // Return null on parsing error to prevent app crashes from corrupted data
      return null;
    }
  }

  /**
   * Removes an item from localStorage by its key.
   * @param key The key of the item to remove.
   */
  public removeItem(key: string): void {
    window.localStorage.removeItem(key);
  }

  /**
   * Clears all items from localStorage for the current origin.
   */
  public clear(): void {
    window.localStorage.clear();
  }
}

// Optional: Export a singleton instance for easy access throughout your app
export const localStorageService = new LocalStorageService();