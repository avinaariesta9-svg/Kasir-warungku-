import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Mail,
  User,
  AlertCircle,
  Copy,
  Check,
  Info,
  Clock,
  Briefcase,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StoreMember, StoreRole } from '../types';
import {
  listenStoreMembers,
  inviteMember,
  updateMemberStatus,
  updateMemberRole,
  removeMember,
} from '../services/storeMemberService';

interface StoreMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreMembersModal: React.FC<StoreMembersModalProps> = ({ isOpen, onClose }) => {
  const { user, store, currentRole, isOwner } = useAuth();

  const [members, setMembers] = useState<StoreMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form input state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<StoreRole>('cashier');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeStoreId = store?.id || user?.uid || '';

  useEffect(() => {
    if (!isOpen || !activeStoreId) return;

    setLoading(true);
    setErrorMsg(null);

    const unsubscribe = listenStoreMembers(
      activeStoreId,
      (data) => {
        setMembers(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening members:', err);
        setErrorMsg('Gagal memuat daftar admin toko.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, activeStoreId]);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Masukkan alamat email yang valid.');
      return;
    }

    if (!isOwner) {
      setErrorMsg('Hanya Pemilik Toko yang berhak mengundang admin baru.');
      return;
    }

    // Periksa apakah sudah ada di daftar
    const exists = members.some((m) => m.email.toLowerCase() === cleanEmail);
    if (exists || cleanEmail === store?.ownerEmail?.toLowerCase() || cleanEmail === user?.email?.toLowerCase()) {
      setErrorMsg('Email tersebut sudah terdaftar sebagai anggota atau pemilik toko.');
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteMember(
        activeStoreId,
        cleanEmail,
        inviteName.trim() || cleanEmail.split('@')[0],
        inviteRole,
        user?.email || 'Pemilik Toko'
      );

      setSuccessMsg(`Berhasil mengundang ${cleanEmail} sebagai ${inviteRole === 'owner' ? 'Pemilik' : 'Admin Kasir'}!`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('cashier');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menambahkan admin toko.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: StoreMember) => {
    if (!isOwner) return;
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';
    const actionLabel = nextStatus === 'active' ? 'mengaktifkan' : 'menonaktifkan';

    if (!window.confirm(`Yakin ingin ${actionLabel} akses admin ${member.email}?`)) {
      return;
    }

    try {
      await updateMemberStatus(activeStoreId, member.id, nextStatus);
      setSuccessMsg(`Status admin ${member.email} berhasil diubah menjadi ${nextStatus === 'active' ? 'Aktif' : 'Nonaktif'}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah status admin.');
    }
  };

  const handleToggleRole = async (member: StoreMember) => {
    if (!isOwner) return;
    const nextRole: StoreRole = member.role === 'owner' ? 'cashier' : 'owner';
    const roleLabel = nextRole === 'owner' ? 'Pemilik' : 'Admin Kasir';

    if (!window.confirm(`Ubah peran ${member.email} menjadi ${roleLabel}?`)) {
      return;
    }

    try {
      await updateMemberRole(activeStoreId, member.id, nextRole);
      setSuccessMsg(`Peran ${member.email} berhasil diubah menjadi ${roleLabel}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah peran admin.');
    }
  };

  const handleRemove = async (member: StoreMember) => {
    if (!isOwner) return;

    if (!window.confirm(`Hapus permanen hak akses admin ${member.email} dari toko ini? Akun tersebut tidak lagi dapat mengakses data kasir.`)) {
      return;
    }

    try {
      await removeMember(activeStoreId, member.id, member.email, member.userId);
      setSuccessMsg(`Akses ${member.email} berhasil dihapus dari toko.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus admin.');
    }
  };

  const handleCopyAppUrl = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const activeCashiers = members.filter((m) => m.role === 'cashier' && m.status === 'active').length;
  const totalStaff = members.length + 1; // +1 untuk pemilik utama

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">Multi-Admin Toko</h3>
                <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  {isOwner ? '👑 Mode Pemilik' : '💼 Mode Kasir'}
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Kelola hak akses & akun admin untuk {store?.storeName || 'WarungKu'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 transition active:scale-95 text-white"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-sm flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
              <p className="text-[11px] text-slate-500 font-medium">Total Tim</p>
              <p className="text-lg font-black text-slate-800">{totalStaff}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5">
              <p className="text-[11px] text-emerald-700 font-medium">Admin Kasir Aktif</p>
              <p className="text-lg font-black text-emerald-700">{activeCashiers}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5">
              <p className="text-[11px] text-amber-700 font-medium">ID Toko (Store ID)</p>
              <p className="text-xs font-mono font-bold text-amber-800 truncate" title={activeStoreId}>
                {store?.storeCode || activeStoreId.slice(0, 8)}
              </p>
            </div>
          </div>

          {/* Form Undang Admin Baru (Khusus Pemilik) */}
          {isOwner ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-2.5">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                Undang Admin / Kasir Baru
              </h4>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Email Akun Kasir <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="kasir1@gmail.com"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Kasir / Panggilan
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Contoh: Budi (Kasir Pagi)"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">Peran:</span>
                    <button
                      type="button"
                      onClick={() => setInviteRole('cashier')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        inviteRole === 'cashier'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      Admin Kasir
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteRole('owner')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        inviteRole === 'owner'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      Pemilik Bersama
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isSubmitting ? 'Mengundang...' : 'Undang Sekarang'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Anda login sebagai <strong>Admin Kasir</strong>. Penambahan dan pengaturan akun admin hanya dapat dilakukan oleh Pemilik Toko.
              </span>
            </div>
          )}

          {/* Daftar Admin & Anggota Toko */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                Daftar Admin & Staf Toko ({totalStaff})
              </h4>
              <span className="text-[10px] text-slate-400">Sinkron Real-time Firebase</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Memuat daftar anggota...</div>
            ) : (
              <div className="space-y-2.5">
                {/* 1. Pemilik Utama Toko (Permanent Card) */}
                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 text-xs truncate">
                          {store?.ownerName || 'Pemilik Warung Utama'}
                        </p>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900">
                          👑 Pemilik Utama
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Aktif
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate font-mono">
                        {store?.ownerEmail || user?.email || 'Akun Utama'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 italic shrink-0">Akun Primer</span>
                </div>

                {/* 2. Daftar Member Lainnya */}
                {members.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    Belum ada admin tambahan yang diundang. Masukkan email kasir Anda di atas untuk mulai berkolaborasi.
                  </div>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className={`p-3.5 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        member.status === 'active'
                          ? 'bg-white border-slate-200 hover:border-slate-300'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                            member.role === 'owner'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {member.role === 'owner' ? (
                            <Crown className="w-4 h-4" />
                          ) : (
                            <Briefcase className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-900 text-xs truncate">
                              {member.name || member.email.split('@')[0]}
                            </p>
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                member.role === 'owner'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}
                            >
                              {member.role === 'owner' ? '👑 Pemilik' : '💼 Admin Kasir'}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                member.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {member.status === 'active' ? '🟢 Aktif' : '🔴 Nonaktif'}
                            </span>
                            {member.userId ? (
                              <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-medium">
                                <Check className="w-3 h-3" /> Tertaut
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 flex items-center gap-0.5 font-medium">
                                <Clock className="w-3 h-3" /> Menunggu Login
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate font-mono">{member.email}</p>
                        </div>
                      </div>

                      {/* Action buttons (Khusus Pemilik) */}
                      {isOwner && (
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRole(member)}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px] font-semibold transition"
                            title="Ubah peran (Pemilik / Kasir)"
                          >
                            {member.role === 'owner' ? 'Jadikan Kasir' : 'Jadikan Pemilik'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(member)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                              member.status === 'active'
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {member.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemove(member)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                            title="Hapus akses admin"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Panduan Cara Bergabung Kasir */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                Cara Kasir / Staf Bergabung:
              </span>
              <button
                type="button"
                onClick={handleCopyAppUrl}
                className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Link Tersalin!' : 'Salin Link Aplikasi'}
              </button>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-slate-500">
              <li>Berikan link aplikasi Kasir WarungKu ke HP / tablet / komputer kasir.</li>
              <li>Kasir mendaftar atau login menggunakan email yang sama persis dengan yang diundang di atas.</li>
              <li>Sistem akan otomatis mengidentifikasi toko Anda dan memuat produk, stok, dan kasir secara langsung.</li>
              <li>Semua transaksi dan pengurangan stok tersinkronisasi otomatis antar perangkat secara real-time.</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            {isOwner ? 'Perubahan disimpan otomatis di Firebase Firestore.' : 'Mode tampilan (Read-only).'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
