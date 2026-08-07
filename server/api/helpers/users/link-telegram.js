/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    user: {
      type: 'ref',
      required: true,
    },
    initData: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    invalid: {},
  },

  async fn(inputs) {
    let telegramUser;
    try {
      telegramUser = await sails.helpers.utils.verifyTelegramInitData(inputs.initData);
    } catch (error) {
      throw 'invalid';
    }

    const chatId = String(telegramUser.id);

    if (inputs.user.telegramChatId === chatId) {
      return inputs.user; // уже привязан, ничего не делаем
    }

    const existingUser = await User.qm.getOneByTelegramChatId(chatId);
    if (existingUser && existingUser.id !== inputs.user.id) {
      // этот telegram уже привязан к другому аккаунту — молча пропускаем,
      // не роняем логин из-за этого
      return inputs.user;
    }

    const user = await sails.helpers.users.updateOne.with({
      record: inputs.user,
      values: { telegramChatId: chatId },
      actorUser: inputs.user,
    });

    const botToken = sails.config.custom.telegramBotToken;
    const existingServices = await NotificationService.qm.getByUserId(inputs.user.id).catch(() => []);
    const alreadyHasTelegram = (existingServices || []).some((s) => s.url.includes(`tgram://${botToken}/${chatId}`));

    if (!alreadyHasTelegram) {
      await sails.helpers.notificationServices.createOneInUser.with({
        values: {
          url: `tgram://${botToken}/${chatId}`,
          format: NotificationService.Formats.TEXT,
          user,
        },
        actorUser: user,
      });
    }

    return user;
  },
};
