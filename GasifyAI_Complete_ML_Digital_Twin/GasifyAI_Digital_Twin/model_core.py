"""Surrogate modelling for the MSW/SS gasification presentation dashboard.

Only the REFERENCE_CASE values are from the Aspen-derived TEA workbook.
The included 780-row demo dataset is explicitly illustrative, NOT Aspen simulation data.
A model trained on genuine user-exported Aspen cases is supported through CSV import.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

INPUTS = ["MSW", "AIR"]
OUTPUTS = ["SYNGAS", "CO_FRAC", "H2_FRAC", "CO2_FRAC", "CH4_FRAC"]
FRACTIONS = OUTPUTS[1:]
FRACTION_NAMES = ["CO", "H₂", "CO₂", "CH₄"]
DOMAIN = {"MSW": [100.0, 300.0], "AIR": [10.0, 100.0]}
REFERENCE_CASE = {
    "MSW": 184.0, "AIR": 96.5, "SS": 1.0, "AGENT": 376.077582240001,
    "SYNGAS": 595.692826599204, "RESIDUE": 61.8847556408003,
    "CO_FRAC": 30.2283898883525 / 595.692826599204,
    "H2_FRAC": 1.65309655612093 / 595.692826599204,
    "CO2_FRAC": 382.235421795536 / 595.692826599204,
    "CH4_FRAC": 21.2578854591845 / 595.692826599204,
    "B1_RECOVERY_KW": 39.8009205343536,
    "EXTERNAL_HEAT_KW": 185.993421718793,
    "EXTERNAL_COOL_KW": 83.6643361240963,
    "EXOTHERM_KW": 82.4994591657312,
    "GROSS_LHV_GJ_H": 1.56677979826678,
    "SALEABLE_GJ_YEAR": 6232.34362672101,
    "CAPEX_USD": 1817609.23623471,
    "OPEX_USD_YR": 309493.754348189,
    "NPV_USD": -4043301.34697722,
    "MSP_USD_GJ": 100.398017756377,
    "PRODUCT_PRICE_USD_GJ": 4.0,
    "ON_STREAM_HOURS": 8000,
    "DISCOUNT_RATE": 0.10,
    "HEATER_EFFICIENCY": 0.85,
    "YEARS": 20,
    "CONSTRUCTION_YEARS": 2,
}
# LHV components are from the TEA workbook, MJ per kmol converted to MJ/kg.
LHV_MJ_KG = {"H2_FRAC": 241.8/2.016, "CO_FRAC": 283.0/28.01, "CH4_FRAC": 802.3/16.043}
SOURCE_FILE = "Aspen_MSW_Gasification_TEA_Model.xlsx"


def create_illustrative_dataset() -> pd.DataFrame:
    """780 visibly *illustrative* operating points, not the user's missing Aspen sweep."""
    msw = np.linspace(*DOMAIN["MSW"], 26)
    air = np.linspace(*DOMAIN["AIR"], 30)
    mm, aa = np.meshgrid(msw, air, indexing="ij")
    m, a = mm.ravel(), aa.ravel()
    dm = (m-184.0)/184.0
    da = (a-96.5)/96.5
    residue = REFERENCE_CASE["RESIDUE"]*(m/184.0)**0.90 * (1 - .12*da + .04*dm*da)
    gas = m + a + REFERENCE_CASE["SS"] + REFERENCE_CASE["AGENT"] - residue
    co = REFERENCE_CASE["CO_FRAC"] * np.exp(.22*dm-.18*da+.08*dm*da)
    h2 = REFERENCE_CASE["H2_FRAC"] * np.exp(.12*dm-.21*da+.04*dm*dm)
    co2 = REFERENCE_CASE["CO2_FRAC"] * np.exp(-.09*dm+.07*da-.02*da*da)
    ch4 = REFERENCE_CASE["CH4_FRAC"] * np.exp(.10*dm-.26*da+.03*dm*da)
    assert (co+h2+co2+ch4 < 1).all()
    df = pd.DataFrame({"MSW":m,"AIR":a,"SYNGAS":gas,"CO_FRAC":co,"H2_FRAC":h2,"CO2_FRAC":co2,"CH4_FRAC":ch4})
    df.insert(len(df.columns), "DATA_ORIGIN", "ILLUSTRATIVE_NOT_ASPEN")
    return df.round(10)


def validate_data(df: pd.DataFrame) -> pd.DataFrame:
    """Validate schema, units, physical bounds, and sufficient training coverage."""
    df = df.copy()
    df.columns = [str(x).strip().upper() for x in df.columns]
    missing = [c for c in INPUTS+OUTPUTS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required CSV columns: {', '.join(missing)}")
    frame = df[INPUTS+OUTPUTS].apply(pd.to_numeric, errors="coerce")
    if frame.isna().any().any():
        raise ValueError("Some required columns contain missing or nonnumeric values.")
    if not np.isfinite(frame.to_numpy()).all():
        raise ValueError("Dataset contains infinite values.")
    if (frame[INPUTS] < 0).any().any() or (frame["SYNGAS"] <= 0).any():
        raise ValueError("Flow rates must be nonnegative and syngas flow must be positive.")
    if ((frame[FRACTIONS] < 0)|(frame[FRACTIONS] > 1)).any().any():
        raise ValueError("Gas fractions must be decimal mass fractions, between 0 and 1 (not 0–100 percentages).")
    if (frame[FRACTIONS].sum(axis=1) > 1.001).any():
        raise ValueError("CO, H2, CO2 and CH4 mass fractions sum above 1 for some cases.")
    if len(frame)>25000: raise ValueError("Maximum 25,000 rows supported per session.")
    if frame.duplicated(subset=INPUTS).any():
        # Repeated simulation conditions are often leakage or failed Aspen exports.
        raise ValueError("Duplicate MSW/AIR input pairs found; deduplicate by case ID first.")
    if len(frame)<50 or any(frame[c].nunique()<8 for c in INPUTS):
        raise ValueError("Provide at least 50 distinct cases, with at least 8 distinct MSW and AIR values each.")
    return frame.reset_index(drop=True)


def new_model() -> Pipeline:
    return Pipeline([
        ("polynomial_features",PolynomialFeatures(degree=2,include_bias=False)),
        ("standardize_features",StandardScaler()),
        ("ridge_regression",Ridge(alpha=.005)),
    ])


def metrics_dict(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    metrics = {}
    for i, c in enumerate(OUTPUTS):
        metrics[c] = {"r2":float(r2_score(y_true[:, i],y_pred[:, i])),
                      "mae":float(mean_absolute_error(y_true[:, i],y_pred[:, i])),
                      "rmse":float(np.sqrt(mean_squared_error(y_true[:, i],y_pred[:, i])))}
    return metrics


def train_surrogate(df: pd.DataFrame, source: str = "ILLUSTRATIVE") -> dict:
    frame = validate_data(df)
    xx = frame[INPUTS].to_numpy(float)
    yy = frame[OUTPUTS].to_numpy(float)
    idx = np.arange(len(frame))
    itrain,itest=train_test_split(idx,test_size=.2,random_state=42)
    test_model=new_model().fit(xx[itrain],yy[itrain]); pred=test_model.predict(xx[itest])
    metrics=metrics_dict(yy[itest],pred)
    # Group holdout: test on unseen MSW levels to avoid solely adjacent-grid leakage.
    groups=np.round(xx[:,0],6)
    gss=GroupShuffleSplit(n_splits=1,test_size=.2,random_state=42)
    gtrain,gtest=next(gss.split(xx,yy,groups))
    group_model=new_model().fit(xx[gtrain],yy[gtrain])
    grouped_metrics=metrics_dict(yy[gtest],group_model.predict(xx[gtest]))
    final_model=new_model().fit(xx,yy)
    minmax={c:[float(frame[c].min()),float(frame[c].max())] for c in INPUTS}
    meta={"source":source,"n_samples":int(len(frame)),"n_train":int(len(itrain)),"n_test":int(len(itest)),
          "n_group_test":int(len(gtest)),"model":"PolynomialFeatures(degree=2) + StandardScaler + Ridge(alpha=0.005)",
          "random_state":42,"validation_method":"80/20 holdout and unseen-MSW-level group holdout",
          "input_range":minmax,"metrics":metrics,"group_metrics":grouped_metrics,
          "trained_utc":datetime.now(timezone.utc).isoformat(),
          "csv_expected_units":"MSW, AIR, SYNGAS: kg/h; gas fractions: decimal mass fractions"}
    diag=frame.iloc[itest].copy()
    for i,c in enumerate(OUTPUTS): diag['PRED_'+c] = pred[:,i]
    return {"model":final_model,"meta":meta,"diagnostics":diag}


def predict(model:Pipeline,msw:float,air:float, bounds:dict|None=None)->dict:
    if bounds:
        for c,v in {"MSW":msw,"AIR":air}.items():
            lo,hi=bounds[c]
            if not (lo <= v <= hi): raise ValueError(f"{c}={v} outside trained interval [{lo},{hi}]. No extrapolation is allowed.")
    raw=model.predict(np.array([[msw,air]],dtype=float))[0]
    gas=max(1e-6,float(raw[0])); f=np.clip(raw[1:],0.0,1.0)
    if f.sum()>.98: f *= .98/f.sum()
    r={"SYNGAS":gas,**{c:float(v) for c,v in zip(FRACTIONS,f)}}
    r["OTHER_FRAC"]=1.0-sum(r[c] for c in FRACTIONS)
    r["RESIDUE_INFERRED_KG_H"]=msw+air+REFERENCE_CASE["SS"]+REFERENCE_CASE["AGENT"]-gas
    r["GAS_LHV_GJ_H"]=gas*sum(r[c]*LHV_MJ_KG[c] for c in LHV_MJ_KG)/1000.0
    r["GAS_LHV_MJ_KG"]=r["GAS_LHV_GJ_H"]*1000/gas
    return r


def export_js_coefficients(model:Pipeline,meta:dict)->dict:
    poly=model.named_steps['polynomial_features']
    scaler=model.named_steps['standardize_features']
    ridge=model.named_steps['ridge_regression']
    return {"metadata":meta,"feature_names":poly.get_feature_names_out(INPUTS).tolist(),
            "mean":scaler.mean_.tolist(),"scale":scaler.scale_.tolist(),
            "coef":ridge.coef_.tolist(),"intercept":ridge.intercept_.tolist(),
            "inputs":INPUTS,"outputs":OUTPUTS,
            "reference":REFERENCE_CASE,"lhv_mj_kg":LHV_MJ_KG}


def save_model(result:dict,dest:Path)->None:
    import joblib
    dest=Path(dest)
    dest.parent.mkdir(parents=True,exist_ok=True)
    joblib.dump({"model":result["model"],"meta":result["meta"]},dest,compress=3)
    dest.with_suffix('.json').write_text(json.dumps(result["meta"],indent=2),encoding='utf-8')
    (dest.parent/(dest.stem+'_coefficients.json')).write_text(json.dumps(export_js_coefficients(result['model'],result['meta']),indent=2),encoding='utf-8')
