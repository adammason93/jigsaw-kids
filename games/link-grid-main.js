function WinAnimation(x, y) {
  this.x = x;
  this.y = y;
  this.startTime = new Date();
  this.isPlaying = true;
}
var winDuration = 1000;
var winProto = WinAnimation.prototype;
winProto.update = function updateWinAnim() {
  if (!this.isPlaying) return;
  this.t = (new Date() - this.startTime) / winDuration;
  this.isPlaying = this.t <= 1;
};
winProto.render = function renderWinAnim(ctx) {
  if (!this.isPlaying) return;
  ctx.save();
  ctx.translate(this.x, this.y);
  this.renderBurst(ctx);
  ctx.save();
  ctx.scale(0.5, -0.5);
  this.renderBurst(ctx);
  ctx.restore();
  ctx.restore();
};
winProto.renderBurst = function (ctx) {
  var t = this.t;
  var dt = 1 - t;
  var easeT = 1 - dt * dt * dt * dt * dt * dt * dt * dt;
  var dy = easeT * -100;
  var scale = (1 - t * t * t) * 1.5;
  var spin = Math.PI * 1 * t * t * t;
  for (var i = 0; i < 5; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 5);
    ctx.translate(0, dy);
    ctx.scale(scale, scale);
    ctx.rotate(spin);
    renderWinStar(ctx);
    ctx.restore();
  }
};
function renderWinStar(ctx) {
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = "hsla(50, 100%, 50%, 1)";
  ctx.strokeStyle = "hsla(50, 100%, 50%, 1)";
  ctx.beginPath();
  for (var i = 0; i < 11; i++) {
    var theta = (Math.PI * 2 * i) / 10 + Math.PI / 2;
    var radius = i % 2 ? 20 : 10;
    var dx = Math.cos(theta) * radius;
    var dy = Math.sin(theta) * radius;
    ctx[i ? "lineTo" : "moveTo"](dx, dy);
  }
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
}

var canvas = document.querySelector(".link-grid-playfield canvas");
var ctx = canvas.getContext("2d");

var canvasSize = Math.min(window.innerWidth, window.innerHeight);
var canvasWidth = (canvas.width = window.innerWidth * 2);
var canvasHeight = (canvas.height = window.innerHeight * 2);
var maze;
var PI = Math.PI;
var mainTAU = PI * 2;
var dragAngle = null;
var cubDragMove = null;
var isCubHovered = false;
var isCubDragging = false;
var winAnim;
var unipointer = new Unipointer();

var gridSize = Math.min(40, canvasSize / 12);
var mazeCenter = {
  x: canvasWidth / 4,
  y: Math.min(gridSize * 8, canvasHeight / 4),
};

var instructElem = document.querySelector(".instruction");
if (instructElem) instructElem.style.top = mazeCenter.y + gridSize * 5.5 + "px";

var levelList = document.querySelector(".level-list");
var levelsElem = document.querySelector(".levels");
var levels = [];

(function buildLevelList() {
  var levelPres = levelsElem.querySelectorAll("pre");
  var fragment = document.createDocumentFragment();
  for (var i = 0; i < levelPres.length; i++) {
    var pre = levelPres[i];
    var listItem = document.createElement("li");
    listItem.className = "level-list__item";
    var id = pre.id;
    listItem.innerHTML =
      '<span class="level-list__item__number">' +
      (i + 1) +
      '</span> <span class="level-list__item__blurb">' +
      pre.getAttribute("data-blurb") +
      '</span><span class="level-list__item__check">✔</span>';
    listItem.setAttribute("data-id", id);
    fragment.appendChild(listItem);
    levels.push(id);
  }
  levelList.appendChild(fragment);
})();

var levelSelectButton = document.querySelector(".level-select-button");
var nextLevelButton = document.querySelector(".next-level-button");

if (levelSelectButton) {
  levelSelectButton.addEventListener("click", function () {
    levelList.classList.add("is-open");
  });
}

if (nextLevelButton) nextLevelButton.style.top = mazeCenter.y + gridSize * 5.5 + "px";

levelList.addEventListener("click", function (event) {
  var item = getParent(event.target, ".level-list__item");
  if (!item) return;
  loadLevel(item.getAttribute("data-id"));
});

function getParent(elem, selector) {
  var parent = elem;
  while (parent != document.body) {
    if (parent.matches && parent.matches(selector)) return parent;
    parent = parent.parentNode;
  }
}

function loadLevel(id) {
  var pre = levelsElem.querySelector("#" + id);
  maze = new Maze();
  maze.id = id;
  if (!pre) {
    console.error("pre not found for " + id);
    return;
  }
  maze.loadText(pre.textContent);
  levelList.classList.remove("is-open");
  if (nextLevelButton) nextLevelButton.classList.remove("is-open");
  window.scrollTo(0, 0);
  var previousItem = levelList.querySelector(".is-playing");
  if (previousItem) previousItem.classList.remove("is-playing");
  var cur = levelList.querySelector('[data-id="' + id + '"]');
  if (cur) cur.classList.add("is-playing");
  localStorage.setItem("linkGridCurrentLevel", id);
  syncCanvasOffsets();
}

var initialLevel = localStorage.getItem("linkGridCurrentLevel") || levels[0];
if (levels.indexOf(initialLevel) === -1) initialLevel = levels[0];
loadLevel(initialLevel);

var canvasLeft = 0;
var canvasTop = 0;
function syncCanvasOffsets() {
  var rect = canvas.getBoundingClientRect();
  canvasLeft = rect.left + window.scrollX;
  canvasTop = rect.top + window.scrollY;
}
window.addEventListener("resize", syncCanvasOffsets);
syncCanvasOffsets();

unipointer.bindStartEvent(canvas);
window.addEventListener("mousemove", onHoverMousemove);
animate();

var cubDrag = {};
var dragStartAngle;
var dragStartMazeAngle;
var moveAngle;
var mazeRotate = {};
var pointerBehavior;

unipointer.pointerDown = function (event, pointer) {
  event.preventDefault();
  pointerBehavior = getIsInsideCub(pointer) ? cubDrag : mazeRotate;
  pointerBehavior.pointerDown(event, pointer);
  this._bindPostStartEvents(event);
};

function getIsInsideCub(pointer) {
  var position = getCanvasMazePosition(pointer);
  var ox = cub[maze.orientation].x * gridSize;
  var oy = cub[maze.orientation].y * gridSize;
  var cubDeltaX = Math.abs(position.x - ox);
  var cubDeltaY = Math.abs(position.y - oy);
  var bound = gridSize * 1.5;
  return cubDeltaX <= bound && cubDeltaY <= bound;
}

function getCanvasMazePosition(pointer) {
  var canvasX = pointer.pageX - canvasLeft;
  var canvasY = pointer.pageY - canvasTop;
  return {
    x: canvasX - mazeCenter.x,
    y: canvasY - mazeCenter.y,
  };
}

unipointer.pointerMove = function (event, pointer) {
  pointerBehavior.pointerMove(event, pointer);
};
unipointer.pointerUp = function (event, pointer) {
  pointerBehavior.pointerUp(event, pointer);
  this._unbindPostStartEvents();
};

var dragStartPosition;
var dragStartPegPosition;
var rotatePointer;

cubDrag.pointerDown = function (event, pointer) {
  var segments = getCubConnections();
  if (!segments || !segments.length) return;
  isCubDragging = true;
  dragStartPosition = { x: pointer.pageX, y: pointer.pageY };
  dragStartPegPosition = {
    x: cub[maze.orientation].x * gridSize + mazeCenter.x,
    y: cub[maze.orientation].y * gridSize + mazeCenter.y,
  };
  document.body.classList.add("is-cub-dragging");
};
cubDrag.pointerMove = function (event, pointer) {
  if (!isCubDragging) return;
  cubDragMove = {
    x: pointer.pageX - dragStartPosition.x,
    y: pointer.pageY - dragStartPosition.y,
  };
};
cubDrag.pointerUp = function () {
  cubDragMove = null;
  document.body.classList.remove("is-cub-dragging");
  isCubDragging = false;
  cub.setOffset({ x: 0, y: 0 }, maze.orientation);
  if (cub.peg.x == maze.goalPosition.x && cub.peg.y == maze.goalPosition.y) {
    completeLevel();
  }
};

mazeRotate.pointerDown = function (event, pointer) {
  dragStartAngle = moveAngle = getDragAngle(pointer);
  dragStartMazeAngle = maze.flyWheel.angle;
  dragAngle = dragStartMazeAngle;
  rotatePointer = pointer;
};
function getDragAngle(pointer) {
  var position = getCanvasMazePosition(pointer);
  return normalizeAngle(Math.atan2(position.y, position.x));
}
mazeRotate.pointerMove = function (event, pointer) {
  rotatePointer = pointer;
  moveAngle = getDragAngle(pointer);
  var deltaAngle = moveAngle - dragStartAngle;
  dragAngle = normalizeAngle(dragStartMazeAngle + deltaAngle);
};
mazeRotate.pointerUp = function () {
  dragAngle = null;
  rotatePointer = null;
};

function animate() {
  update();
  render();
  requestAnimationFrame(animate);
}

function update() {
  dragCub();
  if (dragAngle) maze.flyWheel.setAngle(dragAngle);
  else maze.attractAlignFlyWheel();
  maze.update();
  if (winAnim) winAnim.update();
}

function dragCub() {
  if (!cubDragMove) return;
  var segments = getCubConnections();
  if (!segments || !segments.length) return;
  var dragPosition = {
    x: dragStartPegPosition.x + cubDragMove.x,
    y: dragStartPegPosition.y + cubDragMove.y,
  };
  var dragPeg = getDragPeg(segments, dragPosition);
  cub.setPeg(dragPeg, maze.orientation);
  var cubDragPosition = getDragPosition(segments, dragPosition);
  var cubPosition = getCubPosition();
  cub.setOffset(
    {
      x: cubDragPosition.x - cubPosition.x,
      y: cubDragPosition.y - cubPosition.y,
    },
    maze.orientation,
  );
}

function getCubPosition() {
  return {
    x: cub[maze.orientation].x * gridSize + mazeCenter.x,
    y: cub[maze.orientation].y * gridSize + mazeCenter.y,
  };
}
function getCubConnections() {
  var pegX = cub[maze.orientation].x;
  var pegY = cub[maze.orientation].y;
  var key = maze.orientation + ":" + pegX + "," + pegY;
  return maze.connections[key];
}
function getDragPosition(segments, dragPosition) {
  if (segments.length == 1) return getSegmentDragPosition(segments[0], dragPosition);
  var dragCandidates = segments.map(function (segment) {
    var position = getSegmentDragPosition(segment, dragPosition);
    return { position: position, distance: getDistance(dragPosition, position) };
  });
  dragCandidates.sort(distanceSorter);
  return dragCandidates[0].position;
}
function getSegmentDragPosition(segment, dragPosition) {
  var line = segment[maze.orientation];
  var isHorizontal = line.a.y == line.b.y;
  var x;
  var y;
  if (isHorizontal) {
    x = getSegmentDragCoord(line, "x", dragPosition);
    y = line.a.y * gridSize + mazeCenter.y;
  } else {
    x = line.a.x * gridSize + mazeCenter.x;
    y = getSegmentDragCoord(line, "y", dragPosition);
  }
  return { x: x, y: y };
}
function getSegmentDragCoord(line, axis, dragPosition) {
  var a = line.a[axis];
  var b = line.b[axis];
  var min = a < b ? a : b;
  var max = a > b ? a : b;
  min = min * gridSize + mazeCenter[axis];
  max = max * gridSize + mazeCenter[axis];
  return Math.max(min, Math.min(max, dragPosition[axis]));
}
function distanceSorter(a, b) {
  return a.distance - b.distance;
}
function getDragPeg(segments, dragPosition) {
  var pegs = [];
  segments.forEach(function (segment) {
    var line = segment[maze.orientation];
    addPegPoint(line.a, pegs);
    addPegPoint(line.b, pegs);
  });
  var pegCandidates = pegs.map(function (pegKey) {
    var parts = pegKey.split(",");
    var peg = { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) };
    var pegPosition = { x: peg.x * gridSize + mazeCenter.x, y: peg.y * gridSize + mazeCenter.y };
    return { peg: peg, distance: getDistance(dragPosition, pegPosition) };
  });
  pegCandidates.sort(distanceSorter);
  return pegCandidates[0].peg;
}
function getDistance(a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function addPegPoint(point, pegs) {
  var key = point.x + "," + point.y;
  if (pegs.indexOf(key) == -1) pegs.push(key);
}

function onHoverMousemove(event) {
  var inside = getIsInsideCub(event);
  if (inside == isCubHovered) return;
  isCubHovered = inside;
  document.body.classList[inside ? "add" : "remove"]("is-cub-hovered");
}

function render() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();
  ctx.scale(2, 2);
  renderRotateHandle();
  maze.render(ctx, mazeCenter, gridSize, maze.flyWheel.angle);
  if (winAnim) winAnim.render(ctx);
  var isHovered = isCubHovered || isCubDragging;
  cub.render(ctx, mazeCenter, gridSize, maze.flyWheel.angle, isHovered);
  ctx.restore();
}

function renderRotateHandle() {
  if (!rotatePointer) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = gridSize * 0.5;
  ctx.strokeStyle = "#EEE";
  ctx.fillStyle = "#EEE";
  ctx.beginPath();
  var pieRadius = maze.gridMax * gridSize;
  ctx.moveTo(mazeCenter.x, mazeCenter.y);
  var pieDirection = normalizeAngle(normalizeAngle(moveAngle) - normalizeAngle(dragStartAngle)) > mainTAU / 2;
  ctx.arc(mazeCenter.x, mazeCenter.y, pieRadius, dragStartAngle, moveAngle, pieDirection);
  ctx.lineTo(mazeCenter.x, mazeCenter.y);
  ctx.stroke();
  ctx.fill();
  ctx.closePath();
}

var completedLevels = localStorage.getItem("linkGridCompletedLevels");
completedLevels = completedLevels ? completedLevels.split(",") : [];
completedLevels.forEach(function (id) {
  var item = levelList.querySelector('[data-id="' + id + '"]');
  if (item) item.classList.add("did-complete");
});

function completeLevel() {
  var cubPosition = getCubPosition();
  winAnim = new WinAnimation(cubPosition.x, cubPosition.y);
  var item = levelList.querySelector('[data-id="' + maze.id + '"]');
  if (item) item.classList.add("did-complete");
  if (completedLevels.indexOf(maze.id) == -1) {
    completedLevels.push(maze.id);
    localStorage.setItem("linkGridCompletedLevels", completedLevels.join(","));
  }
  if (getNextLevel()) {
    setTimeout(function () {
      if (nextLevelButton) nextLevelButton.classList.add("is-open");
    }, 1000);
  }
}

function getNextLevel() {
  var index = levels.indexOf(maze.id);
  return levels[index + 1];
}

if (nextLevelButton) {
  nextLevelButton.addEventListener("click", function () {
    var next = getNextLevel();
    if (next) loadLevel(next);
  });
}

function normalizeAngle(angle) {
  return ((angle % mainTAU) + mainTAU) % mainTAU;
}

if (typeof KidsCore !== "undefined") {
  KidsCore.init();
  KidsCore.bindTapSound(document.getElementById("app"));
}
