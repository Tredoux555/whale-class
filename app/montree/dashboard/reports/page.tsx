// app/montree/dashboard/reports/page.tsx
// Safety net — there is no reports list page anymore (product decision,
// Session burn plan 2026-06-12: Reports → Weekly Wrap). Without this file,
// /montree/dashboard/reports falls into the [childId] dynamic route with
// childId="reports" and errors. All nav links now point at weekly-wrap;
// this redirect catches stale bookmarks / old deep links.
import { redirect } from 'next/navigation';

export default function ReportsRedirectPage() {
  redirect('/montree/dashboard/weekly-wrap');
}
