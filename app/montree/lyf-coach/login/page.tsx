// Relocated — public login now at /lyf-coach/login. Redirect there.
import { redirect } from 'next/navigation';
export default function RelocatedLyfCoachLogin() { redirect('/lyf-coach/login'); }
