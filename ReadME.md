# MonaLuau

Working on MonaLuau.
This is a work in progress project for adding Luau support for Monaco, specifically for Roblox exploits.
Check [Progress](#progress) for support info.
This project is licensed under AGPL, see [LICENSE.md](LICENSE.md)
for details.
This project supersedes Custom Krnl Monaco,
which was written in pure JS & HTML
and based off of Krnl's Monaco editor.

## Why?

Because Custom Krnl Monaco hardcoded some autocompletion entries,
this would mean that you wouldn't see new functions in autocomplete
if they were not added to the file.
Custom Krnl Monaco was pretty much a private project,
it was last updated on July 28, 2024, at 10∶32 PM (based on file modified dates).

It is and was better than other garbage Monaco editors like "Rosploco",
as it doesn't make everything a "snippet"
(e.g. you could just trigger autocomplete, and it would show ":GetService").
ScriptWare V2 had a great Monaco editor,
but it was based off of the memory-hungry and slow Roblox LSP,
and Roblox LSP is written in Lua,
which isn't as optimized as something like Rust or Luau.
We aim to have great performance & efficiency,
so we can't use Roblox LSP.

## Progress

- [x] Basic functions (Custom Krnl Monaco has it all)
  - [x] Syntax Highlighting (everything has this)
  - [x] Auto-indent (Krnl's Monaco does have this, but it's broken, I think)
  - [x] Other language features added via the new Luau language.
- [x] Krnl Dark Theme
- [ ] Auto-Complete
  - [ ] Basic Auto-Complete via dumps.
  - [ ] Method to modify the auto-complete for adding exploit-specific functions.
  - [ ] Auto-Complete based on current code and context (e.g. local variables).
  - [ ] Some way later to get auto-complete for game instances.
- [ ] Other nice things
  - [ ] StyLua integration for formatting
  - [ ] full-moon integration for syntax highlighting and extended Auto-Complete functionality.
