# Contributing to TinkerLite

Thanks for your interest. This doc covers how to get set up locally and how things fit together under the hood.

## Prerequisites

- Rust (stable toolchain via [rustup](https://rustup.rs/))
- Node.js 18+
- npm
- Xcode Command Line Tools (macOS) — run `xcode-select --install` if you haven't already

## Dev Setup

```bash
git clone https://github.com/your-username/tinkerlite.git
cd tinkerlite
npm install
npm run tauri dev
```

That's it. Tauri will compile the Rust backend and open the app window. Changes to `src/` hot-reload via Vite. Changes to `src-tauri/` require a full Rust recompile (Tauri triggers this automatically when you save).

## Project Structure

### Frontend (`src/`)

| File | What it does |
|------|--------------|
| `main.js` | App entry point, wires everything together |
| `editor.js` | CodeMirror 6 setup — keybindings, extensions, PHP language support |
| `tabs.js` | Tab creation, switching, and per-connection tab state |
| `sidebar.js` | Connection list, snippet library, add/edit connection flows |
| `output.js` | Renders output blocks — values, echo, errors, stderr |
| `theme.js` | Applies CSS color variable themes |
| `settings.js` | Reads and writes user settings |
| `path-autocomplete.js` | Autocomplete for PHP classes and functions scanned from the project |

### Backend (`src-tauri/`)

| File | What it does |
|------|--------------|
| `src/lib.rs` | Tauri commands — connection management, running code, SSH auth |
| `src/runner.rs` | Spawns PHP locally or over SSH, streams output back |
| `assets/tinker-runner.php` | The PHP evaluation harness baked into the binary |

### Other

- `index.html` — Single-page app shell; all UI is rendered into this
- `src-tauri/tauri.conf.json` — Tauri app config (window size, permissions, bundle settings)
- `src-tauri/Cargo.toml` — Rust dependencies

## How the Runner Works

When you hit `⌘↵`, the frontend sends the current editor content to Rust via a Tauri command. The Rust side:

1. Writes the code to a temp file
2. Runs `php -l` on it first (syntax check) — this gives accurate error line numbers before anything executes
3. If the syntax check passes, spawns `php tinker-runner.php` either locally or via SSH
4. Streams stdout and stderr back to the frontend as they arrive
5. The frontend parses the output and renders each block with appropriate styling

The PHP runner (`tinker-runner.php`) handles the actual eval and formats its output as structured JSON blocks so the frontend can distinguish between dumped values, echo output, and errors.

### A note on `tinker-runner.php`

This file lives at `src-tauri/assets/tinker-runner.php` but it's embedded into the Rust binary at compile time using `include_str!`. If you edit it, Rust won't know to recompile `runner.rs` automatically. Force a recompile by touching the file:

```bash
touch src-tauri/src/runner.rs
```

Then run `npm run tauri dev` again.

## Pull Requests

Keep PRs focused on one thing. A PR that fixes a bug and adds an unrelated feature is harder to review and harder to revert if something goes wrong.

If your change touches anything in the connection flow (adding connections, switching connections, SSH auth), please test both local and SSH connections before opening the PR. Local is easy to test; for SSH you can point it at `localhost` with your own machine if you don't have a remote handy.

No formal issue template — just open an issue and describe what you found or what you want to build.
