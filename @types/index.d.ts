type RacketType = 'left' | 'right' 

type RacketDirectionType = 'up' | 'down'

type ObjectType = 'leftRacket' | 'rightRacket' | 'ball'

type ModeType = 'competitive' | 'free'

type GameStateType = 'play' | 'pause' | 'miss' | 'stop'

interface ISize {
    width: number
    height: number
}

interface IPosition {
    y: number
    x: number
}

interface IOrientation {
    vertical: number
    horizotal: number
}

interface IRadius {
    radius: number
}

type IShape = ISize & IPosition

type GameObjectsData = {
    racket: ISize & { offset: number }
    ball: IRadius
}

type IRacket = IPosition & ISize & { counter: number }
type IBall = IPosition & IRadius & { angle: number; speed: number }

type ControlObject = {
    element: HTMLElement | null
    callback?: (event: Event) => void
}

type ControlType =
    | 'playPause'
    | 'settingsForm'
    | 'settingsOpenner'
    | 'settingsClose'
    | 'settingsWrapper'
    | 'greeting'
    | 'pause'
    | 'miss'
    | 'lose'
    | 'volume'
    | 'restart'

type IControls = Record<ControlType, HTMLElement | null>

interface BasicGameParams {
    missPause: boolean
    speed: {
        ball: number
        racket: number
    }
}

interface FreeGameParams extends BasicGameParams {
    mode: 'free'
    needRestart: boolean
    hasCounter: boolean
}

interface CompetitiveGameParams extends BasicGameParams {
    mode: 'competitive'
    lives: number
}

type GameParams = FreeGameParams | CompetitiveGameParams

type GameSoundType = 'game-over' | 'ping' | 'pong' | 'start'

type GameKeyType = 'KeyW' | 'KeyS' | 'ArrowUp' | 'ArrowDown'

type OptionalIndex<U> = { [key: string]: U | undefined }
