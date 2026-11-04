import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { IndexedDbService, SyncQueueItem } from './indexedDbService';
import { Transaction, Product } from '../types';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}

type SyncListener = (status: SyncStatus) => void;

export class SyncService {
  private static listeners: Set<SyncListener> = new Set();
  private static isSyncing = false;
  private static lastSyncTime: string | null = null;
  private static lastError: string | null = null;
  private static cachedPendingCount = 0;
  private static isInitialized = false;

  static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  static getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline(),
      isSyncing: this.isSyncing,
      pendingCount: this.cachedPendingCount,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  static subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    this.refreshPendingCount();

    if (!this.isInitialized) {
      this.init();
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify() {
    const status = this.getStatus();
    this.listeners.forEach((fn) => fn(status));
  }

  static init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    window.addEventListener('online', () => {
      this.notify();
      // Otomatis sinkronkan saat koneksi internet kembali
      setTimeout(() => {
        this.syncPendingQueue();
      }, 1000);
    });

    window.addEventListener('offline', () => {
      this.notify();
    });

    // Periksa antrean saat inisialisasi awal
    this.refreshPendingCount();

    // Loop pengecekan periodik setiap 30 detik
    setInterval(() => {
      if (this.isOnline() && !this.isSyncing && this.cachedPendingCount > 0) {
        this.syncPendingQueue();
      }
    }, 30000);
  }

  static async refreshPendingCount(storeId?: string): Promise<number> {
    try {
      const count = await IndexedDbService.getSyncQueueCount(storeId);
      this.cachedPendingCount = count;
      this.notify();
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Menjalankan sinkronisasi seluruh antrean transaksi dan perubahan offline ke Firestore
   */
  static async syncPendingQueue(
    activeStoreId?: string
  ): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline()) {
      return { synced: 0, failed: 0 };
    }

    if (this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    let synced = 0;
    let failed = 0;

    try {
      const queue = await IndexedDbService.getSyncQueue(activeStoreId);
      this.cachedPendingCount = queue.length;
      this.notify();

      if (queue.length === 0) {
        this.isSyncing = false;
        this.notify();
        return { synced: 0, failed: 0 };
      }

      for (const item of queue) {
        try {
          await this.processQueueItem(item);
          await IndexedDbService.removeSyncQueueItem(item.id);
          synced++;
        } catch (err: unknown) {
          failed++;
          const errMsg = (err as Error)?.message || 'Gagal sinkronisasi';
          this.lastError = errMsg;
          console.warn(`Gagal sinkron item ${item.id} (${item.type}):`, err);

          // Update retry count pada antrean
          item.retries = (item.retries || 0) + 1;
          item.lastError = errMsg;
          await IndexedDbService.addToSyncQueue(item);
        }
      }

      this.lastSyncTime = new Date().toISOString();
      await this.refreshPendingCount(activeStoreId);
    } catch (err: unknown) {
      this.lastError = (err as Error)?.message || 'Error dalam proses sinkronisasi';
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return { synced, failed };
  }

  private static async processQueueItem(item: SyncQueueItem): Promise<void> {
    const { type, storeId, payload } = item;

    if (type === 'TRANSACTION') {
      const tx = payload as Transaction;
      const txDocRef = doc(db, 'stores', storeId, 'transactions', tx.id);
      const storeDocRef = doc(db, 'stores', storeId);

      // 1. Simpan dokumen transaksi menggunakan setDoc (idempotent, cegah duplikasi)
      await setDoc(txDocRef, tx);

      // 2. Kurangi stok produk di Firestore secara atomik
      if (Array.isArray(tx.items)) {
        for (const itemLine of tx.items) {
          if (itemLine.productId) {
            try {
              const prodRef = doc(db, 'stores', storeId, 'products', itemLine.productId);
              await updateDoc(prodRef, {
                stock: increment(-itemLine.qty),
                updatedAt: new Date().toISOString(),
              });
            } catch (prodErr) {
              console.warn(`Gagal update stok online produk ${itemLine.productId}:`, prodErr);
            }
          }
        }
      }

      // 3. Update total penjualan dan jumlah transaksi toko
      try {
        await updateDoc(storeDocRef, {
          totalSales: increment(tx.total || 0),
          totalTransactions: increment(1),
          updatedAt: new Date().toISOString(),
        });
      } catch (storeErr) {
        console.warn('Gagal update total penjualan toko:', storeErr);
      }

      // 4. Tandai transaksi di IndexedDB sebagai tersinkronisasi
      await IndexedDbService.saveTransaction(tx, true);
    } else if (type === 'PRODUCT_ADD') {
      const prod = payload as Product;
      const prodDocRef = doc(db, 'stores', storeId, 'products', prod.id);
      await setDoc(prodDocRef, prod);
    } else if (type === 'PRODUCT_UPDATE') {
      const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
      const prodDocRef = doc(db, 'stores', storeId, 'products', id);
      await updateDoc(prodDocRef, updates);
    } else if (type === 'PRODUCT_DELETE') {
      const { id } = payload as { id: string };
      const prodDocRef = doc(db, 'stores', storeId, 'products', id);
      await deleteDoc(prodDocRef);
    }
  }
}
