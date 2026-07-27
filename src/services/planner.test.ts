import {describe,it,expect} from 'vitest'; import {impactForMove} from './planner';
describe('impactForMove',()=>{it('marks same-day order green',()=>expect(impactForMove(2,2,false).level).toBe('grün'));it('marks week change yellow',()=>expect(impactForMove(3,2,false).level).toBe('gelb'));it('marks fixed visit red',()=>expect(impactForMove(3,2,true).level).toBe('rot'));});
