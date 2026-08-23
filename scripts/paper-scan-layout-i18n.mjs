#!/usr/bin/env node
// paper-scan-layout-i18n.mjs — inserts the Paper Scan Layer-1 / 336 keys
// (paperScan.layout.* and paperScan.fields.*, 40 keys) into all 12 Montree
// locale files, directly after the Paper Scan block ('paperScan.progressFailed').
// Idempotent: skips a file that already has the keys.
// Run: node scripts/paper-scan-layout-i18n.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(HERE, '..', 'lib', 'montree', 'i18n');

const KEYS = [
  'fields.frequency','fields.timeBucket','fields.bucketShort','fields.bucketMedium','fields.bucketLong',
  'fields.concentration','fields.concentrationHint','fields.minutesHint','fields.needsArea',
  'doneSessions','areaWarnings',
  'layout.title','layout.intro','layout.privacyNote','layout.namePlaceholder','layout.notesPlaceholder',
  'layout.choosePhotos','layout.photosChosen','layout.learn','layout.learning','layout.learned','layout.learnFailed',
  'layout.activate','layout.activating','layout.activateFailed','layout.retire',
  'layout.activeBadge','layout.draftBadge','layout.retiredBadge','layout.builtinBadge',
  'layout.noneActive','layout.activeNow',
  'layout.statusMarks','layout.timeMarks','layout.tally','layout.concentrationCodes',
  'layout.readingInstructions','layout.pitfalls','layout.columns','layout.showDetails',
];

const T = {};
T.en = ['Times','How long','under 15m','15–30m','30m+','Focus','wd = distracted · WC = concentrated · DC = deep concentration','Only when the sheet gives a written time.','No area yet — set one so this counts in reports.','{sessions} work sessions recorded','{count} records had no area — they were saved to the child but stay out of the area reports.',
  'Sheet layouts','Photograph your own record sheet once (1–3 photos). Montree learns where everything lives and reads every later scan of that sheet far better.','Teaching photos are kept so you can check what was learned — use a blank sheet where you can.','Name this sheet (optional)','Anything Montree should know about your marks (optional)',
  'Choose photos','{count} selected','Teach Montree this sheet','Reading your sheet…','Learned. Check it, then start using it.','Could not read that sheet. Try clearer, straight-on photos.',
  'Use this sheet','Switching…','Could not change the sheet in use.','Stop using',
  'In use','Draft','Not in use','Built in',
  'No sheet taught yet — scans are read on their own terms.','Reading with: {name}',
  'Status marks','Time marks','Tally','Focus codes','How Montree will read it','Watch out for','{count} columns','Details'];
T.zh = ['次数','时长','15分钟内','15–30分钟','30分钟以上','专注度','wd = 分心 · WC = 专注 · DC = 深度专注','仅当记录表上写有具体时间时填写。','尚未选择领域 — 选定后才会计入报告。','已记录 {sessions} 次工作','{count} 条记录没有领域 — 已保存到孩子档案，但不会出现在领域报告中。',
  '记录表版式','给您自己的记录表拍 1–3 张照片。Montree 学会它的版式后，之后的扫描会读得更准。','教学照片会保留，方便您核对学习结果 — 尽量使用空白记录表。','为这张表命名（可选）','关于您的标记，还有什么需要告诉 Montree 的（可选）',
  '选择照片','已选 {count} 张','让 Montree 学习这张表','正在读取您的记录表…','已学会。请核对后启用。','无法读取这张表。请拍摄更清晰、正对的照片。',
  '使用这张表','切换中…','无法切换正在使用的记录表。','停止使用',
  '使用中','草稿','未使用','内置',
  '尚未教过任何表 — 扫描将按页面本身来读取。','正在使用：{name}',
  '状态标记','时长标记','计次','专注度代码','Montree 将如何读取','注意事项','{count} 列','详情'];
T.es = ['Veces','Duración','menos de 15 min','15–30 min','30+ min','Concentración','wd = distraído · WC = concentrado · DC = concentración profunda','Solo si la hoja indica un tiempo escrito.','Sin área — asígnala para que cuente en los informes.','{sessions} sesiones de trabajo registradas','{count} registros sin área: se guardaron en la ficha del niño, pero no aparecen en los informes por área.',
  'Formatos de hoja','Fotografía tu propia hoja de registro una vez (1–3 fotos). Montree aprende dónde está cada cosa y lee mucho mejor los escaneos posteriores.','Las fotos de enseñanza se conservan para que puedas comprobar lo aprendido: usa una hoja en blanco si puedes.','Nombra esta hoja (opcional)','Algo que Montree deba saber sobre tus marcas (opcional)',
  'Elegir fotos','{count} seleccionadas','Enseñar esta hoja a Montree','Leyendo tu hoja…','Aprendida. Compruébala y empieza a usarla.','No se pudo leer esa hoja. Prueba con fotos más nítidas y de frente.',
  'Usar esta hoja','Cambiando…','No se pudo cambiar la hoja en uso.','Dejar de usar',
  'En uso','Borrador','Sin usar','Integrada',
  'Aún no has enseñado ninguna hoja: los escaneos se leen tal cual.','Leyendo con: {name}',
  'Marcas de estado','Marcas de tiempo','Conteo','Códigos de concentración','Cómo la leerá Montree','Ten en cuenta','{count} columnas','Detalles'];
T.de = ['Anzahl','Dauer','unter 15 Min.','15–30 Min.','30+ Min.','Konzentration','wd = abgelenkt · WC = konzentriert · DC = tiefe Konzentration','Nur wenn auf dem Bogen eine Zeit steht.','Noch kein Bereich – bitte zuweisen, sonst fehlt es in den Berichten.','{sessions} Arbeitsphasen erfasst','{count} Einträge ohne Bereich – beim Kind gespeichert, aber nicht in den Bereichsberichten.',
  'Bogen-Layouts','Fotografieren Sie Ihren eigenen Beobachtungsbogen einmal (1–3 Fotos). Montree lernt seinen Aufbau und liest jeden späteren Scan deutlich besser.','Die Lernfotos bleiben gespeichert, damit Sie das Ergebnis prüfen können – nutzen Sie möglichst einen leeren Bogen.','Bogen benennen (optional)','Was Montree über Ihre Zeichen wissen sollte (optional)',
  'Fotos wählen','{count} ausgewählt','Montree diesen Bogen beibringen','Bogen wird gelesen…','Gelernt. Prüfen und dann verwenden.','Dieser Bogen war nicht lesbar. Bitte schärfere, gerade Fotos versuchen.',
  'Diesen Bogen verwenden','Wird umgestellt…','Der verwendete Bogen konnte nicht geändert werden.','Nicht mehr verwenden',
  'In Verwendung','Entwurf','Nicht in Verwendung','Eingebaut',
  'Noch kein Bogen gelernt – Scans werden so gelesen, wie sie sind.','Gelesen mit: {name}',
  'Status-Zeichen','Zeit-Zeichen','Strichliste','Konzentrations-Codes','So wird Montree ihn lesen','Achten Sie auf','{count} Spalten','Details'];
T.fr = ['Fois','Durée','moins de 15 min','15–30 min','30+ min','Concentration','wd = distrait · WC = concentré · DC = concentration profonde','Uniquement si la fiche indique une durée écrite.','Domaine manquant — indiquez-le pour qu\'il compte dans les rapports.','{sessions} séances de travail enregistrées','{count} enregistrements sans domaine : sauvegardés sur l\'enfant, mais absents des rapports par domaine.',
  'Modèles de fiche','Photographiez votre propre fiche d\'observation une fois (1 à 3 photos). Montree apprend où tout se trouve et lit bien mieux les scans suivants.','Les photos d\'apprentissage sont conservées pour que vous puissiez vérifier — utilisez une fiche vierge si possible.','Nommer cette fiche (facultatif)','Ce que Montree doit savoir sur vos symboles (facultatif)',
  'Choisir des photos','{count} sélectionnées','Apprendre cette fiche à Montree','Lecture de votre fiche…','Apprise. Vérifiez, puis utilisez-la.','Impossible de lire cette fiche. Essayez des photos nettes et de face.',
  'Utiliser cette fiche','Changement…','Impossible de changer la fiche utilisée.','Ne plus utiliser',
  'Utilisée','Brouillon','Non utilisée','Intégrée',
  'Aucune fiche apprise — les scans sont lus tels quels.','Lecture avec : {name}',
  'Symboles de statut','Symboles de durée','Comptage','Codes de concentration','Comment Montree la lira','À surveiller','{count} colonnes','Détails'];
T.pt = ['Vezes','Duração','menos de 15 min','15–30 min','30+ min','Concentração','wd = distraído · WC = concentrado · DC = concentração profunda','Apenas quando a folha indica um tempo escrito.','Sem área — defina uma para contar nos relatórios.','{sessions} sessões de trabalho registadas','{count} registos sem área: foram guardados na criança, mas ficam fora dos relatórios por área.',
  'Formatos de folha','Fotografe a sua própria folha de registo uma vez (1–3 fotos). O Montree aprende onde está tudo e lê muito melhor as digitalizações seguintes.','As fotos de ensino são mantidas para poder verificar o que foi aprendido — use uma folha em branco sempre que possível.','Dê um nome a esta folha (opcional)','Algo que o Montree deva saber sobre as suas marcas (opcional)',
  'Escolher fotos','{count} selecionadas','Ensinar esta folha ao Montree','A ler a sua folha…','Aprendida. Verifique e comece a usar.','Não foi possível ler essa folha. Tente fotos mais nítidas e de frente.',
  'Usar esta folha','A mudar…','Não foi possível mudar a folha em uso.','Deixar de usar',
  'Em uso','Rascunho','Sem uso','Incorporada',
  'Ainda não ensinou nenhuma folha — as digitalizações são lidas tal como estão.','A ler com: {name}',
  'Marcas de estado','Marcas de tempo','Contagem','Códigos de concentração','Como o Montree a vai ler','Atenção a','{count} colunas','Detalhes'];
T.nl = ['Keren','Duur','onder 15 min','15–30 min','30+ min','Concentratie','wd = afgeleid · WC = geconcentreerd · DC = diepe concentratie','Alleen als op het blad een tijd staat.','Nog geen gebied — kies er een, anders telt het niet mee in rapporten.','{sessions} werkmomenten vastgelegd','{count} registraties zonder gebied: bewaard bij het kind, maar niet zichtbaar in de gebiedsrapporten.',
  'Bladindelingen','Fotografeer uw eigen observatieblad één keer (1–3 foto\'s). Montree leert waar alles staat en leest elke volgende scan veel beter.','De leerfoto\'s blijven bewaard zodat u kunt controleren wat er geleerd is — gebruik zo mogelijk een leeg blad.','Geef dit blad een naam (optioneel)','Wat Montree over uw tekens moet weten (optioneel)',
  'Foto\'s kiezen','{count} gekozen','Montree dit blad leren','Uw blad wordt gelezen…','Geleerd. Controleer het en neem het in gebruik.','Dit blad kon niet gelezen worden. Probeer scherpere, rechte foto\'s.',
  'Dit blad gebruiken','Bezig met wisselen…','Het gebruikte blad kon niet gewijzigd worden.','Niet meer gebruiken',
  'In gebruik','Concept','Niet in gebruik','Ingebouwd',
  'Nog geen blad geleerd — scans worden gelezen zoals ze zijn.','Wordt gelezen met: {name}',
  'Statustekens','Tijdtekens','Turven','Concentratiecodes','Hoe Montree het leest','Let op','{count} kolommen','Details'];
T.it = ['Volte','Durata','meno di 15 min','15–30 min','30+ min','Concentrazione','wd = distratto · WC = concentrato · DC = concentrazione profonda','Solo se la scheda riporta un tempo scritto.','Area mancante — assegnala perché conti nei report.','{sessions} sessioni di lavoro registrate','{count} registrazioni senza area: salvate sul bambino, ma escluse dai report per area.',
  'Formati di scheda','Fotografa una volta la tua scheda di osservazione (1–3 foto). Montree impara dov\'è ogni cosa e legge molto meglio le scansioni successive.','Le foto di apprendimento restano salvate per poter verificare — usa una scheda vuota quando puoi.','Dai un nome a questa scheda (facoltativo)','Cosa deve sapere Montree sui tuoi segni (facoltativo)',
  'Scegli le foto','{count} selezionate','Insegna questa scheda a Montree','Sto leggendo la scheda…','Imparata. Controlla e poi usala.','Non è stato possibile leggere la scheda. Prova foto più nitide e frontali.',
  'Usa questa scheda','Cambio in corso…','Non è stato possibile cambiare la scheda in uso.','Smetti di usarla',
  'In uso','Bozza','Non in uso','Integrata',
  'Nessuna scheda insegnata — le scansioni vengono lette così come sono.','Lettura con: {name}',
  'Segni di stato','Segni di durata','Conteggio','Codici di concentrazione','Come la leggerà Montree','Attenzione a','{count} colonne','Dettagli'];
T.ja = ['回数','長さ','15分未満','15〜30分','30分以上','集中度','wd = 気が散る · WC = 集中 · DC = 深い集中','シートに時間が書かれている場合のみ。','領域が未設定です — 設定するとレポートに反映されます。','{sessions} 件のワークを記録しました','{count} 件は領域が不明です。子どもの記録には残りますが、領域別レポートには表示されません。',
  'シートの書式','ご自身の記録シートを一度撮影してください（1〜3枚）。Montree が書式を学び、以降のスキャンをより正確に読み取ります。','学習用の写真は確認のため保存されます。できるだけ未記入のシートをお使いください。','このシートの名前（任意）','記号について Montree に伝えたいこと（任意）',
  '写真を選ぶ','{count} 枚を選択','このシートを Montree に教える','シートを読み取り中…','学習しました。確認して使い始めてください。','このシートを読み取れませんでした。正面から鮮明に撮影してください。',
  'このシートを使う','切り替え中…','使用するシートを変更できませんでした。','使用をやめる',
  '使用中','下書き','未使用','標準搭載',
  'まだシートを教えていません — スキャンはそのまま読み取られます。','使用中の書式：{name}',
  '状態の記号','時間の記号','回数（正の字）','集中度コード','Montree の読み取り方','注意点','{count} 列','詳細'];
T.ko = ['횟수','시간','15분 미만','15~30분','30분 이상','집중도','wd = 산만 · WC = 집중 · DC = 깊은 집중','기록지에 시간이 적혀 있을 때만 입력하세요.','영역이 없습니다 — 지정해야 보고서에 반영됩니다.','활동 {sessions}건 기록됨','{count}건은 영역이 없어 아이 기록에는 저장되었지만 영역별 보고서에는 나오지 않습니다.',
  '기록지 서식','선생님의 기록지를 한 번 촬영하세요(1~3장). Montree가 서식을 배우면 이후 스캔을 훨씬 정확히 읽습니다.','학습용 사진은 확인을 위해 보관됩니다 — 가능하면 빈 기록지를 사용하세요.','이 기록지 이름 (선택)','표시에 대해 Montree가 알아야 할 내용 (선택)',
  '사진 선택','{count}장 선택됨','이 기록지를 Montree에 가르치기','기록지를 읽는 중…','학습했습니다. 확인 후 사용하세요.','이 기록지를 읽지 못했습니다. 더 선명하게 정면에서 촬영해 보세요.',
  '이 기록지 사용','변경 중…','사용 중인 기록지를 변경하지 못했습니다.','사용 중지',
  '사용 중','초안','사용 안 함','기본 제공',
  '아직 가르친 기록지가 없습니다 — 스캔은 그대로 읽습니다.','사용 중: {name}',
  '상태 표시','시간 표시','횟수 표시','집중도 코드','Montree가 읽는 방법','주의할 점','{count}개 열','자세히'];
T.uk = ['Разів','Тривалість','до 15 хв','15–30 хв','30+ хв','Зосередженість','wd = відволікається · WC = зосереджено · DC = глибока зосередженість','Лише коли на аркуші вказано час.','Немає сфери — вкажіть її, щоб запис потрапив у звіти.','Записано сесій: {sessions}','{count} записів без сфери: збережено дитині, але у звітах за сферами вони не з\'являться.',
  'Шаблони аркушів','Сфотографуйте свій аркуш спостережень один раз (1–3 фото). Montree вивчить його будову і читатиме наступні скани значно краще.','Навчальні фото зберігаються, щоб ви могли перевірити результат — за можливості використайте порожній аркуш.','Назва аркуша (необов\'язково)','Що Montree варто знати про ваші позначки (необов\'язково)',
  'Вибрати фото','Вибрано: {count}','Навчити Montree цього аркуша','Читаємо ваш аркуш…','Вивчено. Перевірте і почніть використовувати.','Не вдалося прочитати цей аркуш. Спробуйте чіткіші фото прямо згори.',
  'Використовувати цей аркуш','Перемикаємо…','Не вдалося змінити аркуш, який використовується.','Не використовувати',
  'Використовується','Чернетка','Не використовується','Вбудований',
  'Жодного аркуша ще не навчено — скани читаються як є.','Читаємо з: {name}',
  'Позначки статусу','Позначки часу','Підрахунок','Коди зосередженості','Як Montree його читатиме','Зверніть увагу','Стовпців: {count}','Деталі'];
T.ru = ['Раз','Длительность','до 15 мин','15–30 мин','30+ мин','Концентрация','wd = отвлекается · WC = сосредоточенно · DC = глубокая концентрация','Только если на листе написано время.','Область не указана — укажите, чтобы запись попала в отчёты.','Записано сессий: {sessions}','{count} записей без области: сохранены ребёнку, но в отчёты по областям не попадут.',
  'Шаблоны листов','Сфотографируйте свой лист наблюдений один раз (1–3 фото). Montree выучит его устройство и будет читать последующие сканы намного точнее.','Обучающие фото сохраняются, чтобы вы могли проверить результат — по возможности используйте пустой лист.','Название листа (необязательно)','Что Montree стоит знать о ваших пометках (необязательно)',
  'Выбрать фото','Выбрано: {count}','Научить Montree этому листу','Читаем ваш лист…','Выучено. Проверьте и начните использовать.','Не удалось прочитать этот лист. Попробуйте более чёткие фото прямо сверху.',
  'Использовать этот лист','Переключаем…','Не удалось сменить используемый лист.','Не использовать',
  'Используется','Черновик','Не используется','Встроенный',
  'Пока ни один лист не выучен — сканы читаются как есть.','Читаем с: {name}',
  'Отметки статуса','Отметки времени','Подсчёт','Коды концентрации','Как Montree его прочитает','Обратите внимание','Столбцов: {count}','Подробности'];

const q = (s) => `'${s.replace(/'/g, "\\'")}'`;
let changed = 0;
for (const [loc, vals] of Object.entries(T)) {
  if (vals.length !== KEYS.length) throw new Error(`${loc}: ${vals.length} values for ${KEYS.length} keys`);
  const file = resolve(I18N_DIR, `${loc}.ts`);
  let src = readFileSync(file, 'utf8');
  if (src.includes("'paperScan.layout.title'")) { console.log(`${loc}: already present`); continue; }
  const anchor = /^  'paperScan\.progressFailed': .*\n/m;
  if (!anchor.test(src)) throw new Error(`${loc}: no paperScan.progressFailed anchor`);
  const block = [
    '',
    '  // ── Paper Scan · sheet layouts + frequency/time fields (336) ──────────',
    ...KEYS.map((k, i) => `  'paperScan.${k}': ${q(vals[i])},`),
  ].join('\n') + '\n';
  src = src.replace(anchor, (m) => m + block);
  writeFileSync(file, src);
  changed++;
  console.log(`${loc}: inserted ${KEYS.length} keys`);
}
console.log(`done — ${changed} files changed`);
