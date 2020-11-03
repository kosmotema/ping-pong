import { GameLossError, GameMissError, GamePlayerError } from './exceptions.js'
import View from './view.js'

export default class Model {
    public static params: GameParams = { missPause: true, mode: ModeType.competitive, speed: { ball: .35, racket: 5 }, lives: 3 }

    private static _screenSize: ISize

    private _leftRacket: IRacket
    private _rightRacket: IRacket
    private _ball: IBall

    private _view: View

    private _needSounds: boolean = true

    public constructor(view: View, objects: { leftRacket: IShape, rightRacket: IShape, ball: IShape }, screenSize?: ISize) {
        this._view = view

        const racketParams = { speed: Model.params.speed.racket, lives: Model.params.mode === ModeType.competitive ? Model.params.lives : undefined }

        this._leftRacket = Object.assign({}, objects.leftRacket, { counter: racketParams.lives ?? 0 })
        this._rightRacket = Object.assign({}, objects.rightRacket, { counter: racketParams.lives ?? 0 })
        this._ball = Object.assign({}, objects.ball, { speed: Model.params.speed.ball, angle: Model._generateAngle() })
        if (Model.params.mode === ModeType.competitive) {
            this._view.updateLives(this._leftRacket.counter!, RacketType.left)
            this._view.updateLives(this._rightRacket.counter!, RacketType.right)
        }
        if (screenSize)
            Model._screenSize = screenSize
    }

    public moveRacket(type: RacketType, direction: RacketDirectionType) {
        switch (type) {
            case RacketType.left:
                if (this._tryMoveRacket(this._leftRacket, direction))
                    this._view.updatePosition(ObjectType.leftRacket, this._leftRacket)
                break
            case RacketType.right:
                if (this._tryMoveRacket(this._rightRacket, direction))
                    this._view.updatePosition(ObjectType.rightRacket, this._rightRacket)
                break
        }
    }

    public static updateScreenSize(size: ISize) {
        Model._screenSize = size
    }

    public moveBall(elapsedTime: number): void | GamePlayerError {
        try {
            const { top, left } = this._simulateBall({ top: -Math.sin(this._ball.angle) * elapsedTime * Model.params.speed.ball, left: Math.cos(this._ball.angle) * elapsedTime * Model.params.speed.ball })

            this._ball.top += top
            this._ball.left += left
            this._view.updatePosition(ObjectType.ball, this._ball)
        }
        catch (ex) {
            if (ex instanceof GameMissError) {
                this.reset()
                const loss = this._updateLives(ex.player)
                if (loss) return loss
                this._playSound('pong')
                this._view.setMissedPlayerName(ex.player)
                if (Model.params.missPause && (Model.params.mode !== ModeType.free || Model.params.needRestart))
                    return ex
            }
        }
    }

    private _updateLives(loser: RacketType): void | GameLossError {
        if (Model.params.mode === ModeType.competitive) {
            switch (loser) {
                case RacketType.left:
                    this._view.updateLives(--(this._leftRacket.counter!), loser)
                    if (this._leftRacket.counter == 0) {
                        this._view.setLoserPlayerName(loser)
                        this._playSound('game-over')
                        this._resetLives()
                        return new GameLossError(loser)
                    }
                    break;
                case RacketType.right:
                    this._view.updateLives(--(this._rightRacket.counter!), loser)
                    if (this._rightRacket.counter == 0) {
                        this._view.setLoserPlayerName(loser)
                        this._playSound('game-over')
                        this._resetLives()
                        return new GameLossError(loser)
                    }
                    break;
            }
        }
        else {
            switch (loser) {
                case RacketType.left:
                    this._view.updateLives(++(this._rightRacket.counter), RacketType.right)
                    break;
                case RacketType.right:
                    this._view.updateLives(++(this._leftRacket.counter), RacketType.left)
                    break;
            }
        }
    }

    private _simulateBall(shift: IPosition): IPosition {
        let ready = false
        let needPlaySound = false

        // TODO: calc the least distance
        while (!ready) {
            ready = true
            let newShift: number | undefined

            if ((newShift = this._shiftBall(this._ball.top, 0, shift.top)) !== undefined) {
                this._ball.angle = 2 * Math.PI - this._ball.angle
                shift.top = newShift
                ready = false
            }

            if ((newShift = this._shiftBall(this._ball.top, Model._screenSize.height - this._ball.height, shift.top)) !== undefined) {
                this._ball.angle = 2 * Math.PI - this._ball.angle
                shift.top = newShift
                ready = false
            }

            {
                const xDistance = shift.left < 0 ? this._ball.left - this._leftRacket.left - this._leftRacket.width : this._rightRacket.left - this._ball.left - this._ball.width
                const yDistance = Math.tan(this._ball.angle) * xDistance
                const racket = shift.left < 0 ? this._leftRacket : this._rightRacket
                if (Math.abs(shift.left) > xDistance
                    && racket.top - this._ball.height <= this._ball.top + yDistance
                    && racket.top + racket.height + this._ball.height >= this._ball.top + yDistance) {
                    shift.left = -shift.left - xDistance
                    shift.top = shift.top - yDistance
                    const adjustment = (this._ball.top + yDistance - racket.top - racket.height / 2) / racket.height
                    const sign = Math.sign(Math.cos(this._ball.angle))
                    this._ball.angle = Math.PI / 2 + sign * (Math.PI / 2 + adjustment * Math.PI / 4)
                    ready = false

                    needPlaySound = true
                }
            }

            // left player loose
            if ((newShift = this._shiftBall(this._ball.left, 0, shift.left)) !== undefined) {
                if (Model.params.mode === ModeType.competitive || Model.params.mode === ModeType.free && Model.params.needRestart)
                    throw new GameMissError(RacketType.left)
                this._ball.angle = (3 * Math.PI - this._ball.angle) % (2 * Math.PI)
                shift.left = newShift
                ready = false
                this._updateLives(RacketType.left)
            }

            // right player loose
            if ((newShift = this._shiftBall(this._ball.left, Model._screenSize.width - this._ball.width, shift.left)) !== undefined) {
                if (Model.params.mode === ModeType.competitive || Model.params.mode === ModeType.free && Model.params.needRestart)
                    throw new GameMissError(RacketType.right)
                this._ball.angle = (3 * Math.PI - this._ball.angle) % (2 * Math.PI)
                shift.left = newShift
                ready = false
                this._updateLives(RacketType.right)
            }
        }

        needPlaySound && this._playSound('ping')

        return shift
    }

    private _shiftBall(currentValue: number, bound: number, shift: number): number | undefined {
        const distance = bound - currentValue
        return (Math.sign(shift) == Math.sign(distance) && Math.abs(shift) > Math.abs(distance)) ? 2 * distance - shift : undefined
    }

    private _tryMoveRacket(racket: IRacket, direction: RacketDirectionType): boolean {
        switch (direction) {
            case RacketDirectionType.up:
                if (racket.top > Model.params.speed.racket) {
                    racket.top -= Model.params.speed.racket
                    return true
                }
                else if (racket.top != 0) {
                    racket.top = 0
                    return true;
                }
                return false
            case RacketDirectionType.down:
                if (racket.top + racket.height < Model._screenSize.height - Model.params.speed.racket) {
                    racket.top += Model.params.speed.racket
                    return true
                }
                else if (racket.top + racket.height != Model._screenSize.height) {
                    racket.top = Model._screenSize.height - racket.height
                    return true;
                }
                return false
        }
        return false
    }

    public changeParams(params: GameParams, needResetLives: boolean) {
        Model.params = params
        this._view.applyParams(params)
        needResetLives && this._resetLives()
    }

    public reset(hard: boolean = false) {
        this._leftRacket.top = (Model._screenSize.height - this._leftRacket.height) / 2
        this._rightRacket.top = (Model._screenSize.height - this._rightRacket.height) / 2
        this._ball.left = (Model._screenSize.width - this._ball.width) / 2
        this._ball.top = (Model._screenSize.height - this._ball.height) / 2
        this._ball.angle = Model._generateAngle()

        this._view.updatePosition(ObjectType.leftRacket, this._leftRacket)
        this._view.updatePosition(ObjectType.rightRacket, this._rightRacket)
        this._view.updatePosition(ObjectType.ball, this._ball)

        if (hard) this._resetLives()
    }

    private _resetLives() {
        if (Model.params.mode === ModeType.competitive)
            this._view.updateLives(this._leftRacket.counter = this._rightRacket.counter = Model.params.lives)
        else if (Model.params.hasCounter)
            this._view.updateLives(this._leftRacket.counter = this._rightRacket.counter = 0)
    }

    private static _generateAngle(): number {
        return (Math.round(Math.random()) + (Math.random() - .5) / 2) * Math.PI
    }

    public stateChanged(newState: GameStateType, oldState: GameStateType) {
        if (newState === GameStateType.play && oldState === GameStateType.stop)
            this._playSound('start')
        this._view.notifyStateChange(newState)
    }

    public toggleSettingsUI(state: boolean) {
        this._view.toggleSettingsUI(state)
    }

    private _playSound(sound: GameSoundType) {
        this._needSounds && this._view.playSound(sound)
    }

    public sounds(newState?: boolean) {
        if (newState === undefined)
            this._needSounds = !this._needSounds
        else
            this._needSounds = newState
        this._view.needSoundsChange(this._needSounds)
    }
}