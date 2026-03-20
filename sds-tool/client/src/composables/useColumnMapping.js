import { ref, watch } from 'vue'

const STORAGE_KEY = 'sds_column_mapping_schemes'

export function useColumnMapping() {
  // { excelColumn: sdsFieldKey }
  const mapping = ref({})
  const schemes = ref([])
  const currentSchemeName = ref('')

  // 从 localStorage 加载已保存的映射方案
  function loadSchemes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      schemes.value = raw ? JSON.parse(raw) : []
    } catch {
      schemes.value = []
    }
  }

  // 保存当前映射为命名方案
  function saveScheme(name) {
    if (!name.trim()) return
    loadSchemes()
    const idx = schemes.value.findIndex(s => s.name === name)
    const scheme = { name: name.trim(), mapping: { ...mapping.value }, savedAt: Date.now() }
    if (idx >= 0) {
      schemes.value[idx] = scheme
    } else {
      schemes.value.push(scheme)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes.value))
    currentSchemeName.value = name
  }

  // 加载指定方案
  function loadScheme(name) {
    loadSchemes()
    const found = schemes.value.find(s => s.name === name)
    if (found) {
      mapping.value = { ...found.mapping }
      currentSchemeName.value = name
    }
  }

  // 删除方案
  function deleteScheme(name) {
    loadSchemes()
    schemes.value = schemes.value.filter(s => s.name !== name)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes.value))
    if (currentSchemeName.value === name) {
      currentSchemeName.value = ''
    }
  }

  // 自动映射：根据列名与 SDS 字段 key/label 相似度自动匹配
  function autoMap(headers, sdsFields) {
    const newMapping = {}
    const normalizeStr = s => String(s).toLowerCase().replace(/[\s_\-\/]/g, '')

    for (const header of headers) {
      const normHeader = normalizeStr(header)
      let bestMatch = null
      let bestScore = 0

      for (const field of sdsFields) {
        const candidates = [
          field.key,
          field.label_zh,
          field.label_en,
          ...Object.values(field).filter(v => typeof v === 'string')
        ].map(normalizeStr)

        for (const c of candidates) {
          if (c === normHeader) {
            bestMatch = field.key
            bestScore = 100
            break
          }
          // 包含匹��
          if (c.includes(normHeader) || normHeader.includes(c)) {
            const score = Math.min(c.length, normHeader.length) / Math.max(c.length, normHeader.length) * 80
            if (score > bestScore) {
              bestScore = score
              bestMatch = field.key
            }
          }
        }
        if (bestScore === 100) break
      }

      if (bestMatch && bestScore >= 50) {
        newMapping[header] = bestMatch
      }
    }

    mapping.value = newMapping
    return newMapping
  }

  // 将 Excel 数据行转换为 SDS 数据对象（根据映射）
  function applyMapping(headers, row) {
    const data = {}
    headers.forEach((header, i) => {
      const fieldKey = mapping.value[header]
      if (fieldKey) {
        const val = row[i]
        if (val !== undefined && val !== null && val !== '') {
          data[fieldKey] = String(val)
        }
      }
    })
    return data
  }

  // 验证必填字段是否已映射
  function validateMapping(requiredFields) {
    const mappedKeys = new Set(Object.values(mapping.value))
    return requiredFields.filter(key => !mappedKeys.has(key))
  }

  loadSchemes()

  return {
    mapping,
    schemes,
    currentSchemeName,
    saveScheme,
    loadScheme,
    deleteScheme,
    autoMap,
    applyMapping,
    validateMapping,
    loadSchemes,
  }
}
