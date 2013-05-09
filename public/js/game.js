/*globals THREE:true, Ball:true, Track:true, stats:true, $:true, game:true, utils:true, debug:true, xhr:true*/
"use strict";

var running = false;

var interactive = {
  camera: null,
  scene: null,
  renderer: null,
  projector: new THREE.Projector()
};

var background = {
  camera: null,
  scene: null,
  renderer: null
};

var actor = {
  ball: null,
  floor: null,
  player: null,
  activePosition: 'center'
};

var playerDimensions = {
  width: 0,
  height: 0,
  center: {
    x: 125,
    y: 20,
    width: 130,
    height: 430,
    hit: {
      x: 145,
      y: 40,
      width: 90,
      height: 90
    }
  },
  left: {
    x: 60,
    y: 65,
    width: 165,
    height: 400,
    hit: {
      x: 64,
      y: 73,
      width: 120,
      height: 120
    }
  },
  right: {
    x: 200,
    y: 70,
    width: 180,
    height: 390,
    hit: {
      x: 226,
      y: 78,
      width: 120,
      height: 120
    }
  },
  hit1: {
    x: 235,
    y: 175,
    width: 90,
    height: 90
  },
  hit2: {
    x: 310,
    y: 210,
    width: 90,
    height: 90
  },
  tilt: {
    center: {
      x: 145,
      y: 40,
      width: 90,
      height: 90
    },
    left: {
      x: 62,
      y: 110,
      width: 90,
      height: 90
    },
    right: {
      x: 260,
      y: 76,
      width: 90,
      height: 90
    }
  }
};

var TO_RADIANS = Math.PI/180;

var videoWrapper = $('#videowrapper');

var width = window.innerWidth,
    height = window.innerHeight;

function getNarrow(a, b) {
  return a < b ? a : b;
}

function getWide(a, b) {
  return a > b ? a : b;
}

function redrawAll() {
  background.renderer.render(background.scene, background.camera);
  interactive.renderer.render(interactive.scene, interactive.camera);
  renderVideo();
}

function resetBall(posX, x, y, speed) {
  if (!posX) {posX = 0;}
  if (!x) {x = 0;}
  if (!y) {y = 0;}
  if (!speed) {speed = 0;}
  var ball = actor.ball;

  var throwBall = function () {
    if (game.turn || speed) {
      interactive.scene.add(actor.ball);
    }

    var posZ = game.turn ? 620 : -220;

    if (!game.turn) {
      speed *= -1;
    }

    ball.position.z = posZ;
    ball.position.y = -95;

    ball.position.x = utils.map(posX, 0, window.innerWidth, -100, 100);


    ball.velocity.set(0, 0, -speed * 0.35);

    ball.velocity.rotateY(x);
    ball.velocity.rotateZ(0);
    ball.velocity.rotateX(y * 80);

    videoWrapper.style.zIndex = 1;
  };

  // TODO discover timeout based on a ping test
  var delay = 250;

  if (game.turn === true) {
    $.trigger('throw', {
      posX: posX,
      x: x,
      y: y,
      speed: speed
    });
    throwBall();
  } else {
    setTimeout(throwBall, delay);
  }
}

function getContainer(c) {
  var container = document.createElement('div');
  container.className = 'three';
  if (c) {
    container.className += ' ' + c;
  }

  $('.game').appendChild(container);

  return container;
}

function getFloor(scene) {
  var material = new THREE.MeshBasicMaterial({ color: 0x16947B, wireframe:true, wireframeLinewidth: 2 });

  var geom = new THREE.PlaneGeometry(2000, 1500, 20, 10);
  var floor = new THREE.Mesh(geom, material);

  floor.rotation.x = -89 * TO_RADIANS;
  floor.position.y = -250;
  floor.position.z = 100;

  if (scene) {
    scene.add(floor);
  }

  return floor;
}

function getCamera() {
  var camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.z = 1000;
  camera.rotation.x = -8 * TO_RADIANS;

  return camera;
}

function px(x) {
  return Math.round(x) + "px";
}


function getRect2DForRect3D(positionVector, width3d, height3d, camera, canvas) {

  var projector = new THREE.Projector();

  var topleft3d = positionVector.clone();
  var dimensions3d = new THREE.Vector3(width3d, height3d, topleft3d.z);

  var topleft2d = projector.projectVector( topleft3d.clone(), camera );
  var dimensions2d = projector.projectVector( dimensions3d.clone(), camera );

  // this code used to use canvas.width & height, but for reasons that are utterly beyond 
  // me, this breaks on mobile, so I changed it to window.innerWidth, and it works. Genius.
  var w = window.innerWidth,
      h = window.innerHeight;

  dimensions2d.x *= (w/2);
  dimensions2d.y *= (h/2);

  topleft2d.x = (topleft2d.x +1) *(w/2);
  topleft2d.y = (topleft2d.y * (h/-2))+(h/2);

  return {x : topleft2d.x, y:topleft2d.y, width : dimensions2d.x, height : dimensions2d.y};
}

function generateSprite() {
  var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');

  var positions = {},
      defaultPosition = game.turn ? 'center' : 'throw1';

  ['center','left','right', 'hit1', 'hit2', 'throw1'].forEach(function (position) {
    var i = positions[position] = new Image();
    // render the center position
    if (position === defaultPosition) {
      i.onload = function () {
        ctx.drawImage(positions[position], 0, 0);
      };
    }

    i.src = '/images/player-' + game.me.letter + '-' + position + '.png';
  });

  playerDimensions.width = canvas.width = 400;
  playerDimensions.height = canvas.height = 450;

  var clear = function () {
    ctx.clearRect(0, 0, 400, 450);
  };

  function captureMug() {
    // do a screen grab of their face, then crop to a new canvas for re-painting
    var ctx = document.createElement('canvas').getContext('2d'),
        narrow = getNarrow(video.videoWidth, video.videoHeight),
        offsetX = (video.videoWidth - narrow) / 2,
        offsetY = (video.videoHeight - narrow) / 2;
    ctx.canvas.height = ctx.canvas.width = narrow;
    ctx.drawImage(video, offsetX, offsetY, narrow, narrow, 0, 0, 90, 90);

    return ctx.canvas;
  }

  var timer = null;

  window.hit = function () {
    if (game.turn) {
      xhr.get('/hit');
      game.me.score++;
      $.trigger('hit');

      clearTimeout(timer);
      clear();
      video.className = '';

      var mug = captureMug();

      ctx.drawImage(positions.hit1, 0, 0);
      ctx.drawImage(mug, playerDimensions.hit1.x - 90, playerDimensions.hit1.y - 90);
      setTimeout(function () {
        clear();
        ctx.drawImage(positions.hit2, 0, 0);
        ctx.drawImage(mug, playerDimensions.hit2.x - 90, playerDimensions.hit2.y - 90);
      }, 400);
    }
  };

  var renderVideo = window.renderVideo = function () {
    if (video.readyState !== 4) {
      return;
    }
    done = true;
    i = events.length;
    while (i--) {
      video.removeEventListener(events[i], echo, false);
    }

    video.className = 'streaming';
    // return;

    var dims = playerDimensions.tilt[actor.activePosition];
    var player = actor.player;

    var y = player.position.y + ((playerDimensions.height * player.scale.y) / 2),
        x = player.position.x - ((playerDimensions.width * player.scale.x) / 2);

    var face = new THREE.Vector3(
              x + (dims.x * player.scale.x),
              y - (dims.y * player.scale.y) - dims.height * player.scale.y,
              player.position.z);

    var width3d = dims.width * player.scale.x,
        height3d = dims.height * player.scale.y;

    var coords = getRect2DForRect3D(face, width3d, height3d, interactive.camera, interactive.renderer.domElement);

    // now position
    var parent = video.parentNode;


    // serious no idea why I can't reuse .y & .height, it makes my brain hurt
    // but it turns out if you just mix around the values, then it just
    // *suddenly* works. ::sign::

    parent.style.left = px(coords.x);
    parent.style.top = px(coords.y - coords.width + 2);
    parent.style.width = px(coords.width);
    parent.style.height = px(coords.width);

    var wide = getWide(video.videoWidth, video.videoHeight);
    var narrow = getNarrow(video.videoWidth, video.videoHeight);
    var factor = coords.width / narrow;

    video.width = wide * factor;
    video.height = wide * factor;

    var offset = (wide - narrow) / 2 * factor;

    video.style.left = px(-offset);
    video.style.top = px(-offset);
  };

  var videoId = debug ? '#local' : '#remote';
  var video = $(videoId);

  var events = 'loadstart progress suspend abort error emptied stalled play pause loadedmetadata loadeddata waiting playing canplay canplaythrough seeking seeked timeupdate ended ratechange durationchange volumechange'.split(' '),
    i = events.length;

  while (i--) {
    video.addEventListener(events[i], echo, false);
  }

  var done = false;
  function echo(event) {
    if (video.videoWidth && !done) {
      console.log('fire on ' + event.type);
      renderVideo();
    }
  }


  var ctr = 0;
  var types = 'left center right'.split(' ');

  $.on('remoteOrientation', function (event) {
    clear();
    ctx.drawImage(positions[types[event.data.position]], 0, 0);
    actor.activePosition = types[event.data.position];
    videoWrapper.dataset.tilt = actor.activePosition;
    redrawAll();
  });

  return canvas;
}

function getPlayer(scene) {
  var material = new THREE.ParticleBasicMaterial({
    map: new THREE.Texture(generateSprite())
  });

  var height = 450,
      width = 400,
      scale = 0.675;

  var player = interactive.player = new THREE.Particle(material);
  player.position.y = ((height / 2) * scale) + actor.floor.position.y;
  player.position.z = -220;
  player.position.x = 7;
  player.scale.x = player.scale.y = scale;

  scene.add(player);

  return player;
}

function buildStaticObjects() {
  var container = getContainer('backdrop');
  var camera = background.camera = getCamera();

  var scene = background.scene = new THREE.Scene();
  scene.add(camera);

  var floor = actor.floor = getFloor(scene);

  // note: the floor must be created before getPlayer, as it's referred to
  // background.player = getPlayer(scene);

  var renderer = background.renderer = new THREE.CanvasRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);
  renderer.render(scene, camera);
  renderer.render(scene, camera);
}

function createInteractiveScene() {
  var container = getContainer();
  var scene = interactive.scene = new THREE.Scene();

  var camera = interactive.camera = getCamera();
  scene.add(camera);

  var renderer = interactive.renderer = new THREE.CanvasRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

  return scene;
}

function makePlane() {
  var material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe:true, wireframeLinewidth: 2 });

  var geom = new THREE.PlaneGeometry(1, 1, 10, 10);
  var plane = new THREE.Mesh(geom, material);

  return plane;
}

function setupDebug() {
  var p = makePlane();
  var b = makePlane();
  var h = makePlane();

  var showDebug = false,
      firsttime = true;
  var update = function (player, ball, hit) {
    if (showDebug) {
      if (firsttime) {
        interactive.scene.add(p);
        interactive.scene.add(b);
        interactive.scene.add(h);
        firsttime = false;
      }
      p.position.x = player.x + player.width / 2;
      p.position.y = player.y + player.height / 2;
      p.position.z = actor.player.position.z;
      p.scale.x = player.width;
      p.scale.y = player.height;

      b.position.x = ball.x + ball.width / 2;
      b.position.y = ball.y + ball.height / 2;
      b.position.z = actor.ball.position.z;
      b.scale.x = ball.width;
      b.scale.y = ball.height;

      h.position.x = hit.x + hit.width / 2;
      h.position.y = hit.y + hit.height / 2;
      h.position.z = actor.player.position.z;
      h.scale.x = hit.width;
      h.scale.y = hit.height;
    }
  };

  interactive.debug = {
    player: p,
    ball: b,
    hit: h,
    update: update
  };

}

function isObjectInTarget(rect1, rect2) {
  if ( ((rect1.x<rect2.x + rect2.width) && (rect1.x+rect1.width>rect2.x)) &&
       ((rect1.y<rect2.y + rect2.height) && (rect1.y+rect1.height > rect2.y)) ) {
    return true;
  } else {
    return false;
  }
}

function loop() {
  requestAnimationFrame(loop);

  if (!running) {
    return;
  }

  var ball = actor.ball,
      player = actor.player,
      b = {}, p = {}, h = {},
      dims = playerDimensions[actor.activePosition];

  var ballradius = ball.size;

  ball.updatePhysics();

  // bounce off the floor
  if (ball.position.y - ballradius < actor.floor.position.y) {
    ball.position.y = actor.floor.position.y+ballradius;
    ball.velocity.y *= -0.7;
  }

  var py = player.position.y + ((playerDimensions.height * player.scale.y) / 2),
      px = player.position.x - ((playerDimensions.width * player.scale.x) / 2);

  p = {
    width: dims.width * player.scale.x,
    height: dims.height * player.scale.y,
    x: px + (dims.x * player.scale.x),
    y: py - (dims.y * player.scale.y) - dims.height * player.scale.y
  };

  h = {
    width: dims.hit.width * player.scale.x,
    height: dims.hit.height * player.scale.y,
    x: px + (dims.hit.x * player.scale.x),
    y: py - (dims.hit.y * player.scale.y) - dims.hit.height * player.scale.y
  };

  b = {
    width: ballradius * 2,
    height: ballradius * 2,
    x: ball.position.x - ballradius,
    y: ball.position.y - ballradius
  };


  if ((ball.position.z - ballradius < player.position.z) && (ball.position.z - ballradius - ball.velocity.z > player.position.z)) {
    // if we hit the player, make the ball bounce backwards.
    if (isObjectInTarget(b, p)) {
      ball.velocity.z *= -0.7;
    }

    if (isObjectInTarget(b, h)) {
      hit();
    } else {
      // bring the video to the front
      videoWrapper.style.zIndex = 4;
    }
  }

  // only render whilst the ball is moving
  if (Math.abs(ball.velocity.z) > 0.1) {
    // interactive.debug.update(p, b, h);
    interactive.renderer.render(interactive.scene, interactive.camera);
  }

  if (window.stats) {
    stats.update();
  }

}


function initGame() {
  $('.panel').forEach(function (el) {
    el.classList.remove('show');
  });

  $('#playing').classList.add('show');

  window.addEventListener('resize', function () {
    var w = window.innerWidth,
        h = window.innerHeight;
    interactive.camera.aspect = w / h;
    interactive.camera.updateProjectionMatrix();
    interactive.renderer.setSize(w, h);
    background.camera.aspect = w / h;
    background.camera.updateProjectionMatrix();
    background.renderer.setSize(w, h);
    redrawAll();
  }, false /*yeah, like I need this, but heck, I'm a stickler for habits*/);

  document.body.addEventListener('touchmove', function (e) {
    e.preventDefault();
  });

  buildStaticObjects();
  var scene = interactive.scene = createInteractiveScene();

  var ball = actor.ball = new Ball(0.15);
  ball.drag = 0.985;


  var player = actor.player = getPlayer(interactive.scene);
  scene.add(player);

  resetBall();

  var track = new Track(document.body),
      waitforup = false;

  track.down = function (event) {
    waitforup = true;
    console.log('down', event.type);
  };
  track.up = function (event) {
    console.log('up', event.type);
    if (waitforup) {
      var x = track.x - track.momentumX;
      var y = (track.upY - track.downY) - track.momentumY;

      if (game.turn === true) {
        resetBall(track.downX, track.momentumX, y / window.height, track.duration);
      }
    }
    waitforup = false;
  };

  $.on('remoteThrow', function (event) {
    if (game.turn === false) {
      game.turns--;
      resetBall(event.data.posX, event.data.x, event.data.y, event.data.speed);
    }
  });

  $.on('remoteHit', function () {
    if (game.turn === false && game.turns) {
      game.them.score++;
    }
  });

  resetBall(window.innerWidth / 2);

  // setupDebug();

  // setInterval(loop, 1000 / 30);
  running = true;
  redrawAll();
  loop();
}


// returns a random number between the two limits provided
function randomRange(min, max){
  return ((Math.random()*(max-min)) + min);
}