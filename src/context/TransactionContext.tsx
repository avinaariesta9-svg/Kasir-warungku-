import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  writeBatch,
  increment,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import {
  CartItem,
  Product,
  Transaction,
  PaymentMethod,
  PrinterSettings,
} from '../types';
import { PrinterService } from '../services/printerService';
import { IndexedDbService } from '../services/indexedDbService';
import { SyncService } from '../services/syncService';

interface TransactionContextType {
  cart: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotal: number;
  cartItemsCount: number;
  transactions: Transaction[];
  transactionsLoading: boolean;
  checkout: (paymentData: {
    paymentMethod: PaymentMethod;
    cashAmount: number;
    changeAmount: number;
    discount?: number;
    total?: number;
  }) => Promise<Transaction>;
  printerSettings: PrinterSettings;
  updatePrinterSettings: (settings: Partial<PrinterSettings>) => void;
  printReceipt: (transaction: Transaction) => Promise<{ success: boolean; error?: string }>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, store } = useAuth();
  const { products, deductLocalStock } = useProducts();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(true);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(
    PrinterService.getSettings()
  );

  const activeStoreId = store?.id || user?.uid;

  // 1. Muat riwayat transaksi lokal dari IndexedDB secara instan (Offline-First)
  useEffect(() => {
    if (!activeStoreId) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }

    IndexedDbService.getTransactions(activeStoreId).then((cached) => {
      if (cached && cached.length > 0) {
        setTransactions(cached);
        setTransactionsLoading(false);
      }
    }).catch((e) => {
      console.warn('Gagal membaca cache transaksi IndexedDB:', e);
    });
  }, [activeStoreId]);

  // 2. Real-time listener riwayat transaksi dari Firestore saat online & simpan ke IndexedDB
  useEffect(() => {
    if (!user || !activeStoreId) {
      return;
    }

    const txColRef = collection(db, 'stores', activeStoreId, 'transactions');
    const q = query(txColRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Transaction, 'id'>) });
        });
        setTransactions(list);
        setTransactionsLoading(false);

        // Simpan data transaksi terbaru ke IndexedDB
        IndexedDbService.saveTransactions(list, true).catch((err) => {
          console.warn('Gagal simpan transaksi ke IndexedDB:', err);
        });
      },
      (err) => {
        setTransactionsLoading(false);
        if (SyncService.isOnline()) {
          handleFirestoreError(err, OperationType.GET, `stores/${activeStoreId}/transactions`);
        }
      }
    );

    return () => unsubscribe();
  }, [user, activeStoreId]);

  // Cart operations
  const addToCart = (product: Product, qtyToAdd: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = next[existingIndex].qty + qtyToAdd;
        next[existingIndex] = {
          ...next[existingIndex],
          qty: newQty,
          subtotal: newQty * next[existingIndex].product.sellingPrice,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            product,
            qty: qtyToAdd,
            subtotal: qtyToAdd * product.sellingPrice,
          },
        ];
      }
    });
  };

  const updateQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            qty: newQty,
            subtotal: newQty * item.product.sellingPrice,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartTotal = cartSubtotal; // In simple warung, total = subtotal

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  // Atomic Checkout and Stock Deduction
  const checkout = async (paymentData: {
    paymentMethod: PaymentMethod;
    cashAmount: number;
    changeAmount: number;
    discount?: number;
    total?: number;
  }): Promise<Transaction> => {
    if (!user || !activeStoreId) throw new Error('Pengguna belum masuk');
    if (cart.length === 0) throw new Error('Keranjang belanja kosong');

    const now = new Date();
    const dateCode = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `NOTA-${dateCode}-${randNum}`;

    const txDocRef = doc(collection(db, 'stores', activeStoreId, 'transactions'));
    const storeDocRef = doc(db, 'stores', activeStoreId);

    const finalDiscount = Math.max(0, paymentData.discount || 0);
    const finalTotal = paymentData.total !== undefined ? paymentData.total : Math.max(0, cartSubtotal - finalDiscount);

    const transactionPayload: Transaction = {
      id: txDocRef.id,
      storeId: activeStoreId,
      invoiceNumber,
      items: cart.map((c) => ({
        productId: c.product.id,
        name: c.product.name,
        price: c.product.sellingPrice,
        costPrice: c.product.costPrice,
        qty: c.qty,
        subtotal: c.subtotal,
      })),
      subtotal: cartSubtotal,
      discount: finalDiscount > 0 ? finalDiscount : undefined,
      total: finalTotal,
      paymentMethod: paymentData.paymentMethod,
      cashAmount: paymentData.paymentMethod === 'TUNAI' ? paymentData.cashAmount : finalTotal,
      changeAmount: paymentData.paymentMethod === 'TUNAI' ? paymentData.changeAmount : 0,
      createdAt: now.toISOString(),
    };

    // 1. Kurangi stok produk secara lokal di IndexedDB dan state tampilan seketika
    for (const c of cart) {
      await deductLocalStock(c.product.id, c.qty);
    }

    // 2. Simpan transaksi langsung ke IndexedDB lokal
    const isOnlineNow = SyncService.isOnline();
    await IndexedDbService.saveTransaction(transactionPayload, isOnlineNow);

    // 3. Tambahkan seketika ke riwayat transaksi lokal di memori
    setTransactions((prev) => [transactionPayload, ...prev.filter((t) => t.id !== transactionPayload.id)]);

    // 4. Sinkronisasi ke Firestore atau masukkan ke antrean sinkronisasi
    if (isOnlineNow) {
      try {
        const batch = writeBatch(db);
        // Simpan transaksi di Firestore menggunakan setDoc (idempotent, mencegah duplikasi)
        batch.set(txDocRef, transactionPayload);

        cart.forEach((item) => {
          const prodRef = doc(db, 'stores', activeStoreId, 'products', item.product.id);
          batch.update(prodRef, {
            stock: increment(-item.qty),
            updatedAt: now.toISOString(),
          });
        });

        batch.update(storeDocRef, {
          totalSales: increment(finalTotal),
          totalTransactions: increment(1),
          updatedAt: now.toISOString(),
        });

        await batch.commit();
        await IndexedDbService.saveTransaction(transactionPayload, true);
      } catch (cloudErr) {
        console.warn('Gagal simpan online, dialihkan ke antrean sinkronisasi offline:', cloudErr);
        await IndexedDbService.addToSyncQueue({
          id: 'SYNC-TX-' + transactionPayload.id,
          type: 'TRANSACTION',
          storeId: activeStoreId,
          payload: transactionPayload,
          createdAt: now.toISOString(),
        });
        SyncService.refreshPendingCount(activeStoreId);
      }
    } else {
      // Kondisi offline: Simpan ke antrean sinkronisasi
      await IndexedDbService.addToSyncQueue({
        id: 'SYNC-TX-' + transactionPayload.id,
        type: 'TRANSACTION',
        storeId: activeStoreId,
        payload: transactionPayload,
        createdAt: now.toISOString(),
      });
      SyncService.refreshPendingCount(activeStoreId);
    }

    // 5. Kosongkan keranjang belanja
    clearCart();

    // 6. Cetak otomatis jika diaktifkan dan printer terkoneksi
    if (printerSettings.autoPrint && PrinterService.isConnected()) {
      PrinterService.printBluetooth(transactionPayload, store).catch((err) => {
        console.warn('Auto print failed:', err);
      });
    }

    return transactionPayload;
  };

  const updatePrinterSettings = (newSettings: Partial<PrinterSettings>) => {
    const updated = PrinterService.saveSettings(newSettings);
    setPrinterSettings(updated);
  };

  const printReceipt = async (transaction: Transaction) => {
    return await PrinterService.printBluetooth(transaction, store);
  };

  return (
    <TransactionContext.Provider
      value={{
        cart,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartTotal,
        cartItemsCount,
        transactions,
        transactionsLoading,
        checkout,
        printerSettings,
        updatePrinterSettings,
        printReceipt,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};
