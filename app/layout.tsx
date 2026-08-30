'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { KrsPlannerProvider, useKrs } from './context/KrsPlannerContext';
import Navbar from './components/Navbar';
import SidebarContent from './components/SidebarContent';
import MobileTabBar from './components/MobileTabBar';
import Footer from './components/Footer';
import ScheduleChatbot from './ScheduleChatbot';

// Layout ini dipasang untuk semua halaman di dalam grup (app) — yaitu
// Beranda ("/"), /sync, /pilih, /manual, /jadwal, /pengaturan. Karena
// layout tidak remount saat pindah route, <KrsPlannerProvider> di sini
// membuat state (SKS, dosen favorit, jadwal tersimpan, dll) tetap hidup
// walau usernya loncat-loncat antar menu.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <title>KRS Automation - Responku KRS</title>
        <meta 
          name="description" 
          content="Responku KRS adalah platform KRS Automation terbaik untuk membantu mahasiswa menyusun jadwal kuliah, sinkronisasi Google Sheets, cek bentrok jam, dan perencanaan Kartu Rencana Studi secara otomatis dan mudah." 
        />
        <meta name="keywords" content="responku krs, krs automation, susun jadwal kuliah, planner krs mahasiswa, cek bentrok krs" />
      </head>
      <body>
        <SessionProvider>
          <KrsPlannerProvider>
            <AppShell>{children}</AppShell>
          </KrsPlannerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const krs = useKrs();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!krs.isMounted) return null;

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Poppins', ui-sans-serif, system-ui" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
      `}</style>

      <Navbar session={krs.session} onOpenSidebar={() => setIsSidebarOpen(true)} />

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar desktop — menu + widget selalu terlihat */}
        <aside className="hidden lg:block w-72 flex-shrink-0 border-r border-slate-200 px-5 py-8 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <SidebarContent krs={krs} />
        </aside>

        {/* Sidebar drawer mobile */}
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-slate-900/30" onClick={() => setIsSidebarOpen(false)} aria-hidden="true" />
            <div className="relative w-80 max-w-[85%] bg-white h-full px-5 py-6 overflow-y-auto shadow-2xl">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mt-8">
                <SidebarContent krs={krs} onNavigate={() => setIsSidebarOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Konten halaman aktif — hanya bagian ini yang berganti saat pindah menu */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-8 space-y-6 pb-24 lg:pb-8">{children}</main>
      </div>

      <Footer />
      <ScheduleChatbot context={krs.chatContext} />
      <MobileTabBar />
    </div>
  );
}