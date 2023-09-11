/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import ActionsContext from './ActionsContext.js';
import Leaderboard from './components/Leaderboard.jsx';

export function startLeaderboardApp(options) {

  const { rootElement, onIncrement, players, } = options;
  const actions = {
    onIncrement,
  };

  const root = createRoot(rootElement);
  function setPlayers(players) {
    root.render(
      <ActionsContext.Provider value={actions}>
        <Leaderboard players={players} />
      </ActionsContext.Provider>
    );
  }
  setPlayers(players);

  return {
    setPlayers,
  };

}
