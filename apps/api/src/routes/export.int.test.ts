import type { Account, Category, Debt, SavingsGoal } from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { ensureUserDefaults } from '../services/defaults'
import { app, resetDatabase, signIn } from '../test/helpers'

beforeEach(resetDatabase)

describe('CSV export', () => {
  it('downloads every transaction with names, newest first', async () => {
    const client = await signIn()
    await ensureUserDefaults(client.user.id)
    const { body: bank } = await client.post<Account>('/accounts', {
      name: 'BCA',
      type: 'bank',
      initialBalance: 5_000_000,
    })
    const { body: wallet } = await client.post<Account>('/accounts', {
      name: 'GoPay',
      type: 'ewallet',
      initialBalance: 0,
    })
    const food = (await client.get<Category[]>('/categories')).body.find(
      (c) => c.name === 'Makan & Minum',
    )
    const { body: goal } = await client.post<SavingsGoal>('/savings', {
      name: 'Liburan',
      icon: 'plane',
      color: 'sky',
      targetAmount: null,
      deadline: null,
      initialAmount: 0,
    })
    await client.post('/transactions', {
      type: 'expense',
      amount: 38_000,
      accountId: bank.id,
      categoryId: food?.id,
      date: '2026-11-03',
      note: 'Nasi "padang", es teh',
    })
    await client.post('/transactions', {
      type: 'transfer',
      amount: 200_000,
      accountId: bank.id,
      toAccountId: wallet.id,
      date: '2026-11-04',
      note: null,
    })
    await client.post('/transactions', {
      type: 'saving_deposit',
      amount: 1_000_000,
      accountId: bank.id,
      goalId: goal.id,
      date: '2026-11-05',
      note: '=1+1',
    })
    await client.post<Debt>('/debts', {
      direction: 'receivable',
      person: 'Budi',
      amount: 500_000,
      date: '2026-11-06',
      dueDate: null,
      note: null,
      accountId: bank.id,
    })

    // Someone else's data never shows up
    const other = await signIn('second@example.com')
    await other.post('/accounts', { name: 'Rahasia', type: 'cash', initialBalance: 1 })

    const res = await client.download('/export/transactions.csv')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toMatch(
      /^attachment; filename="keuangan-\d{4}-\d{2}-\d{2}\.csv"$/,
    )
    expect(res.headers.get('cache-control')).toBe('no-store')

    const bytes = new Uint8Array(await res.arrayBuffer())
    // UTF-8 BOM so Excel picks the right encoding (text decoding would silently drop it).
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const csv = new TextDecoder().decode(bytes)
    expect(csv.trimEnd().split('\r\n')).toEqual([
      'Tanggal,Jenis,Jumlah,Dompet,Dompet tujuan,Kategori,Tabungan,Orang,Catatan',
      '2026-11-06,Pinjamkan,500000,BCA,,,,Budi,',
      `2026-11-05,Isi tabungan,1000000,BCA,,,Liburan,,'=1+1`,
      '2026-11-04,Transfer,200000,BCA,GoPay,,,,',
      '2026-11-03,Pengeluaran,38000,BCA,,Makan & Minum,,,"Nasi ""padang"", es teh"',
    ])
    expect(csv).not.toContain('Rahasia')
  })

  it('needs a session', async () => {
    const res = await app.request('/api/export/transactions.csv')
    expect(res.status).toBe(401)
  })
})
