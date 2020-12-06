export default class View {
    private static readonly NOTIFICATION_TIMEOUT = 7500
    private static readonly NOTIFICATION_FADEOUT = 2500

    private static readonly IMAGE_SIZE = 25
    private static readonly LIVES_OFFSET = 150
    private static readonly BALL_PARTS = 3
    private static readonly DIVIDER_WIDTH = 4

    private static PLAYER_NAME = { left: 'Left', right: 'Right' }

    private readonly _ctx: CanvasRenderingContext2D
    private readonly _controls: IControls
    private readonly _missPlayer: HTMLElement | null
    private readonly _winnerPlayer: HTMLElement | null
    private readonly _sounds: Record<GameSoundType, HTMLAudioElement | null>
    private readonly _images: { star: HTMLImageElement; heart: HTMLImageElement }
    private _livesType: 'heart' | 'star' | 'none' = 'heart'

    private _screenSize!: ISize
    private _leftRacket!: IPosition & ISize
    private _rightRacket!: IPosition & ISize
    private _ball!: IPosition & IRadius
    private lives: { left?: number; right?: number } = {}

    public constructor(canvas: HTMLCanvasElement, controls: IControls) {
        this._controls = controls

        this._ctx = canvas.getContext('2d')!

        this._missPlayer = document.getElementById('miss-player')
        this._winnerPlayer = document.getElementById('winner-player')

        this._sounds = {
            'game-over': document.getElementById('game-over-sound') as HTMLAudioElement,
            ping: document.getElementById('ping-sound') as HTMLAudioElement,
            pong: document.getElementById('pong-sound') as HTMLAudioElement,
            start: document.getElementById('start-sound') as HTMLAudioElement,
        }

        this._images = {
            star: document.getElementById('asset-star') as HTMLImageElement,
            heart: document.getElementById('asset-heart') as HTMLImageElement,
        }

        const dependentSettings = document.getElementsByClassName('dependent')
        document.querySelectorAll('input[type=radio][name=mode]').forEach(v =>
            v.addEventListener('change', ev => {
                const value = (ev.currentTarget as HTMLInputElement).value
                for (const setting of dependentSettings)
                    setting.classList.toggle('hidden', value !== setting.getAttribute('data-type'))
            })
        )
    }

    public init(
        objects: { leftRacket: IRacket; rightRacket: IRacket; ball: IBall },
        screenSize: ISize,
        startLives?: number
    ) {
        this._ball = objects.ball
        this._leftRacket = objects.leftRacket
        this._rightRacket = objects.rightRacket
        this.lives.left = this.lives.right = startLives
        this.screenSizeChanged(screenSize)
    }

    public screenSizeChanged(newSize: ISize) {
        this._screenSize = newSize
        this._ctx.canvas.width = this._screenSize.width
        this._ctx.canvas.height = this._screenSize.height
        this.redraw()
    }

    public redraw() {
        // TODO: support screen sizes change
        this._ctx.clearRect(0, 0, this._screenSize.width, this._screenSize.height)
        this.drawDivider()
        this.drawLives()
        this.drawRacket(this._leftRacket)
        this.drawRacket(this._rightRacket)
        this.drawBall()
    }

    private drawRacket(racket: ISize & IPosition) {
        const oldFillStyle = this._ctx.fillStyle

        this._ctx.fillStyle = 'white'

        // main body
        this._ctx.fillRect(
            racket.x,
            racket.y + racket.width / 2,
            racket.width,
            racket.height - racket.width
        )
        // up and bottom ledges
        this._ctx.fillRect(racket.x + racket.width / 4, racket.y, racket.width / 2, racket.height)

        this._ctx.fillStyle = oldFillStyle
    }

    private drawBall() {
        const oldFillStyle = this._ctx.fillStyle

        this._ctx.fillStyle = 'white'

        const nextParts = View.BALL_PARTS + 1
        const radiusPart = this._ball.radius / View.BALL_PARTS

        for (let i = 1; i <= View.BALL_PARTS; ++i)
            this._ctx.fillRect(
                this._ball.x - (nextParts - i) * radiusPart,
                this._ball.y - i * radiusPart,
                2 * (nextParts - i) * radiusPart,
                2 * i * radiusPart
            )

        this._ctx.fillStyle = oldFillStyle
    }

    private drawDivider() {
        const old = {
            lineDash: this._ctx.getLineDash(),
            lineWidth: this._ctx.lineWidth,
            strokeStyle: this._ctx.strokeStyle,
        }

        this._ctx.setLineDash([10, 5])
        this._ctx.lineWidth = View.DIVIDER_WIDTH
        this._ctx.strokeStyle = '#ccc'

        this._ctx.beginPath()
        this._ctx.moveTo(this._screenSize.width / 2, 0)
        this._ctx.lineTo(this._screenSize.width / 2, this._screenSize.height)
        this._ctx.stroke()

        this._ctx.setLineDash(old.lineDash)
        this._ctx.lineWidth = old.lineWidth
        this._ctx.strokeStyle = old.strokeStyle
    }

    private drawLives() {
        if (this._livesType === 'none') return

        const old = {
            font: this._ctx.font,
            textAlign: this._ctx.textAlign,
            fillStyle: this._ctx.fillStyle,
        }

        this._ctx.font = "20px 'Press Start 2P', 'Press Start 2P - Fallback', cursive"
        this._ctx.fillStyle = 'white'

        if (this.lives.left !== undefined) {
            this._ctx.textAlign = 'right'
            const text = this.lives.left.toString()
            const metrics = this._ctx.measureText(text)
            const height =
                metrics.actualBoundingBoxAscent + Math.abs(metrics.actualBoundingBoxDescent)
            const offset = this._screenSize.width / 2 - View.LIVES_OFFSET - View.IMAGE_SIZE
            this._ctx.fillText(text, offset - 5, 25 + height)

            this._ctx.drawImage(
                this._images[this._livesType],
                offset,
                25 + (height - View.IMAGE_SIZE) / 2,
                View.IMAGE_SIZE,
                View.IMAGE_SIZE
            )
        }

        if (this.lives.right !== undefined) {
            this._ctx.textAlign = 'left'
            const text = this.lives.right.toString()
            const metrics = this._ctx.measureText(text)
            const height =
                metrics.actualBoundingBoxAscent + Math.abs(metrics.actualBoundingBoxDescent)
            const offset = this._screenSize.width / 2 + View.LIVES_OFFSET
            this._ctx.fillText(text, offset + View.IMAGE_SIZE + 5, 25 + height)

            this._ctx.drawImage(
                this._images[this._livesType],
                offset,
                25 + (height - View.IMAGE_SIZE) / 2,
                View.IMAGE_SIZE,
                View.IMAGE_SIZE
            )
        }

        this._ctx.font = old.font
        this._ctx.textAlign = old.textAlign
        this._ctx.fillStyle = old.fillStyle
    }

    public updatePosition(object: ObjectType, data: IPosition, needRedraw: boolean = true) {
        switch (object) {
            case 'leftRacket':
                this._leftRacket = { ...this._leftRacket, ...data }
                break
            case 'rightRacket':
                this._rightRacket = { ...this._rightRacket, ...data }
                break
            case 'ball':
                this._ball = { ...this._ball, ...data }
                break
        }
        needRedraw && this.redraw()
    }

    public updateLives(count: number, player?: RacketType) {
        switch (player) {
            case 'left':
                this.lives.left = count
                break
            case 'right':
                this.lives.right = count
                break
            case undefined:
                this.lives.left = count
                this.lives.right = count
                break
        }

        this.redraw()
    }

    public applyParams(params: GameParams) {
        if (params.mode === 'competitive') {
            this._livesType = 'heart'
        } else {
            if (params.hasCounter) {
                this._livesType = 'star'
            } else {
                this._livesType = 'none'
            }
        }
        this.redraw()
    }

    public setLoserPlayerName(player: RacketType) {
        if (this._winnerPlayer)
            switch (player) {
                case 'left':
                    this._winnerPlayer.innerText = View.PLAYER_NAME.right
                    break
                case 'right':
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
                case 'left':
                    this._missPlayer.innerText = View.PLAYER_NAME.left
                    break
                case 'right':
                    this._missPlayer.innerText = View.PLAYER_NAME.right
                    break
            }
    }

    public playSound(sound: GameSoundType) {
        this._sounds[sound]?.play()
    }

    public notifyStateChange(newState: GameStateType) {
        this._toggleControlClass('greeting', 'hidden', newState !== 'stop')
        this._toggleControlClass('playPause', 'play', newState !== 'play')
        this._toggleControlClass('playPause', 'pause', newState !== 'pause')
        this._toggleControlClass('pause', 'hidden', newState !== 'pause')
        this._toggleControlClass('miss', 'hidden', newState !== 'miss')
        this._toggleControlClass('restart', 'hidden', newState === 'stop')
        this._toggleControlClass('playPause', 'hidden', newState === 'stop')
    }

    public toggleSettingsUI(state: boolean) {
        this._toggleControlClass('settingsWrapper', 'hidden', !state)
    }

    private _toggleControlClass(control: ControlType, token: string, state: boolean) {
        this._controls[control]?.classList.toggle(token, state)
    }

    public needSoundsChange(newState: boolean) {
        this._toggleControlClass('volume', 'muted', !newState)
    }
}
