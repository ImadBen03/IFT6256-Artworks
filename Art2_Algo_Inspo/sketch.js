let cellSize = 20; // grid cell size
let targetFPS = 60;
let showDeadHistory = true;

let cols, rows;
let grid;
let nextGrid;
let colorGrid; 



let maxPhase = 360; // how many steps in the rainbow cycle

function setup() {
	createCanvas(windowWidth, windowHeight);
	colorMode(HSB, 360, 100, 100);
	frameRate(targetFPS);
	initGrid();
}

function initGrid() {
	cols = floor(width / cellSize);
	rows = floor(height / cellSize);
	grid = makeEmptyGrid(cols, rows);
	nextGrid = makeEmptyGrid(cols, rows);
	colorGrid = makeEmptyGrid(cols, rows);

	for (let x = 0; x < cols; x++) {
		for (let y = 0; y < rows; y++) {
			grid[x][y] = 0;
			colorGrid[x][y] = 0;
		}
	}
}

function makeEmptyGrid(c, r) {
	let arr = new Array(c);
	for (let x = 0; x < c; x++) {
		arr[x] = new Array(r).fill(0);
	}
	return arr;
}

function draw() {
	background(0);

	// update Game of Life state
	updateGameOfLife();

	// Updating colors for each cell
	for (let x = 0; x < cols; x++) {
		for (let y = 0; y < rows; y++) {
			if (grid[x][y] === 1) {
				// Be white si first life
				if (colorGrid[x][y] === 0) {
					colorGrid[x][y] = 1;
				} else {
					colorGrid[x][y] = (colorGrid[x][y] + 1) % (maxPhase + 1);
				}
			}
		}
	}

	// drawing the grid lines (lowkey optional)
	stroke(60);
	noFill();
	for (let x = 0; x < cols; x++) {
		for (let y = 0; y < rows; y++) {
			let px = x * cellSize;
			let py = y * cellSize;
			rect(px, py, cellSize, cellSize);
		}
	}

	// Updating colors and stuff
	noStroke();
	for (let x = 0; x < cols; x++) {
		for (let y = 0; y < rows; y++) {
			let phase = colorGrid[x][y];
			let state = grid[x][y];
			if (phase > 0) {
				let px = x * cellSize;
				let py = y * cellSize;

				if (!showDeadHistory || state === 1) {
					// showDeadHistory is false, keep colors bright
					if (phase === 1) {
						fill(0, 0, 100);
					} else {
						let hue = (phase % 360);
						fill(hue, 100, 100);
					}
				} else {
					// showDeadHistory true, make them disgustingly dull :/
					if (phase === 1) {
						fill(0, 0, 40);
					} else {
						let hue = (phase % 360);
						fill(hue, 40, 40);
					}
				}

				rect(px, py, cellSize, cellSize);
			}
		}
	}
}

// the quirky part, giving life based on the mouse's position
function mousePressed() {
	let gx = floor(mouseX / cellSize);
	let gy = floor(mouseY / cellSize);
	if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return;

	// turn grid index into a number, then digital root 1..9
	let index = gy * cols + gx + 1;
	console.log(index);
	let dr = digitalRoot(index); // 1..9
	console.log(dr);

	// use digital root as radius: bigger dr = larger seed blob
	for (let dx = -dr; dx <= dr; dx++) {
		for (let dy = -dr; dy <= dr; dy++) {
			let x = (gx + dx + cols) % cols;
			let y = (gy + dy + rows) % rows;
			grid[x][y] = 1;
		}
	}
}

function digitalRoot(n) {
	while (n > 9) {
    let sum = 0;
    // Convert the number to a string to iterate through digits
    const nAsString = String(n);
    for (let i = 0; i < nAsString.length; i++) {
      sum += parseInt(nAsString[i], 10);
    }
    // Update n with the new sum for the next iteration
    n = sum;
  }
  return n;
  	//Optimized version, mais pas assez claire ig
  	// n = Math.abs(n);
	// if (n === 0) return 0;
	// return 1 + ((n - 1) % 9);
}

function updateGameOfLife() {
	for (let x = 0; x < cols; x++) {
		for (let y = 0; y < rows; y++) {
			let state = grid[x][y];
			let neighbors = countNeighbors(x, y);

			// Standard game of life rules
			if (state === 1 && (neighbors < 2 || neighbors > 3)) {
				// dies
				nextGrid[x][y] = 0;
			} else if (state === 0 && neighbors === 3) {
				// birth
				nextGrid[x][y] = 1;
			} else {
				// stays the same
				nextGrid[x][y] = state;
			}
			//tried some modifications, but lowkey messed everything up
		}
	}

	// swap grids
	let tmp = grid;
	grid = nextGrid;
	nextGrid = tmp;
}

function countNeighbors(x, y) {
	let sum = 0;
	for (let i = -1; i <= 1; i++) {
		for (let j = -1; j <= 1; j++) {
			if (i === 0 && j === 0) continue;
			let col = (x + i + cols) % cols;
			let row = (y + j + rows) % rows;
			sum += grid[col][row];
		}
	}
	return sum;
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
	initGrid();
}

