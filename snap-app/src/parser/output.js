import "./output.css";

export function Output({ grid }) {
    if (grid === undefined) {
        return null;
    }
    const { squares } = grid;

    let numRows = squares.length + 1, numCols = 0;
    for (const row of squares) {
        numCols = Math.max(numCols, row.length + 1);
    }

    const tableRows = [];
    for (let row = 0; row < numRows; row++) {
        const rowCells = [];
        for (let col = 0; col < numCols; col++) {
            const cellProps = { key: col };
            let value = undefined;
            const square = squares[row] && squares[row][col];
            if (square !== undefined) {
                const { rgb, text, topBorder, leftBorder } = square;
                cellProps.style = {
                    backgroundColor: '#' + rgb.toString(16).padStart(6, '0'),
                    borderTop: borderToHtml(topBorder),
                    borderLeft: borderToHtml(leftBorder),
                    width: 20,
                    height: 20,
                };
                value = text;
            } else if (row === squares.length && col < squares[row - 1].length) {
                cellProps.style = {
                    borderTop: borderToHtml(squares[row - 1][col].bottomBorder),
                };
            } else if (row < squares.length && col === squares[row].length) {
                cellProps.style = {
                    borderLeft: borderToHtml(squares[row][col -  1].rightBorder),
                };
            }
            rowCells.push(<td
                {...cellProps}
            >
                {value}
            </td>);
        }
        tableRows.push(<tr key={row}>{rowCells}</tr>);
    }
    return <table className='parser-output'>
        <tbody>{tableRows}</tbody>
    </table>;
}

function borderToHtml(border) {
    switch (border.style) {
        case 'NONE': return undefined;
        case 'THIN': return "1px solid black";
        case 'MEDIUM': return "2px solid black";
        case 'THICK': return "3px solid black";
        default: throw Error();
    }
}
