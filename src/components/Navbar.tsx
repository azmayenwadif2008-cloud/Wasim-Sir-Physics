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
    activeClass: 'bg-[#CBD5E1] text-[#111318] border-[#E2E8F0] shadow-sm',
    idleClass:
      'bg-[#181C24] text-[#CBD5E1] border-[#2A303D] hover:bg-[#1F2430] hover:border-[#CBD5E1]/60 hover:text-[#E2E8F0]',
    iconIdleClass: 'text-[#CBD5E1]',
  },
  {
    id: 'campus-gallery',
    label: 'গ্যালারি',
    icon: Images,
    activeClass: 'bg-sky-400 text-[#0C0E13] border-sky-300 shadow-sm',
    idleClass:
      'bg-[#181C24] text-sky-200 border-[#2A303D] hover:bg-[#1F2430] hover:border-sky-400/60',
    iconIdleClass: 'text-sky-400',
  },
  {
    id: 'notices',
    label: 'নোটিশ',
    icon: Bell,
    activeClass: 'bg-green-400 text-[#0C0E13] border-green-300 shadow-sm',
    idleClass:
      'bg-[#181C24] text-green-200 border-[#2A303D] hover:bg-[#1F2430] hover:border-green-400/60',
    iconIdleClass: 'text-green-400',
  },
  {
    id: 'curriculum',
    label: 'পাঠ্যক্রম',
    icon: BookOpen,
    activeClass: 'bg-purple-500 text-white border-purple-400 shadow-sm',
    idleClass:
      'bg-[#181C24] text-purple-200 border-[#2A303D] hover:bg-[#1F2430] hover:border-purple-400/60',
    iconIdleClass: 'text-purple-300',
  },
  {
    id: 'physics-lab',
    label: 'ফিজিক্স ল্যাব',
    icon: Atom,
    activeClass: 'bg-pink-400 text-[#0C0E13] border-pink-300 shadow-sm',
    idleClass:
      'bg-[#181C24] text-pink-200 border-[#2A303D] hover:bg-[#1F2430] hover:border-pink-400/60',
    iconIdleClass: 'text-pink-300',
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
    <header className="sticky top-0 z-40 bg-[#111318]/95 backdrop-blur-md border-b border-[#262B36]">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => {
            onNavigateView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-sm sm:text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 cursor-pointer hover:text-pink-400 transition-colors"
        >
          ওয়াসিম স্যার ফিজিক্স
        </button>

        {/* Zone 3: Homepage & Separate Student Panel / Admin Panel corner buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {activeView === 'portal' && (
            <button
              type="button"
              onClick={() => onNavigateView('landing')}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-100 bg-[#181C24] border border-[#2E3442] rounded-lg hover:border-white/60 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                ? 'text-white bg-purple-500 ring-2 ring-pink-300/80'
                : 'text-white bg-purple-600 hover:bg-purple-500'
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
                : 'text-slate-950 bg-sky-400 hover:bg-sky-300'
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
          className="border-t border-[#262B36] bg-[#14171D]/95"
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
                      isActive ? 'text-current' : tab.iconIdleClass
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
