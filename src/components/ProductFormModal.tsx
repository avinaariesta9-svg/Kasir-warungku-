import React, { useState, useEffect } from 'react';
import {
  Package,
  Barcode,
  Camera,
  Layers,
  DollarSign,
  Tag,
  AlertTriangle,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useProducts } from '../context/ProductContext';
import { Product, PRODUCT_CATEGORIES } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { products, addProduct, updateProduct } = useProducts();

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<string>('Sembako');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [stock, setStock] = useState<string>('');
  const [minStock, setMinStock] = useState<string>('5');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setBarcode(productToEdit.barcode || '');
      setCategory(productToEdit.category || 'Sembako');
      setCostPrice(String(productToEdit.costPrice || 0));
      setSellingPrice(String(productToEdit.sellingPrice || 0));
      setStock(String(productToEdit.stock || 0));
      setMinStock(String(productToEdit.minStock ?? 5));
    } else {
      setName('');
      setBarcode('');
      setCategory('Sembako');
      setCostPrice('');
      setSellingPrice('');
      setStock('');
      setMinStock('5');
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const costNum = Number(costPrice) || 0;
  const sellingNum = Number(sellingPrice) || 0;
  const profitMargin = sellingNum - costNum;

  const formatRupiah = (val: number) => {
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

    if (!name.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }

    if (sellingNum < 0 || costNum < 0) {
      setError('Harga tidak boleh bernilai negatif.');
      return;
    }

    // Check duplicate barcode in current store
    const cleanBarcode = barcode.trim();
    if (cleanBarcode) {
      const dup = products.find(
        (p) =>
          p.barcode &&
          p.barcode.trim().toLowerCase() === cleanBarcode.toLowerCase() &&
          p.id !== productToEdit?.id
      );
      if (dup) {
        setError(
          `Kode barcode "${cleanBarcode}" sudah digunakan oleh produk "${dup.name}". Gunakan barcode lain atau kosongkan.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name,
          barcode,
          category,
          costPrice: costNum,
          sellingPrice: sellingNum,
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 5,
        });
      } else {
        await addProduct({
          name,
          barcode,
          category,
          costPrice: costNum,
          sellingPrice: sellingNum,
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 5,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal menyimpan produk.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="bg-emerald-600 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">
                  {productToEdit ? 'Edit Produk' : 'Tambah Produk Baru'}
                </h2>
                <p className="text-emerald-100 text-[11px]">Kelola persediaan warung</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Scrollable Body */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Nama Produk */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Minyak Goreng Bimoli 1L"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
              />
            </div>

            {/* Barcode & Scanner Button */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kode Barcode / EAN
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan atau ketik kode barcode"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="px-3.5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0"
                  title="Pindai dengan Kamera HP"
                >
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>Scan</span>
                </button>
              </div>
            </div>

            {/* Kategori Produk */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori Produk
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Tag className="w-4 h-4" />
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 appearance-none"
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  ▼
                </div>
              </div>
            </div>

            {/* Harga Beli & Harga Jual (Grid 2 Kolom) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Beli (Modal)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Harga Jual <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-emerald-600">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="100"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* Profit margin live badge */}
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 flex items-center justify-between text-xs">
              <span className="text-slate-500">Estimasi Keuntungan / Item:</span>
              <span
                className={`font-bold ${
                  profitMargin > 0
                    ? 'text-emerald-700'
                    : profitMargin === 0
                    ? 'text-slate-600'
                    : 'text-red-600'
                }`}
              >
                {formatRupiah(profitMargin)}
              </span>
            </div>

            {/* Stok Barang & Batas Peringatan Stok Menipis */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jumlah Stok Saat Ini <span className="text-red-500">*</span>
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
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peringatan Stok Menipis
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    placeholder="5"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Muncul jika stok ≤ batas ini</p>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-3 flex items-center gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-98 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{productToEdit ? 'Simpan Perubahan' : 'Tambah Produk'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(scannedCode) => {
          setBarcode(scannedCode);
        }}
      />
    </>
  );
};
