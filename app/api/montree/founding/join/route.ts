import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';

// Public. Founding 100 waitlist signup. Mirrors the /demo-request abuse posture:
// IP rate-limit (5 / 15min), input caps, and a hidden honeypot field.
const MAX_SCHOOL_LEN = 200;
const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 320; // RFC 5321 max
const MAX_COUNTRY_LEN = 100;

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();

    const ip = getClientIP(req.headers);
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/founding/join', 5, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { school_name, contact_name, email, country, student_count, website } = body || {};

    // Honeypot — real users never fill the hidden `website` field, bots do.
    // Pretend success, write nothing.
    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    // school_name may be absent for the "general waitlist" capture shown once
    // the offer is full — default it rather than reject.
    const school = (typeof school_name === 'string' && school_name.trim())
      ? school_name.trim()
      : '(general waitlist)';

    if (
      email.length > MAX_EMAIL_LEN ||
      school.length > MAX_SCHOOL_LEN ||
      (typeof contact_name === 'string' && contact_name.length > MAX_NAME_LEN) ||
      (typeof country === 'string' && country.length > MAX_COUNTRY_LEN)
    ) {
      return NextResponse.json({ error: 'Input exceeds maximum length' }, { status: 400 });
    }

    let students: number | null = null;
    const n = Number(student_count);
    if (Number.isFinite(n) && n >= 0 && n < 100000) students = Math.round(n);

    const cleanEmail = email.trim().toLowerCase();

    // email UNIQUE dedupes. 23505 = already on the list → soft success.
    const { error: insertErr } = await supabase
      .from('montree_founding_waitlist')
      .insert({
        school_name: school,
        contact_name: (typeof contact_name === 'string' && contact_name.trim()) ? contact_name.trim() : null,
        email: cleanEmail,
        country: (typeof country === 'string' && country.trim()) ? country.trim() : null,
        student_count: students,
        status: 'waitlisted',
        source: school === '(general waitlist)' ? 'general_waitlist' : 'homepage',
      });

    if (insertErr && insertErr.code !== '23505') {
      console.error('[founding/join] insert failed:', insertErr);
      return NextResponse.json({ error: 'Something went wrong', detail: insertErr.message }, { status: 500 });
    }
    const alreadyOnList = insertErr?.code === '23505';

    // Notify Tredoux (fire-and-forget) on a genuinely new signup.
    if (!alreadyOnList) {
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL;
      if (resendKey && fromEmail) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromEmail,
            to: 'tredoux555@gmail.com',
            subject: `🚀 Founding 100 signup: ${school}`,
            text: `New Founding 100 waitlist signup.\n\nSchool: ${school}\nContact: ${contact_name || 'Not provided'}\nEmail: ${cleanEmail}\nCountry: ${country || 'Not provided'}\nApprox students: ${students ?? 'Not provided'}\n\nTime: ${new Date().toISOString()}\n\nReview + admit in super-admin → Founding 100 tab.`,
          }),
        }).catch(err => console.error('[founding/join] notify email failed:', err));
      }
    }

    return NextResponse.json({ success: true, already_on_list: alreadyOnList });
  } catch (err) {
    console.error('[founding/join POST] failed:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
