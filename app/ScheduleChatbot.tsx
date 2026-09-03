'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  History,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSessionSummary {
  id: string;
  title: string;
  updated_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Palet mengikuti brand RESPONKU KRS: biru utama, latar terang, teks gelap
const INK = '#111827';
const PAPER = '#F7F8FC';
const LINE = '#E4E7EF';
const ACCENT = '#2F5FE0';
const ACCENT_DARK = '#1E46C2';
const MUTED = '#6B7280';

const GREETING: ChatMessage = {
  role: 'assistant',
  content:
    'Halo! Santai aja, aku siap bantu kamu ngecek jadwal kuliah, cari tahu kalau ada jam yang bentrok, atau bantu susun KRS biar makin gampang. Ada yang mau ditanyain?',
};

function deriveTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'Percakapan baru';
  const clean = firstUser.content.trim().replace(/\s+/g, ' ');
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function ScheduleChatbot({ context }: { context: unknown }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // --- Riwayat percakapan (sidebar ala ChatGPT) ---
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const fetchSessions = async (userId: string) => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (data) setSessions(data as ChatSessionSummary[]);
  };

  // Setiap kali komponen dimuat (refresh), selalu mulai chat BARU.
  // Riwayat sebelumnya tetap tersimpan dan bisa dibuka lewat tombol History.
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchSessions(user.id);
      }
    }
    init();
  }, []);

  // Simpan (buat baru / update) sesi chat saat ini ke Supabase
  const saveHistoryToSupabase = async (updatedMessages: ChatMessage[]) => {
    if (!currentUserId) return;
    try {
      const existingId = currentSessionIdRef.current;
      if (!existingId) {
        // Sesi baru: buat 1 baris baru, judul diambil dari pesan pertama user
        const newId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        currentSessionIdRef.current = newId;
        setCurrentSessionId(newId);
        await supabase.from('chat_sessions').insert({
          id: newId,
          user_id: currentUserId,
          title: deriveTitle(updatedMessages),
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        });
      } else {
        await supabase
          .from('chat_sessions')
          .update({
            messages: updatedMessages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingId);
      }
      fetchSessions(currentUserId);
    } catch (err) {
      console.warn('Gagal menyimpan riwayat chat:', err);
    }
  };

  const startNewChat = () => {
    setMessages([GREETING]);
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setInput('');
    setErrorNotice('');
    setShowHistory(false);
  };

  const openSession = async (sessionId: string) => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('messages')
      .eq('id', sessionId)
      .single();
    if (data?.messages && Array.isArray(data.messages)) {
      setMessages(data.messages);
      setCurrentSessionId(sessionId);
      currentSessionIdRef.current = sessionId;
      setShowHistory(false);
      setErrorNotice('');
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('chat_sessions').delete().eq('id', sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionIdRef.current === sessionId) {
      startNewChat();
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // Posisi awal tombol (bottom-right: x = jarak dari kanan, y = jarak dari bawah)
  const [position, setPosition] = useState({ x: 20, y: 90 });
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartClient = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const chatbotRef = useRef<HTMLDivElement>(null);

  // Tutup otomatis jika user klik di luar area chatbot
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chatbotRef.current && !chatbotRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // --- Logika Dragging ---
  const handleStart = (clientX: number, clientY: number) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStartClient.current = { x: clientX, y: clientY };

    dragOffset.current = {
      x: clientX - (window.innerWidth - positionRef.current.x),
      y: clientY - (window.innerHeight - positionRef.current.y),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging.current) return;

      if (
        Math.abs(clientX - dragStartClient.current.x) > 3 ||
        Math.abs(clientY - dragStartClient.current.y) > 3
      ) {
        hasMoved.current = true;
      }

      const newX = window.innerWidth - clientX + dragOffset.current.x;
      const newY = window.innerHeight - clientY + dragOffset.current.y;

      const boundedX = Math.max(10, Math.min(window.innerWidth - 65, newX));
      const boundedY = Math.max(10, Math.min(window.innerHeight - 65, newY));

      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleEnd = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  const handleClickButton = () => {
    if (!hasMoved.current) {
      setIsOpen((v) => !v);
    }
  };

  // --- Efek mengetik ---
  const startTypingEffect = (fullText: string, updatedMessagesWithReply: ChatMessage[]) => {
    setMessages(updatedMessagesWithReply);
    saveHistoryToSupabase(updatedMessagesWithReply);

    const totalDurationMs = 500;
    const tickMs = 20;
    const totalTicks = Math.max(1, Math.round(totalDurationMs / tickMs));
    const chunkSize = Math.max(1, Math.ceil(fullText.length / totalTicks));

    let index = 0;
    const interval = setInterval(() => {
      index += chunkSize;
      const currentText = fullText.slice(0, index);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: currentText };
        return updated;
      });

      if (index >= fullText.length) {
        clearInterval(interval);
        setIsSending(false);
        saveHistoryToSupabase(updatedMessagesWithReply);
      }
    }, tickMs);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);
    setErrorNotice('');

    // Simpan interaksi user ke database langsung
    saveHistoryToSupabase(nextMessages);

    try {
      const now = new Date();
      const nowFormatted = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const timeFormatted = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          context,
          userId: currentUserId,
          now: {
            iso: now.toISOString(),
            formatted: `${nowFormatted}, pukul ${timeFormatted}`,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Duh, lagi ada kendala nih pas ngobrol sama asistennya.');

      const fullReply = data.reply || 'Maaf ya, aku kurang nangkap maksudnya. Coba ulangi pertanyaannya ya!';
      const finalMessages = [...nextMessages, { role: 'assistant' as const, content: fullReply }];
      startTypingEffect(fullReply, finalMessages);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Terjadi kendala saat menghubungi asisten.');
      setIsSending(false);
    }
  };

  return (
    <div ref={chatbotRef}>
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleClickButton}
        style={{
          position: 'fixed',
          right: `${position.x}px`,
          bottom: `${position.y}px`,
          zIndex: 50,
          touchAction: 'none',
          backgroundColor: ACCENT,
          color: '#FFFFFF',
        }}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-grab active:cursor-grabbing select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label="Geser atau buka asisten jadwal"
        title="Tahan dan geser untuk memindahkan tombol"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </div>

      {isOpen && (
        <div
          style={{ backgroundColor: PAPER, borderColor: LINE }}
          className="fixed z-50 border shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150
          inset-x-0 bottom-0 w-full h-[55vh] max-h-[80vh] rounded-t-2xl slide-in-from-bottom-6
          sm:inset-auto sm:right-5 sm:bottom-20 sm:w-[24rem] sm:max-w-[92vw] sm:h-[32rem] sm:max-h-[80vh] sm:rounded-xl sm:slide-in-from-bottom-0"
        >
          <div style={{ backgroundColor: ACCENT }} className="h-[3px] w-full flex-shrink-0" />

          <div style={{ borderColor: LINE }} className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
            <p style={{ color: INK }} className="text-sm font-semibold">
              {showHistory ? 'Riwayat percakapan' : 'Jadwal & rencana studi'}
            </p>
            <div className="flex items-center gap-1">
              {!showHistory && (
                <button
                  onClick={startNewChat}
                  style={{ color: INK }}
                  className="opacity-60 hover:opacity-100 cursor-pointer p-1"
                  aria-label="Mulai chat baru"
                  title="Chat baru"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setShowHistory((v) => !v)}
                style={{ color: showHistory ? ACCENT : INK }}
                className="opacity-60 hover:opacity-100 cursor-pointer p-1"
                aria-label="Buka riwayat percakapan"
                title="Riwayat percakapan"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ color: INK }}
                className="opacity-50 hover:opacity-100 cursor-pointer p-1"
                aria-label="Tutup asisten"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showHistory ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div style={{ borderColor: LINE }} className="px-3 pt-3 pb-2 border-b flex-shrink-0 space-y-2">
                <button
                  onClick={startNewChat}
                  style={{ backgroundColor: ACCENT, color: '#FFFFFF' }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium cursor-pointer transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = ACCENT_DARK)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = ACCENT)}
                >
                  <Plus className="w-4 h-4" /> Chat baru
                </button>
                <div style={{ borderColor: LINE }} className="flex items-center gap-2 border rounded-md px-2.5 py-1.5">
                  <Search className="w-3.5 h-3.5" style={{ color: MUTED }} />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari percakapan..."
                    style={{ color: INK }}
                    className="flex-1 min-w-0 outline-none text-sm bg-transparent"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {filteredSessions.length === 0 && (
                  <p style={{ color: MUTED }} className="text-xs text-center py-6 px-4">
                    {sessions.length === 0
                      ? 'Belum ada riwayat percakapan. Mulai chat untuk menyimpannya di sini.'
                      : 'Tidak ada percakapan yang cocok dengan pencarianmu.'}
                  </p>
                )}
                {filteredSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => openSession(s.id)}
                    style={{
                      backgroundColor: s.id === currentSessionId ? '#FFFFFF' : 'transparent',
                      borderColor: s.id === currentSessionId ? LINE : 'transparent',
                    }}
                    className="group flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 cursor-pointer hover:bg-white transition-colors"
                  >
                    <div className="min-w-0">
                      <p style={{ color: INK }} className="text-sm truncate">{s.title}</p>
                      <p style={{ color: MUTED }} className="text-xs">{formatRelativeTime(s.updated_at)}</p>
                    </div>
                    <button
                      onClick={(e) => deleteSession(s.id, e)}
                      style={{ color: MUTED }}
                      className="opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:text-red-500 cursor-pointer flex-shrink-0 p-1"
                      aria-label="Hapus percakapan ini"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      style={
                        m.role === 'user'
                          ? { backgroundColor: ACCENT, color: '#FFFFFF' }
                          : { backgroundColor: '#FFFFFF', color: INK, borderColor: LINE }
                      }
                      className={`max-w-[88%] px-3.5 py-2.5 rounded-lg text-sm leading-relaxed ${
                        m.role === 'assistant' ? 'border' : ''
                      }`}
                    >
                      {m.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none [&_div.table-wrapper]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-black/15 [&_th]:p-1.5 [&_th]:bg-black/5 [&_td]:border [&_td]:border-black/15 [&_td]:p-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-2">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-2 w-full max-w-full">
                                  <table {...props} />
                                </div>
                              ),
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isSending && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div
                      style={{ color: MUTED, borderColor: LINE, backgroundColor: '#FFFFFF' }}
                      className="border px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lagi ngetik jawaban buat kamu...
                    </div>
                  </div>
                )}
                {errorNotice && (
                  <p
                    style={{ color: MUTED, borderColor: LINE }}
                    className="text-xs border border-dashed rounded-md px-2.5 py-2"
                  >
                    {errorNotice}
                  </p>
                )}
              </div>

              <div style={{ borderColor: LINE }} className="border-t p-2.5 flex gap-2 flex-shrink-0">
                <input
                  value={input}
                  data-gramm="false"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Tanya soal jadwal atau KRS-mu di sini..."
                  style={{ borderColor: LINE, color: INK }}
                  className="flex-1 min-w-0 border rounded-md px-3 py-2 text-sm outline-none focus:ring-2"
                  onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${ACCENT}55`)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                />
                <button
                  onClick={sendMessage}
                  disabled={isSending || !input.trim()}
                  style={{ backgroundColor: ACCENT, color: '#FFFFFF' }}
                  className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 disabled:opacity-40 cursor-pointer transition-colors"
                  onMouseEnter={(e) => {
                    if (!isSending && input.trim()) e.currentTarget.style.backgroundColor = ACCENT_DARK;
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = ACCENT)}
                  aria-label="Kirim pesan"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}