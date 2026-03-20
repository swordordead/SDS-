<script setup>
import { ref, computed, watch } from 'vue'
import { SDS_FIELDS, REQUIRED_FIELDS } from '../data/sdsFields.js'
import { useColumnMapping } from '../composables/useColumnMapping.js'

const props = defineProps({
  headers: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
})
const emit = defineEmits(['mapped', 'back'])

const {
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
} = useColumnMapping()

const schemeName = ref('')
const showSchemes = ref(false)

// 只展示有意义的 SDS 字段（排除 table 类型的 ingredients，它是独立处理的）
const mappableFields = computed(() =>
  SDS_FIELDS.filter(f => f.type !== 'table').map(f => ({
    key: f.key,
    label: `${f.label_zh} / ${f.label_en} (S${f.section})`
  }))
)

// 未映射的必填字段（排除 table 类型，table 字段在编辑器中单独处理）
const unmappedRequired = computed(() => {
  const mappedKeys = new Set(Object.values(mapping.value))
  return REQUIRED_FIELDS
    .filter(k => {
      const field = SDS_FIELDS.find(f => f.key === k)
      return field && field.type !== 'table' && !mappedKeys.has(k)
    })
    .map(k => {
      const field = SDS_FIELDS.find(f => f.key === k)
      return field ? `${field.label_zh} (${field.label_en})` : k
    })
})

const canProceed = computed(() => unmappedRequired.value.length === 0)

// 统计已映射数量
const mappedCount = computed(() => Object.keys(mapping.value).length)

function handleAutoMap() {
  autoMap(props.headers, SDS_FIELDS)
}

function handleProceed() {
  if (!canProceed.value) return
  // 将所有数据行转换为 SDS 数据对象
  const products = props.rows.map(row => applyMapping(props.headers, row))
  emit('mapped', { products, mapping: { ...mapping.value } })
}

function handleSaveScheme() {
  if (schemeName.value.trim()) {
    saveScheme(schemeName.value.trim())
    schemeName.value = ''
    loadSchemes()
  }
}

function handleLoadScheme(name) {
  loadScheme(name)
  showSchemes.value = false
}

// 组件挂载时尝试自动映射
handleAutoMap()
</script>

<template>
  <div class="fade-in-up space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-[var(--color-linear-text)]">字段映射</h2>
        <p class="text-sm text-[var(--color-linear-text-secondary)] mt-1">
          将 Excel 列名映射到对应的 SDS 字段 &nbsp;·&nbsp;
          <span class="text-[var(--color-linear-accent)]">已映射 {{ mappedCount }} / {{ headers.length }} 列</span>
        </p>
      </div>
      <button
        class="text-sm text-[var(--color-linear-text-secondary)] hover:text-[var(--color-linear-text)] transition-colors flex items-center gap-1.5"
        @click="emit('back')"
      >
        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
        </svg>
        重新上传
      </button>
    </div>

    <!-- 工具栏 -->
    <div class="flex flex-wrap gap-3">
      <button
        class="btn-secondary text-sm"
        @click="handleAutoMap"
      >
        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM2 10a8 8 0 1114.32 4.906l2.387 2.387a1 1 0 01-1.414 1.414l-2.387-2.387A8 8 0 012 10z"/>
        </svg>
        自动映射
      </button>

      <div class="relative">
        <button class="btn-secondary text-sm" @click="showSchemes = !showSchemes">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
          </svg>
          已保存方案 ({{ schemes.length }})
        </button>

        <!-- 方案下拉 -->
        <div v-if="showSchemes && schemes.length > 0" class="absolute top-full left-0 mt-1 w-64 bg-[var(--color-linear-surface)] border border-[var(--color-linear-border)] rounded-xl shadow-xl z-10 overflow-hidden">
          <div v-for="scheme in schemes" :key="scheme.name" class="flex items-center justify-between px-3 py-2 hover:bg-[var(--color-linear-bg-secondary)] transition-colors">
            <button class="text-sm text-[var(--color-linear-text)] truncate flex-1 text-left" @click="handleLoadScheme(scheme.name)">
              {{ scheme.name }}
            </button>
            <button class="text-[var(--color-linear-error)] p-1 hover:opacity-70" @click.stop="deleteScheme(scheme.name); loadSchemes()">
              <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 保存方案 -->
      <div class="flex gap-2">
        <input
          v-model="schemeName"
          type="text"
          placeholder="保存为方案名..."
          class="input-field text-sm py-1.5 px-3 w-40"
          @keydown.enter="handleSaveScheme"
        />
        <button class="btn-secondary text-sm" :disabled="!schemeName.trim()" @click="handleSaveScheme">
          保存
        </button>
      </div>
    </div>

    <!-- 映射表格 -->
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[var(--color-linear-border)]">
            <th class="text-left px-4 py-3 font-medium text-[var(--color-linear-text-secondary)] w-1/2">Excel 列名</th>
            <th class="text-left px-4 py-3 font-medium text-[var(--color-linear-text-secondary)] w-1/2">映射到 SDS 字段</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="header in headers"
            :key="header"
            class="border-b border-[var(--color-linear-border)] last:border-0 hover:bg-[var(--color-linear-bg-secondary)] transition-colors"
          >
            <td class="px-4 py-3 font-medium text-[var(--color-linear-text)]">
              <span class="px-2 py-0.5 rounded-md bg-[var(--color-linear-bg-secondary)] border border-[var(--color-linear-border)] text-xs">{{ header }}</span>
            </td>
            <td class="px-4 py-3">
              <select
                v-model="mapping[header]"
                class="input-field text-sm py-1.5 w-full"
              >
                <option value="">— 不映射 —</option>
                <option
                  v-for="field in mappableFields"
                  :key="field.key"
                  :value="field.key"
                >
                  {{ field.label }}
                </option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 必填字段未映射警告 -->
    <div v-if="unmappedRequired.length > 0" class="p-4 rounded-xl bg-[color-mix(in_srgb,var(--color-linear-warning)_10%,transparent)] border border-[var(--color-linear-warning)]">
      <p class="text-sm font-medium text-[var(--color-linear-warning)] mb-1">以下必填字段尚未映射：</p>
      <ul class="text-sm text-[var(--color-linear-text-secondary)] list-disc list-inside space-y-0.5">
        <li v-for="field in unmappedRequired" :key="field">{{ field }}</li>
      </ul>
      <p class="text-xs text-[var(--color-linear-text-tertiary)] mt-2">
        提示：必填字段也可在下一步手动填写
      </p>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-between">
      <button class="btn-secondary" @click="emit('back')">上一步</button>
      <button
        class="btn-primary"
        @click="handleProceed"
      >
        确认映射，查看产品列表
        <svg class="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--color-linear-surface);
  border: 1px solid var(--color-linear-border);
  border-radius: 1rem;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 0.625rem 1.25rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: var(--color-linear-accent);
  color: white;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}
.btn-primary:hover {
  background-color: var(--color-linear-accent-hover);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--color-linear-accent) 30%, transparent);
}

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
.btn-secondary:hover {
  border-color: var(--color-linear-accent);
  color: var(--color-linear-accent);
}
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.input-field {
  background: var(--color-linear-bg);
  border: 1px solid var(--color-linear-border);
  border-radius: 0.5rem;
  color: var(--color-linear-text);
  padding: 0.375rem 0.75rem;
  outline: none;
  transition: border-color 0.2s;
}
.input-field:focus {
  border-color: var(--color-linear-accent);
}
</style>
