import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pharmacies, initialPlan, defaultSettings, dayMetrics,
  optimize, cycleCoverage, overnightRecommendation,
  workDates, optimizeCycle, rebalanceWeek, planIntegrity
} from '../dist/core.js';
import {routeByRoad} from '../dist/routing.js';

test('synthetic master data is complete and unique', () => {
  assert.equal(pharmacies.length, 275);
  assert.equal(new Set(pharmacies.map(p => p.id)).size, 275);
  assert.deepEqual(new Set(pharmacies.map(p => p.priority)),new Set(['A','B','C','D','E']));
  pharmacies.forEach(p => assert.ok(p.name && p.city && p.duration && p.priority));
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

test('coverage and overnight recommendation are calculated', () => {
  const coverage = cycleCoverage(initialPlan);
  assert.equal(coverage.planned, 20);
  assert.equal(coverage.percent, 7);
  const recommendation = overnightRecommendation(
    dayMetrics(initialPlan['2026-08-03'], defaultSettings),
    defaultSettings
  );
  assert.equal(typeof recommendation.benefit, 'number');
  assert.equal(typeof recommendation.recommended, 'boolean');
});

test('sales cycle plans every pharmacy exactly once across 12 weeks', () => {
  const dates=workDates(defaultSettings);
  assert.equal(dates.length,60);
  const plan=optimizeCycle(defaultSettings);
  const integrity=planIntegrity(plan);
  assert.deepEqual(integrity,{visits:275,unique:275,duplicates:0,unknown:0,missing:0});
  assert.ok(dates.every(date=>plan[date].length>=4&&plan[date].length<=5));
});

test('week rebalancing preserves fixed appointments', () => {
  const plan=optimizeCycle(defaultSettings), dates=workDates(defaultSettings).slice(0,5);
  const id=plan[dates[2]][0], fixed={[id]:dates[2]};
  const next=rebalanceWeek(plan,dates,fixed,defaultSettings);
  assert.ok(next[dates[2]].includes(id));
  assert.equal(planIntegrity(next).duplicates,0);
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
