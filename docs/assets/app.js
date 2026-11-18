/* Offline model inference from exported scikit-learn polynomial Ridge coefficients.
 * No server, cloud API, or remote model calls. Demo data are NOT Aspen simulation results. */
(() => {
'use strict';
const M=window.GASIFY_MODEL;if(!M)throw new Error('model_export.js is missing');
const B=M.reference;const colors=['#47dfd0','#64a7fb','#efbd77','#b98bfb','#839eb4'];
const fractionNames=['CO','H₂','CO₂','CH₄','Other'];
const outNames=['CO_FRAC','H2_FRAC','CO2_FRAC','CH4_FRAC'];
let current='overview';
const el=id=>document.getElementById(id);
const text=(id,v)=>{if(el(id))el(id).textContent=v};
const num=(n,d=2)=>Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const f=([msw,air])=>[msw,air,msw*msw,msw*air,air*air];
function predict(msw,air){
  if(msw<M.metadata.input_range.MSW[0] || msw>M.metadata.input_range.MSW[1] || air<M.metadata.input_range.AIR[0] || air>M.metadata.input_range.AIR[1])throw new Error('Out of trained domain');
  const x=f([msw,air]);const xx=x.map((v,i)=>(v-M.mean[i])/M.scale[i]);
  const ys=M.coef.map((co,j)=>M.intercept[j]+co.reduce((acc,c,i)=>acc+c*xx[i],0));
  const r={SYNGAS:Math.max(.0001,ys[0])};
  let fs=ys.slice(1).map(v=>Math.max(0,Math.min(1,v)));const tot=fs.reduce((a,b)=>a+b,0);
  if(tot>.98)fs=fs.map(v=>v*.98/tot);
  outNames.forEach((k,i)=>r[k]=fs[i]);r.OTHER_FRAC=1-fs.reduce((a,b)=>a+b,0);
  r.RESIDUE=msw+air+B.SS+B.AGENT-r.SYNGAS;
  r.GAS_LHV_GJ_H=r.SYNGAS*(r.H2_FRAC*M.lhv_mj_kg.H2_FRAC+r.CO_FRAC*M.lhv_mj_kg.CO_FRAC+r.CH4_FRAC*M.lhv_mj_kg.CH4_FRAC)/1000;
  r.GAS_LHV_MJ_KG=1000*r.GAS_LHV_GJ_H/r.SYNGAS;
  r.SALEABLE_GJ_YR=Math.max(0,r.GAS_LHV_GJ_H-B.EXTERNAL_HEAT_KW*.0036/B.HEATER_EFFICIENCY)*B.ON_STREAM_HOURS;
  return r;
}
function chart(id,data,layout={}){
  const base={paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(6,18,31,.12)',font:{family:'DM Sans, Arial',size:11,color:'#9bbacd'},showlegend:true,margin:{l:55,r:20,t:26,b:50},
    legend:{orientation:'h',y:-.23,x:0,font:{size:10}},
    xaxis:{gridcolor:'#1d3a4e',zeroline:false,showline:false},
    yaxis:{gridcolor:'#1d3a4e',zeroline:false,showline:false},
    hoverlabel:{bgcolor:'#152f41',font:{color:'#eaffff'}},
    ...layout};
  Plotly.react(id,data,base,{displayModeBar:false,responsive:true,scrollZoom:false});
}
function donut(id,p){chart(id,[{type:'pie',hole:.74,labels:fractionNames,values:[...outNames.map(k=>p[k]),p.OTHER_FRAC],textinfo:'percent',textfont:{color:'#d3e8f1',size:11},hovertemplate:'%{label}<br>%{value:.2%}<extra></extra>',marker:{colors,line:{color:'#10243a',width:3}},sort:false}],{showlegend:true,legend:{x:1,y:.8,orientation:'v',font:{size:11}},margin:{t:5,l:5,b:10,r:10},annotations:[{x:.37,y:.52,text:'GAS',showarrow:false,font:{color:'#49dcd0',size:15,family:'Space Grotesk'}},{x:.37,y:.43,text:'COMPOSITION',showarrow:false,font:{color:'#90acbc',size:8}}]})}
function responseHeatmap(id){
 const x=Array.from({length:35},(_,i)=>100+i*200/34); const y=Array.from({length:31},(_,i)=>10+i*90/30);
 const z=y.map(a=>x.map(m=>predict(m,a).GAS_LHV_GJ_H));
 chart(id,[{type:'heatmap',x,y,z,colorscale:[[0,'#123056'],[.36,'#1775a5'],[.7,'#199b9b'],[1,'#6de0bd']],colorbar:{title:{text:'GJ/h',side:'right'},thickness:11,tickfont:{size:10}}}],{xaxis:{title:'MSW feed · kg/h',gridcolor:'#214258'},yaxis:{title:'Air · kg/h',gridcolor:'#214258'},margin:{l:65,b:58,r:18,t:20}})
}
function overview(){const p=predict(B.MSW,B.AIR);text('kpiGas',num(p.SYNGAS,2));text('kpiEnergy',num(p.GAS_LHV_GJ_H,3));donut('overviewDonut',p);responseHeatmap('overviewHeatmap')}
function simulator(){
 const m=Number(el('msw').value),a=Number(el('air').value),p=predict(m,a);
 text('mswValue',num(m,1)+' kg/h');text('airValue',num(a,1)+' kg/h');
 text('simGas',num(p.SYNGAS,2));text('simEnergy',num(p.GAS_LHV_GJ_H,3));text('simResidue',num(p.RESIDUE,2));text('simSaleable',num(p.SALEABLE_GJ_YR,0));
 chart('simComposition',[{type:'bar',orientation:'h',x:[...outNames.map(k=>p[k]*100),p.OTHER_FRAC*100],y:fractionNames,marker:{color:colors},text:[...outNames.map(k=>num(p[k]*100,2)+'%'),num(p.OTHER_FRAC*100,2)+'%'],textposition:'outside',hovertemplate:'%{y}: %{x:.2f}%<extra></extra>'}],{showlegend:false,margin:{l:65,r:65,t:20,b:45},xaxis:{title:'Mass fraction (%)',range:[0,100]},yaxis:{autorange:'reversed'}});
 return {m,a,...p};
}
function sensitivity(){
 const a=Number(el('fixAir').value),m=Number(el('fixMsw').value);text('fixAirRead',num(a,0)+' kg/h');text('fixMswRead',num(m,0)+' kg/h');
 const xs=Array.from({length:70},(_,i)=>100+i*200/69),as=Array.from({length:70},(_,i)=>10+i*90/69);
 chart('sensGas',[{x:xs,y:xs.map(v=>predict(v,a).SYNGAS),type:'scatter',mode:'lines',line:{width:3,color:'#4be2d0'},fill:'tozeroy',fillcolor:'rgba(50,205,192,.07)',name:'Syngas'}],{showlegend:false,xaxis:{title:'MSW · kg/h'},yaxis:{title:'Syngas · kg/h'}});
 const ps=as.map(v=>predict(m,v));chart('sensFractions',outNames.map((k,i)=>({x:as,y:ps.map(p=>p[k]*100),type:'scatter',mode:'lines',name:fractionNames[i],line:{width:2.5,color:colors[i]}})),{xaxis:{title:'Air · kg/h'},yaxis:{title:'Gas component (wt%)'}});
 responseHeatmap('sensHeatmap');
}
function thermal(){const e=Number(el('extraHeat').value),r=B.B1_RECOVERY_KW; text('extraHeatRead',num(e,1)+' kW');
 const x=['No integration','Existing B1','Enhanced (proposal)'];
 chart('heatCompare',[
  {type:'bar',x,y:[B.EXTERNAL_HEAT_KW+r,B.EXTERNAL_HEAT_KW,Math.max(0,B.EXTERNAL_HEAT_KW-e)],name:'External heating',marker:{color:'#f6ab80'}},
  {type:'bar',x,y:[B.EXTERNAL_COOL_KW+r,B.EXTERNAL_COOL_KW,Math.max(0,B.EXTERNAL_COOL_KW-e)],name:'External cooling',marker:{color:'#4ac9cc'}}
 ],{barmode:'group',yaxis:{title:'Thermal duty (kW)'},xaxis:{tickfont:{size:9}},margin:{l:48,r:10,t:18,b:63}});
 chart('recoveredCompare',[{type:'bar',x,y:[0,r,r+e],marker:{color:['#4b667c','#42c4c5','#6ce1b6']},text:[0,r,r+e].map(n=>num(n,1)+' kW'),textposition:'outside'}],{showlegend:false,yaxis:{title:'Recovered heat · kW'},xaxis:{tickfont:{size:9}},margin:{l:55,r:20,t:20,b:63}});
}
const pv=Array.from({length:B.YEARS},(_,i)=>({yr:i+1,ramp:i===0?.6:i===1?.8:1})).reduce((sum,v)=>sum+v.ramp/(1+B.DISCOUNT_RATE)**(B.CONSTRUCTION_YEARS+v.yr),0);
function econNPV(price,extra){const addEnergy=extra*B.ON_STREAM_HOURS*.0036/B.HEATER_EFFICIENCY;return B.NPV_USD+((price-B.PRODUCT_PRICE_USD_GJ)*B.SALEABLE_GJ_YEAR+price*addEnergy)*pv;}
function economic(){const p=Number(el('price').value),q=Number(el('econExtra').value),v=econNPV(p,q);text('priceRead','$'+num(p,0)+'/GJ');text('econExtraRead',num(q,0)+' kW');
 text('scenarioNpv',(v<0?'−':'')+'$'+num(Math.abs(v)/1e6,2)+'M');el('scenarioNpv').style.color=v<0?'#ffae95':'#5ce2b4';
 text('econDelta',(v>=B.NPV_USD?'Increase':'Decrease')+' vs workbook NPV: $'+num(Math.abs(v-B.NPV_USD)/1e6,2)+'M');
 text('econPrice','$'+num(p,2)+'/GJ');text('econHeat',num(q,1)+' kW');
 const xs=Array.from({length:76},(_,i)=>i*2);
 chart('npvChart',[{type:'scatter',x:xs,y:xs.map(x=>econNPV(x,q)/1e6),mode:'lines',name:'Indicative project NPV',line:{color:'#4cdbcf',width:3},fill:'tozeroy',fillcolor:'rgba(74,217,206,.06)'},
 {type:'scatter',x:[p],y:[v/1e6],mode:'markers',name:'Selected scenario',marker:{color:'#ffc37e',size:11}}],{xaxis:{title:'Assumed gas selling price (USD/GJ)'},yaxis:{title:'NPV (USD millions)'},shapes:[{type:'line',x0:0,x1:150,y0:0,y1:0,line:{color:'#d98e71',dash:'dash',width:1}}]});
}
function validation(){const m=M.metadata.metrics;const g=M.metadata.group_metrics;const labels=M.outputs;const score=labels.reduce((s,k)=>s+m[k].r2,0)/labels.length;text('demoR2',num(score,5));
 chart('r2Chart',[{type:'bar',x:labels,y:labels.map(k=>m[k].r2),name:'Random holdout R²',marker:{color:'#42d9cb'}},{type:'bar',x:labels,y:labels.map(k=>g[k].r2),name:'Unseen MSW levels R²',marker:{color:'#579bf0'}}],{barmode:'group',yaxis:{title:'R²',range:[Math.min(.95,Math.min(...labels.map(k=>g[k].r2))-.005),1.001]},xaxis:{tickfont:{size:10}},margin:{l:40,b:45,r:10,t:20}})}
const renderMap={overview,simulator,sensitivity,thermal,economic,validation};
function open(tab){current=tab;document.querySelectorAll('.panel').forEach(n=>n.classList.toggle('active',n.id===tab));document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));
 const label=document.querySelector(`.nav[data-tab="${tab}"]`);text('currentSection',label?.textContent.trim()||tab);renderMap[tab]();
}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>open(b.dataset.tab)));
['msw','air'].forEach(id=>el(id).addEventListener('input',()=>{const m=Number(el('msw').value),a=Number(el('air').value);text('mswValue',num(m,1)+' kg/h');text('airValue',num(a,1)+' kg/h');if(current==='simulator')simulator()}));
['fixAir','fixMsw'].forEach(id=>el(id).addEventListener('input',()=>{if(current==='sensitivity')sensitivity()}));
el('extraHeat').addEventListener('input',()=>thermal());['price','econExtra'].forEach(id=>el(id).addEventListener('input',()=>economic()));
el('resetConditions').addEventListener('click',()=>{el('msw').value=B.MSW;el('air').value=B.AIR;simulator()});
el('downloadPrediction').addEventListener('click',()=>{const s=simulator();const headers=['MSW','AIR','SYNGAS','CO_FRAC','H2_FRAC','CO2_FRAC','CH4_FRAC','GAS_LHV_GJ_H','RESIDUE','MODEL_SOURCE'];const vals=[s.m,s.a,s.SYNGAS,s.CO_FRAC,s.H2_FRAC,s.CO2_FRAC,s.CH4_FRAC,s.GAS_LHV_GJ_H,s.RESIDUE,'ILLUSTRATIVE_NOT_ASPEN'];
 const blob=new Blob([headers.join(',')+'\n'+vals.join(',')+'\n'],{type:'text/csv'}),u=URL.createObjectURL(blob),link=document.createElement('a');link.href=u;link.download='GasifyAI_demo_prediction.csv';link.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
if(!window.Plotly){document.body.innerHTML='Required local Plotly library was not found. Keep the assets folder next to index.html.';return;}
open('overview');
})();
