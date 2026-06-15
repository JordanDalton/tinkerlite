# TinkerLite

A lightweight PHP scratchpad desktop app for Laravel developers.

## What is this?

TinkerLite is a desktop alternative to `php artisan tinker` with a proper editor interface. It lets you write and run PHP code against your local or remote Laravel projects without leaving your desktop. Built with Tauri v2 and CodeMirror 6, it stays small (~14MB on macOS) while covering the features that matter most in day-to-day tinkering.

## Features

- Connect to local or remote (SSH) Laravel/PHP projects
- Multiple connections per project, multiple tabs per connection
- CodeMirror 6 editor with PHP syntax highlighting and autocomplete (classes and functions scanned from your project)
- Tab key support and rectangular selection (middle-click drag or Alt+drag)
- Output panel with distinct rendering for value blocks, echo output, errors, and stderr
- Snippet library — save, load, rename, and replace code snippets per project
- Per-connection tab state — switching connections preserves each tab's editor content
- PHP syntax pre-check (`php -l`) before eval for accurate error line numbers
- Auto-detect PHP binary (local `which php`, remote SSH `which php` / version scan)
- SSH two-step auth flow: credential test first, then project path and PHP version picker
- Resizable sidebar and output panel
- Themeable via CSS color variables (syntax, interface, tabs, editor)
- Copy buttons on the editor and each output block

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘↵` | Run code |
| `⌘T` | New tab |
| `⌘W` | Close tab |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| `Tab` | Indent |
| `⌘P` | Autocomplete |
| `⌘S` | Save snippet |
| `⌘N` | New project |
| `⌘⇧K` | New connection |
| `Alt` + drag | Rectangular selection |
| Middle-click + drag | Rectangular selection |
| `?` | Show keyboard shortcuts |
| `Esc` | Close modal |

## Requirements

- macOS (primary platform)
- PHP 7.4+ on the target machine
- Laravel is optional — TinkerLite works with plain PHP projects too

## Installation

### Download

Download the latest release: [coming soon](#)

### Build from Source

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/tinkerlite.git
   cd tinkerlite
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the dev server:
   ```bash
   npm run tauri dev
   ```

4. Build for production:
   ```bash
   npm run tauri build
   ```
   The built app lands in `src-tauri/target/release/bundle/macos/`.

## Notes

The app icon and DMG signing are works in progress. If macOS blocks the app on first launch, right-click the app and choose Open.

## License

MIT
