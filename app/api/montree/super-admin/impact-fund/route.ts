import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';

const ADMIN_PASSWORD = '870602';

// GET - Fetch impact fund transactions and summary
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('password');

  if (password !== ADMIN_PASSWORD) {
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

    if (password !== ADMIN_PASSWORD) {
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
