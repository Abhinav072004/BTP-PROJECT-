# GasifyAI — MSW–SS Gasification Digital Twin (Presentation Prototype)

A complete **offline dashboard + Streamlit web app + trainable ML pipeline** for the Aspen Plus MSW and sewage-sludge co-gasification project.

> **Scientific disclosure:** This repository ships with an ILLUSTRATIVE 780-row dataset generated from transparent, smooth example relationships anchored to **one** Aspen Plus stream-export reference. These are **not** the 780 original Aspen AI Model Builder training points (those raw records were not provided). The Aspen AI Model Builder screenshot shows a *separate* LassoCV model with mean **test R² ≈ 0.996674**. The Ridge regression supplied here cannot inherit that score or claim the `.athm` deployment. Replace the example CSV with your own converged Aspen sensitivity export to produce a real Aspen-trained replacement.

## Choose a demo

| Version | Start | Purpose |
| --- | --- | --- |
| **Offline, no installation** | Open `offline_dashboard/index.html` in Chrome/Edge. Keep the whole folder together. | Projection, viva, presentation, browser-only prediction. |
| **Interactive web app** | `streamlit run streamlit_app.py` | Training on real Aspen CSV, richer plots, downloadable models. |
| **Free public online demo** | GitHub Pages (`docs/`) | Share a browser link, no server or Python for viewers. |
| **Free online ML platform** | Streamlit Community Cloud | Hosted Streamlit + real-data upload/retraining. |

### Quick start on Windows

```powershell
# Run inside the extracted GasifyAI_Digital_Twin folder
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
streamlit run streamlit_app.py
```

The app then opens on your computer (usually `http://localhost:8501`). If PowerShell restricts activation, use `.venv\Scripts\python -m pip install -r requirements.txt` and `.venv\Scripts\python -m streamlit run streamlit_app.py` instead.

### What you can demonstrate

- **Overview:** predicted syngas mass flow and LHV, product gas composition and response surface.
- **Live simulator:** sliders/forms for `MSW` and `AIR`, with instant gas output, fraction and energy calculations.
- **Sensitivity lab:** MSW-versus-syngas, air-versus-composition and 2D gross-LHV response surface.
- **Heat Integration:** no-integration counterfactual, documented 39.80 kW B1 recovery, hypothetical extra recovery.
- **TEA Studio:** $1.818 M CAPEX, $309,494/year OPEX, negative $4.043 M NPV and price/recovery scenarios.
- **Model Diagnostics:** per-target random holdout R², grouped MSW holdout R², MAE and parity visualizations.
- **Data & Deployment:** CSV upload, retrain, and download the fitted model (Streamlit version).
- **Evidence:** supplied Aspen AI Model Builder screenshots and separately labelled R² results.

## Evidence provenance and engineering basis

Source: user's `Aspen_MSW_Gasification_TEA_Model.xlsx` (sheets `RAW_ASPEN_STREAM_DATA`, `PROCESS_DESIGN_BASIS`, `ENERGY_AND_UTILITIES`, `CAPACITY_AND_PRODUCTION`, `EXECUTIVE_DASHBOARD`, `FINANCIAL_ASSUMPTIONS`, `INVESTMENT_METRICS`). Key **reference export** quantities:

| Variable | Base case | Provenance |
| --- | ---: | --- |
| MSW feed | 184.000 kg/h | Raw Aspen stream data |
| Sewage sludge | 1.000 kg/h | Raw Aspen stream data |
| Air | 96.500 kg/h | Raw Aspen stream data |
| CO₂/H₂O agent | 376.077582 kg/h | Raw Aspen stream data |
| MAINGAS | 595.692827 kg/h | Raw Aspen stream data |
| Solid residue | 61.884756 kg/h | Raw Aspen stream data |
| CO in MAINGAS | 30.228390 kg/h | Raw Aspen stream data |
| H₂ in MAINGAS | 1.653097 kg/h | Raw Aspen stream data |
| CO₂ in MAINGAS | 382.235422 kg/h | Raw Aspen stream data |
| CH₄ in MAINGAS | 21.257885 kg/h | Raw Aspen stream data |
| B1 exchanger | 39.800921 kW | Energy and utilities |
| Heating with B1 | 185.993422 kW | Energy and utilities |
| Cooling with B1 | 83.664336 kW | Energy and utilities |
| Gross gas energy | 1.566780 GJ/h LHV | Capacity and production |
| Net saleable gas | 6,232.344 GJ/year | Capacity and production (screening assumptions) |
| TEA NPV | −$4.043 million | Preliminary TEA investment metrics |

**Important distinction:** Gas composition in this app is on a **mass-fraction basis** from the exported `MAINGAS` values above. The screenshot's source variables are labelled `CO_FRAC`, `H2_FRAC`, etc., but that screenshot alone does not definitively document whether they use mass or mole fraction. Do not mix the two bases without conversion and confirmation.

## Train from *real* Aspen Plus simulation data

1. Run an Aspen Plus sensitivity analysis in which **MSW and AIR vary**, and fix sewage sludge and gasifying agent if you want the exact two-input model here.
2. Export **converged cases** into a UTF-8 CSV with one row per input pair.
3. Required columns (case-insensitive):

   ```csv
   MSW,AIR,SYNGAS,CO_FRAC,H2_FRAC,CO2_FRAC,CH4_FRAC
   184,96.5,595.6928266,0.0507449,0.0027751,0.64165,0.03569
   ```

   The illustrative second line demonstrates the schema; use **all your own exported cases** (at least 50 unique combinations, and at least 8 distinct values of each input). Mass flows in **kg/h**; fractions in **0–1 mass basis**; no missing cells. The program prevents predicting outside the training min/max.

4. Either upload the CSV in **Streamlit → Data & Deployment** and click **Train**, or train from the command line:

   ```bash
   python train_model.py --csv data/my_aspen_export.csv --out models/aspen_surrogate.joblib
   ```

5. Commit `models/aspen_surrogate.joblib` and redeploy Streamlit to make your genuine Aspen-trained model available as **Packaged Aspen-trained model**. **Only load joblib files generated locally by this code; untrusted pickle/joblib files may execute arbitrary code.**
6. Evaluate with a fresh holdout/experimental set after any kinetic-model change or feed-analysis change. The grouped holdout here tests held-out MSW levels; it does **not** validate extrapolation, new feedstock chemistry or plant operation.

## Model design

`MSW, AIR → [2nd-order polynomial features] → [standardisation] → [Ridge regression] → SYNGAS, CO_FRAC, H2_FRAC, CO2_FRAC, CH4_FRAC`

The model is deliberately lightweight and reproducible. It fits five outputs simultaneously. A post-processing boundary clip ensures nonnegative gas fractions and leaves a residual `OTHER_FRAC` (water, nitrogen, oxygen and other unmodelled species); these constraints do not guarantee exact elemental or enthalpy closure. The **inferred solid residue** is a total-mass balance, not an independent char/ash regressor.

### Validation

```bash
python -m unittest discover -s tests -v
```

The shipped holdout R² will be very high **because the example data were generated from smooth deterministic relationships**; do not present that number as physical-model accuracy. Validation on genuine exported Aspen cases and external plant measurements is separate.

## Repository structure

```text
GasifyAI_Digital_Twin/
├─ streamlit_app.py              Full Streamlit dashboard / CSV retraining
├─ model_core.py                 Data generator, validation, training, inference
├─ train_model.py                CLI model training/export
├─ models/
│  ├─ demo_surrogate.joblib      Fitted on ILLUSTRATIVE dataset
│  ├─ demo_surrogate.json        Training metadata and evaluation
│  └─ demo_surrogate_coefficients.json
├─ data/
│  └─ illustrative_demo_780_cases.csv
├─ assets/                      Original user-provided Aspen AI screenshots
├─ offline_dashboard/           Browser-only demo (no installation)
│  ├─ index.html
│  ├─ model_export.js            Exported fitted regression coefficients
│  └─ assets/                   Local charts / images / CSS / JavaScript
├─ docs/                        Same demo ready for GitHub Pages
├─ tests/                       Unit tests
├─ .streamlit/config.toml        Dark theme
├─ requirements.txt
├─ DEPLOY.md
└─ PRESENTATION_GUIDE.md
```

## Limitations and safe use

- Not an experimentally validated gasifier model; not an Aspen `.athm` replacement. No real-time Aspen COM integration or historian connection.
- The workbook reference belongs to a specific 184 kg/h MSW/1 kg/h SS case, which differs from the report's nominal 1 kW thermal modelling basis.
- The TEA workbook relies on preliminary economics with unapproved assumptions. The TEA Studio applies scenario increments and does not re-evaluate the complete cash-flow sheet.
- Internal B1 exchanger recovery already appears in the Aspen/TEA baseline. Heat-recovery scenarios are hypothetical and should not double count it.
- The uploaded Aspen AI screenshot does not establish <5 ms runtime, >100× speedup or 100% convergence reliability; these claims require a measured benchmark.
- Treat all model output as exploratory engineering estimates. Do not use for real process equipment design, compliance, or safety/control decisions.
