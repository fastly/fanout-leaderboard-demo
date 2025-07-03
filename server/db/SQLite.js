/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import fs from 'node:fs';
import path from 'node:path';

// SQLite Wrapper allows us to make async/await connections
// https://www.npmjs.com/package/sqlite
import * as dbWrapper from 'sqlite';

// The SQLite Driver
import sqlite3 from 'sqlite3';

// Initialize the database
const dbFile = '/tmp/fanout-leaderboard-demo.db';

export default class SQLite {
  static instance;

  // Events
  _onCreatedFunctions = [];
  _onInitializedFunctions = [];
  _onUpdatedFunctions = [];

  // A promise that resolves to the underlying connection object
  _dbConn;
  async _getDbConn() {

    if (this._dbConn != null) {
      return this._dbConn;
    }

    sqlite3.verbose();
    const existed = fs.existsSync(dbFile);
    fs.mkdirSync(path.dirname(dbFile), { recursive: true });
    this._dbConn = await dbWrapper
      .open({
        filename: dbFile,
        driver: sqlite3.Database
      });
    const existsNow = fs.existsSync(dbFile);

    if (!existed && existsNow) {
      for (const onCreated of this._onCreatedFunctions) {
        await onCreated(this._dbConn);
      }
    }

    for (const onInitialized of this._onInitializedFunctions) {
      await onInitialized(this._dbConn);
    }

    return this._dbConn;
  }

  get conn() {
    return this._getDbConn();
  }

  onDbCreated(onCreated) {
    this._onCreatedFunctions.push(onCreated);
  }

  onDbInitialized(onInitialized) {
    this._onInitializedFunctions.push(onInitialized);
  }

  onDbUpdated(onUpdated) {
    this._onUpdatedFunctions.push(onUpdated);
  }

  async emitUpdate(action, object) {
    for (const onUpdated of this._onUpdatedFunctions) {
      await onUpdated(this._dbConn, action, object);
    }
  }
}

SQLite.instance = new SQLite();
