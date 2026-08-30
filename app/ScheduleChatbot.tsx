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
      
      // Simulasi animasi mengetik (Typewriter effect bertahap)
      let currentText = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      
      let index = 0;
      const interval = setInterval(() => {
        if (index < fullReply.length) {
          currentText += fullReply[index];
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: currentText };
            return updated;
          });
          index++;
        } else {
          clearInterval(interval);
          setIsSending(false);
        }
      }, 15); // Kecepatan ketikan teks

    } catch (err: any) {
      setErrorNotice(err?.message || 'Terjadi kendala saat menghubungi asisten.');
      setIsSending(false);
    }
  };

  return (
    <div ref={chatbotRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:opacity-90 transition cursor-pointer"
        aria-label={isOpen ? 'Tutup asisten jadwal' : 'Buka asisten jadwal'}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-5 z-50 w-[24rem] max-w-[92vw] h-[32rem] max-h-[80vh] bg-white border border-black/15 rounded-xl shadow-2xl flex flex-col overflow-hidden">
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
                    <div className="prose prose-sm max-w-none text-black [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-black/20 [&_th]:p-1.5 [&_th]:bg-black/5 [&_td]:border [&_td]:border-black/20 [&_td]:p-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_h3]:font-bold [&_h3]:text-sm [&_h3]:mt-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
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