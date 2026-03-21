import classNames from "classnames";
import React from "react";
import { get, post, postJson } from "../fetch";
import { AdvancedSettingsPopup } from "./advancedSettingsPopup";
import { CrosswordTextRepresentation } from "./crosswordTextRepresentation";
import { DocumentImage } from "./documentImage";
import { Output } from "./output";
import "./parser.css";

export default class Parser extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            url: '',
            document: undefined,

            page: 0,
            imageDataUrl: undefined,
            mode: undefined,
            popupMode: undefined,
            imageDimensions: { width: 0, height: 0 },
            selectedAll: false,
            rectangle: undefined,
            gridLines: undefined,
            gridPosition: undefined,
            grid: undefined,
            crossword: undefined,

            editGridLinesDirection: "COL",
            removeLineMode: false,

            findGridLinesMode: "EXPLICIT",
            interpolateSetting: true,

            loadingDocument: false,
            loadingGrid: false,
        };
    }

    componentDidMount() {
        window.addEventListener("paste", this.pasteImage);
    }

    componentWillUnmount() {
        window.removeEventListener("paste", this.pasteImage);
    }

    componentDidUpdate(_, prevState) {
        const { document, page } = this.state;
        if (document !== undefined ) {
            if (document !== prevState.document || page !== prevState.page) {
                const { compressedImageId } = document.pages[page];
                get({ path: `/files/${compressedImageId}` }, response => {
                    response.blob().then(blob => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            this.setState({ imageDataUrl: reader.result });
                        };
                        reader.readAsDataURL(blob);
                    });
                });
            }
        }
    }

    render() {
        const { url, popupMode, grid, crossword } = this.state;
        return <div className="parser">
            <div className="input">
                <div className="block">
                    <input
                        className="inline url-input"
                        style={{ width: "300px", maxWidth: "100%", boxSizing: "border-box" }}
                        type="text"
                        placeholder="Enter URL of image/PDF/HTML..."
                        value={url}
                        onKeyUp={e => this.setUrl(e.target.value, () => {})}
                        onChange={e => this.setUrl(e.target.value, () => {})}
                    />
                    <span className="inline">or</span>
                    <input
                        className="inline"
                        type="file"
                        onChange={e => this.setFile(e.target.files[0])}
                    />
                </div>
                {this.maybeRenderToolbar()}
                {this.maybeRenderDocument()}
            </div>
            <div className="output">
                {this.maybeRenderParseButtons()}
                <div className="block">
                    <div id="html-grid">
                        <Output grid={grid} />
                    </div>
                </div>
                <CrosswordTextRepresentation crossword={crossword} />
            </div>
            <AdvancedSettingsPopup
                {...this.state}
                isVisible={popupMode === "ADVANCED_SETTINGS"}
                setAdvancedSetting={(key, value) => this.setState({ [key]: value })}
                exit={() => this.setState({ popupMode: undefined })}
            />
        </div>;
    }

    maybeRenderToolbar() {
        const { document, mode, selectedAll, editGridLinesDirection, removeLineMode } = this.state;
        if (document === undefined) {
            return;
        }
        return <div className="block">
            {this.maybeRenderNav()}
            <span className="hidden">.</span>
            <div className="toolbar_options">
                {selectedAll ? <span className="inline">Entire image selected.</span> : undefined}
                <div className="inline">
                    <span
                        className={classNames({ selected: mode === "SELECT_REGION" }, "radio")}
                        onClick={() => this.setState({ mode: this.state.mode === "SELECT_REGION" ? undefined : "SELECT_REGION" })}
                    >
                        {"Select region"}
                    </span>
                    <span
                        className={classNames({ selected: mode === "EDIT_GRID_LINES" }, "radio")}
                        onClick={() => this.setState({ mode: this.state.mode === "EDIT_GRID_LINES" ? undefined : "EDIT_GRID_LINES", removeLineMode: false })}
                    >
                        {"Edit grid"}
                    </span>
                    {mode === "EDIT_GRID_LINES" && <button
                        className="inline button"
                        onClick={() => this.setState({ editGridLinesDirection: editGridLinesDirection === "ROW" ? "COL" : "ROW" })}
                    >
                        {editGridLinesDirection === "ROW" ? "Rows" : "Cols"}
                    </button>}
                    {mode === "EDIT_GRID_LINES" && <button
                        className={classNames("inline button", { "remove-line-active": removeLineMode })}
                        onClick={() => this.setState({ removeLineMode: !removeLineMode })}
                    >
                        {removeLineMode ? "Remove mode ON" : "Remove mode"}
                    </button>}
                </div>
                {mode === "SELECT_REGION" && this.renderSelectionArrows()}
                <button
                    className="inline button"
                    onClick={this.reset}
                >
                    {"Reset"}
                </button>
            </div>
        </div>;
    }

    renderSelectionArrows() {
        const STEP_RATIO = 0.02;
        const { imageDimensions, rectangle } = this.state;
        const stepX = Math.max(1, Math.round(imageDimensions.width * STEP_RATIO));
        const stepY = Math.max(1, Math.round(imageDimensions.height * STEP_RATIO));

        const adjust = (side, delta) => {
            const r = { ...rectangle };
            if (side === "top") {
                const newY = Math.max(0, Math.min(r.y + delta, r.y + r.height - 1));
                r.height -= (newY - r.y);
                r.y = newY;
            } else if (side === "bottom") {
                r.height = Math.max(1, Math.min(r.height + delta, imageDimensions.height - r.y));
            } else if (side === "left") {
                const newX = Math.max(0, Math.min(r.x + delta, r.x + r.width - 1));
                r.width -= (newX - r.x);
                r.x = newX;
            } else if (side === "right") {
                r.width = Math.max(1, Math.min(r.width + delta, imageDimensions.width - r.x));
            }
            this.setRectangleDirectly(r);
        };

        return <div className="selection-arrows">
            <div className="arrow-group">
                <span className="arrow-label">Top</span>
                <button className="arrow-btn button" onClick={() => adjust("top", -stepY)}>&#9650;</button>
                <button className="arrow-btn button" onClick={() => adjust("top", stepY)}>&#9660;</button>
            </div>
            <div className="arrow-group">
                <span className="arrow-label">Bottom</span>
                <button className="arrow-btn button" onClick={() => adjust("bottom", -stepY)}>&#9650;</button>
                <button className="arrow-btn button" onClick={() => adjust("bottom", stepY)}>&#9660;</button>
            </div>
            <div className="arrow-group">
                <span className="arrow-label">Left</span>
                <button className="arrow-btn button" onClick={() => adjust("left", -stepX)}>&#9664;</button>
                <button className="arrow-btn button" onClick={() => adjust("left", stepX)}>&#9654;</button>
            </div>
            <div className="arrow-group">
                <span className="arrow-label">Right</span>
                <button className="arrow-btn button" onClick={() => adjust("right", -stepX)}>&#9664;</button>
                <button className="arrow-btn button" onClick={() => adjust("right", stepX)}>&#9654;</button>
            </div>
        </div>;
    }

    maybeRenderNav() {
        const { document, page } = this.state;
        if(document.pages.length === 1) {
            return;
        }
        return <>
            <button
                className="inline"
                onClick={() => this.setState({ page: page - 1 })}
                disabled={page === 0}
            >
                {"<"}
            </button>
            <span className="inline">Page {page + 1}/{document.pages.length}</span>
            <button
                className="inline"
                onClick={() => this.setState({ page: page + 1 })}
                disabled={page === document.pages.length - 1}
            >
                {">"}
            </button>
        </>;
    }

    maybeRenderDocument() {
        const { loadingDocument, document } = this.state;
        if (loadingDocument) {
            return <span className="loading"></span>;
        }
        if (document === undefined) {
            return <>
                <div className="block">or press Ctrl+V to paste an image from the clipboard.</div>
            </>;
        }
        return <DocumentImage
            {...this.state}
            setImageDimensions={this.setImageDimensions}
            setRectangle={this.setRectangle}
            setGridLines={this.setGridLines}
            setCrossword={this.setCrossword}
        />
    }

    maybeRenderParseButtons() {
        const { document, grid, loadingGrid } = this.state;
        if (loadingGrid) {
            return <span className="loading" />;
        }
        if (grid !== undefined) {
            return <div className="block">
                <button
                    className="button"
                    onClick={() => {
                        this.setGrid(undefined);
                    }}
                >
                    {"Go back"}
                </button>
            </div>;
        }
        if (document === undefined) {
            return null;
        }
        return <div className="block">
            <div
                className="big button"
                onClick={() => {
                    if (!this.state.loadingGrid) {
                        this.setState({ loadingGrid: true });
                        this.findCrossword((_, __) => this.setState({ loadingGrid: false }));
                    }
                }}
            >
                Parse crossword
            </div>
            <button
                className="advanced button"
                onClick={() => this.setState({ popupMode: "ADVANCED_SETTINGS" })}
            >
                {"Advanced options"}
            </button>
        </div>;
    }

    pasteImage = e => {
        const item = (e.clipboardData || e.originalEvent.clipboardData).items[0];
        if (item.kind === 'file') {
            this.setFile(item.getAsFile());
        }
    }

    setUrl = (url, callback) => {
        if (url && url !== this.state.url) {
            this.setState({ url, loadingDocument: true });
            postJson({ path: '/documents/url', body: { url } }, document => {
                this.setDocument(document);
                callback();
            });
        } else {
            callback();
        }
    }

    setFile = file => {
        if (file === undefined) {
            return;
        }
        const formData = new FormData();
        if (file.type === "application/pdf") {
            formData.append('pdf', file);
            this.setState({ url: '', loadingDocument: true });
            post({ path: '/documents/pdf', body: formData }, this.setDocument);
        } else if (file.type.startsWith("image/")) {
            formData.append('image', file);
            this.setState({ url: '', loadingDocument: true });
            post({ path: '/documents/image', body: formData }, this.setDocument);
        }
    }

    setDocument = document => {
        this.setState({ loadingDocument: false, document, page: 0 });
    }

    setImageDimensions = imageDimensions => {
        this.setRectangle({ x: 0, y: 0, width: imageDimensions.width, height: imageDimensions.height });
        this.setState({ imageDimensions, selectedAll: true })
    }

    reset = () => {
        const { imageDimensions } = this.state;
        this.setRectangle({ x: 0, y: 0, width: imageDimensions.width, height: imageDimensions.height });
        this.setState({ mode: undefined, selectedAll: true });
    }

    setRectangle = rectangle => {
        this.setState({ rectangle, selectedAll: false });
        this.setGridLines({
            horizontalLines: [0, rectangle.height],
            verticalLines: [0, rectangle.width],
        });
    }

    setRectangleDirectly = rectangle => {
        this.setState({ rectangle, selectedAll: false });
        this.setGridLines({
            horizontalLines: [0, rectangle.height],
            verticalLines: [0, rectangle.width],
        });
    }

    setGridLines = gridLines => {
        this.setGrid(undefined, undefined);
        this.setState({ gridLines });
    }

    setGrid = (gridPosition, grid) => {
        this.setCrossword(undefined);
        this.setState({ gridPosition, grid });
    }

    setCrossword = crossword => {
        this.setState({ crossword });
    }

    findGridLines = callback => {
        const { document, page, rectangle, gridLines, findGridLinesMode, interpolateSetting } = this.state;
        if (gridLines.horizontalLines.length > 2 || gridLines.verticalLines.length > 2) {
            callback(gridLines);
            return;
        }
        postJson({
            path: `/documents/${document.id}/lines`,
            body: {
                section: { page, rectangle },
                findGridLinesMode,
                interpolate: interpolateSetting,
            }
        }, gridLines => {
            this.setGridLines(gridLines);
            callback(gridLines);
        });
    }

    findGrid = callback => {
        const { document, page, rectangle, gridPosition, grid } = this.state;
        if (grid !== undefined) {
            callback(gridPosition, grid);
            return;
        }
        this.findGridLines(gridLines => {
            postJson({
                path: `/documents/${document.id}/grid`,
                body: {
                    section: { page, rectangle },
                    gridLines,
                }
            }, ({ gridPosition, grid }) => {
                this.setGrid(gridPosition, grid);
                callback(gridPosition, grid);
            });
        });
    }

    findCrossword = callback => {
        const { grid, crossword } = this.state;
        if (crossword !== undefined) {
            callback(grid, crossword);
            return;
        }
        this.findGrid((_, grid) => {
            postJson({
                path: "/words/findCrossword",
                body: { grid },
            }, ({ crossword }) => {
                this.setCrossword(crossword);
                callback(grid, crossword);
            });
        });
    }
}
