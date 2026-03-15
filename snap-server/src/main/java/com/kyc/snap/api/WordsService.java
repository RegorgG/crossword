package com.kyc.snap.api;

import com.kyc.snap.crossword.Crossword;
import com.kyc.snap.grid.Grid;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@Path("/")
public interface WordsService {

    @POST
    @Path("words/findCrossword")
    FindCrosswordResponse findCrossword(FindCrosswordRequest request);

    record FindCrosswordRequest(Grid grid) {}

    record FindCrosswordResponse(Crossword crossword) {}
}
