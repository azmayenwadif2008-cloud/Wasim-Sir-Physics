import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  verifyBeforeUpdateEmail,
  verifyPasswordResetCode,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  ADMIN_BOOTSTRAP_EMAIL,
  SAMPLE_SEED_CLASSES,
  SAMPLE_SEED_NOTICES,
} from '../data/hsc28Curriculum';
import { adminAuth, adminDb, auth, db, googleProvider } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import {
  decryptEmailFromPhoneAlias,
  derivePhoneAliasId,
  encryptEmailForPhoneAlias,
} from '../lib/phoneAliasCrypto';
import {
  extractPhoneFromAuthEmail,
  formatAuthError,
  isStudentPhoneEmail,
  normalizeBdPhone,
  phoneToAuthEmail,
} from '../lib/phoneAuth';
import {
  sanitizeNoticeImageUrl,
  sanitizeNoticeVideoUrl,
  sanitizeProfilePhotoUrl,
  slugifyId,
} from '../lib/videoUtils';
import type {
  ClassStream,
  Enrollment,
  EnrollmentRequest,
  LectureProgress,
  Notice,
  NoticeAudience,
  NoticeCategory,
  PaymentMethod,
  RecordedClass,
  StudentResult,
} from '../types/portal';

const STUDENT_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const STUDENT_SESSION_STORAGE_KEY = 'wsp_student_session_started_at';
const STUDENT_FORCE_REAUTH_VERSION = '2026-11-27-gmail-req-v1';
const STUDENT_MIGRATION_VERSION_KEY = 'wsp_student_migration_version';
const PENDING_STUDENT_PROFILE_KEY = 'wsp_pending_student_profile';

interface PendingStudentProfile {
  uid: string;
  email: string;
  studentName: string;
  phone: string;
  college?: string;
}

function readPendingStudentProfile(uid: string): PendingStudentProfile | null {
  try {
    const raw = window.localStorage.getItem(PENDING_STUDENT_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingStudentProfile>;
    if (
      parsed.uid === uid &&
      typeof parsed.email === 'string' &&
      typeof parsed.studentName === 'string' &&
      typeof parsed.phone === 'string'
    ) {
      return {
        uid: parsed.uid,
        email: parsed.email,
        studentName: parsed.studentName,
        phone: parsed.phone,
        college: typeof parsed.college === 'string' ? parsed.college : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writePendingStudentProfile(profile: PendingStudentProfile) {
  try {
    window.localStorage.setItem(PENDING_STUDENT_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage unavailability
  }
}

function clearPendingStudentProfile() {
  try {
    window.localStorage.removeItem(PENDING_STUDENT_PROFILE_KEY);
  } catch {
    // Ignore storage unavailability
  }
}

function readStudentLoginTimestamp(uid: string): number | null {
  try {
    const raw = window.localStorage.getItem(STUDENT_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: unknown; startedAt?: unknown };
    if (parsed.uid === uid && typeof parsed.startedAt === 'number' && Number.isFinite(parsed.startedAt)) {
      return parsed.startedAt;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStudentLoginTimestamp(uid: string, timestampMs = Date.now()) {
  try {
    window.localStorage.setItem(
      STUDENT_SESSION_STORAGE_KEY,
      JSON.stringify({ uid, startedAt: timestampMs }),
    );
  } catch {
    // Ignore storage unavailability
  }
}

function clearStudentLoginTimestamp() {
  try {
    window.localStorage.removeItem(STUDENT_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage unavailability
  }
}

function getStudentSessionStartMs(targetUser: User): number {
  const serverSignInMs = targetUser.metadata?.lastSignInTime
    ? Date.parse(targetUser.metadata.lastSignInTime)
    : NaN;
  const storedSignInMs = readStudentLoginTimestamp(targetUser.uid);
  if (Number.isFinite(serverSignInMs)) {
    if (storedSignInMs === null || serverSignInMs > storedSignInMs + 5000) {
      writeStudentLoginTimestamp(targetUser.uid, serverSignInMs);
    }
    return serverSignInMs;
  }
  if (storedSignInMs !== null) {
    return storedSignInMs;
  }
  const now = Date.now();
  writeStudentLoginTimestamp(targetUser.uid, now);
  return now;
}

export interface ClassInput {
  title: string;
  chapterNumber: number;
  chapterName: string;
  lectureNumber: number;
  duration: string;
  description: string;
  isFreePreview: boolean;
  videoUrl: string;
  noteUrl: string;
}

export interface NoticeInput {
  title: string;
  body: string;
  category: NoticeCategory;
  audience: NoticeAudience;
  pinned: boolean;
  imageUrl?: string;
  videoUrl?: string;
}

export interface StudentResultInput {
  studentEmail: string;
  studentName: string;
  rollNumber?: string;
  examTitle: string;
  chapterNumber?: number;
  examDate: string;
  cqMarks?: number;
  mcqMarks?: number;
  obtainedMarks: number;
  totalMarks: number;
  highestMarks?: number;
  meritRank?: string;
  remarks?: string;
}

interface PortalContextValue {
  // Student & public track (primary auth/db)
  user: User | null;
  authReady: boolean;
  isPaidStudent: boolean;
  needsLegacyGmailLink: boolean;
  legacyMigrationClaimEmail: string | null;
  needsStudentEmailVerification: boolean;
  myEnrollment: Enrollment | null;
  myRequest: EnrollmentRequest | null;
  myResults: StudentResult[];
  classes: RecordedClass[];
  notices: Notice[];
  completedClassIds: Set<string>;
  loadingData: boolean;
  enrollmentChecked: boolean;
  authError: string | null;
  needsEmailProviderEnable: boolean;
  clearAuthFeedback: () => void;
  signInWithGoogle: () => Promise<void>;
  registerStudentAccount: (input: {
    studentName: string;
    phone: string;
    email: string;
    password: string;
    college?: string;
  }) => Promise<void>;
  loginStudentWithIdentifier: (identifier: string, password: string) => Promise<void>;
  linkLegacyStudentGmail: (newGmail: string, currentPassword: string) => Promise<void>;
  sendStudentPasswordReset: (email: string) => Promise<void>;
  verifyStudentPasswordResetCode: (oobCode: string) => Promise<string>;
  confirmStudentPasswordReset: (oobCode: string, newPassword: string) => Promise<void>;
  resendStudentVerification: () => Promise<void>;
  refreshStudentVerifiedSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  fetchClassStream: (classId: string) => Promise<ClassStream | null>;
  toggleLectureCompleted: (classId: string, completed: boolean) => Promise<void>;
  submitEnrollmentRequest: (input: {
    studentName: string;
    college?: string;
    phone: string;
    paymentMethod?: PaymentMethod;
    transactionId?: string;
  }) => Promise<void>;
  updateMyProfile: (input: {
    studentName: string;
    college?: string;
    phone?: string;
    guardianPhone?: string;
    sscGpa?: string;
    address?: string;
    photoUrl?: string;
  }) => Promise<void>;

  // Admin track (isolated secondary adminAuth/adminDb)
  adminUser: User | null;
  adminAuthReady: boolean;
  isAdmin: boolean;
  needsAdminEmailVerification: boolean;
  adminAuthError: string | null;
  adminNeedsEmailProviderEnable: boolean;
  clearAdminAuthFeedback: () => void;
  signInAdminWithGoogle: () => Promise<void>;
  loginAdminWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerAdminWithEmailPassword: (email: string, password: string) => Promise<void>;
  linkAdminPassword: (password: string) => Promise<void>;
  resendAdminVerification: () => Promise<void>;
  refreshVerifiedSession: () => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  adminClasses: RecordedClass[];
  adminNotices: Notice[];
  allEnrollments: Enrollment[];
  allRequests: EnrollmentRequest[];
  allResults: StudentResult[];
  fetchAdminClassStream: (classId: string) => Promise<ClassStream | null>;
  publishRecordedClass: (input: ClassInput) => Promise<void>;
  updateRecordedClass: (classId: string, input: ClassInput) => Promise<void>;
  removeRecordedClass: (classId: string) => Promise<void>;
  publishNotice: (input: NoticeInput) => Promise<void>;
  updateNotice: (noticeId: string, input: NoticeInput) => Promise<void>;
  removeNotice: (noticeId: string) => Promise<void>;
  addOrUpdateEnrollment: (input: {
    identifier: string;
    studentName: string;
    rollNumber?: string;
    college?: string;
    phone?: string;
    guardianPhone?: string;
    sectionTime?: string;
    sscGpa?: string;
    address?: string;
    photoUrl?: string;
    status: 'active' | 'suspended';
  }) => Promise<void>;
  bulkAddEnrollments: (identifiers: string[]) => Promise<number>;
  removeEnrollment: (emailKey: string) => Promise<void>;
  resolveEnrollmentRequest: (
    request: EnrollmentRequest,
    decision: 'approved' | 'rejected',
  ) => Promise<void>;
  publishStudentResult: (input: StudentResultInput) => Promise<void>;
  updateStudentResult: (resultId: string, input: StudentResultInput) => Promise<void>;
  removeStudentResult: (resultId: string) => Promise<void>;
  seedDemoContent: () => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  // --- Track 1: Student & Public Session ---
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tokenEmailVerified, setTokenEmailVerified] = useState(false);
  const [studentIsAdminAccount, setStudentIsAdminAccount] = useState(false);
  const [legacyMigrationClaimEmail, setLegacyMigrationClaimEmail] = useState<string | null>(null);
  const [migratedLegacyPhoneEmail, setMigratedLegacyPhoneEmail] = useState<string | null>(null);
  const [myEnrollment, setMyEnrollment] = useState<Enrollment | null>(null);
  const [myRequest, setMyRequest] = useState<EnrollmentRequest | null>(null);
  const [myResults, setMyResults] = useState<StudentResult[]>([]);
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);

  const [classes, setClasses] = useState<RecordedClass[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [completedClassIds, setCompletedClassIds] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsEmailProviderEnable, setNeedsEmailProviderEnable] = useState(false);

  // --- Track 2: Isolated Admin Session ---
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminAuthReady, setAdminAuthReady] = useState(false);
  const [adminTokenVerified, setAdminTokenVerified] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [adminClasses, setAdminClasses] = useState<RecordedClass[]>([]);
  const [adminNotices, setAdminNotices] = useState<Notice[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
  const [allRequests, setAllRequests] = useState<EnrollmentRequest[]>([]);
  const [allResults, setAllResults] = useState<StudentResult[]>([]);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminNeedsEmailProviderEnable, setAdminNeedsEmailProviderEnable] = useState(false);

  const normalizedEmail = user?.email?.trim().toLowerCase() ?? '';
  const isPhoneStudent = isStudentPhoneEmail(normalizedEmail);
  const needsLegacyGmailLink = Boolean(user) && isPhoneStudent;
  const hasVerifiedEmail = Boolean(user?.emailVerified) && tokenEmailVerified;
  const isVerifiedAccount = hasVerifiedEmail || isPhoneStudent;
  const needsStudentEmailVerification =
    Boolean(user) && !isPhoneStudent && !hasVerifiedEmail;
  const isPaidStudent =
    (isVerifiedAccount && myEnrollment?.status === 'active') || studentIsAdminAccount;

  const adminNormalizedEmail = adminUser?.email?.trim().toLowerCase() ?? '';
  const adminHasVerifiedEmail = Boolean(adminUser?.emailVerified) && adminTokenVerified;
  const isBootstrapAdmin =
    adminHasVerifiedEmail && adminNormalizedEmail === ADMIN_BOOTSTRAP_EMAIL;
  const isAdmin = isBootstrapAdmin || isAdminDoc;
  const needsAdminEmailVerification =
    Boolean(adminUser) &&
    adminNormalizedEmail === ADMIN_BOOTSTRAP_EMAIL &&
    !adminHasVerifiedEmail;

  const upsertPhoneLoginAlias = async (
    uid: string,
    rawPhone: string,
    realEmail: string,
    password: string,
  ) => {
    const normalizedPhone = normalizeBdPhone(rawPhone);
    const cleanEmail = realEmail.trim().toLowerCase();
    if (!normalizedPhone || !cleanEmail || isStudentPhoneEmail(cleanEmail) || !password) return;
    const aliasId = await derivePhoneAliasId(normalizedPhone);
    const { ciphertext, iv } = await encryptEmailForPhoneAlias(
      normalizedPhone,
      password,
      cleanEmail,
    );
    await setDoc(doc(db, 'phoneLoginAliases', aliasId), {
      uid,
      ciphertext,
      iv,
      updatedAt: serverTimestamp(),
    });
  };

  const syncStudentSession = async (targetUser: User | null) => {
    setStudentIsAdminAccount(false);
    setLegacyMigrationClaimEmail(null);
    setMigratedLegacyPhoneEmail(null);
    setTokenEmailVerified(false);
    setMyEnrollment(null);
    setMyRequest(null);
    setCompletedClassIds(new Set());
    setEnrollmentChecked(false);

    let storedMigrationVersion: string | null = null;
    try {
      storedMigrationVersion = window.localStorage.getItem(STUDENT_MIGRATION_VERSION_KEY);
    } catch {
      // Ignore storage errors
    }
    if (storedMigrationVersion !== STUDENT_FORCE_REAUTH_VERSION) {
      try {
        window.localStorage.setItem(STUDENT_MIGRATION_VERSION_KEY, STUDENT_FORCE_REAUTH_VERSION);
      } catch {
        // Ignore storage errors
      }
      if (targetUser) {
        clearStudentLoginTimestamp();
        clearPendingStudentProfile();
        setUser(null);
        setAuthError(
          'গুরুত্বপূর্ণ আপডেট: পাসওয়ার্ড ভুলে গেলে রিসেট সুবিধা চালু করতে সবার স্টুডেন্ট সেশন রিসেট করা হয়েছে। অনুগ্রহ করে আবার লগইন করো এবং পাসওয়ার্ড রিসেটের জন্য আসল Gmail যুক্ত করো।',
        );
        try {
          await signOut(auth);
        } catch {
          // Ignore transient signOut errors
        }
        return false;
      }
    }

    if (!targetUser) {
      clearStudentLoginTimestamp();
      setUser(null);
      return false;
    }

    const sessionStartedAt = getStudentSessionStartMs(targetUser);
    if (Date.now() - sessionStartedAt >= STUDENT_SESSION_MAX_AGE_MS) {
      clearStudentLoginTimestamp();
      setUser(null);
      setAuthError('১২ ঘণ্টা পূর্ণ হওয়ায় নিরাপত্তার জন্য আপনার স্টুডেন্ট সেশন লগআউট করা হয়েছে। অনুগ্রহ করে আবার লগইন করুন।');
      try {
        await signOut(auth);
      } catch {
        // Ignore transient signOut errors
      }
      return false;
    }

    if (readStudentLoginTimestamp(targetUser.uid) === null) {
      writeStudentLoginTimestamp(targetUser.uid, sessionStartedAt);
    }

    const targetEmail = targetUser.email?.trim().toLowerCase() ?? '';
    if (!targetUser.emailVerified && !isStudentPhoneEmail(targetEmail)) {
      try {
        await targetUser.reload();
      } catch {
        // Ignore transient network errors during reload
      }
    }

    const current = auth.currentUser ?? targetUser;
    const currentEmail = current.email?.trim().toLowerCase() ?? '';
    let claimVerified = false;
    try {
      let tokenResult = await current.getIdTokenResult();
      if (current.emailVerified && tokenResult.claims.email_verified !== true) {
        await current.getIdToken(true);
        tokenResult = await current.getIdTokenResult();
      }
      claimVerified = tokenResult.claims.email_verified === true;
    } catch {
      claimVerified = Boolean(current.emailVerified);
    }

    setTokenEmailVerified(claimVerified);
    setUser(current);

    if (isStudentPhoneEmail(currentEmail)) {
      try {
        const claimSnap = await getDoc(doc(db, 'phoneMigrationClaims', current.uid));
        if (claimSnap.exists()) {
          const data = claimSnap.data() as { targetEmail?: unknown };
          if (typeof data.targetEmail === 'string') {
            setLegacyMigrationClaimEmail(data.targetEmail);
          }
        }
      } catch {
        // Ignore transient read error
      }
    } else if (claimVerified) {
      const pendingProfile = readPendingStudentProfile(current.uid);
      if (pendingProfile) {
        try {
          const reqRef = doc(db, 'enrollmentRequests', current.uid);
          const existingReq = await getDoc(reqRef);
          if (!existingReq.exists()) {
            const payload: Record<string, unknown> = {
              uid: current.uid,
              email: currentEmail || pendingProfile.email,
              studentName: pendingProfile.studentName.trim().slice(0, 100),
              phone: pendingProfile.phone.trim().slice(0, 24),
              paymentMethod: 'Registration',
              status: 'pending',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            if (pendingProfile.college?.trim()) {
              payload.college = pendingProfile.college.trim().slice(0, 120);
            }
            await setDoc(reqRef, payload);
          }
          clearPendingStudentProfile();
        } catch {
          // Will retry on next verified session sync
        }
      }

      // Complete seamless enrollment migration for legacy phone-only accounts
      try {
        const claimSnap = await getDoc(doc(db, 'phoneMigrationClaims', current.uid));
        if (claimSnap.exists()) {
          const claimData = claimSnap.data() as {
            phoneEmail?: unknown;
            targetEmail?: unknown;
          };
          if (
            claimData.targetEmail === currentEmail &&
            typeof claimData.phoneEmail === 'string' &&
            isStudentPhoneEmail(claimData.phoneEmail)
          ) {
            const sourcePhoneEmail = claimData.phoneEmail.toLowerCase();
            setMigratedLegacyPhoneEmail(sourcePhoneEmail);

            const targetEnrollRef = doc(db, 'enrollments', currentEmail);
            const targetEnrollSnap = await getDoc(targetEnrollRef);
            if (!targetEnrollSnap.exists()) {
              const oldEnrollSnap = await getDoc(doc(db, 'enrollments', sourcePhoneEmail));
              if (oldEnrollSnap.exists()) {
                const oldData = oldEnrollSnap.data() as Enrollment;
                if (oldData.status === 'active') {
                  const migratedDoc: Record<string, unknown> = {
                    email: currentEmail,
                    studentName: oldData.studentName,
                    batch: oldData.batch,
                    status: 'active',
                    addedByUid: oldData.addedByUid,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  };
                  if (oldData.rollNumber !== undefined) migratedDoc.rollNumber = oldData.rollNumber;
                  if (oldData.college !== undefined) migratedDoc.college = oldData.college;
                  if (oldData.phone !== undefined) migratedDoc.phone = oldData.phone;
                  if (oldData.guardianPhone !== undefined) {
                    migratedDoc.guardianPhone = oldData.guardianPhone;
                  }
                  if (oldData.sectionTime !== undefined) migratedDoc.sectionTime = oldData.sectionTime;
                  if (oldData.sscGpa !== undefined) migratedDoc.sscGpa = oldData.sscGpa;
                  if (oldData.address !== undefined) migratedDoc.address = oldData.address;
                  if (oldData.photoUrl !== undefined) migratedDoc.photoUrl = oldData.photoUrl;
                  await setDoc(targetEnrollRef, migratedDoc);
                }
              }
            }

            const reqRef = doc(db, 'enrollmentRequests', current.uid);
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
              const reqData = reqSnap.data() as EnrollmentRequest;
              if (reqData.email === sourcePhoneEmail) {
                await updateDoc(reqRef, {
                  email: currentEmail,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          }
        }
      } catch {
        // Non-fatal: will retry on next verified session sync
      }

      if (currentEmail === ADMIN_BOOTSTRAP_EMAIL) {
        setStudentIsAdminAccount(true);
      } else {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', current.uid));
          setStudentIsAdminAccount(adminSnap.exists());
        } catch {
          setStudentIsAdminAccount(false);
        }
      }
    }

    return claimVerified;
  };

  const syncAdminSession = async (targetUser: User | null) => {
    setIsAdminDoc(false);
    setAdminTokenVerified(false);

    if (!targetUser) {
      setAdminUser(null);
      return false;
    }

    if (!targetUser.emailVerified) {
      try {
        await targetUser.reload();
      } catch {
        // Ignore transient network errors
      }
    }

    const current = adminAuth.currentUser ?? targetUser;
    let claimVerified = false;
    try {
      let tokenResult = await current.getIdTokenResult();
      if (current.emailVerified && tokenResult.claims.email_verified !== true) {
        await current.getIdToken(true);
        tokenResult = await current.getIdTokenResult();
      }
      claimVerified = tokenResult.claims.email_verified === true;
    } catch {
      claimVerified = Boolean(current.emailVerified);
    }

    setAdminTokenVerified(claimVerified);
    setAdminUser(current);

    if (claimVerified) {
      try {
        const adminSnap = await getDoc(doc(adminDb, 'admins', current.uid));
        setIsAdminDoc(adminSnap.exists());
      } catch {
        setIsAdminDoc(false);
      }
    }

    return claimVerified;
  };

  // 1A. Student Auth Listener
  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!mounted) return;
      setAuthReady(false);
      await syncStudentSession(nextUser);
      if (mounted) {
        setAuthReady(true);
      }
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // 1A-2. Enforce 12-hour automatic logout for Student Panel (Admin Panel unaffected)
  useEffect(() => {
    if (!authReady || !user) return;

    const enforceExpiry = () => {
      const startedAt = getStudentSessionStartMs(user);
      const elapsed = Date.now() - startedAt;
      if (elapsed >= STUDENT_SESSION_MAX_AGE_MS) {
        clearStudentLoginTimestamp();
        setAuthError(
          '১২ ঘণ্টা পূর্ণ হওয়ায় নিরাপত্তার জন্য আপনার স্টুডেন্ট সেশন লগআউট করা হয়েছে। অনুগ্রহ করে আবার লগইন করুন।',
        );
        void signOut(auth);
        return true;
      }
      return false;
    };

    if (enforceExpiry()) return;

    const startedAt = getStudentSessionStartMs(user);
    const remainingMs = Math.max(0, STUDENT_SESSION_MAX_AGE_MS - (Date.now() - startedAt));
    const timeoutId = window.setTimeout(() => {
      enforceExpiry();
    }, remainingMs);

    const intervalId = window.setInterval(() => {
      enforceExpiry();
    }, 60 * 1000);

    const handleResumeCheck = () => {
      if (document.visibilityState === 'visible') {
        enforceExpiry();
      }
    };

    window.addEventListener('focus', handleResumeCheck);
    document.addEventListener('visibilitychange', handleResumeCheck);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleResumeCheck);
      document.removeEventListener('visibilitychange', handleResumeCheck);
    };
  }, [authReady, user]);

  // 1B. Admin Auth Listener (isolated)
  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(adminAuth, async (nextUser) => {
      if (!mounted) return;
      setAdminAuthReady(false);
      await syncAdminSession(nextUser);
      if (mounted) {
        setAdminAuthReady(true);
      }
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // 2. Personal Enrollment, Request, Progress & Private Results Listeners (Student track)
  useEffect(() => {
    if (!authReady) return;
    if (!user || !isVerifiedAccount || !normalizedEmail) {
      setMyEnrollment(null);
      setMyRequest(null);
      setMyResults([]);
      setCompletedClassIds(new Set());
      setEnrollmentChecked(true);
      return;
    }

    const enrollmentPath = `enrollments/${normalizedEmail}`;
    const unsubEnrollment = onSnapshot(
      doc(db, 'enrollments', normalizedEmail),
      (snap) => {
        setMyEnrollment(snap.exists() ? (snap.data() as Enrollment) : null);
        setEnrollmentChecked(true);
      },
      (error) => {
        setEnrollmentChecked(true);
        handleFirestoreError(error, OperationType.GET, enrollmentPath, auth.currentUser);
      },
    );

    const reqPath = `enrollmentRequests/${user.uid}`;
    const unsubRequest = onSnapshot(
      doc(db, 'enrollmentRequests', user.uid),
      (snap) => {
        setMyRequest(snap.exists() ? (snap.data() as EnrollmentRequest) : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, reqPath, auth.currentUser);
      },
    );

    const progressPath = `studentProgress/${user.uid}/lectures`;
    const unsubProgress = onSnapshot(
      collection(db, 'studentProgress', user.uid, 'lectures'),
      (snap) => {
        const nextSet = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data() as LectureProgress;
          if (data.completed) nextSet.add(data.classId);
        });
        setCompletedClassIds(nextSet);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, progressPath, auth.currentUser);
      },
    );

    const myResultsPath = `studentResults/${normalizedEmail}`;
    let primaryResults: StudentResult[] = [];
    let legacyResults: StudentResult[] = [];
    const syncMergedResults = () => {
      const mergedMap = new Map<string, StudentResult>();
      for (const item of legacyResults) mergedMap.set(item.id, item);
      for (const item of primaryResults) mergedMap.set(item.id, item);
      const items = Array.from(mergedMap.values()).sort((a, b) => {
        if (a.examDate !== b.examDate) {
          return b.examDate.localeCompare(a.examDate);
        }
        const tA = a.createdAt?.toMillis?.() ?? 0;
        const tB = b.createdAt?.toMillis?.() ?? 0;
        return tB - tA;
      });
      setMyResults(items);
    };

    const unsubMyResults = onSnapshot(
      query(collection(db, 'studentResults'), where('studentEmail', '==', normalizedEmail)),
      (snap) => {
        primaryResults = snap.docs.map((d) => d.data() as StudentResult);
        syncMergedResults();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, myResultsPath, auth.currentUser);
      },
    );

    const unsubLegacyResults =
      migratedLegacyPhoneEmail && migratedLegacyPhoneEmail !== normalizedEmail
        ? onSnapshot(
            query(
              collection(db, 'studentResults'),
              where('studentEmail', '==', migratedLegacyPhoneEmail),
            ),
            (snap) => {
              legacyResults = snap.docs.map((d) => d.data() as StudentResult);
              syncMergedResults();
            },
            (error) => {
              handleFirestoreError(
                error,
                OperationType.LIST,
                `studentResults/${migratedLegacyPhoneEmail}`,
                auth.currentUser,
              );
            },
          )
        : () => {};

    return () => {
      unsubEnrollment();
      unsubRequest();
      unsubProgress();
      unsubMyResults();
      unsubLegacyResults();
    };
  }, [authReady, user, isVerifiedAccount, normalizedEmail, migratedLegacyPhoneEmail]);

  // 3. Classes & Notices Listeners (Student + Public Landing)
  useEffect(() => {
    if (!authReady || !enrollmentChecked) return;

    const classesQuery = isPaidStudent
      ? query(collection(db, 'classes'))
      : query(collection(db, 'classes'), where('isFreePreview', '==', true));

    const noticesQuery = isPaidStudent
      ? query(collection(db, 'notices'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'notices'), where('audience', '==', 'public'));

    setLoadingData(true);

    const unsubClasses = onSnapshot(
      classesQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => d.data() as RecordedClass)
          .sort((a, b) =>
            a.chapterNumber !== b.chapterNumber
              ? a.chapterNumber - b.chapterNumber
              : a.lectureNumber - b.lectureNumber,
          );
        setClasses(items);
        setLoadingData(false);
      },
      (error) => {
        setLoadingData(false);
        handleFirestoreError(error, OperationType.LIST, 'classes', auth.currentUser);
      },
    );

    const unsubNotices = onSnapshot(
      noticesQuery,
      (snap) => {
        const items = snap.docs
          .map((d) => d.data() as Notice)
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const tA = a.createdAt?.toMillis?.() ?? 0;
            const tB = b.createdAt?.toMillis?.() ?? 0;
            return tB - tA;
          });
        setNotices(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notices', auth.currentUser);
      },
    );

    return () => {
      unsubClasses();
      unsubNotices();
    };
  }, [authReady, enrollmentChecked, isPaidStudent]);

  // 4. Admin Studio Listeners (on isolated adminDb)
  useEffect(() => {
    if (!adminAuthReady || !isAdmin) {
      setAllEnrollments([]);
      setAllRequests([]);
      setAllResults([]);
      setAdminClasses([]);
      setAdminNotices([]);
      return;
    }

    const unsubEnrollments = onSnapshot(
      query(collection(adminDb, 'enrollments'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAllEnrollments(snap.docs.map((d) => d.data() as Enrollment));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'enrollments', adminAuth.currentUser);
      },
    );

    const unsubRequests = onSnapshot(
      query(collection(adminDb, 'enrollmentRequests'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAllRequests(snap.docs.map((d) => d.data() as EnrollmentRequest));
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          'enrollmentRequests',
          adminAuth.currentUser,
        );
      },
    );

    const unsubResults = onSnapshot(
      query(collection(adminDb, 'studentResults'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAllResults(snap.docs.map((d) => d.data() as StudentResult));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'studentResults', adminAuth.currentUser);
      },
    );

    const unsubAdminClasses = onSnapshot(
      query(collection(adminDb, 'classes')),
      (snap) => {
        const items = snap.docs
          .map((d) => d.data() as RecordedClass)
          .sort((a, b) =>
            a.chapterNumber !== b.chapterNumber
              ? a.chapterNumber - b.chapterNumber
              : a.lectureNumber - b.lectureNumber,
          );
        setAdminClasses(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'classes', adminAuth.currentUser);
      },
    );

    const unsubAdminNotices = onSnapshot(
      query(collection(adminDb, 'notices'), orderBy('createdAt', 'desc')),
      (snap) => {
        const items = snap.docs
          .map((d) => d.data() as Notice)
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const tA = a.createdAt?.toMillis?.() ?? 0;
            const tB = b.createdAt?.toMillis?.() ?? 0;
            return tB - tA;
          });
        setAdminNotices(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notices', adminAuth.currentUser);
      },
    );

    return () => {
      unsubEnrollments();
      unsubRequests();
      unsubResults();
      unsubAdminClasses();
      unsubAdminNotices();
    };
  }, [adminAuthReady, isAdmin]);

  const clearAuthFeedback = () => {
    setAuthError(null);
    setNeedsEmailProviderEnable(false);
  };

  const clearAdminAuthFeedback = () => {
    setAdminAuthError(null);
    setAdminNeedsEmailProviderEnable(false);
  };

  const signInWithGoogle = async () => {
    clearAuthFeedback();
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      writeStudentLoginTimestamp(cred.user.uid, Date.now());
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
    }
  };

  const signInAdminWithGoogle = async () => {
    clearAdminAuthFeedback();
    try {
      await signInWithPopup(adminAuth, googleProvider);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAdminAuthError(formatted.message);
      setAdminNeedsEmailProviderEnable(formatted.needsProviderEnable);
    }
  };

  const registerStudentAccount = async (input: {
    studentName: string;
    phone: string;
    email: string;
    password: string;
    college?: string;
  }) => {
    clearAuthFeedback();
    const normalizedPhone = normalizeBdPhone(input.phone);
    if (!normalizedPhone) {
      setAuthError('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)।');
      throw new Error('Invalid mobile number');
    }
    const cleanEmail = input.email.trim().toLowerCase();
    if (
      !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanEmail) ||
      isStudentPhoneEmail(cleanEmail)
    ) {
      setAuthError('সঠিক ও সচল Gmail ঠিকানা দিন (পাসওয়ার্ড রিসেটের জন্য এটি প্রয়োজন)।');
      throw new Error('Invalid Gmail');
    }
    if (input.password.length < 6) {
      setAuthError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      throw new Error('Weak password');
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, input.password);
      writeStudentLoginTimestamp(cred.user.uid, Date.now());
      writePendingStudentProfile({
        uid: cred.user.uid,
        email: cleanEmail,
        studentName: input.studentName.trim().slice(0, 100),
        phone: normalizedPhone,
        college: input.college?.trim().slice(0, 120),
      });
      try {
        await upsertPhoneLoginAlias(cred.user.uid, normalizedPhone, cleanEmail, input.password);
      } catch {
        // Best-effort encrypted alias write; refreshed on login
      }
      await updateProfile(cred.user, {
        displayName: input.studentName.trim().slice(0, 100),
      });
      await sendEmailVerification(cred.user);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const loginStudentWithIdentifier = async (identifier: string, password: string) => {
    clearAuthFeedback();
    const trimmed = identifier.trim();
    let targetEmail = '';
    let loginPhone: string | null = null;

    if (trimmed.includes('@')) {
      const lowered = trimmed.toLowerCase();
      if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(lowered)) {
        setAuthError('সঠিক Gmail ঠিকানা অথবা ১১ ডিজিটের মোবাইল নাম্বার দিন।');
        throw new Error('Invalid identifier');
      }
      targetEmail = lowered;
    } else {
      const normalizedPhone = normalizeBdPhone(trimmed);
      if (!normalizedPhone) {
        setAuthError('সঠিক Gmail অথবা ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)।');
        throw new Error('Invalid mobile number');
      }
      loginPhone = normalizedPhone;
      try {
        const aliasId = await derivePhoneAliasId(normalizedPhone);
        const aliasSnap = await getDoc(doc(db, 'phoneLoginAliases', aliasId));
        if (aliasSnap.exists()) {
          const aliasData = aliasSnap.data() as { ciphertext?: unknown; iv?: unknown };
          if (typeof aliasData.ciphertext === 'string' && typeof aliasData.iv === 'string') {
            const decrypted = await decryptEmailFromPhoneAlias(
              normalizedPhone,
              password,
              aliasData.ciphertext,
              aliasData.iv,
            );
            if (!decrypted) {
              setAuthError(
                'পাসওয়ার্ড সঠিক নয়। সম্প্রতি Gmail দিয়ে পাসওয়ার্ড রিসেট করে থাকলে প্রথমে তোমার আসল Gmail ও নতুন পাসওয়ার্ড দিয়ে লগইন করো — এরপর মোবাইল নাম্বার দিয়েও লগইন করা যাবে।',
              );
              throw new Error('Phone alias decryption failed');
            }
            targetEmail = decrypted;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'Phone alias decryption failed') {
          throw err;
        }
        // Fallback to legacy phone email if alias lookup isn't available
      }
      if (!targetEmail) {
        targetEmail = phoneToAuthEmail(normalizedPhone);
      }
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
      writeStudentLoginTimestamp(cred.user.uid, Date.now());
      if (!isStudentPhoneEmail(targetEmail)) {
        // Keep encrypted mobile login alias synchronized with the latest working password
        try {
          let knownPhone = loginPhone ?? readPendingStudentProfile(cred.user.uid)?.phone ?? '';
          if (!knownPhone && cred.user.emailVerified) {
            const [enrollSnap, reqSnap] = await Promise.all([
              getDoc(doc(db, 'enrollments', targetEmail)),
              getDoc(doc(db, 'enrollmentRequests', cred.user.uid)),
            ]);
            if (enrollSnap.exists()) {
              knownPhone = (enrollSnap.data() as Enrollment).phone ?? '';
            }
            if (!knownPhone && reqSnap.exists()) {
              knownPhone = (reqSnap.data() as EnrollmentRequest).phone ?? '';
            }
          }
          if (knownPhone) {
            await upsertPhoneLoginAlias(cred.user.uid, knownPhone, targetEmail, password);
          }
        } catch {
          // Non-fatal alias sync
        }
        if (!cred.user.emailVerified) {
          try {
            await sendEmailVerification(cred.user);
          } catch {
            // Ignore rate limit
          }
        }
      }
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const linkLegacyStudentGmail = async (newGmail: string, currentPassword: string) => {
    clearAuthFeedback();
    const current = auth.currentUser;
    const currentEmail = current?.email?.trim().toLowerCase() ?? '';
    if (!current || !isStudentPhoneEmail(currentEmail)) {
      setAuthError('শুধুমাত্র পুরোনো মোবাইল-ভিত্তিক একাউন্টে নতুন Gmail যুক্ত করা যাবে।');
      throw new Error('Not a legacy phone account');
    }
    const cleanGmail = newGmail.trim().toLowerCase();
    if (
      !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanGmail) ||
      isStudentPhoneEmail(cleanGmail)
    ) {
      setAuthError('পাসওয়ার্ড রিসেটের জন্য আপনার সঠিক আসল Gmail ঠিকানা দিন।');
      throw new Error('Invalid Gmail');
    }
    if (!currentPassword) {
      setAuthError('নিশ্চিত করতে আপনার বর্তমান পাসওয়ার্ড দিন।');
      throw new Error('Password required');
    }

    try {
      const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
      await reauthenticateWithCredential(current, credential);

      const claimRef = doc(db, 'phoneMigrationClaims', current.uid);
      const claimSnap = await getDoc(claimRef);
      if (claimSnap.exists()) {
        await updateDoc(claimRef, {
          targetEmail: cleanGmail,
        });
      } else {
        await setDoc(claimRef, {
          uid: current.uid,
          phoneEmail: currentEmail,
          targetEmail: cleanGmail,
          createdAt: serverTimestamp(),
        });
      }

      const phoneNum = extractPhoneFromAuthEmail(currentEmail);
      await upsertPhoneLoginAlias(current.uid, phoneNum, cleanGmail, currentPassword);
      await verifyBeforeUpdateEmail(current, cleanGmail);
      setLegacyMigrationClaimEmail(cleanGmail);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const sendStudentPasswordReset = async (email: string) => {
    clearAuthFeedback();
    const cleanEmail = email.trim().toLowerCase();
    if (
      !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanEmail) ||
      isStudentPhoneEmail(cleanEmail)
    ) {
      setAuthError('পাসওয়ার্ড রিসেটের জন্য আপনার আসল Gmail ঠিকানা লিখুন।');
      throw new Error('Invalid reset email');
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const verifyStudentPasswordResetCode = async (oobCode: string): Promise<string> => {
    return verifyPasswordResetCode(auth, oobCode);
  };

  const confirmStudentPasswordReset = async (oobCode: string, newPassword: string) => {
    clearAuthFeedback();
    if (newPassword.length < 6) {
      setAuthError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      throw new Error('Weak password');
    }
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      throw error;
    }
  };

  const resendStudentVerification = async () => {
    if (!auth.currentUser) return;
    clearAuthFeedback();
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      throw error;
    }
  };

  const refreshStudentVerifiedSession = async (): Promise<boolean> => {
    const current = auth.currentUser;
    if (!current) return false;
    setAuthReady(false);
    try {
      await current.reload();
      await current.getIdToken(true);
      return await syncStudentSession(auth.currentUser ?? current);
    } finally {
      setAuthReady(true);
    }
  };

  const loginAdminWithEmailPassword = async (email: string, password: string) => {
    clearAdminAuthFeedback();
    try {
      const cred = await signInWithEmailAndPassword(adminAuth, email.trim(), password);
      if (!cred.user.emailVerified) {
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Ignore rate limits
        }
      }
    } catch (error) {
      const formatted = formatAuthError(error);
      setAdminAuthError(formatted.message);
      setAdminNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const registerAdminWithEmailPassword = async (email: string, password: string) => {
    clearAdminAuthFeedback();
    if (email.trim().toLowerCase() !== ADMIN_BOOTSTRAP_EMAIL) {
      setAdminAuthError('কেবল অনুমোদিত Admin Gmail দিয়ে সেটআপ করা যাবে।');
      throw new Error('Invalid admin email');
    }
    try {
      const cred = await createUserWithEmailAndPassword(adminAuth, email.trim(), password);
      await sendEmailVerification(cred.user);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAdminAuthError(formatted.message);
      setAdminNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const linkAdminPassword = async (password: string) => {
    clearAdminAuthFeedback();
    if (!adminUser || !adminUser.email) {
      throw new Error('Sign in with Google first to link a password.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    try {
      const credential = EmailAuthProvider.credential(adminUser.email, password);
      await linkWithCredential(adminUser, credential);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAdminAuthError(formatted.message);
      setAdminNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const resendAdminVerification = async () => {
    if (!adminUser) return;
    await sendEmailVerification(adminUser);
  };

  const refreshVerifiedSession = async (): Promise<boolean> => {
    const current = adminAuth.currentUser;
    if (!current) return false;
    setAdminAuthReady(false);
    try {
      await current.reload();
      await current.getIdToken(true);
      return await syncAdminSession(adminAuth.currentUser ?? current);
    } finally {
      setAdminAuthReady(true);
    }
  };

  const logout = async () => {
    clearAuthFeedback();
    clearStudentLoginTimestamp();
    await signOut(auth);
  };

  const logoutAdmin = async () => {
    clearAdminAuthFeedback();
    await signOut(adminAuth);
  };

  const fetchClassStream = async (classId: string): Promise<ClassStream | null> => {
    const path = `classStreams/${classId}`;
    try {
      const snap = await getDoc(doc(db, 'classStreams', classId));
      return snap.exists() ? (snap.data() as ClassStream) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path, auth.currentUser);
    }
  };

  const fetchAdminClassStream = async (classId: string): Promise<ClassStream | null> => {
    const path = `classStreams/${classId}`;
    try {
      const snap = await getDoc(doc(adminDb, 'classStreams', classId));
      return snap.exists() ? (snap.data() as ClassStream) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path, adminAuth.currentUser);
    }
  };

  const toggleLectureCompleted = async (classId: string, completed: boolean) => {
    if (!user || !isVerifiedAccount) return;
    const path = `studentProgress/${user.uid}/lectures/${classId}`;
    try {
      const ref = doc(db, 'studentProgress', user.uid, 'lectures', classId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, {
          completed,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          uid: user.uid,
          classId,
          completed,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth.currentUser);
    }
  };

  const submitEnrollmentRequest = async (input: {
    studentName: string;
    college?: string;
    phone: string;
    paymentMethod?: PaymentMethod;
    transactionId?: string;
  }) => {
    if (!user || !normalizedEmail) throw new Error('Please sign in first.');
    const cleanName = input.studentName.trim().slice(0, 100);
    const normalizedPhone = normalizeBdPhone(input.phone) ?? input.phone.trim();
    const cleanPhone = normalizedPhone.slice(0, 24);
    if (cleanName.length < 2) {
      throw new Error('তোমার পুরো নাম কমপক্ষে ২ অক্ষরের হতে হবে।');
    }
    if (cleanPhone.length < 6) {
      throw new Error('সঠিক মোবাইল নাম্বার দাও (যেমন: 01712345678)।');
    }

    const path = `enrollmentRequests/${user.uid}`;
    try {
      const existingSnap = await getDoc(doc(db, 'enrollmentRequests', user.uid));
      const mutableFields: Record<string, unknown> = {
        studentName: cleanName,
        phone: cleanPhone,
        paymentMethod: input.paymentMethod ?? 'Registration',
        updatedAt: serverTimestamp(),
      };
      if (input.college?.trim()) {
        mutableFields.college = input.college.trim().slice(0, 120);
      }
      if (input.transactionId?.trim()) {
        mutableFields.transactionId = input.transactionId.trim().slice(0, 64);
      }
      if (existingSnap.exists()) {
        await updateDoc(doc(db, 'enrollmentRequests', user.uid), mutableFields);
      } else {
        await setDoc(doc(db, 'enrollmentRequests', user.uid), {
          uid: user.uid,
          email: normalizedEmail,
          ...mutableFields,
          status: 'pending',
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, auth.currentUser);
    }
  };

  const publishRecordedClass = async (input: ClassInput) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const classId = `${slugifyId(`ch${input.chapterNumber}-lec${input.lectureNumber}-${input.title}`).slice(0, 60)}-${Date.now().toString(36)}`;
    const batch = writeBatch(adminDb);
    const now = serverTimestamp();

    batch.set(doc(adminDb, 'classes', classId), {
      id: classId,
      title: input.title.trim().slice(0, 140),
      chapterNumber: input.chapterNumber,
      chapterName: input.chapterName.trim().slice(0, 100),
      lectureNumber: input.lectureNumber,
      duration: input.duration.trim().slice(0, 24),
      description: input.description.trim().slice(0, 600),
      isFreePreview: input.isFreePreview,
      authorUid: adminUser.uid,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(adminDb, 'classStreams', classId), {
      classId,
      videoUrl: input.videoUrl.trim().slice(0, 400),
      noteUrl: input.noteUrl.trim().slice(0, 400),
      isFreePreview: input.isFreePreview,
      authorUid: adminUser.uid,
      createdAt: now,
      updatedAt: now,
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `classes/${classId}`, adminAuth.currentUser);
    }
  };

  const updateRecordedClass = async (classId: string, input: ClassInput) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const batch = writeBatch(adminDb);
    const now = serverTimestamp();

    batch.update(doc(adminDb, 'classes', classId), {
      title: input.title.trim().slice(0, 140),
      chapterNumber: input.chapterNumber,
      chapterName: input.chapterName.trim().slice(0, 100),
      lectureNumber: input.lectureNumber,
      duration: input.duration.trim().slice(0, 24),
      description: input.description.trim().slice(0, 600),
      isFreePreview: input.isFreePreview,
      updatedAt: now,
    });

    batch.update(doc(adminDb, 'classStreams', classId), {
      videoUrl: input.videoUrl.trim().slice(0, 400),
      noteUrl: input.noteUrl.trim().slice(0, 400),
      isFreePreview: input.isFreePreview,
      updatedAt: now,
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `classes/${classId}`,
        adminAuth.currentUser,
      );
    }
  };

  const removeRecordedClass = async (classId: string) => {
    if (!isAdmin) throw new Error('Admin access required.');
    const batch = writeBatch(adminDb);
    batch.delete(doc(adminDb, 'classes', classId));
    batch.delete(doc(adminDb, 'classStreams', classId));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `classes/${classId}`,
        adminAuth.currentUser,
      );
    }
  };

  const publishNotice = async (input: NoticeInput) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const noticeId = `${slugifyId(input.title).slice(0, 50)}-${Date.now().toString(36)}`;
    const safeImageUrl = sanitizeNoticeImageUrl(input.imageUrl ?? '');
    const safeVideoUrl = sanitizeNoticeVideoUrl(input.videoUrl ?? '');
    try {
      await setDoc(doc(adminDb, 'notices', noticeId), {
        id: noticeId,
        title: input.title.trim().slice(0, 140),
        body: input.body.trim().slice(0, 1200),
        category: input.category,
        audience: input.audience,
        pinned: input.pinned,
        imageUrl: safeImageUrl,
        videoUrl: safeVideoUrl,
        authorUid: adminUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `notices/${noticeId}`,
        adminAuth.currentUser,
      );
    }
  };

  const updateNotice = async (noticeId: string, input: NoticeInput) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const safeImageUrl = sanitizeNoticeImageUrl(input.imageUrl ?? '');
    const safeVideoUrl = sanitizeNoticeVideoUrl(input.videoUrl ?? '');
    try {
      await updateDoc(doc(adminDb, 'notices', noticeId), {
        title: input.title.trim().slice(0, 140),
        body: input.body.trim().slice(0, 1200),
        category: input.category,
        audience: input.audience,
        pinned: input.pinned,
        imageUrl: safeImageUrl,
        videoUrl: safeVideoUrl,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `notices/${noticeId}`,
        adminAuth.currentUser,
      );
    }
  };

  const removeNotice = async (noticeId: string) => {
    if (!isAdmin) throw new Error('Admin access required.');
    try {
      await deleteDoc(doc(adminDb, 'notices', noticeId));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `notices/${noticeId}`,
        adminAuth.currentUser,
      );
    }
  };

  const resolveIdentifierToEmailAndPhone = (
    identifier: string,
    explicitPhone?: string,
  ): { emailKey: string; phone: string } | null => {
    const trimmed = identifier.trim().toLowerCase();
    const asPhone = normalizeBdPhone(trimmed);
    if (asPhone) {
      return { emailKey: phoneToAuthEmail(asPhone), phone: asPhone };
    }
    if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(trimmed) && trimmed.length <= 128) {
      const phoneFromEmail = isStudentPhoneEmail(trimmed) ? trimmed.split('@')[0] : '';
      return { emailKey: trimmed, phone: explicitPhone?.trim() || phoneFromEmail };
    }
    return null;
  };

  const updateMyProfile = async (input: {
    studentName: string;
    college?: string;
    phone?: string;
    guardianPhone?: string;
    sscGpa?: string;
    address?: string;
    photoUrl?: string;
  }) => {
    if (!user || !isVerifiedAccount || !normalizedEmail || !myEnrollment) {
      throw new Error('প্রোফাইল আপডেট করতে ভেরিফায়েড শিক্ষার্থী অ্যাকাউন্ট প্রয়োজন।');
    }
    const path = `enrollments/${normalizedEmail}`;
    const safePhoto =
      input.photoUrl !== undefined
        ? sanitizeProfilePhotoUrl(input.photoUrl)
        : (myEnrollment.photoUrl ?? '');
    try {
      await updateDoc(doc(db, 'enrollments', normalizedEmail), {
        studentName: input.studentName.trim().slice(0, 100) || myEnrollment.studentName,
        college: (input.college ?? '').trim().slice(0, 120),
        phone: (input.phone ?? '').trim().slice(0, 24),
        guardianPhone: (input.guardianPhone ?? '').trim().slice(0, 24),
        sscGpa: (input.sscGpa ?? '').trim().slice(0, 40),
        address: (input.address ?? '').trim().slice(0, 200),
        photoUrl: safePhoto,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, auth.currentUser);
    }
  };

  const addOrUpdateEnrollment = async (input: {
    identifier: string;
    studentName: string;
    rollNumber?: string;
    college?: string;
    phone?: string;
    guardianPhone?: string;
    sectionTime?: string;
    sscGpa?: string;
    address?: string;
    photoUrl?: string;
    status: 'active' | 'suspended';
  }) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const resolved = resolveIdentifierToEmailAndPhone(input.identifier, input.phone);
    if (!resolved) {
      throw new Error('Enter a valid 11-digit mobile number (01XXXXXXXXX) or Gmail.');
    }

    const path = `enrollments/${resolved.emailKey}`;
    try {
      const existingSnap = await getDoc(doc(adminDb, 'enrollments', resolved.emailKey));
      if (existingSnap.exists()) {
        const prev = existingSnap.data() as Enrollment;
        await updateDoc(doc(adminDb, 'enrollments', resolved.emailKey), {
          studentName: input.studentName.trim().slice(0, 100),
          rollNumber: (input.rollNumber ?? prev.rollNumber ?? '').trim().slice(0, 32),
          college: (input.college ?? prev.college ?? '').trim().slice(0, 120),
          phone: resolved.phone.slice(0, 24),
          guardianPhone: (input.guardianPhone ?? prev.guardianPhone ?? '').trim().slice(0, 24),
          sectionTime: (input.sectionTime ?? prev.sectionTime ?? '').trim().slice(0, 80),
          sscGpa: (input.sscGpa ?? prev.sscGpa ?? '').trim().slice(0, 40),
          address: (input.address ?? prev.address ?? '').trim().slice(0, 200),
          photoUrl:
            input.photoUrl !== undefined
              ? sanitizeProfilePhotoUrl(input.photoUrl)
              : (prev.photoUrl ?? ''),
          status: input.status,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(adminDb, 'enrollments', resolved.emailKey), {
          email: resolved.emailKey,
          studentName: input.studentName.trim().slice(0, 100),
          batch: 'HSC-28',
          rollNumber: (input.rollNumber ?? '').trim().slice(0, 32),
          college: (input.college ?? '').trim().slice(0, 120),
          phone: resolved.phone.slice(0, 24),
          guardianPhone: (input.guardianPhone ?? '').trim().slice(0, 24),
          sectionTime: (input.sectionTime ?? '').trim().slice(0, 80),
          sscGpa: (input.sscGpa ?? '').trim().slice(0, 40),
          address: (input.address ?? '').trim().slice(0, 200),
          photoUrl: sanitizeProfilePhotoUrl(input.photoUrl ?? ''),
          status: input.status,
          addedByUid: adminUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path, adminAuth.currentUser);
    }
  };

  const bulkAddEnrollments = async (identifiers: string[]): Promise<number> => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const mapped = new Map<string, { emailKey: string; phone: string }>();

    for (const raw of identifiers) {
      const res = resolveIdentifierToEmailAndPhone(raw);
      if (res) mapped.set(res.emailKey, res);
    }
    if (mapped.size === 0) return 0;

    const batch = writeBatch(adminDb);
    const now = serverTimestamp();

    for (const { emailKey, phone } of mapped.values()) {
      const fallbackName = phone
        ? `Student ${phone.slice(-4)}`
        : emailKey.split('@')[0]?.replace(/[._-]+/g, ' ') || 'HSC 28 Student';
      batch.set(
        doc(adminDb, 'enrollments', emailKey),
        {
          email: emailKey,
          studentName: fallbackName.slice(0, 100),
          batch: 'HSC-28',
          rollNumber: '',
          college: '',
          phone,
          status: 'active',
          addedByUid: adminUser.uid,
          createdAt: now,
          updatedAt: now,
        },
        { merge: false },
      );
    }

    try {
      await batch.commit();
      return mapped.size;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'enrollments/bulk', adminAuth.currentUser);
    }
  };

  const removeEnrollment = async (emailKey: string) => {
    if (!isAdmin) throw new Error('Admin access required.');
    try {
      await deleteDoc(doc(adminDb, 'enrollments', emailKey));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `enrollments/${emailKey}`,
        adminAuth.currentUser,
      );
    }
  };

  const resolveEnrollmentRequest = async (
    request: EnrollmentRequest,
    decision: 'approved' | 'rejected',
  ) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const batch = writeBatch(adminDb);
    const now = serverTimestamp();

    batch.update(doc(adminDb, 'enrollmentRequests', request.uid), {
      status: decision,
      updatedAt: now,
    });

    if (decision === 'approved') {
      const emailKey = request.email.trim().toLowerCase();
      batch.set(doc(adminDb, 'enrollments', emailKey), {
        email: emailKey,
        studentName: request.studentName,
        batch: 'HSC-28',
        college: request.college ?? '',
        phone: request.phone,
        rollNumber: `HSC28-${request.uid.slice(0, 4).toUpperCase()}`,
        status: 'active',
        addedByUid: adminUser.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `enrollmentRequests/${request.uid}`,
        adminAuth.currentUser,
      );
    }
  };

  const publishStudentResult = async (input: StudentResultInput) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const studentEmail = input.studentEmail.trim().toLowerCase();
    const resultId = `${slugifyId(input.examTitle).slice(0, 40)}-${Date.now().toString(36)}`;
    const totalMarks = Math.max(1, Math.min(500, Number(input.totalMarks) || 1));
    const obtainedMarks = Math.max(0, Math.min(totalMarks, Number(input.obtainedMarks) || 0));
    const payload: Record<string, unknown> = {
      id: resultId,
      studentEmail,
      studentName: input.studentName.trim().slice(0, 100),
      rollNumber: (input.rollNumber ?? '').trim().slice(0, 32),
      examTitle: input.examTitle.trim().slice(0, 140),
      chapterNumber: Math.max(0, Math.min(20, Math.round(Number(input.chapterNumber) || 0))),
      examDate: input.examDate.trim().slice(0, 32) || new Date().toISOString().slice(0, 10),
      obtainedMarks,
      totalMarks,
      meritRank: (input.meritRank ?? '').trim().slice(0, 40),
      remarks: (input.remarks ?? '').trim().slice(0, 500),
      authorUid: adminUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.cqMarks !== undefined && !Number.isNaN(Number(input.cqMarks))) {
      payload.cqMarks = Math.max(0, Math.min(500, Number(input.cqMarks)));
    }
    if (input.mcqMarks !== undefined && !Number.isNaN(Number(input.mcqMarks))) {
      payload.mcqMarks = Math.max(0, Math.min(500, Number(input.mcqMarks)));
    }
    if (input.highestMarks !== undefined && !Number.isNaN(Number(input.highestMarks))) {
      payload.highestMarks = Math.max(0, Math.min(500, Number(input.highestMarks)));
    }

    try {
      await setDoc(doc(adminDb, 'studentResults', resultId), payload);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `studentResults/${resultId}`,
        adminAuth.currentUser,
      );
    }
  };

  const updateStudentResult = async (resultId: string, input: StudentResultInput) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const totalMarks = Math.max(1, Math.min(500, Number(input.totalMarks) || 1));
    const obtainedMarks = Math.max(0, Math.min(totalMarks, Number(input.obtainedMarks) || 0));
    const payload: Record<string, unknown> = {
      studentName: input.studentName.trim().slice(0, 100),
      rollNumber: (input.rollNumber ?? '').trim().slice(0, 32),
      examTitle: input.examTitle.trim().slice(0, 140),
      chapterNumber: Math.max(0, Math.min(20, Math.round(Number(input.chapterNumber) || 0))),
      examDate: input.examDate.trim().slice(0, 32) || new Date().toISOString().slice(0, 10),
      obtainedMarks,
      totalMarks,
      meritRank: (input.meritRank ?? '').trim().slice(0, 40),
      remarks: (input.remarks ?? '').trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    };
    if (input.cqMarks !== undefined && !Number.isNaN(Number(input.cqMarks))) {
      payload.cqMarks = Math.max(0, Math.min(500, Number(input.cqMarks)));
    }
    if (input.mcqMarks !== undefined && !Number.isNaN(Number(input.mcqMarks))) {
      payload.mcqMarks = Math.max(0, Math.min(500, Number(input.mcqMarks)));
    }
    if (input.highestMarks !== undefined && !Number.isNaN(Number(input.highestMarks))) {
      payload.highestMarks = Math.max(0, Math.min(500, Number(input.highestMarks)));
    }

    try {
      await updateDoc(doc(adminDb, 'studentResults', resultId), payload);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `studentResults/${resultId}`,
        adminAuth.currentUser,
      );
    }
  };

  const removeStudentResult = async (resultId: string) => {
    if (!isAdmin) throw new Error('Admin access required.');
    try {
      await deleteDoc(doc(adminDb, 'studentResults', resultId));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `studentResults/${resultId}`,
        adminAuth.currentUser,
      );
    }
  };

  const seedDemoContent = async () => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required.');
    const batch = writeBatch(adminDb);
    const now = serverTimestamp();

    for (const item of SAMPLE_SEED_CLASSES) {
      batch.set(doc(adminDb, 'classes', item.id), {
        id: item.id,
        title: item.title,
        chapterNumber: item.chapterNumber,
        chapterName: item.chapterName,
        lectureNumber: item.lectureNumber,
        duration: item.duration,
        description: item.description,
        isFreePreview: item.isFreePreview,
        authorUid: adminUser.uid,
        createdAt: now,
        updatedAt: now,
      });

      batch.set(doc(adminDb, 'classStreams', item.id), {
        classId: item.id,
        videoUrl: item.videoUrl,
        noteUrl: item.noteUrl,
        isFreePreview: item.isFreePreview,
        authorUid: adminUser.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const notice of SAMPLE_SEED_NOTICES) {
      batch.set(doc(adminDb, 'notices', notice.id), {
        id: notice.id,
        title: notice.title,
        body: notice.body,
        category: notice.category,
        audience: notice.audience,
        pinned: notice.pinned,
        authorUid: adminUser.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes/seed', adminAuth.currentUser);
    }
  };

  const value = useMemo<PortalContextValue>(
    () => ({
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
      updateMyProfile,
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
      linkAdminPassword,
      resendAdminVerification,
      refreshVerifiedSession,
      logoutAdmin,
      adminClasses,
      adminNotices,
      allEnrollments,
      allRequests,
      allResults,
      fetchAdminClassStream,
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
      publishStudentResult,
      updateStudentResult,
      removeStudentResult,
      seedDemoContent,
    }),
    [
      user,
      authReady,
      tokenEmailVerified,
      studentIsAdminAccount,
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
      adminUser,
      adminAuthReady,
      adminTokenVerified,
      isAdmin,
      needsAdminEmailVerification,
      adminAuthError,
      adminNeedsEmailProviderEnable,
      adminClasses,
      adminNotices,
      allEnrollments,
      allRequests,
      allResults,
    ],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside PortalProvider');
  return ctx;
}
