import { ArrowLeft, ArrowRight } from 'lucide-react';
import { usePortal } from '../context/PortalContext';

interface NavbarProps {
  activeView: 'landing' | 'portal';
  onNavigateView: (view: 'landing' | 'portal') => void;
  onScrollToSection: (sectionId: string) => void;
}

export function Navbar({
  activeView,
  onNavigateView,
  onScrollToSection,
}: NavbarProps) {
  const { user, isAdmin } = usePortal();

  const handleSectionLink = (id: string) => {
    if (activeView !== 'landing') {
      onNavigateView('landing');
      setTimeout(() => onScrollToSection(id), 60);
    } else {
      onScrollToSection(id);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B1118]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => {
            onNavigateView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 cursor-pointer hover:text-[#FBBF24] transition-colors"
        >
          ওয়াসিম স্যার ফিজিক্স
        </button>

        {/* Zone 2: Clean single-line text links matching section order */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleSectionLink('instructor')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ইন্সট্রাক্টর
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('campus-gallery')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            গ্যালারি
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('notices')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            নোটিশ
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('curriculum')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            পাঠ্যক্রম
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('physics-lab')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            ফিজিক্স ল্যাব
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('portal')}
            className={`hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeView === 'portal' ? 'text-[#FBBF24] font-semibold' : ''
            }`}
          >
            {isAdmin ? 'অ্যাডমিন প্যানেল' : 'স্টুডেন্ট প্যানেল'}
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="shrink-0">
          {activeView === 'portal' ? (
            <button
              type="button"
              onClick={() => onNavigateView('landing')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-100 bg-[#131C28] border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>হোমপেজ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateView('portal')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-[#F59E0B] rounded-lg hover:bg-[#FBBF24] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>
                {isAdmin ? 'অ্যাডমিন প্যানেল' : user ? 'স্টুডেন্ট প্যানেল' : 'স্টুডেন্ট লগইন'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile quick-jump bar (landing view only) */}
      {activeView === 'landing' && (
        <nav
          aria-label="মোবাইল সেকশন নেভিগেশন"
          className="md:hidden border-t border-slate-800/70 px-6 py-2 flex items-center gap-5 overflow-x-auto text-xs font-medium text-slate-300"
        >
          <button
            type="button"
            onClick={() => handleSectionLink('instructor')}
            className="hover:text-[#FBBF24] whitespace-nowrap shrink-0 cursor-pointer"
          >
            ইন্সট্রাক্টর
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('campus-gallery')}
            className="hover:text-[#FBBF24] whitespace-nowrap shrink-0 cursor-pointer"
          >
            গ্যালারি
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('notices')}
            className="hover:text-[#FBBF24] whitespace-nowrap shrink-0 cursor-pointer"
          >
            নোটিশ
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('curriculum')}
            className="hover:text-[#FBBF24] whitespace-nowrap shrink-0 cursor-pointer"
          >
            পাঠ্যক্রম
          </button>
          <button
            type="button"
            onClick={() => handleSectionLink('physics-lab')}
            className="hover:text-[#FBBF24] whitespace-nowrap shrink-0 cursor-pointer"
          >
            ফিজিক্স ল্যাব
          </button>
        </nav>
      )}
    </header>
  );
}
