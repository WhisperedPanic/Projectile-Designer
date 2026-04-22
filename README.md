# Projectile Geometry & Ballistic Preprocessor (Frontend)

A **frontend-only JavaScript tool** for generating projectile geometry, estimating ballistic properties, and exporting structured data for downstream simulation systems.

This tool is designed to pair with a **Python-based ballistic engine**, acting as a deterministic input generator with **strict numerical parity** to the reference model.

---

## 🎯 Purpose

* Provide a fast, interactive way to define projectile geometry
* Compute derived geometric and ballistic properties
* Output clean, structured data for external simulation pipelines
* Maintain **1:1 consistency** with the reference Python implementation

---

## ⚙️ Features

### Geometry

* Tangent ogive nose generation
* Full projectile outline construction
* Boat tail modelling with angle and length control
* High-resolution profile sampling

### Ballistics (Analytical Estimates)

* Volume (numerical integration)
* Mass (density-based)
* Sectional Density (SD)
* Form factor (i7)
* Ballistic Coefficients:

  * G7
  * G1 (derived)

### Visualization

* Real-time SVG rendering
* Scaled projectile profile display

### Output

* Structured JSON export matching backend expectations
* Includes:

  * Geometry
  * Ballistics
  * Profile points (outline + nose)

---

## 🧠 Design Philosophy

This tool is intentionally:

* **Deterministic** → No randomness, no hidden state
* **Transparent** → All math is directly implemented and inspectable
* **Backend-aligned** → Outputs are designed for seamless Python ingestion
* **Non-optimized by design** → Numerical behavior is preserved exactly

---

## 📦 Project Structure

```
/
├── index.html        # Complete frontend tool (UI + logic)
└── README.md
```

> Note: This is currently a **single-file implementation** for simplicity and portability.

---

## 🚀 Getting Started

### Run Locally

No build step required.

```bash
git clone <repo>
cd <repo>
open index.html
```

Or simply double-click `index.html`.

---

## 🧾 Input Parameters

| Parameter        | Description               | Units   |
| ---------------- | ------------------------- | ------- |
| caliber          | Projectile diameter       | inches  |
| overall_length   | Total projectile length   | inches  |
| nose_length      | Ogive length              | inches  |
| boat_tail_length | Boat tail length          | inches  |
| boat_tail_angle  | Boat tail angle           | degrees |
| ogive_type       | tangent / secant / hybrid | enum    |

---

## 📤 Output Format

The tool produces a JSON object:

```json
{
  "geometry": { ... },
  "ballistics": {
    "volume_in3": number,
    "mass_gr": number,
    "sd": number,
    "bc_g7": number,
    "bc_g1": number
  },
  "points": {
    "outline": [{ "x": number, "y": number }],
    "nose": [{ "x": number, "y": number }]
  }
}
```

---

## 🔬 Numerical Notes

* Volume computed via **trapezoidal integration (N = 1000)**
* Density fixed at **10.8 g/cc**
* i7 form factor derived from:

  * Nose length ratio
  * Boat tail angle
  * Boat tail length
  * Ogive type baseline
* Values are **clamped to realistic bounds**

---

## ⚠️ Current Limitations

* Only **tangent ogive geometry** is implemented (secant/hybrid affect ballistics only)
* No meplat modelling
* No drag curve simulation (handled in backend)
* No unit switching (internally inches)

---

## 🧩 Integration with Python Backend

This tool is intended to feed directly into your simulation system.

Typical workflow:

1. Define projectile in UI
2. Export JSON
3. Send to Python system
4. Run trajectory / WEZ / terminal models

---

## 🛠️ Future Improvements

### Geometry

* True secant ogive implementation
* Hybrid ogive blending
* Meplat trimming
* G7 reference shape overlay

### Architecture

* Modular JS structure
* State management system
* Plugin-based extensions (matching backend design)

### UX

* Unit switching (in/mm)
* Input validation & constraints
* Export/download button
* Live comparison between designs

### Integration

* Direct API POST to backend
* Batch generation mode
* Parameter sweeps

---

## 📚 Hit List

### 1. Add New Geometry Features []

* Extend `computeOgiveY()` or introduce new ogive models []
* Ensure backward compatibility with existing outputs []

### 2. Modify Ballistic Model []

* Update `computeBallistics()` []
* Maintain deterministic behavior []

### 3. Add Visualization Layers []

* Overlay additional curves in SVG []
* Avoid modifying base geometry output []

### 4. Prepare for Backend Sync []

* Keep output schema stable []
* Version your data if breaking changes are introduced []

---

## 📄 License

TBD

---

## 🧭 Project Direction

This tool is part of a broader system aimed at:

* Probabilistic ballistic modelling
* Weapon Engagement Zone (WEZ) analysis
* High-fidelity trajectory simulation

The frontend will remain a **lightweight, deterministic input layer**, while complexity is handled downstream.

---
