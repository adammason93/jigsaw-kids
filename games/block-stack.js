/**
 * Block stack puzzle — vanilla port of jQuery + animatelo version.
 */
(function () {
  "use strict";

  function animateloFlash(target, opts) {
    var el =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return [{ onfinish: null }];
    var duration = opts && opts.duration != null ? opts.duration : 500;
    var iterations =
      opts && opts.iterations === Infinity
        ? Infinity
        : opts && opts.iterations != null
          ? opts.iterations
          : 1;
    var anim = el.animate(
      [
        { opacity: 1, filter: "brightness(1)" },
        { opacity: 0.5, filter: "brightness(0.7)" },
        { opacity: 1, filter: "brightness(1)" },
      ],
      { duration: duration, iterations: iterations },
    );
    return [anim];
  }

  class Position {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }

  class Block {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      var block = document.createElement("div");
      block.setAttribute("class", "block");
      block.innerHTML =
        "<div class='inner-tile'><div class='inner-inner-tile'></div></div>";
      this.element = block;
    }

    init(boardEl) {
      boardEl.appendChild(this.element);
    }

    render() {
      var w = this.element.offsetWidth;
      var h = this.element.offsetHeight;
      this.element.style.left = this.y * w + "px";
      this.element.style.top = this.x * h + "px";
    }

    fall() {
      this.x += 1;
    }

    moveRight() {
      this.y += 1;
    }

    moveLeft() {
      this.y -= 1;
    }

    rightPosition() {
      return new Position(this.x, this.y + 1);
    }

    leftPosition() {
      return new Position(this.x, this.y - 1);
    }

    getPosition() {
      return new Position(this.x, this.y);
    }

    flash() {
      return animateloFlash(this.element, { duration: 500 });
    }

    destroy() {
      if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
    }
  }

  class Shape {
    constructor(blocks) {
      this.blocks = blocks;
    }

    getBlocks() {
      return Array.from(this.blocks);
    }

    init(boardEl) {
      for (var i = 0; i < this.blocks.length; i++) {
        this.blocks[i].init(boardEl);
      }
    }

    render() {
      for (var i = 0; i < this.blocks.length; i++) {
        this.blocks[i].render();
      }
    }

    fallingPositions() {
      return this.blocks.map(function (b) {
        var p = b.getPosition();
        return new Position(p.x + 1, p.y);
      });
    }

    fall() {
      for (var i = 0; i < this.blocks.length; i++) this.blocks[i].fall();
    }

    rightPositions() {
      return this.blocks.map(function (b) {
        return b.rightPosition();
      });
    }

    leftPositions() {
      return this.blocks.map(function (b) {
        return b.leftPosition();
      });
    }

    moveRight() {
      for (var i = 0; i < this.blocks.length; i++) this.blocks[i].moveRight();
    }

    moveLeft() {
      for (var i = 0; i < this.blocks.length; i++) this.blocks[i].moveLeft();
    }

    clear() {
      for (var i = 0; i < this.blocks.length; i++) this.blocks[i].destroy();
      this.blocks = [];
    }

    addBlocks(blocks) {
      for (var i = 0; i < blocks.length; i++) this.blocks.push(blocks[i]);
    }

    rotate() {}

    rotatePositions() {
      return [];
    }
  }

  class Square extends Shape {
    constructor(x, y) {
      var blocks = [];
      blocks.push(new Block(x, y));
      blocks.push(new Block(x, y + 1));
      blocks.push(new Block(x + 1, y));
      blocks.push(new Block(x + 1, y + 1));
      super(blocks);
    }
  }

  class LShape extends Shape {
    constructor(x, y) {
      var blocks = [];
      blocks.push(new Block(x, y));
      blocks.push(new Block(x - 1, y));
      blocks.push(new Block(x + 1, y));
      blocks.push(new Block(x + 1, y + 1));
      super(blocks);
      this.position = 0;
    }

    rotate() {
      var blocks = this.rotatePositions().map(function (p) {
        return new Block(p.x, p.y);
      });
      this.clear();
      this.addBlocks(blocks);
      this.position = this.getNextPosition();
    }

    rotatePositions() {
      var pos = this.getBlocks().shift().getPosition();
      var x = pos.x;
      var y = pos.y;
      var positions = [];
      switch (this.getNextPosition()) {
        case 0:
          positions.push(new Position(x, y));
          positions.push(new Position(x - 1, y));
          positions.push(new Position(x + 1, y));
          positions.push(new Position(x + 1, y + 1));
          break;
        case 1:
          positions.push(new Position(x, y));
          positions.push(new Position(x, y - 1));
          positions.push(new Position(x, y + 1));
          positions.push(new Position(x + 1, y - 1));
          break;
        case 2:
          positions.push(new Position(x, y));
          positions.push(new Position(x - 1, y - 1));
          positions.push(new Position(x - 1, y));
          positions.push(new Position(x + 1, y));
          break;
        case 3:
          positions.push(new Position(x, y));
          positions.push(new Position(x, y - 1));
          positions.push(new Position(x, y + 1));
          positions.push(new Position(x - 1, y + 1));
          break;
      }
      return positions;
    }

    getNextPosition() {
      return (this.position + 1) % 4;
    }
  }

  class TShape extends Shape {
    constructor(x, y) {
      var blocks = [];
      blocks.push(new Block(x, y));
      blocks.push(new Block(x, y - 1));
      blocks.push(new Block(x + 1, y));
      blocks.push(new Block(x, y + 1));
      super(blocks);
      this.position = 0;
    }

    rotate() {
      var blocks = this.rotatePositions().map(function (p) {
        return new Block(p.x, p.y);
      });
      this.clear();
      this.addBlocks(blocks);
      this.position = this.getNextPosition();
    }

    rotatePositions() {
      var pos = this.getBlocks().shift().getPosition();
      var x = pos.x;
      var y = pos.y;
      var positions = [];
      switch (this.getNextPosition()) {
        case 0:
          positions.push(new Position(x, y));
          positions.push(new Position(x, y - 1));
          positions.push(new Position(x + 1, y));
          positions.push(new Position(x, y + 1));
          break;
        case 1:
          positions.push(new Position(x, y));
          positions.push(new Position(x - 1, y));
          positions.push(new Position(x, y - 1));
          positions.push(new Position(x + 1, y));
          break;
        case 2:
          positions.push(new Position(x, y));
          positions.push(new Position(x, y - 1));
          positions.push(new Position(x - 1, y));
          positions.push(new Position(x, y + 1));
          break;
        case 3:
          positions.push(new Position(x, y));
          positions.push(new Position(x - 1, y));
          positions.push(new Position(x, y + 1));
          positions.push(new Position(x + 1, y));
          break;
      }
      return positions;
    }

    getNextPosition() {
      return (this.position + 1) % 4;
    }
  }

  class ZShape extends Shape {
    constructor(x, y) {
      var blocks = [];
      blocks.push(new Block(x, y));
      blocks.push(new Block(x, y - 1));
      blocks.push(new Block(x + 1, y));
      blocks.push(new Block(x + 1, y + 1));
      super(blocks);
      this.position = 0;
    }

    rotate() {
      var blocks = this.rotatePositions().map(function (p) {
        return new Block(p.x, p.y);
      });
      this.clear();
      this.addBlocks(blocks);
      this.position = this.getNextPosition();
    }

    rotatePositions() {
      var pos = this.getBlocks().shift().getPosition();
      var x = pos.x;
      var y = pos.y;
      var positions = [];
      switch (this.getNextPosition()) {
        case 0:
          positions.push(new Position(x, y));
          positions.push(new Position(x, y - 1));
          positions.push(new Position(x + 1, y));
          positions.push(new Position(x + 1, y + 1));
          break;
        case 1:
          positions.push(new Position(x, y));
          positions.push(new Position(x - 1, y));
          positions.push(new Position(x, y - 1));
          positions.push(new Position(x + 1, y - 1));
          break;
      }
      return positions;
    }

    getNextPosition() {
      return (this.position + 1) % 2;
    }
  }

  class LineShape extends Shape {
    constructor(x, y) {
      var blocks = [];
      blocks.push(new Block(x, y));
      blocks.push(new Block(x - 1, y));
      blocks.push(new Block(x + 1, y));
      blocks.push(new Block(x + 2, y));
      super(blocks);
      this.position = 0;
    }

    rotate() {
      var blocks = this.rotatePositions().map(function (p) {
        return new Block(p.x, p.y);
      });
      this.clear();
      this.addBlocks(blocks);
      this.position = this.getNextPosition();
    }

    rotatePositions() {
      var pos = this.getBlocks().shift().getPosition();
      var x = pos.x;
      var y = pos.y;
      var positions = [];
      switch (this.getNextPosition()) {
        case 0:
          positions.push(new Position(x, y));
          positions.push(new Position(x - 1, y));
          positions.push(new Position(x + 1, y));
          positions.push(new Position(x + 2, y));
          break;
        case 1:
          positions.push(new Position(x, y));
          positions.push(new Position(x, y - 1));
          positions.push(new Position(x, y + 1));
          positions.push(new Position(x, y + 2));
          break;
      }
      return positions;
    }

    getNextPosition() {
      return (this.position + 1) % 2;
    }
  }

  class Board {
    constructor(boardEl) {
      this.boardEl = boardEl;
      this.blocks = [];
      this.shapes = [];
      this.interval = undefined;
      this.loopInterval = 1000;
      this.gameOver = true;
      this.loopIntervalFast = Math.floor(1000 / 27);
      this.score = 0;
      this.moveFast = false;
      this.init();
    }

    setScore(value) {
      this.score = value;
      var el = document.getElementById("score");
      if (el) el.textContent = String(this.score);
    }

    getScore() {
      return this.score;
    }

    init() {
      var ref = this;
      document.querySelectorAll("#board .empty").forEach(function (ele, index) {
        var x = Math.floor(index / 10);
        var y = index % 10;
        var w = ele.offsetWidth;
        var h = ele.offsetHeight;
        ele.style.left = y * w + "px";
        ele.style.top = x * h + "px";
      });
      var msg = document.getElementById("message");
      if (msg) msg.textContent = "Tetris";
      animateloFlash("#new-game", { duration: 2500, iterations: Infinity });
    }

    newGame() {
      for (var i = 0; i < this.shapes.length; i++) {
        var shape = this.shapes[i];
        this.removeShape(shape);
        this.addBlocks(shape.getBlocks());
      }
      for (var j = 0; j < this.blocks.length; j++) this.blocks[j].destroy();
      this.blocks = [];
      this.gameOver = false;
      this.initGameLoop(this.loopInterval);
      this.setScore(0);
      var banner = document.getElementById("banner");
      if (banner) banner.style.display = "none";
    }

    initGameLoop(value) {
      if (this.interval) clearInterval(this.interval);
      var ref = this;
      this.interval = setInterval(function () {
        ref.gameLoop();
      }, value);
    }

    gameLoop() {
      this.renderShapes();
      this.renderBlocks();
      this.spawnShapes();
      this.gameUpdate();
    }

    gameUpdate() {
      if (this.isGameOver()) {
        this.gameOver = true;
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = undefined;
        }
        var banner = document.getElementById("banner");
        var message = document.getElementById("message");
        var ng = document.getElementById("new-game");
        if (banner) banner.style.display = "";
        if (message) message.textContent = "Game Over!";
        if (ng) ng.textContent = "Tap here to start again!";
      }
    }

    isGameOver() {
      for (var i = 0; i < this.blocks.length; i++) {
        var pos = this.blocks[i].getPosition();
        if (pos.x === 0 && pos.y === 4) return true;
      }
      return false;
    }

    renderShapes() {
      var shapes = this.getShapes();
      for (var i = 0; i < shapes.length; i++) {
        var shape = shapes[i];
        if (
          this.arePositonsWithinBoard(shape.fallingPositions()) &&
          this.areBlocksEmpty(shape.fallingPositions())
        ) {
          shape.fall();
          shape.render();
        } else {
          this.removeShape(shape);
          this.addBlocks(shape.getBlocks());
          if (this.moveFast) {
            this.initGameLoop(this.loopInterval);
            this.moveFast = false;
          }
        }
      }
    }

    dropShape() {
      if (!this.gameOver) {
        this.initGameLoop(this.loopIntervalFast);
        this.moveFast = true;
      }
    }

    renderBlocks() {
      for (var x = 0; x < 16; x++) {
        var rowBlocks = [];
        var y;
        for (y = 0; y < 10; y++) {
          var block = this.getBlock(x, y);
          if (!block) break;
          rowBlocks.push(block);
        }
        if (rowBlocks.length === 10) {
          var ref = this;
          this.removeBlocks(rowBlocks);
          this.flashBlocks(rowBlocks, function () {
            ref.destroyBlocks(rowBlocks);
            ref.fallBlocks(x);
            ref.setScore(ref.getScore() + 10);
          });
        }
      }
    }

    flashBlocks(blocks, callback) {
      var anim = null;
      for (var i = 0; i < blocks.length; i++) {
        anim = blocks[i].flash();
      }
      if (anim && anim[0] && typeof anim[0].finished !== "undefined") {
        anim[0].finished.then(callback);
      } else if (anim && anim[0]) {
        anim[0].onfinish = callback;
      } else {
        callback();
      }
    }

    fallBlocks(i) {
      for (var x = 0; x < i; x++) {
        for (var y = 0; y < 10; y++) {
          var block = this.getBlock(x, y);
          if (block) {
            block.fall();
            block.render();
          }
        }
      }
    }

    removeBlocks(blocks) {
      for (var i = 0; i < blocks.length; i++) {
        var idx = this.blocks.indexOf(blocks[i]);
        if (idx !== -1) this.blocks.splice(idx, 1);
      }
    }

    destroyBlocks(blocks) {
      for (var i = 0; i < blocks.length; i++) blocks[i].destroy();
    }

    getBlock(x, y) {
      for (var i = 0; i < this.blocks.length; i++) {
        if (this.blocks[i].x == x && this.blocks[i].y == y) return this.blocks[i];
      }
      return undefined;
    }

    spawnShapes() {
      if (this.shapes.length !== 0) return;
      var shape = null;
      switch (this.getRandomRange(0, 4)) {
        case 0:
          shape = new LineShape(0, 4);
          break;
        case 1:
          shape = new Square(0, 4);
          break;
        case 2:
          shape = new LShape(0, 4);
          break;
        case 3:
          shape = new ZShape(0, 4);
          break;
        case 4:
          shape = new TShape(0, 4);
          break;
      }
      shape.init(this.boardEl);
      shape.render();
      this.shapes.push(shape);
    }

    getShapes() {
      return Array.from(this.shapes);
    }

    removeShape(shape) {
      var idx = this.shapes.indexOf(shape);
      if (idx !== -1) this.shapes.splice(idx, 1);
    }

    addBlocks(blocks) {
      for (var i = 0; i < blocks.length; i++) this.blocks.push(blocks[i]);
    }

    arePositonsWithinBoard(positions) {
      for (var i = 0; i < positions.length; i++) {
        var position = positions[i];
        if (position.x >= 16 || position.y < 0 || position.y >= 10) return false;
      }
      return true;
    }

    areBlocksEmpty(positions) {
      for (var i = 0; i < positions.length; i++) {
        var position = positions[i];
        for (var j = 0; j < this.blocks.length; j++) {
          var pos = this.blocks[j].getPosition();
          if (pos.x == position.x && pos.y == position.y) return false;
        }
      }
      return true;
    }

    leftKeyPress() {
      for (var i = 0; i < this.shapes.length; i++) {
        var shape = this.shapes[i];
        if (
          this.arePositonsWithinBoard(shape.leftPositions()) &&
          this.areBlocksEmpty(shape.leftPositions())
        ) {
          shape.moveLeft();
          shape.render();
        }
      }
    }

    rotate() {
      for (var i = 0; i < this.shapes.length; i++) {
        var shape = this.shapes[i];
        if (
          this.arePositonsWithinBoard(shape.rotatePositions()) &&
          this.areBlocksEmpty(shape.rotatePositions())
        ) {
          shape.rotate();
        }
        shape.init(this.boardEl);
        shape.render();
      }
    }

    rightKeyPress() {
      for (var i = 0; i < this.shapes.length; i++) {
        var shape = this.shapes[i];
        if (
          this.arePositonsWithinBoard(shape.rightPositions()) &&
          this.areBlocksEmpty(shape.rightPositions())
        ) {
          shape.moveRight();
          shape.render();
        }
      }
    }

    upKeyPress() {
      this.rotate();
    }

    downKeyPress() {
      this.dropShape();
    }

    getRandomRange(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  }

  function buildEmptyTiles() {
    var board = document.getElementById("board");
    if (!board) return;
    for (var i = 0; i < 160; i++) {
      var d = document.createElement("div");
      d.className = "empty";
      d.innerHTML =
        "<div class='inner-tile'><div class='inner-inner-tile'></div></div>";
      board.appendChild(d);
    }
  }

  function boot() {
    buildEmptyTiles();
    var boardEl = document.getElementById("board");
    var boardGame = new Board(boardEl);

    document.addEventListener("keydown", function (e) {
      switch (e.which) {
        case 37:
          boardGame.leftKeyPress();
          break;
        case 38:
          boardGame.upKeyPress();
          break;
        case 39:
          boardGame.rightKeyPress();
          break;
        case 40:
          boardGame.downKeyPress();
          break;
        case 78:
          boardGame.newGame();
          break;
        default:
          break;
      }
      e.preventDefault();
    });

    var ng = document.getElementById("new-game");
    if (ng) ng.addEventListener("click", function () { boardGame.newGame(); });
    var down = document.getElementById("down");
    if (down) down.addEventListener("click", function () { boardGame.downKeyPress(); });
    var rot = document.getElementById("rotate");
    if (rot) rot.addEventListener("click", function () { boardGame.upKeyPress(); });
    var left = document.getElementById("left");
    if (left) left.addEventListener("click", function () { boardGame.leftKeyPress(); });
    var right = document.getElementById("right");
    if (right) right.addEventListener("click", function () { boardGame.rightKeyPress(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
