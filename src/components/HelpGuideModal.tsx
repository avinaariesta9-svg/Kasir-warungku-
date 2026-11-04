import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Smartphone,
  Package,
  ShoppingCart,
  Printer,
  TrendingUp,
  Database,
  CheckCircle2,
  ShieldCheck,
  Tag,
  ChevronRight,
  ExternalLink,
  Key,
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTopic, setActiveTopic] = useState<string>('pwa');

  if (!isOpen) return null;

  const topics = [
    {
      id: 'pwa',
      title: '1. Pasang di HP Android',
      icon: Smartphone,
      content: (
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Aplikasi Kasir WarungKu berbasis Progressive Web App (PWA) yang dapat dipasang langsung di layar utama HP tanpa ribet unduh dari Play Store:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1">
            <li>
              Buka aplikasi di browser <strong>Google Chrome</strong> pada HP Android Anda.
            </li>
            <li>
              Ketuk tombol hijau <strong>"Pasang"</strong> pada banner yang muncul di bagian atas aplikasi.
            </li>
            <li>
              Atau ketuk menu titik tiga <strong>(⋮)</strong> di pojok kanan atas Chrome, lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> (*Add to Home screen*).
            </li>
            <li>
              Ikon <strong>Kasir WarungKu</strong> akan muncul di layar HP Anda dan siap dibuka layaknya aplikasi asli.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'produk',
      title: '2. Kelola Barang & Stok',
      icon: Package,
      content: (
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Mencatat barang dagangan lengkap dengan modal dan harga jual:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>
              Masuk ke tab <strong>"Produk"</strong>, lalu ketuk tombol <strong>"+ Tambah"</strong>.
            </li>
            <li>
              Isi Nama Barang, Barcode (opsional, bisa discan kamera), Harga Modal (Beli), Harga Jual, dan Stok Fisik.
            </li>
            <li>
              <strong>Peringatan Stok Menipis:</strong> Tentukan batas minimum (misal 5 pcs). Jika stok di bawah batas, kartu akan berubah kuning/merah.
            </li>
            <li>
              <strong>Impor dari Excel:</strong> Ketuk ikon berkas di samping tombol Tambah untuk mengunduh template Excel dan mengunggah ratusan produk sekaligus tanpa duplikat!
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'kasir',
      title: '3. Transaksi & Pembayaran',
      icon: ShoppingCart,
      content: (
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Melayani pelanggan di meja kasir warung:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-1">
            <li>
              Pilih tab <strong>"Kasir POS"</strong>.
            </li>
            <li>
              Ketuk barang dagangan untuk memasukkan ke keranjang belanja, atau ketuk ikon <strong>Kamera</strong> untuk scan barcode fisik barang.
            </li>
            <li>
              Buka bilah keranjang di bawah untuk mengubah jumlah barang ($+$ atau $-$).
            </li>
            <li>
              Pilih pembayaran <strong>Tunai</strong> (tersedia tombol nominal uang pas & pecahan cepat) atau <strong>QRIS Digital</strong>.
            </li>
            <li>
              Selesaikan transaksi: Stok produk otomatis berkurang secara konsisten dan nota tersimpan aman di cloud Firebase.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: 'printer',
      title: '4. Printer & Tanpa Printer',
      icon: Printer,
      content: (
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Fleksibilitas cetak struk untuk segala jenis warung:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>
              <strong>Bisa Tanpa Printer:</strong> Aplikasi Kasir WarungKu tetap berfungsi 100% tanpa printer. Anda cukup ketuk tombol <em>"Selesai & Transaksi Baru"</em> setelah pembayaran.
            </li>
            <li>
              <strong>Printer Bluetooth BLE:</strong> Buka Pengaturan Printer (ikon printer di header) untuk menyambungkan printer thermal Bluetooth 58 mm atau 80 mm.
            </li>
            <li>
              <strong>Cetak Browser / PDF:</strong> Jika tidak memiliki printer Bluetooth, gunakan tombol <em>Cetak / PDF</em> bawaan HP untuk cetak via printer kabel/WiFi atau simpan file struk.
            </li>
            <li>
              <strong>Printer Bluetooth Classic:</strong> Tersedia tombol <em>Cetak RawBT</em> untuk printer tipe lama.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'laporan',
      title: '5. Laporan Laba & Backup',
      icon: TrendingUp,
      content: (
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Memantau kesehatan keuangan dan mengamankan data warung:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>
              Buka tab <strong>"Laporan"</strong> untuk melihat Omzet, Modal HPP, dan Keuntungan Bersih (Laba) harian maupun bulanan.
            </li>
            <li>
              <strong>Laba Riil:</strong> Perhitungan modal menggunakan harga beli barang saat transaksi dilakukan, sehingga laba historis selalu akurat.
            </li>
            <li>
              <strong>Ekspor Excel:</strong> Unduh laporan keuangan berkala ke format CSV/Excel.
            </li>
            <li>
              <strong>Backup Toko:</strong> Ketuk ikon database untuk mengunduh salinan cadangan JSON ke HP agar data tidak hilang saat Anda berganti perangkat HP baru.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'aktivasi',
      title: '6. Aktivasi Toko di Lokasi (Penjual)',
      icon: Key,
      content: (
        <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Penjual dapat mengaktifkan aplikasi kasir langsung di toko konsumen tanpa instalasi APK:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>
              Buka menu <strong>"Aktivasi"</strong> (ikon kunci emas) di bagian atas aplikasi.
            </li>
            <li>
              Isi data nama warung, nama pemilik, nomor WhatsApp, dan alamat fisik toko.
            </li>
            <li>
              Ketuk <strong>"Buat Toko dan Aktivasi"</strong>. ID toko unik dan akun pemilik otomatis terbuat di cloud Firebase.
            </li>
            <li>
              Ketuk <strong>"Kirim ke WhatsApp Pemilik"</strong> untuk membagikan link aplikasi, email, kata sandi, dan panduan pasang di Chrome Android.
            </li>
            <li>
              Konsumen membuka link di Chrome Android dan memilih "Tambahkan ke Layar Utama".
            </li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-white" />
            <div>
              <h2 className="font-bold text-base leading-tight">Panduan Kasir WarungKu</h2>
              <p className="text-emerald-100 text-[11px]">Bantuan Penggunaan & Informasi Produk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {/* Product Overview Banner */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                Aplikasi Kasir Warung
              </span>
              <span className="text-xs font-semibold text-emerald-700">Mobile PWA</span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Kasir WarungKu — Solusi Kasir HP Android
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dirancang khusus untuk memudahkan pencatatan transaksi, stok produk, dan laporan keuangan warung sembako, kelontong, dan toko kecil di seluruh Indonesia.
            </p>
            <div className="pt-1 flex items-center gap-3 text-[11px] text-emerald-800 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Data Aman di Cloud
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Dukungan PWA & Bluetooth
              </span>
            </div>
          </div>

          {/* Quick Guide Accordion / Topic List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Panduan Cepat Penggunaan
            </h4>

            {topics.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTopic === item.id;

              return (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs"
                >
                  <button
                    onClick={() => setActiveTopic(isActive ? '' : item.id)}
                    className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-xs text-slate-900">{item.title}</span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isActive ? 'rotate-90 text-emerald-600' : ''
                      }`}
                    />
                  </button>

                  {isActive && (
                    <div className="p-3.5 pt-1 bg-slate-50/70 border-t border-slate-100 animate-in fade-in">
                      {item.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Security & Isolation Confirmation */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Keamanan & Privasi Data Toko</span>
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Setiap toko memiliki ruang data terenkripsi sendiri di Firebase Firestore. Pemilik warung lain tidak dapat mengakses produk, nota, atau omzet toko Anda.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
          >
            Mengerti & Kembali
          </button>
        </div>
      </div>
    </div>
  );
};
