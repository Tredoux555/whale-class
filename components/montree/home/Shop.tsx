// components/montree/home/Shop.tsx
// The home shop — curated Montessori materials at a discount, links out to the
// seller. Read-only; curated under the admin system. Helps parents get real
// materials and helps sellers (and the platform) grow together.
'use client';

import { useState, useEffect } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';

interface Product {
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
}

function money(cents: number | null, currency: string): string | null {
  if (cents == null) return null;
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100); }
  catch { return `${currency} ${(cents / 100).toFixed(2)}`; }
}

export default function Shop({ childId, onAskIvy }: { childId: string; onAskIvy: (message: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/montree/marketplace?child_id=${childId}`);
        if (r.ok) { const d = await r.json(); if (!cancelled) setProducts(Array.isArray(d.products) ? d.products : []); }
      } catch { /* leave empty */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [childId]);

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="animate-pulse text-4xl">🛍️</div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto px-4 py-5 ${BIO.bg.gradient}`}>
      <h2 className={`text-lg font-semibold ${BIO.text.primary}`}>Materials, at a discount</h2>
      <p className={`text-xs mt-0.5 ${BIO.text.muted}`}>Hand-picked Montessori materials from trusted makers — special pricing for Montree families.</p>

      {products.length === 0 ? (
        <div className={`mt-6 rounded-2xl border ${BIO.border.glow} ${BIO.bg.cardSolid} px-5 py-6 text-center`} style={{ boxShadow: BIO.glow.soft }}>
          <div className="text-3xl mb-2">🛍️</div>
          <p className={`text-sm ${BIO.text.secondary}`}>No items just yet — new ones are added often.</p>
          <button onClick={() => onAskIvy('What materials would help us most right now?')} className={`mt-4 inline-block px-4 py-2 rounded-full text-sm ${BIO.btn.outline}`}>
            Ask Ivy what we need
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {products.map((p) => {
            const sale = money(p.sale_price_cents, p.currency);
            const was = money(p.price_cents, p.currency);
            return (
              <div key={p.id} className={`rounded-2xl border ${BIO.border.subtle} ${BIO.bg.cardSolid} overflow-hidden`}>
                <div className="flex gap-3 p-3">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote product image from a curated seller URL
                    <img src={p.image_url} alt={p.title} className="w-20 h-20 rounded-xl object-cover shrink-0 bg-black/20" />
                  ) : (
                    <div className={`w-20 h-20 rounded-xl shrink-0 flex items-center justify-center text-2xl ${BIO.bg.mintSubtle}`}>🧺</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-sm font-semibold ${BIO.text.primary} leading-snug`}>{p.title}</h3>
                    {p.seller_name && <p className={`text-[11px] ${BIO.text.muted} mt-0.5`}>{p.seller_name}</p>}
                    {p.description && <p className={`text-xs ${BIO.text.secondary} mt-1 line-clamp-2`}>{p.description}</p>}
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {sale ? (
                        <>
                          <span className={`text-sm font-semibold ${BIO.text.mint}`}>{sale}</span>
                          {was && <span className={`text-xs line-through ${BIO.text.muted}`}>{was}</span>}
                        </>
                      ) : was ? (
                        <span className={`text-sm font-semibold ${BIO.text.primary}`}>{was}</span>
                      ) : null}
                      {p.discount_code && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${BIO.bg.amberSubtle} ${BIO.text.amber}`}>code {p.discount_code}</span>
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={p.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-center py-2.5 text-sm border-t ${BIO.border.subtle} ${BIO.text.mint} hover:bg-white/5`}
                >
                  Get it →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
