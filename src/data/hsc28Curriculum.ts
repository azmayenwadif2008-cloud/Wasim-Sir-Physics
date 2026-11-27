import type { ChapterMeta } from '../types/portal';

export const ADMIN_BOOTSTRAP_EMAIL = 'azmayen.wadif2008@gmail.com';

export const HSC28_PHYSICS_CHAPTERS: ChapterMeta[] = [
  {
    number: 1,
    titleEn: 'ভৌত জগৎ ও পরিমাপ',
    titleBn: 'অধ্যায় ০১',
    group: 'Mechanics',
    plannedLectures: 4,
    keyTopics: 'ভার্নিয়ার স্কেল, স্ক্রু-গজ, পরিমাপের ত্রুটি বিশ্লেষণ ও মাত্রা সমীকরণ',
  },
  {
    number: 2,
    titleEn: 'ভেক্টর',
    titleBn: 'অধ্যায় ০২',
    group: 'Mechanics',
    plannedLectures: 14,
    keyTopics: 'নদী-নৌকা, বৃষ্টি-ছাতা, ডট ও ক্রস গুণন, ভেক্টর ক্যালকুলাস',
  },
  {
    number: 3,
    titleEn: 'গতিবিদ্যা',
    titleBn: 'অধ্যায় ০৩',
    group: 'Mechanics',
    plannedLectures: 12,
    keyTopics: 'প্রাসের গতি, গতি লেখচিত্র, পড়ন্ত বস্তু ও বৃত্তাকার গতি',
  },
  {
    number: 4,
    titleEn: 'নিউটনীয়ান বলবিদ্যা',
    titleBn: 'অধ্যায় ০৪',
    group: 'Mechanics',
    plannedLectures: 15,
    keyTopics: 'ভরবেগের সংরক্ষণ, টর্ক, জড়তার ভ্রামক ও রাস্তার ব্যাংকিং',
  },
  {
    number: 5,
    titleEn: 'কাজ, শক্তি ও ক্ষমতা',
    titleBn: 'অধ্যায় ০৫',
    group: 'Mechanics',
    plannedLectures: 10,
    keyTopics: 'পরিবর্তনশীল বলের কাজ, স্প্রিং বিভব শক্তি, কুয়া ও পাম্পের কর্মদক্ষতা',
  },
  {
    number: 6,
    titleEn: 'মহাকর্ষ ও অভিকর্ষ',
    titleBn: 'অধ্যায় ০৬',
    group: 'Mechanics',
    plannedLectures: 9,
    keyTopics: 'অভিকর্ষজ ত্বরণের পরিবর্তন, মুক্তিবেগ, ভূ-স্থির উপগ্রহ ও কেপলারের সূত্র',
  },
  {
    number: 7,
    titleEn: 'পদার্থের গাঠনিক ধর্ম',
    titleBn: 'অধ্যায় ০৭',
    group: 'Waves & Matter',
    plannedLectures: 10,
    keyTopics: 'ইয়ং গুণাঙ্ক, পয়সনের অনুপাত, পৃষ্ঠটান, কৈশিক নল ও সান্দ্রতা',
  },
  {
    number: 8,
    titleEn: 'পর্যায়বৃত্ত গতি',
    titleBn: 'অধ্যায় ০৮',
    group: 'Waves & Matter',
    plannedLectures: 10,
    keyTopics: 'সরল ছন্দিত স্পন্দনের সমীকরণ, সরল দোলক ও শক্তির লেখচিত্র',
  },
  {
    number: 9,
    titleEn: 'তরঙ্গ',
    titleBn: 'অধ্যায় ০৯',
    group: 'Waves & Matter',
    plannedLectures: 9,
    keyTopics: 'অগ্রগামী ও স্থির তরঙ্গ, অর্গান পাইপ, বিট ও তীব্রতা লেভেল',
  },
  {
    number: 10,
    titleEn: 'আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব',
    titleBn: 'অধ্যায় ১০',
    group: 'Waves & Matter',
    plannedLectures: 9,
    keyTopics: 'মূল গড় বর্গবেগ, স্বাধীনতার মাত্রা, শিশিরাঙ্ক ও আপেক্ষিক আর্দ্রতা',
  },
];

export const SAMPLE_SEED_CLASSES = [
  {
    id: 'ch2-lec01-river-boat-bn',
    title: 'ভেক্টর বিভাজন ও নদী-নৌকার সকল গাণিতিক সমস্যা',
    chapterNumber: 2,
    chapterName: 'ভেক্টর',
    lectureNumber: 1,
    duration: '58:20',
    description:
      'ন্যূনতম সময়ে ও ন্যূনতম দূরত্বে নদী পারাপারের মূল সূত্র, লব্ধি বেগের দিক নির্ণয় এবং বোর্ড সৃজনশীল (সিকিউ) সমাধান।',
    isFreePreview: true,
    videoUrl: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
    noteUrl: 'https://drive.google.com',
  },
  {
    id: 'ch2-lec02-vector-calculus-bn',
    title: 'ভেক্টর ক্যালকুলাস: গ্রেডিয়েন্ট, ডাইভার্জেন্স ও কার্ল',
    chapterNumber: 2,
    chapterName: 'ভেক্টর',
    lectureNumber: 2,
    duration: '1:04:15',
    description:
      'ডেল অপারেটরের প্রয়োগ, অঘূর্ণনশীল ও সলিনয়ডাল ভেক্টর ক্ষেত্র যাচাই এবং অ্যাডমিশন লেভেলের গাণিতিক অনুশীলন।',
    isFreePreview: false,
    videoUrl: 'https://www.youtube.com/watch?v=rB83DpBJQsE',
    noteUrl: 'https://drive.google.com',
  },
  {
    id: 'ch3-lec01-projectile-bn',
    title: 'প্রাসের গতিপথের সমীকরণ, সর্বোচ্চ উচ্চতা ও পাল্লা',
    chapterNumber: 3,
    chapterName: 'গতিবিদ্যা',
    lectureNumber: 1,
    duration: '1:12:40',
    description:
      'পরাবৃত্তাকার গতিপথের প্রতিপাদন, সম্পূরক কোণে সমান পাল্লার শর্ত এবং তির্যক তলে প্রাস নিক্ষেপের কৌশল।',
    isFreePreview: false,
    videoUrl: 'https://www.youtube.com/watch?v=ZZ6wM4L4q4A',
    noteUrl: 'https://drive.google.com',
  },
  {
    id: 'ch4-lec01-inertia-bn',
    title: 'ঘূর্ণন গতি: জড়তার ভ্রামক ও সমান্তরাল অক্ষ উপপাদ্য',
    chapterNumber: 4,
    chapterName: 'নিউটনীয়ান বলবিদ্যা',
    lectureNumber: 1,
    duration: '1:08:05',
    description:
      'দণ্ড, চাকতি ও সিলিন্ডারের জড়তার ভ্রামক নির্ণয় এবং রাস্তার ব্যাংকিং কোণের গাণিতিক বিশ্লেষণ।',
    isFreePreview: false,
    videoUrl: 'https://www.youtube.com/watch?v=f2V3q6M5qW8',
    noteUrl: 'https://drive.google.com',
  },
];

export const SAMPLE_SEED_NOTICES = [
  {
    id: 'notice-hsc28-routine-bn',
    title: 'এইচএসসি ২০২৮ ব্যাচ — অধ্যায় ২ ও ৩ সাপ্তাহিক ক্লাস রুটিন',
    body: 'প্রতি রবি, মঙ্গল ও বৃহস্পতিবার রাত ৮টায় ভেক্টর এবং গতিবিদ্যার নতুন রেকর্ডেড লেকচার আপলোড করা হবে। ক্লাস দেখার আগে বোর্ড পিডিএফ নোট ডাউনলোড করে রাখো।',
    category: 'Routine' as const,
    audience: 'public' as const,
    pinned: true,
  },
  {
    id: 'notice-cq-exam-ch2-bn',
    title: 'অধ্যায় ২ (ভেক্টর) সিকিউ + এমসিকিউ মূল্যায়ন পরীক্ষা — আগামী শুক্রবার',
    body: 'সিলেবাস: সম্পূর্ণ অধ্যায় ২ (নদী-নৌকা, বৃষ্টি-ছাতা ও ভেক্টর ক্যালকুলাস)। বিকাল ৪:০০ টায় প্রশ্নপত্র উন্মুক্ত হবে। অনুমোদিত ব্যাচের শিক্ষার্থীরা অংশগ্রহণ করতে পারবে।',
    category: 'Exam' as const,
    audience: 'paid' as const,
    pinned: true,
  },
  {
    id: 'notice-batch-entry-bn',
    title: 'স্টুডেন্ট প্যানেলে প্রবেশের নির্দেশনা',
    body: 'প্রথমবার নাম, মোবাইল নাম্বার ও পাসওয়ার্ড দিয়ে রেজিস্ট্রেশন করার পর অ্যাপ্রুভাল পেলে মোবাইল নাম্বার ও পাসওয়ার্ড দিয়ে লগইন করেই সকল অধ্যায়ের রেকর্ডেড ক্লাস ও হ্যান্ড-রিটেন নোট দেখতে পারবে।',
    category: 'General' as const,
    audience: 'public' as const,
    pinned: false,
  },
];
