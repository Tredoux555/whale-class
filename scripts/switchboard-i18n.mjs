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
  "pre": "aef4bff91bd0d850235fadd9c1deb503ef88b37d869ab6520f2ef5a2163939c3",
  "post": "da47fd7fb45ab1341fe06a98353529f17ca67b5e5a400f2af41c41c2906aa812",
  "after": 6068,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'School Features',",
   "  'schoolFeatures.title': 'School Features',",
   "  'schoolFeatures.subtitle': 'Turn tools on or off for your school.',",
   "  'schoolFeatures.appliesToAll': 'Changes apply to every teacher in your school.',",
   "  'schoolFeatures.loading': 'Loading features…',",
   "  'schoolFeatures.loadFailed': 'Could not load your features.',",
   "  'schoolFeatures.empty': 'No features to show yet.',",
   "  'schoolFeatures.lockedTitle': 'School controls are locked',",
   "  'schoolFeatures.lockedBody': 'Ask Montree to unlock school controls, then you can turn tools on and off yourself.',",
   "  'schoolFeatures.enabledToast': '{name} is on',",
   "  'schoolFeatures.disabledToast': '{name} is off',",
   "  'schoolFeatures.toggleFailed': 'Could not save that change.',",
   "  'schoolFeatures.menuUpdated': 'Menus updated for {count} teachers.',",
   "  'schoolFeatures.menuBadge': 'Menu',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "zh": {
  "pre": "1fddba82702d646f0a32ac67f647c4dfaf518a3b9c176fa62768772f7391abd7",
  "post": "f3698101578d756523937b4e268a8f3388b4e5ab25fbb6b4254825b70ee194cb",
  "after": 6009,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': '学校功能',",
   "  'schoolFeatures.title': '学校功能',",
   "  'schoolFeatures.subtitle': '为全校开启或关闭各项工具。',",
   "  'schoolFeatures.appliesToAll': '更改将应用于学校的每一位老师。',",
   "  'schoolFeatures.loading': '正在加载功能…',",
   "  'schoolFeatures.loadFailed': '无法加载学校功能。',",
   "  'schoolFeatures.empty': '暂无可显示的功能。',",
   "  'schoolFeatures.lockedTitle': '学校设置权限未开放',",
   "  'schoolFeatures.lockedBody': '请联系 Montree 开放学校设置权限，之后您就可以自行开启或关闭工具。',",
   "  'schoolFeatures.enabledToast': '{name} 已开启',",
   "  'schoolFeatures.disabledToast': '{name} 已关闭',",
   "  'schoolFeatures.toggleFailed': '无法保存此更改。',",
   "  'schoolFeatures.menuUpdated': '已为 {count} 位老师更新菜单。',",
   "  'schoolFeatures.menuBadge': '菜单',",
   "  'schoolFeatures.premiumBadge': '高级',"
  ]
 },
 "es": {
  "pre": "4921a39cd0f97cbb05594c48c55b727d1ddddad341eba2dd8b8d952947800533",
  "post": "fa3b9c0c11e8a12a4a00d348365fe2b0b8dd7d8bea28cd042ce636ced99f6573",
  "after": 5596,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'Funciones de la escuela',",
   "  'schoolFeatures.title': 'Funciones de la escuela',",
   "  'schoolFeatures.subtitle': 'Activá o desactivá herramientas para toda la escuela.',",
   "  'schoolFeatures.appliesToAll': 'Los cambios se aplican a todos los docentes de la escuela.',",
   "  'schoolFeatures.loading': 'Cargando funciones…',",
   "  'schoolFeatures.loadFailed': 'No se pudieron cargar las funciones.',",
   "  'schoolFeatures.empty': 'Todavía no hay funciones para mostrar.',",
   "  'schoolFeatures.lockedTitle': 'Los controles de la escuela están bloqueados',",
   "  'schoolFeatures.lockedBody': 'Pedile a Montree que desbloquee los controles de la escuela y vas a poder activar o desactivar las herramientas vos mismo.',",
   "  'schoolFeatures.enabledToast': '{name} está activada',",
   "  'schoolFeatures.disabledToast': '{name} está desactivada',",
   "  'schoolFeatures.toggleFailed': 'No se pudo guardar el cambio.',",
   "  'schoolFeatures.menuUpdated': 'Menús actualizados para {count} docentes.',",
   "  'schoolFeatures.menuBadge': 'Menú',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "de": {
  "pre": "c0cb2381147c48e51c84c57260cdb07a6ec19374548124eb049a517857763017",
  "post": "371240e3f6f0580d8d867411f3e28b2f25116061c4f90c2319899d3c1a05641d",
  "after": 5599,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'Schulfunktionen',",
   "  'schoolFeatures.title': 'Schulfunktionen',",
   "  'schoolFeatures.subtitle': 'Schalten Sie Werkzeuge für Ihre Schule ein oder aus.',",
   "  'schoolFeatures.appliesToAll': 'Änderungen gelten für alle Lehrkräfte Ihrer Schule.',",
   "  'schoolFeatures.loading': 'Funktionen werden geladen…',",
   "  'schoolFeatures.loadFailed': 'Die Funktionen konnten nicht geladen werden.',",
   "  'schoolFeatures.empty': 'Noch keine Funktionen vorhanden.',",
   "  'schoolFeatures.lockedTitle': 'Die Schulsteuerung ist gesperrt',",
   "  'schoolFeatures.lockedBody': 'Bitten Sie Montree, die Schulsteuerung freizuschalten — danach können Sie Werkzeuge selbst ein- und ausschalten.',",
   "  'schoolFeatures.enabledToast': '{name} ist eingeschaltet',",
   "  'schoolFeatures.disabledToast': '{name} ist ausgeschaltet',",
   "  'schoolFeatures.toggleFailed': 'Die Änderung konnte nicht gespeichert werden.',",
   "  'schoolFeatures.menuUpdated': 'Menüs für {count} Lehrkräfte aktualisiert.',",
   "  'schoolFeatures.menuBadge': 'Menü',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "fr": {
  "pre": "5efb84ac3cf28a0c275a0c2ab025e2d6423bb9e492b3c0450b4e1fafc6f6fd2e",
  "post": "4bf4252455e150d0f48c80d50df844ab613f7210a4e333433b63b51e7e495f18",
  "after": 5599,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'Fonctionnalités de l’école',",
   "  'schoolFeatures.title': 'Fonctionnalités de l’école',",
   "  'schoolFeatures.subtitle': 'Activez ou désactivez des outils pour toute l’école.',",
   "  'schoolFeatures.appliesToAll': 'Les changements s’appliquent à tous les enseignants de l’école.',",
   "  'schoolFeatures.loading': 'Chargement des fonctionnalités…',",
   "  'schoolFeatures.loadFailed': 'Impossible de charger les fonctionnalités.',",
   "  'schoolFeatures.empty': 'Aucune fonctionnalité à afficher pour l’instant.',",
   "  'schoolFeatures.lockedTitle': 'Les réglages de l’école sont verrouillés',",
   "  'schoolFeatures.lockedBody': 'Demandez à Montree de déverrouiller les réglages de l’école : vous pourrez ensuite activer ou désactiver les outils vous-même.',",
   "  'schoolFeatures.enabledToast': '{name} est activé',",
   "  'schoolFeatures.disabledToast': '{name} est désactivé',",
   "  'schoolFeatures.toggleFailed': 'Impossible d’enregistrer ce changement.',",
   "  'schoolFeatures.menuUpdated': 'Menus mis à jour pour {count} enseignants.',",
   "  'schoolFeatures.menuBadge': 'Menu',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "pt": {
  "pre": "b5956e5512b6a6df236b84aad186e24c0a40139b5f9bc0f1a0676cdb09bcbcd8",
  "post": "9f3e322d461175649002a04610b2517f40d54b224fba0115d74da4cd28e3a1ec",
  "after": 5599,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'Funcionalidades da escola',",
   "  'schoolFeatures.title': 'Funcionalidades da escola',",
   "  'schoolFeatures.subtitle': 'Ative ou desative ferramentas para toda a escola.',",
   "  'schoolFeatures.appliesToAll': 'As alterações se aplicam a todos os professores da escola.',",
   "  'schoolFeatures.loading': 'Carregando funcionalidades…',",
   "  'schoolFeatures.loadFailed': 'Não foi possível carregar as funcionalidades.',",
   "  'schoolFeatures.empty': 'Ainda não há funcionalidades para mostrar.',",
   "  'schoolFeatures.lockedTitle': 'Os controles da escola estão bloqueados',",
   "  'schoolFeatures.lockedBody': 'Peça à Montree para desbloquear os controles da escola; depois você poderá ativar e desativar as ferramentas.',",
   "  'schoolFeatures.enabledToast': '{name} está ativada',",
   "  'schoolFeatures.disabledToast': '{name} está desativada',",
   "  'schoolFeatures.toggleFailed': 'Não foi possível salvar a alteração.',",
   "  'schoolFeatures.menuUpdated': 'Menus atualizados para {count} professores.',",
   "  'schoolFeatures.menuBadge': 'Menu',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "nl": {
  "pre": "ef0a80c09bc5d4a0265e063ba43c5b2091750af29c34cc9605fde8f4685955b5",
  "post": "39a03056abb7649515fcd1cceefff798892eada73da0d99ea3af171ff6c411a4",
  "after": 5599,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'Schoolfuncties',",
   "  'schoolFeatures.title': 'Schoolfuncties',",
   "  'schoolFeatures.subtitle': 'Zet hulpmiddelen aan of uit voor de hele school.',",
   "  'schoolFeatures.appliesToAll': 'Wijzigingen gelden voor alle leerkrachten van de school.',",
   "  'schoolFeatures.loading': 'Functies worden geladen…',",
   "  'schoolFeatures.loadFailed': 'De functies konden niet worden geladen.',",
   "  'schoolFeatures.empty': 'Nog geen functies om te tonen.',",
   "  'schoolFeatures.lockedTitle': 'De schoolinstellingen zijn vergrendeld',",
   "  'schoolFeatures.lockedBody': 'Vraag Montree om de schoolinstellingen te ontgrendelen; daarna kunt u hulpmiddelen zelf aan- of uitzetten.',",
   "  'schoolFeatures.enabledToast': '{name} staat aan',",
   "  'schoolFeatures.disabledToast': '{name} staat uit',",
   "  'schoolFeatures.toggleFailed': 'De wijziging kon niet worden opgeslagen.',",
   "  'schoolFeatures.menuUpdated': 'Menu’s bijgewerkt voor {count} leerkrachten.',",
   "  'schoolFeatures.menuBadge': 'Menu',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "it": {
  "pre": "902ddc248ba2664af56f878b19898bf51f8f5326ddedc94ff4f66f8e99a82f05",
  "post": "325541d6606cf3280fbf67fa6ccdf502a892614fb78c6c5eda2e707ac6740fe7",
  "after": 5599,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'Funzioni della scuola',",
   "  'schoolFeatures.title': 'Funzioni della scuola',",
   "  'schoolFeatures.subtitle': 'Attivi o disattivi gli strumenti per tutta la scuola.',",
   "  'schoolFeatures.appliesToAll': 'Le modifiche valgono per tutti gli insegnanti della scuola.',",
   "  'schoolFeatures.loading': 'Caricamento delle funzioni…',",
   "  'schoolFeatures.loadFailed': 'Impossibile caricare le funzioni.',",
   "  'schoolFeatures.empty': 'Nessuna funzione da mostrare.',",
   "  'schoolFeatures.lockedTitle': 'I controlli della scuola sono bloccati',",
   "  'schoolFeatures.lockedBody': 'Chieda a Montree di sbloccare i controlli della scuola: potrà poi attivare e disattivare gli strumenti da sola.',",
   "  'schoolFeatures.enabledToast': '{name} è attiva',",
   "  'schoolFeatures.disabledToast': '{name} è disattivata',",
   "  'schoolFeatures.toggleFailed': 'Impossibile salvare la modifica.',",
   "  'schoolFeatures.menuUpdated': 'Menu aggiornati per {count} insegnanti.',",
   "  'schoolFeatures.menuBadge': 'Menu',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "ja": {
  "pre": "8bf22ee5e690664fd58fb1762e6d61d2511a73e3e93c6575f5d5abdc896ed9c1",
  "post": "0c312bf09fba30f138151e646b2723fe85fb366860cd9a81d38f35390c8a0bae",
  "after": 5599,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': '学校の機能',",
   "  'schoolFeatures.title': '学校の機能',",
   "  'schoolFeatures.subtitle': '学校全体で使う機能をオン・オフできます。',",
   "  'schoolFeatures.appliesToAll': '変更は学校のすべての先生に適用されます。',",
   "  'schoolFeatures.loading': '機能を読み込んでいます…',",
   "  'schoolFeatures.loadFailed': '機能を読み込めませんでした。',",
   "  'schoolFeatures.empty': '表示できる機能はまだありません。',",
   "  'schoolFeatures.lockedTitle': '学校の設定はロックされています',",
   "  'schoolFeatures.lockedBody': 'Montree に学校の設定の解除をご依頼ください。解除されると、ご自身で機能のオン・オフができます。',",
   "  'schoolFeatures.enabledToast': '{name} をオンにしました',",
   "  'schoolFeatures.disabledToast': '{name} をオフにしました',",
   "  'schoolFeatures.toggleFailed': '変更を保存できませんでした。',",
   "  'schoolFeatures.menuUpdated': '{count} 名の先生のメニューを更新しました。',",
   "  'schoolFeatures.menuBadge': 'メニュー',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "ko": {
  "pre": "adb3521f05a5c35c129142edd03a1ff535ec3ce94f28acd23a422a37c395c593",
  "post": "e43fd6832ca78cb8fd5bb5825bc46c056a13599406f7aecd94922ca96fe15944",
  "after": 5599,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': '학교 기능',",
   "  'schoolFeatures.title': '학교 기능',",
   "  'schoolFeatures.subtitle': '학교 전체에서 사용할 기능을 켜거나 끕니다.',",
   "  'schoolFeatures.appliesToAll': '변경 사항은 학교의 모든 교사에게 적용됩니다.',",
   "  'schoolFeatures.loading': '기능을 불러오는 중…',",
   "  'schoolFeatures.loadFailed': '기능을 불러오지 못했습니다.',",
   "  'schoolFeatures.empty': '표시할 기능이 아직 없습니다.',",
   "  'schoolFeatures.lockedTitle': '학교 설정이 잠겨 있습니다',",
   "  'schoolFeatures.lockedBody': 'Montree에 학교 설정 잠금 해제를 요청하세요. 해제되면 직접 기능을 켜고 끌 수 있습니다.',",
   "  'schoolFeatures.enabledToast': '{name} 켜짐',",
   "  'schoolFeatures.disabledToast': '{name} 꺼짐',",
   "  'schoolFeatures.toggleFailed': '변경 사항을 저장하지 못했습니다.',",
   "  'schoolFeatures.menuUpdated': '교사 {count}명의 메뉴가 업데이트되었습니다.',",
   "  'schoolFeatures.menuBadge': '메뉴',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "uk": {
  "pre": "266e7b1a2e513e2470b0ef0f2838c366c9c9b6cad02c02cb8869a2c45304d02b",
  "post": "461d3a5c06526e8a2cdf0518dc0034c694dc145f6a99ea52be45efb29eb0f995",
  "after": 5596,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'Функції школи',",
   "  'schoolFeatures.title': 'Функції школи',",
   "  'schoolFeatures.subtitle': 'Вмикайте та вимикайте інструменти для всієї школи.',",
   "  'schoolFeatures.appliesToAll': 'Зміни діють для всіх педагогів школи.',",
   "  'schoolFeatures.loading': 'Завантаження функцій…',",
   "  'schoolFeatures.loadFailed': 'Не вдалося завантажити функції.',",
   "  'schoolFeatures.empty': 'Поки немає функцій для показу.',",
   "  'schoolFeatures.lockedTitle': 'Налаштування школи закриті',",
   "  'schoolFeatures.lockedBody': 'Попросіть Montree відкрити налаштування школи — після цього ви зможете самі вмикати й вимикати інструменти.',",
   "  'schoolFeatures.enabledToast': '{name} увімкнено',",
   "  'schoolFeatures.disabledToast': '{name} вимкнено',",
   "  'schoolFeatures.toggleFailed': 'Не вдалося зберегти зміну.',",
   "  'schoolFeatures.menuUpdated': 'Меню оновлено для {count} педагогів.',",
   "  'schoolFeatures.menuBadge': 'Меню',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
  ]
 },
 "ru": {
  "pre": "57d4751a062f63e8e8873d086ede2b27d847afee1a6f7a5015d19005649aca53",
  "post": "167533c5c9a0be447158e0dc61954f22c01052b3ba423c86378a722be13dc65f",
  "after": 5596,
  "block": [
   "  // ── School Features (self-serve Feature Switchboard) ──────────────────",
   "  'schoolFeatures.menuLabel': 'Функции школы',",
   "  'schoolFeatures.title': 'Функции школы',",
   "  'schoolFeatures.subtitle': 'Включайте и выключайте инструменты для всей школы.',",
   "  'schoolFeatures.appliesToAll': 'Изменения действуют для всех педагогов школы.',",
   "  'schoolFeatures.loading': 'Загрузка функций…',",
   "  'schoolFeatures.loadFailed': 'Не удалось загрузить функции.',",
   "  'schoolFeatures.empty': 'Пока нет функций для отображения.',",
   "  'schoolFeatures.lockedTitle': 'Настройки школы закрыты',",
   "  'schoolFeatures.lockedBody': 'Попросите Montree открыть настройки школы — после этого вы сможете сами включать и выключать инструменты.',",
   "  'schoolFeatures.enabledToast': '{name} включено',",
   "  'schoolFeatures.disabledToast': '{name} выключено',",
   "  'schoolFeatures.toggleFailed': 'Не удалось сохранить изменение.',",
   "  'schoolFeatures.menuUpdated': 'Меню обновлены для {count} педагогов.',",
   "  'schoolFeatures.menuBadge': 'Меню',",
   "  'schoolFeatures.premiumBadge': 'PRO',"
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
