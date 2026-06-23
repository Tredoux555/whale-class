import { redirect } from 'next/navigation';

// The Lyf Coach privacy policy now lives in two product-specific pages:
//   /lyf-coach/privacy/app  — iPhone app (on-device, end-to-end encrypted)
//   /lyf-coach/privacy/web  — web (server-side)
// This historical URL redirects to the iPhone-app policy (its original meaning).
export default function LyfCoachPrivacyIndex() {
  redirect('/lyf-coach/privacy/app');
}
