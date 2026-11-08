import React, { useState, useRef } from 'react';
import {
  QrCode,
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Printer,
  Smartphone,
  Store,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { QrisService } from '../services/qrisService';

interface QrisSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrisSettingsModal: React.FC<QrisSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { store, updateQrisSettings, removeQrisSettings } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState<string>('');
  const [nmid, setNmid] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const currentQrisUrl = selectedImage || store?.qrisImageUrl || '';
  const currentMerchantName = merchantName || store?.qrisMerchantName || store?.storeName || 'Kasir WarungKu';
  const currentNmid = nmid || store?.qrisNmid || '';

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMsg(null);
    setIsCompressing(true);

    try {
      const compressedDataUrl = await QrisService.compressQrisImage(file, 600, 0.85);
      setSelectedImage(compressedDataUrl);
      if (!merchantName) {
        setMerchantName(store?.qrisMerchantName || store?.storeName || '');
      }
      setStatusMsg({
        type: 'info',
        text: 'Gambar QRIS berhasil dimuat dari galeri. Tekan "Simpan QRIS Toko" untuk menerapkan.',
      });
    } catch (err: unknown) {
      setStatusMsg({
        type: 'error',
        text: (err as Error).message || 'Gagal memproses gambar QRIS.',
      });
    } finally {
      setIsCompressing(false);
      // Reset input agar dapat memilih file yang sama jika diinginkan
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveQris = async () => {
    if (!selectedImage && !store?.qrisImageUrl) {
      setStatusMsg({
        type: 'error',
        text: 'Harap pilih gambar QRIS dari galeri terlebih dahulu.',
      });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    try {
      await updateQrisSettings({
        qrisImageUrl: selectedImage || store?.qrisImageUrl || '',
        qrisMerchantName: currentMerchantName,
        qrisNmid: currentNmid,
      });

      setStatusMsg({
        type: 'success',
        text: 'Pengaturan QRIS toko berhasil disimpan!',
      });
      setSelectedImage(null);
    } catch (err: unknown) {
      setStatusMsg({
        type: 'error',
        text: (err as Error).message || 'Gagal menyimpan QRIS toko.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveQris = async () => {
    if (!confirm('Yakin ingin menghapus gambar QRIS toko ini?')) return;

    setIsSaving(true);
    setStatusMsg(null);

    try {
      await removeQrisSettings();
      setSelectedImage(null);
      setMerchantName('');
      setNmid('');
      setStatusMsg({
        type: 'success',
        text: 'Gambar QRIS toko berhasil dihapus.',
      });
    } catch (err: unknown) {
      setStatusMsg({
        type: 'error',
        text: (err as Error).message || 'Gagal menghapus QRIS toko.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintQrisStand = () => {
    QrisService.printQrisCard();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-300 my-auto flex flex-col max-h-[92vh]">
        {/* Header - Desain Hitam Putih Minimalis */}
        <div className="bg-black text-white px-5 py-3.5 flex items-center justify-between shrink-0 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight text-white">
                Pengaturan QRIS Toko
              </h3>
              <p className="text-[10px] text-neutral-400">
                Upload barcode QRIS dari galeri HP warung
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-black flex-1 text-xs">
          {/* Status Message Alert */}
          {statusMsg && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-neutral-50 text-black border-black font-semibold'
                  : statusMsg.type === 'info'
                  ? 'bg-neutral-100 text-neutral-900 border-neutral-400'
                  : 'bg-neutral-100 text-black border-black'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-black shrink-0 mt-0.5" />
              ) : statusMsg.type === 'info' ? (
                <Info className="w-4 h-4 text-black shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-black shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{statusMsg.text}</span>
            </div>
          )}

          {/* Area Preview QRIS Toko */}
          {currentQrisUrl ? (
            <div className="bg-neutral-50 p-4 rounded-3xl border-2 border-black space-y-3 text-center">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  <span>{currentMerchantName}</span>
                </span>
                {currentNmid && (
                  <span className="text-[10px] font-mono text-neutral-600 bg-white px-2 py-0.5 rounded-md border border-neutral-300">
                    NMID: {currentNmid}
                  </span>
                )}
              </div>

              {/* Gambar QRIS dalam wadah kontras tinggi */}
              <div className="bg-white p-3 rounded-2xl border border-neutral-300 inline-block shadow-sm max-w-[240px] mx-auto">
                <img
                  src={currentQrisUrl}
                  alt="QRIS Toko"
                  className="w-full h-auto max-h-[220px] object-contain rounded-lg mx-auto"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-bold text-black">
                  QRIS Siap Ditampilkan Saat Kasir Melayani Pembayaran
                </p>
                <p className="text-[10px] text-neutral-500">
                  Tersimpan khusus untuk toko: {store?.storeName} ({store?.id?.slice(0, 8)})
                </p>
              </div>

              {/* Tombol Cetak Stand QRIS Meja */}
              <button
                type="button"
                onClick={handlePrintQrisStand}
                className="w-full py-2 bg-white hover:bg-neutral-100 text-black border border-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Cetak kartu / slip QRIS meja kasir"
              >
                <Printer className="w-3.5 h-3.5 text-black" />
                <span>Cetak Lembar Stand QRIS Meja</span>
              </button>
            </div>
          ) : (
            <div className="p-6 bg-neutral-50 rounded-3xl border-2 border-dashed border-neutral-300 text-center space-y-3">
              <div className="w-16 h-16 bg-white rounded-2xl border border-neutral-300 flex items-center justify-center mx-auto shadow-xs">
                <QrCode className="w-8 h-8 text-neutral-700" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-black">Belum Ada Gambar QRIS</p>
                <p className="text-[11px] text-neutral-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  Unggah gambar QRIS dari galeri HP warung Anda (BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay, dsb).
                </p>
              </div>
            </div>
          )}

          {/* Form Pengaturan Gambar & Data QRIS */}
          <div className="space-y-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
            {/* Input Tersembunyi Galeri HP */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleSelectFile}
              className="hidden"
            />

            <div>
              <label className="block text-[11px] font-extrabold text-black mb-1.5 uppercase tracking-wide">
                Pilih Gambar QRIS dari Galeri
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing || isSaving}
                className="w-full py-2.5 px-3 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isCompressing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Upload className="w-4 h-4 text-black" />
                )}
                <span>
                  {isCompressing
                    ? 'Memproses Gambar...'
                    : currentQrisUrl
                    ? 'Pilih Gambar QRIS Baru dari Galeri'
                    : 'Buka Galeri & Pilih Gambar QRIS'}
                </span>
              </button>
              <p className="text-[10px] text-neutral-500 mt-1">
                Format: PNG, JPG, JPEG, WEBP. Gambar otomatis dikompres agar cepat dibuka saat transaksi.
              </p>
            </div>

            {/* Input Nama Merchant QRIS */}
            <div>
              <label className="block text-[11px] font-bold text-black mb-1">
                Nama Pemilik / Merchant QRIS:
              </label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder={store?.storeName || 'Nama Toko / Pemilik Rekening'}
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-black placeholder-neutral-400 focus:outline-hidden focus:border-black"
              />
            </div>

            {/* Input NMID QRIS (Opsional) */}
            <div>
              <label className="block text-[11px] font-bold text-black mb-1">
                NMID Nasional (Opsional):
              </label>
              <input
                type="text"
                value={nmid}
                onChange={(e) => setNmid(e.target.value)}
                placeholder="Contoh: ID1020023456789"
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-mono font-semibold text-black placeholder-neutral-400 focus:outline-hidden focus:border-black"
              />
            </div>
          </div>

          {/* Tombol Aksi Simpan / Hapus */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleSaveQris}
              disabled={isSaving || isCompressing || (!selectedImage && !store?.qrisImageUrl)}
              className="w-full py-3 bg-black hover:bg-neutral-900 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-white" />
              )}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan QRIS Toko'}</span>
            </button>

            {store?.qrisImageUrl && (
              <button
                type="button"
                onClick={handleRemoveQris}
                disabled={isSaving}
                className="w-full py-2 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-neutral-600" />
                <span>Hapus QRIS Toko Ini</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-neutral-100 px-5 py-2.5 border-t border-neutral-200 text-center text-[10px] text-neutral-600 shrink-0">
          QRIS terikat aman pada Store ID: <strong className="font-mono text-black">{store?.id?.slice(0, 10)}</strong>
        </div>
      </div>

      {/* Hidden Container Khusus Cetak Stand QRIS Meja (Bisa dicetak lewat window.print) */}
      <div id="qris-print-card" className="hidden print:block print:p-6 print:text-black">
        <div className="max-w-xs mx-auto border-2 border-black p-4 text-center font-mono">
          <h2 className="text-base font-black uppercase">{currentMerchantName}</h2>
          <p className="text-xs mt-0.5">{store?.address || 'Kasir WarungKu Mobile'}</p>
          {currentNmid && <p className="text-[10px] font-bold mt-0.5">NMID: {currentNmid}</p>}
          <hr className="my-2 border-black" />
          {currentQrisUrl && (
            <img src={currentQrisUrl} alt="QRIS Stand" className="w-48 h-48 mx-auto object-contain my-2" />
          )}
          <hr className="my-2 border-black" />
          <p className="text-xs font-bold uppercase">SCAN QRIS UNTUK MEMBAYAR</p>
          <p className="text-[10px] mt-1">Mendukung Semua m-Banking & E-Wallet</p>
        </div>
      </div>
    </div>
  );
};
