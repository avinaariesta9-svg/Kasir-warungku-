import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Camera,
  Printer,
  X,
  CreditCard,
  ArrowRight,
  Package,
  Check,
  Banknote,
  QrCode,
  Tag,
  CheckCircle2,
  AlertCircle,
  Store,
  Keyboard,
  Info,
} from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { Product, PRODUCT_CATEGORIES, Transaction, PaymentMethod } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PaymentModal } from './PaymentModal';
import { ReceiptView } from './ReceiptView';
import { PrinterSettingsModal } from './PrinterSettingsModal';
import { QuickAddProductModal } from './QuickAddProductModal';
import { QrisSettingsModal } from './QrisSettingsModal';

export const CashierView: React.FC = () => {
  const { products, loading: productsLoading } = useProducts();
  const { store } = useAuth();
  const {
    cart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartItemsCount,
    checkout,
  } = useTransactions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Quick Add Product state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddQuery, setQuickAddQuery] = useState('');
  const [quickAddToast, setQuickAddToast] = useState<string | null>(null);

  // Checkout calculation state
  const [discountStr, setDiscountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [cashAmountStr, setCashAmountStr] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [isQrisSettingsOpen, setIsQrisSettingsOpen] = useState(false);

  const [lastCompletedTx, setLastCompletedTx] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const formatRupiah = (val: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Accurate automatic calculations
  const discount = Math.min(cartSubtotal, Math.max(0, Number(discountStr) || 0));
  const totalBayar = Math.max(0, cartSubtotal - discount);

  const cashAmount = Number(cashAmountStr) || 0;
  const changeAmount = Math.max(0, cashAmount - totalBayar);
  const isCashInsufficient = paymentMethod === 'TUNAI' && cashAmount < totalBayar;

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

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'Semua' && p.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchBarcode = p.barcode?.toLowerCase().includes(q);
        return matchName || matchBarcode;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle barcode scanned from camera
  const handleBarcodeScanned = (scannedCode: string) => {
    const matchedProduct = products.find(
      (p) => p.barcode?.trim().toLowerCase() === scannedCode.trim().toLowerCase()
    );

    if (matchedProduct) {
      addToCart(matchedProduct, 1);
      setSearchQuery('');
    } else {
      setSearchQuery(scannedCode);
      setQuickAddQuery(scannedCode);
      setIsQuickAddOpen(true);
    }
  };

  // Handle USB Barcode Scanner Gun / Keyboard Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchQuery.trim().toLowerCase();
      if (!code) return;

      // 1. Exact match by barcode
      const matchedByBarcode = products.find(
        (p) => p.barcode?.trim().toLowerCase() === code
      );
      if (matchedByBarcode) {
        addToCart(matchedByBarcode, 1);
        setSearchQuery('');
        return;
      }

      // 2. Exact match by single filtered product
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0], 1);
        setSearchQuery('');
        return;
      }

      // 3. Not found: Open quick add product modal
      if (filteredProducts.length === 0) {
        setQuickAddQuery(searchQuery.trim());
        setIsQuickAddOpen(true);
      }
    }
  };

  const handleQuickAddSuccess = (newProduct: Product) => {
    addToCart(newProduct, 1);
    setSearchQuery('');
    setQuickAddToast(`"${newProduct.name}" berhasil disimpan & masuk keranjang!`);
    setTimeout(() => setQuickAddToast(null), 3500);
  };

  const handleProcessDirectCheckout = async () => {
    setPaymentError(null);

    if (cart.length === 0) {
      setPaymentError('Keranjang belanja masih kosong.');
      return;
    }

    if (paymentMethod === 'TUNAI' && cashAmount < totalBayar) {
      setPaymentError('Uang tunai yang diterima kurang dari total bayar.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const createdTx = await checkout({
        paymentMethod,
        cashAmount: paymentMethod === 'TUNAI' ? cashAmount : totalBayar,
        changeAmount: paymentMethod === 'TUNAI' ? changeAmount : 0,
        discount,
        total: totalBayar,
      });

      setIsCartDrawerOpen(false);
      setCashAmountStr('');
      setDiscountStr('');
      setLastCompletedTx(createdTx);
      setIsReceiptOpen(true);
    } catch (err: unknown) {
      setPaymentError((err as Error).message || 'Gagal menyelesaikan transaksi.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = (tx: Transaction) => {
    setIsPaymentOpen(false);
    setIsCartDrawerOpen(false);
    setCashAmountStr('');
    setDiscountStr('');
    setLastCompletedTx(tx);
    setIsReceiptOpen(true);
  };

  const categoriesWithAll = ['Semua', ...PRODUCT_CATEGORIES];

  // Reusable Checkout & Cart Panel Content
  const renderCartAndCheckoutContent = (isDrawer: boolean = false) => (
    <div className="space-y-4 text-slate-800">
      {/* 1. DAFTAR BARANG DI KERANJANG */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-0.5">
          <span>Daftar Barang Belanja ({cartItemsCount} item)</span>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer"
            >
              Kosongkan
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/80">
            <ShoppingCart className="w-9 h-9 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold text-slate-600">Keranjang masih kosong</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Klik produk di katalog atau scan barcode untuk menambah belanjaan
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-0.5">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {item.product.name}
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatRupiah(item.product.sellingPrice)} × {item.qty}
                  </p>
                  <p className="text-xs font-black text-emerald-700 mt-0.5">
                    Subtotal: {formatRupiah(item.subtotal)}
                  </p>
                </div>

                {/* Quantity Stepper +/- */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQty(item.product.id, item.qty - 1)}
                    className="w-8 h-8 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition cursor-pointer"
                    title={item.qty === 1 ? 'Hapus barang' : 'Kurangi'}
                  >
                    {item.qty === 1 ? (
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <span className="w-6 text-center font-bold text-xs sm:text-sm text-slate-900">
                    {item.qty}
                  </span>

                  <button
                    onClick={() => {
                      if (item.qty < item.product.stock) {
                        updateQty(item.product.id, item.qty + 1);
                      }
                    }}
                    disabled={item.qty >= item.product.stock}
                    className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white active:scale-95 transition shadow-xs cursor-pointer"
                    title={item.qty >= item.product.stock ? 'Stok maksimal tercapai' : 'Tambah'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. RINCIAN BIAYA & TOTAL BAYAR */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-600 font-medium">Subtotal ({cartItemsCount} item):</span>
          <span className="font-bold text-slate-900">{formatRupiah(cartSubtotal)}</span>
        </div>

        {/* Diskon */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
          <div className="flex items-center justify-between text-xs sm:text-sm">
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
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {discount > 0 && (
              <button
                type="button"
                onClick={() => setDiscountStr('')}
                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Hapus
              </button>
            )}
          </div>

          {/* Tombol Shortcut Diskon */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {[0, 1000, 2000, 5000, 10000].map((discOpt) => (
              <button
                key={discOpt}
                type="button"
                onClick={() => setDiscountStr(discOpt === 0 ? '' : String(discOpt))}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  (discOpt === 0 && !discountStr) || Number(discountStr) === discOpt
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {discOpt === 0 ? 'Tanpa Diskon' : formatRupiah(discOpt)}
              </button>
            ))}
          </div>
        </div>

        {/* TOTAL BAYAR (BESAR & TEBAL) */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-4 rounded-2xl text-center shadow-lg shadow-emerald-700/25 border border-emerald-500 mt-2">
          <div className="text-[11px] font-black tracking-widest text-emerald-200 uppercase">
            TOTAL BAYAR
          </div>
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

      {/* 3. BAGIAN PEMBAYARAN */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
          Metode Pembayaran
        </span>

        {/* Tab Pilihan Pembayaran */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod('TUNAI')}
            className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
              paymentMethod === 'TUNAI'
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Tunai (Cash)</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('QRIS')}
            className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition cursor-pointer ${
              paymentMethod === 'QRIS'
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QRIS Digital</span>
          </button>
        </div>

        {/* Sub-bagian Tunai */}
        {paymentMethod === 'TUNAI' ? (
          <div className="space-y-3 pt-1">
            {/* Input Uang Diterima */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  Uang Diterima Pelanggan:
                </label>
                {cashAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setCashAmountStr('')}
                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Reset
                  </button>
                )}
              </div>
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
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Tombol Pecahan Uang Cepat */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-500">Pecahan Cepat:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {quickCashOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCashAmountStr(String(opt))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                      Number(cashAmountStr) === opt
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    {opt === totalBayar ? 'Uang Pas' : formatRupiah(opt)}
                  </button>
                ))}
              </div>
            </div>

            {/* TAMPILAN KEMBALIAN DI BAWAH UANG DITERIMA */}
            <div
              className={`p-3.5 rounded-2xl border transition ${
                isCashInsufficient && cashAmount > 0
                  ? 'bg-red-50 border-red-300'
                  : cashAmount >= totalBayar && totalBayar > 0
                  ? 'bg-emerald-50 border-2 border-emerald-400 shadow-2xs'
                  : 'bg-slate-100 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {isCashInsufficient && cashAmount > 0 ? 'Kurang Bayar:' : 'Kembalian:'}
                </span>
                <span
                  className={`text-xl sm:text-2xl font-black ${
                    isCashInsufficient && cashAmount > 0
                      ? 'text-red-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {isCashInsufficient && cashAmount > 0
                    ? formatRupiah(totalBayar - cashAmount)
                    : formatRupiah(changeAmount)}
                </span>
              </div>

              {cashAmount >= totalBayar && totalBayar > 0 && changeAmount === 0 && (
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  ✓ Pembayaran Pas (Tidak ada kembalian)
                </p>
              )}

              {isCashInsufficient && cashAmount > 0 && (
                <p className="text-[10px] text-red-600 mt-1 font-medium">
                  Uang yang diterima masih kurang. Masukkan jumlah uang yang pas atau lebih.
                </p>
              )}
            </div>
          </div>
        ) : (
          /* QRIS Digital View */
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
            <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              <svg className="w-24 h-24 mx-auto" viewBox="0 0 200 200" fill="none">
                <rect width="200" height="200" fill="white" />
                <rect x="20" y="20" width="50" height="50" rx="6" fill="#1e293b" />
                <rect x="28" y="28" width="34" height="34" rx="4" fill="white" />
                <rect x="36" y="36" width="18" height="18" rx="2" fill="#059669" />
                <rect x="130" y="20" width="50" height="50" rx="6" fill="#1e293b" />
                <rect x="138" y="28" width="34" height="34" rx="4" fill="white" />
                <rect x="146" y="36" width="18" height="18" rx="2" fill="#059669" />
                <rect x="20" y="130" width="50" height="50" rx="6" fill="#1e293b" />
                <rect x="28" y="138" width="34" height="34" rx="4" fill="white" />
                <rect x="36" y="146" width="18" height="18" rx="2" fill="#059669" />
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
            <p className="font-extrabold text-xs text-slate-900">
              {store?.storeName || 'Kasir WarungKu'}
            </p>
            <p className="text-xs text-emerald-800 font-bold">
              Tagihan QRIS: {formatRupiah(totalBayar)}
            </p>
          </div>
        )}

        {/* Error Banner */}
        {paymentError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{paymentError}</span>
          </div>
        )}
      </div>

      {/* Tombol Selesaikan Transaksi */}
      <button
        type="button"
        onClick={handleProcessDirectCheckout}
        disabled={
          isProcessingPayment ||
          (paymentMethod === 'TUNAI' && cashAmount < totalBayar) ||
          totalBayar <= 0
        }
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isProcessingPayment ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>Selesaikan Transaksi ({formatRupiah(totalBayar)})</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col pb-28 lg:pb-8 font-sans">
      {/* Responsive Grid: Split 2 Kolom di Layar Lebar (Desktop/Laptop), 1 Kolom di HP */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* KOLOM KIRI: KATALOG PRODUK (col-span-7 xl:col-span-8) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          {/* Top Search & Filter Bar */}
          <div className="bg-white border-b lg:border lg:rounded-2xl border-slate-200 sticky top-14 lg:static z-20 px-4 py-3 shadow-xs space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
                <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{store?.storeName || 'Warung Saya'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Keyboard className="w-3 h-3 text-slate-400" />
                  <span>Scanner USB (Tekan Enter)</span>
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                  Kasir POS
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search Box with Barcode Gun Enter Listener */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Cari barang atau scan barcode (Enter)..."
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white border border-transparent focus:border-emerald-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Barcode Camera Scanner Button */}
              <button
                onClick={() => setIsScannerOpen(true)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 shrink-0 flex items-center justify-center border border-slate-200 cursor-pointer"
                title="Scan Barcode via Kamera HP / Webcam"
                aria-label="Scan Barcode via Kamera HP / Webcam"
              >
                <Camera className="w-4 h-4 text-emerald-700" />
              </button>

              {/* Tambah Produk Langsung Button */}
              <button
                onClick={() => {
                  setQuickAddQuery(searchQuery.trim());
                  setIsQuickAddOpen(true);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition shrink-0 cursor-pointer"
                title="Tambah Produk Baru Langsung"
                aria-label="Tambah Produk Baru Langsung"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah Produk</span>
              </button>

              {/* Printer Setup Button */}
              <button
                onClick={() => setIsPrinterSettingsOpen(true)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 shrink-0 flex items-center justify-center border border-slate-200 cursor-pointer"
                title="Pengaturan Printer Kasir"
                aria-label="Pengaturan Printer Kasir"
              >
                <Printer className="w-4 h-4 text-slate-700" />
              </button>

              {/* QRIS Setup Button */}
              <button
                onClick={() => setIsQrisSettingsOpen(true)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition active:scale-95 shrink-0 flex items-center justify-center border border-slate-200 cursor-pointer"
                title="Pengaturan QRIS Toko (Upload & Cetak Stand QRIS)"
                aria-label="Pengaturan QRIS Toko"
              >
                <QrCode className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
              {categoriesWithAll.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Catalog Cards Grid */}
          <div className="flex-1">
            {productsLoading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Memuat katalog kasir...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                <Package className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                <h4 className="font-bold text-slate-800 text-sm">Produk Tidak Ditemukan</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {searchQuery
                    ? `Tidak ada produk dengan kata kunci "${searchQuery}".`
                    : 'Belum ada produk di kategori ini.'}
                </p>

                {/* Tombol Tambah Produk Langsung */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 max-w-sm mx-auto">
                  <button
                    onClick={() => {
                      setQuickAddQuery(searchQuery.trim());
                      setIsQuickAddOpen(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Produk {searchQuery ? `"${searchQuery.slice(0, 18)}"` : 'Baru'}</span>
                  </button>

                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-semibold transition cursor-pointer"
                    >
                      Reset Pencarian
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((i) => i.product.id === product.id);
                  const inCartQty = cartItem?.qty || 0;
                  const isOutOfStock = product.stock <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (!isOutOfStock) {
                          addToCart(product, 1);
                        }
                      }}
                      className={`bg-white rounded-2xl p-3.5 border transition flex flex-col justify-between relative shadow-2xs ${
                        isOutOfStock
                          ? 'opacity-60 border-slate-200 cursor-not-allowed bg-slate-50'
                          : 'hover:border-emerald-500 hover:shadow-xs active:scale-98 cursor-pointer border-slate-200/90'
                      }`}
                    >
                      {/* Quantity in cart badge */}
                      {inCartQty > 0 && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                          {inCartQty}
                        </span>
                      )}

                      <div>
                        <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {product.category || 'Lainnya'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1 leading-snug line-clamp-2">
                          {product.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <p className="text-xs sm:text-sm font-black text-emerald-700">
                            {formatRupiah(product.sellingPrice)}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Stok: {product.stock}
                          </p>
                        </div>

                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs transition ${
                            isOutOfStock
                              ? 'bg-slate-200 text-slate-400'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: PANEL KERANJANG & CHECKOUT TETAP (Hanya Muncul di Laptop & Desktop lg:) */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col bg-white rounded-3xl border border-slate-200/90 shadow-md p-4 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Panel Kasir & Pembayaran
              </h3>
            </div>
            <button
              onClick={() => setIsPrinterSettingsOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 text-xs flex items-center gap-1 cursor-pointer"
              title="Pengaturan Printer"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

          {renderCartAndCheckoutContent(false)}
        </div>
      </div>

      {/* FLOATING CART BAR UNTUK HP ANDROID (Hanya Muncul di Mobile/Tablet Kecil < lg) */}
      {cart.length > 0 && (
        <div className="fixed bottom-14 inset-x-0 z-30 px-3 py-2 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none lg:hidden">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-2xl p-3.5 shadow-xl flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center relative">
                  <ShoppingCart className="w-5 h-5 text-white" />
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                    {cartItemsCount}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-emerald-100 leading-tight">
                    {cart.length} Jenis Barang ({cartItemsCount} Pcs)
                  </p>
                  <p className="text-base font-black text-white mt-0.5">
                    {formatRupiah(totalBayar)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white text-emerald-800 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs">
                <span>Bayar Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BAR: CETAK STRUK TRANSAKSI TERAKHIR (HP ANDROID & DESKTOP) */}
      {cart.length === 0 && lastCompletedTx && !isReceiptOpen && (
        <div className="fixed bottom-20 sm:bottom-6 left-0 right-0 z-30 px-3 sm:px-6 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700/60 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Transaksi Berhasil Selesai
                </p>
                <p className="text-xs font-mono font-bold text-slate-100 truncate mt-0.5">
                  {lastCompletedTx.invoiceNumber} • {formatRupiah(lastCompletedTx.total)}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReceiptOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Struk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastCompletedTx(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
                  title="Tutup Notifikasi"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDING BOTTOM SHEET CART DRAWER UNTUK HP ANDROID (lg:hidden) */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 animate-in fade-in lg:hidden">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 border-t border-slate-200">
            {/* Drawer Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    Keranjang Belanja
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {cartItemsCount} item ({cart.length} jenis produk)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="p-4 overflow-y-auto flex-1 text-slate-800">
              {renderCartAndCheckoutContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Printer Settings Modal */}
      <PrinterSettingsModal
        isOpen={isPrinterSettingsOpen}
        onClose={() => setIsPrinterSettingsOpen(false)}
      />

      {/* QRIS Settings Modal */}
      <QrisSettingsModal
        isOpen={isQrisSettingsOpen}
        onClose={() => setIsQrisSettingsOpen(false)}
      />

      {/* Receipt View Modal */}
      {lastCompletedTx && (
        <ReceiptView
          isOpen={isReceiptOpen}
          transaction={lastCompletedTx}
          onClose={() => setIsReceiptOpen(false)}
          onOpenPrinterSettings={() => {
            setIsReceiptOpen(false);
            setIsPrinterSettingsOpen(true);
          }}
        />
      )}

      {/* Quick Add Product Modal */}
      <QuickAddProductModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        initialQuery={quickAddQuery}
        onSuccess={handleQuickAddSuccess}
      />

      {/* Quick Add Toast Feedback */}
      {quickAddToast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-emerald-600 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{quickAddToast}</span>
        </div>
      )}
    </div>
  );
};
