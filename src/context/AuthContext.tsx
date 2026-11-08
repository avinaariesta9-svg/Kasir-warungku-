import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  limit,
  arrayUnion,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { StoreProfile, UserProfile, StoreRole } from '../types';
import { IndexedDbService } from '../services/indexedDbService';
import { SyncService } from '../services/syncService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  store: StoreProfile | null;
  storeLoading: boolean;
  isAdmin: boolean;
  currentRole: StoreRole;
  isOwner: boolean;
  isCashier: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, storeName?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateStore: (data: { storeName: string; address: string; whatsapp: string }) => Promise<void>;
  updateQrisSettings: (data: {
    qrisImageUrl: string;
    qrisMerchantName?: string;
    qrisNmid?: string;
  }) => Promise<void>;
  removeQrisSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [storeLoading, setStoreLoading] = useState<boolean>(true);
  const [currentRole, setCurrentRole] = useState<StoreRole>('owner');

  // Sync user profile in Firestore
  const syncUserProfile = async (currentUser: User) => {
    const userDocRef = doc(db, 'users', currentUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      const now = new Date().toISOString();
      if (!snap.exists()) {
        const newUser: UserProfile = {
          id: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Pemilik Warung',
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(userDocRef, newUser);
      } else {
        await updateDoc(userDocRef, {
          email: currentUser.email || '',
          displayName: currentUser.displayName || snap.data()?.displayName || 'Pemilik Warung',
          updatedAt: now,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  // Ensure initial store exists in Firestore
  const ensureStoreProfile = async (currentUser: User, customStoreName?: string) => {
    const storeDocRef = doc(db, 'stores', currentUser.uid);
    try {
      const snap = await getDoc(storeDocRef);
      if (!snap.exists()) {
        const now = new Date().toISOString();
        const randCode = 'WRG-' + currentUser.uid.slice(0, 5).toUpperCase();
        const initialStore: StoreProfile = {
          id: currentUser.uid,
          storeCode: randCode,
          ownerId: currentUser.uid,
          ownerName: currentUser.displayName || 'Pemilik Warung',
          ownerEmail: currentUser.email || '',
          storeName: customStoreName?.trim() || `Warung ${currentUser.displayName || 'Berkah'}`,
          address: '',
          whatsapp: '',
          totalSales: 0,
          totalTransactions: 0,
          totalProducts: 0,
          totalStock: 0,
          createdAt: now,
          updatedAt: now,
          isActive: true,
          memberEmails: [currentUser.email?.toLowerCase().trim() || ''],
          memberUids: [currentUser.uid],
        };
        await setDoc(storeDocRef, initialStore);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `stores/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    // Safety timeout: jika Firebase Auth responsnya lambat atau terhalang jaringan/domain,
    // jangan biarkan layar tertahan di splash screen tanpa batas waktu.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setStoreLoading(false);
    }, 3500);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(safetyTimer);
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        setStoreLoading(true);

        // Muat profil toko dari cache IndexedDB seketika (Offline-First)
        IndexedDbService.getStoreProfile(currentUser.uid).then((cached) => {
          if (cached) {
            setStore(cached);
            if (cached.ownerId === currentUser.uid) {
              setCurrentRole('owner');
            }
            setStoreLoading(false);
          }
        }).catch(() => {});

        try {
          if (!SyncService.isOnline()) {
            setStoreLoading(false);
            return;
          }

          await syncUserProfile(currentUser);

          const cleanEmail = (currentUser.email || '').toLowerCase().trim();
          let targetStoreId = currentUser.uid;
          let role: StoreRole = 'owner';

          // 1. Cek apakah pengguna memiliki toko sendiri
          const ownedStoreRef = doc(db, 'stores', currentUser.uid);
          const ownedStoreSnap = await getDoc(ownedStoreRef);

          if (ownedStoreSnap.exists()) {
            targetStoreId = currentUser.uid;
            role = 'owner';
          } else {
            // 2. Jika tidak punya toko sendiri, cari apakah diundang sebagai admin di toko lain
            let foundInvitedStore = false;
            if (cleanEmail) {
              try {
                const q = query(
                  collection(db, 'stores'),
                  where('memberEmails', 'array-contains', cleanEmail),
                  limit(1)
                );
                const querySnap = await getDocs(q);
                if (!querySnap.empty) {
                  const targetDoc = querySnap.docs[0];
                  targetStoreId = targetDoc.id;
                  role = 'cashier';
                  foundInvitedStore = true;

                  // Otomatis ikat UID pengguna ke memberUids di toko agar Firestore rules langsung mengenali
                  updateDoc(targetDoc.ref, {
                    memberUids: arrayUnion(currentUser.uid),
                    updatedAt: new Date().toISOString(),
                  }).catch(() => {});

                  // Perbarui dokumen anggota dengan userId & joinedAt
                  const memberId = 'MBR-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
                  setDoc(
                    doc(db, 'stores', targetStoreId, 'members', memberId),
                    {
                      userId: currentUser.uid,
                      joinedAt: new Date().toISOString(),
                    },
                    { merge: true }
                  ).catch(() => {});
                }
              } catch (err) {
                console.warn('Gagal mencari undangan toko:', err);
              }
            }

            // 3. Jika bukan anggota toko lain, buat profil toko baru sebagai Pemilik
            if (!foundInvitedStore) {
              await ensureStoreProfile(currentUser);
              targetStoreId = currentUser.uid;
              role = 'owner';
            }
          }

          setCurrentRole(role);

          // Real-time listener for store data
          const storeDocRef = doc(db, 'stores', targetStoreId);
          const unsubscribeStore = onSnapshot(
            storeDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data() as StoreProfile;
                setStore(data);
                // Simpan cache profil toko ke IndexedDB
                IndexedDbService.saveStoreProfile(data).catch(() => {});
                // Sesuaikan role jika data toko mendefinisikan owner
                if (data.ownerId === currentUser.uid) {
                  setCurrentRole('owner');
                }
              } else {
                setStore(null);
              }
              setStoreLoading(false);
            },
            (error) => {
              setStoreLoading(false);
              if (SyncService.isOnline()) {
                handleFirestoreError(error, OperationType.GET, `stores/${targetStoreId}`);
              }
            }
          );

          return () => {
            unsubscribeStore();
          };
        } catch (e) {
          console.error('Gagal sinkronisasi data awal:', e);
          setStoreLoading(false);
        }
      } else {
        setStore(null);
        setCurrentRole('owner');
        setStoreLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, storeName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await syncUserProfile(cred.user);
      await ensureStoreProfile(cred.user, storeName);
    }
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      await syncUserProfile(cred.user);
      await ensureStoreProfile(cred.user);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setStore(null);
    setCurrentRole('owner');
  };

  const updateStore = async (data: { storeName: string; address: string; whatsapp: string }) => {
    if (!user || !store) throw new Error('Pengguna belum masuk');
    if (!isOwner) throw new Error('Hanya Pemilik toko yang berhak mengubah profil toko.');
    const storeDocRef = doc(db, 'stores', store.id);
    const now = new Date().toISOString();
    try {
      await updateDoc(storeDocRef, {
        storeName: data.storeName.trim(),
        address: data.address.trim(),
        whatsapp: data.whatsapp.trim(),
        updatedAt: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `stores/${store.id}`);
    }
  };

  const updateQrisSettings = async (data: {
    qrisImageUrl: string;
    qrisMerchantName?: string;
    qrisNmid?: string;
  }) => {
    if (!store) throw new Error('Profil toko belum dimuat');
    const activeStoreId = store.id || user?.uid;
    if (!activeStoreId) throw new Error('ID toko tidak ditemukan');

    const now = new Date().toISOString();
    const payload: Partial<StoreProfile> = {
      qrisImageUrl: data.qrisImageUrl,
      qrisMerchantName: data.qrisMerchantName?.trim() || store.storeName,
      qrisNmid: data.qrisNmid?.trim() || '',
      updatedAt: now,
    };

    // 1. Simpan ke IndexedDB lokal dan update state React seketika (Offline-First)
    const updatedStore: StoreProfile = {
      ...store,
      ...payload,
    };
    setStore(updatedStore);
    try {
      await IndexedDbService.saveStoreProfile(updatedStore);
    } catch (idbErr) {
      console.warn('Gagal menyimpan profil ke IndexedDB:', idbErr);
    }

    // 2. Simpan ke Cloud Firestore jika online
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const storeDocRef = doc(db, 'stores', activeStoreId);
        await updateDoc(storeDocRef, payload);
      } catch (err) {
        console.warn('Pembaruan QRIS ke Firestore ditunda:', err);
      }
    }
  };

  const removeQrisSettings = async () => {
    if (!store) throw new Error('Profil toko belum dimuat');
    const activeStoreId = store.id || user?.uid;
    if (!activeStoreId) throw new Error('ID toko tidak ditemukan');

    const now = new Date().toISOString();
    const payload: Partial<StoreProfile> = {
      qrisImageUrl: '',
      qrisMerchantName: '',
      qrisNmid: '',
      updatedAt: now,
    };

    const updatedStore: StoreProfile = {
      ...store,
      ...payload,
    };
    setStore(updatedStore);
    try {
      await IndexedDbService.saveStoreProfile(updatedStore);
    } catch (idbErr) {
      console.warn('Gagal menghapus profil dari IndexedDB:', idbErr);
    }

    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const storeDocRef = doc(db, 'stores', activeStoreId);
        await updateDoc(storeDocRef, payload);
      } catch (err) {
        console.warn('Hapus QRIS ke Firestore ditunda:', err);
      }
    }
  };

  const isAdmin = Boolean(
    user && user.email === 'avinaariesta9@gmail.com'
  );

  const isOwner = Boolean(isAdmin || currentRole === 'owner');
  const isCashier = Boolean(!isAdmin && currentRole === 'cashier');

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        store,
        storeLoading,
        isAdmin,
        currentRole,
        isOwner,
        isCashier,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        updateStore,
        updateQrisSettings,
        removeQrisSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
