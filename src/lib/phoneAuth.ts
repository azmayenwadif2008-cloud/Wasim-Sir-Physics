export const STUDENT_EMAIL_DOMAIN = 'student.wasimsirphysics.app';

export function normalizeBdPhone(raw: string): string | null {
  const digitsOnly = raw.replace(/[\s\-()]/g, '');
  let normalized = digitsOnly;

  if (normalized.startsWith('+880')) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith('880')) {
    normalized = normalized.slice(2);
  }

  if (/^01[0-9]{9}$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export function phoneToAuthEmail(normalizedPhone: string): string {
  return `${normalizedPhone}@${STUDENT_EMAIL_DOMAIN}`;
}

export function isStudentPhoneEmail(email?: string | null): boolean {
  if (!email) return false;
  return new RegExp(`^01[0-9]{9}@${STUDENT_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`, 'i').test(
    email.trim(),
  );
}

export function extractPhoneFromAuthEmail(email?: string | null): string {
  if (!email) return '';
  if (isStudentPhoneEmail(email)) {
    return email.split('@')[0] ?? '';
  }
  return email;
}

export function formatAuthError(error: unknown): {
  message: string;
  needsProviderEnable: boolean;
} {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  const rawMsg = error instanceof Error ? error.message : String(error);

  if (code === 'auth/operation-not-allowed' || rawMsg.includes('operation-not-allowed')) {
    return {
      message:
        'Firebase Console-এ Email/Password login এখনো চালু করা হয়নি। নিচের ধাপ দেখে Email/Password চালু করুন।',
      needsProviderEnable: true,
    };
  }
  if (code === 'auth/email-already-in-use') {
    return {
      message:
        'এই মোবাইল নাম্বার বা ইমেইল দিয়ে আগেই একাউন্ট তৈরি আছে। Login ট্যাবে গিয়ে নাম্বার ও পাসওয়ার্ড দিয়ে লগইন করুন।',
      needsProviderEnable: false,
    };
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return {
      message: 'মোবাইল নাম্বার/ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।',
      needsProviderEnable: false,
    };
  }
  if (code === 'auth/weak-password') {
    return {
      message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
      needsProviderEnable: false,
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      message: 'অনেকবার ভুল চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
      needsProviderEnable: false,
    };
  }
  return {
    message: rawMsg || 'Authentication failed.',
    needsProviderEnable: false,
  };
}
