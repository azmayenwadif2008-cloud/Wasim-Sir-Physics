import React, { useMemo, useState } from 'react';
import {
  Award,
  BookCheck,
  Building2,
  Camera,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  TrendingUp,
  User as UserIcon,
  X,
} from 'lucide-react';
import { HSC28_PHYSICS_CHAPTERS } from '../data/hsc28Curriculum';
import { usePortal } from '../context/PortalContext';
import { extractPhoneFromAuthEmail } from '../lib/phoneAuth';
import { compressNoticeImage, sanitizeProfilePhotoUrl } from '../lib/videoUtils';

function getBanglaGrade(percent: number): { label: string; colorClass: string } {
  if (percent >= 80) return { label: 'A+ (অসাধারণ)', colorClass: 'text-emerald-300 bg-emerald-950/60 border-emerald-800/80' };
  if (percent >= 70) return { label: 'A (খুব ভালো)', colorClass: 'text-sky-300 bg-sky-950/60 border-sky-800/80' };
  if (percent >= 60) return { label: 'A- (ভালো)', colorClass: 'text-amber-300 bg-amber-950/50 border-amber-800/70' };
  if (percent >= 50) return { label: 'B', colorClass: 'text-slate-200 bg-slate-800/80 border-slate-700' };
  if (percent >= 40) return { label: 'C', colorClass: 'text-slate-300 bg-slate-800/70 border-slate-700' };
  if (percent >= 33) return { label: 'D', colorClass: 'text-orange-300 bg-orange-950/50 border-orange-800/70' };
  return { label: 'অকৃতকার্য', colorClass: 'text-red-300 bg-red-950/60 border-red-800/70' };
}

interface StudentProfileResultsProps {
  isAdminPreview?: boolean;
}

export function StudentProfileResults({ isAdminPreview = false }: StudentProfileResultsProps) {
  const {
    user,
    myEnrollment,
    myResults,
    classes,
    completedClassIds,
    updateMyProfile,
  } = usePortal();

  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [collegeInput, setCollegeInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [guardianPhoneInput, setGuardianPhoneInput] = useState('');
  const [sscGpaInput, setSscGpaInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [photoInput, setPhotoInput] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const stats = useMemo(() => {
    if (myResults.length === 0) {
      return { avgPercent: 0, bestPercent: 0, totalExams: 0 };
    }
    const percents = myResults.map((r) =>
      r.totalMarks > 0 ? Math.round((r.obtainedMarks / r.totalMarks) * 100) : 0,
    );
    const avgPercent = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
    const bestPercent = Math.max(...percents);
    return { avgPercent, bestPercent, totalExams: myResults.length };
  }, [myResults]);

  const startEditing = () => {
    if (!myEnrollment) return;
    setNameInput(myEnrollment.studentName);
    setCollegeInput(myEnrollment.college ?? '');
    setPhoneInput(myEnrollment.phone ?? '');
    setGuardianPhoneInput(myEnrollment.guardianPhone ?? '');
    setSscGpaInput(myEnrollment.sscGpa ?? '');
    setAddressInput(myEnrollment.address ?? '');
    setPhotoInput(myEnrollment.photoUrl ?? '');
    setFeedback(null);
    setEditingProfile(true);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    setFeedback(null);
    try {
      const compressed = await compressNoticeImage(file, { maxSide: 480, maxLength: 240000 });
      setPhotoInput(compressed);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'প্রোফাইল ছবি প্রস্তুত করা যায়নি।',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setFeedback({ type: 'err', text: 'শিক্ষার্থীর নাম খালি রাখা যাবে না।' });
      return;
    }
    setSavingProfile(true);
    setFeedback(null);
    try {
      await updateMyProfile({
        studentName: nameInput,
        college: collegeInput,
        phone: phoneInput,
        guardianPhone: guardianPhoneInput,
        sscGpa: sscGpaInput,
        address: addressInput,
        photoUrl: photoInput,
      });
      setEditingProfile(false);
      setFeedback({ type: 'ok', text: 'তোমার প্রোফাইল তথ্য সফলভাবে সেভ হয়েছে।' });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'প্রোফাইল সেভ করা যায়নি।',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const displayName =
    myEnrollment?.studentName || user?.displayName || 'HSC-28 শিক্ষার্থী';
  const safeAvatar = myEnrollment?.photoUrl
    ? sanitizeProfilePhotoUrl(myEnrollment.photoUrl)
    : '';
  const accountHandle = extractPhoneFromAuthEmail(myEnrollment?.email || user?.email);
  const completedCount = completedClassIds.size;

  const inputClass =
    'w-full px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]';

  return (
    <div className="space-y-8">
      {isAdminPreview && !myEnrollment && (
        <div className="p-4 rounded-xl border border-sky-800/70 bg-sky-950/40 text-xs text-sky-200 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-sky-300 shrink-0" />
          <span>
            Admin Preview: শিক্ষার্থীরা লগইন করে এখানে তাদের নিজস্ব প্রোফাইল ও আপনি দেওয়া ব্যক্তিগত রেজাল্ট দেখতে পাবে। শিক্ষার্থীদের তথ্য ও রেজাল্ট দিতে <strong>Admin Panel → Students / Results</strong> ট্যাব ব্যবহার করুন।
          </span>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
            feedback.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border-red-800 text-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Student Academic ID & Profile Card */}
      <div className="bg-[#131C28] border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-slate-700 bg-[#0B1118] overflow-hidden flex items-center justify-center shrink-0">
              {safeAvatar ? (
                <img
                  src={safeAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-[#FBBF24]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                <span className="font-mono font-semibold text-[#FBBF24]">
                  {myEnrollment?.rollNumber || 'HSC-28'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{myEnrollment ? 'ভেরিফায়েড ব্যাচ শিক্ষার্থী' : 'স্টুডেন্ট প্রোফাইল'}</span>
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-50 truncate">
                {displayName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {myEnrollment?.sectionTime
                  ? `ব্যাচ ও সময়: ${myEnrollment.sectionTime}`
                  : 'এইচএসসি ২০২৮ · পদার্থবিজ্ঞান ১ম পত্র'}
              </p>
            </div>
          </div>

          {myEnrollment && !editingProfile && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] rounded-lg transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>প্রোফাইল এডিট করো</span>
            </button>
          )}
        </div>

        {editingProfile ? (
          <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-5 bg-[#0E1621]">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-100">
                নিজের প্রোফাইল তথ্য আপডেট করো
              </h3>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>বাতিল</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-slate-800 bg-[#0B1118]">
              <div className="w-14 h-14 rounded-xl border border-slate-700 bg-[#131C28] overflow-hidden flex items-center justify-center shrink-0">
                {sanitizeProfilePhotoUrl(photoInput) ? (
                  <img
                    src={sanitizeProfilePhotoUrl(photoInput)}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/70 rounded-lg cursor-pointer transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'প্রস্তুত হচ্ছে...' : 'প্রোফাইল ছবি আপলোড'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto || savingProfile}
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
                {photoInput && (
                  <button
                    type="button"
                    onClick={() => setPhotoInput('')}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    ছবি সরাও
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  তোমার পুরো নাম
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  কলেজের নাম
                </label>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="যেমন: চট্টগ্রাম কলেজ"
                  value={collegeInput}
                  onChange={(e) => setCollegeInput(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  তোমার মোবাইল নাম্বার
                </label>
                <input
                  type="tel"
                  maxLength={24}
                  placeholder="01XXXXXXXXX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  অভিভাবকের মোবাইল নাম্বার
                </label>
                <input
                  type="tel"
                  maxLength={24}
                  placeholder="01XXXXXXXXX"
                  value={guardianPhoneInput}
                  onChange={(e) => setGuardianPhoneInput(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  এসএসসি জিপিএ / স্কোর
                </label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="যেমন: GPA 5.00 (1245/1300)"
                  value={sscGpaInput}
                  onChange={(e) => setSscGpaInput(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  বর্তমান ঠিকানা
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="যেমন: চকবাজার, চট্টগ্রাম"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile || uploadingPhoto}
                className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {savingProfile ? 'সেভ হচ্ছে...' : 'তথ্য সেভ করো'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#0B1118] border border-slate-800 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span>কলেজ</span>
              </div>
              <div className="text-sm font-medium text-slate-100">
                {myEnrollment?.college || 'যোগ করা হয়নি'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0B1118] border border-slate-800 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>শিক্ষার্থীর মোবাইল / অ্যাকাউন্ট</span>
              </div>
              <div className="text-sm font-mono text-slate-100">
                {myEnrollment?.phone || accountHandle}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0B1118] border border-slate-800 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FBBF24]" />
                <span>অভিভাবকের মোবাইল</span>
              </div>
              <div className="text-sm font-mono text-slate-100">
                {myEnrollment?.guardianPhone || 'যোগ করা হয়নি'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0B1118] border border-slate-800 space-y-1">
              <div className="text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                <span>এসএসসি জিপিএ / স্কোর</span>
              </div>
              <div className="text-sm font-medium text-slate-100">
                {myEnrollment?.sscGpa || 'যোগ করা হয়নি'}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0B1118] border border-slate-800 space-y-1 sm:col-span-2">
              <div className="text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>ঠিকানা</span>
              </div>
              <div className="text-sm font-medium text-slate-100">
                {myEnrollment?.address || 'যোগ করা হয়নি'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Performance & Progress Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#131C28] border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>মোট পরীক্ষা দিয়েছ</span>
          </div>
          <div className="font-display text-2xl font-bold text-slate-100 tabular-nums">
            {stats.totalExams}টি
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#131C28] border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>গড় স্কোর</span>
          </div>
          <div className="font-display text-2xl font-bold text-sky-300 tabular-nums">
            {stats.avgPercent}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#131C28] border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>সর্বোচ্চ স্কোর</span>
          </div>
          <div className="font-display text-2xl font-bold text-emerald-300 tabular-nums">
            {stats.bestPercent}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#131C28] border border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <BookCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>সম্পন্ন ক্লাস</span>
          </div>
          <div className="font-display text-2xl font-bold text-slate-100 tabular-nums">
            {completedCount} / {classes.length}
          </div>
        </div>
      </div>

      {/* 3. Individual Exam Results */}
      <div className="bg-[#131C28] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-50">
              ব্যক্তিগত পরীক্ষার ফলাফল (Individual Results)
            </h3>
            <p className="text-xs text-slate-400">
              এই ফলাফলগুলো সম্পূর্ণ প্রাইভেট—শুধুমাত্র তুমি ও ওয়াসিম স্যার দেখতে পাবেন।
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
            {myResults.length} ফলাফল
          </span>
        </div>

        {myResults.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Award className="w-7 h-7 text-slate-500 mx-auto" />
            <p className="text-sm font-medium text-slate-200">
              এখনো কোনো পরীক্ষার রেজাল্ট প্রকাশিত হয়নি
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              ব্যাচের সাপ্তাহিক বা অধ্যায়ভিত্তিক পরীক্ষা দেওয়ার পর ওয়াসিম স্যার এখানে তোমার ব্যক্তিগত নম্বর ও মূল্যায়ন প্রকাশ করবেন।
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {myResults.map((res) => {
              const pct =
                res.totalMarks > 0
                  ? Math.round((res.obtainedMarks / res.totalMarks) * 100)
                  : 0;
              const grade = getBanglaGrade(pct);
              const chapterMeta = res.chapterNumber
                ? HSC28_PHYSICS_CHAPTERS.find((c) => c.number === res.chapterNumber)
                : null;

              return (
                <article key={res.id} className="p-5 sm:p-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-sky-300">{res.examDate}</span>
                        {chapterMeta && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#FBBF24] font-medium">
                              {chapterMeta.titleBn}
                            </span>
                          </>
                        )}
                      </div>
                      <h4 className="font-display text-base sm:text-lg font-bold text-slate-100">
                        {res.examTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-display text-xl font-bold text-slate-50 tabular-nums">
                          {res.obtainedMarks}{' '}
                          <span className="text-sm font-normal text-slate-400">
                            / {res.totalMarks}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-400 tabular-nums">
                          {pct}% নম্বর
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold border rounded-lg ${grade.colorClass}`}
                      >
                        {grade.label}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-[#0B1118] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F59E0B] to-[#38BDF8] rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>

                  {/* Breakdown Details */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-300">
                    {res.cqMarks !== undefined && (
                      <span>
                        সৃজনশীল (CQ): <strong className="font-mono text-slate-100">{res.cqMarks}</strong>
                      </span>
                    )}
                    {res.mcqMarks !== undefined && (
                      <span>
                        বহুনির্বাচনী (MCQ): <strong className="font-mono text-slate-100">{res.mcqMarks}</strong>
                      </span>
                    )}
                    {res.highestMarks !== undefined && (
                      <span>
                        ব্যাচ সর্বোচ্চ: <strong className="font-mono text-emerald-300">{res.highestMarks}</strong>
                      </span>
                    )}
                    {res.meritRank && (
                      <span>
                        মেধাস্থান: <strong className="font-mono text-[#FBBF24]">{res.meritRank}</strong>
                      </span>
                    )}
                  </div>

                  {res.remarks && (
                    <div className="p-3 rounded-lg bg-[#0B1118] border border-slate-800/90 text-xs text-slate-300">
                      <span className="font-semibold text-[#FBBF24]">ওয়াসিম স্যারের মন্তব্য: </span>
                      <span>{res.remarks}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
