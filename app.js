(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var stage = document.getElementById("stage");
  var buddyEl = document.getElementById("buddy");
  var buddyFigure = document.getElementById("buddy-figure");
  var eyeL = document.getElementById("eye-l");
  var eyeR = document.getElementById("eye-r");
  var mouthEl = document.getElementById("mouth");
  var speechEl = document.getElementById("buddy-speech");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CLICK_LINES = [
    "wheee!",
    "careful, I bruise easy.",
    "this is my cardio.",
  ];
  var ESCALATION_LINES = [
    "please just check my GitHub, stop playing with me 🙂",
    "LinkedIn this GitHub that",
  ];
  var THROW_LINES = ["wheee!", "redbull sponsor me!", "put me down!"];
  var IDLE_LINES = [
    "...so, GitHub?",
    "bruh",
	"*whirlpooling*",
	"*vibing*",
	"don't worry i haven't installed a bitcoin miner",
  ];

  var lastSpeechLine = null;
  function randomLine(pool) {
    if (pool.length === 1) return pool[0];
    var line;
    do {
      line = pool[Math.floor(Math.random() * pool.length)];
    } while (line === lastSpeechLine);
    lastSpeechLine = line;
    return line;
  }

  var speechHideTimer = null;
  var speechFollowRAF = null;
  var BUBBLE_GAP = 14;
  var BUDDY_HEAD_Y_OFFSET = 20; // matches the head circle's cy in the buddy SVG viewBox

  function positionSpeech() {
    var x, y;
    if (buddyBody) {
      // Physics mode: use the body's translation only, ignoring its rotation,
      // so the bubble doesn't jitter as the buddy tumbles.
      x = buddyBody.position.x + buddyW / 2 + BUBBLE_GAP;
      y = buddyBody.position.y - buddyH / 2 + BUDDY_HEAD_Y_OFFSET;
    } else {
      // Static fallback: buddyEl's own box, offset from its positioned ancestor (#stage).
      x = buddyEl.offsetLeft + buddyEl.offsetWidth + BUBBLE_GAP;
      y = buddyEl.offsetTop + BUDDY_HEAD_Y_OFFSET;
    }
    speechEl.style.transform = "translate(" + x + "px, " + y + "px) translate(0, -50%)";
  }

  function followSpeech() {
    positionSpeech();
    speechFollowRAF = requestAnimationFrame(followSpeech);
  }

  function showSpeech(text) {
    speechEl.textContent = text;
    positionSpeech();
    speechEl.classList.add("visible");
    if (!reduceMotion) mouthEl.classList.add("talking");
    if (speechFollowRAF) cancelAnimationFrame(speechFollowRAF);
    followSpeech();
    clearTimeout(speechHideTimer);
    speechHideTimer = setTimeout(function () {
      speechEl.classList.remove("visible");
      mouthEl.classList.remove("talking");
      if (speechFollowRAF) {
        cancelAnimationFrame(speechFollowRAF);
        speechFollowRAF = null;
      }
    }, 2200);
  }

  var interactionTimestamps = [];
  var INTERACTION_WINDOW_MS = 8000;
  var ESCALATION_THRESHOLD = 4;
  var lastInteractionAt = Date.now();

  function registerInteraction() {
    var now = Date.now();
    lastInteractionAt = now;
    interactionTimestamps.push(now);
    interactionTimestamps = interactionTimestamps.filter(function (t) {
      return now - t < INTERACTION_WINDOW_MS;
    });
    return interactionTimestamps.length;
  }

  if (!reduceMotion) {
    var idleNagCooldownUntil = 0;
    var IDLE_THRESHOLD_MS = 10000;
    var IDLE_COOLDOWN_MS = 10000;
    setInterval(function () {
      var now = Date.now();
      if (now - lastInteractionAt >= IDLE_THRESHOLD_MS && now >= idleNagCooldownUntil) {
        showSpeech(randomLine(IDLE_LINES));
        idleNagCooldownUntil = now + IDLE_COOLDOWN_MS;
      }
    }, 2000);

    (function scheduleBlink() {
      var delay = 2500 + Math.random() * 3500;
      setTimeout(function () {
        eyeL.classList.add("blink");
        eyeR.classList.add("blink");
        setTimeout(function () {
          eyeL.classList.remove("blink");
          eyeR.classList.remove("blink");
          scheduleBlink();
        }, 120);
      }, delay);
    })();
  }

  buddyEl.addEventListener("click", function () {
    buddyFigure.classList.remove("buddy-bounce");
    void buddyFigure.offsetWidth; // restart animation
    buddyFigure.classList.add("buddy-bounce");
    buddyFigure.classList.remove("buddy-idle");

    var count = registerInteraction();
    var pool = count >= ESCALATION_THRESHOLD ? ESCALATION_LINES : CLICK_LINES;
    showSpeech(randomLine(pool));
  });

  if (reduceMotion || typeof Matter === "undefined") {
    // Static fallback: stack chips in reading order, no physics.
    var y = 24;
    chips.forEach(function (chip) {
      chip.style.left = "24px";
      chip.style.top = y + "px";
      chip.classList.add("ready");
      y += chip.getBoundingClientRect().height + 8;
    });
    buddyEl.style.left = "24px";
    buddyEl.style.top = y + "px";
    buddyEl.classList.add("ready");
    return;
  }

  var Engine = Matter.Engine,
    World = Matter.Composite,
    Bodies = Matter.Bodies,
    Runner = Matter.Runner,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

  var engine = Engine.create();
  engine.gravity.y = 1;

  var W = window.innerWidth;
  var H = window.innerHeight;
  var wallOpts = { isStatic: true, restitution: 0.55, friction: 0.7 };

  var ground = Bodies.rectangle(W / 2, H + 40, W * 2, 80, wallOpts);
  var leftWall = Bodies.rectangle(-40, H / 2, 80, H * 2, wallOpts);
  var rightWall = Bodies.rectangle(W + 40, H / 2, 80, H * 2, wallOpts);

  var buddyW = 56;
  var buddyH = 110;
  var buddyBody = Bodies.rectangle(150, H - buddyH / 2, buddyW, buddyH, {
    restitution: 0.3,
    friction: 0.7,
    chamfer: { radius: 6 },
  });
  Matter.Body.setInertia(buddyBody, Infinity);

  World.add(engine.world, [ground, leftWall, rightWall, buddyBody]);
  buddyEl.classList.add("ready");

  var bodies = [{ body: buddyBody, el: buddyEl, w: buddyW, h: buddyH }];

  chips.forEach(function (chip, i) {
    var order = chips.length - 1 - i;
    var rect = chip.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    var startLeft = 20 + Math.random() * Math.min(260, W * 0.3);
    var startX = startLeft + w / 2;
    var startY = -150 - order * 90;
    var startAngle = (Math.random() - 0.5) * 0.12;

    var body = Bodies.rectangle(startX, startY, w, h, {
      restitution: 0.6,
      friction: 0.5,
      frictionAir: 0.012,
      angle: startAngle,
      chamfer: { radius: 2 },
    });
    Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 3, y: 0 });

    bodies.push({ body: body, el: chip, w: w, h: h });

    setTimeout(function () {
      World.add(engine.world, body);
      chip.classList.add("ready");
    }, order * 100);
  });

  var runner = Runner.create();
  Runner.run(runner, engine);

  // Matter's mouse constraint grabs touches on chips before the browser can
  // turn them into a click, which silently swallows taps on the links inside
  // them (only noticeable on touch devices, not with a mouse). Stop those
  // events in the capture phase so they never reach Matter's handlers.
  function letLinksThrough(e) {
    if (e.target.closest("a")) e.stopPropagation();
  }
  stage.addEventListener("touchstart", letLinksThrough, true);
  stage.addEventListener("mousedown", letLinksThrough, true);

  var mouse = Mouse.create(stage);
  var mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } },
  });
  World.add(engine.world, mouseConstraint);

  var buddyDragMoved = false;
  var buddyDragStart = null;

  function onBuddyDragMove() {
    if (!buddyDragStart) return;
    var dx = mouse.position.x - buddyDragStart.x;
    var dy = mouse.position.y - buddyDragStart.y;
    if (!buddyDragMoved && dx * dx + dy * dy > 16) {
      buddyDragMoved = true;
      buddyFigure.classList.add("buddy-dragging");
    }
  }

  Matter.Events.on(mouseConstraint, "startdrag", function (e) {
    if (e.body !== buddyBody) return;
    buddyFigure.classList.remove("buddy-idle");
    buddyDragMoved = false;
    buddyDragStart = { x: mouse.position.x, y: mouse.position.y };
    document.addEventListener("mousemove", onBuddyDragMove);
    document.addEventListener("touchmove", onBuddyDragMove);
  });

  Matter.Events.on(mouseConstraint, "enddrag", function (e) {
    if (e.body !== buddyBody) return;
    document.removeEventListener("mousemove", onBuddyDragMove);
    document.removeEventListener("touchmove", onBuddyDragMove);
    buddyFigure.classList.remove("buddy-dragging");
    if (buddyDragMoved) {
      buddyFigure.classList.add("buddy-falling");
      registerInteraction();
      showSpeech(randomLine(THROW_LINES));
    }
    buddyDragStart = null;
  });

  Matter.Events.on(engine, "collisionStart", function (e) {
    for (var i = 0; i < e.pairs.length; i++) {
      var pair = e.pairs[i];
      if (pair.bodyA === buddyBody || pair.bodyB === buddyBody) {
        if (buddyFigure.classList.contains("buddy-falling")) {
          buddyFigure.classList.remove("buddy-falling");
          buddyFigure.classList.add("buddy-landed");
          setTimeout(function () {
            buddyFigure.classList.remove("buddy-landed");
          }, 300);
        }
        break;
      }
    }
  });

  var restingSince = null;
  var RESTING_SPEED_THRESHOLD = 0.05;
  var RESTING_DELAY_MS = 1000;

  function sync() {
    bodies.forEach(function (b) {
      var x = b.body.position.x - b.w / 2;
      var y = b.body.position.y - b.h / 2;
      b.el.style.transform =
        "translate3d(" + x + "px, " + y + "px, 0) rotate(" + b.body.angle + "rad)";
    });

    if (!reduceMotion) {
      if (buddyBody.speed < RESTING_SPEED_THRESHOLD) {
        if (restingSince === null) {
          restingSince = performance.now();
        } else if (
          !buddyFigure.classList.contains("buddy-idle") &&
          performance.now() - restingSince > RESTING_DELAY_MS
        ) {
          buddyFigure.classList.add("buddy-idle");
        }
      } else {
        restingSince = null;
        buddyFigure.classList.remove("buddy-idle");
      }
    }

    requestAnimationFrame(sync);
  }
  requestAnimationFrame(sync);
})();
