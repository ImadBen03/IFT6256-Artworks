let table;
let nextAutoCreateFrame = 0;
let rectSystems = [];

let autoLife = true;
let autoCreate = true; 

let Hope = 0.3;


// Paramètres et config
// bunch of modifiers for a bigger contrasts between different values
const CONFIG = {
  size: {
    widthMin: 40,
    widthMax: 140,
    heightMin: 120,
    heightMax: 350
  },
  spacing: {
    max: 80,          // low competition → loose cage
    min: 10,          // high competition → tight cage
    openFactor: 3.0,  // how wide the cage opens when healing
    tightFactor: 0.1  // how tight the cage gets when breaking
  },
  spawn: {
    marginFactor: 0.3,
    targetXMin: 100,
    targetXRightMargin: 300,
    targetYMin: 100,
    targetYBottomMargin: 100,
    autoCreateInterval: 120 // base interval in frames between spawns
  },
  speed: {
    comboMin: 3,
    comboMax: 8,
    fast: 0.12,
    slow: 0.002
  },
  life: {
    healingRate: 0.006,
    breakingRate: 0.012,
    hopeProgressThreshold: 0.75 // how far into breaking before Hope can act
  },
  jitter: {
    healMax: 10,
    breakMax: 25,
    idleMax: 10,
    glitchBaseMin: 0.001,
    glitchHealMax: 0.01,
    glitchBreakMax: 0.04
  },
  auto: {
    lifeTriggerChance: 0.003 // 0.3% per frame
  }
};

function preload(){
    table = loadTable('data/Stats.csv', 'csv', 'header');
}

class RectSystem{

  constructor(row){

    // DATASET VALUES
    this.anxiety = table.getNum(row,"anxiety_tension");
    this.overload = table.getNum(row,"academic_overload");
    this.competition = table.getNum(row,"peer_competition");
    this.restlessness = table.getNum(row, "restlessness");
    this.sleepProblems = table.getNum(row, "sleep_problems");
    this.confidence = table.getNum(row, "subject_confidence");

    // SIZE (academic pressure)
    this.w = map(this.overload, 1, 5, CONFIG.size.widthMin, CONFIG.size.widthMax);
    this.h = map(this.overload, 1, 5, CONFIG.size.heightMin, CONFIG.size.heightMax);

    // SPACING (competition)
    this.spacing = map(this.competition, 1, 5, CONFIG.spacing.max, CONFIG.spacing.min);

    // START OFFSCREEN
    const angle = random(TWO_PI);
    const margin = max(width, height) * CONFIG.spawn.marginFactor;
    const radius = max(width, height) / 2 + margin;
    this.x = width / 2 + cos(angle) * radius;
    this.y = height / 2 + sin(angle) * radius;

    // TARGET POSITION
    this.targetX = random(CONFIG.spawn.targetXMin, width - CONFIG.spawn.targetXRightMargin);
    this.targetY = random(CONFIG.spawn.targetYMin, height - CONFIG.spawn.targetYBottomMargin);

    // MOVEMENT SPEED (restlessness + sleep problems)
    const combo = this.restlessness + this.sleepProblems; // 2..10
    this.speed = map(
      combo,
      CONFIG.speed.comboMin,
      CONFIG.speed.comboMax,
      CONFIG.speed.fast,
      CONFIG.speed.slow
    );

    // used only for transitions
    this.baseOverload = this.overload;
    this.baseSpacing = this.spacing;

    // mostly (only?) used for hovering
    this.currentW = this.w;
    this.currentH = this.h;

    this.mode = "idle";
    this.progress = 0;
    this.dead = false;

    this.canBeSaved = false;

  }

  startTransition(){
    if (this.mode !== "idle") return;

    // overall "state" of this row
    const issues = (this.anxiety + this.overload + this.competition + this.restlessness + this.sleepProblems) / (5 * 5);
    const resilience = this.confidence / 5;

    if (resilience >= issues) {
      this.mode = "healing";
      this.canBeSaved = false; // already safe
    } else {
      this.mode = "breaking";
      // roll once to see if Hope applies to this rectangle at all
      const p = constrain(Hope, 0, 1);
      this.canBeSaved = random() < p;
    }

    this.progress = 0;
  }

  update(){
    this.x = lerp(this.x, this.targetX, this.speed);
    this.y = lerp(this.y, this.targetY, this.speed);

    if (this.mode === "healing" || this.mode === "breaking") {

      // advance lifetime once transition has started
      const rate = this.mode === "healing" ? CONFIG.life.healingRate : CONFIG.life.breakingRate;
      this.progress = constrain(this.progress + rate, 0, 1);

      // saving some values pour une transition plus "smooth" when healing
      if (this.mode === "breaking" && this.canBeSaved && this.progress > CONFIG.life.hopeProgressThreshold) {
        this.baseOverload = lerp(this.baseOverload, 5, this.progress);
        this.baseSpacing = lerp(this.baseSpacing, this.baseSpacing * 0.3, this.progress);
        this.mode = "healing";
        this.progress = 0;
        this.canBeSaved = false;
      }

      // Mode affects how anxiety evolves over time.
      let anxietyForJitter;
      if (this.mode === "healing") {
        // just a chill guy
        anxietyForJitter = lerp(this.anxiety, 1, this.progress);
      } else {
        // bro's losing it
        anxietyForJitter = lerp(this.anxiety, 5, this.progress);
      }

      let maxJitter = this.mode === "healing" ? CONFIG.jitter.healMax : CONFIG.jitter.breakMax;
      let jitterBase = map(anxietyForJitter, 1, 5, 0, maxJitter);

      // small continuous jitter
      this.x += random(-jitterBase, jitterBase);
      this.y += random(-jitterBase * 0.3, jitterBase * 0.3);

      // occasional stronger horizontal glitch
      let glitchChance = map(
        anxietyForJitter,
        1,
        5,
        CONFIG.jitter.glitchBaseMin,
        this.mode === "healing" ? CONFIG.jitter.glitchHealMax : CONFIG.jitter.glitchBreakMax
      );
      if (random() < glitchChance) {
        this.x += random(-jitterBase * 3, jitterBase * 3);
      }

      // mark for removal when life finished
      if (this.progress >= 1) {
        this.dead = true;
      }

    } else {
      // idle state: constant anxiety jitter, no life progress yet
      let jitterBase = map(this.anxiety, 1, 5, 0, CONFIG.jitter.idleMax);
      this.x += random(-jitterBase, jitterBase);
      this.y += random(-jitterBase * 0.3, jitterBase * 0.3);
    }

  }

  display(){
    // compute animated overload and spacing based on mode/progress
    let effOverload;
    if (this.mode === "healing") {
      effOverload = lerp(this.baseOverload, 1, this.progress);
    } else if (this.mode === "breaking") {
      effOverload = lerp(this.baseOverload, 5, this.progress);
    } else {
      effOverload = this.baseOverload;
    }
    let w = map(effOverload, 1, 5, CONFIG.size.widthMin, CONFIG.size.widthMax);
    let h = map(effOverload, 1, 5, CONFIG.size.heightMin, CONFIG.size.heightMax);

    this.currentW = w;
    this.currentH = h;

    let effSpacing;
    if (this.mode === "healing") {
      // cage opens up and eventually disappears
      effSpacing = lerp(this.baseSpacing, this.baseSpacing * CONFIG.spacing.openFactor, this.progress);
    } else if (this.mode === "breaking") {
      // cage tightens
      effSpacing = lerp(this.baseSpacing, this.baseSpacing * CONFIG.spacing.tightFactor, this.progress);
    } else {
      effSpacing = this.baseSpacing;
    }

    strokeWeight(1);
    stroke(50);

    // color
    let tConf = map(this.confidence, 1, 5, 1, 0);
    let baseR = lerp(255, 160, tConf);
    let baseG = lerp(230, 20, tConf);
    let baseB = lerp(230, 20, tConf);

    let r = baseR, g = baseG, b = baseB;
    if (this.mode === "healing" || this.mode === "breaking") {
      let targetR, targetG, targetB;
      if (this.mode === "healing") {
        targetR = 120; targetG = 240; targetB = 150; // green-ish
      } else {
        targetR = 180; targetG = 40; targetB = 10; // red? sort of
      }
      r = lerp(baseR, targetR, this.progress);
      g = lerp(baseG, targetG, this.progress);
      b = lerp(baseB, targetB, this.progress);
    }

    let alpha = 200;
    if (this.mode === "healing" && this.progress > 0.7) {
      alpha = map(this.progress, 0.7, 1, 200, 0);
    }
    fill(r, g, b, alpha);
    rect(this.x, this.y, w, h);

    // cage
    if (!(this.mode === "healing" && this.progress > 0.8)) {
      strokeWeight(4);
      stroke(0, 180, 255);
      noFill();
      rect(
        this.x - effSpacing,
        this.y - effSpacing,
        w + 2 * effSpacing,
        h + 2 * effSpacing
      );
    }

  }

  isHovered() {
    if (this.dead) return false;
    return (
      mouseX >= this.x &&
      mouseX <= this.x + this.currentW &&
      mouseY >= this.y &&
      mouseY <= this.y + this.currentH
    );
  }

  displayTooltip() {
    push();

    const lines = [
      `anxiety_tension: ${this.anxiety.toFixed(2)}`,
      `academic_overload: ${this.overload.toFixed(2)}`,
      `peer_competition: ${this.competition.toFixed(2)}`,
      `restlessness: ${this.restlessness.toFixed(2)}`,
      `sleep_problems: ${this.sleepProblems.toFixed(2)}`,
      `subject_confidence: ${this.confidence.toFixed(2)}`
    ];

    const padding = 8;
    const lineH = 16;
    const boxW = 220;
    const boxH = lines.length * lineH + padding * 2;

    let tx = mouseX + 12;
    let ty = mouseY + 12;

    if (tx + boxW > width) tx = width - boxW - 10;
    if (ty + boxH > height) ty = height - boxH - 10;

    noStroke();
    fill(0, 200);
    rect(tx, ty, boxW, boxH);

    fill(255);
    textSize(12);
    textAlign(LEFT, TOP);
    for (let i = 0; i < lines.length; i++) {
      text(lines[i], tx + padding, ty + padding + i * lineH);
    }

    pop();
  }

}

function setup(){

  createCanvas(windowWidth,windowHeight);
  nextAutoCreateFrame = CONFIG.spawn.autoCreateInterval;

}

function mousePressed() {
  if (!table) return;

  let rowCount = table.getRowCount();
  if (rowCount === 0) return;

  let idx = floor(random(rowCount));
  rectSystems.push(new RectSystem(idx));
}

function keyPressed() {
  if (key === ' ') {
    let candidates = rectSystems.filter(r => r.mode === "idle");
    if (candidates.length === 0) return;
    let chosen = random(candidates);
    chosen.startTransition();
  }
}

function draw(){

  background(0);

  life();

  autoCreateRects();

  for (let i = rectSystems.length - 1; i >= 0; i--) {
    let r = rectSystems[i];
    r.update();
    r.display();
    if (r.dead) {
      rectSystems.splice(i, 1);
    }
  }

  let hovered = null;
  for (let i = 0; i < rectSystems.length; i++) {
    if (rectSystems[i].isHovered()) {
      hovered = rectSystems[i];
      break;
    }
  }

  if (hovered) {
    hovered.displayTooltip();
  }

}

function life(){
  if (!autoLife) return;


  for (let i = 0; i < rectSystems.length; i++) {
    const r = rectSystems[i];
    if (r.mode === "idle") {
      if (random() < CONFIG.auto.lifeTriggerChance) {
        r.startTransition();
      }
    }
  }
}

function autoCreateRects(){
  if (!autoCreate) return;
  if (!table) return;

  // wait until it's time for the next spawn
  if (frameCount < nextAutoCreateFrame) return;

  const rowCount = table.getRowCount();
  if (rowCount <= 0) return;

  // create a rectangle from a random row
  const idx = floor(random(rowCount));
  rectSystems.push(new RectSystem(idx));

  const jitter = random(0.5, 1.5);
  nextAutoCreateFrame = frameCount + floor(CONFIG.spawn.autoCreateInterval * jitter);
}