// lib/montree/xero/mapper.ts
//
// Phase C — Maps a montree_finance_transactions row to the appropriate Xero
// API object. The categorisation rules below were derived from
// FINANCIAL_ARCHITECTURE_PLAN.md Section C3.
//
// Each finance_tx becomes ONE Xero object of one of these types:
//   - Invoice    — for income (subscription_revenue, refunds)
//   - Bill       — for direct_cost (api costs) and op_expense
//   - BankTransaction — for stripe_fees and refunds (deductions from balance)
//   - ManualJournal   — for fx_adjustment and commissions paid
//
// We deliberately use BankTransaction for the Stripe-fee leg rather than a
// Bill, because the fee is deducted from the same Stripe balance settlement
// as the gross revenue — it's not a separate vendor invoice.

interface FinanceTx {
  id: string;
  occurred_at: string;
  type: string;
  category: string;
  description: string | null;
  school_id: string | null;
  agent_id: string | null;
  original_currency: string;
  original_amount: number;
  fx_rate: number;
  usd_amount: number;
  source: string;
  source_ref: string | null;
  stripe_charge_id?: string | null;
  stripe_transfer_id?: string | null;
}

export type XeroObjectType =
  | 'Invoice'
  | 'Bill'
  | 'BankTransaction'
  | 'ManualJournal'
  | 'CreditNote';

export interface XeroMapping {
  xero_object_type: XeroObjectType;
  payload: Record<string, unknown>;
}

/**
 * Returns the Xero mapping for a finance_tx row, or null if the row should
 * be skipped (e.g., zero-amount placeholder).
 */
export function mapFinanceTxToXero(tx: FinanceTx): XeroMapping | null {
  const amt = Number(tx.usd_amount) || 0;
  if (amt === 0) return null;

  const desc = tx.description || `${tx.type}/${tx.category}`;
  const reference = tx.source_ref || tx.id;
  const isoDate = tx.occurred_at.slice(0, 10); // YYYY-MM-DD

  // INCOME → Invoice
  if (tx.type === 'income' && tx.category === 'subscription_revenue') {
    return {
      xero_object_type: 'Invoice',
      payload: {
        Type: 'ACCREC',
        Status: 'PAID',
        Date: isoDate,
        DueDate: isoDate,
        Reference: reference,
        Contact: { Name: 'Montree subscribers (consolidated)' },
        LineItems: [
          {
            Description: desc,
            Quantity: 1,
            UnitAmount: amt,
            AccountCode: '200', // Sales — adjust to your Xero chart
          },
        ],
        CurrencyCode: 'USD',
      },
    };
  }

  // REFUNDS → Credit Note
  if (tx.type === 'income' && tx.category === 'refund') {
    return {
      xero_object_type: 'CreditNote',
      payload: {
        Type: 'ACCRECCREDIT',
        Status: 'PAID',
        Date: isoDate,
        Reference: reference,
        Contact: { Name: 'Montree subscribers (consolidated)' },
        LineItems: [
          {
            Description: desc,
            Quantity: 1,
            UnitAmount: Math.abs(amt),
            AccountCode: '200',
          },
        ],
        CurrencyCode: 'USD',
      },
    };
  }

  // STRIPE FEES → BankTransaction (debit from Stripe balance)
  if (tx.type === 'direct_cost' && tx.category === 'stripe_fee') {
    return {
      xero_object_type: 'BankTransaction',
      payload: {
        Type: 'SPEND',
        Status: 'AUTHORISED',
        Date: isoDate,
        Reference: reference,
        Contact: { Name: 'Stripe' },
        LineItems: [
          {
            Description: desc,
            Quantity: 1,
            UnitAmount: amt,
            AccountCode: '404', // Bank fees — adjust
          },
        ],
        // BankAccount must be the Xero ID of the Stripe clearing account.
        // Set XERO_STRIPE_ACCOUNT_ID env var to wire this.
        BankAccount: process.env.XERO_STRIPE_ACCOUNT_ID
          ? { AccountID: process.env.XERO_STRIPE_ACCOUNT_ID }
          : { Code: '090' },
        CurrencyCode: 'USD',
      },
    };
  }

  // API costs (Anthropic, OpenAI, other) → Bill from vendor
  if (tx.type === 'direct_cost' && tx.category.startsWith('api_')) {
    const vendor =
      tx.category === 'api_anthropic'
        ? 'Anthropic, PBC'
        : tx.category === 'api_openai'
          ? 'OpenAI, L.L.C.'
          : 'API vendor';
    return {
      xero_object_type: 'Bill',
      payload: {
        Type: 'ACCPAY',
        Status: 'AUTHORISED',
        Date: isoDate,
        DueDate: isoDate,
        Reference: reference,
        Contact: { Name: vendor },
        LineItems: [
          {
            Description: desc,
            Quantity: 1,
            UnitAmount: amt,
            AccountCode: '310', // Cost of sales / direct cost — adjust
          },
        ],
        CurrencyCode: 'USD',
      },
    };
  }

  // Other direct_cost → Bill
  if (tx.type === 'direct_cost') {
    return {
      xero_object_type: 'Bill',
      payload: {
        Type: 'ACCPAY',
        Status: 'AUTHORISED',
        Date: isoDate,
        DueDate: isoDate,
        Reference: reference,
        Contact: { Name: 'Direct cost vendor' },
        LineItems: [
          {
            Description: desc,
            Quantity: 1,
            UnitAmount: amt,
            AccountCode: '310',
          },
        ],
        CurrencyCode: 'USD',
      },
    };
  }

  // COMMISSIONS → Bill from agent
  if (tx.type === 'commission') {
    return {
      xero_object_type: 'Bill',
      payload: {
        Type: 'ACCPAY',
        Status: 'PAID', // paid because the wire fires before this is written
        Date: isoDate,
        DueDate: isoDate,
        Reference: reference,
        Contact: { Name: `Referral agent (${tx.agent_id?.slice(0, 8) || 'unknown'})` },
        LineItems: [
          {
            Description: desc,
            Quantity: 1,
            UnitAmount: amt,
            AccountCode: '320', // Sales commissions — adjust
          },
        ],
        CurrencyCode: 'USD',
      },
    };
  }

  // OP EXPENSES → Bill
  if (tx.type === 'op_expense') {
    return {
      xero_object_type: 'Bill',
      payload: {
        Type: 'ACCPAY',
        Status: 'AUTHORISED',
        Date: isoDate,
        DueDate: isoDate,
        Reference: reference,
        Contact: { Name: tx.category || 'Operating expense' },
        LineItems: [
          {
            Description: desc,
            Quantity: 1,
            UnitAmount: amt,
            AccountCode: '400', // Operating expenses — adjust
          },
        ],
        CurrencyCode: 'USD',
      },
    };
  }

  // FX ADJUSTMENTS → Manual Journal
  if (tx.type === 'fx_adjustment') {
    return {
      xero_object_type: 'ManualJournal',
      payload: {
        Narration: desc,
        Date: isoDate,
        Reference: reference,
        JournalLines: [
          {
            LineAmount: amt,
            AccountCode: '491', // FX gain/loss — adjust
            Description: desc,
          },
          {
            LineAmount: -amt,
            AccountCode: '090', // Bank — adjust
            Description: 'FX offset',
          },
        ],
      },
    };
  }

  return null;
}
