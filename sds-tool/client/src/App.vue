<script setup>
import { ref, onMounted } from 'vue'
import FileUpload from './components/FileUpload.vue'
import ColumnMapper from './components/ColumnMapper.vue'
import ProductList from './components/ProductList.vue'
import SdsEditor from './components/SdsEditor.vue'
import BatchExport from './components/BatchExport.vue'
import { useTheme } from './composables/useTheme.js'
import { useApi } from './composables/useApi.js'

const { isDark, toggle: toggleTheme, init: initTheme } = useTheme()
const { checkHealth } = useApi()

// 步骤流：upload → map → list → edit | batch
// 'upload' | 'map' | 'list' | 'edit' | 'batch'
const step = ref('upload')
const aiEnabled = ref(false)

// Excel 数据
const excelHeaders = ref([])
const excelRows = ref([])

// 产品数据（映射后）
const products = ref([])

// 当前编辑的产品
const currentProduct = ref(null)
const currentProductIndex = ref(0)

// 批量导出的产品列表
const batchProducts = ref([])

onMounted(async () => {
  initTheme()
  try {
    const health = await checkHealth()
    aiEnabled.value = health.aiEnabled
  } catch {
    // 服务未启动也不影响使用
  }
})

// ── 步骤处理 ───────────────────────────────────────────────────

function handleUploaded({ result }) {
  excelHeaders.value = result.headers
  excelRows.value = result.rows
  step.value = 'map'
}

function handleMapped({ products: mapped }) {
  products.value = mapped
  step.value = 'list'
}

function handleSelectProduct({ product, index }) {
  currentProduct.value = { ...product }
  currentProductIndex.value = index
  step.value = 'edit'
}

function handleSaveProduct({ data, index }) {
  products.value[index] = data
  step.value = 'list'
}

function handleBatch(selectedProducts) {
  batchProducts.value = selectedProducts
  step.value = 'batch'
}

// 步骤标签
const stepLabels = [
  { key: 'upload', label: '上传', icon: '1' },
  { key: 'map', label: '映射', icon: '2' },
  { key: 'list', label: '产品', icon: '3' },
  { key: 'edit', label: '编辑', icon: '4' },
]

const stepOrder = ['upload', 'map', 'list', 'edit', 'batch']
function stepIndex(s) { return stepOrder.indexOf(s) }
</script>

<template>
  <div class="min-h-screen bg-[var(--color-linear-bg)]">
    <!-- ── 顶栏 ── -->
    <header class="sticky top-0 z-40 bg-[var(--color-linear-bg)]/80 backdrop-blur-md border-b border-[var(--color-linear-border)]">
      <div class="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- Logo -->
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-linear-purple)] to-[var(--color-linear-pink)] flex items-center justify-center">
            <svg class="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-sm font-bold text-[var(--color-linear-text)] leading-tight">SDS 自动生成工具</h1>
            <p class="text-xs text-[var(--color-linear-text-tertiary)]">US GHS / OSHA HazCom 2012</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- AI 状态指示 -->
          <div class="flex items-center gap-1.5 text-xs">
            <span :class="aiEnabled ? 'text-[var(--color-linear-success)]' : 'text-[var(--color-linear-text-tertiary)]'">
              <span class="inline-block w-1.5 h-1.5 rounded-full mr-1" :class="aiEnabled ? 'bg-[var(--color-linear-success)]' : 'bg-[var(--color-linear-text-tertiary)]'"></span>
              {{ aiEnabled ? 'AI 已启用' : 'AI 未配置' }}
            </span>
          </div>

          <!-- 主题切换 -->
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-linear-text-secondary)] hover:text-[var(--color-linear-text)] hover:bg-[var(--color-linear-bg-secondary)] transition-all"
            @click="toggleTheme"
          >
            <svg v-if="isDark" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
            </svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 步骤指示器（edit/batch 时隐藏） -->
      <div v-if="step !== 'edit' && step !== 'batch'" class="max-w-6xl mx-auto px-6 pb-3">
        <div class="flex items-center gap-2">
          <template v-for="(s, i) in stepLabels" :key="s.key">
            <div
              class="step-item"
              :class="{
                'step-item--active': step === s.key,
                'step-item--done': stepIndex(step) > i,
              }"
            >
              <span class="step-num">
                <svg v-if="stepIndex(step) > i" class="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10.28 2.28L3.989 9.262 1.695 6.978A1 1 0 00.28 8.393l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z"/>
                </svg>
                <span v-else>{{ s.icon }}</span>
              </span>
              <span class="text-xs font-medium">{{ s.label }}</span>
            </div>
            <div v-if="i < stepLabels.length - 1" class="flex-1 h-px bg-[var(--color-linear-border)]"/>
          </template>
        </div>
      </div>
    </header>

    <!-- ── 主内容 ── -->
    <main class="max-w-6xl mx-auto px-6 py-8">
      <!-- Step 1: 上传 -->
      <div v-if="step === 'upload'" class="max-w-2xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-[var(--color-linear-text)] mb-2">
            上传产品数据表
          </h2>
          <p class="text-[var(--color-linear-text-secondary)]">
            支持 Excel (.xlsx, .xls) 和 CSV 文件，每行代表一个产品
          </p>
        </div>
        <FileUpload @uploaded="handleUploaded" />

        <!-- 使用说明 -->
        <div class="mt-8 grid grid-cols-3 gap-4">
          <div v-for="(tip, i) in [
            { icon: '📁', title: '上传数据', desc: '拖拽或点击选择包含产品信息的 Excel 文件' },
            { icon: '🔗', title: '字段映射', desc: '将 Excel 列名映射到 SDS 标准字段' },
            { icon: '📄', title: '生成 PDF', desc: '单份下载或批量打包，符合 US SDS 标准' },
          ]" :key="i" class="text-center p-4 rounded-2xl bg-[var(--color-linear-bg-secondary)] border border-[var(--color-linear-border)]">
            <div class="text-2xl mb-2">{{ tip.icon }}</div>
            <p class="text-sm font-medium text-[var(--color-linear-text)] mb-1">{{ tip.title }}</p>
            <p class="text-xs text-[var(--color-linear-text-secondary)]">{{ tip.desc }}</p>
          </div>
        </div>
      </div>

      <!-- Step 2: 字段映射 -->
      <div v-else-if="step === 'map'">
        <ColumnMapper
          :headers="excelHeaders"
          :rows="excelRows"
          @mapped="handleMapped"
          @back="step = 'upload'"
        />
      </div>

      <!-- Step 3: 产品列表 -->
      <div v-else-if="step === 'list'">
        <ProductList
          :products="products"
          @select="handleSelectProduct"
          @batch="handleBatch"
          @back="step = 'map'"
        />
      </div>

      <!-- Step 4: 编辑 SDS -->
      <div v-else-if="step === 'edit'">
        <SdsEditor
          :product="currentProduct"
          :index="currentProductIndex"
          @back="step = 'list'"
          @save="handleSaveProduct"
        />
      </div>

      <!-- 批量导出 -->
      <div v-else-if="step === 'batch'">
        <div class="text-center mb-6">
          <h2 class="text-2xl font-bold text-[var(--color-linear-text)]">批量导出</h2>
        </div>
        <BatchExport
          :products="batchProducts"
          @done="step = 'list'"
        />
      </div>
    </main>

    <!-- 底部版权 -->
    <footer class="relative z-10 mt-auto">
      <div class="max-w-6xl mx-auto px-6 py-8 flex justify-center">
        <p class="text-xs text-[var(--color-linear-text-secondary)] font-light tracking-widest" style="opacity: 0.2;">
          亚声威格 © AI 创新 2026
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.step-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-linear-text-tertiary);
  flex-shrink: 0;
}
.step-item--active {
  color: var(--color-linear-accent);
}
.step-item--done {
  color: var(--color-linear-success);
}

.step-num {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 50%;
  background: var(--color-linear-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
}
.step-item--active .step-num {
  background: var(--color-linear-accent);
  color: white;
}
.step-item--done .step-num {
  background: var(--color-linear-success);
  color: white;
}
</style>
