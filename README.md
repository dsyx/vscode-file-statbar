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

## Settings

| Setting                 | Type                | Default                                     | Description                                                      |
| :---------------------- | :------------------ | :------------------------------------------ | :--------------------------------------------------------------- |
| `file-statbar.template` | `string`            | `"[ {mode} \| {size:iec} \| {mtime} (M) ]"` | Status bar display template.                                     |
| `file-statbar.position` | `"right" \| "left"` | `"right"`                                   | Position on the status bar.                                      |
| `file-statbar.priority` | `number`            | `1024`                                      | Status bar priority (higher values place item closer to center). |

### Template Placeholders & Modifiers

#### File Mode

| Placeholder             | Description                      | Example            |
| :---------------------- | :------------------------------- | :----------------- |
| `{mode}`                | POSIX symbolic mode              | `-rw-r--r--`       |
| `{mode:b}`              | 16-bit binary mode bitmask       | `1000000110100100` |
| `{mode:o}`              | 4-digit octal permission         | `0644`             |
| `{mode:d}`              | Raw decimal mode integer         | `33188`            |
| `{mode:x}` / `{mode:X}` | 4-digit hex mode (lower / upper) | `81a4` / `81A4`    |

#### File Size

| Placeholder                  | Description                                                                              | Example    |
| :--------------------------- | :--------------------------------------------------------------------------------------- | :--------- |
| `{size}` / `{size:bytes}`    | Raw byte count                                                                           | `1178 B`   |
| `{size:1000}` / `{size:si}`  | SI (International System of Units) metric units (1000-based: kB, MB, GB)                 | `1.18 kB`  |
| `{size:1024}` / `{size:iec}` | IEC (International Electrotechnical Commission) binary units (1024-based: KiB, MiB, GiB) | `1.15 KiB` |

#### Timestamps

| Placeholder | Description                    | Default Format      |
| :---------- | :----------------------------- | :------------------ |
| `{atime}`   | Time of last access            | `%Y-%m-%d %H:%M:%S` |
| `{mtime}`   | Time of last data modification | `%Y-%m-%d %H:%M:%S` |
| `{ctime}`   | Time of last status change     | `%Y-%m-%d %H:%M:%S` |
| `{btime}`   | Time of file birth (creation)  | `%Y-%m-%d %H:%M:%S` |

Unavailable file metadata attributes (such as birth time on unsupported filesystems) fallback gracefully to `-`.

All timestamp placeholders support ISO 8601-compatible `strftime` numeric format specifiers via `:<pattern>` (e.g. `{mtime:%F %T}`, `{mtime:%Y/%m/%d}`, `{mtime:%R}`, `{mtime:%s}`):

| Specifier        | Description                                            | Example                           |
| :--------------- | :----------------------------------------------------- | :-------------------------------- |
| `%Y`, `%y`       | 4-digit year, 2-digit year                             | `2026`, `26`                      |
| `%C`             | 2-digit century number (year / 100)                    | `20`                              |
| `%m`             | Month number zero-padded (01-12)                       | `11`                              |
| `%d`, `%e`       | Day of month zero-padded (01-31), space-padded ( 1-31) | `05`, ` 5`                        |
| `%j`             | Day of year zero-padded (001-366)                      | `309`                             |
| `%H`, `%I`       | Hour 24-hour clock (00-23), 12-hour clock (01-12)      | `14`, `02`                        |
| `%M`             | Minute zero-padded (00-59)                             | `30`                              |
| `%S`             | Second zero-padded (00-59)                             | `45`                              |
| `%s`             | Seconds since Unix epoch                               | `1793949127`                      |
| `%u`, `%w`       | Weekday number (1-7, Mon=1), (0-6, Sun=0)              | `4`, `4`                          |
| `%V`             | ISO 8601 week number (01-53)                           | `45`                              |
| `%G`, `%g`       | ISO 8601 4-digit year, 2-digit year for week number    | `2026`, `26`                      |
| `%U`, `%W`       | Week number starting Sunday (00-53), Monday (00-53)    | `44`, `44`                        |
| `%z`             | Timezone offset (+HHMM or -HHMM)                       | `+0800`                           |
| `%F`, `%T`, `%R` | Shortcuts for `%Y-%m-%d`, `%H:%M:%S`, `%H:%M`          | `2026-11-05`, `14:30:45`, `14:30` |

Literal characters inside the modifier pattern (such as spaces, dashes, or custom tags) are preserved as-is (use `%%` to escape a literal `%`).

## Commands

All commands can be executed via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `File StatBar: Refresh` (`file-statbar.refresh`): Manually refresh file statistics for the active editor.
