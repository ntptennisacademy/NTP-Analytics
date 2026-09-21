import React from 'react';
import type { Player, Point } from '../types';
import type { CurrentScore } from '../logic/tennisLogic';
import { getPointDescription } from '../logic/tennisLogic';

interface MatchLogProps {
  points: Point[];
  players: Player[];
  score: CurrentScore;
}

interface GameGroup {
  key: string;
  number: number;
  p1GamesBefore: number;
  p2GamesBefore: number;
  points: Point[];
}

interface SetGroup {
  number: number;
  games: GameGroup[];
}

function groupPoints(points: Point[]): SetGroup[] {
  const sets: SetGroup[] = [];

  points.forEach((point) => {
    const setNumber = point.scoreAtStart.p1Sets + point.scoreAtStart.p2Sets + 1;
    let set = sets.find((item) => item.number === setNumber);
    if (!set) {
      set = { number: setNumber, games: [] };
      sets.push(set);
    }

    const { p1Games, p2Games } = point.scoreAtStart;
    const key = `${setNumber}:${p1Games}:${p2Games}`;
    let game = set.games.find((item) => item.key === key);
    if (!game) {
      game = {
        key,
        number: p1Games + p2Games + 1,
        p1GamesBefore: p1Games,
        p2GamesBefore: p2Games,
        points: [],
      };
      set.games.push(game);
    }
    game.points.push(point);
  });

  return sets;
}

const MatchLog: React.FC<MatchLogProps> = ({ points, players, score }) => {
  const sets = React.useMemo(() => groupPoints(points), [points]);

  if (!sets.length) {
    return (
      <div className="rounded-2xl border border-iosDivider/30 bg-white px-5 py-12 text-center text-sm font-semibold text-iosGray shadow-sm">
        Points will appear here once the match begins.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {sets.slice().reverse().map((set) => {
        const completedScore = score.setHistory[set.number - 1];
        const setScore = completedScore ?? { p1: score.p1Games, p2: score.p2Games };

        return (
          <section key={set.number} className="space-y-3" aria-label={`Set ${set.number}`}>
            <div className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3 text-white shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
                  {completedScore ? 'Completed set' : 'Current set'}
                </p>
                <h3 className="mt-0.5 text-base font-black">Set {set.number}</h3>
              </div>
              <div className="rounded-xl bg-white/15 px-4 py-1.5 text-2xl font-black tabular-nums" aria-label={`Set score ${setScore.p1} to ${setScore.p2}`}>
                {setScore.p1}<span className="mx-2 text-white/45">–</span>{setScore.p2}
              </div>
            </div>

            <div className="space-y-3">
              {set.games.slice().reverse().map((game) => (
                <article key={game.key} className="overflow-hidden rounded-2xl border border-iosDivider/30 bg-white shadow-sm">
                  <header className="flex items-center justify-between border-b border-iosDivider/20 bg-[#F7F9FC] px-4 py-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Game {game.number}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-iosGray">Set score before game</p>
                    </div>
                    <div className="rounded-lg border border-primary/10 bg-white px-3 py-1 text-base font-black text-black tabular-nums">
                      {game.p1GamesBefore}<span className="mx-1.5 text-iosGray/40">–</span>{game.p2GamesBefore}
                    </div>
                  </header>

                  <div className="divide-y divide-iosDivider/10">
                    {game.points.slice().reverse().map((point, pointIndex) => (
                      <div key={`${game.key}:${game.points.length - pointIndex}`} className="grid grid-cols-[42px_1fr_42px] items-center gap-2 px-4 py-3.5">
                        <div className="text-left text-[13px] font-black text-primary tabular-nums">{point.scoreAtStart.p1Points}</div>
                        <div className="text-center text-[12px] font-medium leading-5 text-black/75">
                          {getPointDescription(point, players)}
                        </div>
                        <div className="text-right text-[13px] font-black text-black tabular-nums">{point.scoreAtStart.p2Points}</div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default MatchLog;
