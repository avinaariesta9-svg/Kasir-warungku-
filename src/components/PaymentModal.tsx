import React, { useState, useMemo } from 'react';
import {
  Banknote,
  QrCode,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Tag,
  Printer,
  Upload,
  ShieldAlert,
  Store,
} from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { PaymentMethod, Transaction } from '../types';
import { QrisSettingsModal } from './QrisSettingsModal';
import { QrisService } from '../services/qrisService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { cartSubtotal, cartItemsCount, checkout } = useTransactions();
  const { store } = useAuth();

  const [discountStr, setDiscountStr] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('TUNAI');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');
  const [isQrisVerified, setIsQrisVerified] = useState<boolean>(false);
  const [isQrisSettingsOpen, setIsQrisSettingsOpen] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const discount = Math.min(cartSubtotal, Math.max(0, Number(discountStr) || 0));
  const totalBayar = Math.max(0, cartSubtotal - discount);

  const cashAmount = Number(cashAmountStr) || 0;
  const changeAmount = Math.max(0, cashAmount - totalBayar);
  const isCashInsufficient = method === 'TUNAI' && cashAmount < totalBayar;

  const formatRupiah = (val: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Quick cash note suggestion buttons based on totalBayar
  const quickCashOptions = useMemo(() => {
    const list = [totalBayar];
    const denominations = [10000, 20000, 50000, 100000, 150000, 200000];
    denominations.forEach((denom) => {
      if (denom > totalBayar && !list.includes(denom)) {
        list.push(denom);
      }
    });

    const nextTenK = Math.ceil(totalBayar / 10000) * 10000;
    if (nextTenK > totalBayar && !list.includes(nextTenK)) list.push(nextTenK);

    const nextFiftyK = Math.ceil(totalBayar / 50000) * 50000;
    if (nextFiftyK > totalBayar && !list.includes(nextFiftyK)) list.push(nextFiftyK);

    return Array.from(new Set(list)).sort((a, b) => a - b).slice(0, 5);
  }, [totalBayar]);

  const handleProcessPayment = async () => {
    setError(null);

    if (method === 'TUNAI' && cashAmount < totalBayar) {
      setError('Uang tunai yang diterima kurang dari total bayar.');
      return;
    }

    // Guard khusus QRIS: Kasir wajib mengonfirmasi telah memeriksa notifikasi/mutasi
    if (method === 'QRIS' && !isQrisVerified) {
      setError('Harap centang konfirmasi bahwa Anda telah memeriksa notifikasi m-Banking atau bukti bayar sebelum menyelesaikan transaksi.');
      return;
    }

    setProcessing(true);
    try {
      const createdTx = await checkout({
        paymentMethod: method,
        cashAmount: method === 'TUNAI' ? cashAmount : totalBayar,
        changeAmount: method === 'TUNAI' ? changeAmount : 0,
        discount,
        total: totalBayar,
      });

      onSuccess(createdTx);
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal menyelesaikan transaksi.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintQrisSlip = () => {
    QrisService.printQrisCard();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-neutral-300">
        {/* Header - Desain Hitam Putih Minimalis */}
        <div className="bg-black px-5 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-neutral-800">
          <div>
            <h2 className="font-extrabold text-base leading-tight">Pembayaran Kasir</h2>
            <p className="text-neutral-400 text-[11px]">{cartItemsCount} barang dalam keranjang</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 transition text-neutral-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-black flex-1 text-xs">
          {error && (
            <div className="p-3 bg-neutral-100 border-2 border-black rounded-xl text-black text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-black mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Rincian: Subtotal, Diskon, dan TOTAL BAYAR */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-300 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600 font-medium">Subtotal ({cartItemsCount} item):</span>
              <span className="font-bold text-black">{formatRupiah(cartSubtotal)}</span>
            </div>

            {/* Diskon */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 font-medium flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-black" />
                  <span>Diskon / Potongan:</span>
                </span>
                <span className={`font-bold ${discount > 0 ? 'text-black' : 'text-neutral-400'}`}>
                  {discount > 0 ? `- ${formatRupiah(discount)}` : 'Rp 0'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-neutral-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={discountStr}
                    onChange={(e) => setDiscountStr(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-black focus:outline-hidden focus:border-black"
                  />
                </div>
                {discount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountStr('')}
                    className="px-2 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-black rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Big Prominent TOTAL BAYAR Card (Desain Hitam Putih Tegas) */}
            <div className="bg-black text-white p-4 rounded-2xl text-center shadow-md border border-neutral-800 mt-2">
              <span className="text-[11px] font-black tracking-widest text-neutral-300 uppercase">
                TOTAL BAYAR
              </span>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                {formatRupiah(totalBayar)}
              </div>
              {discount > 0 && (
                <p className="text-[11px] text-neutral-300 font-medium mt-1">
                  (Subtotal {formatRupiah(cartSubtotal)} - Diskon {formatRupiah(discount)})
                </p>
              )}
            </div>
          </div>

          {/* Metode Pembayaran Tabs */}
          <div>
            <label className="block text-xs font-extrabold text-black mb-2 uppercase tracking-wide">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod('TUNAI')}
                className={`py-3 px-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition cursor-pointer ${
                  method === 'TUNAI'
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-neutral-300 bg-white text-black hover:bg-neutral-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Tunai / Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('QRIS')}
                className={`py-3 px-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition cursor-pointer ${
                  method === 'QRIS'
                    ? 'border-black bg-black text-white shadow-md'
                    : 'border-neutral-300 bg-white text-black hover:bg-neutral-50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS Digital</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Pembayaran Tunai */}
          {method === 'TUNAI' && (
            <div className="space-y-3 animate-in fade-in">
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Uang Tunai Diterima (Rp)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-neutral-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={cashAmountStr}
                    onChange={(e) => setCashAmountStr(e.target.value)}
                    placeholder="Masukkan jumlah uang pelanggan"
                    className="w-full pl-11 pr-4 py-3 bg-neutral-50 border-2 border-neutral-300 rounded-2xl text-base font-bold text-black focus:outline-hidden focus:border-black focus:bg-white"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-neutral-600">Pecahan Cepat:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {quickCashOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCashAmountStr(String(opt))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer border ${
                        Number(cashAmountStr) === opt
                          ? 'bg-black text-white border-black shadow-xs'
                          : 'bg-white hover:bg-neutral-100 text-black border-neutral-300'
                      }`}
                    >
                      {opt === totalBayar ? 'Uang Pas' : formatRupiah(opt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kembalian Live Calculation Box */}
              <div
                className={`p-3.5 rounded-2xl border-2 transition ${
                  isCashInsufficient
                    ? 'bg-neutral-100 border-black text-black'
                    : 'bg-neutral-50 border-black text-black'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700">
                    {isCashInsufficient ? 'Kurang Bayar:' : 'Kembalian:'}
                  </span>
                  <span className="text-lg font-black text-black">
                    {isCashInsufficient
                      ? formatRupiah(totalBayar - cashAmount)
                      : formatRupiah(changeAmount)}
                  </span>
                </div>
                {isCashInsufficient && (
                  <p className="text-[10px] text-black mt-1 font-semibold">
                    Uang tunai kurang. Masukkan jumlah uang pas atau lebih besar.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Pembayaran QRIS Digital (Sesuai Ketentuan 3, 4, 5, 6, 8) */}
          {method === 'QRIS' && (
            <div className="space-y-3.5 animate-in fade-in">
              {/* Wadah Kartu QRIS Toko */}
              {store?.qrisImageUrl ? (
                <div className="bg-white p-4 rounded-3xl border-2 border-black text-center space-y-3 shadow-sm">
                  {/* Info Header QRIS */}
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      <span>{store.qrisMerchantName || store.storeName}</span>
                    </span>
                    {store.qrisNmid && (
                      <span className="text-[10px] font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
                        NMID: {store.qrisNmid}
                      </span>
                    )}
                  </div>

                  {/* Gambar QRIS Toko Otomatis Ditampilkan */}
                  <div className="bg-white p-2.5 rounded-2xl border-2 border-neutral-200 inline-block max-w-[230px] mx-auto shadow-xs">
                    <img
                      src={store.qrisImageUrl}
                      alt="QRIS Toko"
                      className="w-full h-auto max-h-[200px] object-contain rounded-lg mx-auto"
                    />
                  </div>

                  {/* Total Tagihan Ditampilkan Secara Prominen */}
                  <div className="p-3 bg-black text-white rounded-2xl text-center space-y-0.5 shadow-sm">
                    <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest">
                      TOTAL TAGIHAN QRIS
                    </p>
                    <p className="text-2xl font-black text-white tracking-tight">
                      {formatRupiah(totalBayar)}
                    </p>
                    <p className="text-[10px] text-neutral-300">
                      Tunjukkan barcode QRIS ini ke pembeli untuk discan
                    </p>
                  </div>

                  {/* Tombol Cetak QRIS & Tombol Ganti QRIS */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handlePrintQrisSlip}
                      className="py-2.5 px-3 bg-white hover:bg-neutral-100 text-black border-2 border-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      title="Cetak slip tagihan QRIS untuk pelanggan"
                    >
                      <Printer className="w-3.5 h-3.5 text-black" />
                      <span>Cetak QRIS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsQrisSettingsOpen(true)}
                      className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-black" />
                      <span>Atur / Ganti QRIS</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Jika Toko Belum Mengunggah QRIS */
                <div className="p-5 bg-neutral-50 rounded-3xl border-2 border-dashed border-black text-center space-y-3">
                  <div className="w-14 h-14 bg-white rounded-2xl border-2 border-black flex items-center justify-center mx-auto shadow-xs">
                    <QrCode className="w-7 h-7 text-black" />
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-black">QRIS Toko Belum Diunggah</h4>
                    <p className="text-[11px] text-neutral-600 mt-1 max-w-xs mx-auto leading-relaxed">
                      Unggah gambar QRIS dari galeri HP warung Anda agar muncul otomatis saat transaksi.
                    </p>
                  </div>

                  {/* Total Tagihan tetap tampil */}
                  <div className="p-2.5 bg-black text-white rounded-xl text-center">
                    <span className="text-[10px] text-neutral-300 font-bold uppercase">Tagihan Belanja</span>
                    <p className="text-xl font-black">{formatRupiah(totalBayar)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsQrisSettingsOpen(true)}
                    className="w-full py-2.5 px-3 bg-black hover:bg-neutral-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-white" />
                    <span>Unggah Gambar QRIS dari Galeri Sekarang</span>
                  </button>
                </div>
              )}

              {/* Area Konfirmasi Pembayaran oleh Kasir (Ketentuan 5 & 6) */}
              <div className="p-3.5 bg-neutral-100 rounded-2xl border-2 border-black space-y-2.5">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-black shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-xs text-black">
                      Konfirmasi Kasir Wajib Dilakukan
                    </p>
                    <p className="text-[11px] text-neutral-700 leading-relaxed mt-0.5">
                      Periksa mutasi saldo m-Banking atau notifikasi SMS/Aplikasi pembayaran terlebih dahulu. Transaksi tidak akan dianggap lunas hanya karena QRIS ditampilkan.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-3 bg-white rounded-xl border-2 border-black cursor-pointer select-none transition hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={isQrisVerified}
                    onChange={(e) => setIsQrisVerified(e.target.checked)}
                    className="w-4 h-4 accent-black rounded cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-black text-black leading-tight">
                    Saya (kasir) sudah memeriksa notifikasi &amp; dana pembayaran {formatRupiah(totalBayar)} telah masuk.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Button */}
        <div className="p-4 bg-white border-t border-neutral-300 shrink-0">
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={
              processing ||
              totalBayar <= 0 ||
              (method === 'TUNAI' && isCashInsufficient) ||
              (method === 'QRIS' && !isQrisVerified)
            }
            className="w-full py-3.5 bg-black hover:bg-neutral-900 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {processing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : method === 'QRIS' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>
                  {isQrisVerified
                    ? `Konfirmasi QRIS Lunas (${formatRupiah(totalBayar)})`
                    : 'Centang Konfirmasi Kasir Terlebih Dahulu'}
                </span>
              </>
            ) : (
              <>
                <span>Selesaikan Transaksi &amp; Simpan</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Pengaturan QRIS Toko */}
      <QrisSettingsModal
        isOpen={isQrisSettingsOpen}
        onClose={() => setIsQrisSettingsOpen(false)}
      />

      {/* Hidden Container Cetak Slip QRIS Tagihan untuk window.print */}
      <div id="qris-bill-print" className="hidden print:block print:p-4 print:text-black font-mono">
        <div className="max-w-[58mm] mx-auto text-center border-b border-black pb-2">
          <h3 className="font-black text-sm uppercase">
            {store?.qrisMerchantName || store?.storeName || 'KASIR WARUNGKU'}
          </h3>
          <p className="text-[10px]">{store?.address || 'Kasir WarungKu Mobile'}</p>
          {store?.qrisNmid && <p className="text-[9px]">NMID: {store.qrisNmid}</p>}
          <hr className="my-1.5 border-black border-dashed" />
          <p className="text-xs font-black uppercase">TAGIHAN PEMBAYARAN QRIS</p>
          <p className="text-lg font-black my-1">{formatRupiah(totalBayar)}</p>
          <hr className="my-1.5 border-black border-dashed" />
          {store?.qrisImageUrl && (
            <img
              src={store.qrisImageUrl}
              alt="QRIS Tagihan"
              className="w-44 h-44 mx-auto object-contain my-1"
            />
          )}
          <hr className="my-1.5 border-black border-dashed" />
          <p className="text-[9px]">Silakan scan dengan aplikasi m-Banking atau e-Wallet</p>
          <p className="text-[8px] text-neutral-500 mt-1">Kasir WarungKu Mobile POS</p>
        </div>
      </div>
    </div>
  );
};
