import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'

export async function exportDashboardPdf(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#f4f7fc',
    logging: false,
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 10
  const contentW = pageW - margin * 2
  const imgH = (canvas.height * contentW) / canvas.width

  let y = margin
  let remaining = imgH

  while (remaining > 0) {
    const sliceH = Math.min(remaining, pageH - margin * 2)
    const srcY = (imgH - remaining) * (canvas.height / imgH)
    const srcH = sliceH * (canvas.height / imgH)

    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = srcH
    const ctx = sliceCanvas.getContext('2d')!
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, y, contentW, sliceH)
    remaining -= sliceH

    if (remaining > 0) {
      pdf.addPage()
      y = margin
    }
  }

  pdf.save(filename)
}
