import { describe, expect, it } from 'vitest'
import {
  activeTabIndex,
  atRest,
  nearestTab,
  pillShape,
  SLIDE_SPRING,
  type Spring,
  stepSpring,
} from './tabPill'

const tabs = [{ to: '/', end: true }, { to: '/transaksi' }, { to: '/tabungan' }, { to: '/hutang' }]

describe('activeTabIndex', () => {
  it('matches a tab and the pages under it', () => {
    expect(activeTabIndex('/', tabs)).toBe(0)
    expect(activeTabIndex('/transaksi', tabs)).toBe(1)
    expect(activeTabIndex('/transaksi/abc', tabs)).toBe(1)
    expect(activeTabIndex('/tabungan/', tabs)).toBe(2)
    expect(activeTabIndex('/hutang/x', tabs)).toBe(3)
  })

  it('matches nothing outside the tabs, or a look-alike path', () => {
    expect(activeTabIndex('/laporan', tabs)).toBe(-1)
    expect(activeTabIndex('/pengaturan/dompet', tabs)).toBe(-1)
    expect(activeTabIndex('/transaksikan', tabs)).toBe(-1)
  })
})

describe('nearestTab', () => {
  it('picks the slot holding most of the pill and stays within the tabs', () => {
    expect(nearestTab(0, 80, 4)).toBe(0)
    expect(nearestTab(39, 80, 4)).toBe(0)
    expect(nearestTab(41, 80, 4)).toBe(1)
    expect(nearestTab(-30, 80, 4)).toBe(0)
    expect(nearestTab(400, 80, 4)).toBe(3)
    expect(nearestTab(10, 0, 4)).toBe(0)
  })
})

describe('stepSpring', () => {
  /** Runs the spring at 60 fps until it rests; returns the frames taken and the furthest point. */
  function settle(from: number, to: number, frameMs = 1000 / 60) {
    let spring: Spring = { value: from, velocity: 0 }
    let furthest = from
    for (let frame = 1; frame < 600; frame++) {
      spring = stepSpring(spring, to, frameMs / 1000, SLIDE_SPRING)
      furthest = Math.max(furthest, spring.value)
      if (atRest(spring, to)) return { frame, furthest, spring }
    }
    throw new Error('never settled')
  }

  it('slides over in well under a second with only a small overshoot', () => {
    const { frame, furthest } = settle(0, 100)
    expect(frame / 60).toBeLessThan(0.9)
    expect(furthest).toBeGreaterThan(100) // a hint of bounce: liquid, not mechanical
    expect(furthest).toBeLessThan(106)
  })

  it('stays stable when frames come slowly or stall', () => {
    expect(settle(0, 100, 50).spring.value).toBeCloseTo(100, 0)
    const stalled = stepSpring({ value: 0, velocity: 0 }, 100, 5, SLIDE_SPRING)
    expect(Math.abs(stalled.value)).toBeLessThan(150)
  })
})

describe('pillShape', () => {
  it('rests as itself', () => {
    expect(pillShape(0, 0)).toEqual({ scaleX: 1, scaleY: 1, magnify: 1 })
  })

  it('stretches along the way it moves, but only so far', () => {
    const slow = pillShape(300, 0)
    const fast = pillShape(-50_000, 0)
    expect(slow.scaleX).toBeGreaterThan(1)
    expect(slow.scaleY).toBeLessThan(1)
    expect(fast.scaleX).toBeLessThanOrEqual(1.22)
    expect(fast.magnify).toBe(1)
  })

  it('grows past the bar and magnifies what shows through when lifted', () => {
    const lifted = pillShape(0, 1)
    expect(lifted.scaleY).toBeGreaterThan(lifted.scaleX)
    expect(lifted.magnify).toBeGreaterThan(1)
  })
})
