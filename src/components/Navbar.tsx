import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Atom,
  Award,
  Bell,
  BookOpen,
  Images,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface NavbarProps {
  activeView: 'landing' | 'portal';
  activePanelRole?: 'student' | 'admin';
  onNavigateView: (view: 'landing' | 'portal', role?: 'student' | 'admin') => void;
  onScrollToSection: (sectionId: string) => void;
}

const SECTION_TABS = [
  {
    id: 'instructor',
    label: 'ইন্সট্রাক্টর',
    icon: Award,
    activeClass:
      'bg-[#F59E0B] text-slate-950 border-[#FBBF24] shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    idleClass:
      'bg-amber-950/35 text-amber-200 border-amber-700/50 hover:bg-amber-900/50 hover:border-amber-500/80',
    iconIdleClass: 'text-[#FBBF24]',
  },
  {
    id: 'campus-gallery',
    label: 'গ্যালারি',
    icon: Images,
    activeClass:
      'bg-[#38BDF8] text-slate-950 border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.25)]',
    idleClass:
      'bg-sky-950/35 text-sky-200 border-sky-700/50 hover:bg-sky-900/50 hover:border-sky-500/80',
    iconIdleClass: 'text-[#38BDF8]',
  },
  {
    id: 'notices',
    label: 'নোটিশ',
    icon: Bell,
    activeClass:
      'bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.25)]',
    idleClass:
      'bg-emerald-950/35 text-emerald-200 border-emerald-700/50 hover:bg-emerald-900/50 hover:border-emerald-500/80',
    iconIdleClass: 'text-emerald-400',
  },
  {
    id: 'curriculum',
    label: 'পাঠ্যক্রম',
    icon: BookOpen,
    activeClass:
      'bg-violet-400 text-slate-950 border-violet-300 shadow-[0_0_20px_rgba(167,139,250,0.25)]',
    idleClass:
      'bg-violet-950/35 text-violet-200 border-violet-700/50 hover:bg-violet-900/50 hover:border-violet-500/80',
    iconIdleClass: 'text-violet-300',
  },
  {
    id: 'physics-lab',
    label: 'ফিজিক্স ল্যাব',
    icon: Atom,
    activeClass:
      'bg-rose-400 text-slate-950 border-rose-300 shadow-[0_0_20px_rgba(251,113,133,0.25)]',
    idleClass:
      'bg-rose-950/35 text-rose-200 border-rose-700/50 hover:bg-rose-900/50 hover:border-rose-500/80',
    iconIdleClass: 'text-rose-300',
  },
] as const;

export function Navbar({
  activeView,
  activePanelRole = 'student',
  onNavigateView,
  onScrollToSection,
}: NavbarProps) {
  const [activeSection, setActiveSection] = useState<string>('instructor');

  useEffect(() => {
    if (activeView !== 'landing') return;

    const handleScroll = () => {
      const offset = 180;
      let currentId: string = SECTION_TABS[0].id;
      for (const tab of SECTION_TABS) {
        const el = document.getElementById(tab.id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= offset) {
            currentId = tab.id;
          }
        }
      }
      setActiveSection(currentId);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeView]);

  const handleSectionLink = (id: string) => {
    setActiveSection(id);
    if (activeView !== 'landing') {
      onNavigateView('landing');
      setTimeout(() => onScrollToSection(id), 60);
    } else {
      onScrollToSection(id);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1118]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => {
            onNavigateView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-sm sm:text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 cursor-pointer hover:text-[#FBBF24] transition-colors"
        >
          ওয়াসিম স্যার ফিজিক্স
        </button>

        {/* Zone 3: Homepage & Separate Student Panel / Admin Panel corner buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {activeView === 'portal' && (
            <button
              type="button"
              onClick={() => onNavigateView('landing')}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-100 bg-[#131C28] border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">হোম</span>
              <span className="hidden sm:inline">হোমপেজ</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigateView('portal', 'student')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'portal' && activePanelRole === 'student'
                ? 'text-slate-950 bg-[#FBBF24] ring-2 ring-amber-200/80'
                : 'text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">স্টুডেন্ট</span>
            <span className="hidden sm:inline">স্টুডেন্ট প্যানেল</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('portal', 'admin')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'portal' && activePanelRole === 'admin'
                ? 'text-slate-950 bg-sky-300 ring-2 ring-sky-200/80'
                : 'text-slate-950 bg-[#38BDF8] hover:bg-sky-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">অ্যাডমিন</span>
            <span className="hidden sm:inline">অ্যাডমিন প্যানেল</span>
          </button>
        </div>
      </div>

      {/* Prominent Color-Coded Section Explorer Tabs (Desktop & Mobile, landing view) */}
      {activeView === 'landing' && (
        <nav
          aria-label="সেকশন নেভিগেশন ট্যাব"
          className="border-t border-slate-800/80 bg-[#0E1621]/95"
        >
          <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center sm:justify-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
            {SECTION_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSectionLink(tab.id)}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4.5 py-2 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive ? tab.activeClass : tab.idleClass
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                      isActive ? 'text-slate-950' : tab.iconIdleClass
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
