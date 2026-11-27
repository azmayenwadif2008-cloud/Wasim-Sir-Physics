import { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingShowcase } from './components/LandingShowcase';
import { Navbar } from './components/Navbar';
import { StudentPortal } from './components/StudentPortal';
import { PortalProvider } from './context/PortalContext';

function PortalShell() {
  const [activeView, setActiveView] = useState<'landing' | 'portal'>('landing');
  const [preselectedClassId, setPreselectedClassId] = useState<string | null>(null);
  const [authRoleRequest, setAuthRoleRequest] = useState<{
    role: 'student' | 'admin';
    seq: number;
  }>({ role: 'student', seq: 0 });

  const handleOpenPortal = (classId?: string, role: 'student' | 'admin' = 'student') => {
    setPreselectedClassId(classId ?? null);
    setAuthRoleRequest((prev) => ({ role, seq: prev.seq + 1 }));
    setActiveView('portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1118] text-[#F1F5F9]">
      <Navbar
        activeView={activeView}
        onNavigateView={(view, role) => {
          if (view === 'portal' && role) {
            setPreselectedClassId(null);
            setAuthRoleRequest((prev) => ({ role, seq: prev.seq + 1 }));
          }
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onScrollToSection={handleScrollToSection}
      />

      <div className="flex-1">
        {activeView === 'landing' ? (
          <LandingShowcase onOpenPortal={handleOpenPortal} />
        ) : (
          <StudentPortal
            preselectedClassId={preselectedClassId}
            authRoleRequest={authRoleRequest}
          />
        )}
      </div>

      <footer className="border-t border-slate-800/80 bg-[#080D14]">
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="space-y-1">
            <div>
              <span className="font-display font-semibold text-slate-100">
                ওয়াসিম স্যার ফিজিক্স (Wasim Sir Physics)
              </span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>চট্টগ্রামের পদার্থবিজ্ঞানের বৃহত্তম কম্পিটিটিভ প্ল্যাটফর্ম · HSC &apos;২৮</span>
            </div>
            <div className="text-[11px] text-slate-500">
              মতিটাওয়ার ৫ম তলা, চকবাজার, চট্টগ্রাম · ওয়াসিম স্যার: +880 1883-600827 · হেল্পলাইন: +880 1600-653568 (কল ও WhatsApp) · © ২০২৬ সর্বস্বত্ব সংরক্ষিত
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">০১৮৮৩-৬০০৮২৭:</span>
              <a
                href="tel:+8801883600827"
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                কল
              </a>
              <span className="text-slate-600">/</span>
              <a
                href="https://wa.me/8801883600827"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                WhatsApp
              </a>
            </span>
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="text-slate-400">০১৬০০-৬৫৩৫৬৮:</span>
              <a
                href="tel:+8801600653568"
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                কল
              </a>
              <span className="text-slate-600">/</span>
              <a
                href="https://wa.me/8801600653568"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                WhatsApp
              </a>
            </span>
            <a
              href="https://www.facebook.com/share/151mRVatzWN/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 transition-colors whitespace-nowrap"
            >
              Facebook Page
            </a>
            <button
              type="button"
              onClick={() => {
                setActiveView('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-slate-100 transition-colors cursor-pointer"
            >
              পাঠ্যক্রম
            </button>
            <button
              type="button"
              onClick={() => handleOpenPortal()}
              className="hover:text-slate-100 transition-colors cursor-pointer"
            >
              স্টুডেন্ট লগইন
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PortalProvider>
        <PortalShell />
      </PortalProvider>
    </ErrorBoundary>
  );
}
