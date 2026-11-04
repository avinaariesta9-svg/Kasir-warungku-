import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, X, Save, CheckCircle2, MessageCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface StoreProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreProfileModal: React.FC<StoreProfileModalProps> = ({ isOpen, onClose }) => {
  const { store, updateStore, user } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (store) {
      setStoreName(store.storeName || '');
      setAddress(store.address || '');
      setWhatsapp(store.whatsapp || '');
    }
  }, [store]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!storeName.trim()) {
      setError('Nama toko tidak boleh kosong.');
      return;
    }

    setSaving(true);
    try {
      await updateStore({
        storeName: storeName.trim(),
        address: address.trim(),
        whatsapp: whatsapp.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setError((err as Error).message || 'Gagal menyimpan profil toko.');
    } finally {
      setSaving(false);
    }
  };

  // Clean WhatsApp phone number for link
  const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
  const waUrl = cleanPhone.length >= 9 
    ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}` 
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="bg-emerald-600 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Profil Toko / Warung</h2>
              <p className="text-emerald-100 text-[11px]">Tersimpan di database Firestore</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-emerald-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">Profil toko berhasil diperbarui!</span>
            </div>
          )}

          {/* User info preview */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-600 uppercase font-bold tracking-wider">Pemilik Akun</p>
              <p className="font-semibold text-slate-800 text-xs mt-0.5">{user?.displayName || user?.email}</p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-md">
              Terverifikasi
            </span>
          </div>

          {/* Nama Toko */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Toko / Warung <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Store className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Contoh: Warung Barokah Bu Siti"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Nomor WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Nomor WhatsApp Toko
              </label>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-600 font-medium hover:underline flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Tes Buka Chat</span>
                </a>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Digunakan untuk cetak nota, struk digital, atau kontak pelanggan.
            </p>
          </div>

          {/* Alamat Toko */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alamat Lengkap Toko
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Jl. Diponegoro No. 15, RT 02/RW 04, Kelurahan Sukajadi"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-98 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Profil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
