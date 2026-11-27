import { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingShowcase } from './components/LandingShowcase';
import { Navbar } from './components/Navbar';
import { StudentPortal } from './components/StudentPortal';
import { PortalProvider } from './context/PortalContext';

function PortalShell() {
  const [activeView, setActiveView] = useState<'landing' | 'portal'>('landing');
  const [preselectedClassId, setPreselectedClassId] = useState<string | null>(null);

  const handleOpenPortal = (classId?: string) => {
    setPreselectedClassId(classId ?? null);
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
        onNavigateView={(view) => setActiveView(view)}
        onScrollToSection={handleScrollToSection}
      />

      <div className="flex-1">
        {activeView === 'landing' ? (
          <LandingShowcase onOpenPortal={handleOpenPortal} />
        ) : (
          <StudentPortal preselectedClassId={preselectedClassId} />
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
              মতিটাওয়ার ৫ম তলা, চকবাজার, চট্টগ্রাম · হেল্পলাইন: ০১৮৮৩-৬০০৮২৭ · © ২০২৬ সর্বস্বত্ব সংরক্ষিত
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
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
