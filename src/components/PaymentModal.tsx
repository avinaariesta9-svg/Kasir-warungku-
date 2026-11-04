import React, { useState, useMemo } from 'react';
import {
  Banknote,
  QrCode,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { PaymentMethod, Transaction } from '../types';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-emerald-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-base leading-tight">Pembayaran Kasir</h2>
            <p className="text-emerald-100 text-[11px]">{cartItemsCount} barang dalam keranjang</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Rincian: Subtotal, Diskon, dan TOTAL BAYAR */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">Subtotal ({cartItemsCount} item):</span>
              <span className="font-bold text-slate-900">{formatRupiah(cartSubtotal)}</span>
            </div>

            {/* Diskon */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Diskon / Potongan:</span>
                </span>
                <span className={`font-bold ${discount > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  {discount > 0 ? `- ${formatRupiah(discount)}` : 'Rp 0'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-slate-400 font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={discountStr}
                    onChange={(e) => setDiscountStr(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {discount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountStr('')}
                    className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Big Prominent TOTAL BAYAR Card */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-4 rounded-2xl text-center shadow-lg shadow-emerald-700/25 border border-emerald-500 mt-2">
              <span className="text-[11px] font-black tracking-widest text-emerald-200 uppercase">
                TOTAL BAYAR
              </span>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1 drop-shadow-xs">
                {formatRupiah(totalBayar)}
              </div>
              {discount > 0 && (
                <p className="text-[11px] text-emerald-100 font-medium mt-1">
                  (Subtotal {formatRupiah(cartSubtotal)} - Diskon {formatRupiah(discount)})
                </p>
              )}
            </div>
          </div>

          {/* Metode Pembayaran Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod('TUNAI')}
                className={`py-3 px-3 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition cursor-pointer ${
                  method === 'TUNAI'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Tunai / Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('QRIS')}
                className={`py-3 px-3 rounded-2xl border flex items-center justify-center gap-2 font-bold text-xs sm:text-sm transition cursor-pointer ${
                  method === 'QRIS'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uang Tunai Diterima (Rp)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={cashAmountStr}
                    onChange={(e) => setCashAmountStr(e.target.value)}
                    placeholder="Masukkan jumlah uang pelanggan"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Pecahan Cepat:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {quickCashOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setCashAmountStr(String(opt))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                        Number(cashAmountStr) === opt
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {opt === totalBayar ? 'Uang Pas' : formatRupiah(opt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kembalian Live Calculation Box */}
              <div
                className={`p-3.5 rounded-2xl border transition ${
                  isCashInsufficient
                    ? 'bg-red-50 border-red-200'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    {isCashInsufficient ? 'Kurang Bayar:' : 'Kembalian:'}
                  </span>
                  <span
                    className={`text-lg font-black ${
                      isCashInsufficient ? 'text-red-600' : 'text-emerald-700'
                    }`}
                  >
                    {isCashInsufficient
                      ? formatRupiah(totalBayar - cashAmount)
                      : formatRupiah(changeAmount)}
                  </span>
                </div>
                {isCashInsufficient && (
                  <p className="text-[10px] text-red-600 mt-1 font-medium">
                    Uang tunai kurang. Masukkan jumlah uang pas atau lebih besar.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Pembayaran QRIS */}
          {method === 'QRIS' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3 animate-in fade-in">
              <div className="inline-block p-3 bg-white rounded-2xl shadow-sm border border-slate-200">
                {/* SVG QR Code Illustration */}
                <svg
                  className="w-40 h-40 mx-auto"
                  viewBox="0 0 200 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="200" height="200" fill="white" />
                  {/* Outer QR corners */}
                  <rect x="20" y="20" width="50" height="50" rx="6" fill="#1e293b" />
                  <rect x="28" y="28" width="34" height="34" rx="4" fill="white" />
                  <rect x="36" y="36" width="18" height="18" rx="2" fill="#059669" />

                  <rect x="130" y="20" width="50" height="50" rx="6" fill="#1e293b" />
                  <rect x="138" y="28" width="34" height="34" rx="4" fill="white" />
                  <rect x="146" y="36" width="18" height="18" rx="2" fill="#059669" />

                  <rect x="20" y="130" width="50" height="50" rx="6" fill="#1e293b" />
                  <rect x="28" y="138" width="34" height="34" rx="4" fill="white" />
                  <rect x="36" y="146" width="18" height="18" rx="2" fill="#059669" />

                  {/* QR Pattern Blocks */}
                  <rect x="85" y="25" width="30" height="10" fill="#1e293b" />
                  <rect x="85" y="45" width="20" height="15" fill="#1e293b" />
                  <rect x="25" y="85" width="40" height="15" fill="#1e293b" />
                  <rect x="75" y="75" width="50" height="50" rx="4" fill="#059669" />
                  <text x="100" y="105" fill="white" fontSize="12" fontWeight="bold" textAnchor="middle">QRIS</text>
                  <rect x="135" y="85" width="40" height="15" fill="#1e293b" />
                  <rect x="85" y="135" width="20" height="40" fill="#1e293b" />
                  <rect x="115" y="145" width="45" height="15" fill="#1e293b" />
                  <rect x="135" y="165" width="30" height="15" fill="#1e293b" />
                </svg>
              </div>

              <div>
                <p className="font-extrabold text-sm text-slate-900">
                  {store?.storeName || 'Kasir Warungku'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tunjukkan barcode QRIS di atas kepada pembeli
                </p>
                <p className="text-base font-black text-emerald-700 mt-1">
                  Tagihan: {formatRupiah(totalBayar)}
                </p>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tekan tombol di bawah jika pembeli telah menunjukkan bukti transfer berhasil.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Button */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={processing || isCashInsufficient || totalBayar <= 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {processing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Selesaikan Transaksi & Simpan</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
