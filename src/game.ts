import '../scss/common.scss';
import '../scss/game.scss';
import '../scss/ui.scss';

import Controller from './controller';
import Model from './model';
import View from './view';

const canvas = document.getElementById('game') as HTMLCanvasElement;

if (!canvas) {
  console.error("[game] Missed game's canvas");
} else {
  const screenSize = {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  };

  const controls = {
    playPause: document.getElementById('play-pause'),
    settingsForm: document.getElementById('settings--form'),
    settingsOpenner: document.getElementById('settings--open'),
    settingsClose: document.getElementById('settings--close'),
    settingsWrapper: document.getElementById('settings'),
    greeting: document.getElementById('greeting'),
    pause: document.getElementById('pause'),
    miss: document.getElementById('miss'),
    resume: Array.from(document.getElementsByClassName('resume')),
    lose: document.getElementById('lose'),
    volume: document.getElementById('volume'),
    restart: document.getElementById('restart'),
  };

  const shapes: GameObjectsData = {
    racket: {
      height: 50,
      width: 8,
      offset: 15,
    },
    ball: {
      radius: 8,
    },
  };

  const view = new View(canvas, controls);
  const model = new Model(view, shapes, screenSize);
  const controller = new Controller(model, controls);

  controller.noop(); // use it to prevent ts(6133)
}
