/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports.up = (knex) =>
  knex.schema.alterTable('card', (table) => {
    table.boolean('due_date_reminder_3d_sent').notNullable().defaultTo(false);
    table.boolean('due_date_reminder_2d_sent').notNullable().defaultTo(false);
    table.boolean('due_date_reminder_1d_sent').notNullable().defaultTo(false);
    table.boolean('due_date_reminder_1h_sent').notNullable().defaultTo(false);
  });

module.exports.down = (knex) =>
  knex.schema.alterTable('card', (table) => {
    table.dropColumn('due_date_reminder_3d_sent');
    table.dropColumn('due_date_reminder_2d_sent');
    table.dropColumn('due_date_reminder_1d_sent');
    table.dropColumn('due_date_reminder_1h_sent');
  });
