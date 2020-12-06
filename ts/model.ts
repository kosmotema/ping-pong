import { GameLossError, GameMissError, GamePlayerError } from './exceptions.js'
import View from './view.js'

export default class Model {
    public params: GameParams = {
        missPause: true,
        mode: 'competitive',
        speed: { ball: 0.35, racket: 5 },
        lives: 3,
    }

    private _screenSize: ISize

    private readonly _leftRacket: IRacket
    private readonly _rightRacket: IRacket
    private readonly _ball: IBall

    private readonly _view: View

    private _needSounds: boolean = true

    public constructor(view: View, objects: GameObjectsData, screenSize: ISize) {
        this._screenSize = screenSize

        const commonRacketParams = {
            height: objects.racket.height,
            width: objects.racket.width,
            y: (screenSize.height - objects.racket.height) / 2,
            counter: this.params.mode === 'competitive' ? this.params.lives : 0,
        }

        this._leftRacket = {
            x: objects.racket.offset,
            ...commonRacketParams,
        }
        this._rightRacket = {
            x: screenSize.width - objects.racket.offset - objects.racket.width,
            ...commonRacketParams,
        }
        this._ball = {
            ...objects.ball,
            x: screenSize.width / 2,
            y: screenSize.height / 2,
            angle: Model._generateAngle(),
            speed: this.params.speed.ball,
        }

        this._view = view
        this._view.init(
            {
                leftRacket: this._leftRacket,
                rightRacket: this._rightRacket,
                ball: this._ball,
            },
            screenSize,
            this.params.mode === 'competitive' ? commonRacketParams.counter : undefined
        )
    }

    public moveRacket(type: RacketType, direction: RacketDirectionType) {
        switch (type) {
            case 'left':
                if (this._tryMoveRacket(this._leftRacket, direction))
                    this._view.updatePosition('leftRacket', this._leftRacket)
                break
            case 'right':
                if (this._tryMoveRacket(this._rightRacket, direction))
                    this._view.updatePosition('rightRacket', this._rightRacket)
                break
        }
    }

    // TODO: update sizes of shapes
    public updateScreenSize(size: ISize) {
        const ratio = {
            x: size.width / this._screenSize.width,
            y: size.height / this._screenSize.height,
        }

        this._leftRacket.x *= ratio.x
        this._leftRacket.y *= ratio.y
        this._view.updatePosition('leftRacket', this._leftRacket, false)

        // small hack to prevent different offset for left and right rackets (as when using simple `*= ratio.x`, it will also affect on right racket's width)
        this._rightRacket.x = size.width - this._leftRacket.x - this._rightRacket.width
        this._rightRacket.y *= ratio.y
        this._view.updatePosition('rightRacket', this._rightRacket, false)

        this._ball.x *= ratio.x
        this._ball.y *= ratio.y
        this._view.updatePosition('ball', this._ball, false)

        this._view.screenSizeChanged(size) // it will redraw canvas automatically
        this._screenSize = size
    }

    public moveBall(elapsedTime: number): void | GamePlayerError {
        try {
            const { y: top, x: left } = this._simulateBall({
                y: -Math.sin(this._ball.angle) * elapsedTime * this.params.speed.ball,
                x: Math.cos(this._ball.angle) * elapsedTime * this.params.speed.ball,
            })

            this._ball.y += top
            this._ball.x += left
            this._view.updatePosition('ball', this._ball)
        } catch (ex) {
            if (ex instanceof GameMissError) {
                this.reset()
                const loss = this._updateLives(ex.player)
                if (loss) return loss
                this._playSound('pong')
                this._view.setMissedPlayerName(ex.player)
                if (
                    this.params.missPause &&
                    (this.params.mode !== 'free' || this.params.needRestart)
                )
                    return ex
            }
        }
    }

    private _updateLives(loser: RacketType): void | GameLossError {
        if (this.params.mode === 'competitive') {
            switch (loser) {
                case 'left':
                    this._view.updateLives(--this._leftRacket.counter, loser)
                    if (this._leftRacket.counter == 0) {
                        this._view.setLoserPlayerName(loser)
                        this._playSound('game-over')
                        this._resetLives()
                        return new GameLossError(loser)
                    }
                    break
                case 'right':
                    this._view.updateLives(--this._rightRacket.counter, loser)
                    if (this._rightRacket.counter == 0) {
                        this._view.setLoserPlayerName(loser)
                        this._playSound('game-over')
                        this._resetLives()
                        return new GameLossError(loser)
                    }
                    break
            }
        } else {
            switch (loser) {
                case 'left':
                    this._view.updateLives(++this._rightRacket.counter, 'right')
                    break
                case 'right':
                    this._view.updateLives(++this._leftRacket.counter, 'left')
                    break
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

            if (
                (newShift = this._shiftBall(this._ball.y, this._ball.radius, shift.y)) !== undefined
            ) {
                this._ball.angle = 2 * Math.PI - this._ball.angle
                shift.y = newShift
                ready = false
            }

            if (
                (newShift = this._shiftBall(
                    this._ball.y,
                    this._screenSize.height - this._ball.radius,
                    shift.y
                )) !== undefined
            ) {
                this._ball.angle = 2 * Math.PI - this._ball.angle
                shift.y = newShift
                ready = false
            }

            {
                const [racket, xDistance] =
                    shift.x < 0
                        ? [
                              this._leftRacket,
                              this._ball.x -
                                  this._ball.radius -
                                  this._leftRacket.x -
                                  this._leftRacket.width,
                          ]
                        : [
                              this._rightRacket,
                              this._rightRacket.x - this._ball.x - this._ball.radius,
                          ]
                const yDistance = Math.tan(this._ball.angle) * xDistance
                if (
                    Math.abs(shift.x) > xDistance &&
                    racket.y - this._ball.radius <= this._ball.y + yDistance &&
                    racket.y + racket.height + this._ball.radius >= this._ball.y + yDistance
                ) {
                    shift.x = -shift.x - xDistance
                    shift.y = shift.y - yDistance
                    const adjustment =
                        (this._ball.y + yDistance - racket.y - racket.height / 2) / racket.height
                    const sign = Math.sign(Math.cos(this._ball.angle))
                    this._ball.angle =
                        Math.PI / 2 + sign * (Math.PI / 2 + (adjustment * Math.PI) / 4)
                    ready = false

                    needPlaySound = true
                }
            }

            // left player loose
            if (
                (newShift = this._shiftBall(this._ball.x, this._ball.radius, shift.x)) !== undefined
            ) {
                if (
                    this.params.mode === 'competitive' ||
                    (this.params.mode === 'free' && this.params.needRestart)
                )
                    throw new GameMissError('left')
                this._ball.angle = (3 * Math.PI - this._ball.angle) % (2 * Math.PI)
                shift.x = newShift
                ready = false
                this._updateLives('left')
            }

            // right player loose
            if (
                (newShift = this._shiftBall(
                    this._ball.x,
                    this._screenSize.width - this._ball.radius,
                    shift.x
                )) !== undefined
            ) {
                if (
                    this.params.mode === 'competitive' ||
                    (this.params.mode === 'free' && this.params.needRestart)
                )
                    throw new GameMissError('right')
                this._ball.angle = (3 * Math.PI - this._ball.angle) % (2 * Math.PI)
                shift.x = newShift
                ready = false
                this._updateLives('right')
            }
        }

        needPlaySound && this._playSound('ping')

        return shift
    }

    private _shiftBall(currentValue: number, bound: number, shift: number): number | undefined {
        const distance = bound - currentValue
        return Math.sign(shift) == Math.sign(distance) && Math.abs(shift) > Math.abs(distance)
            ? 2 * distance - shift
            : undefined
    }

    private _tryMoveRacket(racket: IRacket, direction: RacketDirectionType): boolean {
        switch (direction) {
            case 'up':
                if (racket.y > this.params.speed.racket) {
                    racket.y -= this.params.speed.racket
                    return true
                } else if (racket.y != 0) {
                    racket.y = 0
                    return true
                }
                return false
            case 'down':
                if (racket.y + racket.height < this._screenSize.height - this.params.speed.racket) {
                    racket.y += this.params.speed.racket
                    return true
                } else if (racket.y + racket.height != this._screenSize.height) {
                    racket.y = this._screenSize.height - racket.height
                    return true
                }
                return false
        }
        return false
    }

    public changeParams(params: GameParams, needResetLives: boolean) {
        this.params = params
        this._view.applyParams(params)
        needResetLives && this._resetLives()
    }

    public reset(hard: boolean = false) {
        this._leftRacket.y = (this._screenSize.height - this._leftRacket.height) / 2
        this._rightRacket.y = (this._screenSize.height - this._rightRacket.height) / 2
        this._ball.x = this._screenSize.width / 2
        this._ball.y = this._screenSize.height / 2
        this._ball.angle = Model._generateAngle()

        this._view.updatePosition('leftRacket', this._leftRacket, false)
        this._view.updatePosition('rightRacket', this._rightRacket, false)
        this._view.updatePosition('ball', this._ball, false)
        this._view.redraw()

        if (hard) this._resetLives()
    }

    private _resetLives() {
        if (this.params.mode === 'competitive')
            this._view.updateLives(
                (this._leftRacket.counter = this._rightRacket.counter = this.params.lives)
            )
        else if (this.params.hasCounter)
            this._view.updateLives((this._leftRacket.counter = this._rightRacket.counter = 0))
    }

    private static _generateAngle(): number {
        return (Math.round(Math.random()) + (Math.random() - 0.5) / 2) * Math.PI
    }

    public stateChanged(newState: GameStateType, oldState: GameStateType) {
        if (newState === 'play' && oldState === 'stop') this._playSound('start')
        this._view.notifyStateChange(newState)
    }

    public toggleSettingsUI(state: boolean) {
        this._view.toggleSettingsUI(state)
    }

    private _playSound(sound: GameSoundType) {
        this._needSounds && this._view.playSound(sound)
    }

    public sounds(newState?: boolean) {
        if (newState === undefined) this._needSounds = !this._needSounds
        else this._needSounds = newState
        this._view.needSoundsChange(this._needSounds)
    }
}
