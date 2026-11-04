import React, { useState, useEffect } from 'react';
import {
  X,
  Store,
  User,
  Phone,
  MapPin,
  Mail,
  Lock,
  Key,
  CheckCircle2,
  Copy,
  Check,
  Send,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Sparkles,
  ListOrdered,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StoreActivationService } from '../services/storeActivationService';
import { ActivatedStoreRecord } from '../types';

interface StoreActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreActivationModal: React.FC<StoreActivationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, loginWithEmail } = useAuth();

  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'guide'>('create');

  // Form State
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');

  // Auto/Custom credentials
  const [useCustomCredentials, setUseCustomCredentials] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');

  // Status State
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result State
  const [activationResult, setActivationResult] = useState<ActivatedStoreRecord | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [loggingIntoNewAccount, setLoggingIntoNewAccount] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState<ActivatedStoreRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Live app URL for Chrome Android
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-3heclh54gvgjwuxcsrqvyn-113028868774.asia-southeast1.run.app';

  // Load history when tab is opened
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const records = await StoreActivationService.getActivatedStores();
      setHistoryList(records);
    } catch (e) {
      console.warn('Gagal memuat riwayat aktivasi:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!isOpen) return null;

  // Auto-generate suggested email & password as user types
  const suggestedEmail = StoreActivationService.generateDefaultEmail(
    storeName || 'warung',
    whatsapp || '1234'
  );
  const suggestedPassword = 'wrg' + (whatsapp.replace(/[^0-9]/g, '').slice(-4) || '8899');

  const handleCreateActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!storeName.trim()) {
      setErrorMessage('Harap masukkan nama warung / toko.');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMessage('Harap masukkan nama pemilik toko.');
      return;
    }
    if (!whatsapp.trim() || whatsapp.replace(/[^0-9]/g, '').length < 8) {
      setErrorMessage('Harap masukkan nomor WhatsApp yang valid (minimal 8 digit).');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Harap masukkan alamat toko.');
      return;
    }

    const emailToUse = useCustomCredentials && customEmail.trim() ? customEmail.trim() : suggestedEmail;
    const passwordToUse = useCustomCredentials && customPassword.trim() ? customPassword.trim() : suggestedPassword;

    if (passwordToUse.length < 6) {
      setErrorMessage('Kata sandi harus minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setLoadingStatus('1/3: Membuat akun pemilik di Firebase Auth...');

    try {
      setLoadingStatus('2/3: Menginisialisasi basis data toko terpisah...');
      const result = await StoreActivationService.activateNewStore({
        storeName,
        ownerName,
        whatsapp,
        address,
        customEmail: emailToUse,
        customPassword: passwordToUse,
        adminEmail: user?.email || 'avinaariesta9@gmail.com',
      });

      setLoadingStatus('3/3: Menyiapkan lisensi dan link PWA...');
      setActivationResult(result);
    } catch (err: unknown) {
      console.error(err);
      const errCode = (err as { code?: string })?.code;
      if (errCode === 'auth/email-already-in-use') {
        setErrorMessage(
          'Email ini sudah terdaftar sebelumnya. Silakan gunakan opsi kredensial manual untuk menentukan email lain.'
        );
      } else {
        setErrorMessage(
          (err as Error).message || 'Gagal mengaktifkan toko. Periksa koneksi internet.'
        );
      }
    } finally {
      setLoading(false);
      setLoadingStatus('');
    }
  };

  const handleCopyDetails = (record: ActivatedStoreRecord) => {
    const message = StoreActivationService.generateWhatsAppMessage(record, appUrl);
    navigator.clipboard.writeText(message);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleSendWhatsApp = (record: ActivatedStoreRecord) => {
    const cleanPhone = StoreActivationService.formatWhatsApp(record.whatsapp);
    const message = StoreActivationService.generateWhatsAppMessage(record, appUrl);
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
  };

  const handleLoginImmediately = async (record: ActivatedStoreRecord) => {
    if (!record.initialPassword) {
      alert('Kata sandi tidak ditemukan.');
      return;
    }
    const confirmSwitch = window.confirm(
      `Apakah Anda ingin keluar dari akun admin saat ini dan langsung login ke toko "${record.storeName}" di HP ini?`
    );
    if (!confirmSwitch) return;

    setLoggingIntoNewAccount(true);
    try {
      await loginWithEmail(record.ownerEmail, record.initialPassword);
      onClose();
    } catch (e) {
      alert('Gagal login otomatis: ' + (e as Error).message);
    } finally {
      setLoggingIntoNewAccount(false);
    }
  };

  const handleResetForm = () => {
    setStoreName('');
    setOwnerName('');
    setWhatsapp('');
    setAddress('');
    setCustomEmail('');
    setCustomPassword('');
    setUseCustomCredentials(false);
    setActivationResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 p-4 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
                <Key className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h2 className="font-extrabold text-base tracking-tight leading-tight flex items-center gap-1.5">
                  <span>Aktivasi Toko Kasir WarungKu</span>
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">
                    Admin
                  </span>
                </h2>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Aktivasi langsung di lokasi konsumen tanpa unduh file APK
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 active:scale-95 transition text-emerald-100 hover:text-white"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Tabs inside modal */}
          <div className="flex mt-3 pt-2 border-t border-emerald-500/50 gap-1 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('create');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Aktivasi Baru</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Daftar Toko Aktif</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-emerald-100 hover:bg-white/10'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Panduan PWA</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-slate-800 space-y-4">
          {/* TAB 1: FORM AKTIVASI TOKO BARU */}
          {activeTab === 'create' && (
            <>
              {activationResult ? (
                /* TAMPILAN SETELAH SUKSES AKTIVASI */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-center">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="font-extrabold text-base text-emerald-950">
                      Toko Berhasil Diaktivasi!
                    </h3>
                    <p className="text-xs text-emerald-700 mt-1">
                      Data toko, akun login, dan partisi cloud Firestore siap digunakan sekarang.
                    </p>
                  </div>

                  {/* KARTU RINCIAN AKUN TOKO */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">ID Toko Unik</span>
                        <p className="text-sm font-black text-emerald-700 tracking-wider">
                          {activationResult.storeCode}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                        <p className="text-xs font-bold text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block">
                          Aktif & Terisolasi
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Nama Toko:</span>
                        <span className="font-bold text-slate-900">{activationResult.storeName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Pemilik Toko:</span>
                        <span className="font-bold text-slate-900">{activationResult.ownerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Nomor WhatsApp:</span>
                        <span className="font-bold text-slate-900">{activationResult.whatsapp}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Alamat Toko:</span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {activationResult.address}
                        </span>
                      </div>
                    </div>

                    {/* Kredensial Login */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Email Login:</span>
                        <span className="font-mono font-bold text-slate-900 selection:bg-emerald-100">
                          {activationResult.ownerEmail}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Kata Sandi:</span>
                        <span className="font-mono font-bold text-emerald-700 selection:bg-emerald-100">
                          {activationResult.initialPassword}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Link Web PWA:</span>
                        <span className="font-mono text-[11px] text-slate-700 truncate max-w-[190px]">
                          {appUrl}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS UNTUK PENJUAL / KONSUMEN */}
                  <div className="space-y-2">
                    {/* 1. Kirim Rincian ke WhatsApp Pemilik */}
                    <button
                      onClick={() => handleSendWhatsApp(activationResult)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Kirim Rincian Akun ke WhatsApp Pemilik</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      {/* 2. Salin Teks Format Lengkap */}
                      <button
                        onClick={() => handleCopyDetails(activationResult)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-600" />
                            <span>Salin Teks Akun</span>
                          </>
                        )}
                      </button>

                      {/* 3. Buka di Chrome Android Langsung */}
                      <a
                        href={appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-600" />
                        <span>Buka Tab Baru</span>
                      </a>
                    </div>

                    {/* 4. Login Langsung ke Toko Baru di HP Ini */}
                    <button
                      onClick={() => handleLoginImmediately(activationResult)}
                      disabled={loggingIntoNewAccount}
                      className="w-full py-2.5 bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-teal-700" />
                      <span>
                        {loggingIntoNewAccount
                          ? 'Masuk ke Toko Baru...'
                          : 'Login ke Toko Baru di HP Ini Sekarang'}
                      </span>
                    </button>

                    {/* Tombol Buat Toko Baru Lagi */}
                    <button
                      onClick={handleResetForm}
                      className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium transition text-center"
                    >
                      + Aktivasi Toko Lainnya
                    </button>
                  </div>
                </div>
              ) : (
                /* FORM ISIAN DATA TOKO BARU */
                <form onSubmit={handleCreateActivation} className="space-y-3.5">
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Aktivasi Toko di Lokasi Konsumen</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Cukup isi 4 data di bawah. Sistem otomatis membuatkan ID Toko unik, akun login, dan mempartisi penyimpanan Firestore secara instan.
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 1. Nama Toko */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      1. Nama Toko / Warung <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Contoh: Warung Berkah Makmur"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* 2. Nama Pemilik */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      2. Nama Pemilik Toko <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Contoh: Pak Budi Santoso"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* 3. Nomor WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      3. Nomor WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="081234567890"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Rincian akun & panduan pasang akan dikirim langsung ke nomor ini.
                    </p>
                  </div>

                  {/* 4. Alamat Toko */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      4. Alamat Toko / Warung <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute top-2.5 left-3.5 pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <textarea
                        required
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Contoh: Jl. Mawar No. 15, RT 02/04, Pasar Rebo, Jakarta Timur"
                        className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 resize-none"
                      />
                    </div>
                  </div>

                  {/* Pengaturan Akun Otomatis vs Kustom */}
                  <div className="pt-1 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setUseCustomCredentials(!useCustomCredentials)}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center justify-between w-full py-1 cursor-pointer"
                    >
                      <span>
                        {useCustomCredentials
                          ? '▼ Sesuaikan Email & Kata Sandi Akun'
                          : '▶ Atur Email / Kata Sandi Sendiri (Opsional)'}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {useCustomCredentials ? 'Kustom' : 'Otomatis'}
                      </span>
                    </button>

                    {!useCustomCredentials ? (
                      <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-800">
                          Sistem akan otomatis membuat akun berikut:
                        </p>
                        <p className="truncate">
                          • Email: <span className="font-mono text-emerald-700">{suggestedEmail}</span>
                        </p>
                        <p>
                          • Kata Sandi: <span className="font-mono text-emerald-700">{suggestedPassword}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2.5 space-y-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Alamat Email Pemilik
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <Mail className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="email"
                              value={customEmail}
                              onChange={(e) => setCustomEmail(e.target.value)}
                              placeholder={suggestedEmail}
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Kata Sandi Pemilik (Min. 6 Karakter)
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="text"
                              value={customPassword}
                              onChange={(e) => setCustomPassword(e.target.value)}
                              placeholder={suggestedPassword}
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tombol Utama: Buat Toko dan Aktivasi */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white font-extrabold rounded-2xl text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{loadingStatus || 'Sedang Mengaktifkan Toko...'}</span>
                        </div>
                      ) : (
                        <>
                          <Key className="w-4 h-4 text-amber-300" />
                          <span>Buat Toko dan Aktivasi</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                      Data toko akan terisolasi secara aman menggunakan Firestore Security Rules.
                    </p>
                  </div>
                </form>
              )}
            </>
          )}

          {/* TAB 2: DAFTAR TOKO TERAKTIVASI */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800">
                  Daftar Toko yang Telah Diaktivasi
                </p>
                <button
                  onClick={loadHistory}
                  disabled={historyLoading}
                  className="p-1 text-emerald-700 hover:text-emerald-900 flex items-center gap-1 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p>Memuat daftar aktivasi...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Belum Ada Toko yang Diaktivasi</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Gunakan tab "Aktivasi Baru" untuk mendaftarkan toko konsumen pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {item.storeCode}
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 leading-tight">
                              {item.storeName}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {item.ownerName} • {item.whatsapp}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                            {item.address}
                          </p>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-xl text-[11px] font-mono text-slate-700 flex items-center justify-between">
                        <span className="truncate">{item.ownerEmail}</span>
                        <span className="text-emerald-700 font-bold shrink-0">
                          {item.initialPassword ? `PIN: ${item.initialPassword}` : 'Aktif'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => handleSendWhatsApp(item)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Send className="w-3 h-3" />
                          <span>Kirim WA</span>
                        </button>

                        <button
                          onClick={() => handleCopyDetails(item)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin Akun</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PANDUAN PWA ANDROID */}
          {activeTab === 'guide' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-950 font-bold">
                <Smartphone className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Petunjuk Pemasangan di HP Android Konsumen</span>
              </div>

              <div className="space-y-3 text-slate-700">
                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Buka di Browser Google Chrome Android</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kirimkan link aplikasi ke WhatsApp konsumen, lalu minta konsumen membuka link tersebut di aplikasi Google Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Tekan Menu Titik Tiga (⋮)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pada pojok kanan atas browser Google Chrome, ketuk ikon titik tiga (⋮).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Pilih "Tambahkan ke Layar Utama"</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pilih opsi "Tambahkan ke Layar Utama" (atau "Install Aplikasi"). Ikon Kasir WarungKu akan otomatis terpasang di menu HP seperti aplikasi APK biasa!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    4
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">Login Sekali, Data Tersimpan Selamanya</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Masukkan email dan kata sandi toko. Toko tidak perlu login berulang-ulang dan data produk, stok, kasir, dan laporan tersimpan aman di cloud.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px]">
                  <strong>Keamanan Data Terjamin:</strong> Setiap toko memiliki partisi database uniknya sendiri. Pemilik toko lain tidak dapat melihat atau mengakses data toko konsumen ini.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">Kasir WarungKu • Multi-Tenant PWA</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
