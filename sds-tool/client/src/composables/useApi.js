/**
 * useApi — API 请求封装
 */
export function useApi() {
  const BASE = import.meta.env.DEV ? '/api' : '/api'

  async function request(method, path, body, options = {}) {
    const url = `${BASE}${path}`
    const isFormData = body instanceof FormData

    const fetchOptions = {
      method,
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      ...options,
    }

    const res = await fetch(url, fetchOptions)

    if (options.responseType === 'blob') {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `请求失败 (${res.status})`)
      }
      const blob = await res.blob()
      return { blob, headers: res.headers }
    }

    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || `请求失败 (${res.status})`)
    }
    return json
  }

  /**
   * 上传 Excel 文件
   */
  async function uploadFile(file) {
    const form = new FormData()
    form.append('file', file)
    return request('POST', '/upload', form)
  }

  /**
   * 生成单份文件并触发下载
   * @param {Object} data - SDS 字段数据
   * @param {'pdf'|'docx'} format - 文件格式
   */
  async function generateFile(data, format = 'pdf') {
    const { blob, headers } = await request('POST', '/generate', { data, format }, { responseType: 'blob' })
    const cd = headers.get('content-disposition') || ''
    const match = cd.match(/filename="([^"]+)"/)
    const safeProductName = (data.product_name || 'SDS').replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = match ? match[1] : `${safeProductName}_SDS.${format}`
    downloadBlob(blob, filename)
  }

  /**
   * 向后兼容：生成 PDF
   */
  async function generatePdf(data) {
    return generateFile(data, 'pdf')
  }

  /**
   * 获取 SDS HTML 预览
   */
  async function getPreviewHtml(data) {
    const res = await fetch(`${BASE}/generate/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error || '预览生成失败')
    }
    return res.text()
  }

  /**
   * 批量生成文件 ZIP
   * @param {Array} products
   * @param {'pdf'|'docx'|'both'} format
   */
  async function generateBatch(products, format = 'pdf') {
    const { blob } = await request('POST', '/batch', { products, format }, { responseType: 'blob' })
    downloadBlob(blob, `SDS_Batch_${Date.now()}.zip`)
  }

  /**
   * AI 补全单个字段
   */
  async function aiFillField({ productName, ingredients, fieldKey, fieldLabel, language = 'en' }) {
    return request('POST', '/ai-fill', { productName, ingredients, fieldKey, fieldLabel, language })
  }

  /**
   * AI 批量补全字段
   */
  async function aiFillBatch({ productName, ingredients, fields }) {
    return request('POST', '/ai-fill/batch', { productName, ingredients, fields })
  }

  /**
   * 健康检查
   */
  async function checkHealth() {
    return request('GET', '/health')
  }

  return {
    uploadFile,
    generateFile,
    generatePdf,
    getPreviewHtml,
    generateBatch,
    aiFillField,
    aiFillBatch,
    checkHealth,
  }
}

/**
 * 触发浏览器下载
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
