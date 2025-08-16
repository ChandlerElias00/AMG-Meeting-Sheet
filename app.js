// ===== Config: your published CSV URL =====
const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLbxvVjoOhjREgdbrH2OBW1b6HIviclFegTb8CoSOJR3Okwg_nb40qzJ8QKhf_BWQRWWuzWWv9Fw3w/pub?gid=0&single=true&output=csv";
const LS_KEY = 'partner_brief_csv_url';
const LS_AUTO = 'partner_brief_auto_refresh';

// ===== Helpers =====
const $ = id=>document.getElementById(id);
const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const money = (n,d=0)=>Number(n||0).toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:d});
const sign = n => (n>=0?'+':'') + money(n);
const pctFmt = x => (isFinite(x)? ((x>=0?'+':'')+x.toFixed(1)+'%') : '—');
const normHead = h => String(h||'').toLowerCase().replace(/[^a-z0-9]/g,'');

// ===== Data seed (visible while first fetch runs) =====
let data = {
  s2024: [168076.20,177540.00,189646.60,175948.70,181556.10,187181.10,180416.70,179365.60,154514.00,161960.40,158570.30,166856.40],
  s2025: [144619.72,149778.60,172845.74,159293.52,174489.45,156133.29,148160.23,157258.61,135469.99,141998.62,139026.35,146291.18],
  expenses: [144983.19,148265.09,156638.86,163805.33,169739.06,148822.77,159760.13,159760.13,154606.58,159760.13,154606.58,159760.13],
  profitCurrentPct: [-363.47,1513.51,16206.88,-4511.81,4750.39,7310.52,3958.24,4201.31,3619.20,3793.62,3714.22,3908.30],
  profitProjectedSE: [-363.47,1513.51,16206.88,-4511.81,4750.39,7310.52,-11599.90,-2501.52,-19136.58,-17761.51,-15580.23,-13468.95],
  addSavingsJulDec: 15000,
  yearlyDeltaNote: '-$256,266.80 (from your sheet)',
  costPerDayNote: '$5,153.55 (avg reported)'
};

// ===== Computations =====
function monthlyDelta(){ return data.s2025.map((v,i)=> v - (data.s2024[i]||0)); }
function monthlyPct(){ return data.s2025.map((v,i)=>{ const b=data.s2024[i]||0; return b? ((v-b)/b)*100 : 0; }); }
function sum(arr){ return arr.reduce((a,b)=>a+Number(b||0),0); }

// ===== Charts =====
let lineSales, barDelta, lineProfit, barExpense;

function drawCharts(){
  const ctx1 = $('lineSales').getContext('2d');
  const ctx2 = $('barDelta').getContext('2d');
  const ctx3 = $('lineProfit').getContext('2d');
  const ctx4 = $('barExpense').getContext('2d');

  [lineSales,barDelta,lineProfit,barExpense].forEach(c=> c && c.destroy());

  lineSales = new Chart(ctx1,{
    type:'line',
    data:{ labels: months, datasets:[
      {label:'2024 Sales', data:data.s2024, tension:.25},
      {label:'2025 Sales', data:data.s2025, tension:.25}
    ]},
    options:{ plugins:{legend:{labels:{color:'#cbd5e1'}}},
      scales:{ x:{ ticks:{color:'#cbd5e1'}},
               y:{ ticks:{color:'#cbd5e1', callback:v=>'$'+Number(v).toLocaleString()},
                   grid:{color:'rgba(203,213,225,.15)'} } }
  });

  const deltas = monthlyDelta();
  const pcts = monthlyPct().map(x=> (isFinite(x)? x:0));
  barDelta = new Chart(ctx2,{
    type:'bar',
    data:{ labels: months.map((m,i)=> m+' ('+(pcts[i]>=0?'+':'')+pcts[i].toFixed(1)+'%)'),
           datasets:[{ label:'2025 − 2024', data:deltas }]},
    options:{ plugins:{legend:{labels:{color:'#cbd5e1'}}},
      scales:{ x:{ ticks:{color:'#cbd5e1'}},
               y:{ ticks:{color:'#cbd5e1', callback:v=> (v>=0?'+':'')+'$'+Number(v).toLocaleString()},
                   grid:{color:'rgba(203,213,225,.15)'} } }
  });

  const method = $('selMethod').value;
  const addSave = $('chkSavings').checked;
  const pBase = (method==='current') ? data.profitCurrentPct.slice() : data.profitProjectedSE.slice();
  if(addSave){ for(let i=6;i<12;i++){ pBase[i] = (pBase[i]||0) + (data.addSavingsJulDec||0); } }
  lineProfit = new Chart(ctx3,{
    type:'line',
    data:{ labels: months, datasets:[{label:'Projected Profit', data:pBase, tension:.25}] },
    options:{ plugins:{legend:{labels:{color:'#cbd5e1'}}},
      scales:{ x:{ ticks:{color:'#cbd5e1'}},
               y:{ ticks:{color:'#cbd5e1', callback:v=> (v>=0?'+':'')+'$'+Number(v).toLocaleString()},
                   grid:{color:'rgba(203,213,225,.15)'} } }
  });

  barExpense = new Chart(ctx4,{
    type:'bar',
    data:{ labels: months, datasets:[{label:'Expenses', data:data.expenses}] },
    options:{ plugins:{legend:{labels:{color:'#cbd5e1'}}},
      scales:{ x:{ ticks:{color:'#cbd5e1'}},
               y:{ ticks:{color:'#cbd5e1', callback:v=>'$'+Number(v).toLocaleString()},
                   grid:{color:'rgba(203,213,225,.15)'} } }
  });

  $('projNote').textContent =
    (method==='current' ? 'Using “Current Profit %” series' : 'Using “Projected Sales − Expenses” series') +
    (addSave? ' • +$15k Jul–Dec applied':'');
}

// ===== Table & KPIs =====
function drawTable(){
  const TB = $('tbody'); TB.innerHTML='';
  const del = monthlyDelta(), p = monthlyPct();
  months.forEach((m,i)=>{
    const tr = document.createElement('tr');
    const cls = (del[i]>=0?'pos':'neg');
    tr.innerHTML = `
      <td>${m}</td>
      <td class="text-right mono">${money(data.s2024[i]||0)}</td>
      <td class="text-right mono">${money(data.s2025[i]||0)}</td>
      <td class="text-right mono ${cls}">${sign(del[i]||0)}</td>
      <td class="text-right mono ${cls}">${pctFmt(p[i])}</td>
      <td class="text-right mono">${money(data.expenses[i]||0)}</td>
      <td class="text-right mono">${money(data.profitCurrentPct[i]||0)}</td>
      <td class="text-right mono">${money(data.profitProjectedSE[i]||0)}</td>
    `;
    TB.appendChild(tr);
  });
}
function setKPIs(){
  const y25 = sum(data.s2025);
  const y24 = sum(data.s2024);
  const delta = y25 - y24;
  const pct = y24? ((delta/y24)*100) : 0;
  $('kYtd25').textContent = money(y25,0);
  $('kYtdDelta').textContent = sign(delta);
  $('kYtdPct').textContent = (pct>=0?'+':'') + pct.toFixed(2) + '%';
  $('kYearDelta').textContent = data.yearlyDeltaNote || '—';
  $('kCostPerDay').textContent = data.costPerDayNote || '—';
  $('ytdMonths').textContent = 'Jan–Dec';
}

// ===== CSV parsing =====
function parseCSV(text){
  const rows = []; let row=[], cur='', inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inQ){
      if(c==='"' && text[i+1]==='"'){ cur+='"'; i++; }
      else if(c==='"'){ inQ=false; }
      else cur+=c;
    }else{
      if(c==='"'){ inQ=true; }
      else if(c===','){ row.push(cur); cur=''; }
      else if(c==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
      else if(c!=='\r'){ cur+=c; }
    }
  }
  row.push(cur); rows.push(row);
  return rows.filter(r=> r.some(x=> String(x).trim()!==''));
}
function toNumber(x){
  if(x==null) return 0;
  const s = String(x).replace(/[\$,]/g,'').trim();
  if(s==='') return 0;
  const n = Number(s);
  return isFinite(n)? n : 0;
}
function ingest(rows){
  if(!rows.length) throw new Error('Empty CSV');
  const head = rows[0].map(h=>normHead(h));
  const body = rows.slice(1);
  const hasYear = head.includes('year');
  const hasMonth = head.includes('month');
  const sales2024 = head.findIndex(h=> h.includes('sales') && h.includes('2024'));
  const sales2025 = head.findIndex(h=> h.includes('sales') && h.includes('2025'));
  const idx = {
    year: head.indexOf('year'),
    month: head.indexOf('month'),
    sales: head.indexOf('sales'),
    expenses: head.findIndex(h=> h==='expenses' || h==='totalexpenses' || h==='operatingexpenses'),
    p1: head.findIndex(h=> h==='profitcurrentpct' || h==='profitcurrent' || h==='currentprofit'),
    p2: head.findIndex(h=> h==='profitprojectedse' || h==='profitprojected' || h==='projectedsminuse')
  };
  const s24 = Array(12).fill(0), s25 = Array(12).fill(0), exp = Array(12).fill(0), p1 = Array(12).fill(0), p2 = Array(12).fill(0);
  function monthIdx(name){
    if(!name) return -1;
    const s = String(name).trim().toLowerCase().slice(0,3);
    return ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(s);
  }
  if(hasYear && hasMonth && idx.sales>=0){
    body.forEach(r=>{
      const yr = Number(r[idx.year]);
      const mi = monthIdx(r[idx.month]); if(mi<0) return;
      const sales = toNumber(r[idx.sales]);
      const ex = idx.expenses>=0 ? toNumber(r[idx.expenses]) : 0;
      const q1 = idx.p1>=0 ? toNumber(r[idx.p1]) : 0;
      const q2 = idx.p2>=0 ? toNumber(r[idx.p2]) : 0;
      if(yr===2024){ s24[mi]=sales; }
      if(yr===2025){ s25[mi]=sales; exp[mi]=ex; p1[mi]=q1; p2[mi]=q2; }
    });
  } else if(hasMonth && sales2024>=0 && sales2025>=0){
    body.forEach(r=>{
      const mi = monthIdx(r[head.indexOf('month')]); if(mi<0) return;
      s24[mi] = toNumber(r[sales2024]);
      s25[mi] = toNumber(r[sales2025]);
      if(idx.expenses>=0) exp[mi] = toNumber(r[idx.expenses]);
      if(idx.p1>=0) p1[mi] = toNumber(r[idx.p1]);
      if(idx.p2>=0) p2[mi] = toNumber(r[idx.p2]);
    });
  } else {
    throw new Error('Unrecognized columns. Expected (A) Year,Month,Sales… or (B) Month,Sales2024,Sales2025,…');
  }
  return { s24, s25, exp, p1, p2 };
}

// ===== Live fetch & status =====
function setUrlStamp(ok,msg){
  const el = $('fetchStamp');
  el.textContent = (ok? 'OK: ' : 'Error: ') + msg;
  el.style.color = ok? '#bbf7d0' : '#fecaca';
  el.style.borderColor = ok? '#166534' : '#9f1239';
}
async function fetchCsv(url){
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}
async function refreshFromUrl(){
  const url = $('csvUrl').value.trim();
  if(!url) { setUrlStamp(false,'No URL'); return; }
  try{
    setUrlStamp(true,'Fetching…');
    const csv = await fetchCsv(url);
    const rows = parseCSV(csv);
    const parsed = ingest(rows);
    data.s2024 = parsed.s24; data.s2025=parsed.s25;
    if(parsed.exp.some(x=>x!==0)) data.expenses = parsed.exp;
    if(parsed.p1.some(x=>x!==0)) data.profitCurrentPct = parsed.p1;
    if(parsed.p2.some(x=>x!==0)) data.profitProjectedSE = parsed.p2;
    setKPIs(); drawCharts(); drawTable();
    setUrlStamp(true,'Loaded '+new Date().toLocaleTimeString());
  }catch(e){
    setUrlStamp(false, e.message);
    console.error(e);
  }
}

// ===== Upload fallback =====
document.addEventListener('DOMContentLoaded', ()=>{
  $('fileCsv').addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    try{
      const txt = await f.text();
      const rows = parseCSV(txt);
      const parsed = ingest(rows);
      data.s2024 = parsed.s24; data.s2025=parsed.s25;
      if(parsed.exp.some(x=>x!==0)) data.expenses = parsed.exp;
      if(parsed.p1.some(x=>x!==0)) data.profitCurrentPct = parsed.p1;
      if(parsed.p2.some(x=>x!==0)) data.profitProjectedSE = parsed.p2;
      setKPIs(); drawCharts(); drawTable();
      setUrlStamp(true,'Loaded from file');
    }catch(err){ alert('Could not parse CSV: '+err.message); }
  });
});

// ===== Sortable table =====
let sortKey='month', sortDir=1;
document.addEventListener('click', (ev)=>{
  const th = ev.target.closest('th[data-sort]'); if(!th) return;
  const key = th.dataset.sort;
  if(sortKey===key) sortDir*=-1; else { sortKey=key; sortDir=1; }
  const rows = months.map((m,i)=>({
    month:m, s24:data.s2024[i]||0, s25:data.s2025[i]||0,
    delta:(data.s2025[i]||0)-(data.s2024[i]||0),
    pct:(data.s2024[i]? ((data.s2025[i]-data.s2024[i])/data.s2024[i])*100 : 0),
    exp:data.expenses[i]||0, p1:data.profitCurrentPct[i]||0, p2:data.profitProjectedSE[i]||0
  }));
  rows.sort((a,b)=> (a[sortKey]-b[sortKey]) * sortDir);
  const TB = $('tbody'); TB.innerHTML='';
  rows.forEach(r=>{
    const cls = (r.delta>=0?'pos':'neg');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.month}</td>
      <td class="text-right mono">${money(r.s24)}</td>
      <td class="text-right mono">${money(r.s25)}</td>
      <td class="text-right mono ${cls}">${sign(r.delta)}</td>
      <td class="text-right mono ${cls}">${pctFmt(r.pct)}</td>
      <td class="text-right mono">${money(r.exp)}</td>
      <td class="text-right mono">${money(r.p1)}</td>
      <td class="text-right mono">${money(r.p2)}</td>`;
    TB.appendChild(tr);
  });
});

// ===== UI wiring & init =====
let autoTimer=null;
function setAutoRefresh(on){
  localStorage.setItem(LS_AUTO, on?'1':'0');
  if(autoTimer){ clearInterval(autoTimer); autoTimer=null; }
  if(on){ autoTimer = setInterval(refreshFromUrl, 5*60*1000); }
}

function init(){
  const savedUrl = localStorage.getItem(LS_KEY) || DEFAULT_CSV_URL;
  $('csvUrl').value = savedUrl;
  const auto = localStorage.getItem(LS_AUTO) === '1';
  $('autoRefresh').checked = auto;
  setAutoRefresh(auto);

  $('btnSaveUrl').addEventListener('click', ()=>{
    const url = $('csvUrl').value.trim();
    if(!url) return alert('Paste a valid “Publish to web” CSV URL first.');
    localStorage.setItem(LS_KEY, url);
    setUrlStamp(true,'Saved URL');
  });
  $('btnFetch').addEventListener('click', refreshFromUrl);
  $('autoRefresh').addEventListener('change', e=> setAutoRefresh(e.target.checked));
  ['selMethod','chkSavings'].forEach(id=> $(id).addEventListener('input', drawCharts, {passive:true}));

  // draw seeds immediately, then fetch live
  setKPIs(); drawCharts(); drawTable();
  refreshFromUrl();
}

document.addEventListener('DOMContentLoaded', init);
