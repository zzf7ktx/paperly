# Paperly PDF editor

Paperly shares one browser editor between its web, portable, and Electron builds. PDF processing, OCR, and export run on the device.

## Structure

```text
app/
  layout.tsx                 Web metadata, fonts, and global styles
  page.tsx                   Server route: renders the shared client editor
features/pdf-editor/
  pdf-editor.tsx             Client entry and editor shell
  components/               Toolbar, canvas, page rail, and property editors
  hooks/
    use-pdf-editor.ts        Composes the editor's state and feature hooks
    use-editor-state.ts      Document state and stable browser/worker refs
    use-document-sessions.ts Opening, switching, and closing documents
    use-editor-history.ts    Undo/redo snapshots
    use-pdf-rendering.ts     PDF canvas rendering and fitting
    use-xfa-rendering.ts     Native XFA rendering and live scripts
    use-text-editing.ts      Text changes, fonts, and formatting
    use-form-editing.ts      Form fields and group movement
    use-element-drag.ts      Text and XFA movement/resizing
    use-image-editing.ts     Images and selection deletion
    use-batch-editing.ts     Cloning, repeated data, and batch formatting
    use-canvas-interaction.ts Drawing, marquee selection, pan, and zoom
    use-editor-selection.ts Derived selection data
    use-editor-preferences.ts Preferences and selection synchronization
  services/                 PDF export and local OCR
  lib/                      Fonts, text, appearance, geometry, and XFA DOM helpers
  types.ts                  Shared editor models
  constants.ts              Font and field options
lib/                        XFA template parsing and script runtime
portable/                   Standalone React entry and local launcher/server
electron/                   Electron main process
tests/                      Browser regression tests
```

The web route is a Server Component; the interactive editor defines the client boundary. Portable imports the editor directly rather than importing a Next.js route. Keep browser APIs in the client feature, effects, and event handlers. Services receive explicit typed dependencies; hooks share a single state owner so document switching and history remain coordinated.

This follows Next.js's [project organization](https://nextjs.org/docs/app/getting-started/project-structure) and [Server/Client Component boundaries](https://nextjs.org/docs/app/getting-started/server-and-client-components). The existing web toolchain is **Vinext on Vite**, with Next.js App Router conventions; it has not been migrated to `next build`. The PDF worker's `?url` import is a Vite asset import shared by all current builds.

## Develop and build

Use Node.js 22.13 or later. The checked-in lockfile pins dependency versions.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

The web build works without `.openai/hosting.json`. When that deployment file is present, the Sites plugin and its configured Cloudflare bindings are used.

```sh
npm run build:portable
npm run electron
npm run build:electron:dir
npm run build:electron
```

- Portable output: `portable-build/`. On Windows it contains the browser app, launcher, server, and the current Node executable. Distribute the entire folder; double-click `Start Paperly.cmd`.
- Electron directory output: `electron-dist/win-unpacked/` on Windows.
- Windows installer: `electron-dist/Paperly-Setup-0.1.0.exe`.
- Electron packaging commands generate the icons through PowerShell and should be run on Windows. The first build needs internet access to download Electron/packaging tools.
- OCR assets are copied automatically before development and builds.

## Verification

```sh
npx playwright install chromium
npm run build:portable
npm run test:e2e
```

Tests run against the production portable renderer and cover the demo, theme persistence, panels, opening a two-page PDF, text edits, undo/redo, AcroForm values, switching documents, and reopening an exported PDF. To exercise the same tests against a running web build, set `PAPERLY_TEST_URL` to its local URL.

`npm run format` formats application source. Lint excludes generated bundles and vendored OCR assets. Existing untyped PDF.js internals remain lint warnings, as do existing hook dependency warnings; type checking remains strict. The browser suite does not exhaustively cover every XFA script, OCR layout, or PDF font variant.
