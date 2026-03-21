Crossword Grid Editor
=====================

A browser-based tool for manually drawing crossword grid structures and generating a textual representation of the crossword layout. No backend required -- everything runs client-side.

Features
--------

- **Interactive 13x13 grid** -- click borders to toggle them between thin (no word boundary) and thick (word boundary)
- **Live clue numbering** -- numbered squares update in real time as you edit borders
- **Crossword interpretation** -- generates a full textual description including grid dimensions, numbered squares, across/down entries with letter counts, and intersection details
- **Copy to clipboard** -- one-click copy of the generated text

Usage
-----

Visit the deployed version, or run locally:

```
cd frontend
python3 -m http.server 8000
```

Then open http://localhost:8000.

### How it works

1. Click inner borders on the grid to mark word boundaries (thick lines)
2. Clue numbers appear automatically based on the standard crossword numbering rules
3. Click **Interpret as Crossword** to generate the full text representation
4. Click **Copy to clipboard** to copy the output

### Numbering rules

A cell gets a number if it starts an **Across** entry (left border thick, right border thin) or a **Down** entry (top border thick, bottom border thin). Words must be at least 2 cells long.

Deployment
----------

The app is deployed via [Coolify](https://coolify.io) using Docker Compose. The setup is minimal: nginx serving static files.

```
docker compose up --build
```

Project Structure
-----------------

```
frontend/
  index.html          -- main page
  grid-editor.js      -- grid state, rendering, crossword interpretation
  grid-editor.css     -- grid and UI styles
Dockerfile            -- nginx:alpine serving frontend/
docker-compose.yaml   -- Coolify-compatible deployment config
docs/                 -- legacy screenshots (from previous image-parsing version)
```
