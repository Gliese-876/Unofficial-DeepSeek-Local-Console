# DeepSeek Local Console (Unofficial)

[Simplified Chinese](README.md) | English

An unofficial, locally hosted DeepSeek chat console. The browser UI runs on your own machine, while the Node.js server only serves static assets, persists local state, and proxies requests to the DeepSeek API.

The code, UI, and documentation for this project were written entirely with OpenAI Codex.

The project focuses on exposing DeepSeek request parameters as completely as possible, so users can customize the payload sent to the API, including newer parameters such as `reasoning_effort` that many BYOK third-party chat clients do not yet expose.

This project is not affiliated with or endorsed by DeepSeek.

## Features

- Configure the API key and API base URL locally
- Manage multiple conversations, including deletion with confirmation
- New conversations inherit the current conversation model by default
- Stream responses and stop generation manually
- Display and collapse `reasoning_content` separately
- Render Markdown and KaTeX
- Use an Obsidian-like Markdown editing experience in the input area
- Store model, streaming mode, and request parameters per conversation
- Customize request parameters sent to the API, including `reasoning_effort`
- Optionally fetch the model list from `/models`

## Requirements

- Node.js 20 or later
- Network access to the DeepSeek API
- A valid DeepSeek API key

## Installation

```bash
npm install
```

## Start

```bash
npm start
```

Then open:

```text
http://127.0.0.1:3000/
```

To use another port, set the `PORT` environment variable. For example, in PowerShell:

```powershell
$env:PORT = "3001"
npm start
```

Then open:

```text
http://127.0.0.1:3001/
```

## Local Data and Security

On first start, the app creates:

```text
data/store.json
```

This file stores local conversations, settings, and other state. If the user chooses to save the API key locally, the API key is also stored in plaintext in this file.

Do not publish, commit, or package the following local files and directories:

- `data/`
- `.env`, `.env.*`
- `node_modules/`
- `.git/`
- `.playwright-cli/`
- `output/`
- `*.zip`, `*.tar`, `*.tar.gz`
- log files

These paths are already covered by `.gitignore`. When redistributing source code, include only the source tree and required license notices, not personal conversation data or local archive files.

## Reinstall Dependencies

The repository does not include `node_modules/`. After cloning the source on a new machine, run:

```bash
npm install
npm start
```

## Third-Party Components and Licenses

Frontend dependencies are installed through npm. The `node_modules/` directory is not committed to the repository; each dependency's own license files are retrieved when dependencies are installed.

Main dependencies:

| Component | Purpose | License |
| --- | --- | --- |
| `marked` | Markdown parsing | MIT |
| `KaTeX` | Math rendering | MIT |
| `DOMPurify` | HTML sanitization | MPL-2.0 OR Apache-2.0 |
| `Vditor` | WYSIWYG Markdown input | MIT |

The project also redistributes a font file:

| Font | File | License |
| --- | --- | --- |
| LXGW Neo ZhiSong Plus | `public/fonts/LXGWNeoZhiSongPlus.ttf` | IPA Font License |

A copy of the font license is included at `public/fonts/LXGWNeoZhiSong-LICENSE_CHS.md`. Keep this license file when redistributing the project, and follow the IPA Font License terms.

## Project License

This project's own code is licensed under the GNU General Public License v3.0 or later. See `LICENSE`.

Third-party libraries and the bundled font are not relicensed by this project. They remain under their respective licenses listed above.
