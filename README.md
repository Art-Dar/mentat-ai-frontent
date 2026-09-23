# Mentat — Browser Extension

Browser extension frontend for Mentat — a shared "second brain" knowledge base. Captures links, notes, and receipts from the browser and lets you ask questions against your saved content.

This repository contains only the **browser extension (frontend)**.

## Tech Stack

- Vite + `@crxjs/vite-plugin`
- TypeScript
- Manifest V3

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is generated in `dist/`.

## Load in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `dist/` folder