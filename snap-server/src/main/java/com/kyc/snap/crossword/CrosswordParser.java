package com.kyc.snap.crossword;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

import com.kyc.snap.crossword.Crossword.Entry;
import com.kyc.snap.grid.Border.Style;
import com.kyc.snap.grid.Grid;
import com.kyc.snap.grid.Grid.Square;
import com.kyc.snap.image.ImageUtils;

public class CrosswordParser {

    public Crossword parseCrossword(Grid grid) {
        return Stream.of(Style.THIN, Style.THICK)
            .map(maxBorderStyle -> parseCrossword(grid, maxBorderStyle))
            .max(Comparator.comparing(crossword -> crossword.entries().size()))
            .get();
    }

    private Crossword parseCrossword(Grid grid, Style maxBorderStyle) {
        Square[][] squares = grid.squares();
        CrosswordSquare[][] crosswordSquares = new CrosswordSquare[grid.numRows()][grid.numCols()];
        for (int i = 0; i < grid.numRows(); i++)
            for (int j = 0; j < grid.numCols(); j++) {
                boolean isOpen = ImageUtils.isLight(squares[i][j].rgb);
                boolean canGoAcross = isOpen && j < grid.numCols() - 1 && ImageUtils.isLight(squares[i][j + 1].rgb)
                        && squares[i][j].rightBorder.style.compareTo(maxBorderStyle) <= 0;
                boolean canGoDown = isOpen && i < grid.numRows() - 1 && ImageUtils.isLight(squares[i + 1][j].rgb)
                        && squares[i][j].bottomBorder.style.compareTo(maxBorderStyle) <= 0;
                crosswordSquares[i][j] = new CrosswordSquare(isOpen, canGoAcross, canGoDown);
            }

        int clueNumber = 1;
        List<Entry> entries = new ArrayList<>();
        for (int i = 0; i < grid.numRows(); i++)
            for (int j = 0; j < grid.numCols(); j++) {
                CrosswordSquare square = crosswordSquares[i][j];
                boolean hasEntry = false;
                if (square.canGoAcross && (j == 0 || !crosswordSquares[i][j - 1].canGoAcross)) {
                    int numSquares = 2;
                    while (crosswordSquares[i][j + numSquares - 1].canGoAcross)
                        numSquares++;
                    entries.add(new Entry(i, j, numSquares, ClueDirection.ACROSS, clueNumber));
                    hasEntry = true;
                }
                if (square.canGoDown && (i == 0 || !crosswordSquares[i - 1][j].canGoDown)) {
                    int numSquares = 2;
                    while (crosswordSquares[i + numSquares - 1][j].canGoDown)
                        numSquares++;
                    entries.add(new Entry(i, j, numSquares, ClueDirection.DOWN, clueNumber));
                    hasEntry = true;
                }
                if (hasEntry)
                    clueNumber++;
            }

        return new Crossword(grid.numRows(), grid.numCols(), entries);
    }

    private record CrosswordSquare(boolean isOpen, boolean canGoAcross, boolean canGoDown) {}
}
