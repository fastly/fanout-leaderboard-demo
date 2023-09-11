/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import SQLite from '../SQLite.js';
import Board from "./Board.js";

export default class Player {

  constructor(id = null, board = null, name = null, score = null) {

    this.id = id;
    this.board = board;
    this.name = name ?? '';
    this.score = score ?? 0;

  }

  async save() {
    const db = await SQLite.instance.conn;
    if (this.id != null) {

      await db.run(
        `UPDATE Players SET name = ?, score = ? WHERE id = ?`,
        [ this.name, this.score ]
      );

    } else {

      if (this.board == null) {
        throw new Error('attempt to save Player with no board');
      }

      const dbResult = await db.run(
        `INSERT INTO Players (name, score, board) VALUES (?, ?, ?)`,
        [ this.name, this.score, this.board.id ]
      );
      this.id = dbResult.lastID;

    }

  }

  async scoreAdd(amount = 1) {
    if (this.id == null) {
      throw new Error('attempt to increment Player with no id');
    }

    const db = await SQLite.instance.conn;
    await db.run(
      `UPDATE Players SET score = score + :increment, update_time = :update_time WHERE id = :player_id AND board = :board_id`,
      {
        ':increment': amount,
        ':update_time': Date.now(),
        ':player_id': this.id,
        ':board_id': this.board,
      }
    );

    const updatedPlayer = await Player.get(this.id, this.board);
    this.score = updatedPlayer.score;

    await this.emitUpdate();
    const board = await Board.get(this.board);
    await board.emitUpdate();

  }

  async emitUpdate() {
    await SQLite.instance.emitUpdate('update', this);
  }

  static _tableExists = false;
  static async ensureTable() {
    if (Player._tableExists) {
      return;
    }
    const db = await SQLite.instance.conn;
    try {
      console.log('Attempting to create table Player');
      await db.run(
        `CREATE TABLE Players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          score INTEGER,
          update_time INTEGER default 0,
          board INTEGER,
          FOREIGN KEY (board) REFERENCES Boards(id)
         )`
      );
    } catch(ex) {
      if (ex.code !== 'SQLITE_ERROR') {
        console.log(ex);
        throw ex;
      }
    }
    Player._tableExists = true;
  }

  static async getTopForBoard(board) {
    const db = await SQLite.instance.conn;
    try {
      const dataRows = await db.all(
        `SELECT * from Players WHERE board = :board_id ORDER BY score DESC, update_time ASC`,
        {
          ':board_id': board.id,
        }
      );
      return dataRows.map(data => {
        return new Player(data.id, data.board, data.name, data.score);
      });
    } catch(ex) {
      console.log(ex);
    }
  }

  static async get(playerId, boardId) {
    const db = await SQLite.instance.conn;
    try {
      const data = await db.get(
        `SELECT * from Players WHERE id = :player_id AND board = :board_id`,
        {
          ':player_id': playerId,
          ':board_id': boardId,
        }
      );
      if (data == null) {
        // Return null to indicate no matching entry
        return null;
      }
      return new Player(data.id, data.board, data.name, data.score);
    } catch (dbError) {
      // Database connection error
      console.error(dbError);
    }
  }

}
