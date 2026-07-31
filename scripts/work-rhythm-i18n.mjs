#!/usr/bin/env node
// switchboard-i18n.mjs — inserts the schoolFeatures.* section (15 keys) into all
// 12 Montree locale files. Fully deterministic: refuses to touch a file whose
// sha256 doesn't match the expected pre-state, and verifies the exact expected
// post-state hash after writing. Idempotent (skips files already at post-state).
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(HERE, '..', 'lib', 'montree', 'i18n');
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const DATA = {
 "en": {
  "pre": "da47fd7fb45ab1341fe06a98353529f17ca67b5e5a400f2af41c41c2906aa812",
  "post": "be19a3f209fd83c8d6869dbf86f517815d7333086c54344ac5231f3c1cb4d9c5",
  "after": 6084,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Work Rhythm',",
   "  'workRhythm.title': 'Work Rhythm',",
   "  'workRhythm.subtitle': 'Where each child spent their time across the five areas.',",
   "  'workRhythm.periodWeek': 'This week',",
   "  'workRhythm.periodMonth': 'This month',",
   "  'workRhythm.topArea': 'Most time in',",
   "  'workRhythm.minutesShort': '{n} min',",
   "  'workRhythm.events': '{n} moments',",
   "  'workRhythm.share': 'Share',",
   "  'workRhythm.detailNote': 'These minutes combine time written on paper record sheets with an estimate for each confirmed photo. Read them as the balance of a child\\'s week, not an exact measurement.',",
   "  'workRhythm.emptyChild': 'Nothing recorded yet',",
   "  'workRhythm.emptyClassroomTitle': 'No rhythm to show yet',",
   "  'workRhythm.emptyClassroomBody': 'Work Rhythm builds from two things: records you approve in Paper Scan, and classroom photos you confirm. As soon as either arrives, the bars appear here.',",
   "  'workRhythm.disabledTitle': 'Work Rhythm is not enabled',",
   "  'workRhythm.disabledBody': 'Work Rhythm has not been turned on for your school yet.',",
   "  'workRhythm.contactAdmin': 'Contact your school administrator to enable this feature.',",
   "  'workRhythm.loadFailed': 'Could not load the work rhythm.',"
  ]
 },
 "zh": {
  "pre": "f3698101578d756523937b4e268a8f3388b4e5ab25fbb6b4254825b70ee194cb",
  "post": "4149ac8ffa867034479d6ee561ee79a8f00245dbf9ce619a65c5d1fac8c46395",
  "after": 6025,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': '工作节奏',",
   "  'workRhythm.title': '工作节奏',",
   "  'workRhythm.subtitle': '看看每个孩子的时间分布在五大领域的哪些地方。',",
   "  'workRhythm.periodWeek': '本周',",
   "  'workRhythm.periodMonth': '本月',",
   "  'workRhythm.topArea': '用时最多',",
   "  'workRhythm.minutesShort': '{n} 分钟',",
   "  'workRhythm.events': '{n} 次记录',",
   "  'workRhythm.share': '占比',",
   "  'workRhythm.detailNote': '这里的分钟数由纸质记录表上写下的时间和每张已确认照片的估算值合并而成。它反映孩子一周的大致平衡，并非精确测量。',",
   "  'workRhythm.emptyChild': '暂无记录',",
   "  'workRhythm.emptyClassroomTitle': '暂时还没有可显示的节奏',",
   "  'workRhythm.emptyClassroomBody': '工作节奏来自两个来源：您在纸质扫描中审核通过的记录，以及您确认的课堂照片。只要其中之一有了内容，色条就会出现在这里。',",
   "  'workRhythm.disabledTitle': '工作节奏未启用',",
   "  'workRhythm.disabledBody': '您的学校尚未启用工作节奏。',",
   "  'workRhythm.contactAdmin': '请联系学校管理员启用此功能。',",
   "  'workRhythm.loadFailed': '无法加载工作节奏。',"
  ]
 },
 "es": {
  "pre": "fa3b9c0c11e8a12a4a00d348365fe2b0b8dd7d8bea28cd042ce636ced99f6573",
  "post": "d73a64e48a14c0ac478d438c15da7ed5c93a3a0ef21e60794ecff87a16d5fe46",
  "after": 5612,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Ritmo de Trabajo',",
   "  'workRhythm.title': 'Ritmo de Trabajo',",
   "  'workRhythm.subtitle': 'Dónde pasó su tiempo cada niño en las cinco áreas.',",
   "  'workRhythm.periodWeek': 'Esta semana',",
   "  'workRhythm.periodMonth': 'Este mes',",
   "  'workRhythm.topArea': 'Más tiempo en',",
   "  'workRhythm.minutesShort': '{n} min',",
   "  'workRhythm.events': '{n} momentos',",
   "  'workRhythm.share': 'Proporción',",
   "  'workRhythm.detailNote': 'Estos minutos combinan el tiempo anotado en las hojas de registro con una estimación por cada foto confirmada. Léelos como el equilibrio de la semana del niño, no como una medición exacta.',",
   "  'workRhythm.emptyChild': 'Todavía sin registros',",
   "  'workRhythm.emptyClassroomTitle': 'Todavía no hay ritmo para mostrar',",
   "  'workRhythm.emptyClassroomBody': 'El Ritmo de Trabajo se arma con dos cosas: los registros que aprobás en Escaneo de Papel y las fotos del aula que confirmás. En cuanto llegue cualquiera de las dos, aparecen las barras.',",
   "  'workRhythm.disabledTitle': 'El Ritmo de Trabajo no está habilitado',",
   "  'workRhythm.disabledBody': 'El Ritmo de Trabajo todavía no fue activado para tu escuela.',",
   "  'workRhythm.contactAdmin': 'Contactá al administrador de tu escuela para habilitar esta función.',",
   "  'workRhythm.loadFailed': 'No se pudo cargar el ritmo de trabajo.',"
  ]
 },
 "de": {
  "pre": "371240e3f6f0580d8d867411f3e28b2f25116061c4f90c2319899d3c1a05641d",
  "post": "f1a961f9e2f3cc57eaa9d2e628d903430504a4c1ee20319fa93c42115499af1c",
  "after": 5615,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Arbeitsrhythmus',",
   "  'workRhythm.title': 'Arbeitsrhythmus',",
   "  'workRhythm.subtitle': 'Wo jedes Kind seine Zeit in den fünf Bereichen verbracht hat.',",
   "  'workRhythm.periodWeek': 'Diese Woche',",
   "  'workRhythm.periodMonth': 'Dieser Monat',",
   "  'workRhythm.topArea': 'Die meiste Zeit in',",
   "  'workRhythm.minutesShort': '{n} Min.',",
   "  'workRhythm.events': '{n} Momente',",
   "  'workRhythm.share': 'Anteil',",
   "  'workRhythm.detailNote': 'Diese Minuten verbinden die auf den Beobachtungsbögen notierte Zeit mit einer Schätzung je bestätigtem Foto. Sie zeigen die Balance der Woche eines Kindes, keine exakte Messung.',",
   "  'workRhythm.emptyChild': 'Noch nichts erfasst',",
   "  'workRhythm.emptyClassroomTitle': 'Noch kein Rhythmus vorhanden',",
   "  'workRhythm.emptyClassroomBody': 'Der Arbeitsrhythmus entsteht aus zwei Quellen: den Einträgen, die Sie im Papier-Scan freigeben, und den Gruppenfotos, die Sie bestätigen. Sobald eines davon vorliegt, erscheinen hier die Balken.',",
   "  'workRhythm.disabledTitle': 'Arbeitsrhythmus ist nicht aktiviert',",
   "  'workRhythm.disabledBody': 'Der Arbeitsrhythmus wurde für Ihre Schule noch nicht aktiviert.',",
   "  'workRhythm.contactAdmin': 'Wenden Sie sich an Ihre Schulleitung, um diese Funktion zu aktivieren.',",
   "  'workRhythm.loadFailed': 'Der Arbeitsrhythmus konnte nicht geladen werden.',"
  ]
 },
 "fr": {
  "pre": "4bf4252455e150d0f48c80d50df844ab613f7210a4e333433b63b51e7e495f18",
  "post": "82af9ab560d9ea7a254f419378f398edc55d0ef5f8414470a009affa4c42de7e",
  "after": 5615,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Rythme de Travail',",
   "  'workRhythm.title': 'Rythme de Travail',",
   "  'workRhythm.subtitle': 'Où chaque enfant a passé son temps dans les cinq domaines.',",
   "  'workRhythm.periodWeek': 'Cette semaine',",
   "  'workRhythm.periodMonth': 'Ce mois-ci',",
   "  'workRhythm.topArea': 'Le plus de temps en',",
   "  'workRhythm.minutesShort': '{n} min',",
   "  'workRhythm.events': '{n} moments',",
   "  'workRhythm.share': 'Part',",
   "  'workRhythm.detailNote': 'Ces minutes combinent le temps noté sur les fiches d\\'observation et une estimation pour chaque photo confirmée. À lire comme l\\'équilibre de la semaine d\\'un enfant, pas comme une mesure exacte.',",
   "  'workRhythm.emptyChild': 'Rien d\\'enregistré pour l\\'instant',",
   "  'workRhythm.emptyClassroomTitle': 'Pas encore de rythme à afficher',",
   "  'workRhythm.emptyClassroomBody': 'Le Rythme de Travail se construit à partir de deux sources : les entrées que vous validez dans Scan Papier et les photos de classe que vous confirmez. Dès que l\\'une des deux arrive, les barres apparaissent ici.',",
   "  'workRhythm.disabledTitle': 'Le Rythme de Travail n\\'est pas activé',",
   "  'workRhythm.disabledBody': 'Le Rythme de Travail n\\'a pas encore été activé pour votre école.',",
   "  'workRhythm.contactAdmin': 'Contactez la direction de votre école pour activer cette fonctionnalité.',",
   "  'workRhythm.loadFailed': 'Impossible de charger le rythme de travail.',"
  ]
 },
 "pt": {
  "pre": "9f3e322d461175649002a04610b2517f40d54b224fba0115d74da4cd28e3a1ec",
  "post": "694a5162005371b29bdcbbde472cba0197c3d882c978fab771f5d43d2335441b",
  "after": 5615,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Ritmo de Trabalho',",
   "  'workRhythm.title': 'Ritmo de Trabalho',",
   "  'workRhythm.subtitle': 'Onde cada criança passou o tempo nas cinco áreas.',",
   "  'workRhythm.periodWeek': 'Esta semana',",
   "  'workRhythm.periodMonth': 'Este mês',",
   "  'workRhythm.topArea': 'Mais tempo em',",
   "  'workRhythm.minutesShort': '{n} min',",
   "  'workRhythm.events': '{n} momentos',",
   "  'workRhythm.share': 'Proporção',",
   "  'workRhythm.detailNote': 'Estes minutos combinam o tempo anotado nas folhas de registro com uma estimativa para cada foto confirmada. Leia como o equilíbrio da semana da criança, não como uma medição exata.',",
   "  'workRhythm.emptyChild': 'Nada registrado ainda',",
   "  'workRhythm.emptyClassroomTitle': 'Ainda não há ritmo para mostrar',",
   "  'workRhythm.emptyClassroomBody': 'O Ritmo de Trabalho se forma a partir de duas fontes: os registros que você aprova no Escaneamento de Papel e as fotos da sala que você confirma. Assim que qualquer uma delas chegar, as barras aparecem aqui.',",
   "  'workRhythm.disabledTitle': 'O Ritmo de Trabalho não está ativado',",
   "  'workRhythm.disabledBody': 'O Ritmo de Trabalho ainda não foi ativado para a sua escola.',",
   "  'workRhythm.contactAdmin': 'Entre em contato com a direção da sua escola para ativar este recurso.',",
   "  'workRhythm.loadFailed': 'Não foi possível carregar o ritmo de trabalho.',"
  ]
 },
 "nl": {
  "pre": "39a03056abb7649515fcd1cceefff798892eada73da0d99ea3af171ff6c411a4",
  "post": "8d65ba659767c4f1004c7e7fd7780bacd1c8c132be58564517fc4a2b674fd3ce",
  "after": 5615,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Werkritme',",
   "  'workRhythm.title': 'Werkritme',",
   "  'workRhythm.subtitle': 'Waar elk kind zijn tijd doorbracht binnen de vijf gebieden.',",
   "  'workRhythm.periodWeek': 'Deze week',",
   "  'workRhythm.periodMonth': 'Deze maand',",
   "  'workRhythm.topArea': 'Meeste tijd in',",
   "  'workRhythm.minutesShort': '{n} min',",
   "  'workRhythm.events': '{n} momenten',",
   "  'workRhythm.share': 'Aandeel',",
   "  'workRhythm.detailNote': 'Deze minuten combineren de tijd die op de observatiebladen staat met een schatting per bevestigde foto. Lees het als de balans van de week van een kind, niet als een exacte meting.',",
   "  'workRhythm.emptyChild': 'Nog niets vastgelegd',",
   "  'workRhythm.emptyClassroomTitle': 'Nog geen ritme om te tonen',",
   "  'workRhythm.emptyClassroomBody': 'Het Werkritme wordt opgebouwd uit twee bronnen: de notities die u goedkeurt in Papier-scan en de klasfoto\\'s die u bevestigt. Zodra een van beide binnenkomt, verschijnen de balken hier.',",
   "  'workRhythm.disabledTitle': 'Werkritme is niet ingeschakeld',",
   "  'workRhythm.disabledBody': 'Werkritme is nog niet ingeschakeld voor uw school.',",
   "  'workRhythm.contactAdmin': 'Neem contact op met uw schoolbeheerder om deze functie in te schakelen.',",
   "  'workRhythm.loadFailed': 'Het werkritme kon niet worden geladen.',"
  ]
 },
 "it": {
  "pre": "325541d6606cf3280fbf67fa6ccdf502a892614fb78c6c5eda2e707ac6740fe7",
  "post": "dedcc146a2a89df48169e8281f72fd584900f872154d9c2dffb64e4b6d7b7831",
  "after": 5615,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Ritmo di Lavoro',",
   "  'workRhythm.title': 'Ritmo di Lavoro',",
   "  'workRhythm.subtitle': 'Dove ogni bambino ha trascorso il proprio tempo nelle cinque aree.',",
   "  'workRhythm.periodWeek': 'Questa settimana',",
   "  'workRhythm.periodMonth': 'Questo mese',",
   "  'workRhythm.topArea': 'Più tempo in',",
   "  'workRhythm.minutesShort': '{n} min',",
   "  'workRhythm.events': '{n} momenti',",
   "  'workRhythm.share': 'Quota',",
   "  'workRhythm.detailNote': 'Questi minuti uniscono il tempo annotato sulle schede cartacee a una stima per ogni foto confermata. Vanno letti come l\\'equilibrio della settimana del bambino, non come una misurazione esatta.',",
   "  'workRhythm.emptyChild': 'Ancora nessuna registrazione',",
   "  'workRhythm.emptyClassroomTitle': 'Non c\\'è ancora un ritmo da mostrare',",
   "  'workRhythm.emptyClassroomBody': 'Il Ritmo di Lavoro nasce da due fonti: le voci che Lei approva nella Scansione Cartacea e le foto della classe che conferma. Non appena arriva una delle due, qui compaiono le barre.',",
   "  'workRhythm.disabledTitle': 'Il Ritmo di Lavoro non è attivo',",
   "  'workRhythm.disabledBody': 'Il Ritmo di Lavoro non è ancora stato attivato per la Sua scuola.',",
   "  'workRhythm.contactAdmin': 'Contatti la direzione della Sua scuola per attivare questa funzione.',",
   "  'workRhythm.loadFailed': 'Impossibile caricare il ritmo di lavoro.',"
  ]
 },
 "ja": {
  "pre": "0c312bf09fba30f138151e646b2723fe85fb366860cd9a81d38f35390c8a0bae",
  "post": "48f1f118f8a442a706fc218385b58b72973b59727343d5fa414bf8e0593b56e4",
  "after": 5615,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': '活動リズム',",
   "  'workRhythm.title': '活動リズム',",
   "  'workRhythm.subtitle': '5つの領域のうち、どこに時間を使ったかを子どもごとに表示します。',",
   "  'workRhythm.periodWeek': '今週',",
   "  'workRhythm.periodMonth': '今月',",
   "  'workRhythm.topArea': '最も長かった領域',",
   "  'workRhythm.minutesShort': '{n}分',",
   "  'workRhythm.events': '{n}件',",
   "  'workRhythm.share': '割合',",
   "  'workRhythm.detailNote': 'この分数は、記録用紙に書かれた時間と、確認済みの写真1枚ごとの目安時間を合わせたものです。正確な計測ではなく、その子の一週間のバランスの目安としてご覧ください。',",
   "  'workRhythm.emptyChild': 'まだ記録がありません',",
   "  'workRhythm.emptyClassroomTitle': '表示できるリズムがまだありません',",
   "  'workRhythm.emptyClassroomBody': '活動リズムは2つの情報からつくられます。手書きスキャンで承認した記録と、先生が確認したクラスの写真です。どちらかが入ると、ここにバーが表示されます。',",
   "  'workRhythm.disabledTitle': '活動リズムは有効になっていません',",
   "  'workRhythm.disabledBody': '活動リズムはまだ学校で有効になっていません。',",
   "  'workRhythm.contactAdmin': 'この機能を有効にするには、学校の管理者にご連絡ください。',",
   "  'workRhythm.loadFailed': '活動リズムを読み込めませんでした。',"
  ]
 },
 "ko": {
  "pre": "e43fd6832ca78cb8fd5bb5825bc46c056a13599406f7aecd94922ca96fe15944",
  "post": "dba7726e53d8ab4671e4bd848aeb1f76c843a3ee898ba047db1d714ec1c930af",
  "after": 5615,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': '활동 리듬',",
   "  'workRhythm.title': '활동 리듬',",
   "  'workRhythm.subtitle': '다섯 영역 가운데 아이마다 어디에 시간을 보냈는지 보여 줍니다.',",
   "  'workRhythm.periodWeek': '이번 주',",
   "  'workRhythm.periodMonth': '이번 달',",
   "  'workRhythm.topArea': '가장 오래 머문 영역',",
   "  'workRhythm.minutesShort': '{n}분',",
   "  'workRhythm.events': '{n}회',",
   "  'workRhythm.share': '비율',",
   "  'workRhythm.detailNote': '여기의 분 단위는 종이 기록지에 적힌 시간과 확인된 사진 한 장마다의 추정치를 합한 값입니다. 정확한 측정이 아니라 아이의 한 주 균형을 보는 기준으로 봐 주세요.',",
   "  'workRhythm.emptyChild': '아직 기록이 없습니다',",
   "  'workRhythm.emptyClassroomTitle': '아직 보여 줄 리듬이 없습니다',",
   "  'workRhythm.emptyClassroomBody': '활동 리듬은 두 가지에서 만들어집니다. 종이 스캔에서 승인한 기록과 선생님이 확인한 교실 사진입니다. 둘 중 하나만 들어와도 여기에 막대가 나타납니다.',",
   "  'workRhythm.disabledTitle': '활동 리듬이 활성화되지 않았습니다',",
   "  'workRhythm.disabledBody': '아직 학교에서 활동 리듬을 사용하도록 설정하지 않았습니다.',",
   "  'workRhythm.contactAdmin': '이 기능을 사용하려면 학교 관리자에게 문의하세요.',",
   "  'workRhythm.loadFailed': '활동 리듬을 불러오지 못했습니다.',"
  ]
 },
 "uk": {
  "pre": "461d3a5c06526e8a2cdf0518dc0034c694dc145f6a99ea52be45efb29eb0f995",
  "post": "af09f6aedbc86d0c8dc05f30f30fe0e9efa5e13f96e8b5e0c8654b57d0b2776e",
  "after": 5612,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Ритм роботи',",
   "  'workRhythm.title': 'Ритм роботи',",
   "  'workRhythm.subtitle': 'Де кожна дитина проводила свій час у п\\'яти зонах.',",
   "  'workRhythm.periodWeek': 'Цього тижня',",
   "  'workRhythm.periodMonth': 'Цього місяця',",
   "  'workRhythm.topArea': 'Найбільше часу в',",
   "  'workRhythm.minutesShort': '{n} хв',",
   "  'workRhythm.events': '{n} моментів',",
   "  'workRhythm.share': 'Частка',",
   "  'workRhythm.detailNote': 'Ці хвилини поєднують час, записаний на паперових аркушах спостережень, з оцінкою для кожного підтвердженого фото. Сприймайте їх як баланс тижня дитини, а не як точний вимір.',",
   "  'workRhythm.emptyChild': 'Записів ще немає',",
   "  'workRhythm.emptyClassroomTitle': 'Ритму ще немає',",
   "  'workRhythm.emptyClassroomBody': 'Ритм роботи складається з двох джерел: записів, які ви підтверджуєте у Скануванні паперу, і фотографій класу, які ви підтверджуєте. Щойно з\\'явиться будь-що з цього, тут виникнуть смужки.',",
   "  'workRhythm.disabledTitle': 'Ритм роботи не увімкнено',",
   "  'workRhythm.disabledBody': 'Ритм роботи ще не увімкнено для вашої школи.',",
   "  'workRhythm.contactAdmin': 'Зверніться до адміністратора школи, щоб увімкнути цю функцію.',",
   "  'workRhythm.loadFailed': 'Не вдалося завантажити ритм роботи.',"
  ]
 },
 "ru": {
  "pre": "167533c5c9a0be447158e0dc61954f22c01052b3ba423c86378a722be13dc65f",
  "post": "8b0a3bd66ac4f6b897471f42f4784c69ab7b6d2aad74d86d3c3f1924e22c8df3",
  "after": 5612,
  "block": [
   "  // ── Work Rhythm (per-child area-time bars) ─────────────────────────────",
   "  'workRhythm.menuLabel': 'Ритм работы',",
   "  'workRhythm.title': 'Ритм работы',",
   "  'workRhythm.subtitle': 'Где каждый ребёнок проводил своё время в пяти зонах.',",
   "  'workRhythm.periodWeek': 'На этой неделе',",
   "  'workRhythm.periodMonth': 'В этом месяце',",
   "  'workRhythm.topArea': 'Больше всего времени в',",
   "  'workRhythm.minutesShort': '{n} мин',",
   "  'workRhythm.events': '{n} моментов',",
   "  'workRhythm.share': 'Доля',",
   "  'workRhythm.detailNote': 'Эти минуты объединяют время, записанное на бумажных листах наблюдений, с оценкой по каждой подтверждённой фотографии. Это ориентир для баланса недели ребёнка, а не точное измерение.',",
   "  'workRhythm.emptyChild': 'Записей пока нет',",
   "  'workRhythm.emptyClassroomTitle': 'Ритма пока не видно',",
   "  'workRhythm.emptyClassroomBody': 'Ритм работы складывается из двух источников: записей, которые вы утверждаете в Сканировании бумаги, и фотографий класса, которые вы подтверждаете. Как только появится любое из этого, здесь возникнут полосы.',",
   "  'workRhythm.disabledTitle': 'Ритм работы не включён',",
   "  'workRhythm.disabledBody': 'Ритм работы ещё не включён для вашей школы.',",
   "  'workRhythm.contactAdmin': 'Обратитесь к администратору школы, чтобы включить эту функцию.',",
   "  'workRhythm.loadFailed': 'Не удалось загрузить ритм работы.',"
  ]
 }
};
let fail = 0;
for (const [loc, spec] of Object.entries(DATA)) {
  const path = resolve(I18N_DIR, loc + '.ts');
  const raw = readFileSync(path);
  const h = sha256(raw);
  if (h === spec.post) { console.log(`${loc}: already inserted — OK`); continue; }
  if (h !== spec.pre) { console.error(`${loc}: UNEXPECTED pre-state hash ${h.slice(0,12)} — refusing to touch`); fail++; continue; }
  const lines = raw.toString('utf8').split('\n');
  lines.splice(spec.after, 0, ...spec.block);
  const out = Buffer.from(lines.join('\n'), 'utf8');
  if (sha256(out) !== spec.post) { console.error(`${loc}: post-hash mismatch after insert — NOT writing`); fail++; continue; }
  writeFileSync(path, out);
  console.log(`${loc}: inserted 15 keys — verified ${spec.post.slice(0,12)}`);
}
console.log(fail === 0 ? 'PASS' : `FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
