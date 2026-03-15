package com.kyc.snap.server;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.google.common.io.ByteStreams;
import com.kyc.snap.api.DocumentService;
import com.kyc.snap.document.Document;
import com.kyc.snap.document.Document.DocumentPage;
import com.kyc.snap.document.Document.DocumentText;
import com.kyc.snap.document.Pdf;
import com.kyc.snap.document.Rectangle;
import com.kyc.snap.document.Section;
import com.kyc.snap.grid.Grid;
import com.kyc.snap.grid.GridLines;
import com.kyc.snap.grid.GridParser;
import com.kyc.snap.grid.GridPosition;
import com.kyc.snap.image.ImageUtils;
import com.kyc.snap.store.Store;

import javax.imageio.ImageIO;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public record DocumentResource(
        Store store,
        GridParser gridParser) implements DocumentService {

    private static final int DOCUMENT_SIZE_LIMIT = 10_000_000;

    @Override
    public Document getDocument(String documentId) {
        return store.getObject(documentId, Document.class);
    }

    @Override
    public Document createDocumentFromPdf(InputStream pdfStream) throws IOException {
        String id = UUID.randomUUID().toString();
        List<DocumentPage> pages = new ArrayList<>();
        try (Pdf pdf = new Pdf(ByteStreams.limit(pdfStream, DOCUMENT_SIZE_LIMIT))) {
            for (int page = 0; page < pdf.getNumPages(); page++) {
                BufferedImage image = pdf.toImage(page);
                String imageId = store.storeBlob(ImageUtils.toBytes(image));
                String compressedImageId = store.storeBlob(ImageUtils.toBytesCompressed(image));
                List<DocumentText> texts = pdf.getTexts(page);
                pages.add(new DocumentPage(imageId, compressedImageId, Pdf.RENDER_SCALE, texts));
            }
        }
        Document doc = new Document(id, pages);
        store.updateObject(id, doc);
        return doc;
    }

    @Override
    public Document createDocumentFromImage(InputStream imageStream) throws IOException {
        String id = UUID.randomUUID().toString();
        BufferedImage image = ImageIO.read(ByteStreams.limit(imageStream, DOCUMENT_SIZE_LIMIT));
        String imageId = store.storeBlob(ImageUtils.toBytes(image));
        String compressedImageId = store.storeBlob(ImageUtils.toBytesCompressed(image));
        Document doc = new Document(id, List.of(new DocumentPage(imageId, compressedImageId, 1, List.of())));
        store.updateObject(id, doc);
        return doc;
    }

    @Override
    public Document createDocumentFromUrl(CreateDocumentFromUrlRequest request) throws Exception {
        String url = request.url();
        String urlExtension = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
        try (Response response = new OkHttpClient().newCall(new Request.Builder().url(url).get().build()).execute()) {
            String contentType = response.header("Content-Type").toLowerCase();
            InputStream responseStream = response.body().byteStream();
            if (contentType.equals("application/pdf") || urlExtension.equals("pdf"))
                return createDocumentFromPdf(responseStream);
            else if (contentType.startsWith("image/") || urlExtension.equals("png") || urlExtension.equals("jpg"))
                return createDocumentFromImage(responseStream);
            else {
                File tempPdf = File.createTempFile("snap", ".pdf");
                try {
                    int exitCode = new ProcessBuilder("google-chrome", "--headless", "--disable-gpu", "--no-margins", "--no-sandbox",
                            "--print-to-pdf=" + tempPdf.getAbsolutePath(), url).start().waitFor();
                    if (exitCode != 0)
                        throw new IllegalStateException("Chrome printToPDF failed with exit code " + exitCode);
                    try (FileInputStream in = new FileInputStream(tempPdf)) {
                        return createDocumentFromPdf(in);
                    }
                } finally {
                    tempPdf.delete();
                }
            }
        }
    }

    @Override
    public GridLines findGridLines(String documentId, FindGridLinesRequest request) {
        BufferedImage image = getSectionImage(documentId, request.section()).image();
        GridLines gridLines = switch (request.findGridLinesMode()) {
            case EXPLICIT -> gridParser.findGridLines(image);
            case IMPLICIT -> gridParser.findImplicitGridLines(image);
        };
        if (request.interpolate())
            gridLines = gridParser.getInterpolatedGridLines(gridLines);
        return gridLines;
    }

    @Override
    public FindGridResponse findGrid(String documentId, FindGridRequest request) {
        GridLines gridLines = request.gridLines();
        GridPosition gridPosition = gridParser.getGridPosition(gridLines);
        Grid grid = new Grid(gridPosition.getNumRows(), gridPosition.getNumCols());
        SectionImage image = getSectionImage(documentId, request.section());
        gridParser.findGridColors(image.image(), gridPosition, grid);
        gridParser.findGridBorders(image.image(), gridPosition, grid);
        gridParser.findGridBorderStyles(grid);
        gridParser.findGridText(image.texts(), request.section().rectangle(), gridPosition, grid);
        return new FindGridResponse(gridPosition, grid);
    }

    private SectionImage getSectionImage(String documentId, Section section) {
        Document doc = getDocument(documentId);
        DocumentPage page = doc.pages().get(section.page());
        byte[] imageBlob = store.getBlob(page.imageId());
        Rectangle r = section.rectangle();
        BufferedImage image = ImageUtils.fromBytes(imageBlob)
                .getSubimage((int) r.x(), (int) r.y(), (int) r.width(), (int) r.height());
        return new SectionImage(image, page.scale(), page.texts());
    }

    private record SectionImage(BufferedImage image, double scale, List<DocumentText> texts) {}
}
