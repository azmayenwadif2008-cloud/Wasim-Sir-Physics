# Security Specification & Payload-First TDD (`Wasim Sir Physics — HSC '28`)

## 1. Data Invariants
1. **Master Source of Truth for Paid Access**: Paid status is stored exclusively in `/enrollments/{emailKey}` where `emailKey` is the student's verified lowercase email. Only verified admins (`azmayen.wadif2008@gmail.com` or `/admins/{uid}`) may create, update, delete, or list `/enrollments`.
2. **Self-Service Privilege Escalation Prevention**: Unpaid students can submit `/enrollmentRequests/{uid}` only with `uid == request.auth.uid`, `email == request.auth.token.email.lower()`, and `status == 'pending'`. They can never set `status == 'approved'` or create an `/enrollments` document.
3. **Stream URL & Note Isolation**: Unlisted YouTube/Drive video URLs and PDF note links live in `/classStreams/{classId}` and are strictly gated by `isAdmin() || isPaidStudent() || existing().isFreePreview == true` on `get`. Students cannot `list` `/classStreams`.
4. **PII Isolation**: `/enrollments/{emailKey}` (`get` only by exact email owner or admin; `list` admin only) and `/enrollmentRequests/{uid}` (`get` by owner or admin; `list` enforces `resource.data.uid == request.auth.uid` or admin) never expose student phone numbers, emails, or TxIDs to peers.
5. **Temporal & Author Integrity**: All `createdAt` and `updatedAt` timestamps must equal `request.time`; `createdAt` and `authorUid`/`uid`/`email` are immutable after creation.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Enrollment Spoof**: Student writes `/enrollments/student@gmail.com` with `{ status: 'active' }` -> `PERMISSION_DENIED`.
2. **Peer Enrollment Enumeration**: Student calls `list` on `/enrollments` -> `PERMISSION_DENIED`.
3. **Auto-Approved Request**: Student creates `/enrollmentRequests/{uid}` with `status: 'approved'` -> `PERMISSION_DENIED`.
4. **Shadow Ghost Field**: Student creates `/enrollmentRequests/{uid}` with extra field `isAdmin: true` -> `PERMISSION_DENIED` (`hasOnly` rejects).
5. **UID Impersonation**: Student creates `/enrollmentRequests/otherUid` while signed in as `myUid` -> `PERMISSION_DENIED`.
6. **Email Spoofing**: Student submits `email: 'paid@gmail.com'` in `/enrollmentRequests/{myUid}` when token email is `free@gmail.com` -> `PERMISSION_DENIED`.
7. **Unverified Email Bypass**: User with `email_verified: false` tries to read `/classStreams/{id}` or submit request -> `PERMISSION_DENIED`.
8. **Unpaid Stream Scraping (`get`)**: Logged-in unpaid student calls `getDoc(doc(db, 'classStreams', 'paid-lec-1'))` -> `PERMISSION_DENIED`.
9. **Unpaid Stream Enumeration (`list`)**: Logged-in paid or unpaid student calls `getDocs(collection(db, 'classStreams'))` -> `PERMISSION_DENIED`.
10. **Unauthorized Class Publishing**: Paid student attempts to create `/classes/fake-lec` or `/notices/fake-notice` -> `PERMISSION_DENIED`.
11. **ID Poisoning / Resource Exhaustion**: Attacker passes a 200-char or invalid-character `{classId}` or 5KB string in `title` -> `PERMISSION_DENIED`.
12. **Timestamp Backdating / Immortal Field Mutation**: Modifying `createdAt` or `uid` on update -> `PERMISSION_DENIED`.
