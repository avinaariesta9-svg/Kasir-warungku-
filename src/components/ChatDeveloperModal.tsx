import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  ShieldCheck,
  Check,
  CheckCheck,
  Headphones,
  Store,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Clock,
  Printer,
  Key,
} from 'lucide-react';
import { ChatMessage, StoreProfile } from '../types';
import { ChatService } from '../services/chatService';
import { User } from 'firebase/auth';

interface ChatDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreProfile | null;
  user: User | null;
}

export const ChatDeveloperModal: React.FC<ChatDeveloperModalProps> = ({
  isOpen,
  onClose,
  store,
  user,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  const activeStoreId = store?.id || user?.uid || '';
  const storeName = store?.storeName || 'Toko Kasir WarungKu';
  const ownerName = store?.ownerName || user?.displayName || user?.email?.split('@')[0] || 'Pemilik Toko';
  const ownerEmail = user?.email || store?.ownerEmail || '';

  // Listen real-time messages
  useEffect(() => {
    if (!isOpen || !activeStoreId) return;

    // Reset unread count for customer
    ChatService.markAsRead(activeStoreId, 'customer').catch(() => {});

    const unsubscribe = ChatService.listenToMessages(
      activeStoreId,
      (newMsgs) => {
        // Bunyikan chime jika ada pesan baru dari developer masuk
        if (
          prevMessagesCountRef.current > 0 &&
          newMsgs.length > prevMessagesCountRef.current
        ) {
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.senderRole === 'developer') {
            ChatService.playNotificationChime();
          }
        }
        prevMessagesCountRef.current = newMsgs.length;
        setMessages(newMsgs);

        // Mark as read immediately when user views it
        ChatService.markAsRead(activeStoreId, 'customer').catch(() => {});
      },
      (err) => {
        console.error('Error memuat chat:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, activeStoreId]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending || !activeStoreId) return;

    // Keamanan: Cek apakah ada kata sandi atau kredensial sensitif
    const lower = text.toLowerCase();
    if (lower.includes('password') && (lower.includes('sandi') || lower.includes('1234') || lower.includes('rahasia'))) {
      if (!window.confirm('Peringatan Keamanan: Jangan mengirimkan kata sandi atau password akun demi keamanan Anda. Lanjutkan mengirim?')) {
        return;
      }
    }

    setSending(true);
    setErrorMsg(null);
    try {
      await ChatService.sendMessage({
        storeId: activeStoreId,
        storeName,
        ownerName,
        ownerEmail,
        whatsapp: store?.whatsapp || '',
        senderRole: 'customer',
        senderId: user?.uid || activeStoreId,
        senderName: ownerName,
        senderEmail: ownerEmail,
        text,
      });

      if (!textToSend) {
        setInputText('');
      }
      ChatService.playNotificationChime();
    } catch (err) {
      setErrorMsg((err as Error).message || 'Gagal mengirim pesan.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans animate-in fade-in">
      {/* Container Monokrom Hitam-Putih */}
      <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col h-[92vh] sm:h-[640px] overflow-hidden text-neutral-100">
        
        {/* Header Monokrom Hitam-Putih */}
        <div className="px-4 py-3.5 bg-black border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-black shadow-inner">
              <Headphones className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Chat ke Developer
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-neutral-800 text-[10px] font-mono text-neutral-300 border border-neutral-700">
                  Resmi
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Terhubung Real-Time ke Tim Pengembang</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer border border-neutral-800"
            aria-label="Tutup Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Identitas Toko Terhubung Otomatis */}
        <div className="px-4 py-2 bg-neutral-900/90 border-b border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-300 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Store className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="font-bold text-white truncate">{storeName}</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-400 truncate">{ownerName}</span>
          </div>
          <span className="text-[10px] bg-neutral-800 px-2 py-0.5 rounded-md font-mono text-neutral-300 border border-neutral-700 shrink-0 ml-2">
            ID: {activeStoreId.slice(0, 8)}...
          </span>
        </div>

        {/* Area Pesan Chat Real-Time */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-neutral-950">
          {/* Pesan Sambutan Otomatis Developer */}
          <div className="flex items-start gap-2.5 max-w-[88%]">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shrink-0 font-black text-xs shadow-xs mt-1">
              DEV
            </div>
            <div className="bg-white text-neutral-950 border border-neutral-300 p-3.5 rounded-2xl rounded-tl-xs shadow-md space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-1">
                <span className="font-extrabold text-[11px] text-neutral-900 uppercase tracking-wider flex items-center gap-1">
                  <span>Tim Developer Kasir WarungKu</span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">Bantuan Resmi</span>
              </div>
              <p className="leading-relaxed">
                Halo <strong>{ownerName}</strong> dari <strong>{storeName}</strong>! Silakan sampaikan pertanyaan, bantuan penggunaan, kendala printer, atau saran untuk aplikasi Kasir WarungKu.
              </p>
              <div className="pt-1 flex items-center gap-1 text-[10px] text-neutral-500 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
                <span>Pesan terenkripsi & tersambung langsung ke Developer.</span>
              </div>
            </div>
          </div>

          {/* Render List Pesan */}
          {messages.map((msg) => {
            const isMe = msg.senderRole === 'customer';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-neutral-800 text-white rounded-br-xs border border-neutral-700'
                      : 'bg-white text-neutral-950 rounded-tl-xs border border-neutral-300 shadow-md'
                  }`}
                >
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-neutral-200 text-[10px] font-black text-neutral-900">
                      <span className="w-1.5 h-1.5 rounded-full bg-black" />
                      <span>BALASAN DEVELOPER</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                <div className="flex items-center gap-1 px-1 text-[10px] text-neutral-500 font-mono">
                  <span>{formatTime(msg.createdAt)}</span>
                  {isMe && (
                    <span>
                      {msg.read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-neutral-300 inline" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-neutral-500 inline" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Template Pertanyaan Cepat (Monokrom) */}
        {messages.length === 0 && (
          <div className="px-4 py-2 bg-neutral-900/60 border-t border-neutral-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-neutral-400 font-bold uppercase shrink-0 mr-1">
              Cepat:
            </span>
            <button
              onClick={() => handleSendMessage('Halo Developer, saya butuh panduan cara menyambungkan printer bluetooth thermal.')}
              className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1"
            >
              <Printer className="w-3 h-3 text-neutral-400" />
              <span>Bantuan Printer Bluetooth</span>
            </button>
            <button
              onClick={() => handleSendMessage('Halo Developer, bagaimana cara mengonfirmasi aktivasi lisensi Selamanya untuk toko saya?')}
              className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1"
            >
              <Key className="w-3 h-3 text-neutral-400" />
              <span>Konfirmasi Lisensi Toko</span>
            </button>
            <button
              onClick={() => handleSendMessage('Halo Developer, saya ingin memberikan saran fitur baru untuk Kasir WarungKu.')}
              className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] whitespace-nowrap transition cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-neutral-400" />
              <span>Usul Fitur Baru</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="px-4 py-2 bg-neutral-900 border-t border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Form Monokrom Hitam-Putih */}
        <div className="p-3 bg-black border-t border-neutral-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan Anda ke Developer (Enter untuk kirim)..."
                rows={1}
                maxLength={2000}
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-2xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-white transition resize-none max-h-24 leading-relaxed"
              />
              <div className="absolute right-2.5 bottom-2 text-[9px] text-neutral-500 font-mono pointer-events-none">
                {inputText.length > 0 && `${inputText.length}/2000`}
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-3 rounded-2xl bg-white hover:bg-neutral-200 active:scale-95 text-black font-black transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md shrink-0 flex items-center justify-center"
              title="Kirim Pesan"
              aria-label="Kirim Pesan"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </form>

          <p className="text-[10px] text-neutral-500 text-center mt-2 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-neutral-400" />
            <span>Pesan aman, terenkripsi & khusus hanya dapat dibaca oleh Anda dan Developer.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
