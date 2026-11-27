import type { Timestamp } from 'firebase/firestore';

export type EnrollmentStatus = 'active' | 'suspended';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Hand-to-Hand' | 'Registration';
export type NoticeCategory = 'Routine' | 'Exam' | 'Class Update' | 'General';
export type NoticeAudience = 'public' | 'paid';

export interface Enrollment {
  email: string;
  studentName: string;
  batch: 'HSC-28';
  rollNumber?: string;
  college?: string;
  phone?: string;
  status: EnrollmentStatus;
  addedByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EnrollmentRequest {
  uid: string;
  email: string;
  studentName: string;
  college?: string;
  phone: string;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  status: RequestStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RecordedClass {
  id: string;
  title: string;
  chapterNumber: number;
  chapterName: string;
  lectureNumber: number;
  duration: string;
  description?: string;
  isFreePreview: boolean;
  authorUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClassStream {
  classId: string;
  videoUrl: string;
  noteUrl?: string;
  isFreePreview: boolean;
  authorUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  audience: NoticeAudience;
  pinned: boolean;
  imageUrl?: string;
  videoUrl?: string;
  authorUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LectureProgress {
  uid: string;
  classId: string;
  completed: boolean;
  updatedAt: Timestamp;
}

export interface ChapterMeta {
  number: number;
  titleEn: string;
  titleBn: string;
  group: 'Mechanics' | 'Waves & Matter';
  plannedLectures: number;
  keyTopics: string;
}
