import { Product, Transaction, StoreProfile, StoreLicense } from '../types';

export type SyncItemType =
  | 'TRANSACTION'
  | 'PRODUCT_ADD'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DELETE';

export interface SyncQueueItem {
  id: string; // Unique queue identifier
  type: SyncItemType;
  storeId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  createdAt: string;
  retries?: number;
  lastError?: string;
}

const DB_NAME = 'kasir_warungku_offline_db';
const DB_VERSION = 1;

export class IndexedDbService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  static async getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB tidak didukung pada browser ini.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Store: Products
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('storeId', 'storeId', { unique: false });
          productStore.createIndex('barcode', 'barcode', { unique: false });
          productStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. Store: Transactions
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('storeId', 'storeId', { unique: false });
          txStore.createIndex('createdAt', 'createdAt', { unique: false });
          txStore.createIndex('synced', 'synced', { unique: false });
        }

        // 3. Store: SyncQueue (Antrean perubahan & transaksi saat offline)
        if (!db.objectStoreNames.contains('syncQueue')) {
          const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          queueStore.createIndex('storeId', 'storeId', { unique: false });
          queueStore.createIndex('type', 'type', { unique: false });
          queueStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 4. Store: StoreProfiles (Profil toko offline)
        if (!db.objectStoreNames.contains('storeProfiles')) {
          db.createObjectStore('storeProfiles', { keyPath: 'id' });
        }

        // 5. Store: Licenses (Lisensi toko offline)
        if (!db.objectStoreNames.contains('licenses')) {
          db.createObjectStore('licenses', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onclose = () => {
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Gagal membuka IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  // ---------------------------------------------------------------------------
  // PRODUCTS (PRODUK & STOK)
  // ---------------------------------------------------------------------------

  static async getProducts(storeId: string): Promise<Product[]> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const index = store.index('storeId');
        const request = index.getAll(storeId);

        request.onsuccess = () => {
          const list: Product[] = request.result || [];
          // Urutkan berdasarkan updatedAt menurun
          list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Gagal membaca produk dari IndexedDB:', e);
      return [];
    }
  }

  static async saveProduct(product: Product): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      const request = store.put(product);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async saveProducts(products: Product[]): Promise<void> {
    if (!products || products.length === 0) return;
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      for (const prod of products) {
        store.put(prod);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async deleteProduct(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mengurangi stok produk langsung di IndexedDB saat transaksi terjadi secara offline/online
   */
  static async deductProductStock(productId: string, qty: number): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      const getReq = store.get(productId);

      getReq.onsuccess = () => {
        const prod = getReq.result as Product | undefined;
        if (prod) {
          prod.stock = Math.max(0, (Number(prod.stock) || 0) - qty);
          prod.updatedAt = new Date().toISOString();
          store.put(prod);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------------------------------------------------------------------------
  // TRANSACTIONS (TRANSAKSI & RIWAYAT)
  // ---------------------------------------------------------------------------

  static async getTransactions(storeId: string): Promise<Transaction[]> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('transactions', 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('storeId');
        const request = index.getAll(storeId);

        request.onsuccess = () => {
          const list: Transaction[] = request.result || [];
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('Gagal membaca transaksi dari IndexedDB:', e);
      return [];
    }
  }

  static async saveTransaction(
    transaction: Transaction,
    synced: boolean = false
  ): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      const payload = { ...transaction, synced };
      const request = store.put(payload);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async saveTransactions(
    transactions: Transaction[],
    synced: boolean = true
  ): Promise<void> {
    if (!transactions || transactions.length === 0) return;
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('transactions', 'readwrite');
      const store = tx.objectStore('transactions');
      for (const t of transactions) {
        store.put({ ...t, synced });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------------------------------------------------------------------------
  // SYNC QUEUE (ANTREAN SINKRONISASI OFFLINE KE CLOUD)
  // ---------------------------------------------------------------------------

  static async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getSyncQueue(storeId?: string): Promise<SyncQueueItem[]> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('syncQueue', 'readonly');
        const store = tx.objectStore('syncQueue');
        const request = store.getAll();

        request.onsuccess = () => {
          let list: SyncQueueItem[] = request.result || [];
          if (storeId) {
            list = list.filter((i) => i.storeId === storeId);
          }
          list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  static async removeSyncQueueItem(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getSyncQueueCount(storeId?: string): Promise<number> {
    const items = await this.getSyncQueue(storeId);
    return items.length;
  }

  // ---------------------------------------------------------------------------
  // STORE PROFILE & LICENSE CACHING
  // ---------------------------------------------------------------------------

  static async saveStoreProfile(profile: StoreProfile): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('storeProfiles', 'readwrite');
      const store = tx.objectStore('storeProfiles');
      const request = store.put(profile);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getStoreProfile(storeId: string): Promise<StoreProfile | null> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('storeProfiles', 'readonly');
        const store = tx.objectStore('storeProfiles');
        const request = store.get(storeId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  static async saveLicense(license: StoreLicense): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('licenses', 'readwrite');
      const store = tx.objectStore('licenses');
      const request = store.put(license);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  static async getLicense(storeId: string): Promise<StoreLicense | null> {
    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('licenses', 'readonly');
        const store = tx.objectStore('licenses');
        const request = store.get(storeId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }
}
