let mainGrid;
let gridCellSize = 30; 
let maxDepth = 3; // how many GoL levels deep

// camera / zoom controls
let camX = 0;
let camY = 0;
let zoom = 1;
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 255, 255, 255);
  rectMode(CORNER);
  frameRate(12);

  let cols = floor(width / gridCellSize);
  let rows = floor(height / gridCellSize);
  mainGrid = new Grid(cols, rows, gridCellSize, 0);
}

function draw() {
  background(220, 20, 15); // dark organic background
  mainGrid.update();
  push();
  translate(camX, camY);
  scale(zoom);
  mainGrid.display();
  pop();
}

// zoom with mouse wheel
function mouseWheel(event) {
  const zoomFactor = 1.05;

  // world coordinates under the mouse before zoom
  const worldX = (mouseX - camX) / zoom;
  const worldY = (mouseY - camY) / zoom;

  if (event.deltaY < 0) {
    zoom *= zoomFactor;
  } else {
    zoom /= zoomFactor;
  }

  // Compute minimum zoom so the whole piece just fits
  // in the window when you are fully zoomed out.
  if (mainGrid) {
    const worldW = mainGrid.cols * mainGrid.size;
    const worldH = mainGrid.rows * mainGrid.size;
    const fitZoomW = width / worldW;
    const fitZoomH = height / worldH;
    const minZoomWorld = Math.min(fitZoomW, fitZoomH);
    const minZoom = Math.min(1, minZoomWorld); // don't force zoom > 1
    zoom = constrain(zoom, minZoom, 20);
  } else {
    zoom = constrain(zoom, 0.25, 20);
  }

  // adjust camera so the point under the mouse stays fixed
  camX = mouseX - worldX * zoom;
  camY = mouseY - worldY * zoom;
  return false; // prevent page scroll
}

// pan with mouse drag
function mousePressed() {
  isPanning = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
}

function mouseDragged() {
  if (isPanning) {
    camX += mouseX - lastMouseX;
    camY += mouseY - lastMouseY;
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }
}

function mouseReleased() {
  isPanning = false;
}


class Grid {
  constructor(cols, rows, size, depth) {
    this.cols = cols;
    this.rows = rows;
    this.size = size;
    this.depth = depth;

    this.cells = [];
    for (let i = 0; i < cols; i++) {
      this.cells[i] = [];
      for (let j = 0; j < rows; j++) {
        this.cells[i][j] = {
          alive: random() < 0.35,
          age: 0,
          decay: 0,
          sub: null
        };
      }
    }

    // Recursive: every cell can contain its own full Game of Life,
    // until we reach maxDepth.
    if (this.depth < maxDepth - 1) {
      const childCols = 3;
      const childRows = 3;
      const childSize = this.size / childCols; // child grid fits exactly in parent cell

      for (let i = 0; i < this.cols; i++) {
        for (let j = 0; j < this.rows; j++) {
          this.cells[i][j].sub = new Grid(childCols, childRows, childSize, this.depth + 1);
        }
      }
    }
  }

  update() {
    // Deeper levels update less frequently to save work:
    // depth 0: every frame, depth 1: every 2nd frame, depth 2: every 4th frame, etc.
    const step = 1 << this.depth;
    if (frameCount % step !== 0) {
      return;
    }

    let next = [];

    for (let i = 0; i < this.cols; i++) {
      next[i] = [];

      for (let j = 0; j < this.rows; j++) {
        let cell = this.cells[i][j];
        let neighbors = this.countNeighbors(i, j);

        let alive = cell.alive;
        let age = cell.age;
        let decay = cell.decay;
        let sub = cell.sub;

        // Classic Conway's Game of Life rules (B3/S23)
        if (alive && (neighbors < 2 || neighbors > 3)) {
          alive = false;
          decay = 8; // fade out
        } 
        else if (!alive && neighbors === 3) {
          alive = true;
          age = 0;
        }

        if (alive) {
          age++;
        } else if (decay > 0) {
          decay--;
        }

        next[i][j] = { alive, age, decay, sub };
      }
    }

    this.cells = next;

    // Update subgrids
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        if (this.cells[i][j].sub) {
          this.cells[i][j].sub.update();
        }
      }
    }
  }

  display(offsetX = 0, offsetY = 0) {
    // If this grid is so small on screen that it would
    // draw as less than 1 pixel per cell, skip drawing
    // deeper to keep things fast.
    if (this.size * zoom < 1) {
      return;
    }

    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        let cell = this.cells[i][j];

        let x = offsetX + i * this.size;
        let y = offsetY + j * this.size;

        // Grid structure (visible but subtle)
        stroke(220, 30, 40, 40);
        noFill();
        rect(x, y, this.size, this.size);

        if (cell.alive || cell.decay > 0) {
          let growth = constrain(cell.age / 8, 0, 1);
          let s = this.size * growth;

          // Organic color shift with depth + age
          let hue = 110 + this.depth * 25;
          let brightness = 200 - cell.age * 4;

          fill(hue, 180, brightness, 180);
          noStroke();

          rect(
            x + (this.size - s) / 2,
            y + (this.size - s) / 2,
            s,
            s
          );
        }

        // Always display the subgrid so you can zoom into it,
        // even if the parent cell is currently dead.
        if (cell.sub) {
          cell.sub.display(x, y);
        }
      }
    }
  }

  countNeighbors(x, y) {
    let sum = 0;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        let col = (x + i + this.cols) % this.cols;
        let row = (y + j + this.rows) % this.rows;

        if (!(i === 0 && j === 0)) {
          if (this.cells[col][row].alive) {
            sum++;
          }
        }
      }
    }

    return sum;
  }
}