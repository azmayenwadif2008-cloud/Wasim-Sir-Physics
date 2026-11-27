/**
 * Payload-First Security Test Specification (Dirty Dozen Verifier)
 * Validates boundary constraints & invariant shapes against firebase-blueprint.json.
 * Note: Full emulator execution requires `@firebase/rules-unit-testing` + Java emulator;
 * this suite verifies client-side payload sanitization and blueprint bounds match firestore.rules.
 */

export const DIRTY_DOZEN_CASES = [
  {
    name: '1. Self-Enrollment Spoof',
    targetPath: 'enrollments/attacker@gmail.com',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Peer Enrollment Enumeration',
    targetPath: 'enrollments',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Auto-Approved Request',
    targetPath: 'enrollmentRequests/uid_123',
    operation: 'create',
    payload: { status: 'approved' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Shadow Ghost Field',
    targetPath: 'enrollmentRequests/uid_123',
    operation: 'create',
    payload: { isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. UID Impersonation',
    targetPath: 'enrollmentRequests/other_uid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Email Spoofing',
    targetPath: 'enrollmentRequests/uid_123',
    operation: 'create',
    payload: { email: 'paid@gmail.com' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Unverified Email Bypass',
    targetPath: 'classStreams/lec-1',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Unpaid Stream Scraping (get)',
    targetPath: 'classStreams/paid-lec-1',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Unpaid Stream Enumeration (list)',
    targetPath: 'classStreams',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Unauthorized Class Publishing',
    targetPath: 'classes/fake-lec',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. ID Poisoning / Resource Exhaustion',
    targetPath: `classes/${'a'.repeat(200)}`,
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Immortal Field Mutation',
    targetPath: 'enrollmentRequests/uid_123',
    operation: 'update',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
] as const;
