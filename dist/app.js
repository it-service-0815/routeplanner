import {pharmacies,defaultSettings,initialPlan,byId,dayMetrics,optimize,cycleCoverage,overnightRecommendation,visitReason,dayCapacity,workDates,optimizeCycle,rebalanceWeek,planIntegrity} from './core.js';
import {routeByRoad} from './routing.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const stored=JSON.parse(localStorage.getItem('routeplanner-r3')||'null');
const state=stored||{view:'today',selectedDate:'2026-08-03',plan:clone(initialPlan),settings:clone(defaultSettings),editing:false,query:'',drawer:null,picker:false,pickerQuery:'',pickerPriority:'all'};
state.picker=false; state.pickerQuery=state.pickerQuery||''; state.pickerPriority=state.pickerPriority||'all';
state.baseline=state.baseline||clone(state.plan);
state.fixed=state.fixed||{}; state.weekOffset=Number(state.weekOffset||0); state.moveVisit=null; state.storePriority=state.storePriority||'all';
state.releaseInfo=null; state.showRelease=false;
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
const getAllDates=()=>workDates(state.settings);
const getWeekDates=()=>getAllDates().slice(state.weekOffset*5,state.weekOffset*5+5);

function shell(content){
  const items=[['today','Heute'],['week','Woche'],['cycle','Runde'],['stores','Apotheken'],['settings','Mehr']];
  return `<div class="app-shell"><aside class="sidebar">
    <div class="brand"><span class="brand-mark">e</span><span><b>Engelhard</b><small>Routenplaner</small></span></div>
    <nav>${items.map(([id,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${icons[id]}<span>${label}</span></button>`).join('')}</nav>
    <div class="profile"><span>AJ</span><div><b>Alex Jaquet</b><small>Außendienst · Rhein-Main</small></div></div>
  </aside><main><div class="mobile-top"><div class="brand"><span class="brand-mark">e</span><span><b>Routenplaner</b><small>Engelhard</small></span></div><span class="avatar">AJ</span></div>${content}</main>
  <nav class="bottom-nav">${items.map(([id,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${icons[id]}<span>${label}</span></button>`).join('')}</nav>${drawer()}${picker()}${moveSheet()}${releaseSheet()}</div>`;
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
    <section class="insight ${over.recommended?'hotel':''}"><span class="insight-icon">${over.recommended?'H':'✓'}</span><div><span class="eyebrow">SMARTE EMPFEHLUNG</span><h3>${over.recommended?'Übernachtung wirtschaftlich sinnvoll':'Heute entspannt nach Hause'}</h3><p>${over.reason}</p></div><button class="text-button" id="show-insight">Details</button></section>`);
}
function stop(p,i){return `<article class="stop" draggable="${state.editing}" data-stop="${p.id}"><span class="stop-index">${state.editing?'⋮⋮':i+1}</span><div class="time-block"><b data-road-time="${p.id}">${p.start}</b><small data-road-leg="${p.id}">+${p.leg} Min.</small></div><button class="stop-copy" data-open="${p.id}"><b>${p.name}</b><span>${p.street}, ${p.city}</span></button><span class="priority p-${p.priority}">${p.priority}</span><span class="duration">${p.duration} Min.</span><a class="icon-link" href="${navUrl(p)}" target="_blank" aria-label="Navigation zu ${p.name}">${icons.nav}</a>${state.editing?'<button class="remove" aria-label="Besuch entfernen">×</button>':''}</article>`}
function week(){
  const dates=getWeekDates(), total=dates.reduce((s,d)=>s+dayMetrics(state.plan[d]||[],state.settings).total,0);
  const count=dates.reduce((s,d)=>s+(state.plan[d]||[]).length,0);
  const available=dates.length*(Number(state.settings.workEnd.slice(0,2))*60+Number(state.settings.workEnd.slice(3))-Number(state.settings.workStart.slice(0,2))*60-Number(state.settings.workStart.slice(3)));
  const utilization=Math.min(100,Math.round(total/Math.max(1,available)*100));
  const first=dates[0]?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short'}).format(new Date(`${dates[0]}T12:00:00`)):'–';
  const last=dates.at(-1)?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short'}).format(new Date(`${dates.at(-1)}T12:00:00`)):'–';
  const actions=`<div class="week-switch"><button id="week-prev" ${state.weekOffset===0?'disabled':''}>‹</button><span>Woche ${state.weekOffset+1}</span><button id="week-next" ${state.weekOffset>=11?'disabled':''}>›</button></div>${button('Neu ausbalancieren','optimize-week','primary',icons.spark)}`;
  return shell(`${top(`${first} – ${last}`,'Deine Woche',actions)}
    <section class="week-summary"><div><span class="eyebrow">INTELLIGENTE WOCHENPLANUNG</span><h2>${count} Besuche regional gebündelt</h2><p>${fmtMinutes(total)} inklusive Fahrt und Pausen · Fixierte Besuche bleiben unverändert</p></div><div class="coverage-ring" style="--value:${utilization}"><b>${utilization}%</b><span>Kapazität</span></div></section>
    <div class="week-guide"><span>Ziehe Apotheken zwischen Tagen</span><span>Fixiere verbindliche Termine mit dem Schloss</span></div>
    <div class="week-board">${dates.map((d,i)=>dayCard(d,i)).join('')}</div>
    <section class="card week-note"><span class="insight-icon">✓</span><div><b>${count?'Die Woche kann jederzeit neu berechnet werden.':'Diese Woche ist noch frei.'}</b><p>Manuell fixierte Apotheken und Termine werden bei der Optimierung nicht verschoben.</p></div></section>`);
}
function dayCard(date,index){
  const ids=state.plan[date]||[],m=dayCapacity(ids,state.settings),day=new Intl.DateTimeFormat('de-DE',{weekday:'short'}).format(new Date(`${date}T12:00:00`)).toUpperCase();
  const label=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'}).format(new Date(`${date}T12:00:00`));
  return `<article class="day-card ${date===state.selectedDate?'selected':''}" data-date="${date}" data-day-drop="${date}"><div class="day-title"><button data-open-day="${date}"><span>${day}</span><b>${label}</b></button><span class="${m.overtime?'load high':'load'}">${m.overtime?`${m.overtime} Min. zu lang`:ids.length?`${m.utilization}% belegt`:'Frei'}</span></div><div class="day-route">${m.stops.map(p=>`<div class="week-visit-row ${state.fixed[p.id]?'fixed':''}" draggable="${!state.fixed[p.id]}" data-week-visit="${p.id}"><i class="p-${p.priority}">${p.priority}</i><button data-open="${p.id}"><b>${p.name}</b><small>${p.start} · ${p.duration} Min.</small></button><button class="move-visit" data-move="${p.id}" aria-label="${p.name} verschieben">↔</button><button class="lock-visit" data-lock="${p.id}" data-lock-date="${date}" aria-label="${state.fixed[p.id]?'Fixierung lösen':'Besuch fixieren'}">${state.fixed[p.id]?'●':'○'}</button></div>`).join('')||'<div class="day-empty">Hierher ziehen</div>'}</div><div class="day-foot"><span>${ids.length} Besuche · ${m.distance} km</span><span>Ende ${m.end}</span></div></article>`;
}
function cycle(){
  const c=cycleCoverage(state.plan), integrity=planIntegrity(state.plan), remaining=pharmacies.filter(p=>!Object.values(state.plan).flat().includes(p.id)), allDates=getAllDates();
  const weeks=Array.from({length:12},(_,i)=>{const dates=allDates.slice(i*5,i*5+5),count=dates.reduce((s,d)=>s+(state.plan[d]||[]).length,0);return {index:i+1,count,capacity:dates.length*6}});
  return shell(`${top(`${new Intl.DateTimeFormat('de-DE').format(new Date(state.settings.cycleStart))} – ${new Intl.DateTimeFormat('de-DE').format(new Date(state.settings.cycleEnd))}`,'Verkaufsrunde',button('Gesamtrunde optimieren','plan-cycle','primary',icons.spark))}
    <section class="cycle-hero"><div class="big-progress"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43"/><circle class="value" cx="50" cy="50" r="43" style="--progress:${c.percent}"/></svg><span><b>${c.percent}%</b><small>eingeplant</small></span></div><div><span class="eyebrow">12 WOCHEN · ${allDates.length} ARBEITSTAGE</span><h2>${c.planned} von ${c.total} Apotheken</h2><p>${integrity.duplicates?`${integrity.duplicates} Dubletten müssen geprüft werden`:'Jede eingeplante Apotheke kommt genau einmal vor.'}</p></div><div class="priority-stats">${['A','B','C','D','E'].map(k=>`<span><i class="p-${k}">${k}</i><b>${c.counts[k]}</b><small>geplant</small></span>`).join('')}</div></section>
    <section class="cycle-health"><span class="${integrity.duplicates?'bad':'good'}">${integrity.duplicates?'!':'✓'} ${integrity.duplicates} Dubletten</span><span class="${remaining.length?'pending':'good'}">${remaining.length} noch offen</span><span>${allDates.length*6} mögliche Besuchsslots</span></section>
    <div class="cycle-grid"><section class="card"><div class="section-head"><div><span class="eyebrow">12-WOCHEN-PLAN</span><h3>Abdeckung und Kapazität</h3></div></div>${weeks.map(w=>`<button class="cycle-week" data-cycle-week="${w.index-1}"><b>W${w.index}</b><span><i style="width:${Math.min(100,Math.round(w.count/Math.max(1,w.capacity)*100))}%"></i></span><small>${w.count} / ${w.capacity}</small></button>`).join('')}</section><section class="card"><div class="section-head"><div><span class="eyebrow">NOCH OFFEN</span><h3>${remaining.length} Apotheken</h3></div></div>${remaining.slice(0,9).map(p=>`<button class="open-row" data-open="${p.id}"><i class="p-${p.priority}">${p.priority}</i><span><b>${p.name}</b><small>${p.city}</small></span>${icons.chevron}</button>`).join('')||empty('Runde vollständig','Alle Apotheken sind genau einmal eingeplant.')}</section></div>`);
}
function stores(){
  const list=pharmacies.filter(p=>`${p.name} ${p.city} ${p.priority}`.toLowerCase().includes(state.query.toLowerCase())&&(state.storePriority==='all'||p.priority===state.storePriority));
  return shell(`${top('GEBIET RHEIN-MAIN',`${pharmacies.length} Apotheken`)}<section class="store-toolbar"><label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="search" value="${state.query}" placeholder="Name, Ort oder Priorität suchen"></label><div class="filter-chips">${['all','A','B','C','D','E'].map(x=>`<button data-store-priority="${x}" class="${state.storePriority===x?'active':''}">${x==='all'?`Alle · ${pharmacies.length}`:x}</button>`).join('')}</div></section>
    <section class="store-list"><div class="store-list-head"><span>Apotheke</span><span>Priorität</span><span>Letzter Besuch</span><span>Besuchsdauer</span><span></span></div>${list.slice(0,120).map(p=>`<article><button class="store-name" data-open="${p.id}"><span class="store-symbol">${icons.stores}</span><span><b>${p.name}</b><small>${p.street}, ${p.zip} ${p.city}</small></span></button><span class="priority p-${p.priority}">${p.priority}</span><span class="last-visit">${new Intl.DateTimeFormat('de-DE').format(new Date(p.lastVisit))}</span><label class="duration-select"><select data-duration="${p.id}">${[30,45,60,75].map(n=>`<option ${p.duration==n?'selected':''}>${n}</option>`).join('')}</select><span>Min.</span></label><a class="icon-link" href="${navUrl(p)}" target="_blank" aria-label="Navigation zu ${p.name}">${icons.nav}</a></article>`).join('')}</section>`);
}
function settings(){
  const s=state.settings;
  return shell(`${top('PERSÖNLICHES PROFIL','So planst du deinen Tag')}<div class="settings-layout"><section class="card settings-card"><div class="settings-title"><span class="setting-icon">${icons.today}</span><div><h3>Arbeitstag</h3><p>Deine verfügbare Zeit bestimmt die tägliche Kapazität.</p></div></div>${field('Startpunkt','home','text',s.home)}<div class="field-pair">${field('Arbeitsbeginn','workStart','time',s.workStart)}${field('Arbeitsende','workEnd','time',s.workEnd)}</div>${field('Pause in Minuten','breakMinutes','number',s.breakMinutes)}<div class="workday-setting"><span>Arbeitstage</span><div>${[['Mo',1],['Di',2],['Mi',3],['Do',4],['Fr',5]].map(([label,value])=>`<label><input type="checkbox" data-workday="${value}" ${s.workdays.includes(value)?'checked':''}><i>${label}</i></label>`).join('')}</div></div></section>
  <section class="card settings-card"><div class="settings-title"><span class="setting-icon">${icons.stores}</span><div><h3>Besuche</h3><p>Der Standard gilt nur für neue Apotheken.</p></div></div>${field('Standard-Besuchsdauer','defaultDuration','number',s.defaultDuration)}<div class="setting-info">Individuelle Besuchszeiten pflegst du direkt an der jeweiligen Apotheke.</div></section>
  <section class="card settings-card"><div class="settings-title"><span class="setting-icon">${icons.cycle}</span><div><h3>Verkaufsrunde</h3><p>Zeitraum und Arbeitstage definieren die verfügbare Kapazität.</p></div></div><div class="field-pair">${field('Startdatum','cycleStart','date',s.cycleStart)}${field('Enddatum','cycleEnd','date',s.cycleEnd)}</div><div class="setting-info">Montag bis Freitag · ${workDates(s).length} verfügbare Arbeitstage</div></section>
  <section class="card settings-card"><div class="settings-title"><span class="setting-icon">${icons.route}</span><div><h3>Übernachtungen</h3><p>Empfehlung auf Basis deiner Opportunitätskosten.</p></div></div><label class="switch-row"><span>Übernachtungen berücksichtigen</span><input id="overnight" type="checkbox" ${s.overnight?'checked':''}><i></i></label><div class="field-pair">${field('Hotelkosten maximal','hotelLimit','number',s.hotelLimit,'€')}${field('Wert einer Stunde','hourlyValue','number',s.hourlyValue,'€')}</div>${field('Kilometerkosten','kmCost','number',s.kmCost,'€',.01)}</section></div>`);
}
function field(label,key,type,value,suffix='',step=1){return `<label class="field"><span>${label}</span><div><input data-setting="${key}" type="${type}" value="${value}" step="${step}">${suffix?`<i>${suffix}</i>`:''}</div></label>`}
function empty(title,copy){return `<div class="empty"><span>${icons.route}</span><b>${title}</b><p>${copy}</p></div>`}
function drawer(){
  if(!state.drawer)return '';
  const p=byId(state.drawer);
  const date=Object.entries(state.plan).find(([,ids])=>ids.includes(p.id))?.[0], ids=date?state.plan[date]:[];
  return `<div class="scrim" data-close><aside class="drawer"><button class="drawer-close" data-close>×</button><span class="store-symbol large">${icons.stores}</span><span class="priority p-${p.priority}">Priorität ${p.priority}</span><h2>${p.name}</h2><p>${p.street}<br>${p.zip} ${p.city}</p><div class="detail-grid"><span><small>Besuchsdauer</small><b>${p.duration} Min.</b></span><span><small>Letzter Besuch</small><b>${new Intl.DateTimeFormat('de-DE').format(new Date(p.lastVisit))}</b></span></div><div class="recommendation-why"><span class="eyebrow">WARUM EMPFOHLEN?</span><p>${visitReason(p,ids,state.settings)}</p></div><a class="button primary full" href="${navUrl(p)}" target="_blank">${icons.nav} Navigation starten</a></aside></div>`;
}
function picker(){
  if(!state.picker)return '';
  const current=state.plan[state.selectedDate]||[], base=dayMetrics(current,state.settings), plannedDates={};
  Object.entries(state.plan).forEach(([date,ids])=>ids.forEach(id=>plannedDates[id]=date));
  const matches=pharmacies.filter(p=>`${p.name} ${p.city} ${p.zip} ${p.street}`.toLowerCase().includes(state.pickerQuery.toLowerCase())&&(state.pickerPriority==='all'||p.priority===state.pickerPriority));
  return `<div class="picker-scrim"><section class="picker-sheet"><header class="picker-head"><div><span class="eyebrow">TAGESPLAN ERGÄNZEN</span><h2>Apotheke auswählen</h2><p>Du siehst sofort, wie sich deine Auswahl auf den Tag auswirkt.</p></div><button id="picker-close" aria-label="Auswahl schließen">×</button></header>
    <div class="picker-tools"><label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="picker-search" value="${state.pickerQuery}" placeholder="Apotheke, Ort oder PLZ"></label><div class="filter-chips">${['all','A','B','C','D','E'].map(x=>`<button data-picker-priority="${x}" class="${state.pickerPriority===x?'active':''}">${x==='all'?'Alle':`Priorität ${x}`}</button>`).join('')}</div></div>
    <div class="picker-list">${matches.slice(0,80).map(p=>{
      const isCurrent=current.includes(p.id), existing=plannedDates[p.id], next=dayMetrics([...current,p.id],state.settings);
      const extraKm=Math.max(0,next.distance-base.distance), extraMin=Math.max(0,next.total-base.total);
      return `<article class="${isCurrent?'disabled':''}"><span class="store-symbol">${icons.stores}</span><button class="picker-copy" data-open="${p.id}"><span><b>${p.name}</b><small>${p.street}, ${p.zip} ${p.city}</small></span><i class="priority p-${p.priority}">${p.priority}</i></button><div class="impact"><span>+${extraMin} Min.</span><small>+${extraKm} km</small></div><div class="visit-meta"><span>${p.duration} Min. Besuch</span><small>Zuletzt ${new Intl.DateTimeFormat('de-DE').format(new Date(p.lastVisit))}</small></div>${isCurrent?'<span class="planned-badge">Im Tagesplan</span>':`<button class="picker-add" data-pick="${p.id}">${existing?'Verschieben':'Hinzufügen'}</button>`}</article>`;
    }).join('')||empty('Keine Apotheke gefunden','Passe Suche oder Filter an.')}</div>
    <footer><span>${matches.length} Treffer${matches.length>80?' · die ersten 80 werden angezeigt':''}</span><button id="picker-done" class="button primary">Fertig</button></footer></section></div>`;
}
function moveSheet(){
  if(!state.moveVisit)return '';
  const p=byId(state.moveVisit), dates=getWeekDates();
  return `<div class="move-scrim"><section class="move-sheet"><header><div><span class="eyebrow">BESUCH VERSCHIEBEN</span><h2>${p.name}</h2><p>Wähle den gewünschten Tag. Die Route wird anschließend neu sortiert.</p></div><button id="move-close">×</button></header><div class="move-days">${dates.map(date=>{const m=dayMetrics(state.plan[date]||[],state.settings),label=new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'}).format(new Date(`${date}T12:00:00`));return `<button data-move-to="${date}"><span><b>${label}</b><small>${(state.plan[date]||[]).length} Besuche · Ende ${m.end}</small></span><i>${state.fixed[p.id]===date?'Fixiert':'Auswählen'}</i></button>`}).join('')}</div></section></div>`;
}
function releaseSheet(){
  const r=state.releaseInfo;
  if(!r||!state.showRelease)return '';
  return `<div class="release-scrim"><section class="release-sheet" role="dialog" aria-modal="true" aria-labelledby="release-title"><span class="release-badge">NEU · VERSION ${r.version}</span><h2 id="release-title">${r.title}</h2><p>Der Routenplaner wurde verbessert.</p><ul>${r.changes.map(change=>`<li>${change}</li>`).join('')}</ul><div class="release-actions"><button id="release-later" class="button ghost">Später</button><button id="release-update" class="button primary">Jetzt aktualisieren</button></div></section></div>`;
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
    document.querySelector('#show-insight').onclick=()=>{
      const over=overnightRecommendation(dayMetrics(state.plan[state.selectedDate]||[],state.settings),state.settings);
      flash(`${over.savedMinutes} Min. · ${over.savedKm} km · ${over.timeValue+over.mileageValue} € Vorteil · ${state.settings.hotelLimit} € Hotelbudget`);
    };
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
    const dates=getWeekDates();
    document.querySelector('#week-prev').onclick=()=>{state.weekOffset=Math.max(0,state.weekOffset-1);save();render()};
    document.querySelector('#week-next').onclick=()=>{state.weekOffset=Math.min(11,state.weekOffset+1);save();render()};
    document.querySelector('#optimize-week').onclick=()=>{dates.forEach(date=>state.plan[date]=state.plan[date]||[]);state.plan=rebalanceWeek(state.plan,dates,state.fixed,state.settings);dates.forEach(date=>state.baseline[date]=clone(state.plan[date]));save();render();flash('Woche neu ausbalanciert')};
    document.querySelectorAll('[data-open-day]').forEach(el=>el.onclick=()=>{state.selectedDate=el.dataset.openDay;state.view='today';save();render()});
    document.querySelectorAll('[data-week-visit]').forEach(el=>{el.ondragstart=e=>{e.dataTransfer.setData('text/plain',el.dataset.weekVisit);el.classList.add('dragging')};el.ondragend=()=>el.classList.remove('dragging')});
    document.querySelectorAll('[data-day-drop]').forEach(el=>{
      el.ondragover=e=>{e.preventDefault();el.classList.add('drop-target')};
      el.ondragleave=()=>el.classList.remove('drop-target');
      el.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain'),date=el.dataset.dayDrop;if(!id||state.fixed[id])return;Object.keys(state.plan).forEach(key=>state.plan[key]=state.plan[key].filter(x=>x!==id));state.plan[date]=state.plan[date]||[];state.plan[date].push(id);state.plan[date]=optimize(state.plan[date],state.settings);save();render();flash('Apotheke verschoben und Tag neu sortiert')};
    });
    document.querySelectorAll('[data-lock]').forEach(el=>el.onclick=()=>{const id=el.dataset.lock;if(state.fixed[id])delete state.fixed[id];else state.fixed[id]=el.dataset.lockDate;save();render();flash(state.fixed[id]?'Besuch fixiert':'Fixierung gelöst')});
    document.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>{state.moveVisit=el.dataset.move;render()});
  }
  if(state.view==='cycle'){
    document.querySelector('#plan-cycle').onclick=()=>{state.plan=optimizeCycle(state.settings,state.fixed);state.baseline=clone(state.plan);state.weekOffset=0;save();render();flash('275 Apotheken auf zwölf Wochen verteilt')};
    document.querySelectorAll('[data-cycle-week]').forEach(el=>el.onclick=()=>{state.weekOffset=Number(el.dataset.cycleWeek);state.view='week';save();render()});
  }
  if(state.view==='stores'){
    document.querySelector('#search').oninput=e=>{state.query=e.target.value;save();render();requestAnimationFrame(()=>{const input=document.querySelector('#search');input.focus();input.setSelectionRange(input.value.length,input.value.length)})};
    document.querySelectorAll('[data-duration]').forEach(el=>el.onchange=()=>{byId(el.dataset.duration).duration=Number(el.value);save();flash('Besuchsdauer aktualisiert')});
    document.querySelectorAll('[data-store-priority]').forEach(el=>el.onclick=()=>{state.storePriority=el.dataset.storePriority;save();render()});
  }
  if(state.view==='settings'){
    document.querySelectorAll('[data-setting]').forEach(el=>el.onchange=()=>{state.settings[el.dataset.setting]=el.type==='number'?Number(el.value):el.value;save();flash('Einstellung gespeichert')});
    document.querySelector('#overnight').onchange=e=>{state.settings.overnight=e.target.checked;save();flash('Übernachtungslogik aktualisiert')};
    document.querySelectorAll('[data-workday]').forEach(el=>el.onchange=()=>{
      const day=Number(el.dataset.workday);
      state.settings.workdays=el.checked?[...new Set([...state.settings.workdays,day])].sort():state.settings.workdays.filter(value=>value!==day);
      if(!state.settings.workdays.length){state.settings.workdays=[day];el.checked=true;flash('Mindestens ein Arbeitstag ist erforderlich');return}
      save();render();flash('Arbeitstage aktualisiert');
    });
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
  if(state.moveVisit){
    document.querySelector('#move-close').onclick=()=>{state.moveVisit=null;render()};
    document.querySelectorAll('[data-move-to]').forEach(el=>el.onclick=()=>{const id=state.moveVisit,date=el.dataset.moveTo;Object.keys(state.plan).forEach(key=>state.plan[key]=state.plan[key].filter(x=>x!==id));state.plan[date]=state.plan[date]||[];state.plan[date].push(id);state.plan[date]=optimize(state.plan[date],state.settings);if(state.fixed[id])state.fixed[id]=date;state.moveVisit=null;save();render();flash('Besuch auf neuen Tag verschoben')});
  }
  if(state.showRelease&&state.releaseInfo){
    document.querySelector('#release-later').onclick=()=>{state.showRelease=false;render()};
    document.querySelector('#release-update').onclick=async()=>{
      localStorage.setItem('routeplanner-seen-version',state.releaseInfo.version);
      const registration=await navigator.serviceWorker?.getRegistration();
      await registration?.update();
      if(registration?.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
      const url=new URL(location.href);url.searchParams.set('v',state.releaseInfo.version);location.replace(url);
    };
  }
}
render();
async function checkRelease(){
  try{
    const response=await fetch(`./version.json?t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)return;
    const release=await response.json(), seen=localStorage.getItem('routeplanner-seen-version');
    state.releaseInfo=release;
    state.showRelease=seen!==release.version;
    if(state.showRelease)render();
  }catch{}
}
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());
  navigator.serviceWorker.register('./sw.js').then(registration=>{
    registration.update();
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;
      worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)checkRelease()});
    });
  });
}
checkRelease();
