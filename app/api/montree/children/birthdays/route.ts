// GET /api/montree/children/birthdays — Children with birthdays in next 7 days
//
// Returns classroom children with upcoming birthdays (within 7 days), sorted by days until birthday.
// Birthday calculation ignores the year (treats as annual occurrence).
// Handles year wrap-around (e.g., Dec 25 → Jan 2).
//
// Data sources:
//   montree_children — Classroom roster with date_of_birth field
import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

interface BirthdayChild {
  id: string;
  name: string;
  date_of_birth: string;
  photo_url: string | null;
  turning_age: number;
  days_until: number;
}

/**
 * Calculate the number of days until a birthday (month+day only, ignoring year).
 * Returns 0 for today, 1 for tomorrow, up to 6 for 6 days from now, or 7 for "in a week".
 * Handles year wrap-around (e.g., Dec 25 to Jan 2).
 */
function calculateDaysUntilBirthday(dateOfBirth: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse the date_of_birth (format: YYYY-MM-DD)
  const parts = dateOfBirth.split('-');
  if (parts.length !== 3) return -1;

  const birthMonth = parseInt(parts[1], 10);
  const birthDay = parseInt(parts[2], 10);

  // This year's birthday
  let upcomingBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
  upcomingBirthday.setHours(0, 0, 0, 0);

  // If the birthday has already passed this year, check next year
  if (upcomingBirthday < today) {
    upcomingBirthday = new Date(today.getFullYear() + 1, birthMonth - 1, birthDay);
    upcomingBirthday.setHours(0, 0, 0, 0);
  }

  const diffMs = upcomingBirthday.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return daysUntil;
}

/**
 * Calculate turning age: current year minus birth year,
 * adjusted if birthday hasn't occurred yet this year.
 */
function calculateTurningAge(dateOfBirth: string): number {
  const today = new Date();
  const birthYear = parseInt(dateOfBirth.split('-')[0], 10);
  const birthMonth = parseInt(dateOfBirth.split('-')[1], 10);
  const birthDay = parseInt(dateOfBirth.split('-')[2], 10);

  let age = today.getFullYear() - birthYear;

  // Check if birthday has already occurred this year
  if (
    today.getMonth() + 1 < birthMonth ||
    (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)
  ) {
    age--;
  }

  return age;
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();

  try {
    // 1. Fetch all active children in the classroom with date_of_birth
    const { data: children, error: childrenErr } = await supabase
      .from('montree_children')
      .select('id, name, date_of_birth, photo_url')
      .eq('classroom_id', auth.classroomId)
      .eq('is_active', true)
      .not('date_of_birth', 'is', null)
      .order('name');

    if (childrenErr) {
      console.error('[Birthdays] Children fetch error:', childrenErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json({ birthdays: [] }, {
        headers: { 'Cache-Control': 'private, max-age=3600' },
      });
    }

    // 2. Filter to birthdays within next 7 days and calculate metadata
    const birthdays: BirthdayChild[] = children
      .map((child: { id: string; name: string; date_of_birth: string; photo_url: string | null }) => {
        const daysUntil = calculateDaysUntilBirthday(child.date_of_birth);
        return {
          id: child.id,
          name: child.name,
          date_of_birth: child.date_of_birth,
          photo_url: child.photo_url || null,
          turning_age: calculateTurningAge(child.date_of_birth),
          days_until: daysUntil,
        };
      })
      .filter((b: BirthdayChild) => b.days_until >= 0 && b.days_until <= 7)
      .sort((a: BirthdayChild, b: BirthdayChild) => a.days_until - b.days_until);

    return NextResponse.json({ birthdays }, {
      headers: { 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (err) {
    console.error('[Birthdays] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
