export const pharmacies = [
  ['a01','Linden-Apotheke','Bad Vilbel','Frankfurter Straße 41','61118','A',45,50.179,8.738,'2026-05-18'],
  ['a02','Apotheke am Markt','Frankfurt','Marktstraße 12','60311','A',30,50.111,8.682,'2026-05-04'],
  ['a03','Mainbogen-Apotheke','Hanau','Mainbogen 8','63450','B',30,50.126,8.928,'2026-04-27'],
  ['a04','Sonnen-Apotheke','Offenbach','Sonnenweg 17','63065','B',30,50.096,8.776,'2026-05-11'],
  ['a05','Schloss-Apotheke','Darmstadt','Schlossgasse 6','64283','A',45,49.873,8.651,'2026-04-20'],
  ['a06','Rosen-Apotheke','Mainz','Rosenstraße 23','55116','C',30,50.000,8.271,'2026-05-25'],
  ['a07','Kur-Apotheke','Wiesbaden','Kurgarten 9','65183','B',30,50.083,8.240,'2026-06-01'],
  ['a08','Kinzig-Apotheke','Gelnhausen','Kinzigallee 4','63571','A',30,50.202,9.187,'2026-04-13'],
  ['a09','Taunus-Apotheke','Oberursel','Taunusstraße 29','61440','C',30,50.203,8.577,'2026-06-08'],
  ['a10','Römer-Apotheke','Frankfurt','Römerberg 7','60311','A',45,50.110,8.683,'2026-03-30'],
  ['a11','Spessart-Apotheke','Aschaffenburg','Spessartweg 15','63739','B',30,49.977,9.152,'2026-05-06'],
  ['a12','Berg-Apotheke','Dreieich','Bergstraße 31','63303','C',30,50.019,8.697,'2026-06-03'],
  ['a13','Luisen-Apotheke','Darmstadt','Luisenplatz 5','64283','A',45,49.872,8.652,'2026-04-08'],
  ['a14','City-Apotheke','Neu-Isenburg','Frankfurter Straße 88','63263','B',30,50.048,8.695,'2026-05-20'],
  ['a15','Wetterau-Apotheke','Friedberg','Kaiserstraße 52','61169','B',30,50.338,8.755,'2026-05-13'],
  ['a16','Park-Apotheke','Langen','Bahnstraße 40','63225','C',30,49.992,8.668,'2026-06-10'],
  ['a17','Mühlberg-Apotheke','Frankfurt','Mühlberg 21','60599','A',45,50.102,8.710,'2026-04-01'],
  ['a18','Kaiser-Apotheke','Wiesbaden','Kaiserstraße 14','65185','B',30,50.078,8.239,'2026-05-27'],
  ['a19','Alte Apotheke','Seligenstadt','Marktplatz 3','63500','C',30,50.044,8.975,'2026-06-15'],
  ['a20','Bieber-Apotheke','Offenbach','Bieberer Straße 95','63071','B',30,50.088,8.799,'2026-05-22'],
  ['a21','Maineck-Apotheke','Maintal','Kennedystraße 18','63477','C',30,50.151,8.837,'2026-06-17'],
  ['a22','Johannis-Apotheke','Aschaffenburg','Landingstraße 2','63739','A',45,49.975,9.144,'2026-03-25'],
  ['a23','Nidda-Apotheke','Bad Nauheim','Parkstraße 11','61231','B',30,50.365,8.740,'2026-05-29'],
  ['a24','Burg-Apotheke','Königstein','Burgweg 6','61462','C',30,50.180,8.466,'2026-06-19'],
  ['a25','Rhein-Apotheke','Rüsselsheim','Rheinstraße 24','65428','B',30,49.995,8.413,'2026-06-05']
].map(([id,name,city,street,zip,priority,duration,lat,lng,lastVisit])=>({id,name,city,street,zip,priority,duration,lat,lng,lastVisit}));

export const defaultSettings = {
  home:'Niederdorfelden, 61138', homeLat:50.195, homeLng:8.800,
  workStart:'08:30', workEnd:'17:00', breakMinutes:30, defaultDuration:30,
  kmCost:.42, hourlyValue:42, hotelLimit:120, overnight:true,
  cycleStart:'2026-08-03', cycleEnd:'2026-10-25', workdays:[1,2,3,4,5]
};

export const initialPlan = {
  '2026-08-03':['a01','a02','a17','a04'],
  '2026-08-04':['a03','a08','a21','a19'],
  '2026-08-05':['a05','a13','a12','a16'],
  '2026-08-06':['a07','a18','a06','a25'],
  '2026-08-07':['a15','a23','a09','a24']
};

export const byId = id => pharmacies.find(p=>p.id===id);
export const minutes = value => { const [h,m]=value.split(':').map(Number); return h*60+m; };
export const time = value => `${String(Math.floor(value/60)%24).padStart(2,'0')}:${String(Math.round(value%60)).padStart(2,'0')}`;
export const kmBetween = (a,b) => {
  const r=6371, rad=x=>x*Math.PI/180, dLat=rad(b.lat-a.lat), dLng=rad(b.lng-a.lng);
  const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2*r*Math.asin(Math.sqrt(q))*1.18;
};
export function dayMetrics(ids, settings=defaultSettings){
  let current={lat:settings.homeLat,lng:settings.homeLng}, clock=minutes(settings.workStart), distance=0, drive=0;
  const stops=ids.map(id=>{
    const p=byId(id), km=kmBetween(current,p), leg=Math.max(8,Math.round(km/.72));
    distance+=km; drive+=leg; clock+=leg;
    const start=time(clock); clock+=Number(p.duration); current=p;
    return {...p,start,leg,km:Math.round(km)};
  });
  const homeKm=stops.length?kmBetween(current,{lat:settings.homeLat,lng:settings.homeLng}):0;
  const homeDrive=Math.max(0,Math.round(homeKm/.72));
  distance+=homeKm; drive+=homeDrive; clock+=homeDrive+(stops.length?settings.breakMinutes:0);
  const visit=stops.reduce((s,p)=>s+Number(p.duration),0);
  return {stops,distance:Math.round(distance),drive,visit,total:drive+visit+(stops.length?settings.breakMinutes:0),end:time(clock),overtime:Math.max(0,clock-minutes(settings.workEnd)),homeDrive};
}
export function optimize(ids, settings=defaultSettings){
  const remaining=ids.map(byId), result=[]; let current={lat:settings.homeLat,lng:settings.homeLng};
  while(remaining.length){
    remaining.sort((a,b)=>{
      const priority={A:0,B:12,C:24};
      return kmBetween(current,a)+priority[a.priority]-(kmBetween(current,b)+priority[b.priority]);
    });
    const next=remaining.shift(); result.push(next.id); current=next;
  }
  return result;
}
export function cycleCoverage(plan){
  const planned=new Set(Object.values(plan).flat());
  const counts={A:0,B:0,C:0}; pharmacies.filter(p=>planned.has(p.id)).forEach(p=>counts[p.priority]++);
  return {planned:planned.size,total:pharmacies.length,percent:Math.round(planned.size/pharmacies.length*100),counts};
}
export function overnightRecommendation(metrics, settings=defaultSettings){
  const savedKm=Math.max(0,Math.round(metrics.distance*.42)), savedMinutes=Math.max(0,metrics.homeDrive-12);
  const benefit=Math.round(savedKm*settings.kmCost+savedMinutes/60*settings.hourlyValue);
  return {savedKm,savedMinutes,benefit,recommended:settings.overnight&&benefit>settings.hotelLimit};
}
