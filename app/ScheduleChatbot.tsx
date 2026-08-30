'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, ImagePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // base64 data URL, kalau user melampirkan gambar
}

const MAX_IMAGE_SIZE_MB = 5;

export default function ScheduleChatbot({ context }: { context: unknown }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Halo! Santai aja, aku siap bantu kamu ngecek jadwal kuliah, cari tahu kalau ada jam yang bentrok, atau bantu susun KRS biar makin gampang. Kamu juga bisa kirim foto jadwal/KRS-mu kalau mau aku bacain. Ada yang mau ditanyain?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  // Lampiran gambar yang belum dikirim
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- Logika Dragging (konsisten dengan posisi right/bottom) ---
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

  // --- Efek mengetik (durasi total tetap, tidak bergantung panjang teks) ---
  const startTypingEffect = (fullText: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

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
      }
    }, tickMs);
  };

  // --- Lampiran gambar ---
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // biar file yang sama bisa dipilih lagi nanti
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorNotice('Yang bisa dilampirkan cuma file gambar ya (jpg, png, dll).');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setErrorNotice(`Ukuran gambar maksimal ${MAX_IMAGE_SIZE_MB}MB ya.`);
      return;
    }

    setErrorNotice('');
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
    };
    reader.onerror = () => {
      setErrorNotice('Gagal membaca gambar, coba lagi ya.');
    };
    reader.readAsDataURL(file);
  };

  const removePendingImage = () => setPendingImage(null);

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !pendingImage) || isSending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      ...(pendingImage ? { image: pendingImage } : {}),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setPendingImage(null);
    setIsSending(true);
    setErrorNotice('');

    try {
      // Info tanggal & waktu saat ini, dikirim biar asisten tahu "sekarang" itu kapan
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
          now: {
            iso: now.toISOString(),
            formatted: `${nowFormatted}, pukul ${timeFormatted}`,
          },
        }),
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

      {/* Jendela Chat:
          Mobile  -> bottom sheet: nempel di bawah, lebar penuh, tinggi ~setengah layar, slide-up
          Desktop -> mengambang kanan-bawah seperti sebelumnya */}
      {isOpen && (
        <div
          className="fixed z-50 bg-white border border-black/15 shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-200
          inset-x-0 bottom-0 w-full h-[55vh] max-h-[80vh] rounded-t-2xl slide-in-from-bottom-8
          sm:inset-auto sm:right-5 sm:bottom-20 sm:w-[24rem] sm:max-w-[92vw] sm:h-[32rem] sm:max-h-[80vh] sm:rounded-xl sm:zoom-in-95 sm:slide-in-from-bottom-0"
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
                    <div>
                      {m.image && (
                        <img
                          src={m.image}
                          alt="Lampiran gambar"
                          className="rounded-md mb-1.5 max-h-40 w-auto object-cover"
                        />
                      )}
                      {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                    </div>
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

          {/* Preview gambar yang mau dikirim */}
          {pendingImage && (
            <div className="px-2.5 pt-2 flex-shrink-0 bg-white">
              <div className="relative inline-block">
                <img src={pendingImage} alt="Preview lampiran" className="h-16 w-16 object-cover rounded-md border border-black/15" />
                <button
                  onClick={removePendingImage}
                  className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-pointer"
                  aria-label="Hapus gambar"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-black/10 p-2.5 flex gap-2 flex-shrink-0 bg-white">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={handleImageButtonClick}
              disabled={isSending}
              className="border border-black/15 text-black w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 disabled:opacity-40 cursor-pointer hover:bg-black/5"
              aria-label="Lampirkan gambar"
              title="Kirim gambar (mis. foto jadwal/KRS)"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <input
              value={input}
              data-gramm="false"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Tanya soal jadwal, KRS, atau kirim gambar..."
              className="flex-1 min-w-0 border border-black/15 rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || (!input.trim() && !pendingImage)}
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
