# Changelog

## 0.1.0 — Initial Release

- Connect to local or remote (SSH) Laravel/PHP projects
- Multiple connections per project, multiple tabs per connection
- CodeMirror 6 editor with PHP syntax highlighting and autocomplete (classes and functions scanned from the project)
- Tab key support and rectangular selection via middle-click drag or Alt+drag
- Output panel with distinct rendering for value blocks, echo output, errors, and stderr
- Snippet library — save, load, rename, and replace code snippets per project
- Per-connection tab state — switching connections restores each tab's editor content
- PHP syntax pre-check (`php -l`) before eval for accurate error line numbers
- Auto-detect PHP binary (local `which php`, remote SSH `which php` / version scan)
- SSH two-step auth flow: credential test first, then project path and PHP version picker
- Resizable sidebar and output panel
- Themeable via CSS color variables covering syntax, interface, tabs, and editor
- Copy buttons on the editor and each individual output block
- `⌘↵` to run, `⌘T` for new tab
- Built app size ~14MB on macOS
