/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

module.exports = {
  inputs: {
    initData: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    invalid: {},
  },

  fn(inputs) {
    const botToken = sails.config.custom.telegramBotToken;

    if (!botToken) {
      throw 'invalid';
    }

    const params = new URLSearchParams(inputs.initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      throw 'invalid';
    }

    const authDate = Number(params.get('auth_date'));
    if (Date.now() / 1000 - authDate > 86400) {
      throw 'invalid';
    }

    return JSON.parse(params.get('user'));
  },
};
