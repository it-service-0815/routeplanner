import {pharmacies,defaultSettings,initialPlan,byId,dayMetrics,optimize,cycleCoverage,overnightRecommendation} from './core.js';
import {routeByRoad} from './routing.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const stored=JSON.parse(localStorage.getItem('routeplanner-r3')||'null');
const state=stored||{view:'today',selectedDate:'2026-08-03',plan:clone(initialPlan),settings:clone(defaultSettings),editing:false,query:'',drawer:null,picker:false,pickerQuery:'',pickerPriority:'all'};
state.picker=false; state.pickerQuery=state.pickerQuery||''; state.pickerPriority=state.pickerPriority||'all';
state.baseline=state.baseline||clone(state.plan);
const app=document.querySelector('#app'), toast=document.querySelector('#toast');
let liveMap=null, routeRequest=0;
const icons={
  today:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/></svg>',
  week:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/></svg>',
  cycle:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2M7 4l-3 3m13-3 3 3"/></svg>',
  stores:'<svg viewBox="0 0 24 24"><path d="M4 10v10h16V10M3 10l2-6h14l2 6"/><path d="M3 10c1 2 3 2 4 0 1 2 3 2 5 0 1 2 3 2 5 0 1 2 3 2 4 0M9 20v-5h6v5"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.6-.8-1.8 1-1.9-2.1-2.1-1.9 1-1.8-.8-.6-2h-3l-.6 2-1.8.8-1.9-1-2.1 2.1 1 1.9-.8 1.8-2 .6v3l2 .6.8 1.8-1 1.9 2.1 2.1 1.9-1 1.8.8.6 2h3l.6-2 1.8-.8 1.9 1 2.1-2.1-1-1.9.8-1.8z"/></svg>',
  route:'<svg viewBox="0 0 24 24"><path d="M6 19c-4-3-1-7 2-7h8c4 0 4-6 0-7"/><circle cx="6" cy="19" r="2"/><circle cx="16" cy="5" r="2"/></svg>',
  nav:'<svg viewBox="0 0 24 24"><path d="m4 11 16-7-7 16-2-7z"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  spark:'<svg viewBox="0 0 24 24"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z"/></svg>',
  chevron:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>'
};
const save=()=>localStorage.setItem('routeplanner-r3',JSON.stringify(state));
const flash=msg=>{toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)};
const navUrl=p=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.street}, ${p.zip} ${p.city}`)}`;
const fmtMinutes=n=>n<60?`${n} Min.`:`${Math.floor(n/60)} Std. ${n%60?`${n%60} Min.`:''}`;
const dateLabel=date=>new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long'}).format(new Date(`${date}T12:00:00`));
const dates=Object.keys(state.plan).sort();

function shell(content){
  const items=[['today','Heute'],['week','Woche'],['cycle','Runde'],['stores','Apotheken'],['settings','Mehr']];
  return `<div class="app-shell"><aside class="sidebar">
    <div class="brand"><span class="brand-mark">e</span><span><b>Engelhard</b><small>Routenplaner</small></span></div>
    <nav>${items.map(([id,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${icons[id]}<span>${label}</span></button>`).join('')}</nav>
    <div class="profile"><span>AJ</span><div><b>Alex Jaquet</b><small>Außendienst · Rhein-Main</small></div></div>
  </aside><main><div class="mobile-top"><div class="brand"><span class="brand-mark">e</span><span><b>Routenplaner</b><small>Engelhard</small></span></div><span class="avatar">AJ</span></div>${content}</main>
  <nav class="bottom-nav">${items.map(([id,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${icons[id]}<span>${label}</span></button>`).join('')}</nav>${drawer()}${picker()}</div>`;
}
function top(kicker,title,actions=''){return `<header class="page-head"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1></div><div class="actions">${actions}<span class="avatar desktop">AJ</span></div></header>`}
const button=(label,id,style='secondary',icon='')=>`<button id="${id}" class="button ${style}">${icon}${label}</button>`;

function map(ids,metrics){
  return `<section class="map-card"><div class="map-head"><div><span class="eyebrow">LIVE-TAGESROUTE</span><h3>Rhein-Main Gebiet</h3></div><span class="traffic"><i></i> Verkehr berücksichtigt</span></div>
  <div class="map"><div id="live-map" aria-label="Straßenkarte der Tagesroute"></div><div id="map-loading"><span></span> Straßenroute wird berechnet …</div>
  <div class="map-stat"><b id="map-distance">${metrics.distance} km</b><span id="map-duration">${fmtMinutes(metrics.drive)} Fahrzeit · Schätzung</span></div><div class="map-source">© OpenStreetMap · OSRM</div></div></section>`;
}
function today(){
  const ids=state.plan[state.selectedDate]||[], metrics=dayMetrics(ids,state.settings), over=overnightRecommendation(metrics,state.settings);
  return shell(`${top(dateLabel(state.selectedDate).toUpperCase(),'Heute',`${button('Neu planen','optimize','ghost',icons.spark)}${button(state.editing?'Fertig':'Bearbeiten','edit','primary')}`)}
    <section class="hero"><div><span class="hero-label"><i></i> Dein Plan ist bereit</span><h2>Guten Morgen, Alex.</h2><p>${ids.length} Apotheken liegen heute sinnvoll auf deiner Route.</p><div class="hero-facts"><span><b id="metric-end">${metrics.end}</b> zurück</span><span><b id="metric-km">${metrics.distance} km</b> Strecke</span><span><b id="metric-drive">${fmtMinutes(metrics.drive)}</b> Fahrt</span></div></div><div class="hero-score"><span>Planqualität</span><b>Sehr gut</b><small>A-Prioritäten berücksichtigt</small></div></section>
    <div class="today-grid">${map(ids,metrics)}<section class="route-card"><div class="section-head"><div><span class="eyebrow">DEIN TAG</span><h3 id="day-heading">${ids.length} Besuche · Ende ${metrics.end}</h3></div><span class="status-pill">Optimiert</span></div>
      <div id="route-list">${metrics.stops.map((p,i)=>stop(p,i)).join('')||empty('Noch keine Besuche','Füge Apotheken hinzu oder lasse den Tag optimieren.')}</div>
      ${state.editing?`<button id="add-stop" class="add-button">${icons.plus} Apotheke auswählen</button>`:`<p class="help">Tippe auf „Bearbeiten“, um den Tagesplan anzupassen.</p>`}
    </section></div><section id="route-comparison" class="route-comparison hidden"></section>
    <section class="insight ${over.recommended?'hotel':''}"><span class="insight-icon">${over.recommended?'H':'✓'}</span><div><span class="eyebrow">SMARTE EMPFEHLUNG</span><h3>${over.recommended?'Übernachtung wirtschaftlich sinnvoll':'Heute entspannt nach Hause'}</h3><p>${over.recommended?`Du sparst etwa ${over.savedMinutes} Minuten und ${over.savedKm} km. Wirtschaftlicher Vorteil: ${over.benefit} €.`:`Die Heimfahrt dauert etwa ${metrics.homeDrive} Minuten. Eine Übernachtung erzeugt heute keinen wirtschaftlichen Vorteil.`}</p></div><button class="text-button" id="show-insight">Warum?</button></section>`);
}
function stop(p,i){return `<article class="stop" draggable="${state.editing}" data-stop="${p.id}"><span class="stop-index">${state.editing?'⋮⋮':i+1}</span><div class="time-block"><b data-road-time="${p.id}">${p.start}</b><small data-road-leg="${p.id}">+${p.leg} Min.</small></div><button class="stop-copy" data-open="${p.id}"><b>${p.name}</b><span>${p.street}, ${p.city}</span></button><span class="priority p-${p.priority}">${p.priority}</span><span class="duration">${p.duration} Min.</span><a class="icon-link" href="${navUrl(p)}" target="_blank" aria-label="Navigation zu ${p.name}">${icons.nav}</a>${state.editing?'<button class="remove" aria-label="Besuch entfernen">×</button>':''}</article>`}
function week(){
  const total=dates.reduce((s,d)=>s+dayMetrics(state.plan[d],state.settings).total,0);
  return shell(`${top('KW 32 · 03.–07. AUGUST','Deine Woche',button('Woche optimieren','optimize-week','primary',icons.spark))}
    <section class="week-summary"><div><span class="eyebrow">WOCHENPLAN</span><h2>${dates.reduce((s,d)=>s+state.plan[d].length,0)} Besuche sinnvoll verteilt</h2><p>${fmtMinutes(total)} inklusive Fahrt und Pausen</p></div><div class="coverage-ring" style="--value:80"><b>80%</b><span>Auslastung</span></div></section>
    <div class="week-board">${dates.map((d,i)=>dayCard(d,i)).join('')}</div>
    <section class="card week-note"><span class="insight-icon">✓</span><div><b>Die Woche ist gut ausbalanciert.</b><p>A-Apotheken liegen früh in der Runde, regionale Cluster reduzieren Leerfahrten.</p></div></section>`);
}
function dayCard(date,index){
  const m=dayMetrics(state.plan[date],state.settings);
  return `<article class="day-card ${date===state.selectedDate?'selected':''}" data-date="${date}"><div class="day-title"><div><span>${['MO','DI','MI','DO','FR'][index]}</span><b>${date.slice(-2)}.08.</b></div><span class="${m.overtime?'load high':'load'}">${m.overtime?'Zu lang':'Gut geplant'}</span></div><div class="day-route">${m.stops.map(p=>`<button data-open="${p.id}"><i class="p-${p.priority}">${p.priority}</i><span><b>${p.name}</b><small>${p.start} · ${p.duration} Min.</small></span></button>`).join('')}</div><div class="day-foot"><span>${m.distance} km</span><span>Ende ${m.end}</span></div></article>`;
}
function cycle(){
  const c=cycleCoverage(state.plan), remaining=pharmacies.filter(p=>!Object.values(state.plan).flat().includes(p.id));
  return shell(`${top('03. AUGUST – 25. OKTOBER','Deine Verkaufsrunde',button('Gesamtrunde planen','plan-cycle','primary',icons.spark))}
    <section class="cycle-hero"><div class="big-progress"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43"/><circle class="value" cx="50" cy="50" r="43" style="--progress:${c.percent}"/></svg><span><b>${c.percent}%</b><small>eingeplant</small></span></div><div><span class="eyebrow">ABDECKUNG</span><h2>${c.planned} von ${c.total} Apotheken</h2><p>Alle Apotheken werden in dieser Verkaufsrunde genau einmal besucht.</p></div><div class="priority-stats">${['A','B','C'].map(k=>`<span><i class="p-${k}">${k}</i><b>${c.counts[k]}</b><small>geplant</small></span>`).join('')}</div></section>
    <div class="cycle-grid"><section class="card"><div class="section-head"><div><span class="eyebrow">12-WOCHEN-PLAN</span><h3>Fortschritt und Kapazität</h3></div></div>${Array.from({length:12},(_,i)=>`<div class="cycle-week"><b>W${i+1}</b><span><i style="width:${i===0?Math.min(100,c.percent):0}%"></i></span><small>${i===0?c.planned:0} Besuche</small></div>`).join('')}</section><section class="card"><div class="section-head"><div><span class="eyebrow">NOCH OFFEN</span><h3>${remaining.length} Apotheken</h3></div></div>${remaining.slice(0,7).map(p=>`<button class="open-row" data-open="${p.id}"><i class="p-${p.priority}">${p.priority}</i><span><b>${p.name}</b><small>${p.city}</small></span>${icons.chevron}</button>`).join('')||empty('Alles eingeplant','Die aktuelle Verkaufsrunde ist vollständig abgedeckt.')}</section></div>`);
}
function stores(){
  const list=pharmacies.filter(p=>`${p.name} ${p.city} ${p.priority}`.toLowerCase().includes(state.query.toLowerCase()));
  return shell(`${top('GEBIET RHEIN-MAIN','Deine Apotheken')}<section class="store-toolbar"><label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="search" value="${state.query}" placeholder="Name, Ort oder Priorität suchen"></label><div class="filter-chips"><button class="active">Alle · ${pharmacies.length}</button><button>A</button><button>B</button><button>C</button></div></section>
    <section class="store-list"><div class="store-list-head"><span>Apotheke</span><span>Priorität</span><span>Letzter Besuch</span><span>Besuchsdauer</span><span></span></div>${list.map(p=>`<article><button class="store-name" data-open="${p.id}"><span class="store-symbol">${icons.stores}</span><span><b>${p.name}</b><small>${p.street}, ${p.zip} ${p.city}</small></span></button><span class="priority p-${p.priority}">${p.priority}</span><span class="last-visit">${new Intl.DateTimeFormat('de-DE').format(new Date(p.lastVisit))}</span><label class="duration-select"><select data-duration="${p.id}">${[30,45,60,75].map(n=>`<option ${p.duration==n?'selected':''}>${n}</option>`).join('')}</select><span>Min.</span></label><a class="icon-link" href="${navUrl(p)}" target="_blank" aria-label="Navigation zu ${p.name}">${icons.nav}</a></article>`).join('')}</section>`);
}
function settings(){
  const s=state.settings;
  return shell(`${top('PERSÖNLICHES PROFIL','So planst du deinen Tag')}<div class="settings-layout"><section class="card settings-card"><div class="settings-title"><span class="setting-icon">${icons.today}</span><div><h3>Arbeitstag</h3><p>Deine verfügbare Zeit bestimmt die tägliche Kapazität.</p></div></div>${field('Startpunkt','home','text',s.home)}<div class="field-pair">${field('Arbeitsbeginn','workStart','time',s.workStart)}${field('Arbeitsende','workEnd','time',s.workEnd)}</div>${field('Pause in Minuten','breakMinutes','number',s.breakMinutes)}</section>
  <section class="card settings-card"><div class="settings-title"><span class="setting-icon">${icons.stores}</span><div><h3>Besuche</h3><p>Der Standard gilt nur für neue Apotheken.</p></div></div>${field('Standard-Besuchsdauer','defaultDuration','number',s.defaultDuration)}<div class="setting-info">Individuelle Besuchszeiten pflegst du direkt an der jeweiligen Apotheke.</div></section>
  <section class="card settings-card"><div class="settings-title"><span class="setting-icon">${icons.route}</span><div><h3>Übernachtungen</h3><p>Empfehlung auf Basis deiner Opportunitätskosten.</p></div></div><label class="switch-row"><span>Übernachtungen berücksichtigen</span><input id="overnight" type="checkbox" ${s.overnight?'checked':''}><i></i></label><div class="field-pair">${field('Hotelkosten maximal','hotelLimit','number',s.hotelLimit,'€')}${field('Wert einer Stunde','hourlyValue','number',s.hourlyValue,'€')}</div>${field('Kilometerkosten','kmCost','number',s.kmCost,'€',.01)}</section></div>`);
}
function field(label,key,type,value,suffix='',step=1){return `<label class="field"><span>${label}</span><div><input data-setting="${key}" type="${type}" value="${value}" step="${step}">${suffix?`<i>${suffix}</i>`:''}</div></label>`}
function empty(title,copy){return `<div class="empty"><span>${icons.route}</span><b>${title}</b><p>${copy}</p></div>`}
function drawer(){
  if(!state.drawer)return '';
  const p=byId(state.drawer);
  return `<div class="scrim" data-close><aside class="drawer"><button class="drawer-close" data-close>×</button><span class="store-symbol large">${icons.stores}</span><span class="priority p-${p.priority}">Priorität ${p.priority}</span><h2>${p.name}</h2><p>${p.street}<br>${p.zip} ${p.city}</p><div class="detail-grid"><span><small>Besuchsdauer</small><b>${p.duration} Min.</b></span><span><small>Letzter Besuch</small><b>${new Intl.DateTimeFormat('de-DE').format(new Date(p.lastVisit))}</b></span></div><a class="button primary full" href="${navUrl(p)}" target="_blank">${icons.nav} Navigation starten</a></aside></div>`;
}
function picker(){
  if(!state.picker)return '';
  const current=state.plan[state.selectedDate]||[], base=dayMetrics(current,state.settings), plannedDates={};
  Object.entries(state.plan).forEach(([date,ids])=>ids.forEach(id=>plannedDates[id]=date));
  const matches=pharmacies.filter(p=>`${p.name} ${p.city} ${p.zip} ${p.street}`.toLowerCase().includes(state.pickerQuery.toLowerCase())&&(state.pickerPriority==='all'||p.priority===state.pickerPriority));
  return `<div class="picker-scrim"><section class="picker-sheet"><header class="picker-head"><div><span class="eyebrow">TAGESPLAN ERGÄNZEN</span><h2>Apotheke auswählen</h2><p>Du siehst sofort, wie sich deine Auswahl auf den Tag auswirkt.</p></div><button id="picker-close" aria-label="Auswahl schließen">×</button></header>
    <div class="picker-tools"><label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="picker-search" value="${state.pickerQuery}" placeholder="Apotheke, Ort oder PLZ"></label><div class="filter-chips">${['all','A','B','C'].map(x=>`<button data-picker-priority="${x}" class="${state.pickerPriority===x?'active':''}">${x==='all'?'Alle':`Priorität ${x}`}</button>`).join('')}</div></div>
    <div class="picker-list">${matches.map(p=>{
      const isCurrent=current.includes(p.id), existing=plannedDates[p.id], next=dayMetrics([...current,p.id],state.settings);
      const extraKm=Math.max(0,next.distance-base.distance), extraMin=Math.max(0,next.total-base.total);
      return `<article class="${isCurrent?'disabled':''}"><span class="store-symbol">${icons.stores}</span><button class="picker-copy" data-open="${p.id}"><span><b>${p.name}</b><small>${p.street}, ${p.zip} ${p.city}</small></span><i class="priority p-${p.priority}">${p.priority}</i></button><div class="impact"><span>+${extraMin} Min.</span><small>+${extraKm} km</small></div><div class="visit-meta"><span>${p.duration} Min. Besuch</span><small>Zuletzt ${new Intl.DateTimeFormat('de-DE').format(new Date(p.lastVisit))}</small></div>${isCurrent?'<span class="planned-badge">Im Tagesplan</span>':`<button class="picker-add" data-pick="${p.id}">${existing?'Verschieben':'Hinzufügen'}</button>`}</article>`;
    }).join('')||empty('Keine Apotheke gefunden','Passe Suche oder Filter an.')}</div>
    <footer><span>${matches.length} Apotheken</span><button id="picker-done" class="button primary">Fertig</button></footer></section></div>`;
}
async function loadRoadRoute(){
  if(state.view!=='today'||!document.querySelector('#live-map'))return;
  const request=++routeRequest, ids=state.plan[state.selectedDate]||[];
  try{
    const road=await routeByRoad(ids,state.settings);
    if(request!==routeRequest||state.view!=='today')return;
    const visit=ids.reduce((sum,id)=>sum+Number(byId(id).duration),0);
    const total=road.drive+visit+(ids.length?state.settings.breakMinutes:0);
    const startMinutes=state.settings.workStart.split(':').reduce((h,m)=>Number(h)*60+Number(m));
    const endMinutes=startMinutes+total;
    const end=`${String(Math.floor(endMinutes/60)).padStart(2,'0')}:${String(endMinutes%60).padStart(2,'0')}`;
    document.querySelector('#metric-end').textContent=end;
    document.querySelector('#metric-km').textContent=`${road.distance} km`;
    document.querySelector('#metric-drive').textContent=fmtMinutes(road.drive);
    document.querySelector('#map-distance').textContent=`${road.distance} km`;
    document.querySelector('#map-duration').textContent=`${fmtMinutes(road.drive)} Fahrzeit · Straße`;
    document.querySelector('#day-heading').textContent=`${ids.length} Besuche · Ende ${end}`;
    document.querySelector('#map-loading')?.classList.add('done');
    let clock=startMinutes;
    ids.forEach((id,index)=>{
      const leg=road.legs[index]; clock+=leg?.duration||0;
      const label=`${String(Math.floor(clock/60)).padStart(2,'0')}:${String(clock%60).padStart(2,'0')}`;
      const timeNode=document.querySelector(`[data-road-time="${id}"]`), legNode=document.querySelector(`[data-road-leg="${id}"]`);
      if(timeNode)timeNode.textContent=label;
      if(legNode)legNode.textContent=`+${leg?.duration||0} Min.`;
      clock+=Number(byId(id).duration);
    });
    if(window.L){
      liveMap=window.L.map('live-map',{zoomControl:false,attributionControl:true});
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(liveMap);
      window.L.control.zoom({position:'topright'}).addTo(liveMap);
      window.L.polyline(road.geometry,{color:'#006f78',weight:5,opacity:.88,lineCap:'round',lineJoin:'round'}).addTo(liveMap);
      const homeIcon=window.L.divIcon({className:'route-marker-wrap',html:'<span class="road-marker home-road">⌂</span>',iconSize:[34,34],iconAnchor:[17,17]});
      window.L.marker([state.settings.homeLat,state.settings.homeLng],{icon:homeIcon}).addTo(liveMap).bindTooltip('Start und Ziel');
      ids.forEach((id,index)=>{
        const p=byId(id), icon=window.L.divIcon({className:'route-marker-wrap',html:`<span class="road-marker ${index===0?'next':''}">${index+1}</span>`,iconSize:[34,34],iconAnchor:[17,17]});
        window.L.marker([p.lat,p.lng],{icon}).addTo(liveMap).bindTooltip(`<b>${p.name}</b><br>${p.city}`,{direction:'top'});
      });
      liveMap.fitBounds(window.L.latLngBounds(road.geometry),{padding:[28,28]});
    }
    const baseline=state.baseline[state.selectedDate]||ids;
    if(JSON.stringify(baseline)!==JSON.stringify(ids)){
      const recommended=await routeByRoad(baseline,state.settings);
      if(request!==routeRequest)return;
      const deltaKm=road.distance-recommended.distance, deltaMin=road.drive-recommended.drive;
      const comparison=document.querySelector('#route-comparison');
      comparison.classList.remove('hidden');
      comparison.innerHTML=`<span class="comparison-icon">${deltaMin<=0?'✓':'↗'}</span><div><span class="eyebrow">AUSWIRKUNG DEINER ÄNDERUNG</span><h3>${deltaMin<=0?'Dein Plan bleibt effizient':`${deltaMin} Minuten zusätzliche Fahrzeit`}</h3><p>${deltaKm>=0?'+':''}${deltaKm} km · ${deltaMin>=0?'+':''}${deltaMin} Min. gegenüber der Empfehlung</p></div><button id="restore-route" class="text-button">Empfehlung wiederherstellen</button>`;
      document.querySelector('#restore-route').onclick=()=>{state.plan[state.selectedDate]=clone(baseline);save();render();flash('Empfohlene Route wiederhergestellt')};
    }
  }catch(error){
    if(request!==routeRequest)return;
    const loading=document.querySelector('#map-loading');
    if(loading){loading.classList.add('error');loading.innerHTML='Straßenroute derzeit nicht verfügbar · Schätzung wird angezeigt'}
  }
}
function render(){
  if(liveMap){try{liveMap.remove()}catch{} liveMap=null}
  app.innerHTML=state.view==='today'?today():state.view==='week'?week():state.view==='cycle'?cycle():state.view==='stores'?stores():settings();
  bind();
  if(state.view==='today')loadRoadRoute();
}
function bind(){
  document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{state.view=el.dataset.view;state.editing=false;save();render()});
  document.querySelectorAll('[data-open]').forEach(el=>el.onclick=e=>{if(e.currentTarget.closest('.stop')?.draggable)return;state.drawer=el.dataset.open;render()});
  document.querySelectorAll('[data-close]').forEach(el=>el.onclick=e=>{if(e.target===el){state.drawer=null;render()}});
  if(state.view==='today'){
    document.querySelector('#edit').onclick=()=>{state.editing=!state.editing;render()};
    document.querySelector('#optimize').onclick=()=>{state.plan[state.selectedDate]=optimize(state.plan[state.selectedDate],state.settings);state.baseline[state.selectedDate]=clone(state.plan[state.selectedDate]);save();render();flash('Route neu optimiert')};
    document.querySelector('#show-insight').onclick=()=>flash('Berechnet aus Fahrzeit, Kilometerkosten, Stundenwert und Hotelbudget.');
    if(state.editing){
      document.querySelectorAll('[data-stop]').forEach(el=>{
        el.ondragstart=()=>el.classList.add('dragging');
        el.ondragend=()=>{el.classList.remove('dragging');state.plan[state.selectedDate]=[...document.querySelectorAll('[data-stop]')].map(x=>x.dataset.stop);save();render();flash('Reihenfolge gespeichert')};
        el.ondragover=e=>{e.preventDefault();const drag=document.querySelector('.dragging');if(drag&&drag!==el)el.parentNode.insertBefore(drag,e.clientY>el.getBoundingClientRect().top+el.offsetHeight/2?el.nextSibling:el)};
        el.querySelector('.remove').onclick=()=>{state.plan[state.selectedDate]=state.plan[state.selectedDate].filter(id=>id!==el.dataset.stop);save();render()};
      });
      document.querySelector('#add-stop').onclick=()=>{state.picker=true;state.pickerQuery='';state.pickerPriority='all';render()};
    }
  }
  if(state.view==='week'){
    document.querySelector('#optimize-week').onclick=()=>{dates.forEach(d=>state.plan[d]=optimize(state.plan[d],state.settings));save();render();flash('Alle fünf Tage neu optimiert')};
    document.querySelectorAll('[data-date]').forEach(el=>el.onclick=e=>{if(e.target.closest('[data-open]'))return;state.selectedDate=el.dataset.date;state.view='today';save();render()});
  }
  if(state.view==='cycle')document.querySelector('#plan-cycle').onclick=()=>{const planned=Object.values(state.plan).flat();const open=pharmacies.filter(p=>!planned.includes(p.id));open.forEach((p,i)=>state.plan[dates[i%dates.length]].push(p.id));dates.forEach(d=>state.plan[d]=optimize(state.plan[d],state.settings));save();render();flash('Verkaufsrunde vollständig eingeplant')};
  if(state.view==='stores'){
    document.querySelector('#search').oninput=e=>{state.query=e.target.value;save();render();requestAnimationFrame(()=>{const input=document.querySelector('#search');input.focus();input.setSelectionRange(input.value.length,input.value.length)})};
    document.querySelectorAll('[data-duration]').forEach(el=>el.onchange=()=>{byId(el.dataset.duration).duration=Number(el.value);save();flash('Besuchsdauer aktualisiert')});
  }
  if(state.view==='settings'){
    document.querySelectorAll('[data-setting]').forEach(el=>el.onchange=()=>{state.settings[el.dataset.setting]=el.type==='number'?Number(el.value):el.value;save();flash('Einstellung gespeichert')});
    document.querySelector('#overnight').onchange=e=>{state.settings.overnight=e.target.checked;save();flash('Übernachtungslogik aktualisiert')};
  }
  if(state.picker){
    document.querySelector('#picker-close').onclick=document.querySelector('#picker-done').onclick=()=>{state.picker=false;render()};
    document.querySelector('#picker-search').oninput=e=>{state.pickerQuery=e.target.value;render();requestAnimationFrame(()=>{const input=document.querySelector('#picker-search');input.focus();input.setSelectionRange(input.value.length,input.value.length)})};
    document.querySelectorAll('[data-picker-priority]').forEach(el=>el.onclick=()=>{state.pickerPriority=el.dataset.pickerPriority;render()});
    document.querySelectorAll('[data-pick]').forEach(el=>el.onclick=()=>{
      const id=el.dataset.pick;
      Object.keys(state.plan).forEach(date=>state.plan[date]=state.plan[date].filter(x=>x!==id));
      state.plan[state.selectedDate].push(id); state.plan[state.selectedDate]=optimize(state.plan[state.selectedDate],state.settings);
      save(); state.picker=false; render(); flash('Apotheke hinzugefügt und Route aktualisiert');
    });
  }
}
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
