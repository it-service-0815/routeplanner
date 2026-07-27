import {byId} from './core.js';

const memory = new Map();
const endpoint = 'https://router.project-osrm.org/route/v1/driving/';

export async function routeByRoad(ids, settings, {fresh=false}={}){
  const points=[
    {lat:settings.homeLat,lng:settings.homeLng,name:'Startpunkt'},
    ...ids.map(byId),
    {lat:settings.homeLat,lng:settings.homeLng,name:'Startpunkt'}
  ];
  const key=points.map(p=>`${p.lng.toFixed(4)},${p.lat.toFixed(4)}`).join(';');
  if(!fresh&&memory.has(key))return memory.get(key);
  const stored=JSON.parse(localStorage.getItem('routeplanner-road-cache')||'{}');
  if(!fresh&&stored[key]){memory.set(key,stored[key]);return stored[key]}
  const url=`${endpoint}${key}?overview=full&geometries=geojson&steps=false&annotations=false`;
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)throw new Error(`Routingdienst: ${response.status}`);
    const data=await response.json(), route=data.routes?.[0];
    if(!route)throw new Error('Keine Straßenroute gefunden');
    const result={
      distance:Math.round(route.distance/1000),
      drive:Math.round(route.duration/60),
      geometry:route.geometry.coordinates.map(([lng,lat])=>[lat,lng]),
      legs:route.legs.map(leg=>({distance:Math.round(leg.distance/1000),duration:Math.round(leg.duration/60)})),
      source:'OSRM'
    };
    memory.set(key,result);
    stored[key]=result;
    const entries=Object.entries(stored).slice(-30);
    localStorage.setItem('routeplanner-road-cache',JSON.stringify(Object.fromEntries(entries)));
    return result;
  }finally{clearTimeout(timer)}
}
