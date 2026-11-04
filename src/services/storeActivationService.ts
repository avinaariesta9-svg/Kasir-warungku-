import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { StoreProfile, ActivatedStoreRecord, UserProfile } from '../types';

export interface ActivationParams {
  storeName: string;
  ownerName: string;
  whatsapp: string;
  address: string;
  customEmail?: string;
  customPassword?: string;
  adminEmail: string;
}

export class StoreActivationService {
  /**
   * Menghasilkan ID unik toko, contoh: WRG-7B2K9
   */
  static generateStoreCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'WRG-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Membersihkan format nomor WhatsApp (cth: 08123456789 -> 628123456789)
   */
  static formatWhatsApp(phone: string): string {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return clean;
  }

  /**
   * Membuat email default berdasarkan nama warung / nomor WA jika belum disediakan
   */
  static generateDefaultEmail(storeName: string, whatsapp: string): string {
    const slug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    const phoneSuffix = whatsapp.replace(/[^0-9]/g, '').slice(-4) || Math.floor(1000 + Math.random() * 9000);
    return `${slug || 'warung'}${phoneSuffix}@warungku.id`;
  }

  /**
   * Membuat kata sandi default yang mudah diingat
   */
  static generateDefaultPassword(): string {
    const randNum = Math.floor(100000 + Math.random() * 900000);
    return `wrg${randNum}`;
  }

  /**
   * Mengaktifkan toko baru di lokasi tanpa instalasi APK.
   * Menggunakan Firebase Auth sekunder agar sesi admin tidak terputus.
   */
  static async activateNewStore(params: ActivationParams): Promise<ActivatedStoreRecord> {
    const cleanStoreName = params.storeName.trim();
    const cleanOwnerName = params.ownerName.trim();
    const cleanAddress = params.address.trim();
    const cleanWhatsapp = params.whatsapp.trim();
    const storeCode = this.generateStoreCode();

    const finalEmail = (params.customEmail?.trim() || this.generateDefaultEmail(cleanStoreName, cleanWhatsapp)).toLowerCase();
    const finalPassword = params.customPassword?.trim() || this.generateDefaultPassword();

    // Inisialisasi Firebase App sekunder untuk pendaftaran akun pemilik
    const tempAppName = `activation-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);
    const tempDb = getFirestore(tempApp, firebaseConfig.firestoreDatabaseId);

    try {
      // 1. Buat akun Firebase Auth untuk pemilik toko
      const cred = await createUserWithEmailAndPassword(tempAuth, finalEmail, finalPassword);
      const newUid = cred.user.uid;

      // 2. Set display name di Firebase Auth
      await updateProfile(cred.user, {
        displayName: cleanOwnerName,
      });

      const now = new Date().toISOString();

      // 3. Simpan Profil Pengguna Pemilik di Firestore
      const userProfile: UserProfile = {
        id: newUid,
        email: finalEmail,
        displayName: cleanOwnerName,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(tempDb, 'users', newUid), userProfile);

      // 4. Inisialisasi Database Toko Terisolasi di /stores/{newUid} (nilai awal 0)
      const storeProfile: StoreProfile = {
        id: newUid,
        storeCode,
        ownerId: newUid,
        ownerName: cleanOwnerName,
        ownerEmail: finalEmail,
        storeName: cleanStoreName,
        address: cleanAddress,
        whatsapp: cleanWhatsapp,
        totalSales: 0,
        totalTransactions: 0,
        totalProducts: 0,
        totalStock: 0,
        createdAt: now,
        updatedAt: now,
        activatedAt: now,
        activatedBy: params.adminEmail || 'admin',
        isActive: true,
      };
      await setDoc(doc(tempDb, 'stores', newUid), storeProfile);

      // 5. Catat rekam aktivasi di koleksi /activations/{newUid} (dikelola oleh admin)
      const activationRecord: ActivatedStoreRecord = {
        id: newUid,
        storeCode,
        storeName: cleanStoreName,
        ownerName: cleanOwnerName,
        ownerEmail: finalEmail,
        whatsapp: cleanWhatsapp,
        address: cleanAddress,
        activatedAt: now,
        activatedBy: params.adminEmail || 'admin',
        initialPassword: finalPassword,
      };

      try {
        await setDoc(doc(db, 'activations', newUid), activationRecord);
      } catch (err) {
        // Jangan gagalkan aktivasi jika pencatatan riwayat aktivasi terkendala
        console.warn('Gagal mencatat ke /activations:', err);
      }

      return activationRecord;
    } catch (err) {
      console.error('Gagal aktivasi toko baru:', err);
      throw err;
    } finally {
      // Selalu bersihkan temporary Firebase App
      try {
        await deleteApp(tempApp);
      } catch (e) {
        console.warn('Gagal membersihkan tempApp:', e);
      }
    }
  }

  /**
   * Mengambil riwayat toko yang telah diaktivasi
   */
  static async getActivatedStores(): Promise<ActivatedStoreRecord[]> {
    try {
      const q = query(collection(db, 'activations'), orderBy('activatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: ActivatedStoreRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ActivatedStoreRecord, 'id'>) });
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'activations');
      return [];
    }
  }

  /**
   * Membuat template pesan WhatsApp untuk dikirimkan ke pemilik toko baru
   */
  static generateWhatsAppMessage(record: ActivatedStoreRecord, appUrl: string): string {
    const text = `🎉 *SELAMAT! KASIR WARUNGKU SUDAH AKTIF*

Halo Bpk/Ibu *${record.ownerName}*,
Aplikasi kasir untuk *${record.storeName}* telah berhasil diaktivasi dan siap langsung digunakan.

📋 *RINCIAN AKUN TOKO ANDA:*
• *ID Toko:* ${record.storeCode}
• *Nama Toko:* ${record.storeName}
• *Email Login:* ${record.ownerEmail}
• *Kata Sandi:* ${record.initialPassword || '(sesuai saat aktivasi)'}

🌐 *LINK APLIKASI KASIR:*
${appUrl}

📲 *CARA PASANG DI HP ANDROID (TANPA APK):*
1. Buka link di atas menggunakan aplikasi *Google Chrome* di HP Android Anda.
2. Ketuk tombol *Titik Tiga (⋮)* di pojok kanan atas Chrome.
3. Pilih menu *"Tambahkan ke Layar Utama"* (atau *Install Aplikasi*).
4. Selesai! Ikon *Kasir WarungKu* akan langsung muncul di layar utama HP Anda seperti aplikasi bawaan.

Data produk, transaksi, dan stok warung tersimpan aman & terpisah di cloud.
Terima kasih, semoga usaha *${record.storeName}* semakin laris manis dan berkah! 🙏✨`;

    return text;
  }
}
