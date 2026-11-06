import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Store,
  User,
  Clock,
  Check,
  CheckCheck,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  AlertCircle,
  Inbox,
  ChevronRight,
} from 'lucide-react';
import { ChatConversation, ChatMessage } from '../types';
import { ChatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

export const DeveloperChatView: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen all store conversations in real time
  useEffect(() => {
    setLoading(true);
    const unsubscribe = ChatService.listenAllConversations(
      (list) => {
        setConversations(list);
        setLoading(false);
        // Otomatis pilih toko pertama jika belum ada yang dipilih dan ada list
        if (!selectedStoreId && list.length > 0) {
          setSelectedStoreId(list[0].storeId);
        }
      },
      (err) => {
        console.error('Error memuat percakapan developer:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedStoreId]);

  // Selected conversation object
  const currentConv = conversations.find((c) => c.storeId === selectedStoreId) || null;

  // Listen messages for selected store
  useEffect(() => {
    if (!selectedStoreId) {
      setMessages([]);
      return;
    }

    // Mark as read by developer
    ChatService.markAsRead(selectedStoreId, 'developer').catch(() => {});

    const unsubscribe = ChatService.listenToMessages(
      selectedStoreId,
      (newMsgs) => {
        setMessages(newMsgs);
        ChatService.markAsRead(selectedStoreId, 'developer').catch(() => {});
      },
      (err) => {
        console.error('Error memuat pesan toko:', err);
      }
    );

    return () => unsubscribe();
  }, [selectedStoreId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (presetText?: string) => {
    const text = (presetText || inputText).trim();
    if (!text || sending || !currentConv) return;

    setSending(true);
    try {
      await ChatService.sendMessage({
        storeId: currentConv.storeId,
        storeName: currentConv.storeName,
        ownerName: currentConv.ownerName,
        ownerEmail: currentConv.ownerEmail,
        whatsapp: currentConv.whatsapp,
        senderRole: 'developer',
        senderId: user?.uid || 'developer-admin',
        senderName: 'Developer Kasir WarungKu',
        senderEmail: user?.email || 'avinaariesta9@gmail.com',
        text,
      });

      if (!presetText) {
        setInputText('');
      }
      ChatService.playNotificationChime();
    } catch (err) {
      alert('Gagal mengirim balasan: ' + (err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.storeName.toLowerCase().includes(q) ||
      c.ownerName.toLowerCase().includes(q) ||
      c.ownerEmail.toLowerCase().includes(q) ||
      c.storeId.toLowerCase().includes(q)
    );
  });

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row h-[750px]">
      {/* Kolom Kiri: Daftar Percakapan Toko */}
      <div className="w-full md:w-80 md:border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
        {/* Search & Header */}
        <div className="p-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Daftar Chat Pelanggan</span>
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
              {conversations.length} Toko
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari toko, nama pemilik, email..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 border border-transparent focus:border-emerald-500 focus:bg-white transition focus:outline-hidden"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin mb-2" />
              <span>Memuat daftar obrolan...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
              <Inbox className="w-8 h-8 text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">Belum Ada Pesan Masuk</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Pesan dari pemilik warung yang menggunakan fitur "Chat ke Developer" akan muncul di sini.
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.storeId === selectedStoreId;
              const hasUnread = c.unreadByDeveloper > 0;

              return (
                <button
                  key={c.storeId}
                  onClick={() => setSelectedStoreId(c.storeId)}
                  className={`w-full p-3.5 text-left transition flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                      : 'hover:bg-slate-100/70'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 font-black text-xs">
                    {c.storeName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-extrabold text-xs text-slate-900 truncate">
                        {c.storeName}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {c.ownerName} • {c.ownerEmail}
                    </p>
                    <p className={`text-[11px] mt-0.5 truncate ${hasUnread ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                      {c.lastSenderRole === 'developer' && <span className="text-emerald-700 font-bold mr-1">Anda:</span>}
                      {c.lastMessage || '(Percakapan dimulai)'}
                    </p>
                  </div>
                  {hasUnread && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                      {c.unreadByDeveloper}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Kolom Kanan: Area Percakapan Aktif */}
      <div className="flex-1 flex flex-col bg-slate-50/40">
        {currentConv ? (
          <>
            {/* Top Store Info Bar */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-black">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {currentConv.storeName}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{currentConv.ownerName}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-600">{currentConv.ownerEmail}</span>
                    {currentConv.whatsapp && (
                      <>
                        <span>•</span>
                        <a
                          href={`https://wa.me/${currentConv.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          +{currentConv.whatsapp}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">
                  Store ID: {currentConv.storeId}
                </span>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-100/60">
              {messages.map((msg) => {
                const isDev = msg.senderRole === 'developer';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isDev ? 'items-end' : 'items-start'} gap-1`}
                  >
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isDev
                          ? 'bg-slate-900 text-white rounded-br-xs shadow-md'
                          : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold opacity-70">
                        <span>{isDev ? '👑 DEVELOPER (ANDA)' : `PELANGGAN (${msg.senderName})`}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                    <div className="flex items-center gap-1 px-1 text-[10px] text-slate-400 font-mono">
                      <span>{formatTime(msg.createdAt)}</span>
                      {isDev && (
                        <span>
                          {msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Templates for Developer */}
            <div className="px-4 py-2 bg-white border-t border-slate-200 overflow-x-auto no-scrollbar flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0 mr-1">
                Template Balasan:
              </span>
              <button
                onClick={() => handleSendReply('Halo Kak! Terima kasih telah menghubungi Developer Kasir WarungKu. Ada kendala yang bisa kami bantu?')}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] whitespace-nowrap transition cursor-pointer"
              >
                👋 Sambutan Bantuan
              </button>
              <button
                onClick={() => handleSendReply('Lisensi paket Selamanya untuk warung Anda sudah kami aktifkan. Silakan muat ulang aplikasi untuk mulai bertransaksi.')}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] whitespace-nowrap transition cursor-pointer"
              >
                ✨ Konfirmasi Lisensi Aktif
              </button>
              <button
                onClick={() => handleSendReply('Untuk printer bluetooth thermal, pastikan printer menyala dalam mode pairing dan izin Bluetooth pada browser/HP telah diizinkan.')}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] whitespace-nowrap transition cursor-pointer"
              >
                🖨️ Panduan Printer Bluetooth
              </button>
            </div>

            {/* Reply Input Bar */}
            <div className="p-3.5 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Ketik balasan resmi Developer untuk toko "${currentConv.storeName}"...`}
                  className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer"
                >
                  {sending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Balasan</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-extrabold text-sm text-slate-700">Pilih Toko untuk Membuka Obrolan</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Klik salah satu toko di daftar sebelah kiri untuk melihat pesan masuk dan membalas secara real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
