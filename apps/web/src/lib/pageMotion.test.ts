import { NavigationType } from 'react-router'
import { describe, expect, it } from 'vitest'
import { pageMotion, routeDepth } from './pageMotion'

const push = { type: NavigationType.Push, fromIndex: 1, toIndex: 2, browserAnimated: false }
const replace = { type: NavigationType.Replace, fromIndex: 2, toIndex: 2, browserAnimated: false }
const back = { type: NavigationType.Pop, fromIndex: 2, toIndex: 1, browserAnimated: false }

describe('routeDepth', () => {
  it('puts tabs at 0 and pages below them deeper', () => {
    expect(routeDepth('/')).toBe(0)
    expect(routeDepth('/transaksi')).toBe(0)
    expect(routeDepth('/hutang/')).toBe(0)
    expect(routeDepth('/hutang/abc')).toBe(1)
    expect(routeDepth('/transaksi/baru')).toBe(1)
    expect(routeDepth('/laporan')).toBe(1)
    expect(routeDepth('/pengaturan')).toBe(1)
    expect(routeDepth('/pengaturan/dompet')).toBe(2)
  })
})

describe('pageMotion', () => {
  it('fades between tabs and to or from the login page', () => {
    expect(pageMotion('/', '/transaksi', push)).toBe('fade')
    expect(pageMotion('/login', '/', replace)).toBe('fade')
    expect(pageMotion('/pengaturan', '/login', replace)).toBe('fade')
  })

  it('slides forward going deeper and back going up', () => {
    expect(pageMotion('/transaksi', '/transaksi/x', push)).toBe('forward')
    expect(pageMotion('/pengaturan', '/pengaturan/dompet', push)).toBe('forward')
    expect(pageMotion('/transaksi/x', '/transaksi', back)).toBe('back')
    expect(pageMotion('/hutang/x', '/hutang', replace)).toBe('back')
  })

  it('follows the history order for back and forward', () => {
    const forward = { ...back, fromIndex: 1, toIndex: 2 }
    expect(pageMotion('/transaksi', '/transaksi/x', forward)).toBe('forward')
    expect(pageMotion('/pengaturan/dompet', '/pengaturan', back)).toBe('back')
  })

  it('fades into a tab from anywhere, and between pages at the same depth', () => {
    expect(pageMotion('/pengaturan/dompet', '/hutang', push)).toBe('fade')
    expect(pageMotion('/laporan', '/transaksi', push)).toBe('fade')
    expect(pageMotion('/transaksi/x', '/tabungan/y', replace)).toBe('fade')
  })

  it('stays still on the same page or after the browser animated a back', () => {
    expect(pageMotion('/transaksi', '/transaksi', replace)).toBe('none')
    expect(pageMotion('/hutang/x', '/hutang', { ...back, browserAnimated: true })).toBe('none')
  })
})
