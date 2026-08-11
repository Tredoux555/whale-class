// lib/cms/i18n/dictionaries/ru.ts
// Russian — a real, complete translation of the skeleton's strings. This is one
// of two proof locales (the other is `ar`), here to demonstrate that the whole
// chrome survives a non-Latin script before the app grows.

import type { Dictionary } from './en';

const ru: Dictionary = {
  'app.name': 'CMS',
  'app.fullName': 'Система управления детским садом',
  'app.strapline': 'Каждый ребёнок под присмотром — каждый день.',
  'app.description':
    'CMS хранит журнал посещаемости, аллергии, право забирать ребёнка и переписку с родителями в одном месте — чтобы ответ на вопрос «кто сегодня забирает Амару?» занимал три секунды, а не три звонка.',

  'layer.parent': 'Родитель',
  'layer.teacher': 'Педагог',
  'layer.org': 'Организация',
  'layer.parent.role': 'Что вносят семьи',
  'layer.teacher.role': 'Что получает группа',
  'layer.org.role': 'Что видит управление по всем садам',

  'nav.dashboard': 'Главная',
  'nav.enroll': 'Зачисление',
  'nav.messages': 'Сообщения',
  'nav.updates': 'Новости',
  'nav.today': 'Сегодня',
  'nav.documents': 'Документы',
  'nav.overview': 'Обзор',
  'nav.skipToContent': 'Перейти к содержимому',
  'nav.primary': 'Основная навигация',

  'lang.label': 'Язык',
  'lang.change': 'Сменить язык',
  'lang.incomplete': 'Переведено частично',

  'common.cancel': 'Отмена',
  'common.save': 'Сохранить',
  'common.saveDraft': 'Сохранить черновик',
  'common.continue': 'Продолжить',
  'common.back': 'Назад',
  'common.next': 'Далее',
  'common.skip': 'Пропустить',
  'common.open': 'Открыть',
  'common.viewAll': 'Показать все',
  'common.required': 'Обязательно',
  'common.optional': 'Не обязательно',
  'common.comingSoon': 'Скоро',
  'common.notBuiltYet': 'Ещё не реализовано',
  'common.demoData': 'Демонстрационные данные',
  'common.demoDataNote':
    'Тестовые записи, проходящие через типы движка. База данных пока не подключена.',

  'stub.title': 'Экран размечен, но ещё не собран',
  'stub.body':
    'Маршрут, оформление и контракт с движком уже на месте. Рабочая часть появится на следующем этапе — порядок сборки описан в CLAUDE.md.',
  'stub.phase': 'Запланировано на этап {phase}',

  'home.title': 'Три слоя, одна запись',
  'home.subtitle':
    'Родитель заполняет форму один раз. Движок превращает её во всё, что нужно группе. Никто ничего не перепечатывает.',
  'home.enter': 'Войти',
  'home.engine.title': 'Движок',
  'home.engine.body':
    'Между двумя концами — узкая часть песочных часов: типизированные записи, маршрутизация, оценки и генератор документов. Чистый TypeScript, без собственного интерфейса.',

  'parent.dashboard.title': 'Ваши дети',
  'parent.dashboard.subtitle': 'Всё, что хранит сад, и то, что требует вашего внимания.',
  'parent.dashboard.greeting': 'Доброе утро, {name}',
  'parent.dashboard.enrolCta': 'Начать зачисление',
  'parent.dashboard.messageSchool': 'Написать в сад',
  'parent.dashboard.viewRecords': 'Открыть записи',
  'parent.dashboard.stat.children': 'Детей зачислено',
  'parent.dashboard.stat.actions': 'Требует внимания',
  'parent.dashboard.stat.updates': 'Новых новостей',
  'parent.dashboard.needsAttention': 'Требует вашего внимания',
  'parent.dashboard.needsAttentionBody':
    'Одно согласие не подписано, и одна медицинская карта просрочила ежегодный пересмотр.',
  'parent.dashboard.resolve': 'Решить сейчас',

  'child.room': 'Группа',
  'child.age': '{years} года',
  'child.guardian': 'Представитель',
  'child.status.present': 'В саду',
  'child.status.absent': 'Отсутствует',
  'child.status.expected': 'Ожидается',
  'child.medicalNote': 'Медицинская заметка',
  'child.pickup.authorised': 'Разрешено забирать',
  'child.pickup.add': 'Добавить человека',
  'child.flags.none': 'Без пометок',

  'relationship.mother': 'мама',
  'relationship.father': 'папа',
  'relationship.aunt': 'тётя',
  'relationship.uncle': 'дядя',
  'relationship.grandparent': 'бабушка/дедушка',
  'relationship.guardian': 'опекун',
  'relationship.other': 'другое',

  'enrol.title': 'Зачисление',
  'enrol.subtitle': 'Шесть шагов. Всё, что вы введёте, станет официальной записью сада.',
  'enrol.progress': 'Шаг {current} из {total}',
  'enrol.step.child': 'Ребёнок',
  'enrol.step.child.desc': 'Имя, дата рождения, группа.',
  'enrol.step.medical': 'Медицина и аллергии',
  'enrol.step.medical.desc': 'Заболевания, лекарства в саду, тяжесть аллергии.',
  'enrol.step.dietary': 'Питание',
  'enrol.step.dietary.desc': 'Требования к еде, религиозные и культурные ограничения.',
  'enrol.step.school': 'Предыдущий сад',
  'enrol.step.school.desc': 'Где ребёнок был раньше и почему перешёл.',
  'enrol.step.contacts': 'Контакты и выдача',
  'enrol.step.contacts.desc': 'Кто может забирать ребёнка и в каком порядке звонить.',
  'enrol.step.consents': 'Согласия',
  'enrol.step.consents.desc': 'Фотосъёмка, прогулки, экстренная медицинская помощь.',
  'enrol.child.legalName': 'Полное имя по документам',
  'enrol.child.legalName.help': 'Точно как в свидетельстве о рождении.',
  'enrol.child.preferredName': 'Как обращаться',
  'enrol.child.preferredName.help': 'Как ребёнка зовут в группе.',
  'enrol.child.dateOfBirth': 'Дата рождения',
  'enrol.child.homeLanguage': 'Язык общения дома',
  'enrol.child.homeLanguage.help': 'Определяет язык сообщений и подсказку для педагога.',
  'enrol.child.startDate': 'Желаемая дата начала',
  'enrol.child.classGroup': 'Группа',
  'enrol.child.classGroup.placeholder': 'Выберите группу',
  'enrol.child.notes': 'Что педагогу важно знать в первый день',
  'enrol.child.notes.placeholder':
    'Ритуал засыпания, любимая игрушка, как переносит прощание…',
  'enrol.saveAndContinue': 'Сохранить и продолжить',
  'enrol.stepDone': 'Заполнено',
  'enrol.stepCurrent': 'Заполняется',
  'enrol.stepTodo': 'Не начато',
  'enrol.privacyNote':
    'Ответы о здоровье и питании видят только сотрудники группы и канцелярия сада.',

  'parent.messages.title': 'Сообщения',
  'parent.messages.subtitle': 'Одна переписка на ребёнка — с педагогами группы и канцелярией.',

  'parent.updates.title': 'Новости',
  'parent.updates.subtitle':
    'Фотоподборки, отчёты о развитии и итоги четверти, собранные движком.',

  'teacher.today.title': 'Сегодня',
  'teacher.today.subtitle': '{room} · {date}',
  'teacher.today.attendance': '{present} из {total} присутствуют',
  'teacher.today.takeRegister': 'Отметить посещаемость',
  'teacher.today.confirmAttendance': 'Подтвердить посещаемость',
  'teacher.today.yesterday': 'Вчера',
  'teacher.today.roll': 'Список группы',
  'teacher.today.stat.allergies': 'Пометок об аллергии',
  'teacher.today.stat.dietary': 'Требований к питанию',
  'teacher.today.stat.pickup': 'Изменений по выдаче',
  'teacher.today.legend': 'Аллергия · питание · выдача',
  'teacher.today.legend.body':
    'Каждая пометка на этой странице пришла из родительской формы через движок — педагог не вводил её вручную.',
  'teacher.today.pickupBy': 'Забирают в {time} · {person}',
  'teacher.today.droppedOff': 'Привели в {time}',
  'teacher.today.absentReason': 'Отсутствует · {reason}',
  'teacher.today.severity.severe': 'Тяжёлая',
  'teacher.today.severity.moderate': 'Средняя',
  'teacher.today.severity.mild': 'Лёгкая',

  'teacher.documents.title': 'Документы',
  'teacher.documents.subtitle':
    'Формируются из текущих записей по запросу. Ничего здесь не ведётся вручную.',
  'teacher.documents.generate': 'Сформировать',
  'doc.classList': 'Список группы',
  'doc.classList.desc': 'Все дети группы с указанием комнаты, возраста и представителя.',
  'doc.pickupSheet': 'Лист выдачи',
  'doc.pickupSheet.desc': 'Кто кого может забрать сегодня и статус разрешения.',
  'doc.labels': 'Именные наклейки',
  'doc.labels.desc': 'Наклейки для шкафчика, лотка и крючка на одном листе.',
  'doc.dietarySheet': 'Лист питания',
  'doc.dietarySheet.desc': 'Список всех требований группы для кухни.',
  'doc.allergyPoster': 'Плакат об аллергиях',
  'doc.allergyPoster.desc': 'Настенный плакат: фото, аллерген, тяжесть, действия.',
  'doc.medicalSummary': 'Медицинская сводка',
  'doc.medicalSummary.desc': 'Заболевания, лекарства в саду и даты пересмотра.',

  'org.overview.title': 'Обзор',
  'org.overview.subtitle': 'Каждый сад группы — одной строкой.',
  'org.overview.col.school': 'Сад',
  'org.overview.col.children': 'Детей',
  'org.overview.col.classes': 'Групп',
  'org.overview.col.allergies': 'Пометок об аллергии',
  'org.overview.col.enrolments': 'Открытых заявок',

  'flag.allergy': 'Аллергия',
  'flag.dietary': 'Питание',
  'flag.pickup': 'Выдача',
  'flag.medical': 'Медицина',
};

export default ru;
