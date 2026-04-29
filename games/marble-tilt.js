/**
 * Tilt maze — physics from Hunor Borbely’s tutorial (https://youtu.be/bTk6dcAckuI)
 */
(function () {
  Math.minmax = function (value, limit) {
    return Math.max(Math.min(value, limit), -limit);
  };

  var MAZE_W = 350;
  var MAZE_H = 315;

  function distance2D(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  function getAngle(p1, p2) {
    var angle = Math.atan((p2.y - p1.y) / (p2.x - p1.x));
    if (p2.x - p1.x < 0) angle += Math.PI;
    return angle;
  }

  var wallW;
  var ballSize;

  function closestItCanBe(cap, ball) {
    var angle = getAngle(cap, ball);
    var deltaX = Math.cos(angle) * (wallW / 2 + ballSize / 2);
    var deltaY = Math.sin(angle) * (wallW / 2 + ballSize / 2);
    return { x: cap.x + deltaX, y: cap.y + deltaY };
  }

  function rollAroundCap(cap, ball) {
    var impactAngle = getAngle(ball, cap);
    var heading = getAngle({ x: 0, y: 0 }, { x: ball.velocityX, y: ball.velocityY });
    var impactHeadingAngle = impactAngle - heading;
    var velocityMagnitude = distance2D({ x: 0, y: 0 }, { x: ball.velocityX, y: ball.velocityY });
    var velocityMagnitudeDiagonalToTheImpact = Math.sin(impactHeadingAngle) * velocityMagnitude;
    var closestDistance = wallW / 2 + ballSize / 2;
    var rotationAngle = Math.atan(velocityMagnitudeDiagonalToTheImpact / closestDistance);
    var deltaFromCap = {
      x: Math.cos(impactAngle + Math.PI - rotationAngle) * closestDistance,
      y: Math.sin(impactAngle + Math.PI - rotationAngle) * closestDistance,
    };
    var x = ball.x;
    var y = ball.y;
    var velocityX = ball.x - (cap.x + deltaFromCap.x);
    var velocityY = ball.y - (cap.y + deltaFromCap.y);
    var nextX = x + velocityX;
    var nextY = y + velocityY;
    return { x: x, y: y, velocityX: velocityX, velocityY: velocityY, nextX: nextX, nextY: nextY };
  }

  function slow(number, difference) {
    if (Math.abs(number) <= difference) return 0;
    if (number > difference) return number - difference;
    return number + difference;
  }

  var mazeElement = document.getElementById("tiltMaze");
  var joystickHeadElement = document.getElementById("tiltJoystickHead");
  var noteElement = document.getElementById("tiltNote");

  if (!mazeElement || !joystickHeadElement || !noteElement) return;

  var hardMode = false;
  var previousTimestamp;
  var gameInProgress;
  var mouseStartX;
  var mouseStartY;
  var accelerationX;
  var accelerationY;
  var frictionX;
  var frictionY;

  var pathW = 25;
  wallW = 10;
  ballSize = 10;
  var holeSize = 18;
  var debugMode = false;

  var balls = [];
  var ballElements = [];
  var holeElements = [];

  function resetGame() {
    previousTimestamp = undefined;
    gameInProgress = false;
    mouseStartX = undefined;
    mouseStartY = undefined;
    accelerationX = undefined;
    accelerationY = undefined;
    frictionX = undefined;
    frictionY = undefined;

    mazeElement.style.cssText = "transform: rotateY(0deg) rotateX(0deg);";

    joystickHeadElement.style.cssText =
      "left: 0; top: 0; animation: marble-tilt-glow 0.6s ease-in-out infinite alternate 4s; cursor: grab;";

    if (hardMode) {
      noteElement.innerHTML =
        "Click or drag the red knob to start!<p><strong>Hard mode</strong> — avoid black holes. Press E for easy.</p>";
    } else {
      noteElement.innerHTML =
        "Click or drag the red knob to start!<p>Roll every marble into the purple circle. <strong>H</strong> for hard mode. <strong>Space</strong> to reset.</p>";
    }
    noteElement.style.opacity = 1;

    balls = [
      { column: 0, row: 0 },
      { column: 9, row: 0 },
      { column: 0, row: 8 },
      { column: 9, row: 8 },
    ].map(function (ball) {
      return {
        x: ball.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
        y: ball.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
        velocityX: 0,
        velocityY: 0,
      };
    });

    if (ballElements.length) {
      balls.forEach(function (b, index) {
        ballElements[index].style.cssText = "left: " + b.x + "px; top: " + b.y + "px; ";
      });
    }

    holeElements.forEach(function (holeElement) {
      mazeElement.removeChild(holeElement);
    });
    holeElements = [];

    if (hardMode) {
      holes.forEach(function (h) {
        var el = document.createElement("div");
        el.setAttribute("class", "black-hole");
        el.style.cssText = "left: " + h.x + "px; top: " + h.y + "px; ";
        mazeElement.appendChild(el);
        holeElements.push(el);
      });
    }
  }

  var walls = [
    { column: 0, row: 0, horizontal: true, length: 10 },
    { column: 0, row: 0, horizontal: false, length: 9 },
    { column: 0, row: 9, horizontal: true, length: 10 },
    { column: 10, row: 0, horizontal: false, length: 9 },
    { column: 0, row: 6, horizontal: true, length: 1 },
    { column: 0, row: 8, horizontal: true, length: 1 },
    { column: 1, row: 1, horizontal: true, length: 2 },
    { column: 1, row: 7, horizontal: true, length: 1 },
    { column: 2, row: 2, horizontal: true, length: 2 },
    { column: 2, row: 4, horizontal: true, length: 1 },
    { column: 2, row: 5, horizontal: true, length: 1 },
    { column: 2, row: 6, horizontal: true, length: 1 },
    { column: 3, row: 3, horizontal: true, length: 1 },
    { column: 3, row: 8, horizontal: true, length: 3 },
    { column: 4, row: 6, horizontal: true, length: 1 },
    { column: 5, row: 2, horizontal: true, length: 2 },
    { column: 5, row: 7, horizontal: true, length: 1 },
    { column: 6, row: 1, horizontal: true, length: 1 },
    { column: 6, row: 6, horizontal: true, length: 2 },
    { column: 7, row: 3, horizontal: true, length: 2 },
    { column: 7, row: 7, horizontal: true, length: 2 },
    { column: 8, row: 1, horizontal: true, length: 1 },
    { column: 8, row: 2, horizontal: true, length: 1 },
    { column: 8, row: 3, horizontal: true, length: 1 },
    { column: 8, row: 4, horizontal: true, length: 2 },
    { column: 8, row: 8, horizontal: true, length: 2 },
    { column: 1, row: 1, horizontal: false, length: 2 },
    { column: 1, row: 4, horizontal: false, length: 2 },
    { column: 2, row: 2, horizontal: false, length: 2 },
    { column: 2, row: 5, horizontal: false, length: 1 },
    { column: 2, row: 7, horizontal: false, length: 2 },
    { column: 3, row: 0, horizontal: false, length: 1 },
    { column: 3, row: 4, horizontal: false, length: 1 },
    { column: 3, row: 6, horizontal: false, length: 2 },
    { column: 4, row: 1, horizontal: false, length: 2 },
    { column: 4, row: 6, horizontal: false, length: 1 },
    { column: 5, row: 0, horizontal: false, length: 2 },
    { column: 5, row: 6, horizontal: false, length: 1 },
    { column: 5, row: 8, horizontal: false, length: 1 },
    { column: 6, row: 4, horizontal: false, length: 1 },
    { column: 6, row: 6, horizontal: false, length: 1 },
    { column: 7, row: 1, horizontal: false, length: 4 },
    { column: 7, row: 7, horizontal: false, length: 2 },
    { column: 8, row: 2, horizontal: false, length: 1 },
    { column: 8, row: 4, horizontal: false, length: 2 },
    { column: 9, row: 1, horizontal: false, length: 1 },
    { column: 9, row: 5, horizontal: false, length: 2 },
  ].map(function (wall) {
    return {
      x: wall.column * (pathW + wallW),
      y: wall.row * (pathW + wallW),
      horizontal: wall.horizontal,
      length: wall.length * (pathW + wallW),
    };
  });

  walls.forEach(function (w) {
    var wall = document.createElement("div");
    wall.setAttribute("class", "wall");
    wall.style.cssText =
      "left: " +
      w.x +
      "px; top: " +
      w.y +
      "px; width: " +
      wallW +
      "px; height: " +
      w.length +
      "px; transform: rotate(" +
      (w.horizontal ? -90 : 0) +
      "deg);";
    mazeElement.appendChild(wall);
  });

  var holes = [
    { column: 0, row: 5 },
    { column: 2, row: 0 },
    { column: 2, row: 4 },
    { column: 4, row: 6 },
    { column: 6, row: 2 },
    { column: 6, row: 8 },
    { column: 8, row: 1 },
    { column: 8, row: 2 },
  ].map(function (hole) {
    return {
      x: hole.column * (wallW + pathW) + (wallW / 2 + pathW / 2),
      y: hole.row * (wallW + pathW) + (wallW / 2 + pathW / 2),
    };
  });

  resetGame();

  balls.forEach(function (b) {
    var ball = document.createElement("div");
    ball.setAttribute("class", "ball");
    ball.style.cssText = "left: " + b.x + "px; top: " + b.y + "px; ";
    mazeElement.appendChild(ball);
    ballElements.push(ball);
  });

  function beginPlay(clientX, clientY) {
    if (!gameInProgress) {
      mouseStartX = clientX;
      mouseStartY = clientY;
      gameInProgress = true;
      window.requestAnimationFrame(main);
      noteElement.style.opacity = 0;
      joystickHeadElement.style.cssText = "animation: none; cursor: grabbing;";
      if (typeof KidsCore !== "undefined") {
        KidsCore.playSound("tap");
        KidsCore.haptic("light");
      }
    }
  }

  function applyTilt(clientX, clientY) {
    if (!gameInProgress) return;
    var mouseDeltaX = -Math.minmax(mouseStartX - clientX, 15);
    var mouseDeltaY = -Math.minmax(mouseStartY - clientY, 15);

    joystickHeadElement.style.cssText =
      "left: " +
      mouseDeltaX +
      "px; top: " +
      mouseDeltaY +
      "px; animation: none; cursor: grabbing;";

    var rotationY = mouseDeltaX * 0.8;
    var rotationX = mouseDeltaY * 0.8;

    mazeElement.style.cssText =
      "transform: rotateY(" + rotationY + "deg) rotateX(" + -rotationX + "deg);";

    var gravity = 2;
    var friction = 0.01;
    accelerationX = gravity * Math.sin((rotationY / 180) * Math.PI);
    accelerationY = gravity * Math.sin((rotationX / 180) * Math.PI);
    frictionX = gravity * Math.cos((rotationY / 180) * Math.PI) * friction;
    frictionY = gravity * Math.cos((rotationX / 180) * Math.PI) * friction;
  }

  joystickHeadElement.addEventListener("mousedown", function (event) {
    beginPlay(event.clientX, event.clientY);
  });

  joystickHeadElement.addEventListener("pointerdown", function (event) {
    if (typeof event.pointerType === "string" && event.pointerType !== "mouse") {
      event.preventDefault();
    }
    beginPlay(event.clientX, event.clientY);
    try {
      joystickHeadElement.setPointerCapture(event.pointerId);
    } catch (e) {}
  });

  function onMove(event) {
    applyTilt(event.clientX, event.clientY);
  }

  window.addEventListener("mousemove", onMove);

  window.addEventListener(
    "pointermove",
    function (event)     {
      if (!gameInProgress) return;
      if (joystickHeadElement.hasPointerCapture && joystickHeadElement.hasPointerCapture(event.pointerId)) {
        applyTilt(event.clientX, event.clientY);
      }
    },
    { passive: true }
  );

  joystickHeadElement.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      var r = joystickHeadElement.getBoundingClientRect();
      beginPlay(r.left + r.width / 2, r.top + r.height / 2);
    }
  });

  window.addEventListener("keydown", function (event) {
    if (![" ", "H", "h", "E", "e"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === " ") {
      resetGame();
      return;
    }
    if (event.key === "H" || event.key === "h") {
      hardMode = true;
      resetGame();
      return;
    }
    if (event.key === "E" || event.key === "e") {
      hardMode = false;
      resetGame();
    }
  });

  function main(timestamp) {
    if (!gameInProgress) return;

    if (previousTimestamp === undefined) {
      previousTimestamp = timestamp;
      window.requestAnimationFrame(main);
      return;
    }

    var maxVelocity = 1.5;
    var timeElapsed = (timestamp - previousTimestamp) / 16;

    try {
      if (accelerationX != undefined && accelerationY != undefined) {
        var velocityChangeX = accelerationX * timeElapsed;
        var velocityChangeY = accelerationY * timeElapsed;
        var frictionDeltaX = frictionX * timeElapsed;
        var frictionDeltaY = frictionY * timeElapsed;

        balls.forEach(function (ball) {
          if (velocityChangeX == 0) {
            ball.velocityX = slow(ball.velocityX, frictionDeltaX);
          } else {
            ball.velocityX = ball.velocityX + velocityChangeX;
            ball.velocityX = Math.max(Math.min(ball.velocityX, 1.5), -1.5);
            ball.velocityX = ball.velocityX - Math.sign(velocityChangeX) * frictionDeltaX;
            ball.velocityX = Math.minmax(ball.velocityX, maxVelocity);
          }

          if (velocityChangeY == 0) {
            ball.velocityY = slow(ball.velocityY, frictionDeltaY);
          } else {
            ball.velocityY = ball.velocityY + velocityChangeY;
            ball.velocityY = ball.velocityY - Math.sign(velocityChangeY) * frictionDeltaY;
            ball.velocityY = Math.minmax(ball.velocityY, maxVelocity);
          }

          ball.nextX = ball.x + ball.velocityX;
          ball.nextY = ball.y + ball.velocityY;

          walls.forEach(function (wall, wi) {
            var wallStart;
            var wallEnd;
            var distance;
            var closest;
            var rolled;
            if (wall.horizontal) {
              if (
                ball.nextY + ballSize / 2 >= wall.y - wallW / 2 &&
                ball.nextY - ballSize / 2 <= wall.y + wallW / 2
              ) {
                wallStart = { x: wall.x, y: wall.y };
                wallEnd = { x: wall.x + wall.length, y: wall.y };

                if (ball.nextX + ballSize / 2 >= wallStart.x - wallW / 2 && ball.nextX < wallStart.x) {
                  distance = distance2D(wallStart, { x: ball.nextX, y: ball.nextY });
                  if (distance < ballSize / 2 + wallW / 2) {
                    closest = closestItCanBe(wallStart, { x: ball.nextX, y: ball.nextY });
                    rolled = rollAroundCap(wallStart, {
                      x: closest.x,
                      y: closest.y,
                      velocityX: ball.velocityX,
                      velocityY: ball.velocityY,
                    });
                    Object.assign(ball, rolled);
                  }
                }

                if (ball.nextX - ballSize / 2 <= wallEnd.x + wallW / 2 && ball.nextX > wallEnd.x) {
                  distance = distance2D(wallEnd, { x: ball.nextX, y: ball.nextY });
                  if (distance < ballSize / 2 + wallW / 2) {
                    closest = closestItCanBe(wallEnd, { x: ball.nextX, y: ball.nextY });
                    rolled = rollAroundCap(wallEnd, {
                      x: closest.x,
                      y: closest.y,
                      velocityX: ball.velocityX,
                      velocityY: ball.velocityY,
                    });
                    Object.assign(ball, rolled);
                  }
                }

                if (ball.nextX >= wallStart.x && ball.nextX <= wallEnd.x) {
                  if (ball.nextY < wall.y) {
                    ball.nextY = wall.y - wallW / 2 - ballSize / 2;
                  } else {
                    ball.nextY = wall.y + wallW / 2 + ballSize / 2;
                  }
                  ball.y = ball.nextY;
                  ball.velocityY = -ball.velocityY / 3;
                }
              }
            } else {
              if (
                ball.nextX + ballSize / 2 >= wall.x - wallW / 2 &&
                ball.nextX - ballSize / 2 <= wall.x + wallW / 2
              ) {
                wallStart = { x: wall.x, y: wall.y };
                wallEnd = { x: wall.x, y: wall.y + wall.length };

                if (ball.nextY + ballSize / 2 >= wallStart.y - wallW / 2 && ball.nextY < wallStart.y) {
                  distance = distance2D(wallStart, { x: ball.nextX, y: ball.nextY });
                  if (distance < ballSize / 2 + wallW / 2) {
                    closest = closestItCanBe(wallStart, { x: ball.nextX, y: ball.nextY });
                    rolled = rollAroundCap(wallStart, {
                      x: closest.x,
                      y: closest.y,
                      velocityX: ball.velocityX,
                      velocityY: ball.velocityY,
                    });
                    Object.assign(ball, rolled);
                  }
                }

                if (ball.nextY - ballSize / 2 <= wallEnd.y + wallW / 2 && ball.nextY > wallEnd.y) {
                  distance = distance2D(wallEnd, { x: ball.nextX, y: ball.nextY });
                  if (distance < ballSize / 2 + wallW / 2) {
                    closest = closestItCanBe(wallEnd, { x: ball.nextX, y: ball.nextY });
                    rolled = rollAroundCap(wallEnd, {
                      x: closest.x,
                      y: closest.y,
                      velocityX: ball.velocityX,
                      velocityY: ball.velocityY,
                    });
                    Object.assign(ball, rolled);
                  }
                }

                if (ball.nextY >= wallStart.y && ball.nextY <= wallEnd.y) {
                  if (ball.nextX < wall.x) {
                    ball.nextX = wall.x - wallW / 2 - ballSize / 2;
                  } else {
                    ball.nextX = wall.x + wallW / 2 + ballSize / 2;
                  }
                  ball.x = ball.nextX;
                  ball.velocityX = -ball.velocityX / 3;
                }
              }
            }
          });

          if (hardMode) {
            holes.forEach(function (hole, hi) {
              var dist = distance2D(hole, { x: ball.nextX, y: ball.nextY });
              if (dist <= holeSize / 2) {
                holeElements[hi].style.backgroundColor = "red";
                throw new Error("The ball fell into a hole");
              }
            });
          }

          ball.x = ball.x + ball.velocityX;
          ball.y = ball.y + ball.velocityY;
        });

        balls.forEach(function (b, index) {
          ballElements[index].style.cssText = "left: " + b.x + "px; top: " + b.y + "px; ";
        });
      }

      if (
        balls.every(function (ball) {
          return distance2D(ball, { x: MAZE_W / 2, y: MAZE_H / 2 }) < 65 / 2;
        })
      ) {
        noteElement.innerHTML =
          "<strong>Nice!</strong> All marbles home." +
          (!hardMode ? "<p>Press <strong>H</strong> for hard mode (black holes).</p>" : "") +
          "<p>Press <strong>Space</strong> to play again.</p>";
        noteElement.style.opacity = 1;
        gameInProgress = false;
        if (typeof KidsCore !== "undefined") {
          KidsCore.recordGame("marble-tilt");
          KidsCore.playSound("win");
          KidsCore.haptic("success");
        }
      } else {
        previousTimestamp = timestamp;
        window.requestAnimationFrame(main);
      }
    } catch (error) {
      if (error.message == "The ball fell into a hole") {
        noteElement.innerHTML =
          "Oops — a marble fell in a hole.<p><strong>Space</strong> resets. <strong>E</strong> for easy mode.</p>";
        noteElement.style.opacity = 1;
        gameInProgress = false;
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("no");
          KidsCore.haptic("light");
        }
      } else throw error;
    }
  }

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }
})();
