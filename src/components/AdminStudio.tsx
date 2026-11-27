import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  ImagePlus,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import { HSC28_PHYSICS_CHAPTERS } from '../data/hsc28Curriculum';
import { usePortal } from '../context/PortalContext';
import { extractPhoneFromAuthEmail, formatAuthError } from '../lib/phoneAuth';
import {
  compressNoticeImage,
  parseVideoUrl,
  sanitizeNoticeImageUrl,
  sanitizeNoticeVideoUrl,
} from '../lib/videoUtils';
import type { Notice, NoticeAudience, NoticeCategory, RecordedClass } from '../types/portal';
import { NoticeMediaViewer } from './NoticeMediaViewer';

export function AdminStudio() {
  const {
    user,
    classes,
    notices,
    allEnrollments,
    allRequests,
    fetchClassStream,
    publishRecordedClass,
    updateRecordedClass,
    removeRecordedClass,
    publishNotice,
    updateNotice,
    removeNotice,
    addOrUpdateEnrollment,
    bulkAddEnrollments,
    removeEnrollment,
    resolveEnrollmentRequest,
    linkAdminPassword,
    seedDemoContent,
  } = usePortal();

  const [tab, setTab] = useState<'classes' | 'notices' | 'students'>('classes');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Class form state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [chapterNum, setChapterNum] = useState(2);
  const [lectureNum, setLectureNum] = useState(1);
  const [classTitle, setClassTitle] = useState('');
  const [duration, setDuration] = useState('55:00');
  const [videoUrl, setVideoUrl] = useState('');
  const [noteUrl, setNoteUrl] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [isFreePreview, setIsFreePreview] = useState(false);

  // Notice form state
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<NoticeCategory>('Routine');
  const [noticeAudience, setNoticeAudience] = useState<NoticeAudience>('paid');
  const [noticePinned, setNoticePinned] = useState(false);
  const [noticeBody, setNoticeBody] = useState('');
  const [noticeImageUrl, setNoticeImageUrl] = useState('');
  const [noticeVideoUrl, setNoticeVideoUrl] = useState('');
  const [uploadingNoticeImage, setUploadingNoticeImage] = useState(false);

  // Student form state
  const [studentAddMode, setStudentAddMode] = useState<'single' | 'bulk'>('single');
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentCollege, setStudentCollege] = useState('');
  const [bulkIdentifiersText, setBulkIdentifiersText] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');

  // Link Admin Password state
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showPasswordCard, setShowPasswordCard] = useState(false);

  const showToast = (msg: string) => {
    setErrorMsg(null);
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4500);
  };

  const resetClassForm = () => {
    setEditingClassId(null);
    setClassTitle('');
    setVideoUrl('');
    setNoteUrl('');
    setClassDesc('');
    setIsFreePreview(false);
  };

  const resetNoticeForm = () => {
    setEditingNoticeId(null);
    setNoticeTitle('');
    setNoticeBody('');
    setNoticeImageUrl('');
    setNoticeVideoUrl('');
    setNoticePinned(false);
    setNoticeCategory('Routine');
    setNoticeAudience('paid');
  };

  const liveVideoPreview = useMemo(() => {
    if (!videoUrl.trim()) return null;
    const parsed = parseVideoUrl(videoUrl);
    return parsed.kind === 'iframe' || parsed.kind === 'video' ? parsed : null;
  }, [videoUrl]);

  const handleEditClassClick = async (lec: RecordedClass) => {
    setBusy(true);
    try {
      const stream = await fetchClassStream(lec.id);
      setEditingClassId(lec.id);
      setChapterNum(lec.chapterNumber);
      setLectureNum(lec.lectureNumber);
      setClassTitle(lec.title);
      setDuration(lec.duration);
      setClassDesc(lec.description ?? '');
      setIsFreePreview(lec.isFreePreview);
      setVideoUrl(stream?.videoUrl ?? '');
      setNoteUrl(stream?.noteUrl ?? '');
      setTab('classes');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load lecture details.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classTitle.trim() || !videoUrl.trim()) {
      setErrorMsg('Lecture title and video URL are required.');
      return;
    }
    const chMeta = HSC28_PHYSICS_CHAPTERS.find((c) => c.number === chapterNum);
    const chapterName = chMeta ? `${chMeta.titleEn} (${chMeta.titleBn})` : `Chapter ${chapterNum}`;

    setBusy(true);
    try {
      const payload = {
        title: classTitle,
        chapterNumber: chapterNum,
        chapterName,
        lectureNumber: lectureNum,
        duration: duration || '45:00',
        description: classDesc,
        isFreePreview,
        videoUrl,
        noteUrl,
      };
      if (editingClassId) {
        await updateRecordedClass(editingClassId, payload);
        showToast('Recorded lecture updated cleanly.');
      } else {
        await publishRecordedClass(payload);
        setLectureNum((n) => n + 1);
        showToast('Recorded lecture uploaded to Student Classroom.');
      }
      resetClassForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save lecture.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditNoticeClick = (n: Notice) => {
    setEditingNoticeId(n.id);
    setNoticeTitle(n.title);
    setNoticeCategory(n.category);
    setNoticeAudience(n.audience);
    setNoticePinned(n.pinned);
    setNoticeBody(n.body);
    setNoticeImageUrl(n.imageUrl ?? '');
    setNoticeVideoUrl(n.videoUrl ?? '');
    setTab('notices');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNoticePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingNoticeImage(true);
    setErrorMsg(null);
    try {
      const compressed = await compressNoticeImage(file);
      setNoticeImageUrl(compressed);
      showToast('ছবি প্রস্তুত হয়েছে — এবার Publish Notice দিন।');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ছবি আপলোড করা যায়নি।');
    } finally {
      setUploadingNoticeImage(false);
    }
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasMedia = Boolean(
      sanitizeNoticeImageUrl(noticeImageUrl) || sanitizeNoticeVideoUrl(noticeVideoUrl),
    );
    if (!noticeTitle.trim()) {
      setErrorMsg('Notice title is required.');
      return;
    }
    if (!noticeBody.trim() && !hasMedia) {
      setErrorMsg('নোটিশের বিবরণ লিখুন অথবা একটি ছবি/ভিডিও যুক্ত করুন।');
      return;
    }
    if (noticeImageUrl.trim() && !sanitizeNoticeImageUrl(noticeImageUrl)) {
      setErrorMsg('ছবির লিংকটি অবশ্যই https:// দিয়ে শুরু হতে হবে অথবা গ্যালারি থেকে আপলোড করুন।');
      return;
    }
    if (noticeVideoUrl.trim() && !sanitizeNoticeVideoUrl(noticeVideoUrl)) {
      setErrorMsg('ভিডিওর লিংকটি অবশ্যই https:// দিয়ে শুরু হতে হবে (YouTube, Shorts বা Google Drive)।');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: noticeTitle,
        body: noticeBody,
        category: noticeCategory,
        audience: noticeAudience,
        pinned: noticePinned,
        imageUrl: noticeImageUrl,
        videoUrl: noticeVideoUrl,
      };
      if (editingNoticeId) {
        await updateNotice(editingNoticeId, payload);
        showToast('Notice updated cleanly.');
      } else {
        await publishNotice(payload);
        showToast('Notice published cleanly.');
      }
      resetNoticeForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save notice.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdentifier.trim() || !studentName.trim()) {
      setErrorMsg('Mobile number (or Gmail) and full name are required.');
      return;
    }
    setBusy(true);
    try {
      await addOrUpdateEnrollment({
        identifier: studentIdentifier,
        studentName,
        rollNumber: studentRoll,
        college: studentCollege,
        status: 'active',
      });
      setStudentIdentifier('');
      setStudentName('');
      setStudentRoll('');
      setStudentCollege('');
      showToast(`${studentName} approved and added to Batch Student Roster.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to enroll student.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokens = bulkIdentifiersText
      .split(/[\n,; ]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (tokens.length === 0) {
      setErrorMsg('Paste at least one 11-digit mobile number or Gmail address.');
      return;
    }

    setBusy(true);
    try {
      const count = await bulkAddEnrollments(tokens);
      if (count === 0) {
        setErrorMsg('No valid mobile numbers (01XXXXXXXXX) or Gmail addresses found.');
      } else {
        setBulkIdentifiersText('');
        showToast(`${count} student account(s) approved at once.`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Bulk enrollment failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleLinkPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await linkAdminPassword(newAdminPassword);
      setNewAdminPassword('');
      setShowPasswordCard(false);
      showToast('Admin password linked! You can now log in with your Gmail + Password.');
    } catch (err) {
      setErrorMsg(formatAuthError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSeedDemo = async () => {
    setBusy(true);
    try {
      await seedDemoContent();
      showToast('Sample HSC 2028 lectures and notices loaded.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to seed sample content.');
    } finally {
      setBusy(false);
    }
  };

  const hasPasswordProvider = user?.providerData?.some((p) => p.providerId === 'password');
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const activeCount = allEnrollments.filter((e) => e.status === 'active').length;
  const filteredEnrollments = allEnrollments.filter((en) => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      en.email.toLowerCase().includes(q) ||
      (en.phone ?? '').toLowerCase().includes(q) ||
      en.studentName.toLowerCase().includes(q) ||
      (en.rollNumber ?? '').toLowerCase().includes(q)
    );
  });

  const inputClass =
    'w-full px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]';

  return (
    <div className="space-y-8">
      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-800 rounded-xl bg-[#131C28] overflow-hidden">
        <div className="p-5 border-r border-b lg:border-b-0 border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Recorded Lectures</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-50">
            {classes.length}
          </div>
        </div>
        <div className="p-5 lg:border-r border-b lg:border-b-0 border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Active Batch Students</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-emerald-400">
            {activeCount}
          </div>
        </div>
        <div className="p-5 border-r border-slate-800">
          <div className="text-xs text-slate-400 mb-1">Pending Approvals</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-[#FBBF24]">
            {pendingRequests.length}
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs text-slate-400 mb-1">Published Notices</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-sky-300">
            {notices.length}
          </div>
        </div>
      </div>

      {/* Studio Sub-navigation & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="inline-flex items-center gap-1 p-1 bg-[#131C28] border border-slate-800 rounded-lg self-start overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setTab('classes')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'classes'
                ? 'bg-[#F59E0B] text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Upload &amp; Edit Classes ({classes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('students')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'students'
                ? 'bg-[#F59E0B] text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Approve Students ({allEnrollments.length})
            {pendingRequests.length > 0 ? ` · ${pendingRequests.length} Pending` : ''}
          </button>
          <button
            type="button"
            onClick={() => setTab('notices')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'notices'
                ? 'bg-[#F59E0B] text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Notices ({notices.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!hasPasswordProvider && (
            <button
              type="button"
              onClick={() => setShowPasswordCard((s) => !s)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-sky-300 bg-sky-950/60 border border-sky-800 rounded-lg hover:bg-sky-900/60 transition-colors cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Set Admin Password</span>
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={handleSeedDemo}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-[#131C28] border border-slate-700 rounded-lg hover:border-slate-500 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5 text-sky-300" />
            <span>Load Demo HSC &apos;28 Content</span>
          </button>
        </div>
      </div>

      {showPasswordCard && (
        <form
          onSubmit={handleLinkPassword}
          className="bg-[#131C28] border border-sky-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-end gap-4"
        >
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-100 mb-1">
              Set Password for {user?.email}
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Link a password to your verified Admin Gmail so you can sign in using Gmail + Password next time.
            </p>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Choose a strong password (min 6 chars)"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              className="w-full max-w-sm px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#38BDF8]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-[#38BDF8] hover:bg-sky-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Save Admin Password
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordCard(false)}
              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {statusMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs font-medium">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Recorded Classes */}
      {tab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveClass}
            className="lg:col-span-5 bg-[#131C28] border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-50">
                {editingClassId ? 'Edit Recorded Lecture' : 'Upload Recorded Lecture'}
              </h3>
              {editingClassId && (
                <button
                  type="button"
                  onClick={resetClassForm}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Upload your video to YouTube (Unlisted) or Google Drive and paste the link below—zero hosting cost.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Chapter (1st Paper)
                </label>
                <select
                  value={chapterNum}
                  onChange={(e) => setChapterNum(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs text-slate-100 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
                >
                  {HSC28_PHYSICS_CHAPTERS.map((ch) => (
                    <option key={ch.number} value={ch.number}>
                      Ch {ch.number}: {ch.titleEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Lecture #
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={lectureNum}
                  onChange={(e) => setLectureNum(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono text-slate-100 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Lecture Title
              </label>
              <input
                type="text"
                required
                maxLength={140}
                placeholder="e.g. River-Boat & Rain-Umbrella Vectors"
                value={classTitle}
                onChange={(e) => setClassTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Duration
                </label>
                <input
                  type="text"
                  maxLength={24}
                  placeholder="55:20"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div className="flex items-end pb-1.5">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFreePreview}
                    onChange={(e) => setIsFreePreview(e.target.checked)}
                    className="rounded border-slate-600 accent-[#F59E0B]"
                  />
                  <span>Allow Free Preview</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Video URL (YouTube Unlisted / Google Drive / Vimeo)
              </label>
              <input
                type="url"
                required
                maxLength={400}
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            {liveVideoPreview && (
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-black">
                <div className="px-3 py-1.5 text-[11px] font-mono text-slate-300 border-b border-slate-800">
                  Live Preview · {liveVideoPreview.providerLabel}
                </div>
                <div className="aspect-video">
                  {liveVideoPreview.kind === 'video' ? (
                    <video src={liveVideoPreview.src} controls className="w-full h-full" />
                  ) : (
                    <iframe
                      src={liveVideoPreview.src}
                      title="Admin stream preview"
                      className="w-full h-full border-0"
                    />
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Handwritten Board Note PDF URL (Optional)
              </label>
              <input
                type="url"
                maxLength={400}
                placeholder="https://drive.google.com/file/d/..."
                value={noteUrl}
                onChange={(e) => setNoteUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Topic Summary
              </label>
              <textarea
                rows={3}
                maxLength={600}
                placeholder="Key derivations, CQ types, or homework sheet instructions..."
                value={classDesc}
                onChange={(e) => setClassDesc(e.target.value)}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingClassId ? 'Save Lecture Changes' : 'Publish Recorded Class'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#131C28] border border-slate-800 rounded-xl divide-y divide-slate-800">
            <div className="p-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-50">
                Published Lecture Library
              </h3>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {classes.length} items
              </span>
            </div>
            {classes.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No recorded classes published yet. Upload one on the left or click &ldquo;Load Demo HSC &apos;28 Content&rdquo;.
              </div>
            ) : (
              classes.map((lec) => (
                <div key={lec.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="font-mono font-semibold text-sky-300">
                        Ch {lec.chapterNumber} · Lec {String(lec.lectureNumber).padStart(2, '0')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{lec.duration}</span>
                      <span aria-hidden="true">·</span>
                      <span>{lec.isFreePreview ? 'Free Preview' : 'Batch Vault'}</span>
                    </div>
                    <div className="font-semibold text-sm text-slate-100">{lec.title}</div>
                    {lec.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{lec.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleEditClassClick(lec)}
                      className="p-2 text-slate-400 hover:text-sky-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit lecture"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeRecordedClass(lec.id)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/60 transition-colors cursor-pointer"
                      title="Delete lecture"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Notice Board */}
      {tab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveNotice}
            className="lg:col-span-5 bg-[#131C28] border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-50">
                {editingNoticeId ? 'Edit Notice' : 'Post Academic Notice'}
              </h3>
              {editingNoticeId && (
                <button
                  type="button"
                  onClick={resetNoticeForm}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Choose whether this notice appears on the public website or strictly inside the Student Panel.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Notice Headline
              </label>
              <input
                type="text"
                required
                maxLength={140}
                placeholder="e.g. Chapter 2 Friday CQ Exam Routine"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={noticeCategory}
                  onChange={(e) => setNoticeCategory(e.target.value as NoticeCategory)}
                  className="w-full px-3 py-2 text-xs text-slate-100 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
                >
                  <option value="Routine">Routine</option>
                  <option value="Exam">Exam</option>
                  <option value="Class Update">Class Update</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Audience</label>
                <select
                  value={noticeAudience}
                  onChange={(e) => setNoticeAudience(e.target.value as NoticeAudience)}
                  className="w-full px-3 py-2 text-xs text-slate-100 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
                >
                  <option value="paid">Batch Students Only</option>
                  <option value="public">Public (Landing + Portal)</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={noticePinned}
                onChange={(e) => setNoticePinned(e.target.checked)}
                className="rounded border-slate-600 accent-[#F59E0B]"
              />
              <span>Pin notice to top of board</span>
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Notice Details (ঐচ্ছিক যদি ছবি/ভিডিও দেন)
              </label>
              <textarea
                rows={3}
                maxLength={1200}
                placeholder="Write clear instructions, exam time, or classroom notes..."
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Photo Attachment (Gallery Upload or URL) */}
            <div className="p-3.5 rounded-lg border border-slate-800 bg-[#0B1118] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <ImagePlus className="w-3.5 h-3.5 text-[#FBBF24]" />
                  <span>নোটিশের ছবি (Photo)</span>
                </span>
                {noticeImageUrl && (
                  <button
                    type="button"
                    onClick={() => setNoticeImageUrl('')}
                    className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    ছবি সরাও
                  </button>
                )}
              </div>
              <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-700/70 rounded-lg cursor-pointer transition-colors">
                <ImagePlus className="w-3.5 h-3.5" />
                <span>
                  {uploadingNoticeImage
                    ? 'ছবি প্রস্তুত হচ্ছে...'
                    : 'ফোন / গ্যালারি থেকে ছবি আপলোড করো'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingNoticeImage || busy}
                  onChange={handleNoticePhotoUpload}
                  className="hidden"
                />
              </label>
              <input
                type="url"
                placeholder="অথবা ছবির https:// লিংক দিন (Google Drive / Direct)"
                value={noticeImageUrl.startsWith('data:image/') ? '' : noticeImageUrl}
                onChange={(e) => setNoticeImageUrl(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Video Attachment (YouTube / Shorts / Google Drive / MP4 / Facebook) */}
            <div className="p-3.5 rounded-lg border border-slate-800 bg-[#0B1118] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                  <Video className="w-3.5 h-3.5 text-sky-400" />
                  <span>নোটিশের ভিডিও (Video Link)</span>
                </span>
                {noticeVideoUrl && (
                  <button
                    type="button"
                    onClick={() => setNoticeVideoUrl('')}
                    className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    ভিডিও সরাও
                  </button>
                )}
              </div>
              <input
                type="url"
                maxLength={500}
                placeholder="https://youtube.com/... বা Shorts / Drive / Facebook ভিডিও লিংক"
                value={noticeVideoUrl}
                onChange={(e) => setNoticeVideoUrl(e.target.value)}
                className={inputClass}
              />
              <p className="text-[11px] text-slate-400">
                YouTube, Shorts, Google Drive বা MP4 লিংক দিলে নোটিশের ভেতরেই ভিডিও চলবে।
              </p>
            </div>

            {(sanitizeNoticeImageUrl(noticeImageUrl) || sanitizeNoticeVideoUrl(noticeVideoUrl)) && (
              <div className="p-3 rounded-lg border border-slate-800 bg-[#080D14]">
                <div className="text-[11px] font-mono text-slate-400 mb-1">
                  মিডিয়া প্রিভিউ
                </div>
                <NoticeMediaViewer
                  title={noticeTitle || 'Notice Preview'}
                  imageUrl={noticeImageUrl}
                  videoUrl={noticeVideoUrl}
                  compact
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy || uploadingNoticeImage}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingNoticeId ? 'Save Notice Changes' : 'Publish Notice'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#131C28] border border-slate-800 rounded-xl divide-y divide-slate-800">
            <div className="p-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-slate-50">
                Active Notices
              </h3>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                {notices.length} notices
              </span>
            </div>
            {notices.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No notices posted yet.
              </div>
            ) : (
              notices.map((n) => (
                <div key={n.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-sky-300">{n.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{n.audience === 'paid' ? 'Batch Private' : 'Public'}</span>
                      {n.pinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#FBBF24] font-medium">Pinned</span>
                        </>
                      )}
                      {n.imageUrl && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-medium">Photo</span>
                        </>
                      )}
                      {n.videoUrl && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-300 font-medium">Video</span>
                        </>
                      )}
                    </div>
                    <div className="font-semibold text-sm text-slate-100">{n.title}</div>
                    {n.body && <p className="text-xs text-slate-400 mt-1">{n.body}</p>}
                    <NoticeMediaViewer
                      title={n.title}
                      imageUrl={n.imageUrl}
                      videoUrl={n.videoUrl}
                      compact
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditNoticeClick(n)}
                      className="p-2 text-slate-400 hover:text-sky-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit notice"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeNotice(n.id)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/60 transition-colors cursor-pointer"
                      title="Delete notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Students & Registration Approval Queue */}
      {tab === 'students' && (
        <div className="space-y-8">
          {pendingRequests.length > 0 && (
            <div className="bg-[#131C28] border border-amber-700/60 rounded-xl overflow-hidden">
              <div className="px-6 py-4 bg-amber-950/30 border-b border-amber-800/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FBBF24]" />
                  <h3 className="font-display text-base font-bold text-slate-50">
                    Pending Student Registrations ({pendingRequests.length})
                  </h3>
                </div>
                <span className="text-xs text-[#FBBF24]">
                  Approve করলে শিক্ষার্থী সাথে সাথেই Phone + Password দিয়ে ঢুকতে পারবে
                </span>
              </div>
              <div className="divide-y divide-slate-800">
                {pendingRequests.map((req) => (
                  <div
                    key={req.uid}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-100">
                        {req.studentName}{' '}
                        <span className="font-mono text-xs font-semibold text-sky-300 ml-1">
                          {req.phone}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                        <span>{req.college || 'HSC 2028 Batch'}</span>
                        {req.transactionId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-sky-300">
                              {req.paymentMethod || 'Reference'}: {req.transactionId}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void resolveEnrollmentRequest(req, 'approved')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Approve Student</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void resolveEnrollmentRequest(req, 'rejected')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-300 bg-red-950/60 border border-red-800/70 hover:bg-red-900/60 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Pre-Approve Student (Single or Bulk) */}
            <div className="lg:col-span-5 bg-[#131C28] border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-slate-50">
                  Pre-Approve Student
                </h3>
                <div className="inline-flex items-center gap-1 p-0.5 bg-[#0B1118] border border-slate-800 rounded-md">
                  <button
                    type="button"
                    onClick={() => setStudentAddMode('single')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                      studentAddMode === 'single'
                        ? 'bg-[#F59E0B] text-slate-950'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentAddMode('bulk')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                      studentAddMode === 'bulk'
                        ? 'bg-[#F59E0B] text-slate-950'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Bulk List
                  </button>
                </div>
              </div>

              {studentAddMode === 'single' ? (
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Add a student&apos;s 11-digit mobile number (e.g. 01712345678) or Gmail address to grant classroom access.
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mobile Number or Gmail
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={128}
                      placeholder="01712345678 or student@gmail.com"
                      value={studentIdentifier}
                      onChange={(e) => setStudentIdentifier(e.target.value)}
                      className={`${inputClass} font-mono`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      placeholder="e.g. Nafis Rahman"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Batch Roll (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={32}
                        placeholder="HSC28-042"
                        value={studentRoll}
                        onChange={(e) => setStudentRoll(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        College (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={120}
                        placeholder="Chattogram College"
                        value={studentCollege}
                        onChange={(e) => setStudentCollege(e.target.value)}
                        className="w-full px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Approve &amp; Grant Access</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBulkAddStudents} className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Paste multiple 11-digit mobile numbers or Gmail addresses (separated by commas or new lines) to approve everyone at once.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mobile Numbers or Gmails
                    </label>
                    <textarea
                      rows={6}
                      required
                      placeholder={'01712345678\n01812345678\nstudent@gmail.com'}
                      value={bulkIdentifiersText}
                      onChange={(e) => setBulkIdentifiersText(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-[#F59E0B] hover:bg-[#FBBF24] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Approve All Students</span>
                  </button>
                </form>
              )}
            </div>

            {/* Enrolled Students Roster */}
            <div className="lg:col-span-7 bg-[#131C28] border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-slate-50">
                  Approved Batch Students ({filteredEnrollments.length})
                </h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search phone, email or name..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 bg-[#0B1118] border border-slate-700 rounded-lg focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-800">
                {filteredEnrollments.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-400">
                    No approved students found.
                  </div>
                ) : (
                  filteredEnrollments.map((en) => {
                    const displayHandle = en.phone || extractPhoneFromAuthEmail(en.email);
                    return (
                      <div
                        key={en.email}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                en.status === 'active' ? 'text-emerald-400' : 'text-[#FBBF24]'
                              }`}
                            >
                              {en.status === 'active' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <Video className="w-3.5 h-3.5" />
                              )}
                              <span>{en.status === 'active' ? 'Active' : 'Suspended'}</span>
                            </span>
                            {en.rollNumber && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono">{en.rollNumber}</span>
                              </>
                            )}
                            {en.college && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{en.college}</span>
                              </>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-slate-100 truncate">
                            {en.studentName}
                          </div>
                          <div className="text-xs font-mono text-slate-400 truncate">
                            {displayHandle}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              void addOrUpdateEnrollment({
                                identifier: en.phone || en.email,
                                studentName: en.studentName,
                                rollNumber: en.rollNumber,
                                college: en.college,
                                phone: en.phone,
                                status: en.status === 'active' ? 'suspended' : 'active',
                              })
                            }
                            className="px-3 py-1.5 text-xs font-medium border border-slate-700 rounded-lg hover:border-slate-500 text-slate-200 bg-[#0B1118] transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {en.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeEnrollment(en.email)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/60 transition-colors cursor-pointer"
                            title="Remove student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
