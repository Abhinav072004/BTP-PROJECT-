"""CLI: python train_model.py --csv data/your_export.csv --out models/aspen_surrogate.joblib"""
import argparse
from pathlib import Path
import pandas as pd
from model_core import create_illustrative_dataset,train_surrogate,save_model,OUTPUTS

if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--csv',type=Path,help='Your genuine Aspen sensitivity export CSV; must have MSW,AIR and 5 output columns')
    p.add_argument('--out',type=Path,default=Path('models/demo_surrogate.joblib'))
    a=p.parse_args()
    if a.csv:
        df=pd.read_csv(a.csv)
        source='ASPEN_USER_EXPORT_'+a.csv.name
    else:
        df=create_illustrative_dataset();source='ILLUSTRATIVE_NOT_ASPEN'
        Path('data').mkdir(exist_ok=True)
        df.to_csv('data/illustrative_demo_780_cases.csv',index=False)
    res=train_surrogate(df,source=source)
    save_model(res,a.out)
    print('Dataset:',source,'rows:',res['meta']['n_samples'])
    print('Out-of-sample test R²:',{k:round(res['meta']['metrics'][k]['r2'],5) for k in OUTPUTS})
    print('Unseen-MSW-level test R²:',{k:round(res['meta']['group_metrics'][k]['r2'],5) for k in OUTPUTS})
    print('Model saved:',a.out)
