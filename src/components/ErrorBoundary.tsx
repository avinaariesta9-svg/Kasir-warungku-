import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Terjadi kesalahan tidak terduga.';
      const isAuthDomainError =
        errorMsg.includes('auth/unauthorized-domain') ||
        errorMsg.includes('unauthorized domain');
      const isConfigError =
        errorMsg.includes('firebase') || errorMsg.includes('apiKey');

      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-4">
              {isAuthDomainError ? (
                <ShieldAlert className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>

            <h2 className="text-xl font-black text-white">
              {isAuthDomainError
                ? 'Domain Perlu Diizinkan'
                : 'Terjadi Kendala Memuat Aplikasi'}
            </h2>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {isAuthDomainError
                ? 'Domain Vercel Anda belum ditambahkan ke daftar Authorized Domains di Firebase Authentication.'
                : 'Aplikasi mengalami kendala saat memuat komponen atau konfigurasi sistem.'}
            </p>

            {isAuthDomainError && typeof window !== 'undefined' && (
              <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-left text-xs text-slate-300">
                <p className="font-bold text-amber-400 mb-1">Langkah Solusi:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                  <li>Buka <strong>Firebase Console</strong> proyek Anda.</li>
                  <li>Pilih <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized Domains</strong>.</li>
                  <li>Tambahkan domain ini: <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">{window.location.hostname}</code></li>
                </ol>
              </div>
            )}

            <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-left">
              <p className="text-[11px] text-slate-400 font-mono break-all line-clamp-3">
                {errorMsg}
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Halaman Utama</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
