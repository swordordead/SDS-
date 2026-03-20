<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { SDS_SECTIONS, SDS_FIELDS } from '../data/sdsFields.js'
import { useApi } from '../composables/useApi.js'

const props = defineProps({
  product: { type: Object, default: () => ({}) },
  index: { type: Number, default: 0 },
})
const emit = defineEmits(['back', 'save'])

const { generatePdf, generateFile, getPreviewHtml, aiFillField, aiFillBatch } = useApi()

// 编辑中的产品数据
const formData = ref({ ...props.product })
const activeSection = ref(1)
const previewHtml = ref('')
const showPreview = ref(false)
const loading = ref(false)
const previewLoading = ref(false)
const aiLoadingField = ref('')
const aiLoadingAll = ref(false)
const error = ref('')
const successMsg = ref('')
const exportFormat = ref('pdf') // 'pdf' | 'docx' | 'both'

// 按 section 分组的字段（排除 table 类型）
const fieldsBySection = computed(() =>
  SDS_SECTIONS.map(sec => ({
    ...sec,
    fields: SDS_FIELDS.filter(f => f.section === sec.section && f.type !== 'table'),
    hasTable: sec.section === 3,
  }))
)

// 成分表（Section 3）
const ingredients = ref(
  Array.isArray(props.product.ingredients)
    ? props.product.ingredients
    : [{ chemical_name: '', cas_number: '', concentration: '' }]
)

// 同步成分到 formData
watch(ingredients, val => { formData.value.ingredients = val }, { deep: true })

function addIngredient() {
  ingredients.value.push({ chemical_name: '', cas_number: '', concentration: '' })
}
function removeIngredient(idx) {
  if (ingredients.value.length > 1) {
    ingredients.value.splice(idx, 1)
  }
}

// ── AI 填充单个字段 ──────────────────────────────────────────
async function handleAiFill(field) {
  if (!formData.value.product_name) {
    error.value = '请先填写产品名称，再使用 AI 补全'
    return
  }
  aiLoadingField.value = field.key
  error.value = ''
  try {
    const res = await aiFillField({
      productName: formData.value.product_name,
      ingredients: ingredients.value,
      fieldKey: field.key,
      fieldLabel: field.label_en,
    })
    formData.value[field.key] = res.text
  } catch (e) {
    error.value = `AI 补全失败：${e.message}`
  } finally {
    aiLoadingField.value = ''
  }
}

// ── AI 批量填充所有可生成字段 ────────────────────────────────
async function handleAiFillAll() {
  if (!formData.value.product_name) {
    error.value = '请先填写产品名称，再使用 AI 批量补全'
    return
  }
  aiLoadingAll.value = true
  error.value = ''
  try {
    const aiFields = SDS_FIELDS
      .filter(f => f.aiGeneratable && f.type !== 'table')
      .map(f => ({ key: f.key, label: f.label_en }))

    const res = await aiFillBatch({
      productName: formData.value.product_name,
      ingredients: ingredients.value,
      fields: aiFields,
    })

    // 只填充空字段（不覆盖用户已填写的内容）
    if (res.results) {
      for (const [key, val] of Object.entries(res.results)) {
        if (!formData.value[key] && val) {
          formData.value[key] = val
        }
      }
    }
    successMsg.value = 'AI 已填充所有空字段！'
    setTimeout(() => { successMsg.value = '' }, 3000)
  } catch (e) {
    error.value = `AI 批量补全失败：${e.message}`
  } finally {
    aiLoadingAll.value = false
  }
}

// ── 预览 ─────────────────────────────────────────────────────
async function handlePreview() {
  previewLoading.value = true
  error.value = ''
  try {
    const data = { ...formData.value, ingredients: ingredients.value }
    previewHtml.value = await getPreviewHtml(data)
    showPreview.value = true
  } catch (e) {
    error.value = `预览失败：${e.message}`
  } finally {
    previewLoading.value = false
  }
}

// ── 生成文件 ─────────────────────────────────────────────────
async function handleGenerateFile(fmt) {
  loading.value = true
  error.value = ''
  try {
    const data = { ...formData.value, ingredients: ingredients.value }
    if (fmt === 'both') {
      // 同时下载 PDF 和 Word
      await generateFile(data, 'pdf')
      await generateFile(data, 'docx')
    } else {
      await generateFile(data, fmt)
    }
    successMsg.value = `${fmt.toUpperCase() === 'BOTH' ? 'PDF + Word' : fmt.toUpperCase()} 已生成并下载！`
    setTimeout(() => { successMsg.value = '' }, 3000)
  } catch (e) {
    error.value = `文件生成失败：${e.message}`
  } finally {
    loading.value = false
  }
}

// 向后兼容
async function handleGeneratePdf() {
  return handleGenerateFile(exportFormat.value)
}

function handleSave() {
  const data = { ...formData.value, ingredients: ingredients.value }
  emit('save', { data, index: props.index })
}
</script>

<template>
  <div class="fade-in-up">
    <!-- 顶部栏 -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <button class="icon-btn" @click="emit('back')">
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-semibold text-[var(--color-linear-text)]">
            {{ formData.product_name || `产品 #${index + 1}` }}
          </h2>
          <p class="text-sm text-[var(--color-linear-text-secondary)]">编辑 SDS 数据</p>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <button
          class="btn-secondary text-sm"
          :disabled="aiLoadingAll"
          @click="handleAiFillAll"
        >
          <svg v-if="aiLoadingAll" class="spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="12"/>
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/>
          </svg>
          {{ aiLoadingAll ? 'AI 填充中...' : 'AI 一键填充' }}
        </button>

        <button
          class="btn-secondary text-sm"
          :disabled="previewLoading"
          @click="handlePreview"
        >
          <svg v-if="previewLoading" class="spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="12"/>
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
          </svg>
          预览
        </button>

        <!-- 格式选择 + 下载 -->
        <div class="flex gap-0 rounded-xl overflow-hidden border border-[var(--color-linear-accent)]">
          <button
            v-for="fmt in [{ val: 'pdf', label: 'PDF' }, { val: 'docx', label: 'Word' }, { val: 'both', label: '两种' }]"
            :key="fmt.val"
            class="px-3 py-2 text-sm font-medium transition-all duration-200"
            :class="exportFormat === fmt.val
              ? 'bg-[var(--color-linear-accent)] text-white'
              : 'bg-transparent text-[var(--color-linear-accent)] hover:bg-[color-mix(in_srgb,var(--color-linear-accent)_10%,transparent)]'"
            @click="exportFormat = fmt.val"
          >
            {{ fmt.label }}
          </button>
        </div>

        <button
          class="btn-primary text-sm"
          :disabled="loading"
          @click="handleGeneratePdf"
        >
          <svg v-if="loading" class="spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="12"/>
          </svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
          {{ loading ? '生成中...' : '下载' }}
        </button>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="error" class="mb-4 p-3 rounded-xl bg-[color-mix(in_srgb,var(--color-linear-error)_10%,transparent)] border border-[var(--color-linear-error)] text-sm text-[var(--color-linear-error)]">
      {{ error }}
    </div>
    <div v-if="successMsg" class="mb-4 p-3 rounded-xl bg-[color-mix(in_srgb,var(--color-linear-success)_10%,transparent)] border border-[var(--color-linear-success)] text-sm text-[var(--color-linear-success)]">
      {{ successMsg }}
    </div>

    <div class="flex gap-6" style="min-height: 600px;">
      <!-- 左侧 Section 导航 -->
      <nav class="w-48 shrink-0 space-y-0.5">
        <button
          v-for="sec in SDS_SECTIONS"
          :key="sec.section"
          class="section-nav-item"
          :class="{ 'section-nav-item--active': activeSection === sec.section }"
          @click="activeSection = sec.section"
        >
          <span class="section-num">S{{ sec.section }}</span>
          <span class="truncate text-xs">{{ sec.title_zh }}</span>
        </button>
      </nav>

      <!-- 右侧编辑区 -->
      <div class="flex-1 min-w-0">
        <div
          v-for="secGroup in fieldsBySection"
          :key="secGroup.section"
          v-show="activeSection === secGroup.section"
          class="space-y-4"
        >
          <!-- Section 标题 -->
          <div class="section-title-bar">
            <span class="font-bold">Section {{ secGroup.section }}</span>
            <span>{{ secGroup.title_en }}</span>
            <span class="text-[var(--color-linear-text-tertiary)]">/ {{ secGroup.title_zh }}</span>
          </div>

          <!-- Section 3 成分表特殊处理 -->
          <div v-if="secGroup.hasTable" class="card p-4 space-y-3">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-[var(--color-linear-text)]">成分表 (Ingredients)</h4>
              <button class="btn-xs" @click="addIngredient">
                <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
                添加成分
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-[var(--color-linear-border)]">
                    <th class="text-left py-2 px-3 font-medium text-[var(--color-linear-text-secondary)] w-2/5">化学名称 (Chemical Name)</th>
                    <th class="text-left py-2 px-3 font-medium text-[var(--color-linear-text-secondary)] w-1/4">CAS 号 (CAS No.)</th>
                    <th class="text-left py-2 px-3 font-medium text-[var(--color-linear-text-secondary)] w-1/5">浓度 % (Concentration)</th>
                    <th class="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(ing, i) in ingredients" :key="i" class="border-b border-[var(--color-linear-border)] last:border-0">
                    <td class="py-1.5 px-2">
                      <input v-model="ing.chemical_name" type="text" placeholder="e.g. Water" class="input-sm w-full" />
                    </td>
                    <td class="py-1.5 px-2">
                      <input v-model="ing.cas_number" type="text" placeholder="e.g. 7732-18-5" class="input-sm w-full" />
                    </td>
                    <td class="py-1.5 px-2">
                      <input v-model="ing.concentration" type="text" placeholder="e.g. 60-80" class="input-sm w-full" />
                    </td>
                    <td class="py-1.5 px-2 text-center">
                      <button
                        class="text-[var(--color-linear-error)] hover:opacity-70 transition-opacity"
                        :disabled="ingredients.length <= 1"
                        @click="removeIngredient(i)"
                      >
                        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 普通字段 -->
          <div
            v-for="field in secGroup.fields"
            :key="field.key"
            class="card p-4"
          >
            <div class="flex items-start justify-between gap-2 mb-2">
              <label class="text-sm font-medium text-[var(--color-linear-text)] flex items-center gap-1.5">
                {{ field.label_zh }}
                <span class="text-[var(--color-linear-text-tertiary)] font-normal">/ {{ field.label_en }}</span>
                <span v-if="field.required" class="text-[var(--color-linear-error)] text-xs">*</span>
              </label>
              <button
                v-if="field.aiGeneratable"
                class="ai-btn shrink-0"
                :disabled="aiLoadingField === field.key"
                @click="handleAiFill(field)"
              >
                <svg v-if="aiLoadingField === field.key" class="spinner w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="12"/>
                </svg>
                <svg v-else class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/>
                </svg>
                AI 填充
              </button>
            </div>

            <textarea
              v-if="field.type === 'textarea'"
              v-model="formData[field.key]"
              :placeholder="field.placeholder_zh || field.label_en"
              rows="3"
              class="input-field w-full text-sm resize-y"
            />
            <input
              v-else
              v-model="formData[field.key]"
              type="text"
              :placeholder="field.placeholder_zh || field.label_en"
              class="input-field w-full text-sm"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 预览 Modal -->
    <div v-if="showPreview" class="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 pb-8">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col" style="max-height: 90vh;">
        <div class="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 class="font-semibold text-gray-900">SDS 预览</h3>
          <div class="flex gap-2">
            <button class="btn-primary text-sm" :disabled="loading" @click="handleGeneratePdf">
              {{ loading ? '生成中...' : '下载 PDF' }}
            </button>
            <button class="btn-secondary text-sm" @click="showPreview = false">关闭</button>
          </div>
        </div>
        <div class="flex-1 overflow-auto">
          <iframe
            :srcdoc="previewHtml"
            class="w-full h-full border-0"
            style="min-height: 70vh;"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--color-linear-surface);
  border: 1px solid var(--color-linear-border);
  border-radius: 1rem;
}

.section-title-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: color-mix(in srgb, var(--color-linear-accent) 8%, var(--color-linear-bg-secondary));
  border-radius: 0.75rem;
  font-size: 0.875rem;
  color: var(--color-linear-text);
  border-left: 3px solid var(--color-linear-accent);
}

.section-nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-linear-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}
.section-nav-item:hover {
  background: var(--color-linear-bg-secondary);
  color: var(--color-linear-text);
}
.section-nav-item--active {
  background: color-mix(in srgb, var(--color-linear-accent) 12%, var(--color-linear-bg-secondary));
  color: var(--color-linear-accent);
  font-weight: 500;
}

.section-num {
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--color-linear-border);
  padding: 0.1rem 0.35rem;
  border-radius: 0.375rem;
  flex-shrink: 0;
}
.section-nav-item--active .section-num {
  background: color-mix(in srgb, var(--color-linear-accent) 20%, transparent);
}

.input-field {
  background: var(--color-linear-bg);
  border: 1px solid var(--color-linear-border);
  border-radius: 0.5rem;
  color: var(--color-linear-text);
  padding: 0.5rem 0.75rem;
  outline: none;
  transition: border-color 0.2s;
}
.input-field:focus { border-color: var(--color-linear-accent); }

.input-sm {
  background: var(--color-linear-bg);
  border: 1px solid var(--color-linear-border);
  border-radius: 0.375rem;
  color: var(--color-linear-text);
  padding: 0.375rem 0.5rem;
  outline: none;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}
.input-sm:focus { border-color: var(--color-linear-accent); }

.ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: color-mix(in srgb, #A78BFA 15%, transparent);
  color: #7c3aed;
  border: 1px solid color-mix(in srgb, #A78BFA 30%, transparent);
  cursor: pointer;
  transition: all 0.15s;
}
.ai-btn:hover {
  background: color-mix(in srgb, #A78BFA 25%, transparent);
}
.ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-xs {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--color-linear-bg-secondary);
  color: var(--color-linear-text);
  border: 1px solid var(--color-linear-border);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-xs:hover { border-color: var(--color-linear-accent); color: var(--color-linear-accent); }

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: var(--color-linear-accent);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover { background-color: var(--color-linear-accent-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: var(--color-linear-bg-secondary);
  color: var(--color-linear-text);
  border: 1px solid var(--color-linear-border);
  transition: all 0.2s;
  cursor: pointer;
}
.btn-secondary:hover { border-color: var(--color-linear-accent); color: var(--color-linear-accent); }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.icon-btn {
  padding: 0.5rem;
  border-radius: 0.625rem;
  transition: all 0.15s;
  background: var(--color-linear-bg-secondary);
  border: 1px solid var(--color-linear-border);
  color: var(--color-linear-text);
  cursor: pointer;
}
.icon-btn:hover { border-color: var(--color-linear-accent); color: var(--color-linear-accent); }
</style>
