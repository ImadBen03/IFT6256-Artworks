
let nbStripes = 12;
let nbArcs = 7;
let minSpeed = 0.5;
let maxSpeed = 1;
let angleRandomness = 361;

let rings = [];
let currentArcCount = 0;
let stripeCount;

function preload() {
    rock = loadImage('black-stone.jpg');
}

function setup() {
    createCanvas(1200, 600);
    angleMode(DEGREES);

    initStripes();
    initRings();
}

function draw() {
    background('#d61e2a');

    // Only rotate rings each frame (count fixed until refresh)
    for (let r of rings) {
        r.angle += r.speed;
    }

    stripes();
    bigTriangle();
    arcs();
}

function initStripes() {
    const minStripes = max(1, nbStripes - 3);
    const maxStripes = nbStripes + 2;
    stripeCount = int(random(minStripes, maxStripes + 1));
}

function initRings() {
    rings = [];

    const minArcs = max(1, nbArcs - 1);
    const maxArcs = nbArcs + 1;
    currentArcCount = int(random(minArcs, maxArcs + 1));

    // Just store angle/speed; positions are computed in arcs()
    for (let i = 0; i < currentArcCount; i++) {
        rings.push({
            angle: random(angleRandomness),
            speed: random(minSpeed, maxSpeed)
        });
    }
}

function bigTriangle() {
    noStroke();
    fill('#524e4e');

    const baseY = height;
    const marginX = width;
    const apexY = height * 0.01;
    const apexX = width / 2;

    triangle(marginX, baseY, width - marginX, baseY, apexX, apexY);
}

function stripes() {
    const totalSlots = stripeCount * 2 - 1;
    const stripeWidth = width / totalSlots;

    noStroke();
    fill('#641116');

    for (let i = 0; i < stripeCount; i++) {
        const x = i * 2 * stripeWidth;
        rect(x, 0, stripeWidth, height);
    }
}

function arcs() {
    // Same layout as before, but no clipping: rings can extend outside triangle
    const baseY = height;
    const apexY = height * 0.01;
    const apexX = width / 2;
    const marginX = width;

    noFill();

    const count = currentArcCount || rings.length;
    if (count === 0) {
        return;
    }

    const baseHalfWidth = width / 2 - marginX;

    for (let i = 0; i < count; i++) {
        const r = rings[i];

        // 0 at base, 1 at apex
        const t = (count === 1) ? 0 : i / (count - 1);

        const cy = lerp(baseY, apexY, t);
        const halfWidth = lerp(baseHalfWidth, 0, t) * 0.9;
        const diameter = halfWidth * 2;

        push();
        translate(apexX, cy);
        rotate(r.angle);

        strokeWeight(25);

        // Top half
        stroke('#ffffff');
        arc(0, 0, diameter, diameter, 180, 360);

        // Bottom half
        stroke('#333333');
        arc(0, 0, diameter, diameter, 0, 180);

        pop();
    }
}
