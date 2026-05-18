import { useCallback, useState } from 'react'
import { compileToPDF, downloadPDF } from '../utils/latex'

/**
 * Hook for compiling a LaTeX source to PDF (via latex.ytotech.com) and
 * triggering a download. Exposes loading/error state so panels can show
 * a spinner on the export button while the remote build runs.
 */
export function usePDFExport() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportPDF = useCallback(async (tex: string, filename: string) => {
    setError(null)
    setLoading(true)
    try {
      const blob = await compileToPDF(tex)
      downloadPDF(filename, blob)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al compilar PDF'
      setError(msg)
      // eslint-disable-next-line no-console
      console.error('[PDF export]', msg)
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, exportPDF, dismissError: () => setError(null) }
}
