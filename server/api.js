/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import { Router } from 'express';
import { Board, Player } from './db/models/index.js';

export const boardsApiRouter = new Router();

boardsApiRouter.get('/:boardId/', async (req, res) => {

  const board = await Board.get(req.params.boardId);
  if (board == null) {
    res.status(404)
      .send('Not found.\n');
    return;
  }

  // Check if request is for Server-Sent Events.
  if (req.accepts('text/event-stream')) {
    
    if (!req.grip.isProxied) {
      res.status(406);
      res.send('text/event-stream requires GRIP proxy.\n');
      return;
    }

    if (req.grip.needsSigned && !req.grip.isSigned) {
      res.status(501);
      res.send('text/event-stream requires authenticated GRIP proxy.\n');
      return;
    }
    
    const gripInstruct = res.grip.startInstruct();
    gripInstruct.addChannel(`board-${board.id}`);
    gripInstruct.setHoldStream();

    res.setHeader('Content-Type', 'text/event-stream');
    res.status(200);
    res.end();
    return;

  }

  const players = await Player.getTopForBoard(board, 5);

  const viewModel = {
    players: players.map(({ id, name, score }) => {
      return {
        id, name, score
      };
    }),
  };

  res.send(viewModel);

});

boardsApiRouter.get('/:boardId/players/:playerId/', async (req, res) => {

  const player = await Player.get(req.params.playerId, req.params.boardId);
  if (player == null) {
    res.status(404)
      .send('Not found.\n');
    return;
  }

  const { id, name, score } = player;
  const viewModel = {id, name, score};

  res.status(200)
    .send(viewModel);

});

boardsApiRouter.post('/:boardId/players/:playerId/score-add/', async (req, res) => {

  const player = await Player.get(req.params.playerId, req.params.boardId);
  if (player == null) {
    res.status(404)
      .send('Not found.\n');
    return;
  }

  await player.scoreAdd();

  const { id, name, score } = player;
  const viewModel = {id, name, score};

  res.status(200)
    .send(viewModel);

});
