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
            editGridLinesInteractionMode: "DESKTOP",
            editGridLinesSubMode: "ADD",
            nudgeStep: 1,
            pendingLine: undefined,
            selectedLineForRemoval: undefined,

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
        const { document, mode, selectedAll, editGridLinesDirection } = this.state;
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
                        onClick={() => this.setState({ mode: this.state.mode === "EDIT_GRID_LINES" ? undefined : "EDIT_GRID_LINES" })}
                    >
                        {"Edit grid"}
                    </span>
                    {mode === "EDIT_GRID_LINES" && <>
                        <button
                            className="inline button"
                            onClick={() => this.setState({ editGridLinesDirection: editGridLinesDirection === "ROW" ? "COL" : "ROW", selectedLineForRemoval: undefined })}
                        >
                            {editGridLinesDirection === "ROW" ? "Rows" : "Cols"}
                        </button>
                        <button
                            className="inline button"
                            onClick={() => this.setState({
                                editGridLinesInteractionMode: this.state.editGridLinesInteractionMode === "DESKTOP" ? "MOBILE" : "DESKTOP",
                                pendingLine: undefined,
                                selectedLineForRemoval: undefined,
                            })}
                        >
                            {this.state.editGridLinesInteractionMode === "DESKTOP" ? "Desktop" : "Mobile"}
                        </button>
                    </>}
                </div>
                <button
                    className="inline button"
                    onClick={this.reset}
                >
                    {"Reset"}
                </button>
            </div>
            {mode === "EDIT_GRID_LINES" && this.state.editGridLinesInteractionMode === "MOBILE" && this.renderEditGridLinesControls()}
        </div>;
    }

    startNudgeInterval = (direction) => {
        const step = direction * this.state.nudgeStep;
        this.nudgePendingLine(step);
        this.nudgeTimeout = setTimeout(() => {
            this.nudgeInterval = setInterval(() => this.nudgePendingLine(step), 50);
        }, 300);
    }

    stopNudgeInterval = () => {
        clearTimeout(this.nudgeTimeout);
        clearInterval(this.nudgeInterval);
    }

    renderEditGridLinesControls() {
        const { editGridLinesSubMode, editGridLinesDirection, nudgeStep, pendingLine, selectedLineForRemoval, rectangle } = this.state;
        const isRow = editGridLinesDirection === "ROW";

        return <div className="edit-grid-controls">
            <div className="inline">
                <span
                    className={classNames({ selected: editGridLinesSubMode === "ADD" }, "radio")}
                    onClick={() => this.setState({ editGridLinesSubMode: "ADD", selectedLineForRemoval: undefined })}
                >
                    {"Add"}
                </span>
                <span
                    className={classNames({ selected: editGridLinesSubMode === "REMOVE" }, "radio")}
                    onClick={() => this.setState({ editGridLinesSubMode: "REMOVE", pendingLine: undefined })}
                >
                    {"Remove"}
                </span>
            </div>

            {editGridLinesSubMode === "ADD" && <>
                <button
                    className="button"
                    disabled={!!pendingLine}
                    onClick={() => {
                        if (!rectangle) return;
                        const type = isRow ? "ROW" : "COL";
                        const value = isRow ? rectangle.height / 2 : rectangle.width / 2;
                        this.setPendingLine({ type, value });
                    }}
                >
                    {"+ New line"}
                </button>
                {pendingLine && <>
                    <div className="inline step-toggle">
                        <span
                            className={classNames({ selected: nudgeStep === 1 }, "radio")}
                            onClick={() => this.setState({ nudgeStep: 1 })}
                        >
                            {"1px"}
                        </span>
                        <span
                            className={classNames({ selected: nudgeStep === 5 }, "radio")}
                            onClick={() => this.setState({ nudgeStep: 5 })}
                        >
                            {"5px"}
                        </span>
                        <span
                            className={classNames({ selected: nudgeStep === 20 }, "radio")}
                            onClick={() => this.setState({ nudgeStep: 20 })}
                        >
                            {"20px"}
                        </span>
                    </div>
                    <button
                        className="button arrow-button"
                        onMouseDown={() => this.startNudgeInterval(-1)}
                        onMouseUp={this.stopNudgeInterval}
                        onMouseLeave={this.stopNudgeInterval}
                        onTouchStart={(e) => { e.preventDefault(); this.startNudgeInterval(-1); }}
                        onTouchEnd={this.stopNudgeInterval}
                    >
                        {isRow ? "\u25B2" : "\u25C4"}
                    </button>
                    <button
                        className="button arrow-button"
                        onMouseDown={() => this.startNudgeInterval(1)}
                        onMouseUp={this.stopNudgeInterval}
                        onMouseLeave={this.stopNudgeInterval}
                        onTouchStart={(e) => { e.preventDefault(); this.startNudgeInterval(1); }}
                        onTouchEnd={this.stopNudgeInterval}
                    >
                        {isRow ? "\u25BC" : "\u25BA"}
                    </button>
                    <button className="button confirm-button" onClick={this.confirmPendingLine}>
                        {"Confirm"}
                    </button>
                    <button className="button cancel-button" onClick={this.cancelPendingLine}>
                        {"Cancel"}
                    </button>
                </>}
            </>}

            {editGridLinesSubMode === "REMOVE" && <>
                <button
                    className="button arrow-button"
                    onClick={() => this.selectNextLineForRemoval(-1)}
                >
                    {"\u25C4 Prev"}
                </button>
                <button
                    className="button arrow-button"
                    onClick={() => this.selectNextLineForRemoval(1)}
                >
                    {"Next \u25BA"}
                </button>
                {selectedLineForRemoval && <>
                    <button className="button cancel-button" onClick={this.confirmRemoveLine}>
                        {"Remove"}
                    </button>
                    <button className="button" onClick={this.cancelRemoveLine}>
                        {"Cancel"}
                    </button>
                </>}
            </>}
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
            setPendingLine={this.setPendingLine}
            selectLineForRemoval={this.selectLineForRemoval}
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

    setPendingLine = pendingLine => {
        this.setState({ pendingLine });
    }

    cancelPendingLine = () => {
        this.setState({ pendingLine: undefined });
    }

    confirmPendingLine = () => {
        const { pendingLine, gridLines } = this.state;
        if (!pendingLine) return;
        const copiedGridLines = {
            horizontalLines: [...gridLines.horizontalLines],
            verticalLines: [...gridLines.verticalLines],
        };
        if (pendingLine.type === "ROW") {
            copiedGridLines.horizontalLines.push(pendingLine.value);
            copiedGridLines.horizontalLines.sort((a, b) => a - b);
        } else {
            copiedGridLines.verticalLines.push(pendingLine.value);
            copiedGridLines.verticalLines.sort((a, b) => a - b);
        }
        this.setGridLines(copiedGridLines);
        this.setState({ pendingLine: undefined });
    }

    nudgePendingLine = delta => {
        const { pendingLine, rectangle } = this.state;
        if (!pendingLine) return;
        const max = pendingLine.type === "ROW" ? rectangle.height : rectangle.width;
        const newValue = Math.max(0, Math.min(max, pendingLine.value + delta));
        this.setState({ pendingLine: { ...pendingLine, value: newValue } });
    }

    selectLineForRemoval = line => {
        this.setState({ selectedLineForRemoval: line });
    }

    cancelRemoveLine = () => {
        this.setState({ selectedLineForRemoval: undefined });
    }

    confirmRemoveLine = () => {
        const { selectedLineForRemoval, gridLines } = this.state;
        if (!selectedLineForRemoval) return;
        const copiedGridLines = {
            horizontalLines: [...gridLines.horizontalLines],
            verticalLines: [...gridLines.verticalLines],
        };
        const { type, value } = selectedLineForRemoval;
        const ref = type === "ROW" ? copiedGridLines.horizontalLines : copiedGridLines.verticalLines;
        const idx = ref.indexOf(value);
        if (idx !== -1) {
            ref.splice(idx, 1);
        }
        this.setGridLines(copiedGridLines);
        this.setState({ selectedLineForRemoval: undefined });
    }

    selectNextLineForRemoval = direction => {
        const { editGridLinesDirection, gridLines, selectedLineForRemoval } = this.state;
        const lines = editGridLinesDirection === "ROW"
            ? [...gridLines.horizontalLines].sort((a, b) => a - b)
            : [...gridLines.verticalLines].sort((a, b) => a - b);
        if (lines.length === 0) return;
        const type = editGridLinesDirection;
        if (!selectedLineForRemoval) {
            this.setState({ selectedLineForRemoval: { type, value: lines[0] } });
            return;
        }
        const currentIdx = lines.indexOf(selectedLineForRemoval.value);
        let nextIdx;
        if (currentIdx === -1) {
            nextIdx = 0;
        } else {
            nextIdx = (currentIdx + direction + lines.length) % lines.length;
        }
        this.setState({ selectedLineForRemoval: { type, value: lines[nextIdx] } });
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
