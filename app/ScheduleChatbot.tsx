'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ScheduleChatbot({ context }: { context: unknown }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Halo! Santai aja, aku siap bantu kamu ngecek jadwal kuliah, cari tahu kalau ada jam yang bentrok, atau bantu susun KRS biar makin gampang. Ada yang mau ditanyain?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  // Posisi awal tombol (bottom-right: x = jarak dari kanan, y = jarak dari bawah)
  const [position, setPosition] = useState({ x: 20, y: 20 });
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

  // --- Logika Dragging (diperbaiki: konsisten dengan posisi right/bottom) ---
  const handleStart = (clientX: number, clientY: number) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStartClient.current = { x: clientX, y: clientY };

    // Simpan offset antara cursor dan titik acuan kanan-bawah tombol
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

  // Listener global dipasang sekali saja (bukan setiap posisi berubah)
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

  // --- Efek mengetik (diperbaiki: durasi total tetap, tidak bergantung panjang teks) ---
  const startTypingEffect = (fullText: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const totalDurationMs = 500; // total waktu reveal, berapa pun panjang teksnya
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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Duh, lagi ada kendala nih pas ngobrol sama asistennya.');

      const fullReply = data.reply || 'Maaf ya, aku kurang nangkap maksudnya. Coba ulangi pertanyaannya ya!';
      startTypingEffect(fullReply);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Terjadi kendala saat menghubungi asisten.');
      setIsSending(false);
    }
  };

  return (
    <div ref={chatbotRef}>
      {/* Tombol Buletan Chatbot yang bisa digeser */}
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
        }}
        className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform cursor-grab active:cursor-grabbing group select-none"
        aria-label="Geser atau buka asisten jadwal"
        title="Tahan dan geser untuk memindahkan tombol"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </div>

      {/* Jendela Chat: Desktop di kanan bawah, Mobile di Center Justify (Tengah Layar) */}
      {isOpen && (
        <div 
          className="fixed z-50 w-[24rem] max-w-[92vw] h-[32rem] max-h-[80vh] bg-white border border-black/15 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 
          /* Posisi Mobile: Center layar */
          inset-x-4 top-1/2 -translate-y-1/2 mx-auto 
          /* Posisi Desktop (sm ke atas): Mengikuti posisi buletan di kanan bawah */
          sm:inset-auto sm:right-5 sm:bottom-20 sm:translate-y-0 sm:mx-0"
        >
          <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between bg-black text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <p className="text-sm font-semibold">Asisten KRS Kamu</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] px-3.5 py-2.5 rounded-lg text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-neutral-100 text-black border border-black/10'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none text-black [&_div.table-wrapper]:overflow-x-auto [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-black/20 [&_th]:p-1.5 [&_th]:bg-black/5 [&_td]:border [&_td]:border-black/20 [&_td]:p-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-2">
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
                <div className="bg-neutral-100 border border-black/10 px-3 py-2 rounded-lg flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Lagi ngetik jawaban buat kamu...
                </div>
              </div>
            )}
            {errorNotice && (
              <p className="text-xs text-black/60 border border-dashed border-black/20 rounded-md px-2.5 py-2">
                {errorNotice}
              </p>
            )}
          </div>

          <div className="border-t border-black/10 p-2.5 flex gap-2 flex-shrink-0 bg-white">
            <input
              value={input}
              data-gramm="false"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Tanya soal jadwal atau KRS-mu di sini..."
              className="flex-1 border border-black/15 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || !input.trim()}
              className="bg-black text-white w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 disabled:opacity-40 cursor-pointer"
              aria-label="Kirim pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
