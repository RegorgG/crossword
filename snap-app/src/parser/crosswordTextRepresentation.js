import React, { useState } from "react";

export function CrosswordTextRepresentation({ crossword }) {
    const [copied, setCopied] = useState(false);

    if (crossword === undefined) {
        return null;
    }

    const text = buildTextRepresentation(crossword);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        });
    };

    return <div className="crossword-text-representation">
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "13px" }}>{text}</pre>
        <div className="big button" onClick={copyToClipboard}>
            {copied ? "Copied!" : "Copy to clipboard"}
        </div>
    </div>;
}

function buildTextRepresentation(crossword) {
    const acrossEntries = crossword.entries
        .filter(e => e.direction === "ACROSS")
        .sort((a, b) => a.clueNumber - b.clueNumber);
    const downEntries = crossword.entries
        .filter(e => e.direction === "DOWN")
        .sort((a, b) => a.clueNumber - b.clueNumber);

    // Build a map from entry key to its intersections
    const intersections = new Map();
    const entryKey = (clueNumber, direction) => `${clueNumber}-${direction}`;

    for (const entry of crossword.entries) {
        intersections.set(entryKey(entry.clueNumber, entry.direction), []);
    }

    for (const across of acrossEntries) {
        for (const down of downEntries) {
            const acrossColStart = across.startCol;
            const acrossColEnd = across.startCol + across.numSquares - 1;
            const downRowStart = down.startRow;
            const downRowEnd = down.startRow + down.numSquares - 1;

            if (down.startCol >= acrossColStart && down.startCol <= acrossColEnd
                && across.startRow >= downRowStart && across.startRow <= downRowEnd) {
                const acrossLetterPos = down.startCol - across.startCol + 1;
                const downLetterPos = across.startRow - down.startRow + 1;

                intersections.get(entryKey(across.clueNumber, "ACROSS")).push(
                    `Letter ${acrossLetterPos} intersects ${down.clueNumber}-Down letter ${downLetterPos}`
                );
                intersections.get(entryKey(down.clueNumber, "DOWN")).push(
                    `Letter ${downLetterPos} intersects ${across.clueNumber}-Across letter ${acrossLetterPos}`
                );
            }
        }
    }

    let lines = [];

    lines.push(`Grid: ${crossword.numRows} rows x ${crossword.numCols} cols`);
    lines.push("");

    lines.push("ACROSS:");
    for (const entry of acrossEntries) {
        lines.push(`${entry.clueNumber}-Across: ${entry.numSquares} letters`);
        for (const ix of intersections.get(entryKey(entry.clueNumber, "ACROSS"))) {
            lines.push(`  - ${ix}`);
        }
    }

    lines.push("");
    lines.push("DOWN:");
    for (const entry of downEntries) {
        lines.push(`${entry.clueNumber}-Down: ${entry.numSquares} letters`);
        for (const ix of intersections.get(entryKey(entry.clueNumber, "DOWN"))) {
            lines.push(`  - ${ix}`);
        }
    }

    return lines.join("\n");
}
