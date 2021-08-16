export class GamePlayerError {
  public readonly player: RacketType;

  constructor(player: RacketType) {
    this.player = player;
  }
}

export class GameMissError extends GamePlayerError {}

export class GameLossError extends GamePlayerError {}
