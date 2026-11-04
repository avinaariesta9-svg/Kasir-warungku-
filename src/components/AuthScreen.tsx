import React, { useState, useEffect } from 'react';
import {
  Store,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Shield,
  Code,
  Key,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthScreen: React.FC = () => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State Login Khusus Developer
  const [showDevModal, setShowDevModal] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      const path = window.location.pathname;
      const search = window.location.search;
      return (
        hostname.includes('warungku-admin') ||
        hostname.startsWith('admin.') ||
        path === '/developer' ||
        search.includes('view=developer') ||
        window.location.hash === '#/developer'
      );
    }
    return false;
  });
  const [devId, setDevId] = useState('');
  const [devSecretPassword, setDevSecretPassword] = useState('');
  const [showDevPassword, setShowDevPassword] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [devErrorMessage, setDevErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Harap isi email dan kata sandi.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await registerWithEmail(email, password, storeName);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || '';
      if (errCode === 'auth/user-not-found' || errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
        setErrorMessage('Email atau kata sandi tidak cocok.');
      } else if (errCode === 'auth/email-already-in-use') {
        setErrorMessage('Email sudah terdaftar. Silakan gunakan fitur Masuk.');
      } else if (errCode === 'auth/weak-password') {
        setErrorMessage('Kata sandi terlalu pendek/lemah. Gunakan minimal 6 karakter.');
      } else if (errCode === 'auth/invalid-email') {
        setErrorMessage('Format alamat email tidak valid.');
      } else if (errCode === 'auth/operation-not-allowed') {
        setErrorMessage('Login email belum diaktifkan di Firebase Console. Anda dapat masuk cepat menggunakan tombol Google di bawah.');
      } else {
        setErrorMessage((err as Error).message || 'Terjadi kendala saat login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeveloperLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevErrorMessage(null);

    const cleanDevId = devId.trim();
    if (!cleanDevId || !devSecretPassword) {
      setDevErrorMessage('Harap isi Developer ID dan Password Rahasia.');
      return;
    }

    // Resolusi Developer ID ke akun Firebase resmi tanpa menyimpan password di frontend
    let targetEmail = '';
    const upperId = cleanDevId.toUpperCase();
    if (
      upperId === 'DEV-WARUNGKU' ||
      upperId === 'ADMIN-WARUNGKU' ||
      upperId === 'DEVELOPER' ||
      upperId === 'ADMIN' ||
      cleanDevId.toLowerCase() === 'avinaariesta9@gmail.com'
    ) {
      targetEmail = 'avinaariesta9@gmail.com';
    } else if (cleanDevId.includes('@')) {
      targetEmail = cleanDevId.toLowerCase();
    } else {
      setDevErrorMessage('Developer ID atau Password tidak cocok.');
      return;
    }

    if (targetEmail !== 'avinaariesta9@gmail.com') {
      setDevErrorMessage('Akses ditolak. Akun tidak memiliki hak akses Developer.');
      return;
    }

    setDevLoading(true);
    try {
      // Verifikasi kredensial developer langsung ke backend Firebase Authentication
      await loginWithEmail(targetEmail, devSecretPassword);
      setShowDevModal(false);
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || '';
      if (errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential') {
        setDevErrorMessage('Password Rahasia Developer salah.');
      } else if (errCode === 'auth/user-not-found') {
        setDevErrorMessage('Akun Developer tidak ditemukan.');
      } else {
        setDevErrorMessage((err as Error).message || 'Gagal login developer.');
      }
    } finally {
      setDevLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code || '';
      if (errCode === 'auth/popup-closed-by-user') {
        setErrorMessage('Jendela login Google ditutup sebelum selesai.');
      } else {
        setErrorMessage((err as Error).message || 'Gagal masuk dengan Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center px-4 py-8 font-sans relative">
      {/* Icon Kecil Kode </> Developer Permanen di Pojok Kanan Atas */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40">
        <button
          type="button"
          onClick={() => {
            setDevErrorMessage(null);
            setShowDevModal(true);
          }}
          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-200 border border-amber-400/80 shadow-lg active:scale-95 transition cursor-pointer flex items-center justify-center"
          title="Akses Portal Developer (</>)"
          aria-label="Akses Developer"
        >
          <Code className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200/80">
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white text-center relative">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Store className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">KASIR WARUNGKU</h1>
          <p className="text-emerald-100 text-xs mt-1">Aplikasi Kasir Warung HP Android</p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[11px] font-medium text-emerald-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Kasir PWA • Data Toko Terisolasi</span>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold transition cursor-pointer ${
              !isRegister
                ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk Toko
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold transition cursor-pointer ${
              isRegister
                ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Mandiri
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {!isRegister && (
            <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs">
              <p className="font-bold">Akun Toko Diaktivasi Penjual?</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Masukkan email dan kata sandi yang dikirimkan penjual ke WhatsApp Anda.
              </p>
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Warung / Toko
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Contoh: Warung Barokah"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="warung@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Buat Akun Warung' : 'Masuk ke Kasir'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              atau
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google 1-Click Sign-In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-medium rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Masuk Cepat dengan Google</span>
          </button>
        </div>

        {/* Footer Note with Dedicated Developer Login trigger */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 text-center space-y-2">
          <p className="text-[11px] text-slate-500">
            Akses data warung aman dan terisolasi khusus untuk akun Anda.
          </p>
          <button
            type="button"
            onClick={() => {
              setDevErrorMessage(null);
              setShowDevModal(true);
            }}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-black inline-flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm cursor-pointer border border-slate-800"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Login Khusus Developer (Developer ID & Sandi)</span>
          </button>
        </div>
      </div>

      {/* MODAL KHUSUS LOGIN DEVELOPER */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowDevModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Modal */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                PORTAL LOGIN DEVELOPER
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Otorisasi Keamanan Tingkat Tinggi Kasir WarungKu
              </p>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/20">
                <span>Firebase Authentication & ABAC Rules</span>
              </div>
            </div>

            {devErrorMessage && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{devErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleDeveloperLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Developer ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={devId}
                    onChange={(e) => setDevId(e.target.value)}
                    placeholder="ID Developer"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Hanya pemilik aplikasi berwenang yang dapat mengakses.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password Rahasia Developer
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showDevPassword ? 'text' : 'password'}
                    required
                    value={devSecretPassword}
                    onChange={(e) => setDevSecretPassword(e.target.value)}
                    placeholder="Masukkan sandi rahasia"
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDevPassword(!showDevPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showDevPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-[11px] text-slate-400 leading-relaxed">
                🔒 <strong>Keamanan:</strong> Sandi rahasia diverifikasi secara aman langsung ke Firebase Authentication di cloud tanpa pernah disimpan di kode frontend.
              </div>

              <button
                type="submit"
                disabled={devLoading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/50 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {devLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Masuk ke Dashboard Developer</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

