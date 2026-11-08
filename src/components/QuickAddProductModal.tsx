import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Barcode,
  Camera,
  X,
  Check,
  AlertCircle,
  Tag,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { useAuth } from '../context/AuthContext';
import { Product, PRODUCT_CATEGORIES, PRODUCT_UNITS } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface QuickAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSuccess: (newProduct: Product) => void;
}

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSuccess,
}) => {
  const { products, addProduct } = useProducts();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('Pcs');
  const [category, setCategory] = useState('Lainnya');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize fields based on initialQuery
  useEffect(() => {
    if (isOpen) {
      setError(null);
      const queryTrimmed = initialQuery.trim();
      // If query is numbers and longer than 6 digits, it's likely a barcode
      const isBarcodeLike = /^[0-9]{6,}$/.test(queryTrimmed);

      if (isBarcodeLike) {
        setBarcode(queryTrimmed);
        setName('');
      } else {
        setName(queryTrimmed);
        setBarcode('');
      }

      setSellingPrice('');
      setCostPrice('');
      setStock('10');
      setUnit('Pcs');
      setCategory('Lainnya');
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const costNum = Number(costPrice) || 0;
  const sellingNum = Number(sellingPrice) || 0;
  const estimatedProfit = Math.max(0, sellingNum - costNum);

  const formatRupiah = (val: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Nama produk wajib diisi.');
      return;
    }

    if (sellingNum <= 0) {
      setError('Harga jual wajib diisi dan harus lebih dari 0.');
      return;
    }

    if (costNum < 0) {
      setError('Harga modal tidak boleh bernilai minus.');
      return;
    }

    // Check duplicate barcode in current store
    const cleanBarcode = barcode.trim();
    if (cleanBarcode) {
      const existingProduct = products.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === cleanBarcode.toLowerCase()
      );
      if (existingProduct) {
        setError(
          `Kode barcode "${cleanBarcode}" sudah digunakan oleh produk "${existingProduct.name}". Gunakan barcode lain atau kosongkan.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const stockNum = Math.max(0, Number(stock) || 0);
      const newId = await addProduct({
        name: cleanName,
        barcode: cleanBarcode,
        category,
        unit: unit.trim() || 'Pcs',
        costPrice: costNum,
        sellingPrice: sellingNum,
        stock: stockNum,
        minStock: 5,
      });

      const now = new Date().toISOString();
      const createdProduct: Product = {
        id: newId,
        storeId: user?.uid || '',
        name: cleanName,
        barcode: cleanBarcode,
        category,
        unit: unit.trim() || 'Pcs',
        costPrice: costNum,
        sellingPrice: sellingNum,
        stock: stockNum,
        minStock: 5,
        createdAt: now,
        updatedAt: now,
      };

      onSuccess(createdProduct);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal menyimpan produk baru.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
        <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="bg-emerald-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">Tambah Produk Langsung</h2>
                <p className="text-emerald-100 text-[11px]">
                  Otomatis simpan ke stok & masukkan ke keranjang kasir
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Nama Produk (Wajib) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Telur Ayam 1kg, Kopi ABC Susu, dll."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Barcode (Opsional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Kode Barcode <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <span className="text-[10px] text-slate-400">Scan atau ketik</span>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Contoh: 8991234567890"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer"
                  title="Pindai barcode via kamera"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Scan</span>
                </button>
              </div>
            </div>

            {/* Baris Harga: Harga Jual (Wajib) & Harga Modal (Opsional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Jual (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="Contoh: 15000"
                  className="w-full px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Beli / Modal (Rp) <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Contoh: 12500"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Info Laba Bersih Perkiraan jika modal diisi */}
            {sellingNum > 0 && costNum > 0 && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                <span>Perkiraan Keuntungan:</span>
                <span className="font-extrabold text-emerald-800">
                  +{formatRupiah(estimatedProfit)} / {unit}
                </span>
              </div>
            )}

            {/* Baris Stok Awal & Satuan Barang */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stok Awal
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="10"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Satuan
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  {PRODUCT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Tag className="w-4 h-4" />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Informasi Otomatis Masuk Keranjang */}
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Setelah disimpan, produk otomatis masuk ke keranjang belanja kasir (jumlah 1) dan siap ditransaksikan.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-98 cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan & Masukkan Keranjang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Barcode Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          setBarcode(scannedCode);
        }}
      />
    </>
  );
};
