
let nbStripes = 12;
let nbArcs = 2;
let minSpeed = 0.5;
let maxSpeed = 1;
let angleRandomness = 360;


// Tried using textures, completely failed

function setup() {
    createCanvas(1200, 600);
    angleMode(DEGREES);

    // Initializing the number of stripes/rings in setup to stop their animation
    initStripes();
    initRings();
}

function draw() {
    background('#d61e2a');

    // Rotating the rings/arcs(?) by their speed each frame
    for (let r of rings) {
        r.angle += r.speed;
    }

    stripes()

    bigTriangle()

    arcs()

}

function initStripes() {
    //Possible number of stripes ranges from {nbstripes -2 to +2}
    const minStripes = max(1, nbStripes - 2);
    const maxStripes = nbStripes + 2;
    stripeCount = int(random(minStripes, maxStripes));
}

function initRings() {
    rings = [];

    const minArcs = max(1, nbArcs - 2);
    const maxArcs = nbArcs + 2;
    currentArcCount = int(random(minArcs, maxArcs));

    // Giving each ring a random speed/starting angle
    for (let i = 0; i < currentArcCount; i++) {
        rings.push({
            angle: random(angleRandomness),
            speed: random(minSpeed, maxSpeed)
        });
    }
}

function bigTriangle() {
    noStroke();
    fill("#524e4e");

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
    fill("#641116");

    for (let i = 0; i < stripeCount; i++) {
        const x = i * 2 * stripeWidth;
        rect(x, 0, stripeWidth, height);
    }
}

function arcs() {
    // same vars as the Triangle
    const baseY = height;
    const apexY = height * 0.01;
    const apexX = width / 2;
    const marginX = width;

    // Clip drawing to triangle so rings stay inside
    // Basically a sort of "mask" over the triangle so the rings won't overflow and be drawn on the background
    push();
    const ctx = drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(marginX, baseY);
    ctx.lineTo(width - marginX, baseY);
    ctx.lineTo(apexX, apexY);
    ctx.closePath();
    ctx.clip();

    noFill();

    const count = currentArcCount

    const baseHalfWidth = width / 2 - marginX;

    for (let i = 0; i < count; i++) {
        const r = rings[i];

        // Forcing the rings to get smaller as it gets close to the top
        const t = (count === 1) ? 0 : i / (count - 1);

        const refPoint = lerp(baseY, apexY, t);
        const halfWidth = lerp(baseHalfWidth, 0, t) * 0.9;
        const diameter = halfWidth * 2;

        push();
        //Move to the center of each ring
        translate(apexX, refPoint);
        rotate(r.angle);

        strokeWeight(25);

        // Top half of the ring
        stroke("#ffffff");
        arc(0, 0, diameter, diameter, 180, 360);

        // Bottom half of the ring
        //stroke("#ffffff")
        stroke('#333333');
        arc(0, 0, diameter, diameter, 0, 180);
        pop();
    }

    ctx.restore();
    pop();
}
