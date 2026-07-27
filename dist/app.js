import {pharmacies,defaultSettings,initialPlan,byId,dayMetrics,optimize,cycleCoverage,overnightRecommendation} from './core.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const stored=JSON.parse(localStorage.getItem('routeplanner-r3')||'null');
const state=stored||{view:'today',selectedDate:'2026-08-03',plan:clone(initialPlan),settings:clone(defaultSettings),editing:false,query:'',drawer:null};
const app=document.querySelector('#app'), toast=document.querySelector('#toast');
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
  </aside><main><div class="mobile-top"><div class="brand"><span class="brand-mark">e</span><b>Routenplaner</b></div><span class="avatar">AJ</span></div>${content}</main>
  <nav class="bottom-nav">${items.map(([id,label])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${icons[id]}<span>${label}</span></button>`).join('')}</nav>${drawer()}</div>`;
}
function top(kicker,title,actions=''){return `<header class="page-head"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1></div><div class="actions">${actions}<span class="avatar desktop">AJ</span></div></header>`}
const button=(label,id,style='secondary',icon='')=>`<button id="${id}" class="button ${style}">${icon}${label}</button>`;

function map(ids,metrics){
  const pts=metrics.stops.map((p,i)=>`${12+i*(76/Math.max(1,ids.length-1))},${58+Math.sin(i*2.2)*22}`).join(' ');
  return `<section class="map-card"><div class="map-head"><div><span class="eyebrow">LIVE-TAGESROUTE</span><h3>Rhein-Main Gebiet</h3></div><span class="traffic"><i></i> Verkehr berücksichtigt</span></div>
  <div class="map"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path class="road" d="M-5 25 C20 45 36 4 105 31M-5 78 C35 59 60 89 105 60M20 -5 C35 30 72 59 83 105"/><polyline class="route-line" points="7,72 ${pts} 7,72"/></svg>
  <span class="home-pin" style="left:7%;top:72%">${icons.today}</span>${metrics.stops.map((p,i)=>`<button class="map-pin ${i===0?'current':''}" data-open="${p.id}" style="left:${12+i*(76/Math.max(1,ids.length-1))}%;top:${58+Math.sin(i*2.2)*22}%">${i+1}</button>`).join('')}
  <div class="map-stat"><b>${metrics.distance} km</b><span>${fmtMinutes(metrics.drive)} Fahrzeit</span></div></div></section>`;
}
function today(){
  const ids=state.plan[state.selectedDate]||[], metrics=dayMetrics(ids,state.settings), over=overnightRecommendation(metrics,state.settings);
  return shell(`${top(dateLabel(state.selectedDate).toUpperCase(),'Dein optimaler Tag',`${button('Optimieren','optimize','ghost',icons.spark)}${button(state.editing?'Fertig':'Plan anpassen','edit','primary')}`)}
    <section class="hero"><div><span class="hero-label"><i></i> Plan ist realistisch</span><h2>Guten Morgen, Alex.</h2><p>${ids.length} passende Apotheken · Rückkehr um ${metrics.end} Uhr</p></div><div class="hero-score"><span>Planqualität</span><b>Sehr gut</b></div></section>
    <section class="metrics"><article><span>Besuche</span><b>${ids.length}</b><small>${metrics.visit} Min. Kundentermine</small></article><article><span>Fahrzeit</span><b>${fmtMinutes(metrics.drive)}</b><small>${metrics.distance} km Gesamtstrecke</small></article><article><span>Tagesende</span><b>${metrics.end}</b><small class="${metrics.overtime?'warning':'positive'}">${metrics.overtime?`${metrics.overtime} Min. über Arbeitszeit`:'Innerhalb deiner Arbeitszeit'}</small></article></section>
    <div class="today-grid">${map(ids,metrics)}<section class="route-card"><div class="section-head"><div><span class="eyebrow">TAGESPLAN</span><h3>Empfohlene Reihenfolge</h3></div><span class="status-pill">Optimiert</span></div>
      <div id="route-list">${metrics.stops.map((p,i)=>stop(p,i)).join('')||empty('Noch keine Besuche','Füge Apotheken hinzu oder lasse den Tag optimieren.')}</div>
      ${state.editing?`<button id="add-stop" class="add-button">${icons.plus} Apotheke hinzufügen</button>`:`<p class="help">„Plan anpassen“ öffnet die manuelle Bearbeitung.</p>`}
    </section></div>
    <section class="insight ${over.recommended?'hotel':''}"><span class="insight-icon">${over.recommended?'H':'✓'}</span><div><span class="eyebrow">SMARTE EMPFEHLUNG</span><h3>${over.recommended?'Übernachtung wirtschaftlich sinnvoll':'Heute entspannt nach Hause'}</h3><p>${over.recommended?`Du sparst etwa ${over.savedMinutes} Minuten und ${over.savedKm} km. Wirtschaftlicher Vorteil: ${over.benefit} €.`:`Die Heimfahrt dauert etwa ${metrics.homeDrive} Minuten. Eine Übernachtung erzeugt heute keinen wirtschaftlichen Vorteil.`}</p></div><button class="text-button" id="show-insight">Warum?</button></section>`);
}
function stop(p,i){return `<article class="stop" draggable="${state.editing}" data-stop="${p.id}"><span class="stop-index">${state.editing?'⋮⋮':i+1}</span><div class="time-block"><b>${p.start}</b><small>+${p.leg} Min.</small></div><button class="stop-copy" data-open="${p.id}"><b>${p.name}</b><span>${p.street}, ${p.city}</span></button><span class="priority p-${p.priority}">${p.priority}</span><span class="duration">${p.duration} Min.</span><a class="icon-link" href="${navUrl(p)}" target="_blank" aria-label="Navigation zu ${p.name}">${icons.nav}</a>${state.editing?'<button class="remove" aria-label="Besuch entfernen">×</button>':''}</article>`}
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
function render(){
  app.innerHTML=state.view==='today'?today():state.view==='week'?week():state.view==='cycle'?cycle():state.view==='stores'?stores():settings();
  bind();
}
function bind(){
  document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{state.view=el.dataset.view;state.editing=false;save();render()});
  document.querySelectorAll('[data-open]').forEach(el=>el.onclick=e=>{if(e.currentTarget.closest('.stop')?.draggable)return;state.drawer=el.dataset.open;render()});
  document.querySelectorAll('[data-close]').forEach(el=>el.onclick=e=>{if(e.target===el){state.drawer=null;render()}});
  if(state.view==='today'){
    document.querySelector('#edit').onclick=()=>{state.editing=!state.editing;render()};
    document.querySelector('#optimize').onclick=()=>{state.plan[state.selectedDate]=optimize(state.plan[state.selectedDate],state.settings);save();render();flash('Route neu optimiert')};
    document.querySelector('#show-insight').onclick=()=>flash('Berechnet aus Fahrzeit, Kilometerkosten, Stundenwert und Hotelbudget.');
    if(state.editing){
      document.querySelectorAll('[data-stop]').forEach(el=>{
        el.ondragstart=()=>el.classList.add('dragging');
        el.ondragend=()=>{el.classList.remove('dragging');state.plan[state.selectedDate]=[...document.querySelectorAll('[data-stop]')].map(x=>x.dataset.stop);save();render();flash('Reihenfolge gespeichert')};
        el.ondragover=e=>{e.preventDefault();const drag=document.querySelector('.dragging');if(drag&&drag!==el)el.parentNode.insertBefore(drag,e.clientY>el.getBoundingClientRect().top+el.offsetHeight/2?el.nextSibling:el)};
        el.querySelector('.remove').onclick=()=>{state.plan[state.selectedDate]=state.plan[state.selectedDate].filter(id=>id!==el.dataset.stop);save();render()};
      });
      document.querySelector('#add-stop').onclick=()=>{const id=pharmacies.find(p=>!state.plan[state.selectedDate].includes(p.id))?.id;if(id){state.plan[state.selectedDate].push(id);save();render();flash('Apotheke zum Tagesplan hinzugefügt')}};
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
}
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');
