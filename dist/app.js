const pharmacies=[
 {priority:'A',name:'Apotheke A · Demo',city:'Bad Vilbel',region:'Rhein-Main Ost',duration:45,address:'Bad Vilbel'},
 {priority:'B',name:'Apotheke B · Demo',city:'Frankfurt',region:'Rhein-Main Ost',duration:30,address:'Frankfurt'},
 {priority:'C',name:'Apotheke C · Demo',city:'Hanau',region:'Rhein-Main Ost',duration:30,address:'Hanau'},
 {priority:'A',name:'Apotheke D · Demo',city:'Offenbach',region:'Rhein-Main Süd',duration:30,address:'Offenbach'},
 {priority:'B',name:'Apotheke E · Demo',city:'Darmstadt',region:'Rhein-Main Süd',duration:45,address:'Darmstadt'},
 {priority:'C',name:'Apotheke F · Demo',city:'Mainz',region:'Rhein-Main West',duration:30,address:'Mainz'},
 {priority:'A',name:'Apotheke G · Demo',city:'Wiesbaden',region:'Rhein-Main West',duration:30,address:'Wiesbaden'},
 {priority:'B',name:'Apotheke H · Demo',city:'Gelnhausen',region:'Rhein-Main Ost',duration:30,address:'Gelnhausen'}
];
const title={today:'Deine Tour. Auf den Punkt.',round:'Verkaufsrunde',pharmacies:'Apotheken',settings:'Planungsregeln'};
document.querySelectorAll('nav button').forEach(button=>button.onclick=()=>{document.querySelectorAll('nav button,.view').forEach(el=>el.classList.remove('active'));button.classList.add('active');document.getElementById(button.dataset.view).classList.add('active');document.getElementById('title').textContent=title[button.dataset.view]});
const stops=document.querySelector('.stops');
const defaultDuration=()=>Number(localStorage.getItem('rp-default-duration')||30);
function navIcon(address){return `<a class="nav-icon" title="Navigation starten" aria-label="Navigation starten" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}">⌖</a>`}
function makeStop(pharmacy,index){const item=document.createElement('div');item.className='stop';item.draggable=true;item.dataset.pharmacy=pharmacy.name;item.innerHTML=`<b>${index}</b><div><strong>${pharmacy.name}</strong><small>${pharmacy.city} · ${pharmacy.duration||defaultDuration()} Min.</small></div>${navIcon(pharmacy.address)}`;return item}
function refreshStops(){const items=[...document.querySelectorAll('.stops .stop')];items.forEach((item,i)=>{item.querySelector('b').textContent=i+1;item.addEventListener('dragstart',()=>{item.classList.add('dragging')});item.addEventListener('dragend',()=>{item.classList.remove('dragging');saveStops()});item.addEventListener('dragover',event=>{event.preventDefault();const dragging=document.querySelector('.dragging');if(dragging&&dragging!==item){const box=item.getBoundingClientRect();item.parentNode.insertBefore(dragging,event.clientY>box.top+box.height/2?item.nextSibling:item)}})});}
function saveStops(){localStorage.setItem('rp-day-stops',JSON.stringify([...document.querySelectorAll('.stops .stop strong')].map(x=>x.textContent)))}
const add=document.createElement('button');add.className='add-stop';add.textContent='＋ Apotheke hinzufügen';add.onclick=()=>{const available=pharmacies.find(p=>![...document.querySelectorAll('.stops .stop strong')].some(x=>x.textContent===p.name));if(!available){add.textContent='Alle Apotheken eingeplant';return}stops.insertBefore(makeStop(available,document.querySelectorAll('.stops .stop').length+1),document.querySelector('.time.end'));refreshStops()};stops.insertBefore(add,stops.querySelector('h3'));
refreshStops();
const list=document.getElementById('pharmacy-list');
function render(query=''){list.innerHTML=pharmacies.filter(p=>`${p.name} ${p.city} ${p.region}`.toLowerCase().includes(query.toLowerCase())).map(p=>`<article><b class="priority">${p.priority}</b><div><strong>${p.name}</strong><small>Musterstraße · ${p.city}</small></div><span>${p.region}</span><b>${p.duration} Min.</b>${navIcon(p.address)}</article>`).join('')}
render();document.getElementById('search').oninput=event=>render(event.target.value);
document.getElementById('optimise').onclick=()=>{document.getElementById('optimised').hidden=false;document.getElementById('optimise').textContent='✓ Runde aktualisiert';document.querySelector('.kpis article:nth-child(2) p').textContent='− 48 Min. durch Clusteroptimierung'};
['homebase','capacity','overnight'].forEach(id=>{const el=document.getElementById(id),saved=localStorage.getItem(`rp-${id}`);if(saved!==null){if(el.type==='checkbox')el.checked=saved==='true';else el.value=saved}el.onchange=()=>{localStorage.setItem(`rp-${id}`,el.type==='checkbox'?el.checked:el.value);if(id==='capacity')document.querySelector('.hero h2').textContent=`${el.value.split(' ')[0]} Besuche. Ein starker Tag.`}});
const durationSelect=document.getElementById('duration');const durationSaved=localStorage.getItem('rp-default-duration');if(durationSaved)durationSelect.value=`${durationSaved} Minuten`;durationSelect.onchange=()=>{const value=Number(durationSelect.value);localStorage.setItem('rp-default-duration',value);document.querySelectorAll('.stops .stop small').forEach((el,i)=>{if(!pharmacies[i])el.textContent=el.textContent.replace(/\d+ Min\./,`${value} Min.`)})};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
