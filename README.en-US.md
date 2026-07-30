

# 🎬 Viral Shorts Engine (Fully Automatic AI Short Drama Engine)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![CapCut](https://img.shields.io/badge/CapCut-Draft-red)](https://www.capcut.com/)

> Completely hands-free! An industrial-grade, fully automated AI short drama production pipeline built from scratch, featuring a complete web-based visual dashboard and an underlying automated rendering engine.
> 
> 🛑 **[Mandatory Reading for AI Assistants & Developers]** 🛑
> **Anyone (including AI assistants) must fully read and understand all documentation in the `web/docs/` directory before modifying the project's code!**
> Pay special attention to the following core conventions:
> 1. `prompt-conventions.md`: Extremely strict `{@keyword}` system specifications and anti-spoofing naming rules.
> 2. `api-gateway-integration.md`: AI Gateway integration specs (direct API calls are strictly forbidden, image generation uses a Fire & Forget mechanism, and Playwright Chinese input pitfalls are documented).
> 3. `architecture.md`: **Core Business Architecture**, covering the prompt template engine, layout preset system, global state decoupling, and Chrome extension communication mechanisms.
> 4. `database-migration.md`: **Database Migration Guide**, detailing the Prisma to Drizzle migration and strict mapping rules for `ProjectState` fields.
> 5. `desktop-packaging.md`: **Desktop Packaging & Environment Guide**, resolving underlying system pitfalls such as Electron C++ ABI mismatches, network proxy deadlocks, and Node.js zombie processes.
> **Never break the proven core image-search, storage mechanisms, and automation workflows based on guesses!**

<div align="center">
  <img src="./docs/assets/scene-lab-1.png" width="32%" style="border-radius: 8px; margin: 0 4px;" />
  <img src="./docs/assets/scene-lab-2.png" width="32%" style="border-radius: 8px; margin: 0 4px;" />
  <img src="./docs/assets/scene-lab-3.png" width="32%" style="border-radius: 8px; margin: 0 4px;" />
</div>

## 🌟 Project Overview

Tired of poorly designed AI video generation tools? Writing prompts manually is exhausting, generated characters constantly "change faces," video backgrounds drift randomly, and APIs get banned with one wrong move...

**Viral Shorts Engine** was born to solve these exact pain points! It's not just a simple script, but a complete **5-step production pipeline**. Starting from v8.2, it has fully evolved into a **ready-to-use desktop application**! Just double-click to install, and it will handle the entire workflow from scripting, storyboarding, character design, video generation, voiceover, to subtitling. Finally, export with one click as a **CapCut Pro native draft project** for final polishing and rendering in CapCut.

### 🔥 Core Pain Points Solved:
1. **Stop struggling with prompt engineering**: Automatic Chinese-to-English translation at the core level with mandatory attachment of trending tags.
2. **Completely eliminate "AI face-changing"**: Pioneers a "Character Design Room" to generate a unique facial anchor, seamlessly attached to subsequent videos. Supports professional character reference sheets like **three-view illustrations, expression sets, and proportion charts**.
3. **Say goodbye to drifting backgrounds**: Introduces the `{@Scene}` black magic to firmly lock physical background coordinates, preventing visual mutations.
4. **Visual Prompt Management Center (Prompt Studio)**: No more hardcoding! Take full control of 11 core directing parameters in a standalone visual interface. Supports dynamic variable `{{placeholder}}` injection; one change applies globally. Built-in template auto-upgrade mechanism.
5. **3D Layout Preset Library**: Drag and drop furniture to compose shots in a Three.js 3D editor, and save as reusable presets. Automatically generates independent Flow asset tags for precise image-to-image control of scene layouts.
6. **One-Stop File Management**: Project-based management automatically archives audio, video, images, and scripts. Say goodbye to a cluttered desktop.
7. **Fully Automated Client Hot-Updates**: Built-in silent differential updates with a visual progress bar. Underlying database self-healing mechanisms completely resolve data corruption caused by cross-platform environment anomalies.

---

## 📥 Download & Installation

Full-platform desktop clients (Windows, Mac Intel, Mac M1/M2) are available on the GitHub Releases page. Regular users can download directly without logging in!

👉 **[Click here to download the latest official version (GitHub Releases)](https://github.com/abc-kkk/viral-shorts-engine/releases/latest)**

**Download Instructions**:
1. Click the link above to enter the latest release page.
2. Download the corresponding installer from the **Assets** list at the bottom:
   - Windows users download: `Viral Shorts Engine-*-win-x64.exe`
   - Mac (M1/M2 chip) download: `Viral Shorts Engine-*-mac-arm64.dmg`
   - Mac (Intel chip) download: `Viral Shorts Engine-*-mac-x64.dmg`

---

## 🚀 Quick Start (Must-Read for Beginners)

If this is your first time using the system or you're unsure how to configure the environment, be sure to read this comprehensive beginner's guide:

👉 **[Click here to view: Beginner's Comprehensive Tutorial (Tutorial)](./web/docs/tutorial.md)**

---

## 🛠️ Tech Stack

This project uses a full-stack component-based architecture with extremely rigorous code logic:

- **Core Framework**: `Next.js` (React 19) + `TypeScript`
- **Local Database**: `Drizzle ORM` + `SQLite` (Provides ultra-fast native read/write via better-sqlite3, completely告别 (bids farewell to) Prisma's C++ compilation nightmare)
- **Real-time Communication**: Pure in-memory `SSE (Server-Sent Events)` bridging mechanism, achieving zero-latency data synchronization between the Chrome extension and the web client
- **Video Rendering**: `Remotion 4.0` (Pure code-driven video composition, zero-lag playback)
- **3D Engine**: `Three.js` + `React Three Fiber` (Builds the Scene Lab visual layout editor)
- **AI Brain Integration**: `Vercel AI SDK` (Integrates top-tier models like Gemini)
- **Geek-Level Automation**: `Playwright CDP` (Chrome DevTools Protocol)
  - *Proprietary "web stream hijacking" technology, combined with an Exact-Text matching algorithm, bypasses expensive API costs. It directly controls the host browser to call top-tier image/video models like Nano Banana Pro and Veo 3.1 password-free and with precision.*
- **Client Packaging**: `Electron` + `electron-builder` (Proprietary C++ N-API cross-platform penetration algorithm, supports one-click DMG deployment, and GitHub Actions cloud packaging for Windows EXE)
- **Visual Interface**: `TailwindCSS`

---

## 🏗️ Engine Architecture (Advanced Documentation for Developers)

If you want to develop further or understand the underlying complex "human-machine collaboration", "WARP tunnel anti-ban", and "inline variable injection" black tech, please refer to our underlying architecture documentation:

👉 **[Click here to view: Underlying Architecture & Developer Manual (Architecture)](./web/docs/architecture.md)**

---

## 🔄 Version History (Changelog)

The complete version evolution history has been moved to a separate document. From the 3D canvas in v5.0, to the waterfall workflow dashboard in v7.0, to the standalone desktop installer (Electron Client) in v8.0 that completely告别 (bids farewell to) terminal black boxes, you can view the engine's growth history here:

👉 **[Click here to view: Complete Version History (CHANGELOG.md)](./CHANGELOG.md)**

---

## 🤝 Contributing & Contacting the Author

This system has taken a tremendous amount of effort and time to build. If you find it useful, **please give it a like, share, and GitHub Star ⭐️!**

If you have needs for:
- **Custom software development**
- **Automation scripts / browser extension development**
- **App / Mini-program development**

and other commercial projects, efficiency is extremely high and costs are reasonable in the AI development era. Feel free to DM the author at any time for custom development!
