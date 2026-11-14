# APK Decompiler Studio

A local-first Electron desktop app for running JADX and APKTool against Android APK files. APK contents are processed on your computer; the app does not upload files.

## What it does

- Select an APK and an output folder using native file dialogs.
- Run JADX to decompile bytecode into Java-like source (`jadx/`).
- Run APKTool to decode the manifest, resources, and package structure (`apktool/`).
- Stream tool output into the app's activity log.

Decompilation cannot always recover the original project. Obfuscation, missing debug information, Kotlin/compiler transformations, and native libraries can limit the results.

## Requirements

- Node.js 18 or newer and npm
- Java runtime/JDK compatible with the installed tool versions
- JADX and/or APKTool installed and available in your `PATH`

Install tools from their official projects:
- JADX: https://github.com/skylot/jadx
- APKTool: https://ibotpeaches.github.io/Apktool/

The app checks for `java`, `jadx`, and `apktool` on PATH when it starts. Restart the app after changing PATH. At least one of JADX or APKTool is needed.

## Run from source

```bash
npm install
npm start
```

## Build an installer/package

```bash
npm run dist        # package for the current platform
npm run dist:win    # Windows NSIS installer
npm run dist:mac    # macOS DMG
npm run dist:linux  # Linux AppImage
```

Build output is written to `release/`. Build each target on its supported host for the most reliable result.

## Security and legal use

The renderer runs with context isolation, sandboxing, and Node integration disabled. APKs are selected through native dialogs and processed by local command-line tools. Use this application only with APKs you are authorized to inspect.
