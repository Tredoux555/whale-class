// components/cms/parent/MontreeDoorway.tsx
// ============================================================================
// THE DOORWAY. The end of the "CMS will build messaging one day" story.
// ============================================================================
//
// 🚨 CMS DOES NOT AND WILL NOT BUILD PARENT COMMUNICATION. Montree already has
// all of it — encrypted parent↔teacher threads, weekly reports, photo montages,
// appointments, push notifications and real video/voice calls. A second, worse
// copy inside CMS would split a family's attention across two inboxes and split
// the school's answers across two products. So `/cms/parent/messages` and
// `/cms/parent/updates` are not features waiting to be written; they are a
// SIGNPOST, and this component is it.
//
// It has three honest states and never pretends to a fourth:
//
//   CONNECTED — the office accepted, the child has a Montree record and a code.
//               Show the code big, show the way in, and say what is waiting
//               there in specifics ("the teacher answers", "photo films"),
//               because "communications platform" tells a parent nothing.
//   PENDING   — accepted and connected, code not minted yet. Say so plainly;
//               it is a state that resolves without the family doing anything.
//   NOT READY — the school has not switched this on. Say THAT, and say it is
//               not the family's fault or their missing step. An empty screen
//               with a spinner would have the family ringing the office.
//
// Server component: no client JavaScript, no state. A code and a link do not
// need React.

import { Card, SunkPanel } from '@/components/cms/Card';
import {
  CameraIcon,
  DocumentIcon,
  MessageIcon,
  VideoIcon,
} from '@/components/cms/icons';
import { montreeParentEntryUrl } from '@/lib/cms/montree-junction';
import { getServerT } from '@/lib/cms/i18n/server';
import type { ParentDoorway } from '@/lib/cms/db/queries';
import type { TFunction, TranslationKey } from '@/lib/cms/i18n/t';

const FEATURES: {
  icon: React.ReactNode;
  title: TranslationKey;
  body: TranslationKey;
}[] = [
  {
    icon: <MessageIcon />,
    title: 'parent.doorway.feature.chat',
    body: 'parent.doorway.feature.chatBody',
  },
  {
    icon: <DocumentIcon />,
    title: 'parent.doorway.feature.reports',
    body: 'parent.doorway.feature.reportsBody',
  },
  {
    icon: <CameraIcon />,
    title: 'parent.doorway.feature.photos',
    body: 'parent.doorway.feature.photosBody',
  },
  {
    // Not aspirational: Agora video + voice, booked through Montree
    // appointments, joined from the parent portal. Scouted, not assumed.
    icon: <VideoIcon />,
    title: 'parent.doorway.feature.calls',
    body: 'parent.doorway.feature.callsBody',
  },
];

export async function MontreeDoorway({
  doorways,
  variant,
  demo,
}: {
  doorways: ParentDoorway[];
  /** Which page is asking — the heading changes, the door does not. */
  variant: 'messages' | 'updates';
  demo: boolean;
}) {
  const { t } = await getServerT();

  const connected = doorways.filter((d) => d.montreeLinked && d.inviteCode);
  const pending = doorways.filter((d) => d.montreeLinked && !d.inviteCode);

  // NOT READY — nothing is connected. One honest card, and no code field
  // standing empty as though the family had lost something. The feature list
  // still renders: a family who cannot get in yet should still be able to see
  // what they are waiting FOR, and a lone sentence on an empty page reads like
  // an error rather than a "not yet".
  if (connected.length === 0 && pending.length === 0) {
    return (
      <>
        <Card className="text-center py-10 mb-5">
          <span className="cms-card-sunk grid place-items-center w-12 h-12 text-harbor-accent-deep mx-auto mb-4">
            <span className="block w-6 h-6">
              <MessageIcon />
            </span>
          </span>
          <h2 className="font-head text-[19px] m-0">{t('parent.doorway.notReady.title')}</h2>
          <p className="text-[13.5px] text-harbor-muted mt-2.5 mb-0 leading-relaxed max-w-[58ch] mx-auto">
            {t('parent.doorway.notReady.body')}
          </p>
        </Card>
        <FeatureList t={t} />
      </>
    );
  }

  const heading =
    variant === 'messages'
      ? t('parent.doorway.messages.heading')
      : t('parent.doorway.updates.heading');
  const body =
    variant === 'messages'
      ? t('parent.doorway.messages.body')
      : t('parent.doorway.updates.body');

  return (
    <>
      {demo ? (
        <Card className="mb-5 border-s-[3px] border-s-harbor-amber">
          <p className="text-[13px] text-harbor-muted leading-relaxed m-0">
            {t('parent.doorway.demo')}
          </p>
        </Card>
      ) : null}

      <Card className="mb-5">
        <h2 className="font-head text-[21px] leading-tight m-0">{heading}</h2>
        <p className="text-[14px] text-harbor-muted leading-relaxed mt-2.5 mb-0 max-w-[64ch]">
          {body}
        </p>

        {/* One code per child, because a family with two children at the school
            holds two Montree children — the name is on the card so nobody has
            to guess which code is whose. */}
        {/* Two columns only when there are two codes: a lone card in a
            half-width grid reads as a card that failed to load. */}
        <ul
          className={`grid gap-3 list-none p-0 m-0 mt-5 ${
            connected.length > 1 ? 'sm:grid-cols-2' : ''
          }`}
        >
          {connected.map((d) => (
            <li key={d.childId}>
              <SunkPanel>
                <span className="cms-label mb-1.5">
                  {t('parent.doorway.codeFor', { name: d.preferredName })}
                </span>
                {/* dir=ltr: the code is a Latin/numeric token and must not be
                    reordered by the Arabic layout. */}
                <p
                  dir="ltr"
                  className="font-head text-[30px] tracking-[0.2em] m-0 leading-none text-harbor-accent-deep"
                >
                  {d.inviteCode}
                </p>
                <p className="text-[12px] text-harbor-muted leading-relaxed mt-2.5 mb-3">
                  {t('parent.doorway.codeHint')}
                </p>
                <a
                  href={montreeParentEntryUrl(d.inviteCode ?? '')}
                  target="_blank"
                  rel="noreferrer"
                  className="cms-btn cms-btn-primary cms-btn-md"
                >
                  {t('parent.doorway.cta')}
                </a>
              </SunkPanel>
            </li>
          ))}
        </ul>

        <Steps t={t} />

        {pending.length > 0 ? (
          <SunkPanel className="mt-4">
            <span className="cms-label mb-1.5">{t('parent.doorway.pending.title')}</span>
            <p className="text-[13px] text-harbor-muted leading-relaxed m-0">
              {t('parent.doorway.pending.body')}
            </p>
            {/* WHICH child. A family with two children must not have to guess
                whose code is still coming. Names are DATA, not a string. */}
            <p dir="auto" className="text-[13px] leading-snug m-0 mt-2">
              {pending.map((d) => d.preferredName).join(' · ')}
            </p>
          </SunkPanel>
        ) : null}
      </Card>

      <FeatureList t={t} />
    </>
  );
}

/**
 * Three steps, and they are the REAL three.
 *
 * The button carries the code in the URL, so Montree usually submits it for the
 * family and step 2 never happens — but a code read out over the phone, typed
 * on a different phone, or opened from a printed slip lands on a single box
 * asking for it. A walkthrough that only described the happy link would leave
 * exactly the family who needs instructions without any. Step 3 says what
 * ARRIVING looks like, because "you're in" is the reassurance a parent who has
 * never seen Montree is missing.
 */
function Steps({ t }: { t: TFunction }) {
  const steps: TranslationKey[] = [
    'parent.doorway.step1',
    'parent.doorway.step2',
    'parent.doorway.step3',
  ];
  return (
    <ol className="list-none p-0 m-0 mt-5 grid gap-2.5">
      {steps.map((key, i) => (
        <li key={key} className="flex gap-3 items-start">
          <span
            dir="ltr"
            className="cms-card-sunk grid place-items-center w-7 h-7 shrink-0 rounded-full font-head text-[13px] text-harbor-accent-deep"
          >
            {i + 1}
          </span>
          <span className="text-[13.5px] text-harbor-muted leading-relaxed pt-1">{t(key)}</span>
        </li>
      ))}
    </ol>
  );
}

/** What Montree actually holds for this family — the same four, whichever state
 *  the doorway is in. Every one names a surface that EXISTS in Montree today;
 *  none is a roadmap item wearing a feature's clothes. */
function FeatureList({ t }: { t: TFunction }) {
  return (
    <Card>
      <h2 className="font-head text-[16px] m-0 mb-4">{t('parent.doorway.whatYouFind')}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 list-none p-0 m-0">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex gap-3.5">
            <span className="cms-card-sunk grid place-items-center w-10 h-10 shrink-0 text-harbor-accent-deep">
              <span className="block w-5 h-5">{f.icon}</span>
            </span>
            <span className="min-w-0">
              <span className="block font-head text-[14.5px] leading-tight">{t(f.title)}</span>
              <span className="block text-[12.5px] text-harbor-muted leading-relaxed mt-1.5">
                {t(f.body)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
