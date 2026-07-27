export type VisitStatus='flexibel'|'tag-fixiert'|'termin-fixiert'|'besucht'|'nicht-besucht'|'nicht-erforderlich'; export type Priority='A'|'B'|'C';
export interface Pharmacy{id:string; name:string; street:string; postalCode:string; city:string; region:string; classification:string; priority:Priority; duration:number; preference:'keine'|'bevorzugt'|'hart'; lastVisit:string; lat:number; lng:number;}
export interface PlannedVisit{id:string; pharmacyId:string; date:string; week:number; order:number; status:VisitStatus; reason?:string;}
export interface Settings{homeBase:string; defaultVisitDuration:number; maxVisitsPerDay:number; overnightEnabled:boolean; overnightMode:'automatic'|'suggest'|'none'; hotelBudget:number; minimumSaving:number;}
