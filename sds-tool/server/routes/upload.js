const express = require('express')
const multer = require('multer')
const XLSX = require('xlsx')
const path = require('path')

const router = express.Router()

// multer: ���存存储，限制 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(req, file, cb) {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/csv',
    ]
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(file.mimetype) || ['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 .xlsx / .xls / .csv 文件'))
    }
  }
})

/**
 * POST /api/upload
 * 解析 Excel/CSV 文件，返回表头和数据行
 */
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未收到文件' })
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // 获取所有数据（含表头）
    const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    if (!raw || raw.length === 0) {
      return res.status(400).json({ error: '文件内容为空' })
    }

    // 第一行为表头
    const headers = raw[0].map(h => String(h).trim())
    // 其余行为数据
    const rows = raw.slice(1).filter(row => row.some(cell => cell !== ''))

    // 返回所有 Sheet 名称（供用户选择）
    const sheets = workbook.SheetNames

    res.json({
      headers,
      rows,
      sheets,
      currentSheet: sheetName,
      rowCount: rows.length
    })
  } catch (err) {
    console.error('[upload] Error:', err)
    res.status(500).json({ error: `文件解析失败：${err.message}` })
  }
})

/**
 * POST /api/upload/sheet
 * 切换到指定 Sheet
 */
router.post('/sheet', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未收到文件' })
    }

    const { sheetName } = req.body
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const targetSheet = sheetName || workbook.SheetNames[0]
    const worksheet = workbook.Sheets[targetSheet]

    if (!worksheet) {
      return res.status(400).json({ error: `Sheet "${targetSheet}" 不存在` })
    }

    const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
    const headers = raw[0]?.map(h => String(h).trim()) || []
    const rows = raw.slice(1).filter(row => row.some(cell => cell !== ''))

    res.json({
      headers,
      rows,
      sheets: workbook.SheetNames,
      currentSheet: targetSheet,
      rowCount: rows.length
    })
  } catch (err) {
    console.error('[upload/sheet] Error:', err)
    res.status(500).json({ error: `切换 Sheet 失败：${err.message}` })
  }
})

module.exports = router
