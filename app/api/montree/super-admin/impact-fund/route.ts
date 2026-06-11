import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
// audit-fix (Jun 2026): this route previously compared the password with a
// plain `!==` (not timing-safe) against `SUPER_ADMIN_PASSWORD || ''` — so a
// missing env var meant an EMPTY password was accepted (fail-open). It also
// took the password in the URL query string, where it lands in logs and
// browser history. Now: shared timing-safe header auth, fail-closed.
import { verifySuperAdminAuth, verifySuperAdminPassword } from '@/lib/verify-super-admin';

// GET - Fetch impact fund transactions and summary
export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch transactions
    const { data: transactions, error } = await getSupabase()
      .from('montree_impact_fund_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }

    // Calculate summary
    const contributions = (transactions || [])
      .filter(t => t.transaction_type === 'contribution')
      .reduce((sum, t) => sum + (t.amount_cents || 0), 0);

    const disbursements = (transactions || [])
      .filter(t => t.transaction_type === 'disbursement')
      .reduce((sum, t) => sum + (t.amount_cents || 0), 0);

    return NextResponse.json({
      transactions: transactions || [],
      summary: {
        total: contributions,
        disbursed: disbursements,
        balance: contributions - disbursements
      }
    });
  } catch (error) {
    console.error('Error in impact fund GET:', error);
    return NextResponse.json({ error: 'Failed to fetch impact fund data' }, { status: 500 });
  }
}

// POST - Add a transaction (contribution or disbursement)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, transactionType, amountCents, recipientType, recipientName, recipientDescription, notes, sourceSchoolId } = body;

    // Header auth (token/password) preferred; body password kept for
    // backward compatibility — now timing-safe and fail-closed.
    const headerAuth = await verifySuperAdminAuth(request.headers);
    const valid = headerAuth.valid || verifySuperAdminPassword(password).valid;
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!transactionType || !amountCents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('montree_impact_fund_transactions')
      .insert({
        transaction_type: transactionType,
        amount_cents: amountCents,
        source_school_id: sourceSchoolId || null,
        recipient_type: recipientType || null,
        recipient_name: recipientName || null,
        recipient_description: recipientDescription || null,
        notes: notes || null,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }

    return NextResponse.json({ transaction: data });
  } catch (error) {
    console.error('Error in impact fund POST:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
