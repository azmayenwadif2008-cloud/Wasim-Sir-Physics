import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
import { auth, db, googleProvider } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import {
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
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  isPaidStudent: boolean;
  needsAdminEmailVerification: boolean;
  myEnrollment: Enrollment | null;
  myRequest: EnrollmentRequest | null;
  myResults: StudentResult[];
  classes: RecordedClass[];
  notices: Notice[];
  completedClassIds: Set<string>;
  allEnrollments: Enrollment[];
  allRequests: EnrollmentRequest[];
  allResults: StudentResult[];
  loadingData: boolean;
  authError: string | null;
  needsEmailProviderEnable: boolean;
  clearAuthFeedback: () => void;
  signInWithGoogle: () => Promise<void>;
  registerStudentWithPhone: (input: {
    studentName: string;
    phone: string;
    password: string;
    college?: string;
  }) => Promise<void>;
  loginStudentWithPhone: (phone: string, password: string) => Promise<void>;
  loginAdminWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerAdminWithEmailPassword: (email: string, password: string) => Promise<void>;
  linkAdminPassword: (password: string) => Promise<void>;
  resendAdminVerification: () => Promise<void>;
  refreshVerifiedSession: () => Promise<boolean>;
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
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tokenEmailVerified, setTokenEmailVerified] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [myEnrollment, setMyEnrollment] = useState<Enrollment | null>(null);
  const [myRequest, setMyRequest] = useState<EnrollmentRequest | null>(null);
  const [myResults, setMyResults] = useState<StudentResult[]>([]);
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);

  const [classes, setClasses] = useState<RecordedClass[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [completedClassIds, setCompletedClassIds] = useState<Set<string>>(new Set());
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
  const [allRequests, setAllRequests] = useState<EnrollmentRequest[]>([]);
  const [allResults, setAllResults] = useState<StudentResult[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsEmailProviderEnable, setNeedsEmailProviderEnable] = useState(false);

  const normalizedEmail = user?.email?.trim().toLowerCase() ?? '';
  const isPhoneStudent = isStudentPhoneEmail(normalizedEmail);
  const hasVerifiedEmail = Boolean(user?.emailVerified) && tokenEmailVerified;
  const isVerifiedAccount = hasVerifiedEmail || isPhoneStudent;
  const isBootstrapAdmin = hasVerifiedEmail && normalizedEmail === ADMIN_BOOTSTRAP_EMAIL;
  const isAdmin = isBootstrapAdmin || isAdminDoc;
  const needsAdminEmailVerification =
    Boolean(user) && normalizedEmail === ADMIN_BOOTSTRAP_EMAIL && !hasVerifiedEmail;
  const isPaidStudent = isVerifiedAccount && myEnrollment?.status === 'active';

  const syncUserAndToken = async (targetUser: User | null) => {
    setIsAdminDoc(false);
    setTokenEmailVerified(false);
    setMyEnrollment(null);
    setMyRequest(null);
    setCompletedClassIds(new Set());
    setEnrollmentChecked(false);

    if (!targetUser) {
      setUser(null);
      return false;
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

    if (claimVerified) {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', current.uid));
        setIsAdminDoc(adminSnap.exists());
      } catch {
        setIsAdminDoc(false);
      }
    }

    return claimVerified;
  };

  // 1. Auth Listener
  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!mounted) return;
      setAuthReady(false);
      await syncUserAndToken(nextUser);
      if (mounted) {
        setAuthReady(true);
      }
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // 2. Personal Enrollment, Request & Lecture Progress Listeners
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
        handleFirestoreError(error, OperationType.GET, enrollmentPath);
      },
    );

    const reqPath = `enrollmentRequests/${user.uid}`;
    const unsubRequest = onSnapshot(
      doc(db, 'enrollmentRequests', user.uid),
      (snap) => {
        setMyRequest(snap.exists() ? (snap.data() as EnrollmentRequest) : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, reqPath);
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
        handleFirestoreError(error, OperationType.LIST, progressPath);
      },
    );

    const myResultsPath = `studentResults/${normalizedEmail}`;
    const unsubMyResults = onSnapshot(
      query(collection(db, 'studentResults'), where('studentEmail', '==', normalizedEmail)),
      (snap) => {
        const items = snap.docs
          .map((d) => d.data() as StudentResult)
          .sort((a, b) => {
            if (a.examDate !== b.examDate) {
              return b.examDate.localeCompare(a.examDate);
            }
            const tA = a.createdAt?.toMillis?.() ?? 0;
            const tB = b.createdAt?.toMillis?.() ?? 0;
            return tB - tA;
          });
        setMyResults(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, myResultsPath);
      },
    );

    return () => {
      unsubEnrollment();
      unsubRequest();
      unsubProgress();
      unsubMyResults();
    };
  }, [authReady, user, isVerifiedAccount, normalizedEmail]);

  // 3. Classes & Notices Listeners
  useEffect(() => {
    if (!authReady || !enrollmentChecked) return;

    const hasFullAccess = isAdmin || isPaidStudent;

    const classesQuery = hasFullAccess
      ? query(
          collection(db, 'classes'),
          orderBy('chapterNumber', 'asc'),
          orderBy('lectureNumber', 'asc'),
        )
      : query(collection(db, 'classes'), where('isFreePreview', '==', true));

    const noticesQuery = hasFullAccess
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
        handleFirestoreError(error, OperationType.LIST, 'classes');
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
        handleFirestoreError(error, OperationType.LIST, 'notices');
      },
    );

    return () => {
      unsubClasses();
      unsubNotices();
    };
  }, [authReady, enrollmentChecked, isAdmin, isPaidStudent]);

  // 4. Admin Roster, Pending Requests & Individual Results Listeners
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setAllEnrollments([]);
      setAllRequests([]);
      setAllResults([]);
      return;
    }

    const unsubEnrollments = onSnapshot(
      query(collection(db, 'enrollments'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAllEnrollments(snap.docs.map((d) => d.data() as Enrollment));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'enrollments');
      },
    );

    const unsubRequests = onSnapshot(
      query(collection(db, 'enrollmentRequests'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAllRequests(snap.docs.map((d) => d.data() as EnrollmentRequest));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'enrollmentRequests');
      },
    );

    const unsubResults = onSnapshot(
      query(collection(db, 'studentResults'), orderBy('createdAt', 'desc')),
      (snap) => {
        setAllResults(snap.docs.map((d) => d.data() as StudentResult));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'studentResults');
      },
    );

    return () => {
      unsubEnrollments();
      unsubRequests();
      unsubResults();
    };
  }, [authReady, isAdmin]);

  const clearAuthFeedback = () => {
    setAuthError(null);
    setNeedsEmailProviderEnable(false);
  };

  const signInWithGoogle = async () => {
    clearAuthFeedback();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
    }
  };

  const registerStudentWithPhone = async (input: {
    studentName: string;
    phone: string;
    password: string;
    college?: string;
  }) => {
    clearAuthFeedback();
    const normalizedPhone = normalizeBdPhone(input.phone);
    if (!normalizedPhone) {
      setAuthError('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)।');
      throw new Error('Invalid mobile number');
    }
    if (input.password.length < 6) {
      setAuthError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      throw new Error('Weak password');
    }
    const phoneEmail = phoneToAuthEmail(normalizedPhone);
    try {
      const cred = await createUserWithEmailAndPassword(auth, phoneEmail, input.password);
      await updateProfile(cred.user, {
        displayName: input.studentName.trim().slice(0, 100),
      });

      const payload: Record<string, unknown> = {
        uid: cred.user.uid,
        email: phoneEmail,
        studentName: input.studentName.trim().slice(0, 100),
        phone: normalizedPhone,
        paymentMethod: 'Registration',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (input.college?.trim()) {
        payload.college = input.college.trim().slice(0, 120);
      }
      await setDoc(doc(db, 'enrollmentRequests', cred.user.uid), payload);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const loginStudentWithPhone = async (phone: string, password: string) => {
    clearAuthFeedback();
    const normalizedPhone = normalizeBdPhone(phone);
    if (!normalizedPhone) {
      setAuthError('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)।');
      throw new Error('Invalid mobile number');
    }
    const phoneEmail = phoneToAuthEmail(normalizedPhone);
    try {
      await signInWithEmailAndPassword(auth, phoneEmail, password);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const loginAdminWithEmailPassword = async (email: string, password: string) => {
    clearAuthFeedback();
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!cred.user.emailVerified) {
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Ignore rate limits
        }
      }
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const registerAdminWithEmailPassword = async (email: string, password: string) => {
    clearAuthFeedback();
    if (email.trim().toLowerCase() !== ADMIN_BOOTSTRAP_EMAIL) {
      setAuthError(`কেবল নির্ধারিত Admin Gmail (${ADMIN_BOOTSTRAP_EMAIL}) দিয়ে সেটআপ করা যাবে।`);
      throw new Error('Invalid admin email');
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(cred.user);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const linkAdminPassword = async (password: string) => {
    clearAuthFeedback();
    if (!user || !user.email) {
      throw new Error('Sign in with Google first to link a password.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await linkWithCredential(user, credential);
    } catch (error) {
      const formatted = formatAuthError(error);
      setAuthError(formatted.message);
      setNeedsEmailProviderEnable(formatted.needsProviderEnable);
      throw error;
    }
  };

  const resendAdminVerification = async () => {
    if (!user) return;
    await sendEmailVerification(user);
  };

  const refreshVerifiedSession = async (): Promise<boolean> => {
    const current = auth.currentUser;
    if (!current) return false;
    setAuthReady(false);
    try {
      await current.reload();
      await current.getIdToken(true);
      return await syncUserAndToken(auth.currentUser ?? current);
    } finally {
      setAuthReady(true);
    }
  };

  const logout = async () => {
    clearAuthFeedback();
    await signOut(auth);
  };

  const fetchClassStream = async (classId: string): Promise<ClassStream | null> => {
    const path = `classStreams/${classId}`;
    try {
      const snap = await getDoc(doc(db, 'classStreams', classId));
      return snap.exists() ? (snap.data() as ClassStream) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
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
      handleFirestoreError(error, OperationType.WRITE, path);
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
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const publishRecordedClass = async (input: ClassInput) => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const classId = `${slugifyId(`ch${input.chapterNumber}-lec${input.lectureNumber}-${input.title}`).slice(0, 60)}-${Date.now().toString(36)}`;
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.set(doc(db, 'classes', classId), {
      id: classId,
      title: input.title.trim().slice(0, 140),
      chapterNumber: input.chapterNumber,
      chapterName: input.chapterName.trim().slice(0, 100),
      lectureNumber: input.lectureNumber,
      duration: input.duration.trim().slice(0, 24),
      description: input.description.trim().slice(0, 600),
      isFreePreview: input.isFreePreview,
      authorUid: user.uid,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'classStreams', classId), {
      classId,
      videoUrl: input.videoUrl.trim().slice(0, 400),
      noteUrl: input.noteUrl.trim().slice(0, 400),
      isFreePreview: input.isFreePreview,
      authorUid: user.uid,
      createdAt: now,
      updatedAt: now,
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `classes/${classId}`);
    }
  };

  const updateRecordedClass = async (classId: string, input: ClassInput) => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.update(doc(db, 'classes', classId), {
      title: input.title.trim().slice(0, 140),
      chapterNumber: input.chapterNumber,
      chapterName: input.chapterName.trim().slice(0, 100),
      lectureNumber: input.lectureNumber,
      duration: input.duration.trim().slice(0, 24),
      description: input.description.trim().slice(0, 600),
      isFreePreview: input.isFreePreview,
      updatedAt: now,
    });

    batch.update(doc(db, 'classStreams', classId), {
      videoUrl: input.videoUrl.trim().slice(0, 400),
      noteUrl: input.noteUrl.trim().slice(0, 400),
      isFreePreview: input.isFreePreview,
      updatedAt: now,
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `classes/${classId}`);
    }
  };

  const removeRecordedClass = async (classId: string) => {
    if (!isAdmin) throw new Error('Admin access required.');
    const batch = writeBatch(db);
    batch.delete(doc(db, 'classes', classId));
    batch.delete(doc(db, 'classStreams', classId));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classes/${classId}`);
    }
  };

  const publishNotice = async (input: NoticeInput) => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const noticeId = `${slugifyId(input.title).slice(0, 50)}-${Date.now().toString(36)}`;
    const safeImageUrl = sanitizeNoticeImageUrl(input.imageUrl ?? '');
    const safeVideoUrl = sanitizeNoticeVideoUrl(input.videoUrl ?? '');
    try {
      await setDoc(doc(db, 'notices', noticeId), {
        id: noticeId,
        title: input.title.trim().slice(0, 140),
        body: input.body.trim().slice(0, 1200),
        category: input.category,
        audience: input.audience,
        pinned: input.pinned,
        imageUrl: safeImageUrl,
        videoUrl: safeVideoUrl,
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `notices/${noticeId}`);
    }
  };

  const updateNotice = async (noticeId: string, input: NoticeInput) => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const safeImageUrl = sanitizeNoticeImageUrl(input.imageUrl ?? '');
    const safeVideoUrl = sanitizeNoticeVideoUrl(input.videoUrl ?? '');
    try {
      await updateDoc(doc(db, 'notices', noticeId), {
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
      handleFirestoreError(error, OperationType.UPDATE, `notices/${noticeId}`);
    }
  };

  const removeNotice = async (noticeId: string) => {
    if (!isAdmin) throw new Error('Admin access required.');
    try {
      await deleteDoc(doc(db, 'notices', noticeId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notices/${noticeId}`);
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
      handleFirestoreError(error, OperationType.UPDATE, path);
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
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const resolved = resolveIdentifierToEmailAndPhone(input.identifier, input.phone);
    if (!resolved) {
      throw new Error('Enter a valid 11-digit mobile number (01XXXXXXXXX) or Gmail.');
    }

    const path = `enrollments/${resolved.emailKey}`;
    try {
      const existingSnap = await getDoc(doc(db, 'enrollments', resolved.emailKey));
      if (existingSnap.exists()) {
        const prev = existingSnap.data() as Enrollment;
        await updateDoc(doc(db, 'enrollments', resolved.emailKey), {
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
        await setDoc(doc(db, 'enrollments', resolved.emailKey), {
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
          addedByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const bulkAddEnrollments = async (identifiers: string[]): Promise<number> => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const mapped = new Map<string, { emailKey: string; phone: string }>();

    for (const raw of identifiers) {
      const res = resolveIdentifierToEmailAndPhone(raw);
      if (res) mapped.set(res.emailKey, res);
    }
    if (mapped.size === 0) return 0;

    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const { emailKey, phone } of mapped.values()) {
      const fallbackName = phone
        ? `Student ${phone.slice(-4)}`
        : emailKey.split('@')[0]?.replace(/[._-]+/g, ' ') || 'HSC 28 Student';
      batch.set(
        doc(db, 'enrollments', emailKey),
        {
          email: emailKey,
          studentName: fallbackName.slice(0, 100),
          batch: 'HSC-28',
          rollNumber: '',
          college: '',
          phone,
          status: 'active',
          addedByUid: user.uid,
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
      handleFirestoreError(error, OperationType.WRITE, 'enrollments/bulk');
    }
  };

  const removeEnrollment = async (emailKey: string) => {
    if (!isAdmin) throw new Error('Admin access required.');
    try {
      await deleteDoc(doc(db, 'enrollments', emailKey));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `enrollments/${emailKey}`);
    }
  };

  const resolveEnrollmentRequest = async (
    request: EnrollmentRequest,
    decision: 'approved' | 'rejected',
  ) => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.update(doc(db, 'enrollmentRequests', request.uid), {
      status: decision,
      updatedAt: now,
    });

    if (decision === 'approved') {
      const emailKey = request.email.trim().toLowerCase();
      batch.set(doc(db, 'enrollments', emailKey), {
        email: emailKey,
        studentName: request.studentName,
        batch: 'HSC-28',
        college: request.college ?? '',
        phone: request.phone,
        rollNumber: `HSC28-${request.uid.slice(0, 4).toUpperCase()}`,
        status: 'active',
        addedByUid: user.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `enrollmentRequests/${request.uid}`);
    }
  };

  const publishStudentResult = async (input: StudentResultInput) => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
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
      authorUid: user.uid,
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
      await setDoc(doc(db, 'studentResults', resultId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `studentResults/${resultId}`);
    }
  };

  const updateStudentResult = async (resultId: string, input: StudentResultInput) => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
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
      await updateDoc(doc(db, 'studentResults', resultId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `studentResults/${resultId}`);
    }
  };

  const removeStudentResult = async (resultId: string) => {
    if (!isAdmin) throw new Error('Admin access required.');
    try {
      await deleteDoc(doc(db, 'studentResults', resultId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `studentResults/${resultId}`);
    }
  };

  const seedDemoContent = async () => {
    if (!user || !isAdmin) throw new Error('Admin access required.');
    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const item of SAMPLE_SEED_CLASSES) {
      batch.set(doc(db, 'classes', item.id), {
        id: item.id,
        title: item.title,
        chapterNumber: item.chapterNumber,
        chapterName: item.chapterName,
        lectureNumber: item.lectureNumber,
        duration: item.duration,
        description: item.description,
        isFreePreview: item.isFreePreview,
        authorUid: user.uid,
        createdAt: now,
        updatedAt: now,
      });

      batch.set(doc(db, 'classStreams', item.id), {
        classId: item.id,
        videoUrl: item.videoUrl,
        noteUrl: item.noteUrl,
        isFreePreview: item.isFreePreview,
        authorUid: user.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const notice of SAMPLE_SEED_NOTICES) {
      batch.set(doc(db, 'notices', notice.id), {
        id: notice.id,
        title: notice.title,
        body: notice.body,
        category: notice.category,
        audience: notice.audience,
        pinned: notice.pinned,
        authorUid: user.uid,
        createdAt: now,
        updatedAt: now,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes/seed');
    }
  };

  const value = useMemo<PortalContextValue>(
    () => ({
      user,
      authReady,
      isAdmin,
      isPaidStudent,
      needsAdminEmailVerification,
      myEnrollment,
      myRequest,
      myResults,
      classes,
      notices,
      completedClassIds,
      allEnrollments,
      allRequests,
      allResults,
      loadingData,
      authError,
      needsEmailProviderEnable,
      clearAuthFeedback,
      signInWithGoogle,
      registerStudentWithPhone,
      loginStudentWithPhone,
      loginAdminWithEmailPassword,
      registerAdminWithEmailPassword,
      linkAdminPassword,
      resendAdminVerification,
      refreshVerifiedSession,
      logout,
      fetchClassStream,
      toggleLectureCompleted,
      submitEnrollmentRequest,
      updateMyProfile,
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
      isAdmin,
      isPaidStudent,
      needsAdminEmailVerification,
      myEnrollment,
      myRequest,
      myResults,
      classes,
      notices,
      completedClassIds,
      allEnrollments,
      allRequests,
      allResults,
      loadingData,
      authError,
      needsEmailProviderEnable,
    ],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside PortalProvider');
  return ctx;
}
