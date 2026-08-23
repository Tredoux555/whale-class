#!/usr/bin/env node
// period-report-i18n.mjs — inserts the periodReport.* section (39 keys) into all
// 12 Montree locale files, directly after the Work Rhythm block
// ('workRhythm.loadFailed'). Idempotent: skips a file that already has the keys.
// Run: node scripts/period-report-i18n.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = resolve(HERE, '..', 'lib', 'montree', 'i18n');

const KEYS = [
  'menuLabel','title','weeklyReport','monthlyReport','week','month','prevPeriod','nextPeriod','refresh','print',
  'totalSessions','masteredThisPeriod','childrenActive','nowhere','gaps','child','total','sessions','minutesShort',
  'noSessions','notes','concentration','statusPresented','statusPracticing','statusMastered',
  'aiGenerate','aiShow','aiHide','aiRegenerate','aiWorking','aiFailed',
  'warnings','emptyTitle','emptyBody','estimateNote',
  'disabledTitle','disabledBody','contactAdmin','loadFailed',
];

const T = {
en: ['Weekly & Monthly Report','Weekly & Monthly Report','Weekly Report','Monthly Report','Week','Month','Previous period','Next period','Recalculate','Print',
  'Sessions','Mastered this period','Children active','{n} nowhere this period','{n} with an untouched area','Child','Total','{n} sessions','{n} min',
  'No sessions','{n} notes','Concentration','presented','practicing','mastered',
  'Add AI lines','Show AI lines','Hide AI lines','Regenerate','Writing…','Could not write the AI lines.',
  '{n} data notes','Nothing to report yet','This report builds from the record sheets you scan and approve in Paper Scan. Scan this period\'s sheets and the heatmap and cards appear here.','Minutes are estimates from the time circles on the record sheet — read them as balance, not measurement.',
  'Weekly & Monthly Report is not enabled','Weekly & Monthly Report has not been turned on for your school yet.','Contact your school administrator to enable this feature.','Could not load the report.'],
zh: ['周报与月报','周报与月报','周报','月报','周','月','上一时段','下一时段','重新计算','打印',
  '工作次数','本时段已掌握','活跃孩子','{n} 位本时段无记录','{n} 位有未涉及的领域','孩子','合计','{n} 次','{n} 分钟',
  '无记录','{n} 条备注','专注度','已示范','练习中','已掌握',
  '生成 AI 一句话','显示 AI 一句话','隐藏 AI 一句话','重新生成','生成中…','无法生成 AI 一句话。',
  '{n} 条数据提示','暂无可报告内容','本报告来自您在纸质扫描中扫描并审核通过的记录表。扫描本时段的记录表后，热力图和卡片就会出现在这里。','分钟数根据记录表上的时长圆圈估算，反映的是分布平衡，并非精确测量。',
  '周报与月报未启用','您的学校尚未启用周报与月报。','请联系学校管理员启用此功能。','无法加载报告。'],
es: ['Informe semanal y mensual','Informe semanal y mensual','Informe semanal','Informe mensual','Semana','Mes','Periodo anterior','Periodo siguiente','Recalcular','Imprimir',
  'Sesiones','Dominados en este periodo','Niños activos','{n} sin registros en este periodo','{n} con un área sin tocar','Niño','Total','{n} sesiones','{n} min',
  'Sin sesiones','{n} notas','Concentración','presentado','practicando','dominado',
  'Añadir líneas de IA','Mostrar líneas de IA','Ocultar líneas de IA','Regenerar','Escribiendo…','No se pudieron escribir las líneas de IA.',
  '{n} avisos de datos','Aún no hay nada que informar','Este informe se construye a partir de las hojas de registro que escaneas y apruebas en Escaneo de Papel. Escanea las hojas de este periodo y el mapa de calor y las tarjetas aparecerán aquí.','Los minutos son estimaciones a partir de los círculos de tiempo de la hoja de registro: léelos como equilibrio, no como medición.',
  'El informe semanal y mensual no está activado','El informe semanal y mensual aún no se ha activado para tu escuela.','Contacta con la administración de tu escuela para activar esta función.','No se pudo cargar el informe.'],
de: ['Wochen- & Monatsbericht','Wochen- & Monatsbericht','Wochenbericht','Monatsbericht','Woche','Monat','Vorheriger Zeitraum','Nächster Zeitraum','Neu berechnen','Drucken',
  'Arbeitsphasen','In diesem Zeitraum gemeistert','Aktive Kinder','{n} ohne Eintrag in diesem Zeitraum','{n} mit einem unberührten Bereich','Kind','Gesamt','{n} Arbeitsphasen','{n} Min.',
  'Keine Arbeitsphasen','{n} Notizen','Konzentration','vorgestellt','übt','gemeistert',
  'KI-Zeilen hinzufügen','KI-Zeilen anzeigen','KI-Zeilen ausblenden','Neu erstellen','Schreibt…','Die KI-Zeilen konnten nicht erstellt werden.',
  '{n} Datenhinweise','Noch nichts zu berichten','Dieser Bericht entsteht aus den Beobachtungsbögen, die Sie im Papier-Scan scannen und freigeben. Scannen Sie die Bögen dieses Zeitraums, dann erscheinen Heatmap und Karten hier.','Die Minuten sind Schätzungen aus den Zeitkreisen des Beobachtungsbogens – als Balance lesen, nicht als Messung.',
  'Wochen- & Monatsbericht ist nicht aktiviert','Der Wochen- & Monatsbericht wurde für Ihre Schule noch nicht aktiviert.','Wenden Sie sich an Ihre Schulleitung, um diese Funktion zu aktivieren.','Der Bericht konnte nicht geladen werden.'],
fr: ['Rapport hebdomadaire et mensuel','Rapport hebdomadaire et mensuel','Rapport hebdomadaire','Rapport mensuel','Semaine','Mois','Période précédente','Période suivante','Recalculer','Imprimer',
  'Séances','Maîtrisés cette période','Enfants actifs','{n} sans trace cette période','{n} avec un domaine non abordé','Enfant','Total','{n} séances','{n} min',
  'Aucune séance','{n} notes','Concentration','présenté','en pratique','maîtrisé',
  'Ajouter les lignes IA','Afficher les lignes IA','Masquer les lignes IA','Régénérer','Rédaction…','Impossible de rédiger les lignes IA.',
  '{n} remarques sur les données','Rien à signaler pour l\'instant','Ce rapport se construit à partir des fiches d\'observation que vous scannez et validez dans Scan Papier. Scannez les fiches de cette période et la carte de chaleur et les fiches enfants apparaîtront ici.','Les minutes sont des estimations issues des cercles de temps de la fiche : lisez-les comme un équilibre, non comme une mesure.',
  'Le rapport hebdomadaire et mensuel n\'est pas activé','Le rapport hebdomadaire et mensuel n\'a pas encore été activé pour votre école.','Contactez l\'administration de votre école pour activer cette fonctionnalité.','Impossible de charger le rapport.'],
pt: ['Relatório semanal e mensal','Relatório semanal e mensal','Relatório semanal','Relatório mensal','Semana','Mês','Período anterior','Próximo período','Recalcular','Imprimir',
  'Sessões','Dominados neste período','Crianças ativas','{n} sem registo neste período','{n} com uma área por tocar','Criança','Total','{n} sessões','{n} min',
  'Sem sessões','{n} notas','Concentração','apresentado','a praticar','dominado',
  'Adicionar linhas de IA','Mostrar linhas de IA','Ocultar linhas de IA','Gerar de novo','A escrever…','Não foi possível escrever as linhas de IA.',
  '{n} avisos de dados','Ainda não há nada a relatar','Este relatório é construído a partir das folhas de registo que digitaliza e aprova no Scan de Papel. Digitalize as folhas deste período e o mapa de calor e os cartões aparecem aqui.','Os minutos são estimativas a partir dos círculos de tempo da folha de registo — leia-os como equilíbrio, não como medição.',
  'O relatório semanal e mensal não está ativado','O relatório semanal e mensal ainda não foi ativado para a sua escola.','Contacte a administração da sua escola para ativar esta funcionalidade.','Não foi possível carregar o relatório.'],
nl: ['Week- & maandrapport','Week- & maandrapport','Weekrapport','Maandrapport','Week','Maand','Vorige periode','Volgende periode','Opnieuw berekenen','Afdrukken',
  'Werkmomenten','Beheerst in deze periode','Actieve kinderen','{n} zonder registratie in deze periode','{n} met een onaangeroerd gebied','Kind','Totaal','{n} werkmomenten','{n} min',
  'Geen werkmomenten','{n} notities','Concentratie','aangeboden','oefent','beheerst',
  'AI-regels toevoegen','AI-regels tonen','AI-regels verbergen','Opnieuw maken','Bezig…','De AI-regels konden niet worden gemaakt.',
  '{n} data-opmerkingen','Nog niets te rapporteren','Dit rapport wordt opgebouwd uit de observatiebladen die u scant en goedkeurt in Papier Scan. Scan de bladen van deze periode en de heatmap en kaarten verschijnen hier.','Minuten zijn schattingen op basis van de tijdcirkels op het observatieblad — lees ze als balans, niet als meting.',
  'Week- & maandrapport is niet ingeschakeld','Het week- & maandrapport is nog niet ingeschakeld voor uw school.','Neem contact op met de schooladministratie om deze functie in te schakelen.','Het rapport kon niet worden geladen.'],
it: ['Report settimanale e mensile','Report settimanale e mensile','Report settimanale','Report mensile','Settimana','Mese','Periodo precedente','Periodo successivo','Ricalcola','Stampa',
  'Sessioni','Padroneggiati in questo periodo','Bambini attivi','{n} senza registrazioni in questo periodo','{n} con un\'area non toccata','Bambino','Totale','{n} sessioni','{n} min',
  'Nessuna sessione','{n} note','Concentrazione','presentato','in pratica','padroneggiato',
  'Aggiungi righe IA','Mostra righe IA','Nascondi righe IA','Rigenera','Scrittura…','Impossibile scrivere le righe IA.',
  '{n} note sui dati','Ancora niente da riportare','Questo report si costruisce dalle schede di osservazione che scansioni e approvi in Scansione Carta. Scansiona le schede di questo periodo e la mappa di calore e le schede appariranno qui.','I minuti sono stime ricavate dai cerchi del tempo sulla scheda: leggili come equilibrio, non come misura.',
  'Il report settimanale e mensile non è attivo','Il report settimanale e mensile non è ancora stato attivato per la tua scuola.','Contatta l\'amministrazione della scuola per attivare questa funzione.','Impossibile caricare il report.'],
ja: ['週報・月報','週報・月報','週報','月報','週','月','前の期間','次の期間','再計算','印刷',
  'ワーク回数','この期間に習得','活動した子ども','{n} 人はこの期間に記録なし','{n} 人に未着手の領域あり','子ども','合計','{n} 回','{n} 分',
  '記録なし','{n} 件のメモ','集中度','提示済み','練習中','習得済み',
  'AI の一言を追加','AI の一言を表示','AI の一言を隠す','再生成','作成中…','AI の一言を作成できませんでした。',
  '{n} 件のデータ注記','まだ報告する内容がありません','このレポートは、紙スキャンでスキャンして承認した記録シートから作成されます。この期間のシートをスキャンすると、ヒートマップとカードがここに表示されます。','分数は記録シートの時間の丸印からの推定値です。正確な測定ではなく、バランスとして読んでください。',
  '週報・月報は有効になっていません','週報・月報はまだ学校で有効になっていません。','この機能を有効にするには学校の管理者にご連絡ください。','レポートを読み込めませんでした。'],
ko: ['주간·월간 보고서','주간·월간 보고서','주간 보고서','월간 보고서','주','월','이전 기간','다음 기간','다시 계산','인쇄',
  '활동 횟수','이번 기간 숙달','활동한 아이','{n}명은 이번 기간 기록 없음','{n}명은 다루지 않은 영역 있음','아이','합계','{n}회','{n}분',
  '기록 없음','메모 {n}개','집중도','제시됨','연습 중','숙달',
  'AI 한 줄 추가','AI 한 줄 보기','AI 한 줄 숨기기','다시 생성','작성 중…','AI 한 줄을 작성하지 못했습니다.',
  '데이터 참고 {n}건','아직 보고할 내용이 없습니다','이 보고서는 종이 스캔에서 스캔하고 승인한 기록지로 만들어집니다. 이번 기간의 기록지를 스캔하면 히트맵과 카드가 여기에 표시됩니다.','분 단위는 기록지의 시간 동그라미에서 추정한 값입니다. 정확한 측정이 아니라 균형으로 읽어 주세요.',
  '주간·월간 보고서가 활성화되지 않았습니다','학교에서 아직 주간·월간 보고서를 활성화하지 않았습니다.','이 기능을 활성화하려면 학교 관리자에게 문의하세요.','보고서를 불러오지 못했습니다.'],
uk: ['Тижневий і місячний звіт','Тижневий і місячний звіт','Тижневий звіт','Місячний звіт','Тиждень','Місяць','Попередній період','Наступний період','Перерахувати','Друк',
  'Сесії','Опановано за цей період','Активних дітей','{n} без записів за цей період','{n} з неохопленою сферою','Дитина','Разом','{n} сесій','{n} хв',
  'Немає сесій','{n} нотаток','Зосередженість','представлено','практикує','опановано',
  'Додати рядки ШІ','Показати рядки ШІ','Сховати рядки ШІ','Створити заново','Пишемо…','Не вдалося створити рядки ШІ.',
  '{n} приміток до даних','Поки нема про що звітувати','Цей звіт формується з аркушів спостережень, які ви скануєте та затверджуєте в Паперовому скані. Відскануйте аркуші за цей період — і теплова карта та картки з\'являться тут.','Хвилини — це оцінки за кружечками часу на аркуші спостережень: читайте їх як баланс, а не як вимірювання.',
  'Тижневий і місячний звіт не ввімкнено','Тижневий і місячний звіт ще не ввімкнено для вашої школи.','Зверніться до адміністрації школи, щоб увімкнути цю функцію.','Не вдалося завантажити звіт.'],
ru: ['Недельный и месячный отчёт','Недельный и месячный отчёт','Недельный отчёт','Месячный отчёт','Неделя','Месяц','Предыдущий период','Следующий период','Пересчитать','Печать',
  'Сессии','Освоено за этот период','Активных детей','{n} без записей за этот период','{n} с незатронутой областью','Ребёнок','Итого','{n} сессий','{n} мин',
  'Нет сессий','{n} заметок','Концентрация','представлено','практикует','освоено',
  'Добавить строки ИИ','Показать строки ИИ','Скрыть строки ИИ','Создать заново','Пишем…','Не удалось создать строки ИИ.',
  '{n} примечаний к данным','Пока нечего показать','Этот отчёт строится из листов наблюдений, которые вы сканируете и утверждаете в Бумажном скане. Отсканируйте листы за этот период — и тепловая карта и карточки появятся здесь.','Минуты — это оценки по кружкам времени на листе наблюдений: читайте их как баланс, а не как измерение.',
  'Недельный и месячный отчёт не включён','Недельный и месячный отчёт ещё не включён для вашей школы.','Обратитесь к администрации школы, чтобы включить эту функцию.','Не удалось загрузить отчёт.'],
};

const q = (s) => `'${s.replace(/'/g, "\\'")}'`;
let changed = 0;
for (const [loc, vals] of Object.entries(T)) {
  if (vals.length !== KEYS.length) throw new Error(`${loc}: ${vals.length} values for ${KEYS.length} keys`);
  const file = resolve(I18N_DIR, `${loc}.ts`);
  let src = readFileSync(file, 'utf8');
  if (src.includes("'periodReport.menuLabel'")) { console.log(`${loc}: already present`); continue; }
  const anchor = /^  'workRhythm\.loadFailed': .*\n/m;
  if (!anchor.test(src)) throw new Error(`${loc}: no workRhythm.loadFailed anchor`);
  const block = [
    '',
    '  // ── Weekly & Monthly Report (period_reports) ──────────────────────────',
    ...KEYS.map((k, i) => `  'periodReport.${k}': ${q(vals[i])},`),
  ].join('\n') + '\n';
  src = src.replace(anchor, (m) => m + block);
  writeFileSync(file, src);
  changed++;
  console.log(`${loc}: inserted ${KEYS.length} keys`);
}
console.log(`done — ${changed} files changed`);
