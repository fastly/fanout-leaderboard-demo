/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import SQLite from '../SQLite.js';
import Board from './Board.js';
import Player from './Player.js';

SQLite.instance.onDbCreated(async () => {

  await Board.ensureTable();
  await Player.ensureTable();

  const board = new Board();
  await board.save();

  await (new Player(null, board, 'TS')).save();
  await (new Player(null, board, 'Brodie')).save();
  await (new Player(null, board, 'Brandi')).save();
  await (new Player(null, board, 'Rene')).save();
  await (new Player(null, board, 'Stan')).save();

});

SQLite.instance.onDbInitialized(async (conn) => {
  // Debug dump table contents
  console.log(await conn.all("SELECT * from Boards"));
  console.log(await conn.all("SELECT * from Players"));
});

export {
  Board,
  Player,
  SQLite,
};
