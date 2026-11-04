import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  getDocs,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { StoreLicense, LicenseActionLog, LicenseStatus, StoreProfile, UserProfile, SubscriptionPlan } from '../types';
import { IndexedDbService } from './indexedDbService';

const DEVICE_STORAGE_KEY = 'warungku_device_id';
const DEV_PHONE_STORAGE_KEY = 'warungku_dev_whatsapp';
export const DEFAULT_DEVELOPER_PHONE = '6281234567890';

export class LicenseService {
  /**
   * Mendapatkan atau membuat ID perangkat unik (Device ID) yang tersimpan di browser HP ini
   */
  static getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!deviceId) {
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      deviceId = `DEV-${part1}-${part2}`;
      localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Mendapatkan ringkasan perangkat/browser
   */
  static getDeviceInfo(): string {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    const os = /Android/i.test(navigator.userAgent)
      ? 'Android'
      : /iPhone|iPad/i.test(navigator.userAgent)
      ? 'iOS'
      : 'Desktop/Lainnya';
    const browser = isChrome ? 'Chrome' : 'Browser';
    return `${os} ${browser} (${window.innerWidth}x${window.innerHeight})`;
  }

  /**
   * Mengambil nomor WhatsApp developer (bisa diatur oleh developer di dashboard)
   */
  static getDeveloperPhone(): string {
    const stored = localStorage.getItem(DEV_PHONE_STORAGE_KEY);
    return stored?.trim() || DEFAULT_DEVELOPER_PHONE;
  }

  /**
   * Menyimpan nomor WhatsApp developer
   */
  static setDeveloperPhone(phone: string): void {
    const clean = phone.replace(/[^0-9]/g, '');
    const finalPhone = clean.startsWith('0') ? '62' + clean.slice(1) : clean;
    localStorage.setItem(DEV_PHONE_STORAGE_KEY, finalPhone);
  }

  /**
   * Membuat kode permintaan lisensi baru (Request Code)
   */
  static generateRequestCode(storeCode?: string): string {
    const prefix = storeCode ? storeCode.replace(/[^A-Z0-9]/g, '') : 'WRG';
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `REQ-${prefix}-${rand}`;
  }

  /**
   * Memastikan dokumen permintaan lisensi ada untuk toko yang sedang login.
   * Jika belum ada, otomatis membuat request baru berstatus 'pending'.
   */
  static async ensureLicenseRequest(
    store: StoreProfile,
    userEmail: string,
    ownerName?: string
  ): Promise<StoreLicense> {
    const storeId = store.id;
    const licenseRef = doc(db, 'licenses', storeId);

    try {
      const snap = await getDoc(licenseRef);
      if (snap.exists()) {
        return snap.data() as StoreLicense;
      }

      const deviceId = this.getOrCreateDeviceId();
      const deviceInfo = this.getDeviceInfo();
      const requestCode = this.generateRequestCode(store.storeCode);
      const now = new Date().toISOString();

      const newLicense: StoreLicense = {
        id: storeId,
        storeId,
        storeName: store.storeName || 'Warung Saya',
        ownerName: ownerName || store.ownerName || 'Pemilik Warung',
        ownerEmail: userEmail || store.ownerEmail || '',
        whatsapp: store.whatsapp || '',
        requestCode,
        deviceId,
        deviceInfo,
        status: 'pending',
        requestedAt: now,
        updatedAt: now,
      };

      await setDoc(licenseRef, newLicense);
      return newLicense;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `licenses/${storeId}`);
      throw error;
    }
  }

  /**
   * Listener real-time status lisensi toko
   */
  static listenToStoreLicense(
    storeId: string,
    onUpdate: (license: StoreLicense | null) => void,
    onError?: (err: unknown) => void
  ) {
    const licenseRef = doc(db, 'licenses', storeId);
    return onSnapshot(
      licenseRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const lic = docSnap.data() as StoreLicense;
          IndexedDbService.saveLicense(lic).catch(() => {});
          onUpdate(lic);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        if (onError) onError(error);
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          handleFirestoreError(error, OperationType.GET, `licenses/${storeId}`);
        }
      }
    );
  }

  /**
   * Pembeli memperbarui ID perangkat saat request pending atau setelah reset
   */
  static async rebindCurrentDevice(storeId: string): Promise<void> {
    const deviceId = this.getOrCreateDeviceId();
    const deviceInfo = this.getDeviceInfo();
    const licenseRef = doc(db, 'licenses', storeId);
    const now = new Date().toISOString();

    try {
      await updateDoc(licenseRef, {
        deviceId,
        deviceInfo,
        updatedAt: now,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `licenses/${storeId}`);
      throw error;
    }
  }

  /**
   * Mengambil semua lisensi (Khusus Developer Admin)
   */
  static async getAllLicenses(): Promise<StoreLicense[]> {
    try {
      const q = query(collection(db, 'licenses'), orderBy('requestedAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: StoreLicense[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<StoreLicense, 'id'>) });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'licenses');
      return [];
    }
  }

  /**
   * Mengambil semua profil toko / pelanggan (Khusus Developer Admin)
   */
  static async getAllStores(): Promise<StoreProfile[]> {
    try {
      const q = query(collection(db, 'stores'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: StoreProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<StoreProfile, 'id'>) });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'stores');
      return [];
    }
  }

  /**
   * Mengambil semua profil pengguna terdaftar (Khusus Developer Admin)
   */
  static async getAllUsers(): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<UserProfile, 'id'>) });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  }

  /**
   * Mencatat log tindakan developer ke koleksi /license_logs
   */
  private static async logAction(
    storeId: string,
    storeName: string,
    action: 'ACTIVATE' | 'REJECT' | 'DEACTIVATE' | 'RESET_DEVICE' | 'UPDATE_PLAN',
    performedBy: string,
    details?: string
  ) {
    try {
      const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const logRecord: LicenseActionLog = {
        id: logId,
        storeId,
        storeName,
        action,
        performedBy,
        timestamp: new Date().toISOString(),
        details: details || '',
      };
      await setDoc(doc(db, 'license_logs', logId), logRecord);
    } catch (e) {
      console.warn('Gagal mencatat log lisensi:', e);
    }
  }

  /**
   * AKTIFKAN LISENSI (Khusus Developer Admin)
   * Mengaktifkan toko dengan Paket Selamanya (Sekali Bayar / Seumur Hidup, Tanpa Masa Kedaluwarsa)
   */
  static async activateLicense(
    storeId: string,
    storeName: string,
    developerEmail: string,
    currentBoundDeviceId?: string
  ): Promise<void> {
    const licenseRef = doc(db, 'licenses', storeId);
    const storeRef = doc(db, 'stores', storeId);
    const now = new Date().toISOString();

    try {
      const updatePayload: Partial<StoreLicense> = {
        status: 'active',
        plan: 'lifetime',
        planExpiresAt: '',
        activatedAt: now,
        activatedBy: developerEmail,
        updatedAt: now,
      };

      // Jika sebelumnya perangkat kosong, pertahankan perangkat pengaju
      if (currentBoundDeviceId) {
        updatePayload.deviceId = currentBoundDeviceId;
      }

      await updateDoc(licenseRef, updatePayload);

      try {
        await updateDoc(storeRef, {
          isActive: true,
          plan: 'lifetime',
          planExpiresAt: '',
          updatedAt: now,
        });
      } catch (e) {
        console.warn('Gagal sync store isActive:', e);
      }

      await this.logAction(
        storeId,
        storeName,
        'ACTIVATE',
        developerEmail,
        'Lisensi diaktifkan: Paket Selamanya (Sekali Bayar / Seumur Hidup, Tanpa Batas Waktu)'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `licenses/${storeId}`);
      throw error;
    }
  }

  /**
   * PERBARUI PAKET LISENSI (Khusus Developer Admin)
   */
  static async updateLicensePlan(
    storeId: string,
    storeName: string,
    developerEmail: string,
    plan: SubscriptionPlan,
    planExpiresAt?: string
  ): Promise<void> {
    const licenseRef = doc(db, 'licenses', storeId);
    const storeRef = doc(db, 'stores', storeId);
    const now = new Date().toISOString();

    try {
      await updateDoc(licenseRef, {
        plan,
        planExpiresAt: planExpiresAt || '',
        updatedAt: now,
      });

      try {
        await updateDoc(storeRef, {
          plan,
          planExpiresAt: planExpiresAt || '',
          updatedAt: now,
        });
      } catch (e) {
        console.warn('Gagal sync store plan:', e);
      }

      await this.logAction(
        storeId,
        storeName,
        'UPDATE_PLAN',
        developerEmail,
        `Paket diubah ke ${plan.toUpperCase()}${planExpiresAt ? ' (s/d ' + new Date(planExpiresAt).toLocaleDateString('id-ID') + ')' : ' (Tanpa Batas)'}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `licenses/${storeId}`);
      throw error;
    }
  }

  /**
   * TOLAK PERMINTAAN LISENSI (Khusus Developer Admin)
   */
  static async rejectLicense(
    storeId: string,
    storeName: string,
    developerEmail: string,
    reason: string
  ): Promise<void> {
    const licenseRef = doc(db, 'licenses', storeId);
    const now = new Date().toISOString();

    try {
      await updateDoc(licenseRef, {
        status: 'rejected',
        rejectedAt: now,
        rejectReason: reason.trim() || 'Pembayaran belum terverifikasi',
        updatedAt: now,
      });
      await this.logAction(
        storeId,
        storeName,
        'REJECT',
        developerEmail,
        `Alasan: ${reason}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `licenses/${storeId}`);
      throw error;
    }
  }

  /**
   * NONAKTIFKAN LISENSI (Khusus Developer Admin)
   * Catatan: Data toko, produk, dan transaksi TIDAK terhapus!
   */
  static async deactivateLicense(
    storeId: string,
    storeName: string,
    developerEmail: string,
    reason?: string
  ): Promise<void> {
    const licenseRef = doc(db, 'licenses', storeId);
    const storeRef = doc(db, 'stores', storeId);
    const now = new Date().toISOString();

    try {
      await updateDoc(licenseRef, {
        status: 'inactive',
        notes: reason?.trim() || 'Lisensi dinonaktifkan oleh developer',
        updatedAt: now,
      });

      try {
        await updateDoc(storeRef, {
          isActive: false,
          updatedAt: now,
        });
      } catch (e) {
        console.warn('Gagal sync store inactive:', e);
      }

      await this.logAction(
        storeId,
        storeName,
        'DEACTIVATE',
        developerEmail,
        reason || 'Lisensi dinonaktifkan'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `licenses/${storeId}`);
      throw error;
    }
  }

  /**
   * RESET PERANGKAT (Khusus Developer Admin)
   * Mengizinkan pembeli menghubungkan perangkat HP baru tanpa menghapus lisensi/data toko
   */
  static async resetDevice(
    storeId: string,
    storeName: string,
    developerEmail: string
  ): Promise<void> {
    const licenseRef = doc(db, 'licenses', storeId);
    const now = new Date().toISOString();

    try {
      await updateDoc(licenseRef, {
        deviceId: '', // Dikosongkan agar HP baru pembeli dapat mengklaim
        updatedAt: now,
      });
      await this.logAction(
        storeId,
        storeName,
        'RESET_DEVICE',
        developerEmail,
        'ID perangkat di-reset agar pemilik dapat login di HP baru'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `licenses/${storeId}`);
      throw error;
    }
  }

  /**
   * Mengambil riwayat tindakan developer (Audit Trail)
   */
  static async getLicenseActionLogs(): Promise<LicenseActionLog[]> {
    try {
      const q = query(collection(db, 'license_logs'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const list: LicenseActionLog[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<LicenseActionLog, 'id'>) });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'license_logs');
      return [];
    }
  }

  /**
   * Membuat URL WhatsApp pesan otomatis dari pembeli ke developer
   */
  static buildBuyerWhatsAppUrl(license: StoreLicense, developerPhone: string): string {
    const cleanPhone = developerPhone.replace(/[^0-9]/g, '');
    const message = `Halo Developer Kasir WarungKu,

Saya ingin konfirmasi pembayaran dan mengaktifkan lisensi aplikasi Kasir WarungKu untuk toko saya:

🏪 *Nama Toko:* ${license.storeName}
👤 *Nama Pemilik:* ${license.ownerName}
📧 *Email:* ${license.ownerEmail}
📱 *WhatsApp Toko:* ${license.whatsapp || '-'}

📋 *KODE PERMINTAAN LISENSI:*
${license.requestCode}

📲 *ID PERANGKAT SAYA:*
${license.deviceId}
(${license.deviceInfo || 'Android Chrome'})

Saya sudah melakukan transfer pembayaran. Mohon dicek dan diaktifkan. Terima kasih! 🙏`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Membuat URL WhatsApp balasan developer ke pemilik toko bahwa lisensi telah aktif
   */
  static buildDeveloperReplyUrl(license: StoreLicense, appUrl: string): string {
    let cleanPhone = license.whatsapp.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

    const message = `Halo Bpk/Ibu *${license.ownerName}* (${license.storeName}),

🎉 *LISENSI KASIR WARUNGKU ANDA TELAH AKTIF!*

Pembayaran Anda telah diverifikasi oleh developer. Aplikasi kasir sekarang sudah terbuka dan siap digunakan sepenuhnya.

📋 *Rincian Lisensi:*
• ID Toko: ${license.storeId}
• Kode Permintaan: ${license.requestCode}
• ID Perangkat Terikat: ${license.deviceId}
• Status: *AKTIF (Sekali bayar, tanpa langganan)*

🌐 *Buka Aplikasi:*
${appUrl}

Silakan buka link di Google Chrome HP Android Anda dan lanjutkan transaksi warung. Semoga usahanya semakin lancar dan berkah! ✨`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
}
