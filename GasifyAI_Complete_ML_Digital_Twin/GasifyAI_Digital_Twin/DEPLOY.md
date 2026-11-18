# DEPLOY — publish your GasifyAI project

## Option 1: GitHub Pages — simplest public presentation URL

The [GasifyAI presentation](https://abhinav072004.github.io/BTP-PROJECT-/) is published from `main` using the repository-root `/docs` folder. The **github-pages** deployment appears under **Deployments** on the repository's Code page.

To update the presentation, commit changes to the repository-root `docs/` folder. Keep `index.html`, `model_export.js`, and `assets/` together. The page runs the illustrative Ridge model in the browser. CSV upload and retraining are available in the Streamlit app.

## Option 2: Streamlit Community Cloud — full training, dashboards and file upload

1. Put the project into a GitHub repository. Keep `streamlit_app.py`, `requirements.txt`, `models/demo_surrogate.joblib`, `model_core.py`, and `.streamlit/config.toml` at the stated relative paths.
2. Visit **https://share.streamlit.io** and sign in using GitHub.
3. Choose **Create app**, select your repository/branch, and set **Main file path** to `GasifyAI_Complete_ML_Digital_Twin/GasifyAI_Digital_Twin/streamlit_app.py`.
4. Deploy. The app will receive a publicly shareable `streamlit.app` URL if your sharing settings permit it.
5. In the app, select **Data & Deployment** to upload your genuine Aspen CSV and train. To make that model persistent across restarts, train locally with the CLI and commit `models/aspen_surrogate.joblib` to your repository, then redeploy.

Streamlit's official deployment guide: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy

## Option 3: Windows local presentation (offline)

- Extract the ZIP fully (do not open just the HTML file from inside the ZIP).
- Open `offline_dashboard/index.html` in Edge or Chrome. Keep its assets and `model_export.js` in the same extracted folder tree.
- All plots use the bundled local Plotly JavaScript. The layout font falls back to installed system fonts when disconnected.
- Open **Live Simulator**, change MSW/AIR sliders and demonstrate instant predictions.

## Option 4: Windows local Streamlit

```powershell
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m streamlit run streamlit_app.py
```

## If your own Aspen data are ready

Use **the actual sensitivity export** rather than the 780-row illustrative CSV. The training procedure supports CSV files with the seven expected columns. It reports both normal random test accuracy and a grouped holdout on unseen MSW levels. Validate the species units carefully: inputs and syngas in kg/h, component outputs as mass fractions.

## Troubleshooting

- **HTML has no charts:** Extract the complete ZIP first; verify `offline_dashboard/assets/plotly.min.js` exists. Use Chrome or Edge with JavaScript enabled.
- **Cloud app fails on missing files:** Confirm you committed the `models/` folder and the `model_core.py` file, not just the Streamlit entrypoint.
- **Powershell refuses activation:** Use the explicit `.venv\Scripts\python.exe` commands above.
- **Unexpected fractions:** Check the Aspen output basis; molar vs mass fractions are not interchangeable.
- **Model pickle incompatible with package versions:** Re-run `python train_model.py` in the environment deployed by your cloud host, or use the pinned scikit-learn 1.8.x family in `requirements.txt`.
