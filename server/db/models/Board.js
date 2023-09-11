/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import SQLite from '../SQLite.js';
import Player from './Player.js';

export default class Board {

  constructor(id) {
    this.id = id;
  }

  async save() {
    const db = await SQLite.instance.conn;
    if (this.id != null) {
      // Nothing to do, since there are no fields
    } else {
      const dbResult = await db.run(
        `INSERT INTO Boards DEFAULT VALUES`
      );
      this.id = dbResult.lastID;
    }
  }

  async getPlayer(playerId) {
    return Player.get(playerId, this.id);
  }

  async emitUpdate() {
    await SQLite.instance.emitUpdate('update', this);
  }

  static _tableExists = false;
  static async ensureTable() {
    if (Board._tableExists) {
      return;
    }
    const db = await SQLite.instance.conn;
    try {
      console.log('Attempting to create table Boards');
      await db.run(
        `CREATE TABLE Boards (id INTEGER PRIMARY KEY AUTOINCREMENT)`
      );
    } catch(ex) {
      if (ex.code !== 'SQLITE_ERROR') {
        console.log(ex);
        throw ex;
      }
    }
    Board._tableExists = true;
  }

  static async get(id) {
    const db = await SQLite.instance.conn;
    try {
      const data = await db.get(
        `SELECT * from Boards WHERE id = ?`,
        [ id ]
      );
      if (data == null) {
        // Return null to indicate no matching entry
        return null;
      }
      return new Board(data.id);
    } catch (dbError) {
      // Database connection error
      console.error(dbError);
    }
  }

  static async getOne() {
    const db = await SQLite.instance.conn;
    try {
      const data = await db.get(
        `SELECT * from Boards LIMIT 1`,
      );
      if (data == null) {
        // Return null to indicate no matching entry
        return null;
      }
      return new Board(data.id);
    } catch (dbError) {
      // Database connection error
      console.error(dbError);
    }
  }
}
