/*
 * Copyright Fastly, Inc.
 * Licensed under the MIT license. See LICENSE file for details.
 */

import React, { useContext, useState } from 'react';

import Odometer from './Odometer.jsx';
import ActionsContext from '../ActionsContext.js';
import styles from './Leaderboard.module.css';

function LeaderboardHeader() {
  return (
    <div className={styles.boardHead}>
      <div className="row">
        <div className="name">Player</div>
        <div className="score">Score</div>
      </div>
    </div>
  );
}

function LeaderboardBody(props) {
  const { players } = props;

  const playersById = players
    .map((player, index) => {
      return {...player, rank: index + 1};
    })
    .sort((a, b) => a.id - b.id);

  return (
    <div className={styles.boardBody}>
      {playersById.map((player) => (
        <LeaderboardRow key={player.id} player={player} rank={player.rank} />
      ))}
    </div>
  );
}

function LeaderboardRow(props) {

  const actions = useContext(ActionsContext);

  const [ disabled, setDisabled ] = useState(false);

  const handleClick = async () => {
    if (disabled || actions == null || actions.onIncrement == null) {
      return;
    }

    setDisabled(true);
    await actions.onIncrement(props.player.id);
    setDisabled(false);
  };

  const { rank, player, style = {} } = props;
  return (
    <div className={'row pos' + (rank)} style={style}>
      <div className="name">{player.name}</div>
      <div className="score">
        <div>
          <Odometer className="score-value" value={player.score} />
        </div>
        <div>
          <button className="inc" type="button" disabled={disabled} onClick={handleClick}>+1</button>
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard(props) {
  const { players } = props;

  return (
    <div className={styles.root}>
      <section className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleText}>
            Leaderboard
          </div>
        </header>

        <article className={styles.board}>
          <LeaderboardHeader />
          <LeaderboardBody players={players} />
        </article>
      </section>

      <div className={styles.info}>
        <div>
          Try opening <a href="/" target="_blank">this application</a> in multiple windows/devices and clicking on the
          '+1' buttons above.
        </div>
        <div>
          This application uses <a href="https://docs.fastly.com/products/fanout" target="_blank">Fastly Fanout</a> to
          send updates to all connected instances using <a href="https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events" target="_blank">Server-Sent Events</a>.
        </div>
        <div>
          View the source code here: <a href="https://github.com/fastly/fanout-leaderboard-demo" target="_blank">GitHub</a>
        </div>
      </div>
    </div>
  );
}
