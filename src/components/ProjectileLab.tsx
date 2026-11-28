import { useEffect, useState } from 'react';
import {
  CapillaryRiseLab,
  DopplerEffectLab,
  GravityOrbitLab,
  IdealGasLab,
  PendulumShmLab,
  WaveBeatsLab,
  YoungModulusLab,
} from './labs/MatterWaveLabs';
import {
  CircularMotionLab,
  ProjectileLabCanvas,
  RoadBankingLab,
  ScrewGaugeLab,
  VectorRainLab,
  VectorRiverLab,
  VernierCalipersLab,
  WellPumpLab,
} from './labs/MechanicsLabs';

interface LabChapterSpec {
  number: number;
  code: string;
  shortLabel: string;
  title: string;
  subtitle: string;
  subLabs?: { id: string; label: string }[];
}

const LAB_CHAPTERS: LabChapterSpec[] = [
  {
    number: 1,
    code: '০১',
    shortLabel: 'পরিমাপ ও ত্রুটি',
    title: 'ভার্নিয়ার ও স্ক্রু-গজ পরিমাপ ল্যাব',
    subtitle: 'ভার্নিয়ার ক্যালিপার্স এবং স্ক্রু-গজ (মাইক্রোমিটার) ব্যবহার করে নিখুঁত দৈর্ঘ্য ও ব্যাস পরিমাপের ইন্টারঅ্যাক্টিভ প্র্যাকটিস।',
    subLabs: [
      { id: 'vernier', label: 'ভার্নিয়ার ক্যালিপার্স' },
      { id: 'screw', label: 'স্ক্রু-গজ (মাইক্রোমিটার)' },
    ],
  },
  {
    number: 2,
    code: '০২',
    shortLabel: 'ভেক্টর',
    title: 'ভেক্টর লব্ধি, নদী-নৌকা ও আপেক্ষিক বেগ ল্যাব',
    subtitle: 'নদী পারাপার (নূন্যতম সময় ও দূরত্ব) এবং বৃষ্টি-মানুষের আপেক্ষিক বেগের ভেক্টর চিত্র বিশ্লেষণ।',
    subLabs: [
      { id: 'river', label: 'নদী-নৌকা পারাপার' },
      { id: 'rain', label: 'বৃষ্টি ও ছাতার কোণ' },
    ],
  },
  {
    number: 3,
    code: '০৩',
    shortLabel: 'গতিবিদ্যা',
    title: 'প্রাসের গতিপথ ও বৃত্তাকার গতি ল্যাব',
    subtitle: 'নিক্ষেপণ কোণ, আদিবেগ ও প্রাসের সর্বোচ্চ উচ্চতা এবং সমবৃত্তাকার গতির কেন্দ্রমুখী ত্বরণ ল্যাব।',
    subLabs: [
      { id: 'projectile', label: 'প্রাসের গতি (Projectile)' },
      { id: 'circular', label: 'সমবৃত্তাকার গতি' },
    ],
  },
  {
    number: 4,
    code: '০৪',
    shortLabel: 'নিউটনীয়ান বলবিদ্যা',
    title: 'রাস্তার ব্যাংকিং ও গতিশীল বল ল্যাব',
    subtitle: 'গাড়ির বেগ, বাঁকের ব্যাসার্ধ ও ব্যাংকিং কোণের মাধ্যমে নিরাপদে বাঁক নেওয়ার শর্ত যাচাই।',
  },
  {
    number: 5,
    code: '০৫',
    shortLabel: 'কাজ, শক্তি ও ক্ষমতা',
    title: 'কুয়া খালি করা ও পাম্পের কর্মদক্ষতা ল্যাব',
    subtitle: 'পানির স্তর, কুয়ার গভীরতা এবং পাম্পের কর্মদক্ষতা হিসাব করার কার্যকরী সিমুলেটর।',
  },
  {
    number: 6,
    code: '০৬',
    shortLabel: 'মহাকর্ষ ও অভিকর্ষ',
    title: 'উপগ্রহ কক্ষপথ ও মুক্তিবেগ ল্যাব',
    subtitle: 'ভূপৃষ্ঠ থেকে উচ্চতা পরিবর্তন করে কক্ষীয় বেগ, ভূ-স্থির উপগ্রহ এবং মুক্তিবেগ নির্ণয়।',
  },
  {
    number: 7,
    code: '০৭',
    shortLabel: 'গাঠনিক ধর্ম',
    title: 'ইয়ং গুণাঙ্ক ও কৈশিক নল উত্থান ল্যাব',
    subtitle: 'তারের প্রসারণ, পীড়ন-বিকৃতি এবং তরলে কৈশিক নল দিয়ে পানির উপরে ওঠার উচ্চতা পরিমাপ।',
    subLabs: [
      { id: 'young', label: 'তারের প্রসারণ ও ইয়ং গুণাঙ্ক' },
      { id: 'capillary', label: 'কৈশিক নল উত্থান (পৃষ্ঠটান)' },
    ],
  },
  {
    number: 8,
    code: '০৮',
    shortLabel: 'পর্যায়বৃত্ত গতি',
    title: 'সরল দোলক ও শক্তি রূপান্তর ল্যাব',
    subtitle: 'কার্যকর দৈর্ঘ্য ও বিস্তার পরিবর্তন করে সরল দোলকের দোলনকাল এবং শক্তি সংরক্ষণশীলতা যাচাই।',
  },
  {
    number: 9,
    code: '০৯',
    shortLabel: 'তরঙ্গ',
    title: 'শব্দের বিট ও ডপলার ক্রিয়া ল্যাব',
    subtitle: 'দুটি শব্দের কম্পাঙ্কের পার্থক্য থেকে বিট সৃষ্টি এবং চলমান উৎসের ক্ষেত্রে ডপলার কম্পাঙ্কের পরিবর্তন।',
    subLabs: [
      { id: 'beats', label: 'শব্দের বিট (Beats)' },
      { id: 'doppler', label: 'ডপলার ক্রিয়া (Doppler)' },
    ],
  },
  {
    number: 10,
    code: '১০',
    shortLabel: 'আদর্শ গ্যাস',
    title: 'আদর্শ গ্যাস ও অণুর গতিতত্ত্ব ল্যাব',
    subtitle: 'তাপমাত্রা ও আয়তনের সাথে গ্যাসের চাপ এবং মূল গড় বর্গবেগ (c_rms)-এর সম্পর্ক।',
  },
];

export function ProjectileLab() {
  const [activeChapter, setActiveChapter] = useState<number>(3);
  const [activeSubLab, setActiveSubLab] = useState<string>('projectile');
  const [ch3Preset, setCh3Preset] = useState<'default' | 'neymar'>('default');

  useEffect(() => {
    const handler = (ev: Event) => {
      const custom = ev as CustomEvent<{ chapter?: number; preset?: 'default' | 'neymar' }>;
      if (typeof custom.detail?.chapter === 'number') {
        setActiveChapter(custom.detail.chapter);
        const spec = LAB_CHAPTERS.find((c) => c.number === custom.detail?.chapter);
        if (spec?.subLabs && spec.subLabs.length > 0) {
          setActiveSubLab(spec.subLabs[0].id);
        }
      }
      if (custom.detail?.preset) {
        setCh3Preset(custom.detail.preset);
      }
    };
    window.addEventListener('select-physics-lab-chapter', handler);
    return () => window.removeEventListener('select-physics-lab-chapter', handler);
  }, []);

  const current = LAB_CHAPTERS.find((c) => c.number === activeChapter) ?? LAB_CHAPTERS[2];

  return (
    <section id="physics-lab" className="py-14 sm:py-20 border-t border-[#262B36] bg-[#111318]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7 sm:mb-8">
          <div>
            <p className="text-xs font-medium text-pink-300 tracking-wide mb-2">
              ওয়াসিম স্যার ফিজিক্স অবজারভেটরি ল্যাব
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 text-balance">
              {current.title}
            </h2>
          </div>
          <p className="text-sm text-slate-300 max-w-md">{current.subtitle}</p>
        </div>

        {/* Chapter Selection Bar */}
        <div
          role="tablist"
          aria-label="পদার্থবিজ্ঞান ১ম পত্রের ১০টি অধ্যায়ের ল্যাব"
          className="flex lg:grid lg:grid-cols-5 gap-2 overflow-x-auto pb-2 lg:pb-0 mb-4"
        >
          {LAB_CHAPTERS.map((chap) => {
            const isActive = chap.number === activeChapter;
            return (
              <button
                key={chap.number}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveChapter(chap.number);
                  if (chap.number !== 3) setCh3Preset('default');
                  if (chap.subLabs && chap.subLabs.length > 0) {
                    setActiveSubLab(chap.subLabs[0].id);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2.5 text-left text-xs rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 lg:shrink ${
                  isActive
                    ? 'bg-purple-500 border-purple-400 text-white font-semibold'
                    : 'bg-[#181C24] border-[#262B36] text-slate-300 hover:border-purple-400/60 hover:text-white'
                }`}
              >
                <span className={`font-mono tabular-nums ${isActive ? 'text-pink-100 font-bold' : 'text-pink-300'}`}>
                  {chap.code}
                </span>
                <span className="truncate">{chap.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Sub-Lab Concept Tabs if applicable */}
        {current.subLabs && current.subLabs.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 bg-[#181C24] p-1.5 rounded-lg border border-[#262B36]">
            <span className="text-xs text-slate-400 px-2 font-medium shrink-0">কনসেপ্ট সিলেক্টর:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {current.subLabs.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveSubLab(sub.id)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    activeSubLab === sub.id
                      ? 'bg-sky-400 text-[#0C0E13] font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white bg-[#111318]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {renderChapterLab(activeChapter, activeSubLab, ch3Preset)}
      </div>
    </section>
  );
}

function renderChapterLab(
  chapterNumber: number,
  activeSubLab: string,
  ch3Preset: 'default' | 'neymar' = 'default',
) {
  switch (chapterNumber) {
    case 1:
      return activeSubLab === 'screw' ? <ScrewGaugeLab /> : <VernierCalipersLab />;
    case 2:
      return activeSubLab === 'rain' ? <VectorRainLab /> : <VectorRiverLab />;
    case 3:
      return activeSubLab === 'circular' ? <CircularMotionLab /> : <ProjectileLabCanvas initialPreset={ch3Preset} />;
    case 4:
      return <RoadBankingLab />;
    case 5:
      return <WellPumpLab />;
    case 6:
      return <GravityOrbitLab />;
    case 7:
      return activeSubLab === 'capillary' ? <CapillaryRiseLab /> : <YoungModulusLab />;
    case 8:
      return <PendulumShmLab />;
    case 9:
      return activeSubLab === 'doppler' ? <DopplerEffectLab /> : <WaveBeatsLab />;
    case 10:
      return <IdealGasLab />;
    default:
      return <ProjectileLabCanvas initialPreset={ch3Preset} />;
  }
}

export function ChapterEmbeddedLab({ chapterNumber }: { chapterNumber: number }) {
  const spec = LAB_CHAPTERS.find((c) => c.number === chapterNumber) ?? LAB_CHAPTERS[2];
  const [activeSubLab, setActiveSubLab] = useState<string>(spec.subLabs?.[0]?.id ?? '');
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const nextSpec = LAB_CHAPTERS.find((c) => c.number === chapterNumber);
    setActiveSubLab(nextSpec?.subLabs?.[0]?.id ?? '');
  }, [chapterNumber]);

  return (
    <div className="bg-[#181C24] border border-[#262B36] rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-purple-300 mb-1">
            অধ্যায় {spec.code} · এই ক্লাসের ফিজিক্স ল্যাব
          </p>
          <h3 className="font-display text-lg sm:text-xl font-bold text-slate-100">
            {spec.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{spec.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#2E3442] bg-[#111318] text-slate-200 hover:border-white/50 hover:text-white transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          {isOpen ? 'ল্যাব সংক্ষিপ্ত করো' : 'ফিজিক্স ল্যাব খোলো'}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-3">
          {spec.subLabs && spec.subLabs.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 bg-[#111318] p-1.5 rounded-lg border border-[#262B36]">
              <span className="text-xs text-slate-400 px-2 font-medium shrink-0">কনসেপ্ট সিলেক্টর:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {spec.subLabs.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveSubLab(sub.id)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      activeSubLab === sub.id
                        ? 'bg-sky-400 text-[#0C0E13] font-semibold'
                        : 'text-slate-300 hover:text-white bg-[#181C24]'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {renderChapterLab(spec.number, activeSubLab)}
        </div>
      )}
    </div>
  );
}
