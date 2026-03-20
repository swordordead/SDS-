const express = require('express')
const puppeteer = require('puppeteer')
const { generateSdsHtml } = require('../templates/sdsTemplate')
const { generateSdsDocx } = require('../templates/sdsDocxTemplate')

const router = express.Router()

/**
 * 启动 Puppeteer 浏览器
 */
async function launchBrowser() {
  return puppeteer.launch({
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

/**
 * POST /api/generate
 * 生成单份 SDS PDF
 * Body: { data: { ...sdsFields }, format?: 'pdf' | 'docx' | 'both' }
 */
router.post('/', async (req, res) => {
  let browser
  try {
    const { data, format = 'pdf' } = req.body
    if (!data) {
      return res.status(400).json({ error: '缺少 data 字段' })
    }

    const safeProductName = (data.product_name || 'SDS').replace(/[^a-zA-Z0-9_-]/g, '_')

    if (format === 'docx') {
      // Word 文档
      const docxBuffer = await generateSdsDocx(data)
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeProductName}_SDS.docx"`,
        'Content-Length': docxBuffer.length,
      })
      return res.send(docxBuffer)
    }

    // PDF 生成
    const html = generateSdsHtml(data)
    browser = await launchBrowser()
    const page = await browser.newPage()
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

    await browser.close()
    browser = null

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeProductName}_SDS.pdf"`,
      'Content-Length': pdfBuffer.length,
    })
    res.send(pdfBuffer)
  } catch (err) {
    console.error('[generate] Error:', err)
    if (browser) {
      try { await browser.close() } catch (_) {}
    }
    res.status(500).json({ error: `文件生成失败：${err.message}` })
  }
})

/**
 * POST /api/generate/preview
 * 返回 SDS HTML 预览（供前端 iframe 展示）
 */
router.post('/preview', (req, res) => {
  try {
    const { data } = req.body
    if (!data) {
      return res.status(400).json({ error: '缺少 data 字段' })
    }
    const html = generateSdsHtml(data)
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (err) {
    console.error('[generate/preview] Error:', err)
    res.status(500).json({ error: `HTML 生成失败：${err.message}` })
  }
})

module.exports = router
