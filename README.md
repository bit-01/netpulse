# NetPulse

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

NetPulse is a lightweight browser-based network diagnostics and speed-testing UI built with Vue 3 and Vite. It runs client-side measurements (latency, download, upload) and stores recent results locally. The app includes charts and a simple history viewer with export/filters.

Try it at: [netpulse.basselaflak.me](https://netpulse.basselaflak.me)

## Features

- Measure latency, download and upload speeds from the browser (adaptable to use public test files).
- Adaptive candidate probing to pick the best test server.
- Real-time progress bar and time-left estimation.
- History table with sorting, pagination and selection.
- Trend and comparison charts with responsive, interactive SVG visuals.
- Export history to CSV and basic AI-generated insights (optional service integration).

## Quick start

Requirements

- Node.js (recommended 20.x or later)

Install and run locally:

```bash
npm install
npm run dev
```

Open the dev server URL printed by Vite (usually http://localhost:5173).

## Build

```bash
npm run build
```

## Run type-check and lint

```bash
npm run type-check
npm run lint
```

## Notes and caveats

- Browser-based measurement depends on server support (CORS, Range requests) and the browser's streaming capabilities. Upload tests require a CORS-enabled upload endpoint to measure real upload throughput.
- The app stores history in localStorage under the key `netpulse_results_vue`.
- The default download candidates are configured in `src/constants.ts`. You can replace or add endpoints that support CORS and Range requests for better accuracy.

## Contributing

Contributions are welcome. Please open issues or pull requests. Keep changes small and well-documented.

## License

This project is open source and released under the MIT License — see the `LICENSE` file.
