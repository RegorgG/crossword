package com.kyc.snap.api;

import java.io.IOException;
import java.io.InputStream;

import org.glassfish.jersey.media.multipart.FormDataParam;

import com.kyc.snap.document.Document;
import com.kyc.snap.document.Section;
import com.kyc.snap.grid.Grid;
import com.kyc.snap.grid.GridLines;
import com.kyc.snap.grid.GridPosition;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Path("/documents")
public interface DocumentService {

    @GET
    @Path("/{documentId}")
    @Produces(MediaType.APPLICATION_JSON)
    Document getDocument(@PathParam("documentId") String documentId);

    @POST
    @Path("/pdf")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    Document createDocumentFromPdf(@FormDataParam("pdf") InputStream pdfStream) throws IOException;

    @POST
    @Path("/image")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    Document createDocumentFromImage(@FormDataParam("image") InputStream imageStream) throws IOException;

    @POST
    @Path("/url")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    Document createDocumentFromUrl(CreateDocumentFromUrlRequest request) throws Exception;

    record CreateDocumentFromUrlRequest(String url) {}

    @POST
    @Path("/{documentId}/lines")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    GridLines findGridLines(@PathParam("documentId") String documentId, FindGridLinesRequest request);

    record FindGridLinesRequest(Section section, FindGridLinesMode findGridLinesMode, boolean interpolate) {}

    enum FindGridLinesMode {

        EXPLICIT,
        IMPLICIT,
    }

    @POST
    @Path("/{documentId}/grid")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    FindGridResponse findGrid(@PathParam("documentId") String documentId, FindGridRequest request);

    record FindGridRequest(Section section, GridLines gridLines) {}

    record FindGridResponse(GridPosition gridPosition, Grid grid) {}
}
