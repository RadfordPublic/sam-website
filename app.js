(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var stage = document.getElementById("stage");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || typeof Matter === "undefined") {
    // Static fallback: stack chips in reading order, no physics.
    var y = 24;
    chips.forEach(function (chip) {
      chip.style.left = "24px";
      chip.style.top = y + "px";
      chip.classList.add("ready");
      y += chip.getBoundingClientRect().height + 8;
    });
    return;
  }

  var Engine = Matter.Engine,
    World = Matter.Composite,
    Bodies = Matter.Bodies,
    Runner = Matter.Runner;

  var engine = Engine.create();
  engine.gravity.y = 1;

  var W = window.innerWidth;
  var H = window.innerHeight;
  var wallOpts = { isStatic: true, restitution: 0.55, friction: 0.7 };

  var ground = Bodies.rectangle(W / 2, H + 40, W * 2, 80, wallOpts);
  var leftWall = Bodies.rectangle(-40, H / 2, 80, H * 2, wallOpts);
  var rightWall = Bodies.rectangle(W + 40, H / 2, 80, H * 2, wallOpts);
  World.add(engine.world, [ground, leftWall, rightWall]);

  var bodies = [];

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

  function sync() {
    bodies.forEach(function (b) {
      var x = b.body.position.x - b.w / 2;
      var y = b.body.position.y - b.h / 2;
      b.el.style.transform =
        "translate3d(" + x + "px, " + y + "px, 0) rotate(" + b.body.angle + "rad)";
    });
    requestAnimationFrame(sync);
  }
  requestAnimationFrame(sync);
})();
