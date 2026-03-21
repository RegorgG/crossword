// ─── Border State ────────────────────────────────────────────────
// horizBorders[r][c]: border ABOVE cell (r,c). r in 0..13, c in 0..12
// vertBorders[r][c]: border LEFT of cell (r,c).  r in 0..12, c in 0..13
// Outer edges (r=0, r=13 for horiz; c=0, c=13 for vert) are fixed thick.

const ROWS = 13;
const COLS = 13;

let horizBorders = makeHorizBorders();
let vertBorders = makeVertBorders();

function makeHorizBorders() {
    return Array.from({ length: ROWS + 1 }, (_, r) =>
        Array.from({ length: COLS }, () => r === 0 || r === ROWS)
    );
}

function makeVertBorders() {
    return Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS + 1 }, (_, c) => c === 0 || c === COLS)
    );
}

// ─── Grid Rendering ─────────────────────────────────────────────

function buildGrid() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    const SIZE = 2 * ROWS + 1; // 27

    for (let gi = 0; gi < SIZE; gi++) {
        for (let gj = 0; gj < SIZE; gj++) {
            const rowEven = gi % 2 === 0;
            const colEven = gj % 2 === 0;

            const el = document.createElement("div");
            el.style.gridRow = gi + 1;
            el.style.gridColumn = gj + 1;

            if (!rowEven && !colEven) {
                // Cell
                el.className = "grid-cell";
                el.dataset.row = (gi - 1) / 2;
                el.dataset.col = (gj - 1) / 2;
            } else if (rowEven && colEven) {
                // Corner
                el.className = "grid-corner";
            } else if (rowEven && !colEven) {
                // Horizontal border
                const r = gi / 2;
                const c = (gj - 1) / 2;
                el.className = "grid-border horiz";
                el.dataset.borderType = "horiz";
                el.dataset.r = r;
                el.dataset.c = c;

                if (r === 0 || r === ROWS) {
                    el.classList.add("outer", "thick");
                } else {
                    el.addEventListener("click", () => toggleBorder("horiz", r, c));
                    if (horizBorders[r][c]) el.classList.add("thick");
                }
            } else {
                // Vertical border
                const r = (gi - 1) / 2;
                const c = gj / 2;
                el.className = "grid-border vert";
                el.dataset.borderType = "vert";
                el.dataset.r = r;
                el.dataset.c = c;

                if (c === 0 || c === COLS) {
                    el.classList.add("outer", "thick");
                } else {
                    el.addEventListener("click", () => toggleBorder("vert", r, c));
                    if (vertBorders[r][c]) el.classList.add("thick");
                }
            }

            grid.appendChild(el);
        }
    }
}

function toggleBorder(type, r, c) {
    if (type === "horiz") {
        horizBorders[r][c] = !horizBorders[r][c];
    } else {
        vertBorders[r][c] = !vertBorders[r][c];
    }
    // Update just this element's visual state
    const el = grid.querySelector(
        `.grid-border[data-border-type="${type}"][data-r="${r}"][data-c="${c}"]`
    );
    if (el) {
        el.classList.toggle("thick");
    }
}

// ─── Crossword Interpretation ───────────────────────────────────

function interpretCrossword() {
    const entries = [];
    let clueNumber = 0;
    // cellNumbers[r][c] = assigned clue number or 0
    const cellNumbers = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let startsAcross = false;
            let startsDown = false;

            // Starts ACROSS: left border thick AND right border thin AND word >= 2
            if (vertBorders[r][c] && c + 1 < COLS && !vertBorders[r][c + 1]) {
                startsAcross = true;
            }

            // Starts DOWN: top border thick AND bottom border thin AND word >= 2
            if (horizBorders[r][c] && r + 1 < ROWS && !horizBorders[r + 1][c]) {
                startsDown = true;
            }

            if (startsAcross || startsDown) {
                clueNumber++;
                cellNumbers[r][c] = clueNumber;

                if (startsAcross) {
                    // Count length
                    let len = 1;
                    let cc = c + 1;
                    while (cc < COLS && !vertBorders[r][cc]) {
                        len++;
                        cc++;
                    }
                    entries.push({
                        clueNumber,
                        direction: "ACROSS",
                        startRow: r,
                        startCol: c,
                        numSquares: len,
                    });
                }

                if (startsDown) {
                    let len = 1;
                    let rr = r + 1;
                    while (rr < ROWS && !horizBorders[rr][c]) {
                        len++;
                        rr++;
                    }
                    entries.push({
                        clueNumber,
                        direction: "DOWN",
                        startRow: r,
                        startCol: c,
                        numSquares: len,
                    });
                }
            }
        }
    }

    const crossword = { numRows: ROWS, numCols: COLS, entries };

    // Render clue numbers in grid cells
    renderClueNumbers(cellNumbers);

    // Build text representation
    const text = buildTextRepresentation(crossword);

    // Show output
    const outputPre = document.getElementById("output-text");
    outputPre.textContent = text;
    document.getElementById("output-section").style.display = "block";
}

function renderClueNumbers(cellNumbers) {
    const cells = document.querySelectorAll(".grid-cell");
    cells.forEach((cell) => {
        // Remove existing number
        const existing = cell.querySelector(".clue-number");
        if (existing) existing.remove();

        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        const num = cellNumbers[r][c];
        if (num > 0) {
            const span = document.createElement("span");
            span.className = "clue-number";
            span.textContent = num;
            cell.appendChild(span);
        }
    });
}

function clearClueNumbers() {
    document.querySelectorAll(".grid-cell .clue-number").forEach((el) => el.remove());
}

// ─── Text Representation (matches snap-app format) ──────────────

function buildTextRepresentation(crossword) {
    const acrossEntries = crossword.entries
        .filter((e) => e.direction === "ACROSS")
        .sort((a, b) => a.clueNumber - b.clueNumber);
    const downEntries = crossword.entries
        .filter((e) => e.direction === "DOWN")
        .sort((a, b) => a.clueNumber - b.clueNumber);

    // Build intersection map
    const intersections = new Map();
    const entryKey = (num, dir) => `${num}-${dir}`;

    for (const entry of crossword.entries) {
        intersections.set(entryKey(entry.clueNumber, entry.direction), []);
    }

    for (const across of acrossEntries) {
        for (const down of downEntries) {
            const aColStart = across.startCol;
            const aColEnd = across.startCol + across.numSquares - 1;
            const dRowStart = down.startRow;
            const dRowEnd = down.startRow + down.numSquares - 1;

            if (
                down.startCol >= aColStart &&
                down.startCol <= aColEnd &&
                across.startRow >= dRowStart &&
                across.startRow <= dRowEnd
            ) {
                const acrossLetterPos = down.startCol - across.startCol + 1;
                const downLetterPos = across.startRow - down.startRow + 1;

                intersections
                    .get(entryKey(across.clueNumber, "ACROSS"))
                    .push(
                        `Letter ${acrossLetterPos} intersects ${down.clueNumber}-Down letter ${downLetterPos}`
                    );
                intersections
                    .get(entryKey(down.clueNumber, "DOWN"))
                    .push(
                        `Letter ${downLetterPos} intersects ${across.clueNumber}-Across letter ${acrossLetterPos}`
                    );
            }
        }
    }

    const lines = [];

    lines.push(`Grid: ${crossword.numRows} rows x ${crossword.numCols} cols`);
    lines.push("");

    // Numbered squares (deduplicated)
    const seen = new Set();
    const numberedSquares = [];
    for (const entry of crossword.entries) {
        const key = `${entry.startRow},${entry.startCol}`;
        if (!seen.has(key)) {
            seen.add(key);
            numberedSquares.push(entry);
        }
    }
    numberedSquares.sort((a, b) => a.clueNumber - b.clueNumber);

    if (numberedSquares.length > 0) {
        lines.push("NUMBERED SQUARES:");
        for (const sq of numberedSquares) {
            lines.push(`(row ${sq.startRow}, col ${sq.startCol}): ${sq.clueNumber}`);
        }
        lines.push("");
    }

    lines.push("ACROSS:");
    for (const entry of acrossEntries) {
        lines.push(`${entry.clueNumber}-Across: ${entry.numSquares} letters`);
        for (const ix of intersections.get(
            entryKey(entry.clueNumber, "ACROSS")
        )) {
            lines.push(`  - ${ix}`);
        }
    }

    lines.push("");
    lines.push("DOWN:");
    for (const entry of downEntries) {
        lines.push(`${entry.clueNumber}-Down: ${entry.numSquares} letters`);
        for (const ix of intersections.get(
            entryKey(entry.clueNumber, "DOWN")
        )) {
            lines.push(`  - ${ix}`);
        }
    }

    return lines.join("\n");
}

// ─── Actions ────────────────────────────────────────────────────

function resetGrid() {
    horizBorders = makeHorizBorders();
    vertBorders = makeVertBorders();
    clearClueNumbers();
    document.getElementById("output-section").style.display = "none";
    document.getElementById("output-text").textContent = "";
    buildGrid();
}

function copyToClipboard() {
    const text = document.getElementById("output-text").textContent;
    const btn = document.getElementById("copy-btn");
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => {
            btn.textContent = "Copy to clipboard";
        }, 3000);
    });
}

// ─── Init ───────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    buildGrid();
});
