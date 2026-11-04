# Panduan Deployment Firebase Hosting Multi-Site (Kasir WarungKu)

Aplikasi Kasir WarungKu telah dikonfigurasi menggunakan **satu proyek Firebase (`annular-spark-ppthm`)** dan **satu source code terpadu** dengan dua alamat hosting terpisah:

- **Konsumen / Pemilik Warung:** `https://warungku-kasir.web.app`
- **Developer / Administrator:** `https://warungku-admin.web.app`

---

## 1. Konfigurasi Proyek yang Telah Siap

1. **`firebase.json`**:
   - Menetapkan 2 target hosting: `kasir` dan `admin`.
   - Mengarahkan seluruh route (`**`) ke `/index.html` (Single Page Application).
   - Pengaturan cache asset optimal untuk PWA dan offline storage.

2. **`.firebaserc`**:
   - Menghubungkan target `kasir` ke site `warungku-kasir`.
   - Menghubungkan target `admin` ke site `warungku-admin`.
   - Proyek default: `annular-spark-ppthm`.

3. **`src/App.tsx` (Autentikasi & Otorisasi Terpisah)**:
   - Domain `warungku-kasir.web.app` otomatis membuka antarmuka Kasir POS & Dashboard Toko.
   - Domain `warungku-admin.web.app` otomatis mengarahkan ke Dashboard Developer.
   - **Perlindungan Akses**: Jika akun konsumen/kasir membuka domain developer (`warungku-admin.web.app`), sistem langsung memblokir dengan layar *"Akses Developer Dibatasi"* dan menyediakan tombol kembali ke `warungku-kasir.web.app`.
   - Hanya akun developer (`avinaariesta9@gmail.com`) yang diizinkan mengelola aktivasi lisensi, toko, dan reset perangkat.

---

## 2. Langkah Pembuatan Site di Firebase Console

Jika site `warungku-kasir` dan `warungku-admin` belum dibuat di Firebase Console:

1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Pilih proyek **`annular-spark-ppthm`**.
3. Di menu sebelah kiri, buka **Build** > **Hosting**.
4. Gulir ke bagian bawah halaman Dashboard Hosting, klik **Add another site** (Tambahkan situs lain).
5. Buat site pertama:
   - Site ID: `warungku-kasir`
   - Alamat otomatis: `warungku-kasir.web.app` dan `warungku-kasir.firebaseapp.com`
6. Klik **Add another site** lagi untuk site kedua:
   - Site ID: `warungku-admin`
   - Alamat otomatis: `warungku-admin.web.app` dan `warungku-admin.firebaseapp.com`

---

## 3. Perintah Deployment via Terminal / Komputer Anda

Pastikan Firebase CLI telah terpasang di komputer Anda:
```bash
npm install -g firebase-tools
```

### Langkah Deploy:

1. **Login ke Akun Google Firebase Anda:**
   ```bash
   firebase login
   ```

2. **Build Aplikasi:**
   ```bash
   npm run build
   ```

3. **Deploy Kedua Situs Sekaligus:**
   ```bash
   npm run deploy
   # atau:
   firebase deploy --only hosting
   ```

4. **Atau Deploy Satu Per Satu:**
   - Deploy situs Kasir Konsumen saja:
     ```bash
     npm run deploy:kasir
     ```
   - Deploy situs Developer Admin saja:
     ```bash
     npm run deploy:admin
     ```

5. **Deploy Security Rules Firestore:**
   ```bash
   npm run deploy:rules
   ```

---

## 4. Verifikasi Setelah Deploy

1. Buka `https://warungku-kasir.web.app`:
   - Halaman kasir dan login konsumen terbuka.
   - Pemilik warung dan admin kasir dapat langsung bertransaksi.
2. Buka `https://warungku-admin.web.app`:
   - Login dengan akun `avinaariesta9@gmail.com`.
   - Dashboard Developer langsung terbuka untuk aktivasi toko, persetujuan lisensi, dan reset perangkat.
   - Coba login dengan akun konsumen lain; sistem akan menampilkan peringatan keamanan dan melarang akses developer.
