export default class View {
    private static readonly NOTIFICATION_TIMEOUT = 5000
    private static readonly NOTIFICATION_FADEOUT = 1500

    private static PLAYER_NAME = { left: 'Left', right: 'Right' }

    private readonly _leftRacket: HTMLElement
    private readonly _rightRacket: HTMLElement
    private readonly _ball: HTMLElement
    private readonly _lives: Record<keyof typeof RacketType, HTMLElement>
    private readonly _controls: IControls
    private readonly _missPlayer: HTMLElement | null
    private readonly _winnerPlayer: HTMLElement | null
    private readonly _sounds: Record<GameSoundType, HTMLElement | null>

    public constructor(
        objects: Record<keyof typeof ObjectType, HTMLElement>,
        lives: Record<keyof typeof RacketType, HTMLElement>,
        controls: IControls
    ) {
        this._leftRacket = objects.leftRacket
        this._rightRacket = objects.rightRacket
        this._ball = objects.ball
        this._lives = lives
        this._controls = controls

        this._missPlayer = document.getElementById('miss-player')
        this._winnerPlayer = document.getElementById('winner-player')

        this._sounds = {
            'game-over': document.getElementById('game-over-sound'),
            ping: document.getElementById('ping-sound'),
            pong: document.getElementById('pong-sound'),
            start: document.getElementById('start-sound'),
        }

        const dependentSettings = document.getElementsByClassName('dependent')
        document.querySelectorAll('input[type=radio][name=mode]').forEach(v =>
            v.addEventListener('change', ev => {
                const value = (ev.currentTarget as HTMLInputElement).value
                for (const setting of dependentSettings)
                    setting.classList.toggle(
                        'hidden',
                        value !== setting.getAttribute('data-type')
                    )
            })
        )
    }

    // TODO: investigate some bugs in stable Edge (it sets `left` (and `shape`?) for all objects, not only `object`)
    private updateShape(object: ObjectType, shape: Partial<IShape>) {
        let style: CSSStyleDeclaration
        switch (object) {
            case ObjectType.leftRacket:
                {
                    style = this._leftRacket.style
                }
                break
            case ObjectType.rightRacket:
                style = this._rightRacket.style
                break
            case ObjectType.ball:
                style = this._ball.style
                break
            default:
                return
        }

        if (shape.top !== undefined) style.top = `${shape.top}px`
        if (shape.left !== undefined) style.left = `${shape.left}px`
        if (shape.width !== undefined) style.width = `${shape.width}px`
        if (shape.height !== undefined) style.height = `${shape.height}px`
    }

    public updatePosition(object: ObjectType, { left, top }: IPosition) {
        this.updateShape(object, { left, top })
    }

    public updateSize(object: ObjectType, { width, height }: ISize) {
        this.updateShape(object, { width, height })
    }

    public updateLives(count: number, player?: RacketType) {
        switch (player) {
            case RacketType.left:
                this._lives.left.textContent = count.toString()
                break
            case RacketType.right:
                this._lives.right.textContent = count.toString()
                break
            case undefined:
                this._lives.left.textContent = count.toString()
                this._lives.right.textContent = count.toString()
                break
        }
    }

    public applyParams(params: GameParams) {
        if (params.mode === ModeType.competitive) {
            this._lives.left.classList.remove('points')
            this._lives.right.classList.remove('points')
            this._lives.left.classList.add('lives')
            this._lives.right.classList.add('lives')
        } else {
            if (params.hasCounter) {
                this._lives.left.classList.remove('lives')
                this._lives.right.classList.remove('lives')
                this._lives.left.classList.add('points')
                this._lives.right.classList.add('points')
            } else {
                this._lives.left.classList.add('hidden')
                this._lives.right.classList.add('hidden')
            }
        }
    }

    public setLoserPlayerName(player: RacketType) {
        if (this._winnerPlayer)
            switch (player) {
                case RacketType.left:
                    this._winnerPlayer.innerText = View.PLAYER_NAME.right
                    break
                case RacketType.right:
                    this._winnerPlayer.innerText = View.PLAYER_NAME.left
                    break
            }
        this._toggleControlClass('lose', 'hidden', false)
        setTimeout(
            () => this._toggleControlClass('lose', 'fade-out', true),
            View.NOTIFICATION_FADEOUT
        )
        setTimeout(() => {
            this._toggleControlClass('lose', 'hidden', true)
            this._toggleControlClass('lose', 'fade-out', false)
        }, View.NOTIFICATION_TIMEOUT)
    }

    public setMissedPlayerName(player: RacketType) {
        if (this._missPlayer)
            switch (player) {
                case RacketType.left:
                    this._missPlayer.innerText = View.PLAYER_NAME.left
                    break
                case RacketType.right:
                    this._missPlayer.innerText = View.PLAYER_NAME.right
                    break
            }
    }

    public playSound(sound: GameSoundType) {
        (this._sounds[sound] as HTMLAudioElement)?.play()
    }

    public notifyStateChange(newState: GameStateType) {
        this._toggleControlClass(
            'greeting',
            'hidden',
            newState !== GameStateType.stop
        )
        this._toggleControlClass(
            'playPause',
            'play',
            newState !== GameStateType.play
        )
        this._toggleControlClass(
            'playPause',
            'pause',
            newState !== GameStateType.pause
        )
        this._toggleControlClass(
            'pause',
            'hidden',
            newState !== GameStateType.pause
        )
        this._toggleControlClass(
            'miss',
            'hidden',
            newState !== GameStateType.miss
        )
    }

    public toggleSettingsUI(state: boolean) {
        this._toggleControlClass('settingsWrapper', 'hidden', !state)
    }

    private _toggleControlClass(
        control: ControlType,
        token: string,
        state: boolean
    ) {
        this._controls[control]?.classList.toggle(token, state)
    }

    public needSoundsChange(newState: boolean) {
        this._toggleControlClass('volume', 'muted', !newState)
    }
}
