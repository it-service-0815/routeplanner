import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pharmacies, initialPlan, defaultSettings, dayMetrics,
  optimize, cycleCoverage, overnightRecommendation,
  visitReason, dayCapacity, workDates, optimizeCycle, rebalanceWeek, swapVisits, planIntegrity
  ,greetingForHour
} from '../dist/core.js';
import {routeByRoad} from '../dist/routing.js';

test('synthetic master data is complete and unique', () => {
  assert.equal(pharmacies.length, 275);
  assert.equal(new Set(pharmacies.map(p => p.id)).size, 275);
  assert.deepEqual(new Set(pharmacies.map(p => p.priority)),new Set(['A','B','C','D','E']));
  pharmacies.forEach(p => assert.ok(p.name && p.city && p.duration && p.priority));
});

test('greeting follows the local time of day', () => {
  assert.equal(greetingForHour(7),'Guten Morgen');
  assert.equal(greetingForHour(11),'Guten Tag');
  assert.equal(greetingForHour(17),'Guten Tag');
  assert.equal(greetingForHour(18),'Guten Abend');
});

test('daily plan derives a valid schedule from visit and travel times', () => {
  const metrics = dayMetrics(initialPlan['2026-08-03'], defaultSettings);
  assert.equal(metrics.stops.length, 4);
  assert.ok(metrics.distance > 0);
  assert.ok(metrics.drive > 0);
  assert.equal(metrics.visit, 150);
  assert.match(metrics.end, /^\d{2}:\d{2}$/);
});

test('optimizer preserves every pharmacy exactly once', () => {
  const input = initialPlan['2026-08-03'];
  const result = optimize(input, defaultSettings);
  assert.equal(result.length, input.length);
  assert.deepEqual([...result].sort(), [...input].sort());
});

test('personal appointment buffer is included between visits', () => {
  const ids=initialPlan['2026-08-03'];
  const without=dayMetrics(ids,{...defaultSettings,appointmentBuffer:0});
  const withBuffer=dayMetrics(ids,{...defaultSettings,appointmentBuffer:10});
  assert.equal(withBuffer.buffers,30);
  assert.equal(withBuffer.total-without.total,30);
});

test('optimization goals remain deterministic and preserve the route', () => {
  const input=initialPlan['2026-08-03'];
  for(const optimizationGoal of ['balanced','drive','coverage','priority']){
    const result=optimize(input,{...defaultSettings,optimizationGoal});
    assert.deepEqual([...result].sort(),[...input].sort());
  }
});

test('coverage and overnight recommendation are calculated', () => {
  const coverage = cycleCoverage(initialPlan);
  assert.equal(coverage.planned, 20);
  assert.equal(coverage.percent, 7);
  const recommendation = overnightRecommendation(
    dayMetrics(initialPlan['2026-08-03'], defaultSettings),
    defaultSettings
  );
  assert.equal(typeof recommendation.benefit, 'number');
  assert.equal(recommendation.benefit,recommendation.mileageValue+recommendation.timeValue);
  assert.equal(recommendation.netBenefit,recommendation.benefit-defaultSettings.hotelLimit);
  assert.equal(typeof recommendation.recommended, 'boolean');
  assert.ok(recommendation.reason.length>20);
});

test('overnight recommendation respects personal minimum savings', () => {
  const metrics=dayMetrics(initialPlan['2026-08-03'],defaultSettings);
  const recommendation=overnightRecommendation(metrics,{
    ...defaultSettings,hotelLimit:0,minOvernightSavingsMinutes:999,minOvernightSavingsKm:999
  });
  assert.equal(recommendation.recommended,false);
  assert.match(recommendation.reason,/Mindestschwelle/);
});

test('recommendations explain priority, recency and day capacity', () => {
  const ids=initialPlan['2026-08-03'], pharmacy=pharmacies.find(p=>p.id===ids[0]);
  const reason=visitReason(pharmacy,ids,defaultSettings);
  const capacity=dayCapacity(ids,defaultSettings);
  assert.match(reason,/Umsatzpriorität/);
  assert.match(reason,/letzten Besuch/);
  assert.ok(capacity.available>0);
  assert.equal(capacity.remaining,capacity.available-capacity.total);
  assert.ok(capacity.utilization>0);
});

test('sales cycle plans every pharmacy exactly once across 12 weeks', () => {
  const dates=workDates(defaultSettings);
  assert.equal(dates.length,60);
  const plan=optimizeCycle(defaultSettings);
  const integrity=planIntegrity(plan);
  assert.deepEqual(integrity,{visits:275,unique:275,duplicates:0,unknown:0,missing:0});
  assert.ok(dates.every(date=>dayCapacity(plan[date],defaultSettings).overtime===0));
  assert.ok(Math.max(...dates.map(date=>dayCapacity(plan[date],defaultSettings).utilization))<100);
});

test('vacation periods are excluded from available workdays', () => {
  const settings={...defaultSettings,vacations:[{start:'2026-08-10',end:'2026-08-14'}]};
  const dates=workDates(settings);
  assert.equal(dates.length,55);
  assert.ok(!dates.includes('2026-08-10'));
  assert.ok(!dates.includes('2026-08-14'));
});

test('week rebalancing preserves fixed appointments', () => {
  const plan=optimizeCycle(defaultSettings), dates=workDates(defaultSettings).slice(0,5);
  const id=plan[dates[2]][0], fixed={[id]:dates[2]};
  const next=rebalanceWeek(plan,dates,fixed,defaultSettings);
  assert.ok(next[dates[2]].includes(id));
  assert.equal(planIntegrity(next).duplicates,0);
});

test('weekly swap exchanges two visits without losing cycle integrity', () => {
  const plan=optimizeCycle(defaultSettings), dates=workDates(defaultSettings);
  const first=plan[dates[0]][0], second=plan[dates[1]][0];
  const next=swapVisits(plan,first,second,defaultSettings);
  assert.ok(next[dates[0]].includes(second));
  assert.ok(next[dates[1]].includes(first));
  assert.deepEqual(planIntegrity(next),{visits:275,unique:275,duplicates:0,unknown:0,missing:0});
});

test('road routing normalizes OSRM distance, duration, legs and geometry', async () => {
  globalThis.localStorage={
    values:{},
    getItem(key){return this.values[key]||null},
    setItem(key,value){this.values[key]=value}
  };
  globalThis.fetch=async () => ({
    ok:true,
    async json(){return {routes:[{
      distance:42750,duration:4380,
      geometry:{coordinates:[[8.8,50.195],[8.738,50.179],[8.8,50.195]]},
      legs:[{distance:18000,duration:1800},{distance:24750,duration:2580}]
    }]}}
  });
  const route=await routeByRoad(['a01'],defaultSettings,{fresh:true});
  assert.equal(route.distance,43);
  assert.equal(route.drive,73);
  assert.deepEqual(route.geometry[0],[50.195,8.8]);
  assert.equal(route.legs.length,2);
});
