declare const enum RacketType {
    left,
    right
}

declare const enum RacketDirectionType {
    up,
    down
}

declare const enum ObjectType {
    leftRacket,
    rightRacket,
    ball
}

declare const enum ModeType {
    competitive = 0,
    free = 1
}

declare const enum GameStateType {
    play = 0,
    pause = 1,
    miss = 2,
    stop = 3
}

interface ISize {
    width: number,
    height: number
}

interface IPosition {
    top: number,
    left: number
}

interface IOrientation {
    vertical: number,
    horizotal: number
}

type IShape = ISize & IPosition

type IShapePartial = Partial<IShape> & {
    [key in keyof IShape]?: number
}

type IRacket = IShape & { counter: number }
type IBall = IShape & { angle: number }

type ControlObject = { element: HTMLElement | null, callback?: (event: Event) => void }

type ControlType = 'playPause' | 'settingsForm' | 'settingsOpenner' | 'settingsClose' | 'settingsWrapper' | 'greeting' | 'pause' | 'miss' | 'lose' | 'volume'

type IControls = Record<ControlType, HTMLElement | null>

interface BasicGameParams {
    missPause: boolean,
    speed: {
        ball: number,
        racket: number
    }
}

interface FreeGameParams extends BasicGameParams {
    mode: ModeType.free,
    needRestart: boolean,
    hasCounter: boolean,
}

interface CompetitiveGameParams extends BasicGameParams {
    mode: ModeType.competitive,
    lives: number
}

type GameParams = FreeGameParams | CompetitiveGameParams

type GameSoundType = 'game-over' | 'ping' | 'pong' | 'start'

type GameKeyType = 'KeyW' | 'KeyS' | 'ArrowUp' | 'ArrowDown'

type OptionalIndex<U> = { [key: string]: U | undefined }