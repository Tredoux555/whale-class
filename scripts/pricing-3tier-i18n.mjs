#!/usr/bin/env node
// scripts/pricing-3tier-i18n.mjs
//
// WP-C (3-tier pricing restructure, Sep 7 2026) — inserts the new
// `landing.pricing.*` plan-card keys and the `upgrade.feature.<capability>.*`
// keys into all 12 locale files, and rewrites the handful of existing values
// that still advertise the retired 7-day trial / Starter / Premium pricing.
//
// Idempotent: re-running is a no-op (insertion is skipped when the anchor key
// already exists; value rewrites are exact-line replacements).
//
// Run: node scripts/pricing-3tier-i18n.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const I18N = join(ROOT, 'lib', 'montree', 'i18n');
const LOCALES = ['en', 'zh', 'es', 'de', 'fr', 'pt', 'nl', 'it', 'ja', 'ko', 'uk', 'ru'];

// Key order for the inserted landing block. Plan names (Basic / Lite / Full)
// and the dollar figures are brand/price constants and stay Latin everywhere.
const LANDING_ORDER = [
  'line',
  'basicName', 'basicPrice', 'basicPer', 'basicB1', 'basicB2', 'basicB3', 'basicB4',
  'liteBadge', 'liteName', 'litePrice', 'litePer', 'liteB1', 'liteB2', 'liteB3', 'liteB4',
  'fullName', 'fullPrice', 'fullPer', 'fullB1', 'fullB2', 'fullB3', 'fullB4', 'fullFloor',
];

const UPGRADE_ORDER = [
  'guru', 'astra', 'aiReports', 'photoRecognition', 'montages',
  'parentMessaging', 'appointments', 'videoCalls', 'orgOnboarding',
  'cmsBridge', 'ai_budget',
];

const T = {};

T.en = {
  landing: {
    line: 'Three plans. No trial, no contract, cancel any time.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'a year, per school',
    basicB1: 'The full tracker, tap grid and printables',
    basicB2: 'Dark Phonics and the Writing Shelf library',
    basicB3: 'Class documents, labels and parent codes',
    basicB4: 'Up to 500 photos per school',
    liteBadge: 'Most schools start here',
    liteName: 'Lite', litePrice: '$20', litePer: 'a month, per school',
    liteB1: 'Guru answers your questions, all day',
    liteB2: 'Astra sits with the principal',
    liteB3: 'Weekly and parent reports, written for you',
    liteB4: 'Unlimited photos — you tag them yourself',
    fullName: 'Full', fullPrice: '$3', fullPer: 'per child, a month',
    fullB1: 'Take a photo — Montree knows the work',
    fullB2: 'Deeper reports parents keep',
    fullB3: 'Montages, parent messaging and calls',
    fullB4: 'Onboarding across your whole organisation',
    fullFloor: 'Minimum $30 a month (10 children)',
  },
  upgrade: {
    guru: ['Guru comes with Lite', 'Guru answers your classroom questions all day. It comes with Lite — $20 a month for the whole school — and with Full.'],
    astra: ['Astra comes with Lite', 'Astra sits with the principal and knows the whole school. She comes with Lite — $20 a month — and with Full.'],
    aiReports: ['Written reports come with Lite', 'Weekly reports and parent letters, written for you, come with Lite — $20 a month — and with Full.'],
    photoRecognition: ['Photo recognition is part of Full', 'On Full you take a photo and Montree knows the work. $3 per child a month, $30 minimum.'],
    montages: ['Montages are part of Full', 'The week as a short film for parents. Part of Full — $3 per child a month, $30 minimum.'],
    parentMessaging: ['Parent messaging is part of Full', 'Private, encrypted messages between teachers and parents. Part of Full — $3 per child a month.'],
    appointments: ['Appointments are part of Full', 'Parent bookings, availability and reminders. Part of Full — $3 per child a month.'],
    videoCalls: ['Parent calls are part of Full', 'Voice and video calls with parents, right inside Montree. Part of Full — $3 per child a month.'],
    orgOnboarding: ['Child onboarding is part of Full', 'Families fill in everything once, and your teachers never type it again. Part of Full — $3 per child a month.'],
    cmsBridge: ['Assessments are part of Full', 'Milestones, evaluations and the classroom bridge. Part of Full — $3 per child a month.'],
    ai_budget: ['Your AI allowance is used up', 'Lite includes a monthly AI allowance. It refreshes on the 1st — or move to Full for AI without a ceiling.'],
  },
  fineprint: 'Basic $12 a year · Lite $20 a month · Full $3 per child a month. No contracts, cancel any time.',
  closing: 'Basic $12 a year · Lite $20 a month · Full $3 per child a month, $30 minimum. No trial to run out, no contracts, cancel any time.',
  registerDuration: 'Basic — $12 a year',
  bannerCta: 'Add your card to keep your school running — Basic is $12 a year.',
  notConfiguredPricing: 'Pricing: <strong>Basic $12 a year · Lite $20 a month · Full $3 per child a month</strong> (minimum $30). No setup fee, no contracts, cancel any time.',
  upgradeTitle: 'Activate this feature',
  upgradeBody: 'This is part of a higher Montree plan. Lite is $20 a month for the whole school; Full is $3 per child a month.',
  upgradeCta: 'See plans',
};

T.zh = {
  landing: {
    line: '三种方案。无试用期，无合同，随时取消。',
    basicName: 'Basic', basicPrice: '$12', basicPer: '每所学校 / 年',
    basicB1: '完整的记录追踪、点选网格与可打印材料',
    basicB2: 'Dark Phonics 与书写架资源库',
    basicB3: '班级文件、标签与家长访问码',
    basicB4: '每所学校最多 500 张照片',
    liteBadge: '多数学校由此开始',
    liteName: 'Lite', litePrice: '$20', litePer: '每所学校 / 月',
    liteB1: 'Guru 全天回答您的问题',
    liteB2: 'Astra 陪伴园长处理校务',
    liteB3: '每周报告与家长信，为您代笔',
    liteB4: '照片数量不限——由您自行标注',
    fullName: 'Full', fullPrice: '$3', fullPer: '每位孩子 / 月',
    fullB1: '拍一张照片——Montree 认得这项工作',
    fullB2: '家长愿意珍藏的深度报告',
    fullB3: '影片集锦、家长消息与通话',
    fullB4: '覆盖整个机构的入园登记',
    fullFloor: '每月最低 $30（10 位孩子）',
  },
  upgrade: {
    guru: ['Guru 包含在 Lite 方案中', 'Guru 全天回答您的课堂问题。Lite 方案（每月 $20，全校通用）与 Full 方案均已包含。'],
    astra: ['Astra 包含在 Lite 方案中', 'Astra 陪伴园长，了解全校情况。Lite 方案（每月 $20）与 Full 方案均已包含。'],
    aiReports: ['AI 报告包含在 Lite 方案中', '每周报告与家长信由系统代笔。Lite 方案（每月 $20）与 Full 方案均已包含。'],
    photoRecognition: ['照片识别属于 Full 方案', '在 Full 方案中，您只需拍照，Montree 就知道那是哪项工作。每位孩子每月 $3，最低 $30。'],
    montages: ['影片集锦属于 Full 方案', '把一周浓缩成给家长的短片。属于 Full 方案——每位孩子每月 $3，最低 $30。'],
    parentMessaging: ['家长消息属于 Full 方案', '师生家长之间的私密加密消息。属于 Full 方案——每位孩子每月 $3。'],
    appointments: ['预约功能属于 Full 方案', '家长预约、可约时段与提醒。属于 Full 方案——每位孩子每月 $3。'],
    videoCalls: ['家长通话属于 Full 方案', '在 Montree 内直接与家长语音或视频通话。属于 Full 方案——每位孩子每月 $3。'],
    orgOnboarding: ['入园登记属于 Full 方案', '家庭只需填写一次，老师再也不用重复录入。属于 Full 方案——每位孩子每月 $3。'],
    cmsBridge: ['发展评估属于 Full 方案', '里程碑、评估与班级衔接。属于 Full 方案——每位孩子每月 $3。'],
    ai_budget: ['本月 AI 额度已用完', 'Lite 方案含每月 AI 额度，每月 1 日重置——或升级到 Full，AI 不设上限。'],
  },
  fineprint: 'Basic 每年 $12 · Lite 每月 $20 · Full 每位孩子每月 $3。没有合同，随时取消。',
  closing: 'Basic 每年 $12 · Lite 每月 $20 · Full 每位孩子每月 $3（最低 $30）。没有会到期的试用，没有合同，随时取消。',
  registerDuration: 'Basic——每年 $12',
  bannerCta: '添加银行卡以保持学校正常运行——Basic 每年 $12。',
  notConfiguredPricing: '价格：<strong>Basic 每年 $12 · Lite 每月 $20 · Full 每位孩子每月 $3</strong>（最低 $30）。无安装费，无合同，随时取消。',
  upgradeTitle: '启用此功能',
  upgradeBody: '此功能属于更高的 Montree 方案。Lite 每月 $20（全校通用）；Full 每位孩子每月 $3。',
  upgradeCta: '查看方案',
};

T.es = {
  landing: {
    line: 'Tres planes. Sin prueba gratuita, sin contrato, cancelás cuando quieras.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'al año, por escuela',
    basicB1: 'El seguimiento completo, la grilla y los imprimibles',
    basicB2: 'Dark Phonics y la biblioteca de escritura',
    basicB3: 'Documentos de clase, etiquetas y códigos de familias',
    basicB4: 'Hasta 500 fotos por escuela',
    liteBadge: 'La mayoría empieza acá',
    liteName: 'Lite', litePrice: '$20', litePer: 'al mes, por escuela',
    liteB1: 'Guru responde tus preguntas, todo el día',
    liteB2: 'Astra acompaña a la dirección',
    liteB3: 'Informes semanales y cartas a familias, escritos por vos',
    liteB4: 'Fotos ilimitadas — las etiquetás vos',
    fullName: 'Full', fullPrice: '$3', fullPer: 'por niño, al mes',
    fullB1: 'Sacá una foto — Montree reconoce el trabajo',
    fullB2: 'Informes más profundos que las familias guardan',
    fullB3: 'Videos, mensajería con familias y llamadas',
    fullB4: 'Ingreso de niños en toda tu organización',
    fullFloor: 'Mínimo $30 al mes (10 niños)',
  },
  upgrade: {
    guru: ['Guru viene con Lite', 'Guru responde tus preguntas del aula todo el día. Viene con Lite — $20 al mes para toda la escuela — y con Full.'],
    astra: ['Astra viene con Lite', 'Astra acompaña a la dirección y conoce toda la escuela. Viene con Lite — $20 al mes — y con Full.'],
    aiReports: ['Los informes escritos vienen con Lite', 'Informes semanales y cartas a familias, escritos por vos, vienen con Lite — $20 al mes — y con Full.'],
    photoRecognition: ['El reconocimiento de fotos es parte de Full', 'Con Full sacás una foto y Montree reconoce el trabajo. $3 por niño al mes, mínimo $30.'],
    montages: ['Los videos son parte de Full', 'La semana como un corto para las familias. Parte de Full — $3 por niño al mes, mínimo $30.'],
    parentMessaging: ['La mensajería con familias es parte de Full', 'Mensajes privados y cifrados entre docentes y familias. Parte de Full — $3 por niño al mes.'],
    appointments: ['Las citas son parte de Full', 'Reservas de familias, disponibilidad y recordatorios. Parte de Full — $3 por niño al mes.'],
    videoCalls: ['Las llamadas con familias son parte de Full', 'Llamadas de voz y video con familias, dentro de Montree. Parte de Full — $3 por niño al mes.'],
    orgOnboarding: ['El ingreso de niños es parte de Full', 'Las familias completan todo una vez y tus docentes no lo vuelven a tipear. Parte de Full — $3 por niño al mes.'],
    cmsBridge: ['Las evaluaciones son parte de Full', 'Hitos, evaluaciones y el puente con el aula. Parte de Full — $3 por niño al mes.'],
    ai_budget: ['Se agotó tu cupo de IA', 'Lite incluye un cupo mensual de IA. Se renueva el día 1 — o pasá a Full para IA sin techo.'],
  },
  fineprint: 'Basic $12 al año · Lite $20 al mes · Full $3 por niño al mes. Sin contratos, cancelás cuando quieras.',
  closing: 'Basic $12 al año · Lite $20 al mes · Full $3 por niño al mes (mínimo $30). Sin prueba que se vence, sin contratos, cancelás cuando quieras.',
  registerDuration: 'Basic — $12 al año',
  bannerCta: 'Agregá tu tarjeta para que todo siga funcionando — Basic cuesta $12 al año.',
  notConfiguredPricing: 'Precio: <strong>Basic $12 al año · Lite $20 al mes · Full $3 por niño al mes</strong> (mínimo $30). Sin cargo de instalación, sin contratos, cancelás cuando quieras.',
  upgradeTitle: 'Activar esta función',
  upgradeBody: 'Esto es parte de un plan superior de Montree. Lite cuesta $20 al mes para toda la escuela; Full, $3 por niño al mes.',
  upgradeCta: 'Ver planes',
};

T.de = {
  landing: {
    line: 'Drei Pläne. Keine Testphase, kein Vertrag, jederzeit kündbar.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'pro Jahr und Schule',
    basicB1: 'Die vollständige Dokumentation, das Raster und alle Druckvorlagen',
    basicB2: 'Dark Phonics und die Schreibregal-Bibliothek',
    basicB3: 'Klassendokumente, Etiketten und Elterncodes',
    basicB4: 'Bis zu 500 Fotos pro Schule',
    liteBadge: 'Hier starten die meisten Schulen',
    liteName: 'Lite', litePrice: '$20', litePer: 'pro Monat und Schule',
    liteB1: 'Guru beantwortet Ihre Fragen, den ganzen Tag',
    liteB2: 'Astra begleitet die Schulleitung',
    liteB3: 'Wochen- und Elternberichte, für Sie geschrieben',
    liteB4: 'Unbegrenzt Fotos — Sie ordnen sie selbst zu',
    fullName: 'Full', fullPrice: '$3', fullPer: 'pro Kind und Monat',
    fullB1: 'Ein Foto genügt — Montree erkennt die Arbeit',
    fullB2: 'Tiefere Berichte, die Eltern aufbewahren',
    fullB3: 'Filme, Elternnachrichten und Anrufe',
    fullB4: 'Aufnahme neuer Kinder in der ganzen Organisation',
    fullFloor: 'Mindestens $30 pro Monat (10 Kinder)',
  },
  upgrade: {
    guru: ['Guru gehört zu Lite', 'Guru beantwortet Ihre Fragen aus dem Klassenzimmer den ganzen Tag. Enthalten in Lite — $20 pro Monat für die ganze Schule — und in Full.'],
    astra: ['Astra gehört zu Lite', 'Astra begleitet die Schulleitung und kennt die ganze Schule. Enthalten in Lite — $20 pro Monat — und in Full.'],
    aiReports: ['Geschriebene Berichte gehören zu Lite', 'Wochenberichte und Elternbriefe, für Sie geschrieben. Enthalten in Lite — $20 pro Monat — und in Full.'],
    photoRecognition: ['Fotoerkennung gehört zu Full', 'Mit Full fotografieren Sie, und Montree erkennt die Arbeit. $3 pro Kind und Monat, mindestens $30.'],
    montages: ['Filme gehören zu Full', 'Die Woche als kurzer Film für die Eltern. Teil von Full — $3 pro Kind und Monat, mindestens $30.'],
    parentMessaging: ['Elternnachrichten gehören zu Full', 'Private, verschlüsselte Nachrichten zwischen Lehrkräften und Eltern. Teil von Full — $3 pro Kind und Monat.'],
    appointments: ['Termine gehören zu Full', 'Elternbuchungen, Verfügbarkeiten und Erinnerungen. Teil von Full — $3 pro Kind und Monat.'],
    videoCalls: ['Elterngespräche gehören zu Full', 'Sprach- und Videoanrufe mit Eltern, direkt in Montree. Teil von Full — $3 pro Kind und Monat.'],
    orgOnboarding: ['Die Kindaufnahme gehört zu Full', 'Familien tragen alles einmal ein, Ihre Lehrkräfte nie wieder. Teil von Full — $3 pro Kind und Monat.'],
    cmsBridge: ['Einschätzungen gehören zu Full', 'Meilensteine, Auswertungen und die Brücke ins Klassenzimmer. Teil von Full — $3 pro Kind und Monat.'],
    ai_budget: ['Ihr KI-Kontingent ist aufgebraucht', 'Lite enthält ein monatliches KI-Kontingent. Es erneuert sich am 1. — oder wechseln Sie zu Full für KI ohne Obergrenze.'],
  },
  fineprint: 'Basic $12 pro Jahr · Lite $20 pro Monat · Full $3 pro Kind und Monat. Keine Verträge, jederzeit kündbar.',
  closing: 'Basic $12 pro Jahr · Lite $20 pro Monat · Full $3 pro Kind und Monat (mindestens $30). Keine ablaufende Testphase, keine Verträge, jederzeit kündbar.',
  registerDuration: 'Basic — $12 pro Jahr',
  bannerCta: 'Hinterlegen Sie Ihre Karte, damit alles weiterläuft — Basic kostet $12 pro Jahr.',
  notConfiguredPricing: 'Preise: <strong>Basic $12 pro Jahr · Lite $20 pro Monat · Full $3 pro Kind und Monat</strong> (mindestens $30). Keine Einrichtungsgebühr, keine Verträge, jederzeit kündbar.',
  upgradeTitle: 'Diese Funktion aktivieren',
  upgradeBody: 'Das gehört zu einem höheren Montree-Plan. Lite kostet $20 pro Monat für die ganze Schule, Full $3 pro Kind und Monat.',
  upgradeCta: 'Pläne ansehen',
};

T.fr = {
  landing: {
    line: 'Trois formules. Sans essai, sans contrat, résiliable à tout moment.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'par an, par école',
    basicB1: 'Le suivi complet, la grille et les documents à imprimer',
    basicB2: 'Dark Phonics et la bibliothèque d’écriture',
    basicB3: 'Documents de classe, étiquettes et codes parents',
    basicB4: 'Jusqu’à 500 photos par école',
    liteBadge: 'La plupart des écoles commencent ici',
    liteName: 'Lite', litePrice: '$20', litePer: 'par mois, par école',
    liteB1: 'Guru répond à vos questions, toute la journée',
    liteB2: 'Astra accompagne la direction',
    liteB3: 'Bilans hebdomadaires et lettres aux parents, écrits pour vous',
    liteB4: 'Photos illimitées — vous les identifiez vous-même',
    fullName: 'Full', fullPrice: '$3', fullPer: 'par enfant et par mois',
    fullB1: 'Prenez une photo — Montree reconnaît l’activité',
    fullB2: 'Des bilans plus riches, que les parents gardent',
    fullB3: 'Montages, messagerie parents et appels',
    fullB4: 'Inscription des enfants dans toute votre organisation',
    fullFloor: 'Minimum $30 par mois (10 enfants)',
  },
  upgrade: {
    guru: ['Guru est inclus avec Lite', 'Guru répond à vos questions de classe toute la journée. Inclus avec Lite — $20 par mois pour toute l’école — et avec Full.'],
    astra: ['Astra est incluse avec Lite', 'Astra accompagne la direction et connaît toute l’école. Incluse avec Lite — $20 par mois — et avec Full.'],
    aiReports: ['Les bilans rédigés sont inclus avec Lite', 'Bilans hebdomadaires et lettres aux parents, écrits pour vous. Inclus avec Lite — $20 par mois — et avec Full.'],
    photoRecognition: ['La reconnaissance photo fait partie de Full', 'Avec Full, vous prenez une photo et Montree reconnaît l’activité. $3 par enfant et par mois, minimum $30.'],
    montages: ['Les montages font partie de Full', 'La semaine en court-métrage pour les parents. Inclus dans Full — $3 par enfant et par mois, minimum $30.'],
    parentMessaging: ['La messagerie parents fait partie de Full', 'Messages privés et chiffrés entre enseignants et parents. Inclus dans Full — $3 par enfant et par mois.'],
    appointments: ['Les rendez-vous font partie de Full', 'Réservations des parents, disponibilités et rappels. Inclus dans Full — $3 par enfant et par mois.'],
    videoCalls: ['Les appels avec les parents font partie de Full', 'Appels audio et vidéo avec les parents, directement dans Montree. Inclus dans Full — $3 par enfant et par mois.'],
    orgOnboarding: ['L’inscription des enfants fait partie de Full', 'Les familles renseignent tout une fois, vos enseignants ne le retapent jamais. Inclus dans Full — $3 par enfant et par mois.'],
    cmsBridge: ['Les évaluations font partie de Full', 'Jalons, évaluations et passerelle avec la classe. Inclus dans Full — $3 par enfant et par mois.'],
    ai_budget: ['Votre quota d’IA est épuisé', 'Lite comprend un quota d’IA mensuel. Il se renouvelle le 1er — ou passez à Full pour une IA sans plafond.'],
  },
  fineprint: 'Basic $12 par an · Lite $20 par mois · Full $3 par enfant et par mois. Sans contrat, résiliable à tout moment.',
  closing: 'Basic $12 par an · Lite $20 par mois · Full $3 par enfant et par mois (minimum $30). Pas d’essai qui expire, pas de contrat, résiliable à tout moment.',
  registerDuration: 'Basic — $12 par an',
  bannerCta: 'Ajoutez votre carte pour que tout continue — Basic coûte $12 par an.',
  notConfiguredPricing: 'Tarifs : <strong>Basic $12 par an · Lite $20 par mois · Full $3 par enfant et par mois</strong> (minimum $30). Sans frais d’installation, sans contrat, résiliable à tout moment.',
  upgradeTitle: 'Activer cette fonctionnalité',
  upgradeBody: 'Cela fait partie d’une formule Montree supérieure. Lite coûte $20 par mois pour toute l’école, Full $3 par enfant et par mois.',
  upgradeCta: 'Voir les formules',
};

T.pt = {
  landing: {
    line: 'Três planos. Sem período de teste, sem contrato, cancele quando quiser.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'por ano, por escola',
    basicB1: 'O acompanhamento completo, a grelha e os imprimíveis',
    basicB2: 'Dark Phonics e a biblioteca de escrita',
    basicB3: 'Documentos de turma, etiquetas e códigos das famílias',
    basicB4: 'Até 500 fotografias por escola',
    liteBadge: 'A maioria das escolas começa aqui',
    liteName: 'Lite', litePrice: '$20', litePer: 'por mês, por escola',
    liteB1: 'O Guru responde às suas perguntas, o dia todo',
    liteB2: 'A Astra acompanha a direção',
    liteB3: 'Relatórios semanais e cartas às famílias, escritos por si',
    liteB4: 'Fotografias sem limite — identifica-as você mesmo',
    fullName: 'Full', fullPrice: '$3', fullPer: 'por criança, por mês',
    fullB1: 'Tire uma fotografia — o Montree reconhece o trabalho',
    fullB2: 'Relatórios mais profundos, que as famílias guardam',
    fullB3: 'Montagens, mensagens às famílias e chamadas',
    fullB4: 'Admissão de crianças em toda a organização',
    fullFloor: 'Mínimo de $30 por mês (10 crianças)',
  },
  upgrade: {
    guru: ['O Guru vem com o Lite', 'O Guru responde às suas perguntas de sala o dia todo. Incluído no Lite — $20 por mês para toda a escola — e no Full.'],
    astra: ['A Astra vem com o Lite', 'A Astra acompanha a direção e conhece toda a escola. Incluída no Lite — $20 por mês — e no Full.'],
    aiReports: ['Os relatórios escritos vêm com o Lite', 'Relatórios semanais e cartas às famílias, escritos por si. Incluídos no Lite — $20 por mês — e no Full.'],
    photoRecognition: ['O reconhecimento de fotografias faz parte do Full', 'No Full tira uma fotografia e o Montree reconhece o trabalho. $3 por criança por mês, mínimo de $30.'],
    montages: ['As montagens fazem parte do Full', 'A semana como um pequeno filme para as famílias. Parte do Full — $3 por criança por mês, mínimo de $30.'],
    parentMessaging: ['As mensagens às famílias fazem parte do Full', 'Mensagens privadas e cifradas entre educadores e famílias. Parte do Full — $3 por criança por mês.'],
    appointments: ['As marcações fazem parte do Full', 'Marcações das famílias, disponibilidade e lembretes. Parte do Full — $3 por criança por mês.'],
    videoCalls: ['As chamadas com as famílias fazem parte do Full', 'Chamadas de voz e vídeo com as famílias, dentro do Montree. Parte do Full — $3 por criança por mês.'],
    orgOnboarding: ['A admissão de crianças faz parte do Full', 'As famílias preenchem tudo uma vez e os educadores nunca mais escrevem aquilo. Parte do Full — $3 por criança por mês.'],
    cmsBridge: ['As avaliações fazem parte do Full', 'Marcos, avaliações e a ponte com a sala. Parte do Full — $3 por criança por mês.'],
    ai_budget: ['A sua quota de IA acabou', 'O Lite inclui uma quota mensal de IA. Renova-se no dia 1 — ou passe para o Full e tenha IA sem limite.'],
  },
  fineprint: 'Basic $12 por ano · Lite $20 por mês · Full $3 por criança por mês. Sem contratos, cancele quando quiser.',
  closing: 'Basic $12 por ano · Lite $20 por mês · Full $3 por criança por mês (mínimo de $30). Sem período de teste a expirar, sem contratos, cancele quando quiser.',
  registerDuration: 'Basic — $12 por ano',
  bannerCta: 'Adicione o seu cartão para manter a escola a funcionar — o Basic custa $12 por ano.',
  notConfiguredPricing: 'Preços: <strong>Basic $12 por ano · Lite $20 por mês · Full $3 por criança por mês</strong> (mínimo de $30). Sem custo de instalação, sem contratos, cancele quando quiser.',
  upgradeTitle: 'Ativar esta funcionalidade',
  upgradeBody: 'Isto faz parte de um plano Montree superior. O Lite custa $20 por mês para toda a escola; o Full, $3 por criança por mês.',
  upgradeCta: 'Ver planos',
};

T.nl = {
  landing: {
    line: 'Drie pakketten. Geen proefperiode, geen contract, altijd opzegbaar.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'per jaar, per school',
    basicB1: 'De volledige observatie, het raster en al het printwerk',
    basicB2: 'Dark Phonics en de schrijfplank-bibliotheek',
    basicB3: 'Klasdocumenten, etiketten en oudercodes',
    basicB4: 'Tot 500 foto’s per school',
    liteBadge: 'De meeste scholen beginnen hier',
    liteName: 'Lite', litePrice: '$20', litePer: 'per maand, per school',
    liteB1: 'Guru beantwoordt je vragen, de hele dag',
    liteB2: 'Astra zit naast de directeur',
    liteB3: 'Week- en ouderverslagen, voor je geschreven',
    liteB4: 'Onbeperkt foto’s — je labelt ze zelf',
    fullName: 'Full', fullPrice: '$3', fullPer: 'per kind, per maand',
    fullB1: 'Maak een foto — Montree herkent het werkje',
    fullB2: 'Diepere verslagen die ouders bewaren',
    fullB3: 'Montages, ouderberichten en gesprekken',
    fullB4: 'Kindaanmelding in je hele organisatie',
    fullFloor: 'Minimaal $30 per maand (10 kinderen)',
  },
  upgrade: {
    guru: ['Guru hoort bij Lite', 'Guru beantwoordt je klasvragen de hele dag. Zit in Lite — $20 per maand voor de hele school — en in Full.'],
    astra: ['Astra hoort bij Lite', 'Astra zit naast de directeur en kent de hele school. Zit in Lite — $20 per maand — en in Full.'],
    aiReports: ['Geschreven verslagen horen bij Lite', 'Weekverslagen en ouderbrieven, voor je geschreven. Zitten in Lite — $20 per maand — en in Full.'],
    photoRecognition: ['Fotoherkenning hoort bij Full', 'Met Full maak je een foto en herkent Montree het werkje. $3 per kind per maand, minimaal $30.'],
    montages: ['Montages horen bij Full', 'De week als korte film voor ouders. Onderdeel van Full — $3 per kind per maand, minimaal $30.'],
    parentMessaging: ['Ouderberichten horen bij Full', 'Privé, versleutelde berichten tussen leerkracht en ouder. Onderdeel van Full — $3 per kind per maand.'],
    appointments: ['Afspraken horen bij Full', 'Ouderafspraken, beschikbaarheid en herinneringen. Onderdeel van Full — $3 per kind per maand.'],
    videoCalls: ['Oudergesprekken horen bij Full', 'Spraak- en videogesprekken met ouders, in Montree zelf. Onderdeel van Full — $3 per kind per maand.'],
    orgOnboarding: ['Kindaanmelding hoort bij Full', 'Gezinnen vullen alles één keer in, je leerkrachten typen het nooit meer. Onderdeel van Full — $3 per kind per maand.'],
    cmsBridge: ['Evaluaties horen bij Full', 'Mijlpalen, evaluaties en de brug naar de klas. Onderdeel van Full — $3 per kind per maand.'],
    ai_budget: ['Je AI-tegoed is op', 'Lite bevat een maandelijks AI-tegoed. Het vernieuwt op de 1e — of stap over naar Full voor AI zonder plafond.'],
  },
  fineprint: 'Basic $12 per jaar · Lite $20 per maand · Full $3 per kind per maand. Geen contracten, altijd opzegbaar.',
  closing: 'Basic $12 per jaar · Lite $20 per maand · Full $3 per kind per maand (minimaal $30). Geen proefperiode die afloopt, geen contracten, altijd opzegbaar.',
  registerDuration: 'Basic — $12 per jaar',
  bannerCta: 'Voeg je kaart toe zodat alles blijft draaien — Basic kost $12 per jaar.',
  notConfiguredPricing: 'Prijzen: <strong>Basic $12 per jaar · Lite $20 per maand · Full $3 per kind per maand</strong> (minimaal $30). Geen opstartkosten, geen contracten, altijd opzegbaar.',
  upgradeTitle: 'Deze functie activeren',
  upgradeBody: 'Dit hoort bij een hoger Montree-pakket. Lite kost $20 per maand voor de hele school; Full $3 per kind per maand.',
  upgradeCta: 'Bekijk pakketten',
};

T.it = {
  landing: {
    line: 'Tre piani. Nessuna prova, nessun contratto, disdici quando vuoi.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'all’anno, per scuola',
    basicB1: 'L’osservazione completa, la griglia e i materiali da stampare',
    basicB2: 'Dark Phonics e la biblioteca della scrittura',
    basicB3: 'Documenti di classe, etichette e codici per le famiglie',
    basicB4: 'Fino a 500 foto per scuola',
    liteBadge: 'La maggior parte delle scuole inizia qui',
    liteName: 'Lite', litePrice: '$20', litePer: 'al mese, per scuola',
    liteB1: 'Guru risponde alle tue domande, tutto il giorno',
    liteB2: 'Astra accompagna la direzione',
    liteB3: 'Relazioni settimanali e lettere alle famiglie, scritte per te',
    liteB4: 'Foto illimitate — le etichetti tu',
    fullName: 'Full', fullPrice: '$3', fullPer: 'per bambino, al mese',
    fullB1: 'Scatta una foto — Montree riconosce il lavoro',
    fullB2: 'Relazioni più profonde, che le famiglie conservano',
    fullB3: 'Montaggi, messaggi alle famiglie e chiamate',
    fullB4: 'Inserimento dei bambini in tutta l’organizzazione',
    fullFloor: 'Minimo $30 al mese (10 bambini)',
  },
  upgrade: {
    guru: ['Guru è incluso in Lite', 'Guru risponde alle tue domande di classe tutto il giorno. Incluso in Lite — $20 al mese per tutta la scuola — e in Full.'],
    astra: ['Astra è inclusa in Lite', 'Astra accompagna la direzione e conosce tutta la scuola. Inclusa in Lite — $20 al mese — e in Full.'],
    aiReports: ['Le relazioni scritte sono incluse in Lite', 'Relazioni settimanali e lettere alle famiglie, scritte per te. Incluse in Lite — $20 al mese — e in Full.'],
    photoRecognition: ['Il riconoscimento delle foto fa parte di Full', 'Con Full scatti una foto e Montree riconosce il lavoro. $3 per bambino al mese, minimo $30.'],
    montages: ['I montaggi fanno parte di Full', 'La settimana come un piccolo film per le famiglie. Parte di Full — $3 per bambino al mese, minimo $30.'],
    parentMessaging: ['I messaggi alle famiglie fanno parte di Full', 'Messaggi privati e cifrati tra insegnanti e famiglie. Parte di Full — $3 per bambino al mese.'],
    appointments: ['Gli appuntamenti fanno parte di Full', 'Prenotazioni delle famiglie, disponibilità e promemoria. Parte di Full — $3 per bambino al mese.'],
    videoCalls: ['Le chiamate con le famiglie fanno parte di Full', 'Chiamate audio e video con le famiglie, dentro Montree. Parte di Full — $3 per bambino al mese.'],
    orgOnboarding: ['L’inserimento dei bambini fa parte di Full', 'Le famiglie compilano tutto una volta e i tuoi insegnanti non lo riscrivono più. Parte di Full — $3 per bambino al mese.'],
    cmsBridge: ['Le valutazioni fanno parte di Full', 'Traguardi, valutazioni e il ponte con la classe. Parte di Full — $3 per bambino al mese.'],
    ai_budget: ['Il tuo credito IA è esaurito', 'Lite include un credito IA mensile. Si rinnova il 1° — oppure passa a Full per un’IA senza tetto.'],
  },
  fineprint: 'Basic $12 all’anno · Lite $20 al mese · Full $3 per bambino al mese. Nessun contratto, disdici quando vuoi.',
  closing: 'Basic $12 all’anno · Lite $20 al mese · Full $3 per bambino al mese (minimo $30). Nessuna prova che scade, nessun contratto, disdici quando vuoi.',
  registerDuration: 'Basic — $12 all’anno',
  bannerCta: 'Aggiungi la tua carta per non interrompere nulla — Basic costa $12 all’anno.',
  notConfiguredPricing: 'Prezzi: <strong>Basic $12 all’anno · Lite $20 al mese · Full $3 per bambino al mese</strong> (minimo $30). Nessun costo di attivazione, nessun contratto, disdici quando vuoi.',
  upgradeTitle: 'Attiva questa funzione',
  upgradeBody: 'Fa parte di un piano Montree superiore. Lite costa $20 al mese per tutta la scuola; Full $3 per bambino al mese.',
  upgradeCta: 'Vedi i piani',
};

T.ja = {
  landing: {
    line: 'プランは3つ。試用期間なし、契約なし、いつでも解約できます。',
    basicName: 'Basic', basicPrice: '$12', basicPer: '1園あたり / 年',
    basicB1: '記録・タップグリッド・印刷教材のすべて',
    basicB2: 'Dark Phonics と書きの棚ライブラリ',
    basicB3: 'クラス書類・ラベル・保護者コード',
    basicB4: '1園あたり写真500枚まで',
    liteBadge: '多くの園はここから',
    liteName: 'Lite', litePrice: '$20', litePer: '1園あたり / 月',
    liteB1: 'Guru が一日中、質問に答えます',
    liteB2: 'Astra が園長に寄り添います',
    liteB3: '週次レポートと保護者への手紙を代筆',
    liteB4: '写真は無制限 — タグ付けはご自身で',
    fullName: 'Full', fullPrice: '$3', fullPer: '園児1人あたり / 月',
    fullB1: '写真を撮るだけ — Montree がお仕事を見分けます',
    fullB2: '保護者が保存したくなる、より深いレポート',
    fullB3: 'ムービー・保護者メッセージ・通話',
    fullB4: '組織全体での入園受付',
    fullFloor: '月額最低 $30（園児10人分）',
  },
  upgrade: {
    guru: ['Guru は Lite に含まれます', 'Guru は一日中、教室の質問に答えます。Lite（園全体で月 $20）と Full に含まれます。'],
    astra: ['Astra は Lite に含まれます', 'Astra は園長に寄り添い、園全体を把握します。Lite（月 $20）と Full に含まれます。'],
    aiReports: ['レポート作成は Lite に含まれます', '週次レポートと保護者への手紙の代筆は、Lite（月 $20）と Full に含まれます。'],
    photoRecognition: ['写真認識は Full の機能です', 'Full では写真を撮るだけで Montree がお仕事を見分けます。園児1人あたり月 $3、最低 $30。'],
    montages: ['ムービーは Full の機能です', '1週間を保護者向けの短い映像に。Full の機能です — 園児1人あたり月 $3、最低 $30。'],
    parentMessaging: ['保護者メッセージは Full の機能です', '先生と保護者の間の暗号化されたやり取り。Full の機能です — 園児1人あたり月 $3。'],
    appointments: ['面談予約は Full の機能です', '保護者の予約・空き時間・リマインダー。Full の機能です — 園児1人あたり月 $3。'],
    videoCalls: ['保護者との通話は Full の機能です', 'Montree の中で音声・ビデオ通話ができます。Full の機能です — 園児1人あたり月 $3。'],
    orgOnboarding: ['入園受付は Full の機能です', 'ご家庭が一度入力すれば、先生が入力し直すことはありません。Full の機能です — 園児1人あたり月 $3。'],
    cmsBridge: ['発達評価は Full の機能です', 'マイルストーン、評価、教室との連携。Full の機能です — 園児1人あたり月 $3。'],
    ai_budget: ['今月の AI 利用枠を使い切りました', 'Lite には毎月の AI 利用枠が含まれます。毎月1日に更新されます — 上限なしで使うなら Full へ。'],
  },
  fineprint: 'Basic 年 $12 · Lite 月 $20 · Full 園児1人あたり月 $3。契約の縛りはなく、いつでも解約できます。',
  closing: 'Basic 年 $12 · Lite 月 $20 · Full 園児1人あたり月 $3（最低 $30）。期限切れになる試用期間も契約もなく、いつでも解約できます。',
  registerDuration: 'Basic — 年 $12',
  bannerCta: 'カードを登録して園の利用を続けてください — Basic は年 $12 です。',
  notConfiguredPricing: '料金：<strong>Basic 年 $12 · Lite 月 $20 · Full 園児1人あたり月 $3</strong>（最低 $30）。初期費用も契約もなく、いつでも解約できます。',
  upgradeTitle: 'この機能を有効にする',
  upgradeBody: 'これは上位の Montree プランの機能です。Lite は園全体で月 $20、Full は園児1人あたり月 $3 です。',
  upgradeCta: 'プランを見る',
};

T.ko = {
  landing: {
    line: '세 가지 요금제. 체험 기간 없음, 계약 없음, 언제든 해지.',
    basicName: 'Basic', basicPrice: '$12', basicPer: '학교당 / 년',
    basicB1: '전체 기록, 탭 그리드, 인쇄 자료',
    basicB2: 'Dark Phonics와 쓰기 선반 라이브러리',
    basicB3: '학급 문서, 라벨, 학부모 코드',
    basicB4: '학교당 사진 500장까지',
    liteBadge: '대부분의 학교가 여기서 시작합니다',
    liteName: 'Lite', litePrice: '$20', litePer: '학교당 / 월',
    liteB1: 'Guru가 하루 종일 질문에 답합니다',
    liteB2: 'Astra가 원장님 곁을 지킵니다',
    liteB3: '주간 보고서와 학부모 편지를 대신 씁니다',
    liteB4: '사진 무제한 — 태그는 직접 답니다',
    fullName: 'Full', fullPrice: '$3', fullPer: '아동 1명당 / 월',
    fullB1: '사진 한 장이면 — Montree가 작업을 알아봅니다',
    fullB2: '학부모가 간직하는 더 깊은 보고서',
    fullB3: '영상 몽타주, 학부모 메시지, 통화',
    fullB4: '조직 전체의 원아 입학 절차',
    fullFloor: '월 최소 $30(아동 10명)',
  },
  upgrade: {
    guru: ['Guru는 Lite에 포함됩니다', 'Guru는 하루 종일 교실의 질문에 답합니다. Lite(학교 전체 월 $20)와 Full에 포함됩니다.'],
    astra: ['Astra는 Lite에 포함됩니다', 'Astra는 원장님 곁에서 학교 전체를 파악합니다. Lite(월 $20)와 Full에 포함됩니다.'],
    aiReports: ['보고서 작성은 Lite에 포함됩니다', '주간 보고서와 학부모 편지 대필은 Lite(월 $20)와 Full에 포함됩니다.'],
    photoRecognition: ['사진 인식은 Full 기능입니다', 'Full에서는 사진만 찍으면 Montree가 작업을 알아봅니다. 아동 1명당 월 $3, 최소 $30.'],
    montages: ['영상 몽타주는 Full 기능입니다', '한 주를 학부모용 짧은 영상으로. Full 기능입니다 — 아동 1명당 월 $3, 최소 $30.'],
    parentMessaging: ['학부모 메시지는 Full 기능입니다', '교사와 학부모 사이의 암호화된 비공개 대화. Full 기능입니다 — 아동 1명당 월 $3.'],
    appointments: ['상담 예약은 Full 기능입니다', '학부모 예약, 가능 시간, 알림. Full 기능입니다 — 아동 1명당 월 $3.'],
    videoCalls: ['학부모 통화는 Full 기능입니다', 'Montree 안에서 음성·영상 통화를 합니다. Full 기능입니다 — 아동 1명당 월 $3.'],
    orgOnboarding: ['원아 입학 절차는 Full 기능입니다', '가정이 한 번만 입력하면 교사가 다시 입력할 일이 없습니다. Full 기능입니다 — 아동 1명당 월 $3.'],
    cmsBridge: ['발달 평가는 Full 기능입니다', '발달 이정표, 평가, 교실 연계. Full 기능입니다 — 아동 1명당 월 $3.'],
    ai_budget: ['이번 달 AI 사용량을 모두 썼습니다', 'Lite에는 매달 AI 사용량이 포함됩니다. 매월 1일에 갱신됩니다 — 한도 없이 쓰려면 Full로 옮기세요.'],
  },
  fineprint: 'Basic 연 $12 · Lite 월 $20 · Full 아동 1명당 월 $3. 계약 없이 언제든 해지할 수 있습니다.',
  closing: 'Basic 연 $12 · Lite 월 $20 · Full 아동 1명당 월 $3(최소 $30). 만료되는 체험 기간도 계약도 없고, 언제든 해지할 수 있습니다.',
  registerDuration: 'Basic — 연 $12',
  bannerCta: '학교 이용을 이어가려면 카드를 등록하세요 — Basic은 연 $12입니다.',
  notConfiguredPricing: '요금: <strong>Basic 연 $12 · Lite 월 $20 · Full 아동 1명당 월 $3</strong>(최소 $30). 설치비도 계약도 없고, 언제든 해지할 수 있습니다.',
  upgradeTitle: '이 기능 사용하기',
  upgradeBody: '상위 Montree 요금제의 기능입니다. Lite는 학교 전체 월 $20, Full은 아동 1명당 월 $3입니다.',
  upgradeCta: '요금제 보기',
};

T.uk = {
  landing: {
    line: 'Три плани. Без пробного періоду, без договору, скасувати можна будь-коли.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'на рік, за школу',
    basicB1: 'Повний трекер, сітка спостережень і матеріали для друку',
    basicB2: 'Dark Phonics і бібліотека полиці письма',
    basicB3: 'Документи класу, етикетки й коди для батьків',
    basicB4: 'До 500 світлин на школу',
    liteBadge: 'Більшість шкіл починає звідси',
    liteName: 'Lite', litePrice: '$20', litePer: 'на місяць, за школу',
    liteB1: 'Guru відповідає на ваші запитання цілий день',
    liteB2: 'Astra поруч із директором',
    liteB3: 'Тижневі звіти й листи батькам, написані за вас',
    liteB4: 'Необмежені світлини — позначаєте їх самі',
    fullName: 'Full', fullPrice: '$3', fullPer: 'за дитину, на місяць',
    fullB1: 'Зробіть світлину — Montree впізнає роботу',
    fullB2: 'Глибші звіти, які батьки зберігають',
    fullB3: 'Відеомонтажі, повідомлення батькам і дзвінки',
    fullB4: 'Зарахування дітей у всій організації',
    fullFloor: 'Мінімум $30 на місяць (10 дітей)',
  },
  upgrade: {
    guru: ['Guru входить у Lite', 'Guru цілий день відповідає на запитання з групи. Входить у Lite — $20 на місяць за всю школу — і у Full.'],
    astra: ['Astra входить у Lite', 'Astra поруч із директором і знає всю школу. Входить у Lite — $20 на місяць — і у Full.'],
    aiReports: ['Написані звіти входять у Lite', 'Тижневі звіти й листи батькам, написані за вас, входять у Lite — $20 на місяць — і у Full.'],
    photoRecognition: ['Розпізнавання світлин — це Full', 'У Full ви робите світлину, а Montree впізнає роботу. $3 за дитину на місяць, мінімум $30.'],
    montages: ['Відеомонтажі — це Full', 'Тиждень як короткий фільм для батьків. Це Full — $3 за дитину на місяць, мінімум $30.'],
    parentMessaging: ['Повідомлення батькам — це Full', 'Приватне зашифроване листування вчителя й батьків. Це Full — $3 за дитину на місяць.'],
    appointments: ['Зустрічі — це Full', 'Записи батьків, вільні години й нагадування. Це Full — $3 за дитину на місяць.'],
    videoCalls: ['Дзвінки батькам — це Full', 'Голосові й відеодзвінки з батьками просто в Montree. Це Full — $3 за дитину на місяць.'],
    orgOnboarding: ['Зарахування дітей — це Full', 'Родина заповнює все один раз, і вчителі більше цього не набирають. Це Full — $3 за дитину на місяць.'],
    cmsBridge: ['Оцінювання — це Full', 'Віхи розвитку, оцінювання та зв’язок із групою. Це Full — $3 за дитину на місяць.'],
    ai_budget: ['Ваш місячний ліміт ШІ вичерпано', 'Lite містить місячний ліміт ШІ. Він оновлюється 1-го числа — або перейдіть на Full, де стелі немає.'],
  },
  fineprint: 'Basic $12 на рік · Lite $20 на місяць · Full $3 за дитину на місяць. Без договорів, скасувати можна будь-коли.',
  closing: 'Basic $12 на рік · Lite $20 на місяць · Full $3 за дитину на місяць (мінімум $30). Немає пробного періоду, що спливає, немає договорів, скасувати можна будь-коли.',
  registerDuration: 'Basic — $12 на рік',
  bannerCta: 'Додайте картку, щоб школа працювала далі — Basic коштує $12 на рік.',
  notConfiguredPricing: 'Ціни: <strong>Basic $12 на рік · Lite $20 на місяць · Full $3 за дитину на місяць</strong> (мінімум $30). Без плати за підключення, без договорів, скасувати можна будь-коли.',
  upgradeTitle: 'Увімкнути цю можливість',
  upgradeBody: 'Це частина вищого плану Montree. Lite коштує $20 на місяць за всю школу, Full — $3 за дитину на місяць.',
  upgradeCta: 'Переглянути плани',
};

T.ru = {
  landing: {
    line: 'Три плана. Без пробного периода, без договора, отмена в любой момент.',
    basicName: 'Basic', basicPrice: '$12', basicPer: 'в год, за школу',
    basicB1: 'Полный трекер, сетка наблюдений и материалы для печати',
    basicB2: 'Dark Phonics и библиотека полки письма',
    basicB3: 'Документы класса, этикетки и коды для родителей',
    basicB4: 'До 500 фотографий на школу',
    liteBadge: 'Большинство школ начинает отсюда',
    liteName: 'Lite', litePrice: '$20', litePer: 'в месяц, за школу',
    liteB1: 'Guru отвечает на ваши вопросы весь день',
    liteB2: 'Astra рядом с директором',
    liteB3: 'Недельные отчёты и письма родителям, написанные за вас',
    liteB4: 'Неограниченные фотографии — отмечаете их сами',
    fullName: 'Full', fullPrice: '$3', fullPer: 'за ребёнка, в месяц',
    fullB1: 'Сделайте фото — Montree узнаёт работу',
    fullB2: 'Более глубокие отчёты, которые родители хранят',
    fullB3: 'Видеомонтажи, сообщения родителям и звонки',
    fullB4: 'Зачисление детей во всей организации',
    fullFloor: 'Минимум $30 в месяц (10 детей)',
  },
  upgrade: {
    guru: ['Guru входит в Lite', 'Guru весь день отвечает на вопросы из группы. Входит в Lite — $20 в месяц за всю школу — и в Full.'],
    astra: ['Astra входит в Lite', 'Astra рядом с директором и знает всю школу. Входит в Lite — $20 в месяц — и в Full.'],
    aiReports: ['Написанные отчёты входят в Lite', 'Недельные отчёты и письма родителям, написанные за вас, входят в Lite — $20 в месяц — и в Full.'],
    photoRecognition: ['Распознавание фотографий — это Full', 'В Full вы делаете фото, и Montree узнаёт работу. $3 за ребёнка в месяц, минимум $30.'],
    montages: ['Видеомонтажи — это Full', 'Неделя как короткий фильм для родителей. Это Full — $3 за ребёнка в месяц, минимум $30.'],
    parentMessaging: ['Сообщения родителям — это Full', 'Личная зашифрованная переписка педагога и родителей. Это Full — $3 за ребёнка в месяц.'],
    appointments: ['Встречи — это Full', 'Записи родителей, свободные окна и напоминания. Это Full — $3 за ребёнка в месяц.'],
    videoCalls: ['Звонки родителям — это Full', 'Голосовые и видеозвонки с родителями прямо в Montree. Это Full — $3 за ребёнка в месяц.'],
    orgOnboarding: ['Зачисление детей — это Full', 'Семья заполняет всё один раз, и педагоги больше это не набирают. Это Full — $3 за ребёнка в месяц.'],
    cmsBridge: ['Оценивание — это Full', 'Вехи развития, оценивание и связь с группой. Это Full — $3 за ребёнка в месяц.'],
    ai_budget: ['Месячный лимит ИИ исчерпан', 'В Lite входит месячный лимит ИИ. Он обновляется 1-го числа — или перейдите на Full, где потолка нет.'],
  },
  fineprint: 'Basic $12 в год · Lite $20 в месяц · Full $3 за ребёнка в месяц. Без договоров, отмена в любой момент.',
  closing: 'Basic $12 в год · Lite $20 в месяц · Full $3 за ребёнка в месяц (минимум $30). Нет пробного периода, который заканчивается, нет договоров, отмена в любой момент.',
  registerDuration: 'Basic — $12 в год',
  bannerCta: 'Добавьте карту, чтобы школа продолжала работать — Basic стоит $12 в год.',
  notConfiguredPricing: 'Цены: <strong>Basic $12 в год · Lite $20 в месяц · Full $3 за ребёнка в месяц</strong> (минимум $30). Без платы за подключение, без договоров, отмена в любой момент.',
  upgradeTitle: 'Включить эту возможность',
  upgradeBody: 'Это часть более высокого плана Montree. Lite стоит $20 в месяц за всю школу, Full — $3 за ребёнка в месяц.',
  upgradeCta: 'Посмотреть планы',
};

// ── writer ────────────────────────────────────────────────────────────────
function esc(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function replaceLine(src, key, value) {
  const re = new RegExp(`^(\\s*)'${key.replace(/\./g, '\\.')}':\\s*'(?:[^'\\\\]|\\\\.)*',?$`, 'm');
  if (!re.test(src)) return { src, hit: false };
  return { src: src.replace(re, `$1'${key}': '${esc(value)}',`), hit: true };
}

let changed = 0;
for (const loc of LOCALES) {
  const path = join(I18N, `${loc}.ts`);
  let src = readFileSync(path, 'utf8');
  const before = src;
  const t = T[loc];
  if (!t) throw new Error(`No copy authored for locale ${loc}`);

  // 1. Insert the new landing.pricing.* + upgrade.feature.* block after the
  //    existing `landing.pricing.seeFull` line.
  if (!src.includes("'landing.pricing.basicName'")) {
    const anchor = src.match(/^\s*'landing\.pricing\.seeFull':.*$/m);
    if (!anchor) throw new Error(`${loc}: anchor 'landing.pricing.seeFull' not found`);
    const lines = [];
    lines.push('  // ── 3-tier pricing (Sep 7 2026) — Basic / Lite / Full ──');
    for (const k of LANDING_ORDER) {
      lines.push(`  'landing.pricing.${k}': '${esc(t.landing[k])}',`);
    }
    lines.push('  // Per-capability upgrade cards (402 `feature` = capability name).');
    for (const c of UPGRADE_ORDER) {
      const [title, body] = t.upgrade[c];
      lines.push(`  'upgrade.feature.${c}.title': '${esc(title)}',`);
      lines.push(`  'upgrade.feature.${c}.body': '${esc(body)}',`);
    }
    src = src.replace(anchor[0], `${anchor[0]}\n${lines.join('\n')}`);
  }

  // 2. Rewrite the surviving trial / Starter / Premium copy.
  const rewrites = [
    ['landing.hero.fineprint', t.fineprint],
    ['landing.closing.body', t.closing],
    ['landing.pricing.trialLine', t.landing.line],
    ['register.trialDuration', t.registerDuration],
    ['trialBanner.ctaText', t.bannerCta],
    ['billing.notConfiguredPricing', t.notConfiguredPricing],
    ['upgrade.title', t.upgradeTitle],
    ['upgrade.body', t.upgradeBody],
    ['upgrade.cta', t.upgradeCta],
  ];
  const missed = [];
  for (const [key, value] of rewrites) {
    const r = replaceLine(src, key, value);
    src = r.src;
    if (!r.hit) missed.push(key);
  }
  if (missed.length) console.warn(`  ${loc}: could not rewrite ${missed.join(', ')}`);

  if (src !== before) {
    writeFileSync(path, src, 'utf8');
    changed++;
    console.log(`✓ ${loc}.ts updated`);
  } else {
    console.log(`· ${loc}.ts already current`);
  }
}
console.log(`\nDone — ${changed} locale file(s) written.`);
