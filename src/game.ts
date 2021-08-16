import '../scss/common.scss';
import '../scss/game.scss';
import '../scss/ui.scss';

import Controller from './controller';
import Model from './model';
import View from './view';

const leftRacket = document.getElementById('left'),
  rightRacket = document.getElementById('right'),
  ball = document.getElementById('ball');

if (!leftRacket || !rightRacket || !ball) {
  console.error(
    '[game] Missed some properties of game object: %o',
    JSON.stringify({ left: leftRacket, right: rightRacket, ball })
  );
} else {
  const controls = {
    playPause: document.getElementById('play-pause'),
    settingsForm: document.getElementById('settings--form'),
    settingsOpenner: document.getElementById('settings--open'),
    settingsClose: document.getElementById('settings--close'),
    settingsWrapper: document.getElementById('settings'),
    greeting: document.getElementById('greeting'),
    pause: document.getElementById('pause'),
    miss: document.getElementById('miss'),
    resume: document.getElementsByClassName('resume'),
    lose: document.getElementById('lose'),
    volume: document.getElementById('volume'),
  };

  const view = new View(
    { leftRacket, rightRacket, ball },
    {
      left: document.getElementById('left-counter')!,
      right: document.getElementById('right-counter')!,
    },
    controls
  );
  const model = new Model(
    view,
    {
      leftRacket: toShape(leftRacket),
      rightRacket: toShape(rightRacket),
      ball: toShape(ball),
    },
    { height: window.innerHeight, width: window.innerWidth }
  );
  const controller = new Controller(model, controls);
}

function toShape(element: HTMLElement): IShape {
  return {
    top: element.offsetTop,
    left: element.offsetLeft,
    height: element.offsetHeight,
    width: element.offsetWidth,
  };
}
