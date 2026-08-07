/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    initData: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    invalid: {},
    usernameAlreadyInUse: {},
    activeLimitReached: {},
  },

  async fn(inputs) {
    let telegramUser;
    try {
      telegramUser = await sails.helpers.utils.verifyTelegramInitData(inputs.initData);
    } catch (error) {
      throw 'invalid';
    }

    const chatId = String(telegramUser.id);

    let user = await User.qm.getOneByTelegramChatId(chatId);

    if (!user) {
      const values = {
        email: `tg${chatId}@planka.local`,
        role: User.Roles.BOARD_USER,
        name: [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || `User ${chatId}`,
        telegramChatId: chatId,
        isSsoUser: true,
      };

      user = await sails.helpers.users.createOne
        .with({
          values,
          actorUser: User.OIDC,
        })
        .intercept('usernameAlreadyInUse', 'usernameAlreadyInUse')
        .intercept('activeLimitReached', 'activeLimitReached');

      const botToken = sails.config.custom.telegramBotToken;

      await sails.helpers.notificationServices.createOneInUser.with({
        values: {
          url: `tgram://${botToken}/${chatId}`,
          format: NotificationService.Formats.TEXT,
          user,
        },
        actorUser: User.OIDC,
      });
    }

    return user;
  },
};
