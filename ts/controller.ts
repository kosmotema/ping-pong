import { GameLossError, GamePlayerError } from './exceptions.js'
import Model from './model.js'

export default class Controller {
    public static readonly BALL_SPEED_ADJUSTMENT = 0.05
    public static readonly RACKET_SPEED_ADJUSTMENT = 1
    public static readonly BALL_DEFAULT_SPEED = 7
    public static readonly RACKET_DEFAULT_SPEED = 7
    public static readonly DEFAULT_LIVES = 3

    private readonly _model: Model
    private _time?: number
    private _state: GameStateType = 'stop'
    private _requestID?: number

    private readonly _keyState: Record<GameKeyType, boolean> & OptionalIndex<boolean> = {
        KeyW: false,
        KeyS: false,
        ArrowUp: false,
        ArrowDown: false,
    }

    public get state(): GameStateType {
        return this._state
    }

    public toggleGameState(state?: GameStateType, silenced: boolean = false): boolean {
        const old = this._state

        if (state === old) return false

        if (state === undefined)
            switch (old) {
                case 'play':
                    this._state = 'pause'
                    break
                case 'pause':
                case 'miss':
                    this._state = 'play'
                    break
                default:
                    return false
            }
        else this._state = state

        if (old === 'stop') document.addEventListener('keypress', this._controlKeyDown)
        if (this._state === 'stop') document.removeEventListener('keypress', this._controlKeyDown)

        this._keyState.KeyW = this._keyState.KeyS = this._keyState.ArrowDown = this._keyState.ArrowDown = false

        if (this._state === 'play') {
            this._time = undefined
            requestAnimationFrame(this._moveBall)
            document.addEventListener('keydown', this._manipulationKeyDown)
            document.addEventListener('keyup', this._manipulationKeyUp)
        } else {
            document.removeEventListener('keydown', this._manipulationKeyDown)
            document.removeEventListener('keyup', this._manipulationKeyUp)

            if (this._requestID) {
                cancelAnimationFrame(this._requestID)
                this._requestID = undefined
            }
        }

        !silenced && this._model.stateChanged(this._state, old)

        return true
    }

    public constructor(model: Model, controls: IControls & { resume: HTMLCollectionOf<Element> }) {
        this._model = model

        this._initControls(controls)

        let blurred = false

        window.addEventListener('blur', () => {
            if (this._state !== 'play') return
            blurred = true
            this.toggleGameState('pause')
        })

        window.addEventListener('focus', () => {
            if (blurred) {
                this.toggleGameState('play')
                blurred = false
            }
        })

        window.addEventListener('resize', () =>
            this._model.updateScreenSize({
                width: document.documentElement.clientWidth,
                height: document.documentElement.clientHeight,
            })
        )
    }

    private _manipulationKeyDown = (ev: KeyboardEvent) => {
        this._keyState[ev.code] !== undefined && (this._keyState[ev.code] = true)
    }

    private _manipulationKeyUp = (ev: KeyboardEvent) => {
        this._keyState[ev.code] !== undefined && (this._keyState[ev.code] = false)
    }

    private _handlePressedKeys = () => {
        if (this._keyState.KeyW) this._model.moveRacket('left', 'up')

        if (this._keyState.KeyS) this._model.moveRacket('left', 'down')

        if (this._keyState.ArrowUp) this._model.moveRacket('right', 'up')

        if (this._keyState.ArrowDown) this._model.moveRacket('right', 'down')
    }

    private _controlKeyDown = (event: KeyboardEvent) => {
        switch (event.code) {
            case 'KeyR':
                event.shiftKey && this.restart()
                break

            case 'KeyB':
                event.shiftKey && this.stop()
                break

            case 'KeyP':
            case 'Space':
                this.toggleGameState()
                break
        }
    }

    public restart() {
        this.toggleGameState('pause', true)
        this._model.reset(true)
        this.toggleGameState('play')
    }

    public stop() {
        this.toggleGameState('stop')
        this._model.reset(true)
    }

    public setParams(data: FormData) {
        let newParams: GameParams

        const commonParams = {
            missPause: !!data.get('miss-pause'),
            speed: {
                ball:
                    (Number(data.get('ball-speed')) || Controller.BALL_DEFAULT_SPEED) *
                    Controller.BALL_SPEED_ADJUSTMENT,
                racket:
                    (Number(data.get('racket-speed')) || Controller.RACKET_DEFAULT_SPEED) *
                    Controller.RACKET_SPEED_ADJUSTMENT,
            },
        }

        switch (data.get('mode')) {
            case 'competitive':
                newParams = Object.assign(
                    {},
                    {
                        mode: 'competitive' as const,
                        lives: Number(data.get('lives')) || Controller.DEFAULT_LIVES,
                    },
                    commonParams
                )
                break
            case 'free':
                newParams = Object.assign(
                    {},
                    {
                        mode: 'free' as const,
                        needRestart: !!data.get('need-restart'),
                        hasCounter: !!data.get('has-counter'),
                    },
                    commonParams
                )
                break
            default:
                return
        }

        let needRestart = false

        const oldParams = this._model.params

        if (newParams.mode !== oldParams.mode && this._state !== 'stop') {
            needRestart = true
            if (!confirm('If you change the mode, the game will be restarted. Continue?')) return
        }
        if (
            oldParams.mode === 'competitive' &&
            newParams.mode === 'competitive' &&
            this._state !== 'stop' &&
            newParams.lives !== oldParams.lives
        )
            alert('The new lives count will be used in the new game!')

        this._model.changeParams(newParams, this._state === 'stop')
        needRestart && this.stop()
    }

    private _moveBall = (time: number) => {
        this._handlePressedKeys()
        this._time ??= time
        const elapsed = time - this._time
        this._time = time
        const error = this._model.moveBall(elapsed)
        if (error instanceof GamePlayerError)
            void this.toggleGameState(error instanceof GameLossError ? 'stop' : 'miss')
        else
            this._requestID =
                this._state === 'play' ? requestAnimationFrame(this._moveBall) : undefined
    }

    private _initControls(controls: IControls & { resume: HTMLCollectionOf<Element> }) {
        const data = new FormData(controls.settingsForm as HTMLFormElement)
        this.setParams(data)

        let needChangeState = false

        const tryResumeGame = () => {
            this._toggleSettingsUI(false)
            if (needChangeState) {
                this._state === 'pause' && this.toggleGameState('play')
                needChangeState = false
            }
        }

        controls.playPause?.addEventListener('click', () => this.toggleGameState())

        controls.settingsForm?.addEventListener('submit', event => {
            const data = new FormData(event.currentTarget as HTMLFormElement)
            this.setParams(data)
            event.preventDefault()

            tryResumeGame()
        })

        controls.settingsOpenner?.addEventListener('click', () => {
            this._toggleSettingsUI(true)
            if (this._state === 'play') {
                this.toggleGameState('pause')
                needChangeState = true
            }
        })

        controls.settingsClose?.addEventListener('click', tryResumeGame)

        controls.settingsWrapper?.addEventListener('click', event => {
            return event.target === event.currentTarget ? tryResumeGame() : false
        })

        const competitiveSettings = document.getElementsByClassName('dependent')

        const updateSettingsVisibility = (element?: HTMLInputElement) => {
            const value = element?.value
            for (const setting of competitiveSettings)
                setting.classList.toggle('hidden', value !== setting.getAttribute('data-type'))
        }

        document.querySelectorAll('input[type=radio][name=mode]').forEach(v =>
            v.addEventListener('change', ev => {
                updateSettingsVisibility(ev.currentTarget as HTMLInputElement)
            })
        )

        for (const element of controls.resume)
            element.addEventListener('click', () => this.toggleGameState('play'))

        controls.settingsForm?.addEventListener('reset', () => {
            // Just a hack to execute code after form reset
            setTimeout(() =>
                updateSettingsVisibility(
                    document.querySelector(
                        'input:checked[type=radio][name=mode]'
                    ) as HTMLInputElement
                )
            )
            alert("Don't forget to apply the reset settings!")
        })

        controls.volume?.addEventListener('click', () => this._model.sounds())
    }

    private _toggleSettingsUI(state: boolean) {
        this._model.toggleSettingsUI(state)
    }

    public noop() {}
}
