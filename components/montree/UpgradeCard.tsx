'use client';

// components/montree/UpgradeCard.tsx
//
// The canonical "this feature needs an active AI tier" surface.
//
// Replaces the red error toast that used to appear when an AI route returned
// 402 with `requires_upgrade: true`. Renders a warm amber/gold card with a
// per-feature title + body and a CTA pointing the principal at their billing
// page. The design mirrors the original Astra upgrade card in
// `app/montree/admin/page.tsx` (Session 105 commit `0192bad6`) so the family
// of upgrade prompts looks coherent across the product.
//
// Usage:
//   const [upgrade, setUpgrade] = useState<{feature: string; url: string} | null>(null);
//   // ...inside the fetch handler:
//   if (res.status === 402) {
//     const body = await res.json().catch(() => ({}));
//     if (body?.requires_upgrade) {
//       setUpgrade({ feature: body.feature, url: body.upgrade_url || '/montree/admin/billing' });
//       return;
//     }
//   }
//   // ...in the render:
//   {upgrade && <UpgradeCard feature={upgrade.feature} upgradeUrl={upgrade.url} />}
//
// Server contract (architectural rule #29):
//   AI 402s MUST return:
//     {
//       requires_upgrade: true,
//       upgrade_url: '/montree/admin/billing',
//       feature: '<canonical_feature_key>',
//       error: '<human readable fallback>',
//     }
//
// i18n keys:
//   - `upgrade.title` / `upgrade.body` / `upgrade.cta` — generic defaults
//   - `upgrade.feature.<feature>` — optional per-feature title override
//     (e.g. `upgrade.feature.weekly_wrap` = "Activate Weekly Wrap reports")
//   - `tracy.upgrade.*` keys stay where they are — the home agent renders
//     its own inline card with its existing copy.

import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import type { TranslationKey } from '@/lib/montree/i18n/en';

interface UpgradeCardProps {
  /** Canonical feature key from the 402 response (e.g. "weekly_wrap"). */
  feature?: string;
  /**
   * 🚨 3-tier pricing (Sep 7 2026): AI gates now answer with the CAPABILITY
   * that was refused (`guru`, `astra`, `aiReports`, `photoRecognition`,
   * `montages`, `parentMessaging`, `appointments`, `videoCalls`,
   * `orgOnboarding`, `cmsBridge`) or `ai_budget` when a Lite school has spent
   * its monthly allowance. Each has `upgrade.feature.<capability>.{title,body}`
   * copy naming the plan that unlocks it. When present this wins over
   * `feature`; when absent, `feature` behaves exactly as before, so older 402
   * bodies keep rendering their legacy per-feature copy.
   */
  capability?: string;
  /** Where to send the principal. Defaults to `/montree/admin/billing`. */
  upgradeUrl?: string;
  /** Optional explicit title override. Wins over the per-feature key lookup. */
  title?: string;
  /** Optional explicit body override. */
  body?: string;
  /** Optional explicit CTA label override. */
  cta?: string;
  /** Extra margin-top in px. Default 0. */
  marginTop?: number;
  /** Open billing in a new tab. Default false (same-tab navigation). */
  external?: boolean;
}

export default function UpgradeCard({
  feature,
  capability,
  upgradeUrl = '/montree/admin/billing',
  title,
  body,
  cta,
  marginTop = 0,
  external = false,
}: UpgradeCardProps) {
  const { t } = useI18n();

  // Per-feature title + body overrides fall back to the generic upgrade keys.
  // The translation lookup returns the key itself when missing (see
  // `context.tsx` line 85), so we treat any return that equals the lookup
  // key as "no override" and use the generic copy. Dynamic keys need a cast
  // because TranslationKey is a literal union, not `string`.
  // The capability (3-tier) wins over the legacy feature key when both arrive.
  const copyKey = capability || feature;
  const perFeatureTitleKey = copyKey ? `upgrade.feature.${copyKey}.title` : null;
  const perFeatureBodyKey = copyKey ? `upgrade.feature.${copyKey}.body` : null;
  const perFeatureTitle = perFeatureTitleKey
    ? t(perFeatureTitleKey as TranslationKey)
    : '';
  const perFeatureBody = perFeatureBodyKey
    ? t(perFeatureBodyKey as TranslationKey)
    : '';

  const titleText =
    title ??
    (perFeatureTitleKey && perFeatureTitle !== perFeatureTitleKey
      ? perFeatureTitle
      : t('upgrade.title'));

  const bodyText =
    body ??
    (perFeatureBodyKey && perFeatureBody !== perFeatureBodyKey
      ? perFeatureBody
      : t('upgrade.body'));

  const ctaText = cta ?? t('upgrade.cta');

  const linkProps = external
    ? ({
        href: upgradeUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
      } as const)
    : ({ href: upgradeUrl } as const);

  return (
    <div
      data-upgrade-card={feature || 'generic'}
      style={{
        marginTop,
        padding: '16px 18px',
        background: 'rgba(232,201,106,0.10)',
        border: '1px solid rgba(232,201,106,0.32)',
        borderRadius: 14,
        color: 'rgba(255,255,255,0.92)',
        fontSize: 13.5,
        lineHeight: 1.55,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: '#E8C96A' }}>
        ✨ {titleText}
      </p>
      <p style={{ margin: '8px 0 14px', color: 'rgba(255,255,255,0.78)' }}>
        {bodyText}
      </p>
      <Link
        {...linkProps}
        style={{
          display: 'inline-block',
          padding: '10px 18px',
          background: 'linear-gradient(135deg, #34d399, #10b981)',
          color: '#0a1a0f',
          fontWeight: 600,
          fontSize: 13.5,
          textDecoration: 'none',
          borderRadius: 10,
        }}
      >
        {ctaText} →
      </Link>
    </div>
  );
}

/**
 * Helper for fetch handlers: pulls the upgrade payload out of a 402 response
 * body. Returns null when the body isn't an upgrade-shaped 402.
 *
 * Usage:
 *   const res = await fetch(url, { ... });
 *   if (res.status === 402) {
 *     const upgrade = await extractUpgradeFromResponse(res);
 *     if (upgrade) { setUpgrade(upgrade); return; }
 *   }
 */
export async function extractUpgradeFromResponse(
  res: Response,
): Promise<{ feature: string; capability?: string; upgradeUrl: string; error?: string } | null> {
  if (res.status !== 402) return null;
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.clone().json()) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!body || body.requires_upgrade !== true) return null;
  const feature =
    typeof body.feature === 'string' && body.feature.trim()
      ? body.feature.trim()
      : 'generic';
  const upgradeUrl =
    typeof body.upgrade_url === 'string' && body.upgrade_url.trim()
      ? body.upgrade_url.trim()
      : '/montree/admin/billing';
  const error =
    typeof body.error === 'string' && body.error.trim()
      ? body.error.trim()
      : undefined;
  // 3-tier gates send an explicit `capability`; older ones only send `feature`.
  const capability =
    typeof body.capability === 'string' && body.capability.trim()
      ? body.capability.trim()
      : undefined;
  return { feature, capability, upgradeUrl, error };
}
