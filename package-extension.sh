#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="stratum-firefox"
ARTIFACT_DIR="artifacts"
DIST_DIR="dist"
ZIP_PATH="${ARTIFACT_DIR}/${PACKAGE_NAME}.zip"

if [ ! -f "package.json" ]; then
  echo "Run this script from the project root."
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "Missing required command: zip"
  exit 1
fi

mkdir -p "${ARTIFACT_DIR}"
rm -f "${ZIP_PATH}"

npm run build

if [ ! -f "${DIST_DIR}/manifest.json" ]; then
  echo "Missing ${DIST_DIR}/manifest.json after build."
  exit 1
fi

(
  cd "${DIST_DIR}"
  zip -r "../${ZIP_PATH}" .
)

echo "Packaged extension: ${ZIP_PATH}"
