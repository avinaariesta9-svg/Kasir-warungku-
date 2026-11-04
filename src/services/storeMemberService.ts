import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { StoreMember, StoreRole } from '../types';

export class StoreMemberService {
  /**
   * Listener real-time daftar admin / anggota toko
   */
  static listenStoreMembers(
    storeId: string,
    onUpdate: (members: StoreMember[]) => void,
    onError?: (err: unknown) => void
  ) {
    const membersRef = collection(db, 'stores', storeId, 'members');
    const q = query(membersRef, orderBy('invitedAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: StoreMember[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<StoreMember, 'id'>) });
        });
        onUpdate(list);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/members`);
      }
    );
  }

  /**
   * Mengambil semua admin toko
   */
  static async getStoreMembers(storeId: string): Promise<StoreMember[]> {
    try {
      const membersRef = collection(db, 'stores', storeId, 'members');
      const q = query(membersRef, orderBy('invitedAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: StoreMember[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<StoreMember, 'id'>) });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `stores/${storeId}/members`);
      return [];
    }
  }

  /**
   * Mengundang admin baru ke toko
   */
  static async inviteMember(
    storeId: string,
    email: string,
    name: string,
    role: StoreRole = 'cashier',
    currentOwnerEmail?: string
  ): Promise<StoreMember> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Alamat email admin tidak valid.');
    }
    if (!cleanName) {
      throw new Error('Nama admin wajib diisi.');
    }
    if (currentOwnerEmail && cleanEmail === currentOwnerEmail.toLowerCase()) {
      throw new Error('Email ini adalah email Pemilik toko utama.');
    }

    // Periksa apakah email sudah pernah diundang
    const existing = await this.getStoreMembers(storeId);
    if (existing.some((m) => m.email.toLowerCase() === cleanEmail)) {
      throw new Error(`Email "${cleanEmail}" sudah terdaftar sebagai admin di toko ini.`);
    }

    const memberId = 'MBR-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const memberDocRef = doc(db, 'stores', storeId, 'members', memberId);
    const storeDocRef = doc(db, 'stores', storeId);
    const now = new Date().toISOString();

    const newMember: StoreMember = {
      id: memberId,
      storeId,
      email: cleanEmail,
      name: cleanName,
      role,
      status: 'active',
      invitedBy: currentOwnerEmail || 'Pemilik Toko',
      invitedAt: now,
    };

    try {
      // 1. Simpan dokumen di subkoleksi members
      await setDoc(memberDocRef, newMember);

      // 2. Tambahkan email ke array memberEmails di dokumen toko
      await updateDoc(storeDocRef, {
        memberEmails: arrayUnion(cleanEmail),
        updatedAt: now,
      });

      return newMember;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `stores/${storeId}/members/${memberId}`);
      throw error;
    }
  }

  /**
   * Mengubah status aktif / nonaktif admin
   */
  static async updateMemberStatus(
    storeId: string,
    memberId: string,
    status: 'active' | 'inactive',
    memberEmail?: string,
    memberUid?: string
  ): Promise<void> {
    const memberDocRef = doc(db, 'stores', storeId, 'members', memberId);
    const storeDocRef = doc(db, 'stores', storeId);
    const now = new Date().toISOString();

    try {
      let resolvedEmail = memberEmail;
      let resolvedUid = memberUid;

      if (!resolvedEmail) {
        const snap = await getDoc(memberDocRef);
        if (snap.exists()) {
          const data = snap.data() as StoreMember;
          resolvedEmail = data.email;
          resolvedUid = data.userId;
        }
      }

      await updateDoc(memberDocRef, {
        status,
        updatedAt: now,
      });

      if (resolvedEmail) {
        if (status === 'inactive') {
          // Hapus sementara dari akses toko agar aturan Firestore langsung memblokir
          const updates: Record<string, unknown> = {
            memberEmails: arrayRemove(resolvedEmail.toLowerCase()),
            updatedAt: now,
          };
          if (resolvedUid) {
            updates.memberUids = arrayRemove(resolvedUid);
          }
          await updateDoc(storeDocRef, updates);
        } else {
          // Aktifkan kembali
          const updates: Record<string, unknown> = {
            memberEmails: arrayUnion(resolvedEmail.toLowerCase()),
            updatedAt: now,
          };
          if (resolvedUid) {
            updates.memberUids = arrayUnion(resolvedUid);
          }
          await updateDoc(storeDocRef, updates);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${storeId}/members/${memberId}`);
      throw error;
    }
  }

  /**
   * Mengubah peran admin (Pemilik / Admin Kasir)
   */
  static async updateMemberRole(
    storeId: string,
    memberId: string,
    role: StoreRole
  ): Promise<void> {
    const memberDocRef = doc(db, 'stores', storeId, 'members', memberId);
    const now = new Date().toISOString();

    try {
      await updateDoc(memberDocRef, {
        role,
        updatedAt: now,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stores/${storeId}/members/${memberId}`);
      throw error;
    }
  }

  /**
   * Menghapus admin dari toko secara permanen
   */
  static async removeMember(
    storeId: string,
    memberId: string,
    memberEmail?: string,
    memberUid?: string
  ): Promise<void> {
    const memberDocRef = doc(db, 'stores', storeId, 'members', memberId);
    const storeDocRef = doc(db, 'stores', storeId);
    const now = new Date().toISOString();

    try {
      let resolvedEmail = memberEmail;
      let resolvedUid = memberUid;

      if (!resolvedEmail) {
        const snap = await getDoc(memberDocRef);
        if (snap.exists()) {
          const data = snap.data() as StoreMember;
          resolvedEmail = data.email;
          resolvedUid = data.userId;
        }
      }

      // 1. Hapus dokumen anggota
      await deleteDoc(memberDocRef);

      // 2. Hapus dari memberEmails dan memberUids di toko
      if (resolvedEmail) {
        const storeUpdates: Record<string, unknown> = {
          memberEmails: arrayRemove(resolvedEmail.toLowerCase()),
          updatedAt: now,
        };
        if (resolvedUid) {
          storeUpdates.memberUids = arrayRemove(resolvedUid);
        }
        await updateDoc(storeDocRef, storeUpdates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stores/${storeId}/members/${memberId}`);
      throw error;
    }
  }
}

// Named function exports for direct imports
export const listenStoreMembers = StoreMemberService.listenStoreMembers.bind(StoreMemberService);
export const getStoreMembers = StoreMemberService.getStoreMembers.bind(StoreMemberService);
export const inviteMember = StoreMemberService.inviteMember.bind(StoreMemberService);
export const updateMemberStatus = StoreMemberService.updateMemberStatus.bind(StoreMemberService);
export const updateMemberRole = StoreMemberService.updateMemberRole.bind(StoreMemberService);
export const removeMember = StoreMemberService.removeMember.bind(StoreMemberService);
