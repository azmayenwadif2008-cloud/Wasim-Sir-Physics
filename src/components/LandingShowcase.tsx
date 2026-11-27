import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Bell,
  BookOpen,
  ExternalLink,
  Lock,
  MessageCircle,
  Phone,
  Play,
} from 'lucide-react';
import { HSC28_PHYSICS_CHAPTERS } from '../data/hsc28Curriculum';
import { usePortal } from '../context/PortalContext';
import { CampusGallery } from './CampusGallery';
import { NoticeMediaViewer } from './NoticeMediaViewer';
import { ProjectileLab } from './ProjectileLab';
import { ResilientImage } from './ResilientImage';

interface LandingShowcaseProps {
  onOpenPortal: (preselectClassId?: string, role?: 'student' | 'admin') => void;
}

const HERO_HIGHLIGHTS = [
  {
    id: 'achiever-tamimou',
    src: '/assets/aistudio/FB_IMG_1795660459435_661747cb.jpg',
    alt: 'এসএসসিতে চট্টগ্রাম বোর্ডে ৩য় স্থান (১২৬৮) অর্জনকারী শিক্ষার্থী HSC-28 ব্যাচ-০৪ এ ভর্তি ও ওয়াসিম স্যারের উপহার গ্রহণ',
    label: 'এসএসসি চট্টগ্রাম বোর্ড ৩য়',
    sub: 'বোর্ড ৩য় স্থান (১২৬৮) · HSC-28 ভর্তি',
  },
  {
    id: 'achiever-ayaaz',
    src: '/assets/aistudio/FB_IMG_1795659691353_e082aedd.jpg',
    alt: 'এসএসসিতে চট্টগ্রাম বোর্ডে ৪র্থ স্থান (১২৬৬) অর্জনকারী শিক্ষার্থী HSC-28 ব্যাচে ভর্তি ও ওয়াসিম স্যারের উপহার গ্রহণ',
    label: 'এসএসসি চট্টগ্রাম বোর্ড ৪র্থ',
    sub: 'বোর্ড ৪র্থ স্থান (১২৬৬) · সম্মাননা উপহার',
  },
  {
    id: 'achiever-sadman',
    src: '/assets/aistudio/FB_IMG_1795659565214_67bd55f0.jpg',
    alt: 'এসএসসিতে ১৩০০ এর মধ্যে ১২৭১ নম্বর অর্জনকারী শিক্ষার্থী HSC-28 ব্যাচে ভর্তি ও ওয়াসিম স্যারের উপহার গ্রহণ',
    label: 'এসএসসি স্কোর ১২৭১ / ১৩০০',
    sub: '১২৭১ / ১৩০০ · HSC-28 ভর্তি',
  },
];

export function LandingShowcase({ onOpenPortal }: LandingShowcaseProps) {
  const { isAdmin, isPaidStudent, classes, notices } = usePortal();
  const [chapterFilter, setChapterFilter] = useState<'all' | 'Mechanics' | 'Waves & Matter'>('all');
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [heroCrowdAlt, setHeroCrowdAlt] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setHeroCrowdAlt((v) => !v);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredChapters = HSC28_PHYSICS_CHAPTERS.filter((ch) =>
    chapterFilter === 'all' ? true : ch.group === chapterFilter,
  );
  const visibleChapters =
    chapterFilter === 'all' && !showAllChapters ? filteredChapters.slice(0, 5) : filteredChapters;

  const previewClasses = classes.slice(0, 4);
  const displayNotices = notices.slice(0, 5);

  const formatDate = (ts?: { toDate?: () => Date }) => {
    if (!ts?.toDate) return 'সাম্প্রতিক';
    return ts.toDate().toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const categoryLabel = (cat: string) => {
    if (cat === 'Routine') return 'রুটিন';
    if (cat === 'Exam') return 'পরীক্ষা';
    if (cat === 'Class Update') return 'ক্লাস আপডেট';
    return 'সাধারণ নোটিশ';
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="observatory-grid-bg border-b border-slate-800/80">
        <div className="max-w-[1200px] mx-auto px-6 py-14 lg:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 items-stretch">
            {/* Left Copy */}
            <div className="lg:col-span-6 flex flex-col justify-between py-2">
              <div>
                <p className="text-xs sm:text-sm font-medium text-sky-300 tracking-wide mb-3">
                  চট্টগ্রামের পদার্থবিজ্ঞানের বৃহত্তম কম্পিটিটিভ প্ল্যাটফর্মে তোমাদের স্বাগতম
                </p>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.2rem] font-bold tracking-tight text-slate-50 leading-[1.14] text-balance mb-5">
                  কঠিন সূত্র নয়—যুক্তির আলোয় জয় করো পদার্থবিজ্ঞান।
                </h1>

                <p className="text-sm font-medium text-[#FBBF24] mb-4">
                  এইচএসসি ২০২৮ · একাদশ শ্রেণি · পদার্থবিজ্ঞান প্রথম পত্র
                </p>

                <p className="text-base text-slate-300 leading-relaxed max-w-xl mb-8">
                  মুখস্থবিদ্যার বাইরে এসে প্রতিটি সমীকরণ অনুভব করো মূল তত্ত্ব থেকে। ওয়াসিম স্যারের এইচএসসি &apos;২৮ ব্যাচের সকল অধ্যায়ের রেকর্ডেড ক্লাস, হ্যান্ড-রিটেন বোর্ড নোট এবং ব্যাচ নোটিশ এখন এক ক্লাসরুমে।
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => onOpenPortal(undefined, 'student')}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>
                      {isPaidStudent
                        ? 'ক্লাসরুমে প্রবেশ করো'
                        : 'স্টুডেন্ট রেজিস্ট্রেশন / লগইন'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <a
                    href="#campus-gallery"
                    className="inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-sky-300 hover:text-sky-200 hover:underline underline-offset-4 transition-colors whitespace-nowrap"
                  >
                    <span>১২টি দৃশ্যপট দেখো</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-800/90 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
                <span className="text-slate-200 font-medium">অধ্যায়ভিত্তিক পূর্ণাঙ্গ রেকর্ডেড ক্লাস</span>
                <span aria-hidden="true">·</span>
                <span>বোর্ড সিকিউ ও অ্যাডমিশন গাণিতিক সমাধান</span>
                <span aria-hidden="true">·</span>
                <span>চট্টগ্রামের সেরা প্রতিযোগিতামূলক প্রস্তুতি</span>
              </div>
            </div>

            {/* Right Architectural Visual Collage: Packed Hall + Integrated Trio */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              <a
                href="#campus-gallery"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('select-gallery-item', {
                      detail: heroCrowdAlt ? 'sigma-hall' : 'auditorium-wide',
                    }),
                  )
                }
                className="group relative h-[225px] sm:h-[250px] rounded-xl overflow-hidden border border-slate-700/80 bg-[#131C28]"
              >
                <ResilientImage
                  src={
                    heroCrowdAlt
                      ? '/assets/aistudio/Screenshot_2026-11-26-08-18-39-665-edit_com.facebook.katana_b13b688f.jpg'
                      : '/assets/aistudio/Screenshot_2026-11-26-08-22-52-654-edit_com.facebook.katana_4c3ab565.jpg'
                  }
                  alt="চকবাজার ক্যাম্পাসে শত শত শিক্ষার্থীর উপস্থিতিতে ওয়াসিম স্যারের ক্লাস"
                  className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                  fallbackLabel="ওয়াসিম স্যার ফিজিক্স · পূর্ণাঙ্গ ক্লাসরুম"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#060A10] via-[#060A10]/70 to-transparent p-4 sm:p-5">
                  <p className="text-[11px] font-medium text-[#FBBF24] mb-0.5">
                    মতি টাওয়ার (৫ম তলা), চকবাজার · পূর্ণাঙ্গ ক্লাসরুম
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-slate-100">
                    একসাথে শত শত শিক্ষার্থীর প্রাণবন্ত উপস্থিতি ও ৪কে স্মার্টবোর্ড পাঠদান।
                  </p>
                </div>
              </a>

              <div className="grid grid-cols-3 gap-3 flex-1 min-h-[195px] sm:min-h-[210px]">
                {HERO_HIGHLIGHTS.map((item) => (
                  <a
                    key={item.src}
                    href="#campus-gallery"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('select-gallery-item', { detail: item.id }),
                      )
                    }
                    className="group relative rounded-xl overflow-hidden border border-slate-700/80 bg-[#131C28] hover:border-[#F59E0B] transition-colors"
                  >
                    <ResilientImage
                      src={item.src}
                      alt={item.alt}
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                      fallbackLabel={item.sub}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#060A10] via-[#060A10]/80 to-transparent p-2.5 sm:p-3">
                      <p className="text-[11px] font-sans font-semibold text-[#FBBF24] leading-tight tabular-nums">
                        {item.label}
                      </p>
                      <p className="text-xs font-semibold text-slate-50 leading-tight mt-0.5 truncate">
                        {item.sub}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* 4-Column Proof Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl bg-[#131C28]/90 mt-12 overflow-hidden">
            <div className="p-6 border-r border-b lg:border-b-0 border-slate-800">
              <div className="font-display text-2xl font-bold text-slate-50 mb-1">
                ১০টি অধ্যায়
              </div>
              <div className="text-xs text-slate-400">
                পদার্থবিজ্ঞান ১ম পত্র সম্পূর্ণ সিলেবাস
              </div>
            </div>
            <div className="p-6 lg:border-r border-b lg:border-b-0 border-slate-800">
              <div className="font-display text-2xl font-bold text-sky-300 mb-1">
                ১০২+ লেকচার
              </div>
              <div className="text-xs text-slate-400">
                বোর্ড সিকিউ ও গাণিতিক অনুশীলন
              </div>
            </div>
            <div className="p-6 border-r border-slate-800">
              <div className="font-display text-2xl font-bold text-[#FBBF24] mb-1">
                বোর্ড পিডিএফ
              </div>
              <div className="text-xs text-slate-400">
                প্রতিটি ক্লাসের হ্যান্ড-রিটেন নোট
              </div>
            </div>
            <div className="p-6">
              <div className="font-display text-2xl font-bold text-slate-50 mb-1">
                স্টুডেন্ট প্যানেল
              </div>
              <div className="text-xs text-slate-400">
                নিবন্ধিত ব্যাচ শিক্ষার্থীদের সুরক্ষিত ক্লাসরুম
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instructor Spotlight: Wasim Sharfaraz (Immediately below Hero for mobile & desktop visibility) */}
      <section id="instructor" className="py-10 sm:py-14 border-t border-slate-800/80 bg-[#0E1621]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch bg-[#131C28] border border-slate-800 rounded-xl overflow-hidden">
            <div className="lg:col-span-5 relative min-h-[300px] sm:min-h-[340px] bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800">
              <ResilientImage
                src="/assets/aistudio/FB_IMG_1795659673722_bfb9af38.jpg"
                alt="পদার্থবিজ্ঞান শিক্ষক ওয়াসিম সারফারাজ ও ব্যাচের শিক্ষার্থীবৃন্দ"
                className="w-full h-full object-cover object-top"
                fallbackLabel="Wasim Sharfaraz · Instructor"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#060A10] via-[#060A10]/85 to-transparent p-5 sm:p-7">
                <p className="text-[11px] font-mono tracking-wider text-[#FBBF24] mb-1">
                  INSTRUCTOR · পদার্থবিজ্ঞান
                </p>
                <div className="font-display text-2xl font-bold text-slate-50 leading-tight">
                  Wasim Sharfaraz
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  ওয়াসিম সারফারাজ · ক্যাম্পাস ডেস্কে শিক্ষার্থীদের সাথে
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-[#FBBF24] tracking-wide mb-2">
                  কোর্স ইন্সট্রাক্টর · AimX প্ল্যাটফর্ম (Wasim Sir Physics) · মতি টাওয়ার (৫ম তলা), চকবাজার
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mb-3 sm:mb-4 text-balance">
                  ওয়াসিম সারফারাজের এইচএসসি &apos;২৮ ফিজিক্স ব্যাচ
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-5 sm:mb-6">
                  AimX প্ল্যাটফর্মে <span className="text-slate-100 font-medium">Wasim Sir Physics</span> ও <span className="text-slate-100 font-medium">Abdullah Sir Biology</span> এক জায়গায়। বাংলা ভার্সনের শিক্ষার্থীদের জন্য পদার্থবিজ্ঞানের প্রতিটি কঠিন টপিক সহজ বাংলায়, বাস্তব উদাহরণ ও চিত্রসহ ধাপে ধাপে বোঝানো হয়েছে—যাতে একাদশ শ্রেণির শুরু থেকেই বোর্ড ও অ্যাডমিশন প্রস্তুতি শক্তিশালী হয়। ওয়াসিম স্যার: +880 1883-600827 · হেল্পলাইন: +880 1600-653568 (দুটি নাম্বারেই কল ও WhatsApp)।
                </p>
              </div>

              <div className="pt-5 border-t border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0B1118] border border-slate-800">
                    <span className="text-xs font-medium text-slate-200 whitespace-nowrap">
                      ওয়াসিম স্যার · <span className="font-mono text-slate-100">01883-600827</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href="tel:+8801883600827"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/70 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>কল</span>
                      </a>
                      <a
                        href="https://wa.me/8801883600827"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-md transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="w-3 h-3 shrink-0" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0B1118] border border-slate-800">
                    <span className="text-xs font-medium text-slate-200 whitespace-nowrap">
                      হেল্পলাইন · <span className="font-mono text-slate-100">01600-653568</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href="tel:+8801600653568"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/70 rounded-md transition-colors whitespace-nowrap"
                      >
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>কল</span>
                      </a>
                      <a
                        href="https://wa.me/8801600653568"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/80 rounded-md transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="w-3 h-3 shrink-0" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <a
                    href="https://www.facebook.com/share/151mRVatzWN/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-sky-300 bg-sky-950/50 hover:bg-sky-900/60 border border-sky-800/80 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>Facebook Page</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onOpenPortal(undefined, 'student')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 sm:py-3 text-sm font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>
                      {isPaidStudent
                        ? 'ক্লাসরুমে প্রবেশ করো'
                        : 'স্টুডেন্ট রেজিস্ট্রেশন / লগইন'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12-Photo Real Classroom, Achievers & Studio Bento Showcase */}
      <CampusGallery />

      {/* Live Notice Board */}
      <section id="notices" className="py-14 sm:py-20 border-t border-slate-800/80 bg-[#0B1118]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <p className="text-xs font-medium text-[#FBBF24] tracking-wide mb-2">
                একাডেমিক নোটিশ বোর্ড
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 text-balance">
                ব্যাচের রুটিন ও পরীক্ষার জরুরি ঘোষণা
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenPortal()}
              className="inline-flex items-center gap-2 text-xs font-semibold text-sky-300 hover:text-[#FBBF24] hover:underline underline-offset-4 cursor-pointer whitespace-nowrap self-start md:self-auto"
            >
              <span>সকল ব্যাচ নোটিশ পোর্টালে দেখো</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 bg-[#131C28]">
            {displayNotices.length === 0 ? (
              <div className="p-8 sm:p-10 text-center">
                <Bell className="w-6 h-6 text-slate-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-200 mb-1">
                  এখনো কোনো পাবলিক নোটিশ প্রকাশিত হয়নি
                </p>
                <p className="text-xs text-slate-400">
                  নতুন রুটিন বা পরীক্ষার আপডেট এখানে দেখা যাবে।
                </p>
              </div>
            ) : (
              displayNotices.map((notice) => (
                <article key={notice.id} className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-sky-300">{categoryLabel(notice.category)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatDate(notice.createdAt)}</span>
                    {notice.pinned && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#FBBF24]">গুরুত্বপূর্ণ পিন করা</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-100 mb-1.5">
                    {notice.title}
                  </h3>
                  {notice.body && (
                    <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                      {notice.body}
                    </p>
                  )}
                  <NoticeMediaViewer
                    title={notice.title}
                    imageUrl={notice.imageUrl}
                    videoUrl={notice.videoUrl}
                  />
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Curriculum & Recorded Class Preview */}
      <section id="curriculum" className="py-14 sm:py-20 border-t border-slate-800/80 bg-[#0E1621]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs font-medium text-[#FBBF24] tracking-wide mb-2">
                এইচএসসি ২০২৮ · একাদশ শ্রেণি পাঠ্যক্রম
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-slate-100 text-balance">
                পদার্থবিজ্ঞান প্রথম পত্রের ১০টি অধ্যায়
              </h2>
            </div>

            {/* Interactive Filter Tabs */}
            <div className="inline-flex items-center gap-1 p-1 bg-[#131C28] border border-slate-800 rounded-lg self-start md:self-auto">
              {(
                [
                  { id: 'all', label: 'সকল অধ্যায়' },
                  { id: 'Mechanics', label: 'বলবিদ্যা ও মহাকর্ষ' },
                  { id: 'Waves & Matter', label: 'তরঙ্গ ও পদার্থ' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setChapterFilter(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    chapterFilter === tab.id
                      ? 'bg-[#F59E0B] text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Featured Spotlight */}
            <div className="lg:col-span-4 bg-[#131C28] border border-slate-800 rounded-xl overflow-hidden">
              <div className="aspect-[4/3] bg-slate-900 overflow-hidden">
                <ResilientImage
                  src="/src/assets/images/chapter_vectors_diagram_1795627543719.jpg"
                  alt="ভার্নিয়ার ক্যালিপার্স, স্টপওয়াচ ও বলের সামান্তরিক মডেল"
                  className="w-full h-full object-cover"
                  fallbackLabel="পরিমাপ ও ভেক্টর বলবিদ্যা"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-medium text-sky-300 mb-2">
                  পড়ানোর পদ্ধতি · একাদশ শ্রেণি
                </p>
                <h3 className="font-display text-xl font-bold text-slate-100 mb-3">
                  বেসিক কনসেপ্ট থেকে সৃজনশীল দক্ষতা
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-5">
                  প্রতিটি অধ্যায় শুরু হয় মূল ধারণা ও চিত্রভিত্তিক বিশ্লেষণ দিয়ে, এরপর ধাপে ধাপে বোর্ড সৃজনশীল ও গাণিতিক সমস্যা সমাধান করানো হয়।
                </p>

                {previewClasses.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-200">
                      প্রকাশিত লেকচারসমূহ ({previewClasses.length})
                    </div>
                    {previewClasses.map((lec) => (
                      <button
                        key={lec.id}
                        type="button"
                        onClick={() => onOpenPortal(lec.id)}
                        className="w-full text-left flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-800 bg-[#0E1621] hover:border-[#F59E0B] transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-100 truncate">
                            অধ্যায় {lec.chapterNumber} · {lec.title}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {lec.duration} · {lec.isFreePreview ? 'ফ্রি প্রিভিউ' : 'ব্যাচ লেকচার'}
                          </div>
                        </div>
                        {lec.isFreePreview || isPaidStudent || isAdmin ? (
                          <Play className="w-4 h-4 text-[#FBBF24] shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Clean Chapter Ledger */}
            <div className="lg:col-span-8 bg-[#131C28] border border-slate-800 rounded-xl divide-y divide-slate-800">
              {visibleChapters.map((ch) => (
                <div
                  key={ch.number}
                  className="p-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-[#172231] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-[#FBBF24] tabular-nums">
                        {ch.titleBn}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{ch.plannedLectures}টি লেকচার</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-slate-100">
                      {ch.titleEn}
                    </h3>
                    <p className="text-sm text-slate-300 mt-1">{ch.keyTopics}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <a
                      href="#physics-lab"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('select-physics-lab-chapter', {
                            detail: { chapter: ch.number },
                          }),
                        )
                      }
                      className="text-xs font-semibold text-[#FBBF24] hover:text-amber-300 hover:underline underline-offset-4 whitespace-nowrap"
                    >
                      ল্যাব দেখো
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const chapterLecture = classes.find((c) => c.chapterNumber === ch.number);
                        onOpenPortal(chapterLecture?.id);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-[#FBBF24] shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>ক্লাস দেখো</span>
                    </button>
                  </div>
                </div>
              ))}

              {chapterFilter === 'all' && filteredChapters.length > 5 && (
                <div className="p-4 sm:px-6 flex items-center justify-between bg-[#0B1118]/50">
                  <span className="text-xs text-slate-400 tabular-nums">
                    {showAllChapters
                      ? 'সকল ১০টি অধ্যায় দেখানো হচ্ছে'
                      : 'প্রথম ৫টি অধ্যায় দেখানো হচ্ছে (মোট ১০টি)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllChapters((v) => !v)}
                    className="text-xs font-semibold text-[#FBBF24] hover:text-amber-300 hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                  >
                    {showAllChapters ? 'সংক্ষিপ্ত করো' : 'বাকি ৫টি অধ্যায় দেখো'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Physics Lab */}
      <ProjectileLab />
    </main>
  );
}
