/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import path from 'node:path';
import url from 'node:url';

import express from 'express';
import nunjucks from 'nunjucks';
import { ServeGrip } from '@fanoutio/serve-grip';

import { boardsApiRouter } from './api.js';
import { Board, Player } from './db/models/index.js';
import SQLite from './db/SQLite.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT || 3000;

// Initialize Nunjucks templating
nunjucks.configure(path.resolve(__dirname, 'views'), {
  express: app,
  noCache: process.env.NODE_ENV !== 'production',
});

// Initialize ServeGrip
const serveGrip = new ServeGrip({
  grip: process.env.GRIP_URL || 'http://127.0.0.1:5561/',
  gripVerifyKey: process.env.GRIP_VERIFY_KEY,
});

app.use(serveGrip);

// Publish GRIP messages whenever a Board object in the DB updates
SQLite.instance.onDbUpdated(async (conn, action, object) => {
  if (action === 'update' && object instanceof Board) {

    const board = object;

    const players = await Player.getTopForBoard(board, 5);

    const viewModel = {
      players: players.map(({ id, name, score }) => {
        return {
          id, name, score
        };
      }),
    };

    const data = "event: update\n" +
      "data: " + JSON.stringify(viewModel) + "\n" +
      "\n";

    const publisher = serveGrip.getPublisher();
    try {
      await publisher.publishHttpStream(`board-${board.id}`, data);
    } catch(ex) {
      console.log(ex);
      throw ex;
    }

  }
});

// Serve static files from /public
app.use(express.static(path.resolve(__dirname, 'public')));

// API routes
app.use('/boards', boardsApiRouter);

app.get('/', async (req, res) => {

  const board = await Board.getOne();
  const players = await Player.getTopForBoard(board);

  res.render('index.njk', {
    title: 'Leaderboard App',
    players,
    boardId: board.id,
  });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
});
