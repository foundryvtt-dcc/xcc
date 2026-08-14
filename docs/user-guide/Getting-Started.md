# Getting Started

## What XCC Is
XCrawl Classics (XCC) is a Foundry VTT **module**, not a standalone system. It modifies the [Dungeon Crawl Classics (DCC) system](https://foundryvtt.com/packages/dcc) so it supports the XCrawl Classics ruleset: XCrawl character classes and sheets, Mojo, Fame & Wealth rewards, and XCrawl-flavored UI touches.

## Requirements
* The **DCC system** — XCC declares a minimum DCC version in its manifest, and Foundry will warn you if your DCC install is too old.
* The **XCrawl Classics Core Book** (`xcc-core-book`) module — the module does not yet work properly without it. It provides the class journals, level data, critical hit tables, and the Messenger disapproval table that the sheets link to.

## Installation
1. Install the DCC system from the Foundry package browser and create a DCC world.
2. Install the *XCrawl Classics System* module (and the *XCrawl Classics Core Book* module if you own it) from the package browser.
3. Enable both modules in your world's **Manage Modules** dialog.

## Where Things Live
* XCrawl character sheets are selected per-actor via **Sheet Configuration** — see [Character Classes](Character-Classes.md).
* The Mojo tracker lives in the **XCC Tools** sidebar tab (the X icon near the bottom of the right-hand sidebar tab bar) — see [Mojo](Mojo.md).
* Module options are under **Configure Settings** — see [Module Settings](Module-Settings.md).
