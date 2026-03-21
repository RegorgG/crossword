# Crossword Grid Editor

## What this project is

A pure client-side crossword grid editor. Users draw word boundaries on a 13x13 grid by clicking borders, and the tool generates a textual crossword representation (numbered squares, across/down entries with intersections).

There is no backend. The frontend is plain HTML/CSS/JS (no framework, no build step).

## Architecture

- `frontend/` contains all application code: `index.html`, `grid-editor.js`, `grid-editor.css`
- The grid is rendered as a 27x27 CSS grid (13 cells + 14 border strips per axis)
- Border state is stored in two 2D arrays: `horizBorders[r][c]` (border above cell) and `vertBorders[r][c]` (border left of cell)
- Outer-edge borders are always thick and non-interactive
- Clue numbers update live on every border toggle
- "Interpret as Crossword" generates the full text output including intersections

## Deployment

- Deployed to a Hetzner VPS via Coolify (docker-compose based)
- `Dockerfile`: `nginx:alpine` serving `frontend/` on port 80
- `docker-compose.yaml`: single `app` service with `SERVICE_FQDN_APP_80`
- No build step needed -- just static file serving

## Text output format

The generated text matches the format from the original snap-app's `crosswordTextRepresentation.js`:

```
Grid: 13 rows x 13 cols

NUMBERED SQUARES:
(row 0, col 0): 1
...

ACROSS:
1-Across: 5 letters
  - Letter 2 intersects 3-Down letter 1

DOWN:
3-Down: 7 letters
  - Letter 1 intersects 1-Across letter 2
```

## Development

Serve locally with any static file server:

```
cd frontend && python3 -m http.server 8000
```

No dependencies to install.
