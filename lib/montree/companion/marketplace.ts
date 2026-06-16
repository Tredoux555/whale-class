// lib/montree/companion/marketplace.ts
//
// The home shop — curated Montessori materials sellers offer to parents at a
// discount through Montree. Read side only here (the parent browse + Ivy's
// material suggestions); curation is super-admin only (separate route).
// Graceful when the table doesn't exist yet (migration 264 pending).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export interface Product {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  seller_name: string | null;
  product_url: string;
  price_cents: number | null;
  sale_price_cents: number | null;
  currency: string;
  discount_code: string | null;
  category: string | null;
  age_min: number | null;
  age_max: number | null;
}

const SELECT = 'id, title, description, image_url, seller_name, product_url, price_cents, sale_price_cents, currency, discount_code, category, age_min, age_max';

function ageFits(p: { age_min: number | null; age_max: number | null }, ageYears: number | null): boolean {
  if (ageYears == null) return true;
  if (p.age_min != null && ageYears < p.age_min) return false;
  if (p.age_max != null && ageYears > p.age_max) return false;
  return true;
}

export interface ListArgs {
  ageYears?: number | null;
  category?: string | null;
  query?: string | null;
  limit?: number;
}

/** Active products for the parent shop, age-filtered (in JS so NULL bounds pass). */
export async function listActiveProducts(supabase: SupabaseClient, args: ListArgs = {}): Promise<Product[]> {
  const limit = Math.min(Math.max(args.limit ?? 60, 1), 100);
  try {
    let q = supabase
      .from('montree_marketplace_products')
      .select(SELECT)
      .eq('is_active', true)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (args.category) q = q.eq('category', args.category);
    const { data, error } = await q;
    if (error || !data) return [];
    let rows = data as Product[];
    if (args.ageYears != null) rows = rows.filter((p) => ageFits(p, args.ageYears!));
    if (args.query && args.query.trim()) {
      const ql = args.query.trim().toLowerCase();
      rows = rows.filter((p) =>
        [p.title, p.description, p.category, p.seller_name].filter(Boolean).join(' ').toLowerCase().includes(ql),
      );
    }
    return rows;
  } catch {
    return [];
  }
}

/** Compact text of matching products for Ivy's find_materials tool. */
export function summariseProducts(products: Product[]): string {
  if (!products.length) return 'No matching items in the shop right now.';
  return products.slice(0, 8).map((p) => {
    const price = p.sale_price_cents != null
      ? `${p.currency} ${(p.sale_price_cents / 100).toFixed(2)}${p.price_cents != null ? ` (was ${(p.price_cents / 100).toFixed(2)})` : ''}`
      : p.price_cents != null ? `${p.currency} ${(p.price_cents / 100).toFixed(2)}` : '';
    return `- ${p.title}${p.seller_name ? ` — ${p.seller_name}` : ''}${price ? ` · ${price}` : ''}${p.discount_code ? ` · code ${p.discount_code}` : ''} · ${p.product_url}`;
  }).join('\n');
}
