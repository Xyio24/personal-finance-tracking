import { exportFileName } from '@finance/shared'
import { demoRequest } from './demo-api'
import { todayKey } from './format'

/** The server answers with the file and its name, so a plain link downloads it. */
export const EXPORT_URL = '/api/export/transactions.csv'

/** Demo only: there is no server, so build the same file in memory and hand it over. */
export async function downloadDemoExport() {
  const csv = await demoRequest<string>('/export/transactions.csv')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = exportFileName(todayKey())
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
