<script setup>
import { ref } from 'vue'
import { useApi } from '../composables/useApi.js'

const props = defineProps({
  products: { type: Array, default: () => [] },
})
const emit = defineEmits(['done'])

const { generateBatch } = useApi()

const isLoading = ref(false)
const progress = ref(0)
const statusText = ref('')
const error = ref('')
const done = ref(false)
const exportFormat = ref('pdf') // 'pdf' | 'docx' | 'both'

const formatLabels = {
  pdf: 'PDF',
  docx: 'Word (.docx)',
  both: 'PDF + Word (两种)',
}

async function startBatch() {
  if (props.products.length === 0) return

  isLoading.value = true
  progress.value = 0
  statusText.value = `正在生成 ${props.products.length} 份 SDS ${formatLabels[exportFormat.value]}...`
  error.value = ''
  done.value = false

  try {
    const interval = setInterval(() => {
      if (progress.value < 85) {
        progress.value += Math.random() * 8
      }
    }, 600)

    await generateBatch(props.products, exportFormat.value)

    clearInterval(interval)
    progress.value = 100
    const fmtLabel = formatLabels[exportFormat.value]
    statusText.value = `✅ 已成功生成 ${props.products.length} 份 ${fmtLabel}，ZIP 文件已下载`
    done.value = true
  } catch (e) {
    error.value = e.message
    statusText.value = '生成失败'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="fade-in-up max-w-lg mx-auto text-center space-y-6 py-8">
    <div v-if="!isLoading && !done && !error">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[color-mix(in_srgb,var(--color-linear-accent)_12%,transparent)] flex items-center justify-center">
        <svg class="w-8 h-8 text-[var(--color-linear-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke-linecap="round"/>
          <line x1="16" y1="17" x2="8" y2="17" stroke-linecap="round"/>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-[var(--color-linear-text)] mb-2">批量生成 SDS 文件</h3>
      <p class="text-[var(--color-linear-text-secondary)] text-sm mb-6">
        即将生成 <strong class="text-[var(--color-linear-text)]">{{ products.length }}</strong> 份产品的 SDS 文件，打包为 ZIP 下载
      </p>

      <!-- 格式选择 -->
      <div class="mb-6 space-y-2">
        <p class="text-sm font-medium text-[var(--color-linear-text)]">选择导出格式</p>
        <div class="flex gap-2 justify-center flex-wrap">
          <label
            v-for="fmt in [
              { val: 'pdf', label: '📄 PDF', desc: '适合打印和分享' },
              { val: 'docx', label: '📝 Word (.docx)', desc: '适合后续编辑' },
              { val: 'both', label: '📦 两种都要', desc: 'PDF + Word' },
            ]"
            :key="fmt.val"
            class="format-option"
            :class="{ 'format-option--active': exportFormat === fmt.val }"
          >
            <input type="radio" :value="fmt.val" v-model="exportFormat" class="hidden" />
            <span class="font-medium text-sm">{{ fmt.label }}</span>
            <span class="text-xs text-[var(--color-linear-text-tertiary)]">{{ fmt.desc }}</span>
          </label>
        </div>
      </div>

      <button class="btn-primary" @click="startBatch">
        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
        开始批量生成
      </button>
    </div>

    <div v-if="isLoading" class="space-y-4">
      <svg class="spinner w-12 h-12 mx-auto text-[var(--color-linear-accent)]" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="12"/>
      </svg>
      <p class="text-[var(--color-linear-text)] font-medium">{{ statusText }}</p>
      <div class="w-full bg-[var(--color-linear-border)] rounded-full h-2 overflow-hidden">
        <div
          class="h-2 rounded-full bg-[var(--color-linear-accent)] transition-all duration-500"
          :style="{ width: Math.min(progress, 100) + '%' }"
        />
      </div>
      <p class="text-xs text-[var(--color-linear-text-tertiary)]">请勿关闭页面...</p>
    </div>

    <div v-if="done" class="space-y-4">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-[color-mix(in_srgb,var(--color-linear-success)_12%,transparent)] flex items-center justify-center">
        <svg class="w-8 h-8 text-[var(--color-linear-success)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p class="text-[var(--color-linear-text)] font-medium">{{ statusText }}</p>
      <button class="btn-secondary" @click="emit('done')">返回产品列表</button>
    </div>

    <div v-if="error" class="space-y-3">
      <p class="text-[var(--color-linear-error)] text-sm">{{ error }}</p>
      <div class="flex gap-2 justify-center">
        <button class="btn-secondary text-sm" @click="startBatch">重试</button>
        <button class="btn-secondary text-sm" @click="emit('done')">返回</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.format-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 0.875rem;
  border: 2px solid var(--color-linear-border);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-linear-surface);
  min-width: 120px;
}
.format-option:hover {
  border-color: var(--color-linear-accent);
}
.format-option--active {
  border-color: var(--color-linear-accent);
  background: color-mix(in srgb, var(--color-linear-accent) 8%, var(--color-linear-surface));
  color: var(--color-linear-accent);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1.5rem;
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
</style>
