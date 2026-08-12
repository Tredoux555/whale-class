// components/cms/documents/DocumentBody.tsx
// ============================================================================
// The six documents, rendered. Phase 5.
// ============================================================================
// Every function here takes a MODEL from `lib/cms/engine/doc-generator` and a
// translator, and returns ink. They compute nothing: the sorting, the grouping,
// the "who may collect" filter and the severity ordering are all the engine's
// decisions, made once, in a pure function, where they are testable.
//
// A view that re-sorts its own rows is a view that will one day disagree with
// the engine about which child's allergy comes first on the wall. So none of
// them do.
//
// Server components — no 'use client', no state, no effects. The only client
// JavaScript on a document page is the Print button.

import type { ReactNode } from 'react';
import type {
  AllergyPosterDoc,
  ClassListDoc,
  DietarySheetDoc,
  EmergencyContactsDoc,
  GeneratedDocument,
  LabelsDoc,
  PickupSheetDoc,
} from '@/lib/cms/engine/doc-generator';
import type { AllergySeverity, DietaryReason, Relationship } from '@/lib/cms/engine/types';
import type { TFunction, TranslationKey } from '@/lib/cms/i18n/t';

// ── shared bits ─────────────────────────────────────────────────────────────

const SEVERITY_KEY: Record<AllergySeverity, TranslationKey> = {
  severe: 'teacher.today.severity.severe',
  moderate: 'teacher.today.severity.moderate',
  mild: 'teacher.today.severity.mild',
};

const REASON_KEY: Record<DietaryReason, TranslationKey> = {
  allergy: 'dietary.reason.allergy',
  medical: 'dietary.reason.medical',
  religious: 'dietary.reason.religious',
  cultural: 'dietary.reason.cultural',
  preference: 'dietary.reason.preference',
};

const RELATIONSHIP_KEY: Record<Relationship, TranslationKey> = {
  mother: 'relationship.mother',
  father: 'relationship.father',
  aunt: 'relationship.aunt',
  uncle: 'relationship.uncle',
  grandparent: 'relationship.grandparent',
  guardian: 'relationship.guardian',
  other: 'relationship.other',
};

/** The one em-dash rule: an empty cell says "—", never nothing. A blank cell on
 *  paper reads as "the printer clipped it"; a dash reads as "we do not know". */
function Dash({ t }: { t: TFunction }) {
  return <span className="cms-doc-quiet">{t('doc.none')}</span>;
}

function fullName(name: string, surname: string | null): string {
  return surname ? `${name} ${surname}` : name;
}

function ageLabel(
  age: { years: number; months: number } | null,
  t: TFunction
): string {
  return age ? t('doc.age', { years: age.years, months: age.months }) : t('doc.none');
}

/** The unknown-date sentinel a staff-entered child carries (queries.ts). */
const UNKNOWN_DOB = '1900-01-01';
function dobLabel(dateOfBirth: string, t: TFunction): string {
  return dateOfBirth && dateOfBirth !== UNKNOWN_DOB ? dateOfBirth : t('doc.unknown');
}

function Empty({ t }: { t: TFunction }) {
  return <p className="cms-doc-empty">{t('doc.empty')}</p>;
}

function SeverityBadge({ severity, t }: { severity: AllergySeverity; t: TFunction }) {
  return (
    <span className={`cms-doc-badge cms-doc-sev-${severity}`}>{t(SEVERITY_KEY[severity])}</span>
  );
}

// ── 1 · class list ──────────────────────────────────────────────────────────

function ClassList({ doc, t }: { doc: ClassListDoc; t: TFunction }) {
  if (doc.rows.length === 0) return <Empty t={t} />;
  return (
    <table className="cms-doc-table">
      <thead>
        <tr>
          <th>{t('doc.col.name')}</th>
          <th className="cms-doc-num">{t('doc.col.dob')}</th>
          <th className="cms-doc-num">{t('doc.col.age')}</th>
          <th>{t('doc.col.language')}</th>
          <th>{t('doc.col.allergies')}</th>
          <th>{t('doc.col.dietary')}</th>
          <th>{t('doc.col.note')}</th>
        </tr>
      </thead>
      <tbody>
        {doc.rows.map((row) => (
          <tr key={row.childId}>
            <td className="cms-doc-name" dir="auto">
              {fullName(row.preferredName, row.surname)}
            </td>
            <td className="cms-doc-num cms-doc-quiet">{dobLabel(row.dateOfBirth, t)}</td>
            <td className="cms-doc-num">{ageLabel(row.age, t)}</td>
            <td className="cms-doc-quiet" dir="auto">
              {row.homeLanguage || <Dash t={t} />}
            </td>
            <td dir="auto">
              {row.allergens.length === 0 ? (
                <Dash t={t} />
              ) : (
                <>
                  {row.allergens.map((a, i) => (
                    <span key={`${row.childId}-a-${i}`} style={{ marginInlineEnd: '2mm' }}>
                      {a.name} <SeverityBadge severity={a.severity} t={t} />
                    </span>
                  ))}
                  {row.carriesEpipen ? (
                    <span className="cms-doc-badge cms-doc-epipen">
                      {t('doc.classList.epipen')}
                    </span>
                  ) : null}
                </>
              )}
            </td>
            <td dir="auto">
              {row.dietaryLabels.length === 0 ? <Dash t={t} /> : row.dietaryLabels.join(', ')}
            </td>
            <td className="cms-doc-quiet" dir="auto">
              {row.staffNote || <Dash t={t} />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── 2 · pickup sheet ────────────────────────────────────────────────────────

function PickupSheet({ doc, t }: { doc: PickupSheetDoc; t: TFunction }) {
  if (doc.rows.length === 0) return <Empty t={t} />;
  return (
    <table className="cms-doc-table">
      <thead>
        <tr>
          <th style={{ width: '26%' }}>{t('doc.col.child')}</th>
          <th style={{ width: '34%' }}>{t('doc.col.collectors')}</th>
          <th style={{ width: '16%' }}>{t('doc.col.collectedBy')}</th>
          <th style={{ width: '10%' }}>{t('doc.col.time')}</th>
          <th style={{ width: '14%' }}>{t('doc.col.signature')}</th>
        </tr>
      </thead>
      <tbody>
        {doc.rows.map((row) => (
          <tr key={row.childId}>
            <td dir="auto">
              <span className="cms-doc-name">{fullName(row.childName, row.surname)}</span>
              {row.criticalAllergens.length > 0 ? (
                <div style={{ marginTop: '1mm' }}>
                  <span className="cms-doc-badge cms-doc-sev-severe">
                    {t('doc.pickup.watch')}: {row.criticalAllergens.join(', ')}
                  </span>
                </div>
              ) : null}
            </td>
            <td dir="auto">
              {row.noCollector ? (
                // Not an empty cell. A child with nobody authorised is the one
                // row on this sheet a manager must resolve before 3pm, and a
                // blank space would read as "we forgot to print it".
                <span className="cms-doc-badge cms-doc-sev-severe">
                  {t('doc.pickup.noCollector')}
                </span>
              ) : (
                row.collectors.map((c) => (
                  <div key={c.guardianId} style={{ marginBottom: '0.8mm' }}>
                    <span className="cms-doc-name">{c.name}</span>{' '}
                    <span className="cms-doc-quiet">({t(RELATIONSHIP_KEY[c.relationship])})</span>
                    {c.phone ? (
                      <span className="cms-doc-num" dir="ltr">
                        {' · '}
                        {c.phone}
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </td>
            {/* Three hand-written columns. This is a GATE sheet — the point of
                printing it is that somebody signs it at the door. */}
            <td>
              <span className="cms-doc-write" />
            </td>
            <td>
              <span className="cms-doc-write" />
            </td>
            <td>
              <span className="cms-doc-write" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── 3 · dietary sheet ───────────────────────────────────────────────────────

function DietarySheet({ doc, t }: { doc: DietarySheetDoc; t: TFunction }) {
  if (doc.groups.length === 0 && doc.allergyOnly.length === 0) return <Empty t={t} />;
  return (
    <>
      {doc.groups.map((group) => (
        <section className="cms-doc-section" key={`${group.label}-${group.reason}`}>
          <h2 dir="auto">
            {t('doc.dietary.group', { label: group.label })}{' '}
            <span className="cms-doc-badge cms-doc-sev-mild">{t(REASON_KEY[group.reason])}</span>{' '}
            <span className="cms-doc-badge cms-doc-sev-mild">
              {t('teacher.documents.count.children', { count: group.children.length })}
            </span>
          </h2>
          <table className="cms-doc-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>{t('doc.col.child')}</th>
                <th style={{ width: '32%' }}>{t('doc.col.excluded')}</th>
                <th style={{ width: '20%' }}>{t('doc.col.allergies')}</th>
                <th style={{ width: '18%' }}>{t('doc.col.notes')}</th>
              </tr>
            </thead>
            <tbody>
              {group.children.map((child) => (
                <tr key={child.childId}>
                  <td className="cms-doc-name" dir="auto">
                    {fullName(child.childName, child.surname)}
                  </td>
                  <td dir="auto">
                    {child.excludedFoods.length === 0 ? (
                      <Dash t={t} />
                    ) : (
                      child.excludedFoods.join(', ')
                    )}
                  </td>
                  <td dir="auto">
                    {child.allergens.length === 0 ? <Dash t={t} /> : child.allergens.join(', ')}
                  </td>
                  <td className="cms-doc-quiet" dir="auto">
                    {child.notes || <Dash t={t} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {doc.allergyOnly.length > 0 ? (
        <section className="cms-doc-section">
          <h2>{t('doc.dietary.allergyOnly')}</h2>
          <p className="cms-doc-note">{t('doc.dietary.allergyOnly.body')}</p>
          <table className="cms-doc-table" style={{ marginTop: '3mm' }}>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>{t('doc.col.child')}</th>
                <th>{t('doc.col.allergies')}</th>
              </tr>
            </thead>
            <tbody>
              {doc.allergyOnly.map((child) => (
                <tr key={child.childId}>
                  <td className="cms-doc-name" dir="auto">
                    {fullName(child.childName, child.surname)}
                  </td>
                  <td dir="auto">{child.allergens.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}

// ── 4 · allergy poster ──────────────────────────────────────────────────────

function AllergyPoster({ doc, t }: { doc: AllergyPosterDoc; t: TFunction }) {
  if (doc.entries.length === 0) return <Empty t={t} />;
  return (
    <>
      {doc.entries.map((entry) => (
        <section className="cms-doc-poster" key={entry.allergyId}>
          <p className="cms-doc-badge cms-doc-sev-severe" style={{ fontSize: '11pt' }}>
            {t('doc.allergyPoster.heading')}
          </p>
          <h2 className="cms-doc-poster-name" dir="auto">
            {fullName(entry.childName, entry.surname)}
          </h2>
          <p className="cms-doc-poster-allergen" dir="auto">
            {entry.allergen}
          </p>

          <div className="cms-doc-poster-band">
            <SeverityBadge severity={entry.severity} t={t} />
            {entry.carriesEpipen ? (
              <span className="cms-doc-badge cms-doc-epipen">
                {t('doc.allergyPoster.epipen')}
              </span>
            ) : null}
          </div>

          <dl>
            {entry.reaction ? (
              <>
                <dt>{t('doc.allergyPoster.reaction')}</dt>
                <dd dir="auto">{entry.reaction}</dd>
              </>
            ) : null}
            {entry.responsePlan ? (
              <>
                <dt>{t('doc.allergyPoster.plan')}</dt>
                <dd dir="auto">{entry.responsePlan}</dd>
              </>
            ) : null}
            {entry.medicationLocation ? (
              <>
                <dt>{t('doc.allergyPoster.medication')}</dt>
                <dd dir="auto">{entry.medicationLocation}</dd>
              </>
            ) : null}
          </dl>
        </section>
      ))}
      <p className="cms-doc-note">{t('doc.allergyPoster.footer')}</p>
    </>
  );
}

// ── 5 · emergency contacts ──────────────────────────────────────────────────

function EmergencyContacts({ doc, t }: { doc: EmergencyContactsDoc; t: TFunction }) {
  if (doc.rows.length === 0) return <Empty t={t} />;
  return (
    <table className="cms-doc-table">
      <thead>
        <tr>
          <th style={{ width: '24%' }}>{t('doc.col.child')}</th>
          <th style={{ width: '42%' }}>{t('doc.col.contacts')}</th>
          <th style={{ width: '34%' }}>{t('doc.col.medical')}</th>
        </tr>
      </thead>
      <tbody>
        {doc.rows.map((row) => (
          <tr key={row.childId}>
            <td dir="auto">
              <span className="cms-doc-name">{fullName(row.childName, row.surname)}</span>
              <div className="cms-doc-quiet cms-doc-num">{dobLabel(row.dateOfBirth, t)}</div>
              {row.criticalAllergens.length > 0 ? (
                <div style={{ marginTop: '1mm' }}>
                  <span className="cms-doc-badge cms-doc-sev-severe">
                    {t('doc.emergency.allergy')}: {row.criticalAllergens.join(', ')}
                  </span>
                </div>
              ) : null}
            </td>

            <td dir="auto">
              {row.contacts.length === 0 ? (
                <Dash t={t} />
              ) : (
                row.contacts.map((c) => (
                  <div key={c.guardianId} style={{ marginBottom: '1mm' }}>
                    <span className="cms-doc-num cms-doc-quiet">{c.priority}. </span>
                    <span className="cms-doc-name">{c.name}</span>{' '}
                    <span className="cms-doc-quiet">({t(RELATIONSHIP_KEY[c.relationship])})</span>
                    {c.phone ? (
                      <span className="cms-doc-num" dir="ltr">
                        {' · '}
                        {c.phone}
                      </span>
                    ) : null}
                    {/* A restriction note is a court order and prints IN FULL,
                        never abbreviated and never behind a colour alone. */}
                    {c.restrictionNote ? (
                      <div>
                        <span className="cms-doc-badge cms-doc-sev-severe">
                          {t('doc.emergency.restriction')}
                        </span>{' '}
                        <span className="cms-doc-quiet">{c.restrictionNote}</span>
                      </div>
                    ) : c.canCollect ? (
                      <span className="cms-doc-quiet"> · {t('doc.emergency.canCollect')}</span>
                    ) : null}
                  </div>
                ))
              )}
            </td>

            <td dir="auto">
              <div>
                <span className="cms-doc-quiet">{t('doc.emergency.doctor')}: </span>
                {row.doctorName ? (
                  <>
                    {row.doctorName}
                    {row.doctorPhone ? (
                      <span className="cms-doc-num" dir="ltr">
                        {' · '}
                        {row.doctorPhone}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <Dash t={t} />
                )}
              </div>
              {row.conditions.length > 0 ? (
                <div>
                  <span className="cms-doc-quiet">{t('doc.emergency.conditions')}: </span>
                  {row.conditions.join(', ')}
                </div>
              ) : null}
              {row.medications.length > 0 ? (
                <div>
                  <span className="cms-doc-quiet">{t('doc.emergency.medication')}: </span>
                  {row.medications
                    .map((m) => [m.name, m.dose, m.location].filter(Boolean).join(' · '))
                    .join('; ')}
                </div>
              ) : null}
              {row.emergencyNote ? (
                <div className="cms-doc-quiet">{row.emergencyNote}</div>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── 6 · name labels ─────────────────────────────────────────────────────────

function Labels({ doc, t }: { doc: LabelsDoc; t: TFunction }) {
  if (doc.cells.length === 0) return <Empty t={t} />;
  return (
    <>
      <p className="cms-doc-note" style={{ marginBottom: '4mm' }}>
        {t('doc.labels.cut')}
      </p>
      <div
        className="cms-doc-grid"
        style={{ gridTemplateColumns: `repeat(${doc.columns}, 1fr)` }}
      >
        {doc.cells.map((cell) => (
          <div className="cms-doc-label" key={cell.childId}>
            <span className="cms-doc-label-name" dir="auto">
              {cell.name}
            </span>
            <span className="cms-doc-label-room" dir="auto">
              {cell.roomName}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── dispatch ────────────────────────────────────────────────────────────────

/** One entry point per document page. Exhaustive by construction — adding a
 *  `DocumentKind` without a view is a TypeScript error, not a blank page. */
export function DocumentBody({ doc, t }: { doc: GeneratedDocument; t: TFunction }): ReactNode {
  switch (doc.kind) {
    case 'class_list':
      return <ClassList doc={doc} t={t} />;
    case 'pickup_sheet':
      return <PickupSheet doc={doc} t={t} />;
    case 'dietary_sheet':
      return <DietarySheet doc={doc} t={t} />;
    case 'allergy_poster':
      return <AllergyPoster doc={doc} t={t} />;
    case 'emergency_contacts':
      return <EmergencyContacts doc={doc} t={t} />;
    case 'name_labels':
      return <Labels doc={doc} t={t} />;
  }
}
