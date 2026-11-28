import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Play,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Video,
  XCircle,
} from 'lucide-react';
import { HSC28_PHYSICS_CHAPTERS } from '../data/hsc28Curriculum';
import { usePortal } from '../context/PortalContext';
import { extractPhoneFromAuthEmail, isStudentPhoneEmail } from '../lib/phoneAuth';
import { parseVideoUrl } from '../lib/videoUtils';
import type { ClassStream, PaymentMethod, RecordedClass } from '../types/portal';
import { AdminStudio } from './AdminStudio';
import { NoticeMediaViewer } from './NoticeMediaViewer';
import { ChapterEmbeddedLab } from './ProjectileLab';
import { StudentProfileResults } from './StudentProfileResults';

interface StudentPortalProps {
  preselectedClassId?: string | null;
  authRoleRequest?: { role: 'student' | 'admin'; seq: number } | null;
}

export function StudentPortal({ preselectedClassId, authRoleRequest }: StudentPortalProps) {
  const {
    // Student & public track
    user,
    authReady,
    isPaidStudent,
    needsLegacyGmailLink,
    legacyMigrationClaimEmail,
    needsStudentEmailVerification,
    myEnrollment,
    myRequest,
    myResults,
    classes,
    notices,
    completedClassIds,
    loadingData,
    enrollmentChecked,
    authError,
    needsEmailProviderEnable,
    clearAuthFeedback,
    signInWithGoogle,
    registerStudentAccount,
    loginStudentWithIdentifier,
    linkLegacyStudentGmail,
    sendStudentPasswordReset,
    verifyStudentPasswordResetCode,
    confirmStudentPasswordReset,
    resendStudentVerification,
    refreshStudentVerifiedSession,
    logout,
    fetchClassStream,
    toggleLectureCompleted,
    submitEnrollmentRequest,
    // Admin isolated track
    adminUser,
    adminAuthReady,
    isAdmin,
    needsAdminEmailVerification,
    adminAuthError,
    adminNeedsEmailProviderEnable,
    clearAdminAuthFeedback,
    signInAdminWithGoogle,
    loginAdminWithEmailPassword,
    registerAdminWithEmailPassword,
    resendAdminVerification,
    refreshVerifiedSession,
    logoutAdmin,
  } = usePortal();

  // Panel switcher state: independent sessions for Student Panel vs Admin Panel
  const [panelMode, setPanelMode] = useState<'student' | 'admin'>(
    authRoleRequest?.role ?? 'student',
  );
  const [studentAuthMode, setStudentAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [adminAuthMode, setAdminAuthMode] = useState<'login' | 'setup'>('login');

  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPass, setStudentPass] = useState('');
  const [showStudentPass, setShowStudentPass] = useState(false);
  const [studentRegName, setStudentRegName] = useState('');
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [resetSentEmail, setResetSentEmail] = useState<string | null>(null);
  const [studentVerifSent, setStudentVerifSent] = useState(false);
  const [studentVerifCheckNote, setStudentVerifCheckNote] = useState<string | null>(null);
  const [urlResetCode, setUrlResetCode] = useState<string | null>(null);
  const [urlResetEmail, setUrlResetEmail] = useState<string | null>(null);
  const [urlResetNewPass, setUrlResetNewPass] = useState('');
  const [urlResetDone, setUrlResetDone] = useState(false);
  const [legacyGmailInput, setLegacyGmailInput] = useState('');
  const [legacyCurrentPass, setLegacyCurrentPass] = useState('');
  const [showLegacyPass, setShowLegacyPass] = useState(false);
  const [legacyLinkMessage, setLegacyLinkMessage] = useState<string | null>(null);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  // Student workspace state
  const [portalTab, setPortalTab] = useState<'classroom' | 'notices' | 'profile'>('classroom');
  const [selectedClass, setSelectedClass] = useState<RecordedClass | null>(null);
  const [activeStream, setActiveStream] = useState<ClassStream | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [chapterFilter, setChapterFilter] = useState<number | 'all'>('all');
  const [lectureSearch, setLectureSearch] = useState('');
  const [emptyLabChapter, setEmptyLabChapter] = useState<number>(3);

  const videoPlayerRef = useRef<HTMLDivElement>(null);

  const handleSelectClass = (lec: RecordedClass) => {
    setSelectedClass(lec);
    setPortalTab('classroom');
    setTimeout(() => {
      videoPlayerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  // Verification & Approval Request Form for pending / Google students
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqCollege, setReqCollege] = useState('');
  const [reqMethod, setReqMethod] = useState<PaymentMethod>('bKash');
  const [reqTxId, setReqTxId] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [verificationSentNote, setVerificationSentNote] = useState(false);
  const [verificationCheckNote, setVerificationCheckNote] = useState<string | null>(null);

  const hasVaultAccess = isPaidStudent;

  useEffect(() => {
    if (authRoleRequest && authRoleRequest.seq > 0) {
      setPanelMode(authRoleRequest.role);
      clearAuthFeedback();
      clearAdminAuthFeedback();
      if (preselectedClassId && authRoleRequest.role === 'student') {
        setPortalTab('classroom');
      }
    }
  }, [
    authRoleRequest?.seq,
    authRoleRequest?.role,
    preselectedClassId,
    clearAuthFeedback,
    clearAdminAuthFeedback,
  ]);

  useEffect(() => {
    if (!user) return;
    setReqName((prev) => prev || myRequest?.studentName || user.displayName || '');
    setReqPhone((prev) => {
      if (prev) return prev;
      if (myRequest?.phone) return myRequest.phone;
      return isStudentPhoneEmail(user.email) ? extractPhoneFromAuthEmail(user.email) : '';
    });
    if (myRequest?.college) {
      setReqCollege((prev) => prev || myRequest.college || '');
    }
    if (myRequest?.transactionId) {
      setReqTxId((prev) => prev || myRequest.transactionId || '');
    }
  }, [user, myRequest]);

  useEffect(() => {
    if (!user) {
      setPortalTab('classroom');
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'resetPassword' && oobCode) {
      setUrlResetCode(oobCode);
      void verifyStudentPasswordResetCode(oobCode)
        .then((email) => setUrlResetEmail(email))
        .catch(() => {
          setUrlResetCode(null);
        });
    }
  }, [verifyStudentPasswordResetCode]);

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedClass(null);
      return;
    }
    if (preselectedClassId) {
      const found = classes.find((c) => c.id === preselectedClassId);
      if (found) {
        setSelectedClass(found);
        setPortalTab('classroom');
        return;
      }
    }
    if (!selectedClass || !classes.some((c) => c.id === selectedClass.id)) {
      setSelectedClass(classes[0]);
    }
  }, [classes, preselectedClassId, selectedClass]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!selectedClass) {
        setActiveStream(null);
        return;
      }
      if (!hasVaultAccess && !selectedClass.isFreePreview) {
        setActiveStream(null);
        return;
      }
      setLoadingStream(true);
      try {
        const stream = await fetchClassStream(selectedClass.id);
        if (active) setActiveStream(stream);
      } finally {
        if (active) setLoadingStream(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selectedClass, hasVaultAccess, fetchClassStream]);

  const filteredClasses = useMemo(() => {
    return classes.filter((lec) => {
      if (chapterFilter !== 'all' && lec.chapterNumber !== chapterFilter) return false;
      const q = lectureSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        lec.title.toLowerCase().includes(q) ||
        lec.chapterName.toLowerCase().includes(q)
      );
    });
  }, [classes, chapterFilter, lectureSearch]);

  const parsedEmbed = useMemo(() => {
    return activeStream ? parseVideoUrl(activeStream.videoUrl) : null;
  }, [activeStream]);

  const completedCount = useMemo(() => {
    return classes.filter((c) => completedClassIds.has(c.id)).length;
  }, [classes, completedClassIds]);

  const progressPercent = classes.length > 0 ? Math.round((completedCount / classes.length) * 100) : 0;

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setResetSentEmail(null);
    try {
      if (studentAuthMode === 'register') {
        await registerStudentAccount({
          studentName: studentRegName,
          phone: studentPhone,
          email: studentEmail,
          password: studentPass,
        });
      } else if (studentAuthMode === 'forgot') {
        await sendStudentPasswordReset(resetEmailInput);
        setResetSentEmail(resetEmailInput.trim().toLowerCase());
      } else {
        await loginStudentWithIdentifier(studentIdentifier, studentPass);
      }
    } catch {
      // Error surfaced via authError
    } finally {
      setAuthBusy(false);
    }
  };

  const handleConfirmUrlPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlResetCode) return;
    setAuthBusy(true);
    try {
      await confirmStudentPasswordReset(urlResetCode, urlResetNewPass);
      setUrlResetDone(true);
      setUrlResetCode(null);
      setStudentAuthMode('login');
      if (urlResetEmail) {
        setStudentIdentifier(urlResetEmail);
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      // Error surfaced via authError
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLegacyGmailLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setLegacyLinkMessage(null);
    try {
      await linkLegacyStudentGmail(legacyGmailInput, legacyCurrentPass);
      setLegacyLinkMessage(
        `${legacyGmailInput.trim().toLowerCase()} ঠিকানায় ভেরিফিকেশন লিংক পাঠানো হয়েছে। ইনবক্সে (না পেলে Spam ফোল্ডারে) গিয়ে লিংকে ক্লিক করে ভেরিফাই করো।`,
      );
      setLegacyCurrentPass('');
    } catch {
      // Error surfaced via authError
    } finally {
      setAuthBusy(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      if (adminAuthMode === 'setup') {
        await registerAdminWithEmailPassword(adminEmailInput, adminPassInput);
      } else {
        await loginAdminWithEmailPassword(adminEmailInput, adminPassInput);
      }
    } catch {
      // Error surfaced via authError
    } finally {
      setAuthBusy(false);
    }
  };

  const handleReferenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setReqSubmitting(true);
    setReqSuccess(false);
    setReqError(null);
    try {
      await submitEnrollmentRequest({
        studentName: reqName || myRequest?.studentName || user.displayName || '',
        phone:
          reqPhone ||
          myRequest?.phone ||
          (isStudentPhoneEmail(user.email) ? extractPhoneFromAuthEmail(user.email) : ''),
        college: reqCollege,
        paymentMethod: reqMethod,
        transactionId: reqTxId,
      });
      setReqSuccess(true);
    } catch (err) {
      setReqError(err instanceof Error ? err.message : 'তথ্য সংরক্ষণ করা যায়নি।');
    } finally {
      setReqSubmitting(false);
    }
  };

  const renderDualLoginCard = (activeRole: 'student' | 'admin') => {
    const activeError = activeRole === 'admin' ? adminAuthError : authError;
    const activeNeedsEnable =
      activeRole === 'admin' ? adminNeedsEmailProviderEnable : needsEmailProviderEnable;

    return (
      <section className="observatory-grid-bg min-h-[calc(100vh-140px)] flex items-center">
        <div className="max-w-[1200px] w-full mx-auto px-6 py-12 lg:py-16">
          <div className="max-w-lg mx-auto bg-[#181C24] border border-[#262B36] rounded-xl overflow-hidden">
            {/* Role Selector Header */}
            <div className="grid grid-cols-2 border-b border-[#262B36] bg-[#14171D]">
              <button
                type="button"
                onClick={() => {
                  setPanelMode('student');
                  clearAuthFeedback();
                  clearAdminAuthFeedback();
                }}
                className={`py-4 text-xs font-semibold transition-colors cursor-pointer ${
                  activeRole === 'student'
                    ? 'bg-[#181C24] text-purple-300 border-b-2 border-purple-400'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Student Login (স্টুডেন্ট)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPanelMode('admin');
                  clearAuthFeedback();
                  clearAdminAuthFeedback();
                }}
                className={`py-4 text-xs font-semibold transition-colors cursor-pointer ${
                  activeRole === 'admin'
                    ? 'bg-[#181C24] text-sky-300 border-b-2 border-sky-400'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Admin Panel (Wasim Sir)
              </button>
            </div>

            <div className="p-7 sm:p-9">
              {activeError && (
                <div className="mb-5 p-3.5 rounded-lg bg-[#CBD5E1]/10 border border-[#CBD5E1]/30 text-xs text-[#E2E8F0] space-y-2.5">
                  <div className="font-medium">{activeError}</div>
                  {activeNeedsEnable && (
                    <div className="pt-2.5 border-t border-[#CBD5E1]/20 text-[11px] text-slate-200 space-y-2">
                      <div className="font-semibold text-pink-300">
                        কোনো অ্যাপ ডাউনলোড করতে হবে না — ব্রাউজারে ১৫ সেকেন্ডে চালু করুন:
                      </div>
                      <p>1. নিচের বাটনে ক্লিক করে Firebase Authentication → Sign-in method পেজ খুলুন।</p>
                      <p>2. Add new provider → Email/Password চালু (Enable) করে Save দিন।</p>
                      <p className="text-sky-300">
                        টিপস: ততক্ষণ নিচের Google বাটন দিয়ে Student ও Admin লগইন/রেজিস্ট্রেশন এখনই করতে পারবেন।
                      </p>
                      <a
                        href="https://console.firebase.google.com/project/cybernetic-sound-xv0ns/authentication/providers"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-md transition-colors"
                      >
                        <span>Firebase Console-এ Email/Password চালু করুন</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {activeRole === 'student' ? (
                urlResetCode ? (
                  <div className="space-y-5">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-slate-50 mb-1.5">
                        নতুন পাসওয়ার্ড সেট করো
                      </h1>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {urlResetEmail ? (
                          <>
                            <span className="font-mono text-sky-300">{urlResetEmail}</span> একাউন্টের জন্য নতুন পাসওয়ার্ড লিখো।
                          </>
                        ) : (
                          'তোমার একাউন্টের জন্য কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড লিখো।'
                        )}
                      </p>
                    </div>
                    <form onSubmit={handleConfirmUrlPasswordReset} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showStudentPass ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="••••••••"
                            value={urlResetNewPass}
                            onChange={(e) => setUrlResetNewPass(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowStudentPass((prev) => !prev)}
                            aria-label={showStudentPass ? 'পাসওয়ার্ড লুকাও' : 'পাসওয়ার্ড দেখো'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                          >
                            {showStudentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={authBusy}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>{authBusy ? 'সেভ হচ্ছে...' : 'নতুন পাসওয়ার্ড সেভ করো'}</span>
                      </button>
                    </form>
                  </div>
                ) : (
                <div className="space-y-6">
                  {urlResetDone && (
                    <div className="p-3.5 rounded-lg bg-green-950/60 border border-green-700 text-xs text-green-200">
                      নতুন পাসওয়ার্ড সেভ হয়েছে। এখন তোমার Gmail ও নতুন পাসওয়ার্ড দিয়ে লগইন করো।
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-medium text-pink-300 mb-1.5">
                      চট্টগ্রামের পদার্থবিজ্ঞানের বৃহত্তম কম্পিটিটিভ প্ল্যাটফর্ম · HSC &apos;28
                    </p>
                    <h1 className="font-display text-2xl font-bold text-slate-50 mb-1.5">
                      {studentAuthMode === 'login'
                        ? 'স্টুডেন্ট লগইন'
                        : studentAuthMode === 'register'
                          ? 'প্রথমবার রেজিস্ট্রেশন'
                          : 'পাসওয়ার্ড রিসেট (Gmail)'}
                    </h1>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {studentAuthMode === 'login'
                        ? 'অফিসে ভর্তির মোবাইল নাম্বার অথবা তোমার রেজিস্টার করা Gmail — যেকোনো একটি এবং পাসওয়ার্ড দিয়ে প্রবেশ করো।'
                        : studentAuthMode === 'register'
                          ? 'প্রথমবার রেজিস্ট্রেশনে অফিসে ভর্তির সময় ব্যবহৃত মোবাইল নাম্বার এবং তোমার আসল Gmail দুটিই লাগবে। পাসওয়ার্ড ভুলে গেলে রিসেট করার জন্য আসল Gmail প্রয়োজন।'
                          : 'তোমার রেজিস্টার করা আসল Gmail দাও। Gmail ইনবক্সে নিরাপদ ওয়ান-টাইম পাসওয়ার্ড রিসেট লিংক পাঠানো হবে।'}
                    </p>
                  </div>

                  {studentAuthMode === 'login' && !activeError && (
                    <div className="p-3.5 rounded-lg bg-purple-950/40 border border-purple-700/60 text-[11px] text-purple-200 leading-relaxed">
                      পাসওয়ার্ড ভুলে গেলে রিসেট করার সুবিধার জন্য সবার একাউন্টে আসল <strong className="text-white">Gmail</strong> থাকা জরুরি। আগে শুধু মোবাইল নাম্বার দিয়ে খোলা থাকলে এখন লগইন করেই তোমার Gmail যুক্ত করে নাও।
                    </div>
                  )}

                  {/* Login vs 1st Time Registration Switch */}
                  {studentAuthMode !== 'forgot' && (
                    <div className="grid grid-cols-2 gap-1 p-1 bg-[#0C0E13] border border-[#262B36] rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setStudentAuthMode('login');
                          setResetSentEmail(null);
                          clearAuthFeedback();
                        }}
                        className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          studentAuthMode === 'login'
                            ? 'bg-purple-500 text-white'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        স্টুডেন্ট লগইন
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentAuthMode('register');
                          setResetSentEmail(null);
                          clearAuthFeedback();
                        }}
                        className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          studentAuthMode === 'register'
                            ? 'bg-purple-500 text-white'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        নতুন রেজিস্ট্রেশন
                      </button>
                    </div>
                  )}

                  {studentAuthMode === 'forgot' ? (
                    <form onSubmit={handleStudentSubmit} className="space-y-4">
                      {resetSentEmail && (
                        <div className="p-4 rounded-lg bg-green-950/60 border border-green-700 text-xs text-green-200 space-y-1.5 leading-relaxed">
                          <div className="font-semibold text-green-300">
                            রিসেট লিংক পাঠানো হয়েছে!
                          </div>
                          <p>
                            তোমার <span className="font-mono text-white">{resetSentEmail}</span> ইনবক্সে (না পেলে Spam ফোল্ডারে) পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। লিংকে ক্লিক করে নতুন পাসওয়ার্ড সেট করে এখানে এসে লগইন করো।
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          তোমার রেজিস্টার করা Gmail
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            placeholder="yourname@gmail.com"
                            value={resetEmailInput}
                            onChange={(e) => setResetEmailInput(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authBusy}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                        <span>{authBusy ? 'পাঠানো হচ্ছে...' : 'Gmail-এ রিসেট লিংক পাঠাও'}</span>
                      </button>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        দ্রষ্টব্য: আগে শুধু মোবাইল নাম্বার দিয়ে (Gmail ছাড়া) অ্যাকাউন্ট খোলা থাকলে লগইন করে প্রথমে আসল Gmail যুক্ত করে নাও, অথবা স্যারের হেল্পলাইনে (+880 1600-653568) যোগাযোগ করো।
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setStudentAuthMode('login');
                          setResetSentEmail(null);
                          clearAuthFeedback();
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>লগইনে ফিরে যাও</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleStudentSubmit} className="space-y-4">
                      {studentAuthMode === 'register' ? (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                              তোমার পুরো নাম
                            </label>
                            <input
                              type="text"
                              required
                              minLength={2}
                              maxLength={100}
                              placeholder="যেমন: নাফিস রহমান"
                              value={studentRegName}
                              onChange={(e) => setStudentRegName(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                              মোবাইল নাম্বার (অফিস অ্যাডমিশনে ব্যবহৃত নাম্বার)
                            </label>
                            <div className="relative">
                              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="tel"
                                required
                                placeholder="01XXXXXXXXX"
                                value={studentPhone}
                                onChange={(e) => setStudentPhone(e.target.value)}
                                className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                              />
                            </div>
                            <p className="text-[11px] text-pink-300/90 mt-1">
                              অফিসে ভর্তির সময় যে মোবাইল নাম্বার দিয়েছো ঠিক সেটিই দাও।
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                              তোমার আসল Gmail (পাসওয়ার্ড রিসেটের জন্য লাগবে)
                            </label>
                            <div className="relative">
                              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="email"
                                required
                                placeholder="yourname@gmail.com"
                                value={studentEmail}
                                onChange={(e) => setStudentEmail(e.target.value)}
                                className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                              />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              পাসওয়ার্ড ভুলে গেলে রিসেট করার জন্য এবং ভেরিফিকেশনের জন্য সচল Gmail দাও।
                            </p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            মোবাইল নাম্বার অথবা Gmail (যেকোনো একটি দিলেই হবে)
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              autoComplete="username"
                              placeholder="01XXXXXXXXX অথবা yourname@gmail.com"
                              value={studentIdentifier}
                              onChange={(e) => setStudentIdentifier(e.target.value)}
                              className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 placeholder:font-sans bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="block text-xs font-medium text-slate-300">
                            পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
                          </label>
                          {studentAuthMode === 'login' && (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentAuthMode('forgot');
                                if (studentIdentifier.includes('@')) {
                                  setResetEmailInput(studentIdentifier.trim());
                                }
                                setResetSentEmail(null);
                                clearAuthFeedback();
                              }}
                              className="text-[11px] font-semibold text-pink-300 hover:text-pink-200 transition-colors cursor-pointer"
                            >
                              পাসওয়ার্ড ভুলে গেছো? Gmail রিসেট
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showStudentPass ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="••••••••"
                            value={studentPass}
                            onChange={(e) => setStudentPass(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowStudentPass((prev) => !prev)}
                            aria-label={showStudentPass ? 'পাসওয়ার্ড লুকাও' : 'পাসওয়ার্ড দেখো'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                          >
                            {showStudentPass ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authBusy}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                      >
                        {studentAuthMode === 'register' ? (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>{authBusy ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন সম্পন্ন করো'}</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>{authBusy ? 'লগইন হচ্ছে...' : 'স্টুডেন্ট প্যানেলে প্রবেশ করো'}</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-[#262B36]" />
                    <span className="flex-shrink mx-3 text-[11px] text-slate-400">
                      অথবা ইনস্ট্যান্ট লগইন (এখনই চালু)
                    </span>
                    <div className="flex-grow border-t border-[#262B36]" />
                  </div>

                  <button
                    type="button"
                    onClick={() => void signInWithGoogle()}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-100 bg-[#0C0E13] border border-[#2E3442] hover:border-pink-400/70 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Google দিয়ে স্টুডেন্ট লগইন / রেজিস্ট্রেশন</span>
                  </button>
                </div>
                )
              ) : (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-slate-50 mb-1.5">
                      {adminAuthMode === 'login' ? 'Wasim Sir Admin Login' : 'Create Admin Password'}
                    </h1>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      আপনার নির্ধারিত Admin Gmail এবং পাসওয়ার্ড দিয়ে Admin Panel-এ প্রবেশ করুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#0C0E13] border border-[#262B36] rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminAuthMode('login');
                        clearAdminAuthFeedback();
                      }}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        adminAuthMode === 'login'
                          ? 'bg-sky-400 text-slate-950'
                          : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      Gmail + Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminAuthMode('setup');
                        clearAdminAuthFeedback();
                      }}
                      className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        adminAuthMode === 'setup'
                          ? 'bg-sky-400 text-slate-950'
                          : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      1st Time Setup
                    </button>
                  </div>

                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Admin Gmail
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="আপনার Admin Gmail লিখুন"
                        value={adminEmailInput}
                        onChange={(e) => setAdminEmailInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 placeholder:font-sans bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Admin Password
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminPass ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="••••••••"
                          value={adminPassInput}
                          onChange={(e) => setAdminPassInput(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPass((prev) => !prev)}
                          aria-label={showAdminPass ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                        >
                          {showAdminPass ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={authBusy}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {authBusy
                          ? 'Authenticating...'
                          : adminAuthMode === 'setup'
                            ? 'Create Admin Password'
                            : 'Enter Admin Panel'}
                      </span>
                    </button>
                  </form>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-[#262B36]" />
                    <span className="flex-shrink mx-3 text-[11px] text-slate-500">or instant login</span>
                    <div className="flex-grow border-t border-[#262B36]" />
                  </div>

                  <button
                    type="button"
                    onClick={() => void signInAdminWithGoogle()}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-[#0C0E13] border border-[#2E3442] hover:border-sky-400/70 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Continue with Google</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  // ======================== ADMIN PANEL TRACK (ISOLATED SESSION) ========================
  if (panelMode === 'admin') {
    if (!adminAuthReady) {
      return (
        <div className="max-w-[1200px] mx-auto px-6 py-24 text-center text-sm text-slate-400">
          অ্যাডমিন প্যানেল যাচাই করা হচ্ছে...
        </div>
      );
    }

    if (!adminUser) {
      return renderDualLoginCard('admin');
    }

    if (needsAdminEmailVerification) {
      return (
        <section className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="max-w-lg mx-auto bg-[#181C24] border border-[#262B36] rounded-xl p-8 space-y-5">
            <h1 className="font-display text-2xl font-bold text-slate-50">
              Verify Admin Gmail Once
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              আপনার <span className="font-mono text-sky-300">{adminUser.email}</span> ইনবক্সে একটি ভেরিফিকেশন লিংক পাঠানো হয়েছে। লিংকে ক্লিক করে পেজটি রিলোড দিন অথবা নিচে <strong>Continue with Google</strong> চাপুন।
            </p>
            {verificationSentNote && (
              <div className="p-3 rounded-lg bg-green-950/60 border border-green-700 text-xs text-green-200">
                Verification email sent again to {adminUser.email}.
              </div>
            )}
            {verificationCheckNote && (
              <div className="p-3 rounded-lg bg-pink-950/60 border border-pink-800 text-xs text-pink-200">
                {verificationCheckNote}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setVerificationCheckNote(null);
                  const verified = await refreshVerifiedSession();
                  if (!verified) {
                    setVerificationCheckNote(
                      'এখনো ভেরিফিকেশন সম্পন্ন হয়নি। ইনবক্সের লিংকে ক্লিক করে আবার চেষ্টা করুন অথবা Google দিয়ে লগইন করুন।',
                    );
                  }
                }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg cursor-pointer"
              >
                I Verified My Email (Reload)
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resendAdminVerification();
                  setVerificationSentNote(true);
                }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-[#0C0E13] border border-[#2E3442] hover:border-slate-500 rounded-lg cursor-pointer"
              >
                Resend Verification
              </button>
              <button
                type="button"
                onClick={() => void signInAdminWithGoogle()}
                className="px-4 py-2.5 text-xs font-semibold text-sky-300 bg-sky-950/50 border border-sky-800 hover:bg-sky-900/50 rounded-lg cursor-pointer"
              >
                Sign in with Google Instead
              </button>
              <button
                type="button"
                onClick={() => void logoutAdmin()}
                className="px-3 py-2.5 text-xs text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (!isAdmin) {
      return (
        <section className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="max-w-lg mx-auto bg-[#181C24] border border-[#262B36] rounded-xl p-8 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#CBD5E1]">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>অ্যাডমিন অ্যাক্সেস নেই</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-50">
              এই একাউন্টে অ্যাডমিন অ্যাক্সেস অনুমোদিত নয়
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              বর্তমানে অ্যাডমিন সেশনে <span className="font-mono text-sky-300">{adminUser.email || 'অজানা একাউন্ট'}</span> দিয়ে সাইন-ইন করা আছে। অনুমোদিত Admin Gmail দিয়ে প্রবেশ করতে লগআউট করুন অথবা স্টুডেন্ট প্যানেলে যান।
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => void logoutAdmin()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>অ্যাডমিন সেশন লগআউট</span>
              </button>
              <button
                type="button"
                onClick={() => setPanelMode('student')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>স্টুডেন্ট প্যানেলে যান</span>
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="max-w-[1200px] mx-auto px-6 py-8 sm:py-10">
        <div className="pb-6 border-b border-[#262B36] mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-slate-200">{adminUser.email}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-sky-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Wasim Sir · Admin Access</span>
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 text-balance">
                Admin Panel — Manage Students, Results &amp; Classes
              </h1>
            </div>

            <button
              type="button"
              onClick={() => void logoutAdmin()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 bg-[#181C24] border border-[#2E3442] rounded-xl hover:border-[#CBD5E1]/70 hover:text-[#E2E8F0] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>অ্যাডমিন লগআউট</span>
            </button>
          </div>
        </div>

        <AdminStudio />
      </section>
    );
  }

  // ======================== STUDENT PANEL TRACK (ISOLATED SESSION) ========================
  if (!authReady) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24 text-center text-sm text-slate-400">
        পোর্টাল যাচাই করা হচ্ছে...
      </div>
    );
  }

  if (!user) {
    return renderDualLoginCard('student');
  }

  if (needsLegacyGmailLink) {
    const legacyPhone = extractPhoneFromAuthEmail(user.email);
    return (
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="max-w-lg mx-auto bg-[#181C24] border border-[#262B36] rounded-xl p-8 space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-pink-300">
            <Mail className="w-4 h-4 shrink-0" />
            <span>পাসওয়ার্ড রিসেটের জন্য Gmail যুক্ত করো</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            তোমার একাউন্টে আসল Gmail যুক্ত করো
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            ভবিষ্যতে পাসওয়ার্ড ভুলে গেলে রিসেট করার জন্য তোমার আসল <strong className="text-white">Gmail</strong> থাকা আবশ্যক। তোমার <span className="font-mono text-sky-300">{legacyPhone}</span> নাম্বারের ভর্তি, ক্লাস ও পরীক্ষার রেজাল্ট আগের মতোই সুরক্ষিত থাকবে। Gmail যুক্ত করার পর তুমি মোবাইল নাম্বার অথবা Gmail যেকোনো একটি দিয়ে লগইন করতে পারবে।
          </p>

          {(legacyLinkMessage || legacyMigrationClaimEmail) && (
            <div className="p-4 rounded-lg bg-green-950/60 border border-green-700 text-xs text-green-200 space-y-2 leading-relaxed">
              <div className="font-semibold text-green-300">
                ভেরিফিকেশন লিংক পাঠানো হয়েছে!
              </div>
              <p>
                {legacyLinkMessage ||
                  `তোমার ${legacyMigrationClaimEmail} ঠিকানায় ভেরিফিকেশন লিংক পাঠানো হয়েছে। Gmail ইনবক্সে (না পেলে Spam ফোল্ডারে) গিয়ে লিংকে ক্লিক করো।`}
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    setStudentVerifCheckNote(null);
                    try {
                      const verified = await refreshStudentVerifiedSession();
                      if (!verified) {
                        setStudentVerifCheckNote(
                          'এখনো ভেরিফিকেশন সম্পন্ন হয়নি অথবা সেশন রিলোড প্রয়োজন। ইনবক্সের লিংকে ক্লিক করার পর নিচে লগআউট করে নতুন Gmail (বা মোবাইল নাম্বার) দিয়ে লগইন করো।',
                        );
                      }
                    } catch {
                      setStudentVerifCheckNote(
                        'ইমেইল আপডেট সম্পন্ন হয়েছে! অনুগ্রহ করে নিচে লগআউট করে তোমার নতুন Gmail (বা মোবাইল নাম্বার) ও পাসওয়ার্ড দিয়ে আবার লগইন করো।',
                      );
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer"
                >
                  আমি ভেরিফাই করেছি (এগিয়ে যাও)
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-[#0C0E13] border border-[#2E3442] hover:border-slate-500 rounded-lg cursor-pointer"
                >
                  লগআউট করে Gmail দিয়ে লগইন করো
                </button>
              </div>
            </div>
          )}

          {studentVerifCheckNote && (
            <div className="p-3 rounded-lg bg-pink-950/60 border border-pink-800 text-xs text-pink-200">
              {studentVerifCheckNote}
            </div>
          )}

          {authError && (
            <div className="p-3 rounded-lg bg-[#CBD5E1]/10 border border-[#CBD5E1]/30 text-xs text-[#E2E8F0]">
              {authError}
            </div>
          )}

          <form onSubmit={handleLegacyGmailLinkSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                তোমার আসল Gmail (পাসওয়ার্ড রিসেটের জন্য লাগবে)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={legacyGmailInput}
                  onChange={(e) => setLegacyGmailInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                তোমার বর্তমান পাসওয়ার্ড (নিশ্চিত করার জন্য)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showLegacyPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={legacyCurrentPass}
                  onChange={(e) => setLegacyCurrentPass(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={() => setShowLegacyPass((prev) => !prev)}
                  aria-label={showLegacyPass ? 'পাসওয়ার্ড লুকাও' : 'পাসওয়ার্ড দেখো'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  {showLegacyPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={authBusy}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>
                  {authBusy
                    ? 'লিংক পাঠানো হচ্ছে...'
                    : legacyMigrationClaimEmail
                      ? 'আবার ভেরিফিকেশন লিংক পাঠাও'
                      : 'Gmail যুক্ত করে ভেরিফিকেশন লিংক পাঠাও'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="px-4 py-3 text-xs font-medium text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                লগআউট
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  if (needsStudentEmailVerification) {
    return (
      <section className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="max-w-lg mx-auto bg-[#181C24] border border-[#262B36] rounded-xl p-8 space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-pink-300">
            <Mail className="w-4 h-4 shrink-0" />
            <span>Gmail ভেরিফিকেশন প্রয়োজন</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            তোমার Gmail একাউন্ট যাচাই করো
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            তোমার <span className="font-mono text-sky-300">{user.email}</span> ইনবক্সে (না পেলে Spam ফোল্ডারে) একটি ভেরিফিকেশন লিংক পাঠানো হয়েছে। লিংকে ক্লিক করে নিচের বাটনে চাপ দাও, তাহলেই স্যারের প্যানেলে তোমার রিকোয়েস্ট জমা হবে ও ক্লাসরুম চালু হবে।
          </p>
          {studentVerifSent && (
            <div className="p-3 rounded-lg bg-green-950/60 border border-green-700 text-xs text-green-200">
              ভেরিফিকেশন লিংক আবার {user.email}-এ পাঠানো হয়েছে।
            </div>
          )}
          {studentVerifCheckNote && (
            <div className="p-3 rounded-lg bg-pink-950/60 border border-pink-800 text-xs text-pink-200">
              {studentVerifCheckNote}
            </div>
          )}
          {authError && (
            <div className="p-3 rounded-lg bg-[#CBD5E1]/10 border border-[#CBD5E1]/30 text-xs text-[#E2E8F0]">
              {authError}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                setStudentVerifCheckNote(null);
                const verified = await refreshStudentVerifiedSession();
                if (!verified) {
                  setStudentVerifCheckNote(
                    'এখনো ভেরিফিকেশন সম্পন্ন হয়নি। Gmail ইনবক্সের লিংকে ক্লিক করে আবার এই বাটনে চাপ দাও।',
                  );
                }
              }}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer"
            >
              আমি ভেরিফাই করেছি (এগিয়ে যাও)
            </button>
            <button
              type="button"
              onClick={async () => {
                setStudentVerifSent(false);
                try {
                  await resendStudentVerification();
                  setStudentVerifSent(true);
                } catch {
                  // Error handled in authError
                }
              }}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 bg-[#0C0E13] border border-[#2E3442] hover:border-slate-500 rounded-lg cursor-pointer"
            >
              লিংক আবার পাঠাও
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="px-3 py-2.5 text-xs text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              লগআউট
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!enrollmentChecked) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-24 text-center text-sm text-slate-300">
        ক্লাসরুম প্রস্তুত করা হচ্ছে...
      </div>
    );
  }

  const activeTab = portalTab;
  const displayAccountHandle = extractPhoneFromAuthEmail(user.email);
  const isCurrentCompleted = selectedClass ? completedClassIds.has(selectedClass.id) : false;
  const studentDisplayName =
    myEnrollment?.studentName || myRequest?.studentName || user.displayName || 'প্রিয় শিক্ষার্থী';

  return (
    <section className="max-w-[1200px] mx-auto px-6 py-8 sm:py-10">
      {/* Student Portal Top Workspace Header */}
      <div className="pb-6 border-b border-[#262B36] mb-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-slate-200">{displayAccountHandle}</span>
              <span aria-hidden="true">·</span>
              {isPaidStudent ? (
                <span className="inline-flex items-center gap-1 font-semibold text-green-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    অনুমোদিত ব্যাচ শিক্ষার্থী
                    {myEnrollment?.rollNumber ? ` · রোল ${myEnrollment.rollNumber}` : ''}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-pink-300">
                  <Lock className="w-3.5 h-3.5" />
                  <span>অনুমোদনের অপেক্ষায়</span>
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 text-balance">
              {activeTab === 'profile' && hasVaultAccess
                ? 'আমার প্রোফাইল ও ব্যক্তিগত রেজাল্ট'
                : activeTab === 'notices' && hasVaultAccess
                  ? 'ব্যাচ নোটিশ ও পরীক্ষার আপডেট'
                  : hasVaultAccess
                    ? `স্বাগতম, ${studentDisplayName}`
                    : 'ওয়াসিম স্যারের অনুমোদনের অপেক্ষায়'}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 bg-[#181C24] border border-[#2E3442] rounded-xl hover:border-[#CBD5E1]/70 hover:text-[#E2E8F0] transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>স্টুডেন্ট লগআউট</span>
          </button>
        </div>

        {hasVaultAccess && (
          <nav
            aria-label="স্টুডেন্ট পোর্টাল নেভিগেশন"
            className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-wrap items-stretch gap-2.5 p-1.5 bg-[#181C24] border border-[#262B36] rounded-2xl"
          >
            <button
              type="button"
              onClick={() => setPortalTab('classroom')}
              className={`inline-flex items-center justify-center gap-2.5 px-5 py-3 text-sm sm:text-[15px] font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'classroom'
                  ? 'bg-sky-400 text-slate-950'
                  : 'text-slate-200 hover:bg-[#1F2430] hover:text-white'
              }`}
            >
              <Video className="w-4 h-4 shrink-0" />
              <span>আমার ক্লাসরুম</span>
            </button>
            <button
              type="button"
              onClick={() => setPortalTab('profile')}
              className={`inline-flex items-center justify-center gap-2.5 px-5 py-3 text-sm sm:text-[15px] font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-pink-500 text-white'
                  : 'text-slate-200 hover:bg-[#1F2430] hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>
                প্রোফাইল ও রেজাল্ট
                {myResults.length > 0 ? ` (${myResults.length})` : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPortalTab('notices')}
              className={`inline-flex items-center justify-center gap-2.5 px-5 py-3 text-sm sm:text-[15px] font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'notices'
                  ? 'bg-green-400 text-slate-950'
                  : 'text-slate-200 hover:bg-[#1F2430] hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              <span>ব্যাচ নোটিশ ({notices.length})</span>
            </button>
          </nav>
        )}
      </div>

      {/* State B: Signed in Student, NOT Yet Approved */}
      {!hasVaultAccess && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 bg-[#181C24] border border-[#262B36] rounded-xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2.5 text-pink-300">
                <Clock className="w-5 h-5 shrink-0" />
                <h2 className="font-display text-xl font-bold text-slate-50">
                  {myRequest
                    ? 'রেজিস্ট্রেশন সম্পন্ন · অনুমোদনের অপেক্ষায়'
                    : '১ম ধাপ সম্পন্ন · এবার অ্যাপ্রুভাল রিকোয়েস্ট পাঠাও'}
                </h2>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {myRequest ? (
                  <>
                    তোমার একাউন্ট (<span className="font-mono text-sky-300">{displayAccountHandle}</span>) তৈরি হয়েছে। ওয়াসিম স্যার তাঁর Admin Panel থেকে অ্যাপ্রুভ করলেই তুমি সকল রেকর্ডেড ক্লাস ও নোটিশ দেখতে পারবে।
                  </>
                ) : (
                  <>
                    তুমি <span className="font-mono text-sky-300">{displayAccountHandle}</span> দিয়ে সফলভাবে সাইন-ইন করেছ। ডানদিকের ফর্মে তোমার পুরো নাম ও মোবাইল নাম্বার দিয়ে সাবমিট করলেই ওয়াসিম স্যারের Admin Panel-এ তোমার রিকোয়েস্ট চলে যাবে।
                  </>
                )}
              </p>

              {myRequest && (
                <div className="p-4 rounded-lg border border-[#262B36] bg-[#0C0E13] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {myRequest.status === 'pending' && (
                      <>
                        <Clock className="w-4 h-4 text-pink-300" />
                        <span className="text-pink-300">স্যারের রিভিউয়ের অপেক্ষায়</span>
                      </>
                    )}
                    {myRequest.status === 'rejected' && (
                      <>
                        <XCircle className="w-4 h-4 text-[#CBD5E1]" />
                        <span className="text-[#CBD5E1]">আবেদন গৃহীত হয়নি — স্যারের সাথে যোগাযোগ করো</span>
                      </>
                    )}
                    {myRequest.status === 'approved' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-green-300">অনুমোদিত — অ্যাক্সেস চালু হচ্ছে</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {myRequest.studentName} · <span className="font-mono">{myRequest.phone}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0C0E13] border border-[#262B36]">
                  <span className="font-medium text-slate-200">
                    ওয়াসিম স্যার: <span className="font-mono text-slate-100">+880 1883-600827</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="tel:+8801883600827"
                      className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-[#D8DEE9] bg-[#CBD5E1]/10 hover:bg-[#CBD5E1]/20 border border-[#CBD5E1]/30 rounded-md transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>কল</span>
                    </a>
                    <a
                      href="https://wa.me/8801883600827"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-green-300 bg-green-950/50 hover:bg-green-900/60 border border-green-800/70 rounded-md transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0C0E13] border border-[#262B36]">
                  <span className="font-medium text-slate-200">
                    হেল্পলাইন: <span className="font-mono text-slate-100">+880 1600-653568</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <a
                      href="tel:+8801600653568"
                      className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-[#D8DEE9] bg-[#CBD5E1]/10 hover:bg-[#CBD5E1]/20 border border-[#CBD5E1]/30 rounded-md transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>কল</span>
                    </a>
                    <a
                      href="https://wa.me/8801600653568"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-green-300 bg-green-950/50 hover:bg-green-900/60 border border-green-800/70 rounded-md transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
                <div>
                  <a
                    href="https://www.facebook.com/share/151mRVatzWN/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium text-sky-300 bg-sky-950/50 hover:bg-sky-900/60 border border-sky-800/70 rounded-lg transition-colors"
                  >
                    <span>Facebook Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Batch Verification & Approval Request Form */}
            <form
              onSubmit={handleReferenceSubmit}
              className="lg:col-span-6 bg-[#181C24] border border-[#262B36] rounded-xl p-6 sm:p-8 space-y-4"
            >
              <h3 className="font-display text-lg font-bold text-slate-50">
                {myRequest
                  ? 'তথ্য আপডেট করো (নাম, নাম্বার ও কলেজ)'
                  : 'ব্যাচ অ্যাপ্রুভালের জন্য তথ্য জমা দাও'}
              </h3>
              <p className="text-xs text-slate-400">
                ওয়াসিম স্যারের অনুমোদনের জন্য তোমার নাম, মোবাইল নাম্বার এবং প্রয়োজনে কলেজের নাম দাও।
              </p>

              {reqError && (
                <div className="p-3 rounded-lg bg-[#CBD5E1]/10 border border-[#CBD5E1]/30 text-xs font-medium text-[#E2E8F0]">
                  {reqError}
                </div>
              )}

              {reqSuccess && (
                <div className="p-3 rounded-lg bg-green-950/60 border border-green-700 text-xs font-medium text-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span>অ্যাপ্রুভাল রিকোয়েস্ট স্যারের প্যানেলে পাঠানো হয়েছে।</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    পুরো নাম
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder="যেমন: নাফিস রহমান"
                    className="w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    মোবাইল নাম্বার
                  </label>
                  <input
                    type="tel"
                    required
                    minLength={6}
                    maxLength={24}
                    value={reqPhone}
                    onChange={(e) => setReqPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 text-sm font-mono text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  কলেজের নাম (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={reqCollege}
                  onChange={(e) => setReqCollege(e.target.value)}
                  placeholder="যেমন: চট্টগ্রাম কলেজ"
                  className="w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    ভর্তির মাধ্যম
                  </label>
                  <select
                    value={reqMethod}
                    onChange={(e) => setReqMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-sm text-slate-100 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Hand-to-Hand">সরাসরি অফিস</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    রেফারেন্স / ট্রানজেকশন আইডি (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    maxLength={64}
                    value={reqTxId}
                    onChange={(e) => setReqTxId(e.target.value)}
                    placeholder="যেমন: BKA9842X1"
                    className="w-full px-3 py-2 text-sm font-mono text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  reqSubmitting ||
                  myRequest?.status === 'approved' ||
                  myRequest?.status === 'rejected'
                }
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                <span>
                  {reqSubmitting
                    ? 'পাঠানো হচ্ছে...'
                    : myRequest
                      ? 'তথ্য আপডেট করো'
                      : 'অ্যাপ্রুভাল রিকোয়েস্ট পাঠাও'}
                </span>
              </button>
            </form>
          </div>

          {classes.length > 0 && (
            <div className="bg-[#181C24] border border-[#262B36] rounded-xl p-6">
              <h3 className="font-display text-lg font-bold text-slate-50 mb-4">
                ফ্রি প্রিভিউ লেকচার
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  {selectedClass && activeStream && parsedEmbed ? (
                    <div className="space-y-3">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden border border-[#262B36]">
                        {parsedEmbed.kind === 'video' ? (
                          <video src={parsedEmbed.src} controls className="w-full h-full" />
                        ) : (
                          <iframe
                            src={parsedEmbed.src}
                            title={selectedClass.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        )}
                      </div>
                      <div className="text-base font-semibold text-slate-100">
                        {selectedClass.title}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-[#0C0E13] border border-[#262B36] rounded-lg flex items-center justify-center text-sm text-slate-400">
                      দেখার জন্য ডানদিক থেকে একটি ফ্রি প্রিভিউ ক্লাস সিলেক্ট করো।
                    </div>
                  )}
                </div>
                <div className="lg:col-span-4 space-y-2">
                  {classes.map((lec) => (
                    <button
                      key={lec.id}
                      type="button"
                      onClick={() => handleSelectClass(lec)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedClass?.id === lec.id
                          ? 'border-pink-400 bg-[#1F2430]'
                          : 'border-[#262B36] bg-[#0C0E13] hover:border-purple-500/40'
                      }`}
                    >
                      <div className="text-xs font-sans font-medium text-sky-300 tabular-nums">
                        অধ্যায় {lec.chapterNumber} · ফ্রি প্রিভিউ
                      </div>
                      <div className="text-sm font-semibold text-slate-100 mt-0.5">{lec.title}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedClass && (
                <div className="mt-6 pt-6 border-t border-[#262B36]">
                  <ChapterEmbeddedLab chapterNumber={selectedClass.chapterNumber} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Panel Classroom */}
      {hasVaultAccess && activeTab === 'classroom' && (
        <div className="space-y-8">
          {/* Student Welcome & Quick Overview Hub */}
          <div className="bg-[#181C24] border border-[#262B36] rounded-xl p-6 sm:p-7 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-pink-300">
                  ওয়াসিম স্যার ফিজিক্স · এইচএসসি ২০২৮ ব্যাচ ক্লাসরুম
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-50 text-balance">
                  স্বাগতম, {studentDisplayName} — আজকের পদার্থবিজ্ঞান প্রস্তুতি শুরু করো
                </h2>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
                  <span>{myEnrollment?.college || 'HSC 2028 Science'}</span>
                  {myEnrollment?.batch && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>ব্যাচ: {myEnrollment.batch}</span>
                    </>
                  )}
                  {myEnrollment?.sectionTime && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>সময়: {myEnrollment.sectionTime}</span>
                    </>
                  )}
                  {myEnrollment?.rollNumber && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-purple-300">
                        রোল: {myEnrollment.rollNumber}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-72 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">লেকচার অগ্রগতি</span>
                  <span className="font-mono tabular-nums font-semibold text-green-300">
                    {completedCount} / {classes.length} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#0C0E13] rounded-full overflow-hidden border border-[#262B36]">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-sky-400 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {loadingData ? (
            <div className="aspect-video bg-[#181C24] border border-[#262B36] rounded-xl flex items-center justify-center text-sm text-slate-400">
              রেকর্ডেড ক্লাস লোড হচ্ছে...
            </div>
          ) : !selectedClass ? (
            <div className="space-y-8">
              <div className="bg-[#181C24] border border-[#262B36] rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <h3 className="font-display text-xl font-bold text-slate-50">
                    রেকর্ডেড ক্লাস তালিকা ও অধ্যায়ভিত্তিক প্রস্তুতি
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    ওয়াসিম স্যারের নতুন রেকর্ডেড ক্লাস ও বোর্ড নোট PDF প্রকাশ হওয়ার সাথে সাথেই এখানে দেখা যাবে। ততক্ষণ নিচের ১০টি অধ্যায়ের যেকোনো ইন্টারঅ্যাক্টিভ ফিজিক্স ল্যাব অনুশীলন করো।
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPortalTab('profile')}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-pink-500 hover:bg-pink-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    আমার প্রোফাইল ও রেজাল্ট
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortalTab('notices')}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-100 bg-[#0C0E13] border border-[#2E3442] hover:border-green-400 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    নোটিশ বোর্ড দেখো
                  </button>
                </div>
              </div>

              {/* Chapter Picker + Always-Ready Interactive Physics Lab */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-slate-100">
                      অধ্যায়ভিত্তিক ইন্টারঅ্যাক্টিভ ফিজিক্স ল্যাব (১ম পত্র)
                    </h3>
                    <p className="text-xs text-slate-400">
                      যেকোনো অধ্যায় বেছে নিয়ে লাইভ গ্রাফ ও সিমুলেশনের মাধ্যমে কনসেপ্ট ঝালাই করো
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {HSC28_PHYSICS_CHAPTERS.map((ch) => {
                    const isSelected = emptyLabChapter === ch.number;
                    return (
                      <button
                        key={ch.number}
                        type="button"
                        onClick={() => setEmptyLabChapter(ch.number)}
                        className={`px-3 py-2.5 text-left text-xs rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500 border-purple-400 text-white font-semibold'
                            : 'bg-[#181C24] border-[#262B36] text-slate-200 hover:border-purple-500/50'
                        }`}
                      >
                        <span
                          className={`font-mono tabular-nums mr-1.5 ${
                            isSelected ? 'text-pink-100 font-bold' : 'text-pink-300'
                          }`}
                        >
                          {String(ch.number).padStart(2, '0')}
                        </span>
                        <span className="truncate">{ch.titleBn}</span>
                      </button>
                    );
                  })}
                </div>

                <ChapterEmbeddedLab chapterNumber={emptyLabChapter} />
              </div>
            </div>
          ) : (
            <>
              <div ref={videoPlayerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-5">
                  <div className="bg-[#181C24] border border-[#262B36] rounded-xl overflow-hidden">
                    <div className="aspect-video bg-black relative">
                      {loadingStream ? (
                        <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-300">
                          লেকচার স্ট্রিম লোড হচ্ছে...
                        </div>
                      ) : parsedEmbed ? (
                        parsedEmbed.kind === 'video' ? (
                          <video src={parsedEmbed.src} controls className="w-full h-full" />
                        ) : parsedEmbed.kind === 'iframe' ? (
                          <iframe
                            src={parsedEmbed.src}
                            title={selectedClass.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white">
                            <p className="text-sm mb-3">এক্সটার্নাল লিংকে লেকচারটি দেখুন</p>
                            <a
                              href={parsedEmbed.src}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg"
                            >
                              <span>ক্লাস ওপেন করো</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                          ভিডিও লিংক পাওয়া যায়নি।
                        </div>
                      )}
                    </div>

                    <div className="p-6 sm:p-7 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1.5">
                            <span className="font-sans font-semibold text-sky-300 tabular-nums">
                              অধ্যায় {selectedClass.chapterNumber} · লেকচার{' '}
                              {String(selectedClass.lectureNumber).padStart(2, '0')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{selectedClass.duration}</span>
                            {parsedEmbed && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{parsedEmbed.providerLabel}</span>
                              </>
                            )}
                          </div>
                          <h2 className="font-display text-2xl font-bold text-slate-50">
                            {selectedClass.title}
                          </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              void toggleLectureCompleted(selectedClass.id, !isCurrentCompleted)
                            }
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                              isCurrentCompleted
                                ? 'bg-green-950/60 border-green-700 text-green-300 hover:bg-green-900/60'
                                : 'bg-[#0C0E13] border-[#2E3442] text-slate-200 hover:border-green-400/60'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isCurrentCompleted ? 'সম্পন্ন হয়েছে' : 'সম্পন্ন চিহ্নিত করো'}</span>
                          </button>

                          {activeStream?.noteUrl && (
                            <a
                              href={activeStream.noteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>বোর্ড নোট PDF</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {selectedClass.description && (
                        <p className="text-sm text-slate-300 leading-relaxed pt-3 border-t border-[#262B36]">
                          {selectedClass.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <aside className="lg:col-span-4 bg-[#181C24] border border-[#262B36] rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-[#262B36] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-bold text-slate-100">
                        লেকচার তালিকা
                      </h3>
                      <span className="text-xs font-mono text-pink-300 tabular-nums">
                        {filteredClasses.length}টি ক্লাস
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ক্লাস বা টপিক খুঁজুন..."
                        value={lectureSearch}
                        onChange={(e) => setLectureSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                      />
                    </div>

                    <select
                      value={chapterFilter}
                      onChange={(e) =>
                        setChapterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                      }
                      className="w-full px-3 py-1.5 text-xs text-slate-100 bg-[#0C0E13] border border-[#2E3442] rounded-lg focus:outline-none focus:border-purple-400"
                    >
                      <option value="all">প্রথম পত্রের সকল অধ্যায়</option>
                      {HSC28_PHYSICS_CHAPTERS.map((ch) => (
                        <option key={ch.number} value={ch.number}>
                          অধ্যায় {ch.number}: {ch.titleBn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="divide-y divide-[#262B36] max-h-[540px] overflow-y-auto">
                    {filteredClasses.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        এই অধ্যায়ে কোনো ক্লাস পাওয়া যায়নি।
                      </div>
                    ) : (
                      filteredClasses.map((lec) => {
                        const isActive = selectedClass?.id === lec.id;
                        const isDone = completedClassIds.has(lec.id);
                        return (
                          <button
                            key={lec.id}
                            type="button"
                            onClick={() => handleSelectClass(lec)}
                            className={`w-full text-left p-4 flex items-start gap-3 transition-colors cursor-pointer ${
                              isActive ? 'bg-[#1F2430]' : 'hover:bg-[#1A1F29]'
                            }`}
                          >
                            <div
                              className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                isActive
                                  ? 'bg-purple-500 text-white'
                                  : isDone
                                    ? 'bg-green-950/70 text-green-400 border border-green-700'
                                    : 'bg-[#0C0E13] text-slate-400 border border-[#262B36]'
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-mono text-slate-400 mb-0.5">
                                অধ্যায় {lec.chapterNumber} · লেকচার {String(lec.lectureNumber).padStart(2, '0')} ·{' '}
                                {lec.duration}
                              </div>
                              <div
                                className={`text-sm font-medium leading-snug ${
                                  isActive ? 'text-pink-300 font-semibold' : 'text-slate-100'
                                }`}
                              >
                                {lec.title}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </aside>
              </div>

              <ChapterEmbeddedLab chapterNumber={selectedClass.chapterNumber} />
            </>
          )}
        </div>
      )}

      {hasVaultAccess && activeTab === 'profile' && <StudentProfileResults />}

      {hasVaultAccess && activeTab === 'notices' && (
        <div className="bg-[#181C24] border border-[#262B36] rounded-xl divide-y divide-[#262B36]">
          {notices.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-7 h-7 text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-200">এখনো কোনো ব্যাচ নোটিশ নেই</p>
            </div>
          ) : (
            notices.map((n) => (
              <article key={n.id} className="p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-sky-300">{n.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{n.audience === 'paid' ? 'ব্যাচ প্রাইভেট' : 'পাবলিক নোটিশ'}</span>
                  {n.pinned && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#CBD5E1] font-semibold">গুরুত্বপূর্ণ পিন করা</span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-lg font-bold text-slate-100 mb-1.5">
                  {n.title}
                </h2>
                {n.body && (
                  <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">{n.body}</p>
                )}
                <NoticeMediaViewer
                  title={n.title}
                  imageUrl={n.imageUrl}
                  videoUrl={n.videoUrl}
                />
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );
}
