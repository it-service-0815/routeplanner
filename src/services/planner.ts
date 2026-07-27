import type {Pharmacy,PlannedVisit} from '../types';
export function impactForMove(fromWeek:number,toWeek:number, fixed:boolean){if(fixed||Math.abs(fromWeek-toWeek)>2)return {level:'rot',text:'Mehrere Wochen oder ein fixierter Termin sind betroffen.'}; if(fromWeek!==toWeek)return {level:'gelb',text:'Eine weitere Woche und deren Kapazität sind betroffen.'}; return {level:'grün',text:'Nur die Reihenfolge innerhalb des Tages ändert sich.'}}
export function dailyMinutes(v:PlannedVisit[],ps:Pharmacy[]){return v.reduce((s,x)=>s+(ps.find(p=>p.id===x.pharmacyId)?.duration??30),0)}
