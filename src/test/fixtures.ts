import type { Battle, BattlePlayer } from '../lib/api';

export function player(over: Partial<BattlePlayer> = {}): BattlePlayer {
  return { tag: '#P0', name: 'Player', crowns: 0, cards: [], ...over };
}

type BattleOptions = {
  /** Your elixir leaked; leave out for a battle that didn't report it. */
  ours?: number;
  /** Each opponent's elixir leaked; `undefined` entries didn't report it. */
  theirs?: (number | undefined)[];
  /** Adds a 2v2 teammate who leaked this much. */
  teammate?: number;
  /** [your crowns, their crowns]. Defaults to a 1-0 win. */
  crowns?: [number, number];
  type?: string;
  battleTime?: string;
  opponentName?: string;
};

export function battle({
  ours,
  theirs = [undefined],
  teammate,
  crowns = [1, 0],
  type = 'friendly',
  battleTime = '20250928T141502.000Z',
  opponentName = 'Rival',
}: BattleOptions = {}): Battle {
  const me = player({
    tag: '#ME',
    name: 'Me',
    crowns: crowns[0],
    elixirLeaked: ours,
  });
  const mate = player({
    tag: '#MATE',
    name: 'Mate',
    crowns: crowns[0],
    elixirLeaked: teammate,
  });

  return {
    type,
    battleTime,
    team: teammate === undefined ? [me] : [me, mate],
    opponent: theirs.map((elixirLeaked, i) =>
      player({
        tag: `#OPP${i}`,
        name: i === 0 ? opponentName : `${opponentName} ${i + 1}`,
        crowns: crowns[1],
        elixirLeaked,
      }),
    ),
  };
}
