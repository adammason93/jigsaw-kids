function Maze() {
  this.freeSegments = [];
  this.fixedSegments = [];
  this.pivotSegments = [];
  this.rotateSegments = [];
  this.flyWheel = new FlyWheel({ friction: 0.8 });
  this.connections = {};
}

var mazeProto = Maze.prototype;

mazeProto.loadText = function (text) {
  this.freeSegments = [];
  this.fixedSegments = [];
  this.pivotSegments = [];
  this.rotateSegments = [];
  this.connections = {};
  this.flyWheel = new FlyWheel({ friction: 0.8 });

  var sections = text.split("---\n");
  var frontMatter = {};
  if (sections.length > 1) frontMatter = getFrontMatter(sections[0]);
  var instructElem = document.querySelector(".instruction");
  if (instructElem) instructElem.innerHTML = frontMatter.instruction || "";

  var mazeSrc = sections[sections.length - 1].replace(/^\s*\n/, "").trimEnd();
  var lines = mazeSrc.split("\n");
  var gridCount = (this.gridCount = lines[0].length);
  var gridMax = (this.gridMax = (gridCount - 1) / 2);

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var chars = line.split("");
    for (var j = 0; j < chars.length; j++) {
      var character = chars[j];
      var pegX = j - gridMax;
      var pegY = i - gridMax;
      var parseMethod = "parse" + character;
      if (this[parseMethod]) this[parseMethod](pegX, pegY);
    }
  }
};

function getFrontMatter(text) {
  if (!text) return;
  var frontMatter = {};
  text.split("\n").forEach(function (line) {
    if (!line) return;
    var parts = line.split(":");
    var key = parts[0].trim();
    var value = parts.slice(1).join(":").trim();
    if (value === "true") value = true;
    else if (value === "false") value = false;
    frontMatter[key] = value;
  });
  return frontMatter;
}

mazeProto["parse-"] = mazeProto.addFreeHorizSegment = function (pegX, pegY) {
  var segment = getHorizSegment(pegX, pegY, FreeSegment);
  this.connectSegment(segment);
  this.freeSegments.push(segment);
};
mazeProto["parse|"] = mazeProto.addFreeVertSegment = function (pegX, pegY) {
  var segment = getVertSegment(pegX, pegY, FreeSegment);
  this.connectSegment(segment);
  this.freeSegments.push(segment);
};
mazeProto["parse="] = mazeProto.addFixedHorizSegment = function (pegX, pegY) {
  var segment = getHorizSegment(pegX, pegY, FixedSegment);
  this.connectSegment(segment);
  this.fixedSegments.push(segment);
};
mazeProto["parse!"] = mazeProto.addFixedVertSegment = function (pegX, pegY) {
  var segment = getVertSegment(pegX, pegY, FixedSegment);
  this.connectSegment(segment);
  this.fixedSegments.push(segment);
};

function getHorizSegment(pegX, pegY, Segment) {
  var a = { x: pegX + 1, y: pegY };
  var b = { x: pegX - 1, y: pegY };
  return new Segment(a, b);
}
function getVertSegment(pegX, pegY, Segment) {
  var a = { x: pegX, y: pegY + 1 };
  var b = { x: pegX, y: pegY - 1 };
  return new Segment(a, b);
}

mazeProto["parse^"] = mazeProto.addPivotUpSegment = function (pegX, pegY) {
  var a = { x: pegX, y: pegY + 1 };
  var b = { x: pegX, y: pegY - 1 };
  var segment = new PivotSegment(a, b);
  this.connectSegment(segment);
  this.pivotSegments.push(segment);
};
mazeProto.parsev = mazeProto.addPivotDownSegment = function (pegX, pegY) {
  var a = { x: pegX, y: pegY - 1 };
  var b = { x: pegX, y: pegY + 1 };
  var segment = new PivotSegment(a, b);
  this.connectSegment(segment);
  this.pivotSegments.push(segment);
};
mazeProto["parse<"] = mazeProto.addPivotLeftSegment = function (pegX, pegY) {
  var a = { x: pegX + 1, y: pegY };
  var b = { x: pegX - 1, y: pegY };
  var segment = new PivotSegment(a, b);
  this.connectSegment(segment);
  this.pivotSegments.push(segment);
};
mazeProto["parse>"] = mazeProto.addPivotRightSegment = function (pegX, pegY) {
  var a = { x: pegX - 1, y: pegY };
  var b = { x: pegX + 1, y: pegY };
  var segment = new PivotSegment(a, b);
  this.connectSegment(segment);
  this.pivotSegments.push(segment);
};

mazeProto.parse8 = function (pegX, pegY) {
  var a = { x: pegX, y: pegY + 1 };
  var b = { x: pegX, y: pegY - 1 };
  var segment = new RotateSegment(a, b);
  this.connectSegment(segment);
  this.rotateSegments.push(segment);
};
mazeProto.parse4 = mazeProto.addRotateLeftSegment = function (pegX, pegY) {
  var a = { x: pegX + 1, y: pegY };
  var b = { x: pegX - 1, y: pegY };
  var segment = new RotateSegment(a, b);
  this.connectSegment(segment);
  this.rotateSegments.push(segment);
};
mazeProto.parse5 = function (pegX, pegY) {
  var a = { x: pegX, y: pegY - 1 };
  var b = { x: pegX, y: pegY + 1 };
  var segment = new RotateSegment(a, b);
  this.connectSegment(segment);
  this.rotateSegments.push(segment);
};
mazeProto.parse6 = mazeProto.addRotateRightSegment = function (pegX, pegY) {
  var a = { x: pegX - 1, y: pegY };
  var b = { x: pegX + 1, y: pegY };
  var segment = new RotateSegment(a, b);
  this.connectSegment(segment);
  this.rotateSegments.push(segment);
};

mazeProto["parse#"] = function (pegX, pegY) {
  this.addFreeHorizSegment(pegX, pegY);
  this.addFixedHorizSegment(pegX, pegY);
};
mazeProto.parse$ = function (pegX, pegY) {
  this.addFreeVertSegment(pegX, pegY);
  this.addFixedVertSegment(pegX, pegY);
};
mazeProto.parseI = function (pegX, pegY) {
  this.addPivotUpSegment(pegX, pegY);
  this.addFixedVertSegment(pegX, pegY);
};
mazeProto.parseJ = function (pegX, pegY) {
  this.addPivotLeftSegment(pegX, pegY);
  this.addFixedHorizSegment(pegX, pegY);
};
mazeProto.parseK = function (pegX, pegY) {
  this.addPivotDownSegment(pegX, pegY);
  this.addFixedVertSegment(pegX, pegY);
};
mazeProto.parseL = function (pegX, pegY) {
  this.addPivotRightSegment(pegX, pegY);
  this.addFixedHorizSegment(pegX, pegY);
};
mazeProto.parseW = function (pegX, pegY) {
  this.addPivotUpSegment(pegX, pegY);
  this.addFreeVertSegment(pegX, pegY);
};
mazeProto.parseA = function (pegX, pegY) {
  this.addPivotLeftSegment(pegX, pegY);
  this.addFreeHorizSegment(pegX, pegY);
};
mazeProto.parseS = function (pegX, pegY) {
  this.addPivotDownSegment(pegX, pegY);
  this.addFreeVertSegment(pegX, pegY);
};
mazeProto.parseD = function (pegX, pegY) {
  this.addPivotRightSegment(pegX, pegY);
  this.addFreeHorizSegment(pegX, pegY);
};
mazeProto["parse@"] = function (pegX, pegY) {
  this.startPosition = { x: pegX, y: pegY };
  cub.setPeg(this.startPosition, "noon");
};
mazeProto["parse*"] = function (pegX, pegY) {
  this.goalPosition = { x: pegX, y: pegY };
};

var orientations = ["noon", "three", "six", "nine"];
mazeProto.connectSegment = function (segment) {
  orientations.forEach(function (orientation) {
    var line = segment[orientation];
    if (this.getIsPegOut(line.a) || this.getIsPegOut(line.b)) return;
    this.connectPeg(segment, orientation, line.a);
    this.connectPeg(segment, orientation, line.b);
  }, this);
};
mazeProto.getIsPegOut = function (peg) {
  return Math.abs(peg.x) > this.gridMax || Math.abs(peg.y) > this.gridMax;
};
mazeProto.connectPeg = function (segment, orientation, peg) {
  var key = orientation + ":" + peg.x + "," + peg.y;
  var connection = this.connections[key];
  if (!connection) connection = this.connections[key] = [];
  if (connection.indexOf(segment) == -1) connection.push(segment);
};

mazeProto.update = function () {
  this.flyWheel.integrate();
  var angle = this.flyWheel.angle;
  if (angle < TAU / 8) this.orientation = "noon";
  else if (angle < (TAU * 3) / 8) this.orientation = "three";
  else if (angle < (TAU * 5) / 8) this.orientation = "six";
  else if (angle < (TAU * 7) / 8) this.orientation = "nine";
  else this.orientation = "noon";
};

mazeProto.attractAlignFlyWheel = function () {
  var angle = this.flyWheel.angle;
  var target;
  if (angle < TAU / 8) target = 0;
  else if (angle < (TAU * 3) / 8) target = TAU / 4;
  else if (angle < (TAU * 5) / 8) target = TAU / 2;
  else if (angle < (TAU * 7) / 8) target = (TAU * 3) / 4;
  else target = TAU;
  var attraction = (target - angle) * 0.03;
  this.flyWheel.applyForce(attraction);
};

var orientationAngles = {
  noon: 0,
  three: TAU / 4,
  six: TAU / 2,
  nine: (TAU * 3) / 4,
};

mazeProto.render = function (ctx, center, gridSize, angle) {
  var orientationAngle = orientationAngles[angle];
  var gridMax = this.gridMax;
  angle = orientationAngle !== undefined ? orientationAngle : angle || 0;

  ctx.save();
  ctx.translate(center.x, center.y);
  this.fixedSegments.forEach(function (segment) {
    segment.render(ctx, center, gridSize);
  });
  this.rotateSegments.forEach(function (segment) {
    segment.render(ctx, center, gridSize, angle);
  });
  ctx.rotate(angle);
  ctx.lineWidth = gridSize * 0.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = gridSize * 0.2;
  ctx.strokeStyle = "hsla(0, 0%, 50%, 0.2)";
  ctx.save();
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-gridSize / 5, -gridSize / 5, (gridSize * 2) / 5, (gridSize * 2) / 5);
  ctx.restore();
  ctx.strokeStyle = "hsla(330, 100%, 50%, 0.3)";
  ctx.lineWidth = gridSize * 0.15;
  var startX = this.startPosition.x * gridSize;
  var startY = this.startPosition.y * gridSize;
  strokeCircle(ctx, startX, startY, gridSize * 0.5);
  for (var pegY = -gridMax; pegY <= gridMax; pegY += 2) {
    for (var pegX = -gridMax; pegX <= gridMax; pegX += 2) {
      var pegXX = pegX * gridSize;
      var pegYY = pegY * gridSize;
      ctx.fillStyle = "hsla(0, 0%, 50%, 0.6)";
      fillCircle(ctx, pegXX, pegYY, gridSize * 0.15);
    }
  }
  this.freeSegments.forEach(function (segment) {
    segment.render(ctx, center, gridSize);
  });
  this.pivotSegments.forEach(function (segment) {
    segment.render(ctx, center, gridSize, angle);
  });
  var goalX = this.goalPosition.x * gridSize;
  var goalY = this.goalPosition.y * gridSize;
  ctx.lineWidth = gridSize * 0.3;
  ctx.fillStyle = "hsla(50, 100%, 50%, 1)";
  ctx.strokeStyle = "hsla(50, 100%, 50%, 1)";
  renderGoal(ctx, goalX, goalY, angle, gridSize * 0.6, gridSize * 0.3);
  ctx.restore();
};

function fillCircle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
}
function strokeCircle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.closePath();
}
function renderGoal(ctx, x, y, mazeAngle, radiusA, radiusB) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-mazeAngle);
  ctx.beginPath();
  for (var i = 0; i < 11; i++) {
    var theta = (Math.PI * 2 * i) / 10 + Math.PI / 2;
    var radius = i % 2 ? radiusA : radiusB;
    var dx = Math.cos(theta) * radius;
    var dy = Math.sin(theta) * radius;
    ctx[i ? "lineTo" : "moveTo"](dx, dy);
  }
  ctx.fill();
  ctx.stroke();
  ctx.closePath();
  ctx.restore();
}
