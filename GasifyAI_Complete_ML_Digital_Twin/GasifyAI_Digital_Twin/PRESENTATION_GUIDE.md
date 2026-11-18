# GasifyAI — viva and demonstration sequence

## 60-second project explanation

"My project models MSW and sewage-sludge co-gasification in Aspen Plus. To make repeated design-space exploration easier, I also built GasifyAI, a machine-learning dashboard that accepts waste and air feed rates and predicts total product-gas flow and key component mass fractions. It brings the surrogate model together with heat recovery and preliminary economics in one interface. The original Aspen AI Model Builder system shows reported testing R² averaging approximately 0.996674. For this newly coded Python dashboard, I created an end-to-end training pipeline with held-out evaluation and deployed-browser model support. Because the original 780-row Aspen sensitivity export was not available, the included model is a clearly marked demonstration, and the system can be retrained using the actual Aspen CSV." 

## Live demonstration plan

1. **Overview (15 sec):** Show Aspen reference outputs and the 39.80 kW internal B1 exchanger duty.
2. **Live Simulator (20 sec):** Change MSW from 184 to 220 kg/h; show predicted gas flow, LHV, CO, H₂, CO₂ and CH₄ fractions. State that this is demo-mode interpolation.
3. **Sensitivity Lab (15 sec):** Show 2D surface for MSW and air, describe two-input second-order features.
4. **Heat Integration (15 sec):** Compare no-recovery, verified B1 recovery and proposed future recovery; point out the extra case is not Aspen-verified.
5. **TEA (15 sec):** Show the preliminary $−4.04 million NPV and how higher product-gas price affects an *indicative* linearised financial scenario.
6. **Validation (15 sec):** Show original Aspen AI parity screenshots; distinguish original LassoCV result from the independently implemented demo Ridge model.
7. **If asked about deployment:** Show GitHub Pages offline model/Streamlit Cloud deployment steps.

## Expected technical questions

**Q. Why an ML surrogate if Aspen Plus already models the gasifier?**
A. Repeated parameter sweeps can be expensive. A fitted surrogate evaluates inputs algebraically after training, making exploratory sensitivity and screening easy. It does not replace physical validation or energy/element conservation checks.

**Q. Does an R² of 0.9968 mean 99.68% accuracy?**
A. No. R² is a coefficient of determination, not a direct percentage of correctly predicted points. The Aspen AI screenshot provides train/test R² per target, and their mean test R² is around 0.996674. Real prediction errors should also be expressed using MAE/RMSE and physical units.

**Q. Was the new model trained on 780 real Aspen points?**
A. No. The original 780-row export was not supplied. The included code creates 780 illustrative points for a demonstrable training-to-deployment workflow. I built an upload-and-retrain pipeline for actual Aspen sensitivity exports.

**Q. How do you know the model respects mass balance?**
A. The gas fractions are clipped to valid bounds, and the interface infers residue from total mass input minus predicted syngas. This gives an overall mass balance, but it does not guarantee species-wise elemental or heat balance. A rigorous surrogate would need those constraints or physically constrained outputs.

**Q. Is the reported 39.80 kW heat recovery additional to base-case TEA?**
A. No, it is already part of the B1 exchanger and hence built into the reported utility baseline. The incremental-recovery slider represents a proposal that needs pinch and equipment feasibility validation.

**Q. Is the deployed website a live plant digital twin?**
A. No, it is a static/Streamlit research demonstrator. It has no plant historian, process-control loop or validated online measurement stream. A production digital twin would require instrumentation, online calibration, domain-shift monitoring, and safety constraints.
