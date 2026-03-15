package com.kyc.snap.server;

import com.kyc.snap.api.WordsService;
import com.kyc.snap.crossword.Crossword;
import com.kyc.snap.crossword.CrosswordParser;

public record WordsResource(CrosswordParser crosswordParser) implements WordsService {

    @Override
    public FindCrosswordResponse findCrossword(FindCrosswordRequest request) {
        Crossword crossword = crosswordParser.parseCrossword(request.grid());
        return new FindCrosswordResponse(crossword);
    }
}
