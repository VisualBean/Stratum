# Stratum Dashboard

A customizable Firefox new-tab dashboard built with React, TypeScript, and Vite.

## Requirements

- Node.js and npm
- `zip`, required by `package-extension.sh`

## Install Dependencies

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

This starts the Vite dev server at `127.0.0.1`.

## Build The Extension

```bash
npm run build
```

The production extension files are generated in `dist/`.

## Package For Firefox

```bash
./package-extension.sh
```

The script runs a production build, verifies `dist/manifest.json`, and creates:

```text
artifacts/stratum-firefox.zip
```

Upload that zip file to AMO or load it for testing.

## Build Tools

This extension is generated from source using Vite and TypeScript. The production build transforms React/TypeScript, bundles files, processes CSS, and minifies assets into `dist/`. No remotely hosted code is used.

## Firefox Notes

- The add-on ID is defined in `public/manifest.json` under `browser_specific_settings.gecko.id`.
- Firefox requires `browser_specific_settings.gecko.data_collection_permissions`; this project declares `required: ["none"]`.
- Firefox for Android does not support `chrome_url_overrides.newtab`, so this extension is intended for desktop Firefox.
