# Stratum Dashboard

A customizable Firefox new-tab dashboard built with React, TypeScript, and Vite.

Stratum replaces Firefox's new tab page with a fast, local-first dashboard for links, search, and lightweight organization. 
It is available on Firefox Add-ons: [Stratum](https://addons.mozilla.org/en-US/firefox/addon/stratum/).

## Features

- Configurable rows, columns, sections, and links.
- Search provider presets, with support for custom search URLs.
- Copy/paste config export and import using YAML; JSON is accepted as valid YAML input.
- Local browser storage with no remote account or hosted backend.
- Icon support for Dashboard Icons slugs, `dashboard:` aliases, direct `https://` image URLs, `url:` image references, `data:image/` values, `emoji:` values, and `initials:` text icons.
- Built-in customization tools for editing titles, URLs, layout, visibility, and icon values from the new tab page.

<img width="1190" height="954" alt="image" src="https://github.com/user-attachments/assets/6fbf1858-6457-4e04-872b-e98ef0938955" />


# Building the project

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
