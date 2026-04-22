# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on *Keep a Changelog* and this project follows **Semantic Versioning**.

---

## [0.2.0] - 2026-04-22

### 🎉 Added

* Introduced a **modular multi-file architecture**
* Added a centralized **state management system**
* Created dedicated modules:

  * `state/` → single source of truth for projectile parameters and results
  * `geometry/` → pure geometry computations
  * `ballistics/` → ballistic estimation logic
  * `analysis/` → unified analysis pipeline
  * `render/` → SVG rendering system
  * `ui/` → input handling and control binding
* Added a **main controller (`main.js`)** to orchestrate state → compute → render flow
* Implemented **deterministic update pipeline**:

  * input → state update → analysis → render
* Improved separation between:

  * computation logic
  * UI interaction
  * rendering

---

### 🔄 Changed

* Refactored from **single-file (v0.1.0)** to **modular structure**
* Moved all mathematical logic out of UI layer into pure functions
* Replaced direct DOM-driven computation with **state-driven updates**
* Standardized data flow through a single `analyze()` entry point
* Updated initialization flow:

  * inputs are now populated from state
  * updates are triggered via bound control handlers

---

### 🧪 Stability & Behavior

* ✅ **No changes to numerical behavior**
* ✅ All equations, constants, and outputs remain **identical to v0.1.0**
* ✅ Output JSON structure unchanged

---

### 🏗️ Internal Improvements

* Improved maintainability and readability of codebase
* Established clear extension points for:

  * additional ogive models (secant, hybrid geometry)
  * rendering enhancements
  * backend API integration
* Enabled easier unit testing of computation modules (no DOM dependencies)

---

### ⚠️ Notes

* This release introduces **breaking changes to project structure only**

  * File layout has changed significantly
  * Direct usage of the previous single-file version is not compatible
* Functionality and outputs remain unchanged

---

### 🚧 Known Limitations

* Only **tangent ogive geometry** is implemented (secant/hybrid affect ballistics only)
* No meplat modelling
* No backend/API integration yet
* No unit switching (internally inches)

---

### 🔮 Next Planned Work (v0.3.0)

* True **secant ogive geometry implementation**
* Hybrid ogive modelling
* Meplat support
* Enhanced visualization (e.g. G7 reference overlay)

---

## [0.1.0] - Initial Release

### Added

* Single-file frontend tool
* Projectile geometry generation
* Ballistic estimation (volume, mass, SD, BC)
* SVG visualization
* JSON output for backend use

---
