import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Maximize2,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { ResilientImage } from './ResilientImage';

type GalleryCategory = 'all' | 'classroom' | 'achievers' | 'exams';

interface GalleryItem {
  id: string;
  indexLabel: string;
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  category: Exclude<GalleryCategory, 'all'>;
  categoryLabel: string;
  spanClass: string;
  objectPosition?: string;
  physicsTag?: string;
  highlightStat?: string;
  linkToLab?: boolean;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'auditorium-wide',
    indexLabel: '০১',
    src: '/assets/aistudio/Screenshot_2026-11-26-08-22-52-654-edit_com.facebook.katana_4c3ab565.jpg',
    alt: 'চকবাজার ক্যাম্পাসে প্রচুর শিক্ষার্থীর উপস্থিতিতে ওয়াসিম স্যারের ক্লাসরুম',
    title: 'শত শত শিক্ষার্থীর প্রাণবন্ত ক্লাসরুম',
    subtitle: 'চকবাজারের মতি টাওয়ারে পূর্ণ উপস্থিতিতে একাদশ শ্রেণির নিয়মিত পদার্থবিজ্ঞান ব্যাচ।',
    category: 'classroom',
    categoryLabel: 'ক্লাসরুম ও স্টুডিও',
    spanClass: 'lg:col-span-4',
    objectPosition: 'object-center',
    highlightStat: 'পূর্ণাঙ্গ ব্যাচ উপস্থিতি',
    physicsTag: 'মতি টাওয়ার (৫ম তলা) · চকবাজার, চট্টগ্রাম',
  },
  {
    id: 'achiever-tamimou',
    indexLabel: '০২',
    src: '/assets/aistudio/FB_IMG_1795660459435_661747cb.jpg',
    alt: 'এসএসসিতে চট্টগ্রাম বোর্ডে ৩য় স্থান অর্জনকারী শিক্ষার্থী HSC-28 ব্যাচ-০৪ এ ভর্তি হওয়ায় ওয়াসিম স্যারের উপহার',
    title: 'এসএসসি চট্টগ্রাম বোর্ড ৩য় স্থান · HSC-28 ভর্তি',
    subtitle: 'চট্টগ্রাম মহিলা সমিতি বালিকা উচ্চ বিদ্যালয় থেকে এসএসসি-তে চট্টগ্রাম বোর্ডে ৩য় (১২৬৮) অর্জনের পর HSC-28 ব্যাচ-০৪-এ ভর্তি ও ওয়াসিম স্যারের উপহার গ্রহণ।',
    category: 'achievers',
    categoryLabel: 'এসএসসি মেধাবী ও সংবর্ধনা',
    spanClass: 'lg:col-span-2',
    objectPosition: 'object-top',
    highlightStat: 'এসএসসি ১২৬৮ · HSC-28 ভর্তি',
    physicsTag: 'ভর্তিকৃত মেধাবী শিক্ষার্থীকে ভেক্টর বই ও উপহার',
  },
  {
    id: 'recording-rig',
    indexLabel: '০৩',
    src: '/assets/aistudio/Screenshot_2026-11-26-08-24-11-222_com.facebook.katana_4c68fd47.jpg',
    alt: 'স্মার্টবোর্ডে ১০ কেজি বস্তুর বল বিশ্লেষণ ও রেকর্ডিং মনিটর',
    title: '৪কে স্মার্টবোর্ড ও স্টুডিও রেকর্ডিং সেটআপ',
    subtitle: 'ঘরে বসেও যেন বোর্ডের প্রতিটি সমীকরণ স্পষ্ট দেখা যায়—তাই সরাসরি ক্যামেরা মনিটরিংয়ে রেকর্ডিং।',
    category: 'classroom',
    categoryLabel: 'ক্লাসরুম ও স্টুডিও',
    spanClass: 'lg:col-span-4',
    objectPosition: 'object-center',
    highlightStat: 'স্টুডিও রেকর্ডিং',
    physicsTag: 'বল বিভাজন: m = 10 kg বস্তুর ৪টি বলের লব্ধি নির্ণয়',
  },
  {
    id: 'achiever-ayaaz',
    indexLabel: '০৪',
    src: '/assets/aistudio/FB_IMG_1795659691353_e082aedd.jpg',
    alt: 'এসএসসিতে চট্টগ্রাম বোর্ডে ৪র্থ স্থান অর্জনকারী শিক্ষার্থী HSC-28 ব্যাচে ভর্তি হওয়ায় ওয়াসিম স্যারের উপহার প্রদান',
    title: 'এসএসসি চট্টগ্রাম বোর্ড ৪র্থ স্থান · HSC-28 ভর্তি',
    subtitle: 'নাসিরাবাদ সরকারি উচ্চ বিদ্যালয় থেকে এসএসসি-তে চট্টগ্রাম বোর্ডে ৪র্থ (১২৬৬) অর্জনের পর ওয়াসিম স্যারের HSC-28 ব্যাচে ভর্তি ও শুভেচ্ছা উপহার গ্রহণ।',
    category: 'achievers',
    categoryLabel: 'এসএসসি মেধাবী ও সংবর্ধনা',
    spanClass: 'lg:col-span-2',
    objectPosition: 'object-top',
    highlightStat: 'এসএসসি ১২৬৬ · শুভেচ্ছা উপহার',
    physicsTag: 'এসএসসি বোর্ড ৪র্থ · HSC-28 ব্যাচে সম্মাননা উপহার',
  },
  {
    id: 'smartboard-angular',
    indexLabel: '০৫',
    src: '/assets/aistudio/FB_IMG_1795659589316_15e101e1.jpg',
    alt: 'অ্যাকোস্টিক স্টুডিওতে স্মার্টবোর্ডে কৌণিক গতির ভেক্টর সম্পর্ক পড়াচ্ছেন ওয়াসিম স্যার',
    title: 'অ্যাকোস্টিক স্টুডিওতে স্মার্টবোর্ড লেকচার',
    subtitle: 'রৈখিক ও কৌণিক গতির সম্পর্ক সরাসরি ডিজিটাল বোর্ডে চিত্রসহ সহজ ব্যাখ্যা।',
    category: 'classroom',
    categoryLabel: 'ক্লাসরুম ও স্টুডিও',
    spanClass: 'lg:col-span-2',
    objectPosition: 'object-top',
    physicsTag: 'কৌণিক গতির সম্পর্ক: s = rθ · v = ωr · a = αr',
  },
  {
    id: 'sigma-hall',
    indexLabel: '০৬',
    src: '/assets/aistudio/Screenshot_2026-11-26-08-18-39-665-edit_com.facebook.katana_b13b688f.jpg',
    alt: 'সিগমা ফিজিক্স বাই ওয়াসিম স্যার — একই মূল হলে ভেক্টর ক্লাসের আরেকটি মুহূর্ত',
    title: 'মূল লেকচার হলে ভেক্টর বিশ্লেষণ ক্লাস',
    subtitle: 'হলভর্তি শিক্ষার্থীদের অংশগ্রহণে ভেক্টর লব্ধি ও বল বিশ্লেষণের প্রাণবন্ত পাঠদান।',
    category: 'classroom',
    categoryLabel: 'ক্লাসরুম ও স্টুডিও',
    spanClass: 'lg:col-span-4',
    objectPosition: 'object-center',
    highlightStat: 'সিগমা ফিজিক্স লেকচার',
    physicsTag: 'লব্ধি ভেক্টর: R = √(F₁² + F₂² + 2F₁F₂cosθ)',
  },
  {
    id: 'achiever-sadman',
    indexLabel: '০৭',
    src: '/assets/aistudio/FB_IMG_1795659565214_67bd55f0.jpg',
    alt: 'এসএসসিতে ১৩০০ এর মধ্যে ১২৭১ নম্বর অর্জনকারী শিক্ষার্থী HSC-28 ব্যাচে ভর্তি হয়ে ওয়াসিম স্যারের উপহার গ্রহণ করছে',
    title: 'এসএসসিতে ১২৭১ / ১৩০০ · HSC-28 ভর্তি',
    subtitle: 'এসএসসি-তে অসাধারণ ফলাফলের পর ওয়াসিম স্যারের HSC-28 ব্যাচে ভর্তি ও সম্মাননা উপহার গ্রহণের মুহূর্ত।',
    category: 'achievers',
    categoryLabel: 'এসএসসি মেধাবী ও সংবর্ধনা',
    spanClass: 'lg:col-span-2',
    objectPosition: 'object-top',
    highlightStat: 'এসএসসি ১২৭১ · HSC-28 ভর্তি',
    physicsTag: 'মেধাবী শিক্ষার্থীদের পছন্দের HSC-28 পদার্থবিজ্ঞান ব্যাচ',
  },
  {
    id: 'projectile-crew',
    indexLabel: '০৮',
    src: '/assets/aistudio/FB_IMG_1795659555689_e6f0c669.jpg',
    alt: 'স্মার্টবোর্ডে নেইমারের প্রক্ষেপক অঙ্কের ক্লাস শেষে শিক্ষার্থীদের সাথে ওয়াসিম স্যার',
    title: 'প্রক্ষেপক স্পেশাল ক্লাস শেষে ব্যাচের সাথে',
    subtitle: 'বোর্ডে ৩০° কোণে ৩০ m/s বেগে কিক করা বলের অঙ্ক শেষে HSC-28 ব্যাচের শিক্ষার্থীদের সাথে।',
    category: 'achievers',
    categoryLabel: 'এসএসসি মেধাবী ও সংবর্ধনা',
    spanClass: 'lg:col-span-4',
    objectPosition: 'object-top',
    physicsTag: 'প্রক্ষেপক অঙ্ক: v₀ = 30 ms⁻¹, θ = 30°',
    linkToLab: true,
  },
  {
    id: 'studio-desk-mentorship',
    indexLabel: '০৯',
    src: '/assets/aistudio/FB_IMG_1795659673722_bfb9af38.jpg',
    alt: 'স্টুডিও ডেস্কে এসএসসি মেধাবী ও HSC-28 ব্যাচে নতুন ভর্তিকৃত শিক্ষার্থীদের সাথে ওয়াসিম স্যার',
    title: 'মেধাবীদের সংবর্ধনা ও গাইডলাইন',
    subtitle: 'এসএসসি-তে দারুণ ফলাফলের পর HSC-28 ব্যাচে ভর্তিকৃত শিক্ষার্থীদের সম্মাননা উপহার ও একান্ত দিকনির্দেশনা।',
    category: 'achievers',
    categoryLabel: 'এসএসসি মেধাবী ও সংবর্ধনা',
    spanClass: 'lg:col-span-3',
    objectPosition: 'object-top',
  },
  {
    id: 'exam-desks-portrait',
    indexLabel: '১০',
    src: '/assets/aistudio/FB_IMG_1795659603663_7edf188f.jpg',
    alt: 'সায়েন্টিফিক ক্যালকুলেটর ও স্কেল নিয়ে অধ্যায়ভিত্তিক মূল্যায়ন পরীক্ষায় শিক্ষার্থীরা',
    title: 'অধ্যায়ভিত্তিক গাণিতিক অনুশীলন',
    subtitle: 'প্রতিটি থিওরির পর সরাসরি ক্লাস-টেস্ট ও ক্যালকুলেটর স্পিড প্র্যাকটিস।',
    category: 'exams',
    categoryLabel: 'মূল্যায়ন ও মেন্টরশিপ',
    spanClass: 'lg:col-span-2',
    objectPosition: 'object-center',
  },
  {
    id: 'exam-hall-wide',
    indexLabel: '১১',
    src: '/assets/aistudio/FB_IMG_1795659538514_821e4a34.jpg',
    alt: 'লিখিত সৃজনশীল ও এমসিকিউ মূল্যায়ন পরীক্ষায় ব্যস্ত শিক্ষার্থীরা',
    title: 'নিয়মিত সিকিউ + এমসিকিউ মূল্যায়ন পরীক্ষা',
    subtitle: 'বোর্ড পরীক্ষার পরিবেশে নির্ভুল উত্তর লেখার ধারাবাহিক চর্চা।',
    category: 'exams',
    categoryLabel: 'মূল্যায়ন ও মেন্টরশিপ',
    spanClass: 'lg:col-span-4',
    objectPosition: 'object-center',
  },
  {
    id: 'mentorship-lounge',
    indexLabel: '১২',
    src: '/assets/aistudio/FB_IMG_1795659822929_eacd7e6c.jpg',
    alt: 'নটর ডেম কলেজে (NDC) চান্স পাওয়ার পর ওয়াসিম স্যারের HSC ব্যাচে ভর্তি হওয়া শিক্ষার্থীদের বুফে ট্রিট',
    title: 'NDC চান্সের পর HSC ব্যাচে ভর্তি ও বুফে ট্রিট',
    subtitle: 'নটর ডেম কলেজে (NDC) সুযোগ পাওয়ার পর ওয়াসিম স্যারের HSC পদার্থবিজ্ঞান ব্যাচে ভর্তি হওয়া শিক্ষার্থীদের নিয়ে আনন্দঘন বুফে ট্রিট।',
    category: 'achievers',
    categoryLabel: 'এসএসসি মেধাবী ও সংবর্ধনা',
    spanClass: 'lg:col-span-3',
    objectPosition: 'object-center',
    highlightStat: 'NDC চান্স · HSC ব্যাচে ভর্তি',
    physicsTag: 'NDC-তে সুযোগের পর HSC-তে ওয়াসিম স্যারের কাছে ভর্তিকৃত শিক্ষার্থীদের ট্রিট',
  },
];

export function CampusGallery() {
  const [filter, setFilter] = useState<GalleryCategory>('all');
  const [stageIndex, setStageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);
  const [stageHovered, setStageHovered] = useState(false);

  const visibleItems =
    filter === 'all' ? GALLERY_ITEMS : GALLERY_ITEMS.filter((item) => item.category === filter);

  const activeItem = GALLERY_ITEMS[stageIndex] ?? GALLERY_ITEMS[0];

  const selectById = useCallback((id: string) => {
    const idx = GALLERY_ITEMS.findIndex((i) => i.id === id);
    if (idx !== -1) {
      setStageIndex(idx);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) {
        setFilter('all');
        selectById(id);
      }
    };
    window.addEventListener('select-gallery-item', handler);
    return () => window.removeEventListener('select-gallery-item', handler);
  }, [selectById]);

  const showPrev = useCallback(() => {
    const list = visibleItems.length > 0 ? visibleItems : GALLERY_ITEMS;
    const currentPos = list.findIndex((item) => item.id === activeItem.id);
    const nextPos = currentPos === -1 ? 0 : (currentPos - 1 + list.length) % list.length;
    selectById(list[nextPos].id);
  }, [visibleItems, activeItem.id, selectById]);

  const showNext = useCallback(() => {
    const list = visibleItems.length > 0 ? visibleItems : GALLERY_ITEMS;
    const currentPos = list.findIndex((item) => item.id === activeItem.id);
    const nextPos = currentPos === -1 ? 0 : (currentPos + 1) % list.length;
    selectById(list[nextPos].id);
  }, [visibleItems, activeItem.id, selectById]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setSlideshowPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (!slideshowPlaying || stageHovered || lightboxOpen) return;
    const timer = window.setInterval(() => {
      showNext();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [slideshowPlaying, stageHovered, lightboxOpen, showNext]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, showPrev, showNext]);

  return (
    <section
      id="campus-gallery"
      className="py-14 sm:py-20 border-t border-slate-800/80 bg-[#0E1621]"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header + Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium text-[#FBBF24] tracking-wide mb-2">
              অবজারভেটরি ফটো কনসোল · ১২টি বাস্তব দৃশ্যপট
            </p>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-100 text-balance">
              ক্লাসরুম, স্টুডিও ও মেধাবী সংবর্ধনার আর্কাইভ
            </h2>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#131C28] border border-slate-800 rounded-lg self-start lg:self-auto">
            {(
              [
                { id: 'all', label: 'সকল মুহূর্ত (১২)' },
                { id: 'classroom', label: 'ক্লাসরুম ও স্টুডিও' },
                { id: 'achievers', label: 'এসএসসি মেধাবী ও সংবর্ধনা' },
                { id: 'exams', label: 'মূল্যায়ন ও মেন্টরশিপ' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilter(tab.id);
                  if (tab.id !== 'all') {
                    const first = GALLERY_ITEMS.find((i) => i.category === tab.id);
                    if (first) selectById(first.id);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-[#F59E0B] text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Uncommon Interactive Observatory Cinema Console */}
        <div
          onMouseEnter={() => setStageHovered(true)}
          onMouseLeave={() => setStageHovered(false)}
          className="grid grid-cols-1 lg:grid-cols-12 border border-slate-800 rounded-2xl overflow-hidden bg-[#131C28] mb-5"
        >
          {/* Left Stage: Uncropped Full View */}
          <div className="lg:col-span-8 relative bg-[#070B11] h-[300px] sm:h-[400px] lg:h-[440px] flex items-center justify-center p-3 sm:p-5">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="w-full h-full flex items-center justify-center cursor-pointer group focus-visible:outline-none"
              aria-label="পূর্ণ স্ক্রিনে দেখো"
            >
              <ResilientImage
                key={activeItem.src}
                src={activeItem.src}
                alt={activeItem.alt}
                className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                fallbackLabel={activeItem.title}
              />
            </button>

            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="পূর্ণ স্ক্রিন"
              className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-[#0B1118]/90 border border-slate-700 rounded-lg hover:border-[#F59E0B] hover:text-[#FBBF24] transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>বড় করে দেখো</span>
            </button>
          </div>

          {/* Right Dossier Panel */}
          <div className="lg:col-span-4 p-6 sm:p-7 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-sans font-semibold text-[#FBBF24] tabular-nums">
                  {activeItem.indexLabel} / ১২
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-sky-300 font-medium">{activeItem.categoryLabel}</span>
              </div>

              <div>
                <h3 className="font-display text-2xl font-bold text-slate-50 leading-snug">
                  {activeItem.title}
                </h3>
                {activeItem.highlightStat && (
                  <p className="font-sans text-sm font-semibold text-[#FBBF24] mt-2 tabular-nums">
                    {activeItem.highlightStat}
                  </p>
                )}
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                {activeItem.subtitle}
              </p>

              {activeItem.physicsTag && (
                <div className="pt-3 border-t border-slate-800 text-xs font-sans font-medium text-sky-300">
                  {activeItem.physicsTag}
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={showPrev}
                  aria-label="আগের দৃশ্য"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-[#0B1118] border border-slate-700 rounded-lg hover:border-[#F59E0B] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>আগে</span>
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="পরের দৃশ্য"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-[#0B1118] border border-slate-700 rounded-lg hover:border-[#F59E0B] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>পরে</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSlideshowPlaying((p) => !p)}
                  aria-pressed={slideshowPlaying}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    slideshowPlaying
                      ? 'bg-[#0B1118] border-[#F59E0B]/70 text-[#FBBF24] hover:border-[#F59E0B]'
                      : 'bg-[#0B1118] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {slideshowPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>স্লাইডশো চালু</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>স্লাইডশো বিরতি</span>
                    </>
                  )}
                </button>

                {activeItem.linkToLab && (
                  <a
                    href="#physics-lab"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent('select-physics-lab-chapter', {
                          detail: { chapter: 3, preset: 'neymar' },
                        }),
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>ল্যাবে দেখো</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Interleaved Asymmetric Mosaic Selector (All 12 Photos Woven Together) */}
        <div
          className={`grid gap-3 ${
            filter === 'all'
              ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-12'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {visibleItems.map((item) => {
            const isSelected = activeItem.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectById(item.id)}
                onDoubleClick={() => {
                  selectById(item.id);
                  setLightboxOpen(true);
                }}
                className={`group relative overflow-hidden rounded-xl border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] ${
                  filter === 'all' ? `${item.spanClass} h-[165px] sm:h-[185px]` : 'h-[210px]'
                } ${
                  isSelected
                    ? 'border-[#F59E0B] bg-[#172333]'
                    : 'border-slate-800 bg-[#131C28] hover:border-slate-600'
                }`}
              >
                <ResilientImage
                  src={item.src}
                  alt={item.alt}
                  className={`w-full h-full object-cover ${item.objectPosition ?? 'object-center'} transition-transform duration-300 group-hover:scale-[1.03] ${
                    isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
                  }`}
                  fallbackLabel={item.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060A10]/95 via-[#060A10]/30 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-sans text-slate-300 mb-0.5 tabular-nums">
                    <span className={isSelected ? 'text-[#FBBF24] font-semibold' : 'text-sky-300 font-medium'}>
                      {item.indexLabel}
                    </span>
                    {item.highlightStat && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#FBBF24] truncate">{item.highlightStat}</span>
                      </>
                    )}
                  </div>
                  <div className="font-display text-xs sm:text-sm font-semibold text-slate-50 line-clamp-1">
                    {item.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-Screen Cinema Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          className="fixed inset-0 z-50 bg-[#05090F]/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="max-w-[1200px] w-full mx-auto flex items-center justify-between gap-4 pb-3 border-b border-slate-800/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-xs text-slate-300 min-w-0">
              <span className="font-mono font-semibold text-[#FBBF24] tabular-nums shrink-0">
                {String(stageIndex + 1).padStart(2, '0')} / {String(GALLERY_ITEMS.length).padStart(2, '0')}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-300 font-medium truncate">{activeItem.categoryLabel}</span>
            </div>

            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="বন্ধ করুন"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-[#131C28] border border-slate-700 rounded-lg hover:border-[#F59E0B] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>বন্ধ</span>
            </button>
          </div>

          <div
            className="max-w-[1200px] w-full mx-auto flex-1 min-h-0 flex items-center justify-center relative my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={showPrev}
              aria-label="আগের ছবি"
              className="hidden sm:flex absolute left-2 z-10 w-10 h-10 rounded-lg bg-[#131C28]/90 border border-slate-700 items-center justify-center text-slate-200 hover:border-[#F59E0B] hover:text-[#FBBF24] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <img
              src={activeItem.src}
              alt={activeItem.alt}
              referrerPolicy="no-referrer"
              className="max-h-[60vh] sm:max-h-[64vh] max-w-full w-auto object-contain rounded-lg border border-slate-800 bg-[#0B1118]"
            />

            <button
              type="button"
              onClick={showNext}
              aria-label="পরের ছবি"
              className="hidden sm:flex absolute right-2 z-10 w-10 h-10 rounded-lg bg-[#131C28]/90 border border-slate-700 items-center justify-center text-slate-200 hover:border-[#F59E0B] hover:text-[#FBBF24] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div
            className="max-w-[1200px] w-full mx-auto space-y-3 pt-3 border-t border-slate-800/80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-slate-50">
                  {activeItem.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{activeItem.subtitle}</p>
                {activeItem.physicsTag && (
                  <p className="text-xs font-sans font-medium text-sky-300 mt-1">{activeItem.physicsTag}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeItem.linkToLab && (
                  <a
                    href="#physics-lab"
                    onClick={() => {
                      setLightboxOpen(false);
                      window.dispatchEvent(
                        new CustomEvent('select-physics-lab-chapter', {
                          detail: { chapter: 3, preset: 'neymar' },
                        }),
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>ল্যাবে পরীক্ষা করো</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={showPrev}
                  className="sm:hidden inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-200 bg-[#131C28] border border-slate-700 rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>আগে</span>
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="sm:hidden inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-200 bg-[#131C28] border border-slate-700 rounded-lg cursor-pointer"
                >
                  <span>পরে</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {GALLERY_ITEMS.map((thumb, idx) => (
                <button
                  key={thumb.id}
                  type="button"
                  onClick={() => setStageIndex(idx)}
                  className={`relative w-14 h-10 rounded-md overflow-hidden border shrink-0 transition-opacity cursor-pointer ${
                    idx === stageIndex
                      ? 'border-[#F59E0B] opacity-100'
                      : 'border-slate-800 opacity-50 hover:opacity-85'
                  }`}
                >
                  <img
                    src={thumb.src}
                    alt={thumb.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
