const basePharmacies = [
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

const regions=[
  ['Frankfurt','60311',50.111,8.682],['Hanau','63450',50.126,8.928],['Darmstadt','64283',49.873,8.651],
  ['Wiesbaden','65183',50.083,8.240],['Offenbach','63065',50.096,8.776],['Bad Vilbel','61118',50.179,8.738],
  ['Gelnhausen','63571',50.202,9.187],['Aschaffenburg','63739',49.977,9.152],['Mainz','55116',50.000,8.271],
  ['Friedberg','61169',50.338,8.755],['Langen','63225',49.992,8.668],['Rüsselsheim','65428',49.995,8.413],
  ['Oberursel','61440',50.203,8.577],['Seligenstadt','63500',50.044,8.975],['Bad Nauheim','61231',50.365,8.740]
];
const names=['Adler','Aesculap','Alte Stadt','Bahnhof','Brunnen','Central','Engel','Garten','Goethe','Hirsch','Kronen','Löwen','Marien','Mozart','Park','Rathaus','Rosen','Schwanen','Stadt','Viktoria'];
const generated=Array.from({length:250},(_,index)=>{
  const region=regions[index%regions.length], ring=Math.floor(index/regions.length)+1;
  const angle=(index*137.508)*Math.PI/180, radius=.006+(ring%9)*.0028;
  const priority=['A','A','B','B','B','C','C','D','D','E'][index%10];
  const month=String(1+(index%6)).padStart(2,'0'), day=String(2+(index%25)).padStart(2,'0');
  return {
    id:`rx-${String(index+1).padStart(3,'0')}`,
    name:`${names[index%names.length]}-Apotheke ${ring}`,
    city:region[0],zip:region[1],street:`${['Hauptstraße','Bahnhofstraße','Gartenweg','Marktplatz','Rathausgasse'][index%5]} ${3+(index*7)%96}`,
    priority,duration:priority==='A'?45:index%8===0?45:30,
    lat:region[2]+Math.cos(angle)*radius,lng:region[3]+Math.sin(angle)*radius,
    lastVisit:`2026-${month}-${day}`
  };
});
export const pharmacies=[...basePharmacies,...generated];

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
export const greetingForHour = hour => hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';
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
      const priority={A:0,B:12,C:24,D:36,E:48};
      return kmBetween(current,a)+priority[a.priority]-(kmBetween(current,b)+priority[b.priority]);
    });
    const next=remaining.shift(); result.push(next.id); current=next;
  }
  return result;
}
export function cycleCoverage(plan){
  const planned=new Set(Object.values(plan).flat());
  const counts={A:0,B:0,C:0,D:0,E:0}; pharmacies.filter(p=>planned.has(p.id)).forEach(p=>counts[p.priority]++);
  return {planned:planned.size,total:pharmacies.length,percent:Math.round(planned.size/pharmacies.length*100),counts};
}
export function overnightRecommendation(metrics, settings=defaultSettings){
  const savedKm=Math.max(0,Math.round(metrics.distance*.42)), savedMinutes=Math.max(0,metrics.homeDrive-12);
  const mileageValue=Math.round(savedKm*settings.kmCost);
  const timeValue=Math.round(savedMinutes/60*settings.hourlyValue);
  const benefit=mileageValue+timeValue;
  const netBenefit=benefit-settings.hotelLimit;
  return {
    savedKm,savedMinutes,mileageValue,timeValue,benefit,netBenefit,
    recommended:settings.overnight&&netBenefit>0,
    reason:!settings.overnight
      ?'Übernachtungen sind in deinen Einstellungen deaktiviert.'
      :netBenefit>0
        ?`${benefit} € Zeit- und Fahrtkostenvorteil übersteigen dein Hotelbudget um ${netBenefit} €.`
        :`${benefit} € Zeit- und Fahrtkostenvorteil liegen ${Math.abs(netBenefit)} € unter deinem Hotelbudget.`
  };
}

export function visitReason(pharmacy, ids=[], settings=defaultSettings){
  const daysSince=Math.max(0,Math.round((new Date(`${settings.cycleStart}T12:00:00`)-new Date(`${pharmacy.lastVisit}T12:00:00`))/86400000));
  const sameRegion=ids.map(byId).filter(Boolean).filter(p=>p.city===pharmacy.city).length;
  const importance={A:'höchste Umsatzpriorität',B:'hohe Umsatzpriorität',C:'reguläre Abdeckung',D:'ergänzende Abdeckung',E:'Basisabdeckung'}[pharmacy.priority];
  const signals=[importance,`${daysSince} Tage seit dem letzten Besuch`];
  if(sameRegion>1)signals.push(`mit ${sameRegion-1} weiteren Besuchen in ${pharmacy.city} gebündelt`);
  return signals.join(' · ');
}

export function dayCapacity(ids,settings=defaultSettings){
  const metrics=dayMetrics(ids,settings);
  const available=Math.max(1,minutes(settings.workEnd)-minutes(settings.workStart));
  return {...metrics,available,utilization:Math.round(metrics.total/available*100),remaining:available-metrics.total};
}

export function workDates(settings=defaultSettings){
  const dates=[], cursor=new Date(`${settings.cycleStart}T12:00:00`), end=new Date(`${settings.cycleEnd}T12:00:00`);
  while(cursor<=end){
    if(settings.workdays.includes(cursor.getDay()))dates.push(cursor.toISOString().slice(0,10));
    cursor.setDate(cursor.getDate()+1);
  }
  return dates;
}

export function optimizeCycle(settings=defaultSettings,fixed={}){
  const dates=workDates(settings), plan=Object.fromEntries(dates.map(date=>[date,[]]));
  const assigned=new Set();
  Object.entries(fixed).forEach(([id,date])=>{if(plan[date]&&byId(id)){plan[date].push(id);assigned.add(id)}});
  const priority={A:0,B:1,C:2,D:3,E:4};
  const queue=pharmacies.filter(p=>!assigned.has(p.id)).sort((a,b)=>priority[a.priority]-priority[b.priority]||a.lastVisit.localeCompare(b.lastVisit));
  queue.forEach(p=>{
    const date=[...dates].sort((a,b)=>{
      const lastA=byId(plan[a][plan[a].length-1]), lastB=byId(plan[b][plan[b].length-1]);
      const distA=lastA?kmBetween(lastA,p):kmBetween({lat:settings.homeLat,lng:settings.homeLng},p);
      const distB=lastB?kmBetween(lastB,p):kmBetween({lat:settings.homeLat,lng:settings.homeLng},p);
      const loadA=dayMetrics(plan[a],settings).total+Number(p.duration)+Math.round(distA/.72);
      const loadB=dayMetrics(plan[b],settings).total+Number(p.duration)+Math.round(distB/.72);
      return loadA-loadB||distA-distB;
    })[0];
    plan[date].push(p.id);
  });
  dates.forEach(date=>plan[date]=optimize(plan[date],settings));
  return plan;
}

export function rebalanceWeek(plan,dates,fixed={},settings=defaultSettings){
  const next=JSON.parse(JSON.stringify(plan)), ids=[...new Set(dates.flatMap(date=>next[date]||[]))];
  dates.forEach(date=>next[date]=[]);
  ids.filter(id=>fixed[id]&&dates.includes(fixed[id])).forEach(id=>next[fixed[id]].push(id));
  const flexible=ids.filter(id=>!fixed[id]||!dates.includes(fixed[id]));
  flexible.sort((a,b)=>({A:0,B:1,C:2,D:3,E:4}[byId(a).priority]-{A:0,B:1,C:2,D:3,E:4}[byId(b).priority]));
  flexible.forEach(id=>{
    const p=byId(id);
    const date=[...dates].sort((a,b)=>{
      const aLast=byId(next[a].at(-1)),bLast=byId(next[b].at(-1));
      const aDist=aLast?kmBetween(aLast,p):0,bDist=bLast?kmBetween(bLast,p):0;
      const loadA=dayMetrics(next[a],settings).total+Number(p.duration)+Math.round(aDist/.72);
      const loadB=dayMetrics(next[b],settings).total+Number(p.duration)+Math.round(bDist/.72);
      return loadA-loadB||aDist-bDist;
    })[0];
    next[date].push(id);
  });
  dates.forEach(date=>next[date]=optimize(next[date],settings));
  return next;
}

export function swapVisits(plan,first,second,settings=defaultSettings){
  const next=JSON.parse(JSON.stringify(plan));
  const firstDate=Object.keys(next).find(date=>(next[date]||[]).includes(first));
  const secondDate=Object.keys(next).find(date=>(next[date]||[]).includes(second));
  if(!firstDate||!secondDate||firstDate===secondDate)return next;
  next[firstDate]=optimize(next[firstDate].map(id=>id===first?second:id),settings);
  next[secondDate]=optimize(next[secondDate].map(id=>id===second?first:id),settings);
  return next;
}

export function planIntegrity(plan){
  const ids=Object.values(plan).flat(), unique=new Set(ids), known=new Set(pharmacies.map(p=>p.id));
  return {
    visits:ids.length,unique:unique.size,
    duplicates:ids.length-unique.size,
    unknown:ids.filter(id=>!known.has(id)).length,
    missing:pharmacies.length-[...unique].filter(id=>known.has(id)).length
  };
}
