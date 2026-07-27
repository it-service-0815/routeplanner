import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pharmacies, initialPlan, defaultSettings, dayMetrics,
  optimize, cycleCoverage, overnightRecommendation
} from '../dist/core.js';

test('synthetic master data is complete and unique', () => {
  assert.equal(pharmacies.length, 25);
  assert.equal(new Set(pharmacies.map(p => p.id)).size, 25);
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
  assert.equal(coverage.percent, 80);
  const recommendation = overnightRecommendation(
    dayMetrics(initialPlan['2026-08-03'], defaultSettings),
    defaultSettings
  );
  assert.equal(typeof recommendation.benefit, 'number');
  assert.equal(typeof recommendation.recommended, 'boolean');
});
