const express = require('express')
const puppeteer = require('puppeteer')
const archiver = require('archiver')
const { generateSdsHtml } = require('../templates/sdsTemplate')
const { generateSdsDocx } = require('../templates/sdsDocxTemplate')

const router = express.Router()

/**
 * 使用 Puppeteer 生成单份 PDF buffer
 */
async function generatePdfBuffer(browser, data) {
  const html = generateSdsHtml(data)
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="font-size:9pt; font-family:'Times New Roman',serif; width:100%; padding:0 1in; display:flex; justify-content:space-between;">
          <span>${(data.company_name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')} | ${(data.product_name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
    })
    return pdfBuffer
  } finally {
    await page.close()
  }
}

/**
 * POST /api/batch
 * 批量生成文件，以 ZIP 流返回
 * Body: { products: [...], format: 'pdf' | 'docx' | 'both' }
 */
router.post('/', async (req, res) => {
  let browser
  try {
    const { products, format = 'pdf' } = req.body
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: '产品列表为空' })
    }
    if (products.length > 50) {
      return res.status(400).json({ error: '单次批量最多 50 个产品' })
    }

    // 需要 PDF 时才启动浏览器
    const needPdf = format === 'pdf' || format === 'both'
    if (needPdf) {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
        ]
      })
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="SDS_Batch_${Date.now()}.zip"`,
      'Transfer-Encoding': 'chunked',
    })

    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.pipe(res)

    for (let i = 0; i < products.length; i++) {
      const data = products[i]
      const num = String(i + 1).padStart(3, '0')
      const safeName = (data.product_name || `Product_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_')

      if (format === 'pdf' || format === 'both') {
        const pdfBuffer = await generatePdfBuffer(browser, data)
        archive.append(pdfBuffer, { name: `${num}_${safeName}_SDS.pdf` })
      }
      if (format === 'docx' || format === 'both') {
        const docxBuffer = await generateSdsDocx(data)
        archive.append(docxBuffer, { name: `${num}_${safeName}_SDS.docx` })
      }
    }

    await archive.finalize()
    if (browser) {
      await browser.close()
      browser = null
    }
  } catch (err) {
    console.error('[batch] Error:', err)
    if (browser) {
      try { await browser.close() } catch (_) {}
    }
    if (!res.headersSent) {
      res.status(500).json({ error: `批量生成失败：${err.message}` })
    }
  }
})

module.exports = router
