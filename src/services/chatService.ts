import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  increment,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ChatMessage, ChatConversation } from '../types';

export class ChatService {
  /**
   * Mainkan suara lembut monokrom saat ada pesan balasan developer masuk
   */
  static playNotificationChime() {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {
      // Ignore audio autoplay restrictions
    }
  }

  /**
   * Mengambil percakapan real-time untuk sebuah toko (Sisi Pelanggan & Developer)
   */
  static listenToConversation(
    storeId: string,
    onUpdate: (conv: ChatConversation | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    const docRef = doc(db, 'chats', storeId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onUpdate(null);
          return;
        }
        const data = snapshot.data();
        onUpdate({
          id: snapshot.id,
          storeId: data.storeId || snapshot.id,
          storeName: data.storeName || 'Toko',
          ownerName: data.ownerName || 'Pemilik',
          ownerEmail: data.ownerEmail || '',
          whatsapp: data.whatsapp || '',
          lastMessage: data.lastMessage || '',
          lastMessageAt: data.lastMessageAt || '',
          lastSenderRole: data.lastSenderRole || 'customer',
          unreadByCustomer: Number(data.unreadByCustomer) || 0,
          unreadByDeveloper: Number(data.unreadByDeveloper) || 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `chats/${storeId}`);
        onError?.(error as Error);
      }
    );
  }

  /**
   * Mendengarkan daftar pesan real-time dalam satu toko
   */
  static listenToMessages(
    storeId: string,
    onUpdate: (messages: ChatMessage[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const messagesRef = collection(db, 'chats', storeId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          msgs.push({
            id: d.id,
            storeId: data.storeId || storeId,
            senderRole: data.senderRole || 'customer',
            senderId: data.senderId || '',
            senderName: data.senderName || '',
            senderEmail: data.senderEmail || '',
            text: data.text || '',
            createdAt: data.createdAt || new Date().toISOString(),
            read: Boolean(data.read),
          });
        });
        onUpdate(msgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `chats/${storeId}/messages`);
        onError?.(error as Error);
      }
    );
  }

  /**
   * Khusus Developer: Mendengarkan seluruh percakapan toko aktif
   */
  static listenAllConversations(
    onUpdate: (conversations: ChatConversation[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: ChatConversation[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            storeId: data.storeId || d.id,
            storeName: data.storeName || 'Toko',
            ownerName: data.ownerName || 'Pemilik Warung',
            ownerEmail: data.ownerEmail || '',
            whatsapp: data.whatsapp || '',
            lastMessage: data.lastMessage || '',
            lastMessageAt: data.lastMessageAt || '',
            lastSenderRole: data.lastSenderRole || 'customer',
            unreadByCustomer: Number(data.unreadByCustomer) || 0,
            unreadByDeveloper: Number(data.unreadByDeveloper) || 0,
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats');
        onError?.(error as Error);
      }
    );
  }

  /**
   * Mengirim pesan chat baru (baik dari pelanggan maupun developer)
   */
  static async sendMessage(params: {
    storeId: string;
    storeName: string;
    ownerName: string;
    ownerEmail: string;
    whatsapp?: string;
    senderRole: 'customer' | 'developer';
    senderId: string;
    senderName: string;
    senderEmail: string;
    text: string;
  }): Promise<void> {
    const cleanText = params.text.trim();
    if (!cleanText) return;
    if (cleanText.length > 2000) {
      throw new Error('Pesan maksimal 2000 karakter.');
    }

    const now = new Date().toISOString();
    const chatDocRef = doc(db, 'chats', params.storeId);
    const messagesColRef = collection(db, 'chats', params.storeId, 'messages');

    try {
      // 1. Simpan pesan ke subkoleksi messages
      await addDoc(messagesColRef, {
        storeId: params.storeId,
        senderRole: params.senderRole,
        senderId: params.senderId,
        senderName: params.senderName,
        senderEmail: params.senderEmail,
        text: cleanText,
        createdAt: now,
        read: false,
      });

      // 2. Perbarui dokumen induk percakapan toko
      const updatePayload: Record<string, unknown> = {
        storeId: params.storeId,
        storeName: params.storeName,
        ownerName: params.ownerName,
        ownerEmail: params.ownerEmail,
        whatsapp: params.whatsapp || '',
        lastMessage: cleanText,
        lastMessageAt: now,
        lastSenderRole: params.senderRole,
        updatedAt: now,
      };

      if (params.senderRole === 'customer') {
        updatePayload.unreadByDeveloper = increment(1);
        updatePayload.unreadByCustomer = 0;
      } else {
        updatePayload.unreadByCustomer = increment(1);
        updatePayload.unreadByDeveloper = 0;
      }

      await setDoc(chatDocRef, updatePayload, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${params.storeId}`);
    }
  }

  /**
   * Tandai pesan telah dibaca (Reset counter unread)
   */
  static async markAsRead(storeId: string, role: 'customer' | 'developer'): Promise<void> {
    const chatDocRef = doc(db, 'chats', storeId);
    try {
      const snap = await getDoc(chatDocRef);
      if (!snap.exists()) return;

      const updates: Record<string, unknown> = {};
      if (role === 'customer') {
        updates.unreadByCustomer = 0;
      } else {
        updates.unreadByDeveloper = 0;
      }
      await updateDoc(chatDocRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chats/${storeId}`);
    }
  }
}
