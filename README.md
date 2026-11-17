# File StatBar

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/dsyx.file-statbar?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=dsyx.file-statbar)
[![Changelog](https://img.shields.io/badge/Changelog-blue?style=flat-square)](CHANGELOG.md)
[![GitHub Issues](https://img.shields.io/github/issues/dsyx/vscode-file-statbar?style=flat-square)](https://github.com/dsyx/vscode-file-statbar/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

A lightweight VS Code extension: File stats at a glance in your status bar.

<!-- ![File StatBar Preview](images/preview.png) -->

## Features

- **Status Bar Display**: Real-time display of active file mode, size, and modification time (e.g. `[ -rw-r--r-- | 1.15 KiB | 2026-10-29 13:59:26 (M) ]`).
- **Universal Support**: Works across text files, images, binary files, and custom editor tabs.
- **Symbolic Links**: Shows the link itself (e.g. mode `lrwxrwxrwx`), not its target.

## Settings

| Setting                 | Type               | Default                                     | Description                                                      |
| :---------------------- | :----------------- | :------------------------------------------ | :--------------------------------------------------------------- |
| `file-statbar.template` | `string`           | `"[ {mode} \| {size:iec} \| {mtime} (M) ]"` | Status bar display template.                                     |
| `file-statbar.position` | `"left"`/`"right"` | `"right"`                                   | Position on the status bar.                                      |
| `file-statbar.priority` | `number`           | `1024`                                      | Status bar priority (higher values place item closer to center). |

### Template Placeholders & Modifiers

Placeholders use `{<field>}` or `{<field>:<modifier>}` to display file attributes and select an optional output modifier.

#### File Mode

Displays POSIX file mode bits. On virtual filesystems or platforms without native POSIX permissions, mode bits are synthesized from file type and read-only status.

| Placeholder             | Description                      | Example            |
| :---------------------- | :------------------------------- | :----------------- |
| `{mode}` / `{mode:s}`   | POSIX symbolic mode              | `-rw-r--r--`       |
| `{mode:b}`              | 16-bit binary mode bitmask       | `1000000110100100` |
| `{mode:o}`              | 6-digit octal mode bitmask       | `100644`           |
| `{mode:d}`              | Raw decimal mode integer         | `33188`            |
| `{mode:x}` / `{mode:X}` | 4-digit hex mode (lower / upper) | `81a4` / `81A4`    |

#### File Size

| Placeholder               | Description                                                                              | Example    |
| :------------------------ | :--------------------------------------------------------------------------------------- | :--------- |
| `{size}` / `{size:bytes}` | Raw byte count                                                                           | `1178 B`   |
| `{size:si}`               | SI (International System of Units) metric units (1000-based: kB, MB, GB)                 | `1.18 kB`  |
| `{size:iec}`              | IEC (International Electrotechnical Commission) binary units (1024-based: KiB, MiB, GiB) | `1.15 KiB` |

#### Timestamps

| Placeholder | Description                    | Default Modifier |
| :---------- | :----------------------------- | :--------------- |
| `{atime}`   | Time of last access            | `iso-datetime`   |
| `{mtime}`   | Time of last data modification | `iso-datetime`   |
| `{ctime}`   | Time of last status change     | `iso-datetime`   |
| `{btime}`   | Time of file birth (creation)  | `iso-datetime`   |

All timestamp placeholders default to `iso-datetime` and support the following modifiers via `:<modifier>` (e.g. `{mtime:iso-8601}`, `{mtime:iso-date}`):

| Modifier       | Description                                         | Example                     |
| :------------- | :-------------------------------------------------- | :-------------------------- |
| `iso-8601`     | Full ISO 8601 extended local time (`±HH:MM` offset) | `2026-11-05T14:30:45+08:00` |
| `iso-utc`      | Full ISO 8601 extended UTC time (`Z` suffix)        | `2026-11-05T06:30:45Z`      |
| `iso-datetime` | Local date and time (`YYYY-MM-DD HH:MM:SS`)         | `2026-11-05 14:30:45`       |
| `iso-date`     | Local calendar date (`YYYY-MM-DD`)                  | `2026-11-05`                |
| `iso-time`     | Local wall-clock time (`HH:MM:SS`)                  | `14:30:45`                  |

Unavailable file metadata attributes (such as birth time on unsupported filesystems) fallback gracefully to `-`. Unsupported placeholders (such as `{unknown}`, `{mode:invalid}`, or `{mtime:invalid}`) also render as `-`.

## Commands

All commands can be executed via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `File StatBar: Refresh` (`file-statbar.refresh`): Manually refresh file statistics for the active editor.
