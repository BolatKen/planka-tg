/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // проверка каждые 5 минут

// Отсортировано от самого длинного до самого короткого — порядок важен для логики ниже
const THRESHOLDS = [
  { field: 'dueDateReminder1hSent', ms: 1 * 60 * 60 * 1000, label: '1 hour' },
  { field: 'dueDateReminder1dSent', ms: 1 * 24 * 60 * 60 * 1000, label: '1 day' },
  { field: 'dueDateReminder2dSent', ms: 2 * 24 * 60 * 60 * 1000, label: '2 days' },
  { field: 'dueDateReminder3dSent', ms: 3 * 24 * 60 * 60 * 1000, label: '3 days' },
];

module.exports = function defineDeadlineNotifierHook(sails) {
  const notifyCard = async (card, threshold, board) => {
    const memberships = await CardMembership.find({ cardId: card.id });
    const subscriptions = await CardSubscription.find({ cardId: card.id });

    const userIds = _.uniq([
      ...memberships.map((m) => m.userId),
      ...subscriptions.map((s) => s.userId),
    ]);

    if (userIds.length === 0) {
      return;
    }

    const notificationServices = await NotificationService.qm.getByUserIds(userIds);

    if (notificationServices.length > 0) {
      const services = notificationServices.map((s) => _.pick(s, ['url', 'format']));

      const title = `Deadline in ${threshold.label}`;
      const text = `Card "${card.name}" is due in ${threshold.label}${board ? ` (${board.name})` : ''}`;

      await sails.helpers.utils.sendNotifications(services, title, {
        text,
        markdown: text,
        html: text,
      });
    }
  };

  const checkDeadlines = async () => {
    const now = new Date();

    const cards = await Card.find({
      dueDate: { '>=': now.toISOString() },
      isDueCompleted: false,
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const card of cards) {
      const dueDate = new Date(card.dueDate);
      const timeLeft = dueDate.getTime() - now.getTime();

      // Находим САМЫЙ БЛИЖАЙШИЙ (короткий) порог, в который попадает оставшееся время
      const matchingThreshold = THRESHOLDS.find((t) => timeLeft <= t.ms && !card[t.field]);

      if (!matchingThreshold) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Все пороги ДЛИННЕЕ найденного считаем пропущенными — помечаем как sent без отправки,
      // чтобы не слать уведомления "задним числом"
      const updates = {};
      let shouldNotify = false;

      // eslint-disable-next-line no-restricted-syntax
      for (const t of THRESHOLDS) {
        if (card[t.field]) {
          // eslint-disable-next-line no-continue
          continue; // уже был отправлен ранее
        }
        if (t.ms >= matchingThreshold.ms) {
          updates[t.field] = true;
          if (t.field === matchingThreshold.field) {
            shouldNotify = true;
          }
        }
      }

      if (shouldNotify) {
        // eslint-disable-next-line no-await-in-loop
        const board = await Board.findOne({ id: card.boardId });
        // eslint-disable-next-line no-await-in-loop
        await notifyCard(card, matchingThreshold, board);
      }

      // eslint-disable-next-line no-await-in-loop
      await Card.updateOne({ id: card.id }).set(updates);
    }
  };

  return {
    async initialize() {
      sails.log.info('Initializing custom hook (`deadline-notifier`)');

      setInterval(() => {
        checkDeadlines().catch((error) => {
          sails.log.error(`Error while checking deadline notifications:\n${error}`);
        });
      }, CHECK_INTERVAL_MS);
    },
  };
};
