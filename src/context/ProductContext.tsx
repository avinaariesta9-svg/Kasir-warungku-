import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';
import { Product } from '../types';
import { IndexedDbService } from '../services/indexedDbService';
import { SyncService } from '../services/syncService';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id' | 'storeId' | 'createdAt'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  lowStockProducts: Product[];
  totalProductsCount: number;
  totalStockSum: number;
  bulkImportProducts: (
    items: Array<Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<{ added: number; updated: number }>;
  deductLocalStock: (productId: string, qty: number) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, store } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const activeStoreId = store?.id || user?.uid;

  // 1. Muat data produk lokal seketika dari IndexedDB saat booting (Offline-First)
  useEffect(() => {
    if (!activeStoreId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    IndexedDbService.getProducts(activeStoreId).then((cached) => {
      if (cached && cached.length > 0) {
        setProducts(cached);
        setLoading(false);
      }
    }).catch((e) => {
      console.warn('Gagal memuat cache IndexedDB awal:', e);
    });
  }, [activeStoreId]);

  // 2. Pasang Firestore onSnapshot real-time saat online dan perbarui cache IndexedDB
  useEffect(() => {
    if (!user || !activeStoreId) {
      return;
    }

    const productsRef = collection(db, 'stores', activeStoreId, 'products');
    const q = query(productsRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
        });
        setProducts(items);
        setLoading(false);

        // Simpan seluruh data produk ke IndexedDB secara konsisten
        IndexedDbService.saveProducts(items).catch((err) => {
          console.warn('Gagal sinkron produk ke IndexedDB:', err);
        });

        // Update aggregate count in store document for sync
        const totalProducts = items.length;
        const totalStock = items.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
        const storeRef = doc(db, 'stores', activeStoreId);
        updateDoc(storeRef, {
          totalProducts,
          totalStock,
        }).catch(() => {
          // Silent catch to prevent UI block if offline or updating
        });
      },
      (error) => {
        setLoading(false);
        // Jika offline, jangan blokir UI karena data sudah ada di IndexedDB
        if (SyncService.isOnline()) {
          handleFirestoreError(error, OperationType.GET, `stores/${activeStoreId}/products`);
        }
      }
    );

    return () => unsubscribe();
  }, [user, activeStoreId]);

  const addProduct = async (
    data: Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (!user || !activeStoreId) throw new Error('Pengguna belum masuk');

    const now = new Date().toISOString();
    const newId =
      'PROD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    const newProductPayload: Product = {
      id: newId,
      storeId: activeStoreId,
      name: data.name.trim(),
      barcode: data.barcode?.trim() || '',
      category: data.category || 'Lainnya',
      unit: data.unit?.trim() || 'Pcs',
      costPrice: Number(data.costPrice) || 0,
      sellingPrice: Number(data.sellingPrice) || 0,
      stock: Number(data.stock) || 0,
      minStock: Number(data.minStock) || 5,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Simpan langsung ke IndexedDB & perbarui state lokal (agar seketika muncul di kasir)
    await IndexedDbService.saveProduct(newProductPayload);
    setProducts((prev) => [newProductPayload, ...prev.filter((p) => p.id !== newId)]);

    // 2. Jika online, kirim ke Firestore. Jika offline/gagal, simpan ke antrean sinkronisasi
    if (SyncService.isOnline()) {
      try {
        const prodDocRef = doc(db, 'stores', activeStoreId, 'products', newId);
        await setDoc(prodDocRef, newProductPayload);
      } catch {
        // Gagal online, masukkan antrean
        await IndexedDbService.addToSyncQueue({
          id: 'SYNC-ADD-' + newId,
          type: 'PRODUCT_ADD',
          storeId: activeStoreId,
          payload: newProductPayload,
          createdAt: now,
        });
        SyncService.refreshPendingCount(activeStoreId);
      }
    } else {
      await IndexedDbService.addToSyncQueue({
        id: 'SYNC-ADD-' + newId,
        type: 'PRODUCT_ADD',
        storeId: activeStoreId,
        payload: newProductPayload,
        createdAt: now,
      });
      SyncService.refreshPendingCount(activeStoreId);
    }

    return newId;
  };

  const updateProduct = async (
    id: string,
    updates: Partial<Omit<Product, 'id' | 'storeId' | 'createdAt'>>
  ): Promise<void> => {
    if (!user || !activeStoreId) throw new Error('Pengguna belum masuk');

    const now = new Date().toISOString();
    const existing = products.find((p) => p.id === id);
    if (!existing) return;

    const updatedProduct: Product = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    if (updates.name !== undefined) updatedProduct.name = updates.name.trim();
    if (updates.barcode !== undefined) updatedProduct.barcode = updates.barcode.trim();
    if (updates.category !== undefined) updatedProduct.category = updates.category;
    if (updates.unit !== undefined) updatedProduct.unit = updates.unit.trim();
    if (updates.costPrice !== undefined) updatedProduct.costPrice = Number(updates.costPrice);
    if (updates.sellingPrice !== undefined) updatedProduct.sellingPrice = Number(updates.sellingPrice);
    if (updates.stock !== undefined) updatedProduct.stock = Number(updates.stock);
    if (updates.minStock !== undefined) updatedProduct.minStock = Number(updates.minStock);

    // 1. Simpan langsung ke IndexedDB & perbarui state lokal
    await IndexedDbService.saveProduct(updatedProduct);
    setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)));

    // 2. Simpan ke Firestore atau antrean
    if (SyncService.isOnline()) {
      try {
        const productDocRef = doc(db, `stores/${activeStoreId}/products/${id}`);
        await updateDoc(productDocRef, { ...updates, updatedAt: now });
      } catch {
        await IndexedDbService.addToSyncQueue({
          id: 'SYNC-UPD-' + id + '-' + Date.now(),
          type: 'PRODUCT_UPDATE',
          storeId: activeStoreId,
          payload: { id, updates: { ...updates, updatedAt: now } },
          createdAt: now,
        });
        SyncService.refreshPendingCount(activeStoreId);
      }
    } else {
      await IndexedDbService.addToSyncQueue({
        id: 'SYNC-UPD-' + id + '-' + Date.now(),
        type: 'PRODUCT_UPDATE',
        storeId: activeStoreId,
        payload: { id, updates: { ...updates, updatedAt: now } },
        createdAt: now,
      });
      SyncService.refreshPendingCount(activeStoreId);
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    if (!user || !activeStoreId) throw new Error('Pengguna belum masuk');

    const now = new Date().toISOString();

    // 1. Hapus dari IndexedDB & state lokal seketika
    await IndexedDbService.deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));

    // 2. Sinkronkan ke Firestore atau antrean
    if (SyncService.isOnline()) {
      try {
        const productDocRef = doc(db, `stores/${activeStoreId}/products/${id}`);
        await deleteDoc(productDocRef);
      } catch {
        await IndexedDbService.addToSyncQueue({
          id: 'SYNC-DEL-' + id + '-' + Date.now(),
          type: 'PRODUCT_DELETE',
          storeId: activeStoreId,
          payload: { id },
          createdAt: now,
        });
        SyncService.refreshPendingCount(activeStoreId);
      }
    } else {
      await IndexedDbService.addToSyncQueue({
        id: 'SYNC-DEL-' + id + '-' + Date.now(),
        type: 'PRODUCT_DELETE',
        storeId: activeStoreId,
        payload: { id },
        createdAt: now,
      });
      SyncService.refreshPendingCount(activeStoreId);
    }
  };

  const deductLocalStock = async (productId: string, qty: number): Promise<void> => {
    await IndexedDbService.deductProductStock(productId, qty);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            stock: Math.max(0, (Number(p.stock) || 0) - qty),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  // Filter produk dengan stok menipis (stok <= minStock)
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= (p.minStock ?? 5));
  }, [products]);

  const totalProductsCount = products.length;
  const totalStockSum = useMemo(() => {
    return products.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
  }, [products]);

  const bulkImportProducts = async (
    itemsToImport: Array<Omit<Product, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ added: number; updated: number }> => {
    if (!user) throw new Error('Pengguna belum masuk');

    let added = 0;
    let updated = 0;
    const now = new Date().toISOString();
    const productsRef = collection(db, 'stores', user.uid, 'products');

    for (const item of itemsToImport) {
      const cleanName = item.name.trim();
      const cleanBarcode = item.barcode?.trim() || '';

      // Check if product exists by barcode or exact name (case-insensitive)
      const existing = products.find((p) => {
        if (cleanBarcode && p.barcode && p.barcode.trim() === cleanBarcode) {
          return true;
        }
        return p.name.trim().toLowerCase() === cleanName.toLowerCase();
      });

      if (existing) {
        const prodRef = doc(db, `stores/${activeStoreId}/products/${existing.id}`);
        await updateDoc(prodRef, {
          name: cleanName,
          barcode: cleanBarcode || existing.barcode || '',
          category: item.category || existing.category || 'Lainnya',
          costPrice: item.costPrice !== undefined ? Number(item.costPrice) : existing.costPrice,
          sellingPrice: item.sellingPrice !== undefined ? Number(item.sellingPrice) : existing.sellingPrice,
          stock: (Number(existing.stock) || 0) + (Number(item.stock) || 0),
          minStock: item.minStock !== undefined ? Number(item.minStock) : existing.minStock,
          updatedAt: now,
        });
        updated++;
      } else {
        await addDoc(productsRef, {
          storeId: activeStoreId,
          name: cleanName,
          barcode: cleanBarcode,
          category: item.category || 'Lainnya',
          costPrice: Number(item.costPrice) || 0,
          sellingPrice: Number(item.sellingPrice) || 0,
          stock: Number(item.stock) || 0,
          minStock: Number(item.minStock) || 5,
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    }

    return { added, updated };
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        lowStockProducts,
        totalProductsCount,
        totalStockSum,
        bulkImportProducts,
        deductLocalStock,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
