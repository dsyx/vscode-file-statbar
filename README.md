# File StatBar

A simple, lightweight, and practical VS Code extension that displays file metadata in the status bar, inspired by the Linux `stat` and `ls -l` commands.

## Features

- **Status Bar Display**: Real-time display of active file mode, size, and modification time (e.g. `[ -rw-r--r-- | 1.15 KiB | 2026-10-29 13:59:26 (M) ]`).
- **GNU `stat` Hover Card**: Hovering over the status bar item reveals an authentically aligned, monospace GNU `stat` output table detailing permissions, size, blocks, inode, links, device, ownership, and timestamps.
- **Broad File Support**: Supports text files, images, binary files, and custom editor tabs.
- **Fast & Responsive**: Refreshes stats seamlessly when switching tabs, saving documents, or refocusing VS Code.
- **Symlink Resolution**: Shows symbolic link targets directly in the hover card (`File: link -> target`).
- **Zero Runtime Dependencies**: Ultra-lightweight and blazingly fast.

## Configuration

| Setting                 | Type                | Default                                     | Description                                                     |
| :---------------------- | :------------------ | :------------------------------------------ | :-------------------------------------------------------------- |
| `file-statbar.template` | `string`            | `"[ {mode} \| {size:iec} \| {mtime} (M) ]"` | Status bar display template.                                    |
| `file-statbar.position` | `"right" \| "left"` | `"right"`                                   | Position on the status bar.                                     |
| `file-statbar.priority` | `number`            | `1024`                                      | Status bar priority (larger value keeps item closer to center). |

### Template Placeholders & Modifiers

#### File Mode (`mode`)

| Placeholder | Format Description              | Standard / Origin        | Example Output |
| :---------- | :------------------------------ | :----------------------- | :------------- |
| `{mode}`    | POSIX symbolic mode (default)   | POSIX `ls -l`            | `-rw-r--r--`   |
| `{mode:o}`  | 4-digit octal permission        | C `%o` / Python `{:o}`   | `0644`         |
| `{mode:x}`  | 4-digit lowercase hex mode      | C `%x` / Python `{:x}`   | `81a4`         |
| `{mode:X}`  | 4-digit uppercase hex mode      | C `%X` / Python `{:X}`   | `81A4`         |
| `{mode:d}`  | Raw decimal mode integer        | C `%d` / Python `{:d}`   | `33188`        |
| `{mode:b}`  | 9-bit binary permission bitmask | C23 `%b` / Python `{:b}` | `110100100`    |

#### File Size (`size`)

| Placeholder    | Format Description               | Standard / Units             | Example Output (1178 B) |
| :------------- | :------------------------------- | :--------------------------- | :---------------------- |
| `{size}`       | Raw integer byte count (default) | Exact bytes                  | `1178 B`                |
| `{size:bytes}` | Raw integer byte count (alias)   | Exact bytes                  | `1178 B`                |
| `{size:1024}`  | 1024-based binary units          | IEC 80000-13 (KiB, MiB, GiB) | `1.15 KiB`              |
| `{size:iec}`   | 1024-based binary units (alias)  | IEC 80000-13 (KiB, MiB, GiB) | `1.15 KiB`              |
| `{size:1000}`  | 1000-based metric units          | SI standard (kB, MB, GB)     | `1.18 kB`               |
| `{size:si}`    | 1000-based metric units (alias)  | SI standard (kB, MB, GB)     | `1.18 kB`               |

#### Timestamps (`mtime`, `atime`, `ctime`, `btime`)

| Placeholder | Description                        | Default Format      |
| :---------- | :--------------------------------- | :------------------ |
| `{mtime}`   | Last modification time             | `%Y-%m-%d %H:%M:%S` |
| `{atime}`   | Last access time                   | `%Y-%m-%d %H:%M:%S` |
| `{ctime}`   | Last metadata / status change time | `%Y-%m-%d %H:%M:%S` |
| `{btime}`   | Creation / birth time              | `%Y-%m-%d %H:%M:%S` |

All timestamp placeholders support POSIX `strftime` format specifiers via `:<pattern>` (e.g. `{mtime:%F %T}`, `{mtime:%Y/%m/%d %a}`, `{mtime:%R}`):

| Specifier               | Description                                            | Example Output                    |
| :---------------------- | :----------------------------------------------------- | :-------------------------------- |
| `%Y`, `%y`              | 4-digit year, 2-digit year                             | `2026`, `26`                      |
| `%m`, `%B`, `%b` / `%h` | Month number (01-12), full name, abbreviated name      | `11`, `November`, `Nov`           |
| `%d`, `%e`              | Day of month zero-padded (01-31), space-padded ( 1-31) | `05`, ` 5`                        |
| `%H`, `%I`              | Hour 24-hour clock (00-23), 12-hour clock (01-12)      | `14`, `02`                        |
| `%M`, `%S`              | Minute (00-59), Second (00-59)                         | `30`, `45`                        |
| `%F`, `%T`, `%R`        | Shortcuts for `%Y-%m-%d`, `%H:%M:%S`, `%H:%M`          | `2026-11-05`, `14:30:45`, `14:30` |
| `%A`, `%a`              | Full weekday name, abbreviated weekday name            | `Thursday`, `Thu`                 |
| `%u`, `%w`              | Weekday number (1-7, Mon=1), (0-6, Sun=0)              | `4`, `4`                          |
| `%z`                    | Timezone offset (+HHMM or -HHMM)                       | `+0800`                           |

Literal characters inside the modifier pattern (such as spaces, dashes, or custom tags) are preserved as-is. Unsupported or unavailable attributes fallback gracefully to `-`.

## Commands

- `File StatBar: Refresh` (`file-statbar.refresh`): Manually refresh file statistics for the active editor.

## Development Requirements

- Node.js >= 18.0.0
- pnpm >= 11.0.0
- VS Code >= 1.85.0

## Scripts

- `pnpm run build`: Clean output directories and compile production bundle.
- `pnpm run check`: Run Biome linter and TypeScript type checker.
- `pnpm run clean`: Clean `dist/` and `out/` build directories.
- `pnpm run format`: Format code with Biome.
- `pnpm run package`: Validate, build, and package extension into `.vsix`.
- `pnpm run release`: Validate, build, and publish extension to marketplace.
- `pnpm run test`: Build extension, compile test suites, and execute tests with `@vscode/test-cli`.
- `pnpm run watch`: Run TypeScript and esbuild in watch mode concurrently.

## License

[MIT](LICENSE)
