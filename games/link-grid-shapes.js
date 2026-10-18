function FreeSegment(a, b) {
  this.type = "FreeSegment";
  this.a = a;
  this.b = b;
  this.noon = { a: a, b: b };
  this.three = {
    a: { x: -a.y, y: a.x },
    b: { x: -b.y, y: b.x },
  };
  this.six = {
    a: { x: -a.x, y: -a.y },
    b: { x: -b.x, y: -b.y },
  };
  this.nine = {
    a: { x: a.y, y: -a.x },
    b: { x: b.y, y: -b.x },
  };
}

var freeSegProto = FreeSegment.prototype;
freeSegProto.render = function (ctx, center, gridSize) {
  var ax = this.a.x * gridSize;
  var ay = this.a.y * gridSize;
  var bx = this.b.x * gridSize;
  var by = this.b.y * gridSize;
  ctx.strokeStyle = "hsla(200, 80%, 50%, 0.7)";
  ctx.lineWidth = gridSize * 0.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.closePath();
};

function FixedSegment(a, b) {
  this.type = "FixedSegment";
  this.a = a;
  this.b = b;
  this.noon = { a: a, b: b };
  this.three = { a: a, b: b };
  this.six = { a: a, b: b };
  this.nine = { a: a, b: b };
}

var fixedSegProto = FixedSegment.prototype;
fixedSegProto.render = function (ctx, center, gridSize) {
  var ax = this.a.x * gridSize;
  var ay = this.a.y * gridSize;
  var bx = this.b.x * gridSize;
  var by = this.b.y * gridSize;
  ctx.strokeStyle = "hsla(30, 100%, 40%, 0.6)";
  ctx.lineWidth = gridSize * 0.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.closePath();
};

function PivotSegment(a, b) {
  this.type = "FreeSegment";
  this.a = a;
  this.b = b;
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  this.delta = { x: dx, y: dy };
  this.noon = { a: a, b: b };
  this.three = {
    a: { x: -a.y, y: a.x },
    b: { x: -a.y + dx, y: a.x + dy },
  };
  this.six = {
    a: { x: -a.x, y: -a.y },
    b: { x: -a.x + dx, y: -a.y + dy },
  };
  this.nine = {
    a: { x: a.y, y: -a.x },
    b: { x: a.y + dx, y: -a.x + dy },
  };
}

var pivProto = PivotSegment.prototype;
pivProto.render = function (ctx, center, gridSize, mazeAngle) {
  var ax = this.a.x * gridSize;
  var ay = this.a.y * gridSize;
  var bx = this.delta.x * gridSize;
  var by = this.delta.y * gridSize;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(-mazeAngle);
  var color = "hsla(150, 100%, 35%, 0.7)";
  ctx.strokeStyle = color;
  ctx.lineWidth = gridSize * 0.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, gridSize * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
  ctx.restore();
};

var TAU = Math.PI * 2;

function RotateSegment(a, b) {
  this.type = "RotateSegment";
  this.a = a;
  this.b = b;
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  this.delta = { x: dx, y: dy };
  this.theta = Math.atan2(dy, dx);
  this.noon = { a: a, b: b };
  this.three = { a: a, b: this.getB(TAU / 4) };
  this.six = { a: a, b: this.getB(TAU / 2) };
  this.nine = { a: a, b: this.getB((TAU * 3) / 4) };
}

var rotProto = RotateSegment.prototype;
rotProto.getB = function (angle) {
  return {
    x: Math.round(this.a.x + Math.cos(this.theta + angle) * 2),
    y: Math.round(this.a.y + Math.sin(this.theta + angle) * 2),
  };
};
rotProto.render = function (ctx, center, gridSize, mazeAngle) {
  var ax = this.a.x * gridSize;
  var ay = this.a.y * gridSize;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(mazeAngle);
  var color = "hsla(0, 100%, 50%, 0.6)";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = gridSize * 0.8;
  ctx.lineJoin = "round";
  ctx.rotate(TAU / 8);
  ctx.strokeRect(-gridSize * 0.2, -gridSize * 0.2, gridSize * 0.4, gridSize * 0.4);
  ctx.rotate(-TAU / 8);
  ctx.lineWidth = gridSize * 0.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  var bx = this.delta.x * gridSize;
  var by = this.delta.y * gridSize;
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.closePath();
  ctx.restore();
};

function FlyWheel(props) {
  this.angle = 0;
  this.friction = 0.95;
  this.velocity = 0;
  for (var prop in props) this[prop] = props[prop];
}

var fwProto = FlyWheel.prototype;
fwProto.integrate = function () {
  this.velocity *= this.friction;
  this.angle += this.velocity;
  this.normalizeAngle();
};
fwProto.applyForce = function (force) {
  this.velocity += force;
};
fwProto.normalizeAngle = function () {
  this.angle = ((this.angle % TAU) + TAU) % TAU;
};
fwProto.setAngle = function (theta) {
  var velo = theta - this.angle;
  if (velo > TAU / 2) velo -= TAU;
  else if (velo < -TAU / 2) velo += TAU;
  var force = velo - this.velocity;
  this.applyForce(force);
};

var cub = { offset: { x: 0, y: 0 } };
var pegOrienter = {
  noon: function (peg) {
    return peg;
  },
  three: function (peg) {
    return { x: peg.y, y: -peg.x };
  },
  six: function (peg) {
    return { x: -peg.x, y: -peg.y };
  },
  nine: function (peg) {
    return { x: -peg.y, y: peg.x };
  },
};

cub.setPeg = function (peg, orientation) {
  peg = pegOrienter[orientation](peg);
  this.peg = peg;
  this.noon = { x: peg.x, y: peg.y };
  this.three = { x: -peg.y, y: peg.x };
  this.six = { x: -peg.x, y: -peg.y };
  this.nine = { x: peg.y, y: -peg.x };
};

var offsetOrienter = {
  noon: function (offset) {
    return offset;
  },
  three: function (offset) {
    return { x: offset.y, y: -offset.x };
  },
  six: function (offset) {
    return { x: -offset.x, y: -offset.y };
  },
  nine: function (offset) {
    return { x: -offset.y, y: offset.x };
  },
};

cub.setOffset = function (offset, orientation) {
  this.offset = offsetOrienter[orientation](offset);
};

cub.render = function (ctx, mazeCenter, gridSize, angle, isHovered) {
  function circle(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
  var x = this.peg.x * gridSize + this.offset.x;
  var y = this.peg.y * gridSize + this.offset.y;
  ctx.save();
  ctx.translate(mazeCenter.x, mazeCenter.y);
  ctx.rotate(angle);
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.fillStyle = "hsla(330, 100%, 40%, 1)";
  var scale = isHovered ? 1.15 : 1;
  ctx.scale(scale, scale);
  circle(0, 0, gridSize * 0.6);
  circle(gridSize * -0.45, gridSize * -0.35, gridSize * 0.3);
  circle(gridSize * 0.45, gridSize * -0.35, gridSize * 0.3);
  ctx.restore();
};
