// /admin/page.tsx - Redirect to Montree admin
import { redirect } from 'next/navigation';

export default function AdminRedirect() {
  redirect('/montree/admin');
}
