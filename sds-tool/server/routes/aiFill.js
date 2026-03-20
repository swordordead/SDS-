const express = require('express')
const router = express.Router()

const API_URL = 'https://api.tu-zi.com/v1/chat/completions'
// 使用 Flash 模型（性价比最高）
const MODEL = 'gemini-2.5-flash-lite-preview-09-2025'

/**
 * 构建 AI 提示词
 */
function buildPrompt(productName, ingredients, fieldKey, fieldLabel, language) {
  const ingredientStr = Array.isArray(ingredients)
    ? ingredients.map(i => `${i.chemical_name || ''} (CAS: ${i.cas_number || 'N/A'}, ${i.concentration || 'N/A'}%)`).join(', ')
    : String(ingredients || '')

  const langNote = language === 'zh'
    ? '请用中文回答，内容将被翻译成英文使用。'
    : 'Please respond in English.'

  return `You are a professional SDS (Safety Data Sheet) author with expertise in GHS/OSHA HazCom regulations.

Product Name: ${productName}
Ingredients: ${ingredientStr}

Task: Generate the content for the following SDS field:
Field: ${fieldLabel} (key: ${fieldKey})

Requirements:
1. Follow GHS/OSHA HazCom 2012 standards
2. Be specific and accurate based on the ingredients provided
3. Use professional regulatory language
4. Keep it concise but complete
5. If a value is "Not applicable" or "Not regulated", state it clearly

${langNote}

Provide ONLY the field content, no explanations or headers.`
}

/**
 * POST /api/ai-fill
 * 使用 Gemini AI 补全指定 SDS 字段
 * Body: { productName, ingredients, fieldKey, fieldLabel, language? }
 */
router.post('/', async (req, res) => {
  try {
    const { productName, ingredients, fieldKey, fieldLabel, language = 'en' } = req.body

    if (!productName || !fieldKey) {
      return res.status(400).json({ error: '缺少 productName 或 fieldKey' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: '服务端未配置 GEMINI_API_KEY' })
    }

    const prompt = buildPrompt(productName, ingredients, fieldKey, fieldLabel || fieldKey, language)

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[ai-fill] API Error:', response.status, errText)
      return res.status(502).json({ error: `AI 接口返回错误 (${response.status})` })
    }

    const json = await response.json()
    const text = json.choices?.[0]?.message?.content?.trim()

    if (!text) {
      return res.status(502).json({ error: 'AI 返回内容为空' })
    }

    res.json({ text, fieldKey })
  } catch (err) {
    console.error('[ai-fill] Error:', err)
    res.status(500).json({ error: `AI 补全失败：${err.message}` })
  }
})

/**
 * POST /api/ai-fill/batch
 * 批量 AI 补全多个字段（用于一键 AI 填写）
 * Body: { productName, ingredients, fieldKeys: ['key1', 'key2', ...], fields: [{key, label}] }
 */
router.post('/batch', async (req, res) => {
  try {
    const { productName, ingredients, fields } = req.body

    if (!productName || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: '服务端未配置 GEMINI_API_KEY' })
    }

    const ingredientStr = Array.isArray(ingredients)
      ? ingredients.map(i => `${i.chemical_name || ''} (CAS: ${i.cas_number || 'N/A'}, ${i.concentration || 'N/A'}%)`).join(', ')
      : String(ingredients || '')

    // 构建批量提示词（一次请求生成所有字段，节省 API 调用）
    const fieldList = fields.map((f, i) => `${i + 1}. ${f.label} (${f.key})`).join('\n')

    const prompt = `You are a professional SDS (Safety Data Sheet) author with expertise in GHS/OSHA HazCom regulations.

Product Name: ${productName}
Ingredients: ${ingredientStr}

Generate content for the following SDS fields. Follow GHS/OSHA HazCom 2012 standards.
Use professional regulatory language. Be specific based on the ingredients.

Fields to generate:
${fieldList}

Respond ONLY with a JSON object where keys are the field keys and values are the field content.
Example: {"field_key": "content here", ...}
Do not include any explanations outside the JSON.`

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[ai-fill/batch] API Error:', response.status, errText)
      return res.status(502).json({ error: `AI 接口返回错误 (${response.status})` })
    }

    const json = await response.json()
    let text = json.choices?.[0]?.message?.content?.trim()

    if (!text) {
      return res.status(502).json({ error: 'AI 返回内容为空' })
    }

    // 提取 JSON（模型可能包裹在 ```json ... ```）
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      text = jsonMatch[1].trim()
    }

    let result = {}
    try {
      result = JSON.parse(text)
    } catch (e) {
      console.error('[ai-fill/batch] JSON parse error:', e)
      return res.status(502).json({ error: 'AI 返回格式无效，请重试' })
    }

    res.json({ results: result })
  } catch (err) {
    console.error('[ai-fill/batch] Error:', err)
    res.status(500).json({ error: `AI 批量补全失败：${err.message}` })
  }
})

module.exports = router
