<script setup>
import { ref } from 'vue'
import { useApi } from '../composables/useApi.js'

const props = defineProps({
  loading: Boolean
})
const emit = defineEmits(['uploaded'])

const { uploadFile } = useApi()
const isDragging = ref(false)
const error = ref('')
const localLoading = ref(false)

async function handleFiles(files) {
  const file = files[0]
  if (!file) return

  const ext = file.name.split('.').pop().toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    error.value = '仅支持 .xlsx / .xls / .csv 文件'
    return
  }

  error.value = ''
  localLoading.value = true
  try {
    const result = await uploadFile(file)
    emit('uploaded', { result, file })
  } catch (e) {
    error.value = e.message
  } finally {
    localLoading.value = false
  }
}

function handleDrop(e) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length) handleFiles(files)
}

function handleDragOver(e) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleClick() {
  document.getElementById('file-input').click()
}

function handleInputChange(e) {
  if (e.target.files?.length) handleFiles(e.target.files)
  e.target.value = ''
}
</script>

<template>
  <div class="fade-in-up">
    <div
      class="upload-zone"
      :class="{ 'drag-active': isDragging }"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @click="handleClick"
    >
      <input
        id="file-input"
        type="file"
        accept=".xlsx,.xls,.csv"
        class="hidden"
        @change="handleInputChange"
      />

      <div v-if="localLoading" class="upload-content">
        <svg class="spinner w-12 h-12 text-[var(--color-linear-accent)] mb-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="12"/>
        </svg>
        <p class="text-[var(--color-linear-text-secondary)]">解析文件中...</p>
      </div>

      <div v-else class="upload-content">
        <svg class="w-14 h-14 mb-4 text-[var(--color-linear-text-tertiary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="text-[var(--color-linear-text)] font-medium text-lg mb-1">
          拖拽 Excel/CSV 文件到此处
        </p>
        <p class="text-[var(--color-linear-text-secondary)] text-sm mb-4">
          或点击选择文件 &nbsp;·&nbsp; 支持 .xlsx / .xls / .csv &nbsp;·&nbsp; 最大 10MB
        </p>
        <button
          type="button"
          class="px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200
                 bg-[var(--color-linear-accent)] text-white
                 hover:bg-[var(--color-linear-accent-hover)] hover:shadow-lg hover:scale-105"
          @click.stop="handleClick"
        >
          选择文件
        </button>
      </div>
    </div>

    <p v-if="error" class="mt-3 text-sm text-[var(--color-linear-error)] flex items-center gap-1.5">
      <svg class="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.upload-zone {
  border: 2px dashed var(--color-linear-border);
  border-radius: 1.5rem;
  padding: 3rem 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--color-linear-bg-secondary);
  text-align: center;
}

.upload-zone:hover,
.drag-active {
  border-color: var(--color-linear-accent);
  background: color-mix(in srgb, var(--color-linear-accent) 5%, var(--color-linear-bg-secondary));
  transform: scale(1.005);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}
</style>
