(function () {

var OneFrameTime = 17;
function createDiv(classList, children) {
  children = children || [];
  var div = document.createElement("div");
  div.classList.add.apply(div.classList, classList);
  children.forEach(function (ele) {
    div.appendChild(ele);
  });
  return div;
}
function createElementNS(name, attr) {
  var xmlns = "http://www.w3.org/2000/svg";
  var elementNS = document.createElementNS(xmlns, name);
  Object.keys(attr).forEach(function (key) {
    elementNS.setAttributeNS(null, key, attr[key]);
  });
  return elementNS;
}
function mobileCheck() {
  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    return true;
  }
  // iPadOS (incl. “desktop” Safari UA: Mac + touch points)
  var ua = navigator.userAgent || "";
  var touchPts = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;
  if (touchPts > 0 && (/iPad/i.test(ua) || (ua.indexOf("Macintosh") !== -1 && touchPts > 1))) {
    return true;
  }
  if (touchPts > 0 && window.matchMedia && window.matchMedia("(hover: none)").matches) {
    return true;
  }
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;
  if (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
      userAgent
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
      userAgent.substr(0, 4)
    )
  ) {
    return true;
  }
  return false;
}

class Marble {
    constructor({ color = `#ff2244` }) {
        this.ID = `${(~~(Math.random() * 1000000000))
            .toString(16)
            .toLocaleUpperCase()}`;
        this.DOM = createDiv(["marble"]);
        this.Color = color;
        this.DOM.style.backgroundColor = this.Color;
        this.DOM.style.width = `${Marble.Size}px`;
        this.DOM.style.height = `${Marble.Size}px`;
    }
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    overlap(marble) {
        let r = Marble.Size -
            Math.sqrt(Math.pow((this.x - marble.x), 2) + Math.pow((this.y - marble.y), 2));
        return r;
    }
}
Marble.Size = 60;
class Player {
    constructor({ x = 0, y = 0 }) {
        this.Marble = createDiv(["marble-1"]);
        this.NextMarbleList = [createDiv(["marble-2"]), createDiv(["marble-2"]), createDiv(["marble-2"])];
        this.DOM = createDiv(["player"], [
            this.Marble,
            ...this.NextMarbleList
        ]);
        this.rotate = 0;
        this.X = x;
        this.Y = y;
        this.DOM.style.transform = `translate(calc(${this.X}px - 50%), calc(${this.Y}px - 50%)) rotate(0deg)`;
    }
    lookAt(x, y) {
        if (!this.parent) {
            return this;
        }
        const rect = this.DOM.getBoundingClientRect();
        const innerX = rect.left + (rect.right - rect.left) / 2;
        const innerY = rect.top + (rect.bottom - rect.top) / 2;
        return this.lookAtVector(x - innerX, y - innerY);
    }
    lookAtVector(x, y) {
        this.rotate = Math.atan2(y, x) * 180 / Math.PI + 90;
        this.DOM.style.transform = `translate(calc(${this.X}px - 50%), calc(${this.Y}px - 50%)) rotate(${this.rotate}deg)`;
        return this;
    }
    appendTo(parent) {
        this.parent = parent;
        this.parent.appendChild(this.DOM);
        return this;
    }
    setMarbleColor(color) {
        this.Marble.style.backgroundColor = color;
        return this;
    }
    setNextMarbleColor(color) {
        this.NextMarbleList.forEach(dom => {
            dom.style.backgroundColor = color;
        });
        return this;
    }
    getVector() {
        const innerRotate = this.rotate - 90;
        return {
            x: Math.cos(innerRotate * Math.PI / 180) * 30,
            y: Math.sin(innerRotate * Math.PI / 180) * 30,
        };
    }
}
class Zuma {
    constructor(data) {
        this.AllMarbleLength = 100;
        this.InitMarbleLength = 20;
        this.Canvas = document.createElement('canvas');
        this.Container = createDiv(["container"], [
            this.Canvas,
            createDiv(['leaf', 'leaf-01']),
            createDiv(['leaf', 'leaf-02']),
            createDiv(['leaf', 'leaf-03']),
            createDiv(['leaf', 'leaf-04']),
            createDiv(['leaf', 'leaf-05']),
            createDiv(['leaf', 'leaf-06'])
        ]);
        this.Path = createElementNS("path", {});
        this.moveSpeed = 4;
        this.autoAddMarbleCount = 0;
        this.marbleDataList = [];
        this.marbleBoomList = [];
        this.marbleColorCount = {};
        this.moveTimes = 0;
        this.isStart = false;
        this._isInit = false;
        this._isFinal = false;
        // private windowEventList: { name: string, fn: (...e) => void; }[] = [];
        this.checkDeleteAfterTouchData = {};
        this.playerMarble = {
            now: null,
            next: null
        };
        this._score = 0;
        this.width = data.width;
        this.height = data.height;
        const svg = createElementNS("svg", {
            x: "0px",
            y: "0px",
            width: `${data.width}px`,
            height: `${data.height}px`,
            viewBox: `0 0 ${data.width} ${data.height}`,
        });
        svg.appendChild(this.Path);
        this.Path.setAttributeNS(null, "d", data.path);
        this.PathLength = this.Path.getTotalLength();
        const startHolePos = this.Path.getPointAtLength(0);
        const finalHolePos = this.Path.getPointAtLength(this.PathLength);
        const startHole = createDiv(['start-hole']);
        const finalHole = createDiv(['final-hole']);
        startHole.style.left = `${startHolePos.x}px`;
        startHole.style.top = `${startHolePos.y}px`;
        finalHole.style.left = `${finalHolePos.x}px`;
        finalHole.style.top = `${finalHolePos.y}px`;
        this.Container.appendChild(startHole);
        this.Container.appendChild(finalHole);
        this.Canvas.width = data.width * window.devicePixelRatio;
        this.Canvas.height = data.height * window.devicePixelRatio;
        this.Container.style.width = `${data.width}px`;
        this.Container.style.height = `${data.height}px`;
        this.Container.style.transform = `scale(${data.scale || 1})`;
        this.Player = new Player(data.playerPos);
        this.Player.appendTo(this.Container);
        this.colorList = [...Zuma.DefaultColorList];
        this.colorList.forEach((color) => {
            this.marbleColorCount[color] = 0;
        });
        this.updateScore = data.updateScore;
        this.updateFinal = data.updateFinal;
    }
    get isInit() {
        return this._isInit;
    }
    set isFinal(isFinal) {
        this._isFinal = isFinal;
        this.updateFinal && this.updateFinal(this._isFinal);
    }
    get isFinal() {
        return this._isFinal;
    }
    set score(score) {
        this._score = score;
        this.updateScore && this.updateScore(this._score);
    }
    get score() {
        return this._score;
    }
    start() {
        this.isStart = true;
        this.time = new Date().getTime();
        // if (!this.windowEventList.length) {
        //   this.bindEvent();
        // }
        this.animation();
        return this;
    }
    stop() {
        this.isStart = false;
        return this;
    }
    reset() {
        this.isStart = false;
        this._isInit = false;
        this.isFinal = false;
        this.autoAddMarbleCount = 0;
        this.score = 0;
        this.moveSpeed = 4;
        this.colorList = [...Zuma.DefaultColorList];
        this.marbleDataList.length = 0;
        this.marbleBoomList.length = 0;
        this.checkDeleteAfterTouchData = {};
        this.playerMarble.now = null;
        this.playerMarble.next = null;
        this.Player
            .setMarbleColor('')
            .setNextMarbleColor('');
        Object.keys(this.marbleColorCount).forEach((color) => {
            this.marbleColorCount[color] = 0;
        });
        return this;
    }
    setScale(scale) {
        this.Container.style.transform = `scale(${scale || 1})`;
        return this;
    }
    destroy() {
        this.reset();
        if (this.parent) {
            this.parent.removeChild(this.Container);
        }
        // this.windowEventList.forEach(d => {
        //   window.removeEventListener(d.name, d.fn);
        // });
        // this.windowEventList = [];
    }
    appendTo(parent) {
        this.parent = parent;
        this.parent.appendChild(this.Container);
        return this;
    }
    switchMarble() {
        if (!this.isStart || this.isFinal || !this.isInit) {
            return this;
        }
        if (this.Player && this.playerMarble.now && this.playerMarble.next) {
            [this.playerMarble.now, this.playerMarble.next] = [this.playerMarble.next, this.playerMarble.now];
            this.Player
                .setMarbleColor(this.playerMarble.now.Color)
                .setNextMarbleColor(this.playerMarble.next.Color);
        }
        return this;
    }
    attack() {
        if (!this.isStart || this.isFinal || !this.isInit ||
            !this.Player || !this.playerMarble.now || !this.playerMarble.next) {
            return this;
        }
        const vector = this.Player.getVector();
        this.marbleBoomList.push({
            marble: this.playerMarble.now,
            speed: vector
        });
        this.playerMarble.now.setPosition(this.Player.X, this.Player.Y);
        this.playerMarble.now = this.playerMarble.next;
        this.playerMarble.next = this.createMarble();
        this.Player
            .setMarbleColor(this.playerMarble.now.Color)
            .setNextMarbleColor(this.playerMarble.next.Color);
        return this;
    }
    lookAt(x, y) {
        if (!this.Player) {
            return this;
        }
        this.Player.lookAt(x, y);
        return this;
    }
    lookAtVector(x, y) {
        if (!this.Player) {
            return this;
        }
        this.Player.lookAtVector(x, y);
        return this;
    }
    getPlayerRotate() {
        return this.Player.rotate;
    }
    init() {
        const innerTime = new Date().getTime();
        if (this.marbleDataList.length >= this.InitMarbleLength && this.isStart) {
            this._isInit = true;
            this.moveSpeed = 20;
            this.moveTimes = this.moveSpeed;
            this.playerMarble.now = this.createMarble();
            this.playerMarble.next = this.createMarble();
            this.Player
                .setMarbleColor(this.playerMarble.now.Color)
                .setNextMarbleColor(this.playerMarble.next.Color);
            return this;
        }
        if (innerTime - this.time < OneFrameTime * 4) {
            return this;
        }
        this.time = innerTime;
        this.unshiftMarble();
        return this;
    }
    moveMoveMarbleData() {
        const firstMarble = this.marbleDataList[0];
        if (!firstMarble) {
            return;
        }
        if (firstMarble.percent >= 0.99) {
            this.score -= 1;
            this.removeMarbleFromDataList(firstMarble.marble);
        }
        const moveNum = Marble.Size / this.moveSpeed;
        firstMarble.percent += moveNum / this.PathLength;
        const pos = this.Path.getPointAtLength(firstMarble.percent * this.PathLength);
        firstMarble.marble.setPosition(pos.x, pos.y);
        let prevMarble = firstMarble;
        const deleteList = [];
        for (let i = 1; i < this.marbleDataList.length; i++) {
            const marbleData = this.marbleDataList[i];
            if (marbleData.percent >= 0.99) {
                this.score -= 1;
                this.removeMarbleFromDataList(marbleData.marble, i);
                continue;
            }
            const overlap = prevMarble.marble.overlap(marbleData.marble);
            if (overlap > 0 || prevMarble.percent > marbleData.percent) {
                // 檢查退回後修不需要刪除
                if (this.checkDeleteAfterTouchData[marbleData.marble.ID]) {
                    delete this.checkDeleteAfterTouchData[marbleData.marble.ID];
                    if (marbleData.marble.Color === prevMarble.marble.Color) {
                        const list = this.getNeerSameMarble(marbleData.marble);
                        if (list.length >= 3) {
                            deleteList.push(...list);
                        }
                    }
                }
                if (prevMarble.percent > marbleData.percent) {
                    marbleData.percent = prevMarble.percent + Marble.Size / this.PathLength;
                }
                else {
                    marbleData.percent += overlap / this.PathLength;
                }
            }
            else if (overlap < -5 && marbleData.percent > prevMarble.percent) {
                if (overlap < -Marble.Size) {
                    this.checkDeleteAfterTouchData[marbleData.marble.ID] = true;
                }
                const moveNum = (Marble.Size / this.moveSpeed) * 4;
                marbleData.percent -= moveNum / this.PathLength;
            }
            const pos = this.Path.getPointAtLength(marbleData.percent * this.PathLength);
            marbleData.marble.setPosition(pos.x, pos.y);
            prevMarble = marbleData;
        }
        deleteList.forEach(marble => {
            this.score += 3;
            this.removeMarbleFromDataList(marble);
        });
    }
    moveMoveMarbleBoom() {
        if (!this.marbleBoomList.length) {
            return;
        }
        // TODO: 有空優化成分區檢測
        const marbleDataList = this.marbleDataList;
        const deleteData = [];
        this.marbleBoomList.forEach(data => {
            data.marble.setPosition(data.marble.x + data.speed.x, data.marble.y + data.speed.y);
            for (let i = 0; i < marbleDataList.length; i++) {
                const marbleData = marbleDataList[i];
                const overlap = data.marble.overlap(marbleData.marble);
                if (overlap > 5) {
                    if (data.marble.Color === marbleData.marble.Color) {
                        const sameList = this.getNeerSameMarble(marbleData.marble);
                        if (sameList.length >= 2) {
                            this.score += sameList.length;
                            sameList.forEach(marble => {
                                this.removeMarbleFromDataList(marble);
                            });
                            deleteData.push(Object.assign(Object.assign({}, data), { isMove: false }));
                            return;
                        }
                    }
                    this.addMarbleToNeer(data.marble, marbleData);
                    deleteData.push(Object.assign(Object.assign({}, data), { isMove: true }));
                    return;
                }
            }
            if (Math.abs(data.marble.x) > this.width || Math.abs(data.marble.y) > this.height) {
                deleteData.push(Object.assign(Object.assign({}, data), { isMove: false }));
            }
        });
        deleteData.forEach((date) => {
            const index = this.marbleBoomList.findIndex(d => d.marble.ID === date.marble.ID);
            this.marbleBoomList.splice(index, 1);
            if (!date.isMove) {
                this.marbleColorCount[date.marble.Color]--;
            }
        });
    }
    removeMarbleFromDataList(marble, index = this.marbleDataList.findIndex(d => d.marble.ID === marble.ID)) {
        delete this.checkDeleteAfterTouchData[marble.ID];
        this.marbleDataList.splice(index, 1);
        this.marbleColorCount[marble.Color]--;
        return this;
    }
    addMarbleToNeer(marble, target) {
        const index = this.marbleDataList.findIndex(d => d.marble.ID === target.marble.ID);
        const oneMarblePercent = Marble.Size / this.PathLength;
        const prevPos = this.Path.getPointAtLength((target.percent - oneMarblePercent) * this.PathLength);
        const nextPos = this.Path.getPointAtLength((target.percent + oneMarblePercent) * this.PathLength);
        const prevGap = Math.pow((prevPos.x - marble.x), 2) + Math.pow((prevPos.y - marble.y), 2);
        const nextGap = Math.pow((nextPos.x - marble.x), 2) + Math.pow((nextPos.y - marble.y), 2);
        if (prevGap < nextGap) {
            this.marbleDataList.splice(index, 0, {
                marble,
                percent: target.percent - oneMarblePercent / 2
            });
        }
        else {
            this.marbleDataList.splice(index + 1, 0, {
                marble,
                percent: target.percent + oneMarblePercent / 2
            });
        }
        return this;
    }
    createMarble() {
        const marble = new Marble({ color: this.getColor() });
        this.marbleColorCount[marble.Color]++;
        return marble;
    }
    unshiftMarble() {
        const marble = this.createMarble();
        this.marbleDataList.unshift({
            marble,
            percent: 0,
        });
        this.autoAddMarbleCount++;
        return this;
    }
    getColor() {
        const index = ~~(Math.random() * this.colorList.length);
        const color = this.colorList[index];
        if (this.marbleColorCount[color] || this.colorList.length === 1 || !this.isInit) {
            return color;
        }
        this.colorList.splice(index, 1);
        return this.getColor();
    }
    getNeerSameMarble(marble) {
        let checkMarble;
        const index = this.marbleDataList.findIndex((ele) => ele.marble.ID === marble.ID);
        const neerList = [marble];
        checkMarble = marble;
        for (let i = index + 1; i < this.marbleDataList.length; i++) {
            const nowMarble = this.marbleDataList[i].marble;
            if (nowMarble.Color === checkMarble.Color &&
                nowMarble.overlap(checkMarble) > (Marble.Size / -10)) {
                checkMarble = nowMarble;
                neerList.push(nowMarble);
            }
            else {
                break;
            }
        }
        checkMarble = marble;
        for (let i = index - 1; i >= 0; i--) {
            const nowMarble = this.marbleDataList[i].marble;
            if (nowMarble.Color === checkMarble.Color &&
                nowMarble.overlap(checkMarble) > (Marble.Size / -10)) {
                checkMarble = nowMarble;
                neerList.push(nowMarble);
            }
            else {
                break;
            }
        }
        return neerList;
    }
    drawCanvas() {
        const ctx = this.Canvas.getContext('2d');
        const r = Marble.Size / 2 * window.devicePixelRatio;
        const PI2 = 2 * Math.PI;
        ctx.clearRect(0, 0, this.Canvas.width, this.Canvas.height);
        this.marbleDataList.forEach(marble => {
            ctx.beginPath();
            ctx.fillStyle = marble.marble.Color;
            ctx.arc(marble.marble.x * window.devicePixelRatio, marble.marble.y * window.devicePixelRatio, r, 0, PI2);
            ctx.closePath();
            ctx.fill();
        });
        this.marbleBoomList.forEach(marble => {
            ctx.beginPath();
            ctx.fillStyle = marble.marble.Color;
            ctx.arc(marble.marble.x * window.devicePixelRatio, marble.marble.y * window.devicePixelRatio, r, 0, PI2);
            ctx.closePath();
            ctx.fill();
        });
    }
    animation() {
        if (!this.isStart) {
            return;
        }
        requestAnimationFrame(() => this.animation());
        if (!this.isInit) {
            this.init().moveMoveMarbleData();
            this.drawCanvas();
            return;
        }
        const innerTime = new Date().getTime();
        if (innerTime - this.time < OneFrameTime) {
            return;
        }
        this.time = innerTime;
        if (this.moveTimes === this.moveSpeed &&
            this.autoAddMarbleCount < this.AllMarbleLength) {
            this.unshiftMarble();
            this.moveTimes = 0;
        }
        this.moveMoveMarbleBoom();
        this.moveMoveMarbleData();
        this.drawCanvas();
        this.moveTimes++;
        if (this.marbleDataList.length === 0) {
            this.isFinal = true;
        }
    }
}
Zuma.DefaultColorList = ["#0C3406", "#077187", "#74A57F", "#ABD8CE", "#E4C5AF"];


(function () {
  function boot() {
    var isMobile = mobileCheck();
    if (isMobile) {
      document.body.classList.add("is-mobile");
    }
    var scoreDOM = document.getElementById("score");
    var startPopup = document.getElementById("start-popup");
    var stopPopup = document.getElementById("stop-popup");
    var finalPopup = document.getElementById("final-popup");
    var finalNum = document.getElementById("final-score");
    var zumaMount = document.getElementById("zumaMount");
    var zumaStage = document.querySelector(".zuma-stage");
    var stopBtn = document.getElementById("stop-btn");
    var switchBtn = document.getElementById("switch-btn");
    var shootBtn = document.getElementById("shoot-btn");
    var moveBtn = document.getElementById("move-btn");
    var moveBtnControl = moveBtn ? moveBtn.querySelector(".move-control") : null;

    if (!zumaMount || !startPopup || !stopPopup || !finalPopup || !zumaStage) {
      return;
    }

    var zumaGame = new Zuma({
      width: 1200,
      height: 800,
      scale: 0.7,
      path:
        "M197.519,19.289C158.282,84.171,101.52,201.053,92.5,345.418c-6.6,105.632,47,236.043,159,295.679" +
        "s338.566,101.881,547,64.404c199-35.781,312.016-164.676,313-266c1-103-34-221.816-200-278.044" +
        "c-142.542-48.282-346.846-37.455-471,31.044c-116,64-154.263,213.533-81,304.619c92,114.381,410,116.381,476,2.891" +
        "c62.975-108.289-40-203.51-158-206.51",
      playerPos: { x: 550, y: 400 },
      updateScore: function (score) {
        if (scoreDOM) scoreDOM.textContent = String(score);
      },
      updateFinal: function (isFinal) {
        if (isFinal && finalPopup && finalNum) {
          finalPopup.classList.add("active");
          finalNum.textContent = String(zumaGame.score);
          syncPopupBlocking();
          if (typeof KidsCore !== "undefined") {
            KidsCore.recordGame("zuma");
            KidsCore.playSound("win");
            KidsCore.haptic("success");
          }
        }
      },
    });
    zumaGame.appendTo(zumaMount);

    function resize() {
      if (!zumaStage) return;
      var pad = 16;
      var w = zumaStage.clientWidth - pad;
      var h = zumaStage.clientHeight - pad;
      var scale = Math.min(h / zumaGame.height, w / zumaGame.width, 1);
      zumaGame.setScale(scale);
    }

    function aimFromClient(clientX, clientY) {
      zumaGame.lookAt(clientX, clientY);
    }

    function pauseZumaIfPlaying() {
      if (!zumaGame.isInit || !zumaGame.isStart || zumaGame.isFinal) return;
      zumaGame.stop();
      if (stopPopup) stopPopup.classList.add("active");
      if (stopBtn) stopBtn.classList.add("active");
      syncPopupBlocking();
    }

    document.addEventListener("keydown", function (e) {
      if (e.code === "Escape") {
        pauseZumaIfPlaying();
        return;
      }
      if (e.code === "Space" && zumaGame.isInit && zumaGame.isStart && !zumaGame.isFinal) {
        e.preventDefault();
        zumaGame.switchMarble();
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pauseZumaIfPlaying();
    });

    var popupContainer = document.querySelector(".popup-container");
    function syncPopupBlocking() {
      if (!popupContainer) return;
      if (popupContainer.querySelector(".popup.active")) {
        popupContainer.classList.add("popup-container--blocking");
      } else {
        popupContainer.classList.remove("popup-container--blocking");
      }
    }

    if (!isMobile) {
      if (typeof PointerEvent !== "undefined") {
        window.addEventListener("pointermove", function (e) {
          aimFromClient(e.clientX, e.clientY);
        });
      } else {
        document.addEventListener("mousemove", function (e) {
          aimFromClient(e.clientX, e.clientY);
        });
      }
      zumaMount.addEventListener("pointerdown", function (e) {
        if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
        e.preventDefault();
        if (!zumaGame.isInit || zumaGame.isFinal || !zumaGame.isStart) return;
        zumaGame.attack();
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("tap");
          KidsCore.haptic("light");
        }
      });
      zumaMount.addEventListener("click", function () {
        zumaGame.attack();
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("tap");
          KidsCore.haptic("light");
        }
      });
    } else {
      var isTouchstart = false;
      function rotate(e) {
        var moveTouch = null;
        var i;
        for (i = 0; i < e.touches.length; i++) {
          var t = e.touches[i];
          if (moveBtn && (t.target === moveBtn || moveBtn.contains(t.target))) {
            moveTouch = t;
            break;
          }
        }
        if (!zumaGame.isInit || zumaGame.isFinal || !zumaGame.isStart) return;
        if (!moveTouch && !isTouchstart) return;
        if (!moveTouch) return;
        var rect = moveBtn.getBoundingClientRect();
        var innerX = rect.x + rect.width / 2;
        var innerY = rect.y + rect.height / 2;
        zumaGame.lookAtVector(moveTouch.clientX - innerX, moveTouch.clientY - innerY);
        if (moveBtnControl) {
          moveBtnControl.style.transform =
            "translate(-50%, -150%) rotate(" + zumaGame.getPlayerRotate() + "deg)";
        }
      }
      switchBtn.addEventListener("click", function () {
        zumaGame.switchMarble();
      });
      shootBtn.addEventListener("click", function () {
        zumaGame.attack();
        if (typeof KidsCore !== "undefined") {
          KidsCore.playSound("tap");
          KidsCore.haptic("light");
        }
      });
      stopBtn.addEventListener("click", function () {
        zumaGame.stop();
        stopBtn.classList.add("active");
        stopPopup.classList.add("active");
        syncPopupBlocking();
      });
      moveBtn.addEventListener(
        "touchstart",
        function (e) {
          isTouchstart = true;
          rotate(e);
        },
        { passive: false }
      );
      window.addEventListener("touchend", function () {
        isTouchstart = false;
      });
      window.addEventListener("touchmove", rotate, { passive: false });
    }

    startPopup.querySelector("#init-btn").addEventListener("click", function () {
      startPopup.classList.remove("active");
      syncPopupBlocking();
      zumaGame.start();
    });
    stopPopup.querySelector("#start-btn").addEventListener("click", function () {
      stopPopup.classList.remove("active");
      if (stopBtn) stopBtn.classList.remove("active");
      syncPopupBlocking();
      setTimeout(function () {
        zumaGame.start();
      }, 100);
    });
    stopPopup.querySelector("#reset-btn").addEventListener("click", function () {
      stopPopup.classList.remove("active");
      if (stopBtn) stopBtn.classList.remove("active");
      finalPopup.classList.remove("active");
      syncPopupBlocking();
      zumaGame.reset().start();
    });
    finalPopup.querySelector("#restart-btn").addEventListener("click", function () {
      finalPopup.classList.remove("active");
      syncPopupBlocking();
      zumaGame.reset().start();
    });

    window.addEventListener("resize", resize);
    resize();

    syncPopupBlocking();

    if (typeof KidsCore !== "undefined") {
      KidsCore.init();
      KidsCore.bindTapSound(document.getElementById("app"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

})();
