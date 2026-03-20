<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  products: { type: Array, default: () => [] },
})
const emit = defineEmits(['select', 'edit', 'batch', 'back'])

const searchQuery = ref('')
const selectedIds = ref(new Set())

const filtered = computed(() => {
  if (!searchQuery.value.trim()) return props.products
  const q = searchQuery.value.toLowerCase()
  return props.products.filter((p, i) =>
    (p.product_name || '').toLowerCase().includes(q) ||
    (p.product_code || '').toLowerCase().includes(q)
  )
})

function toggleSelect(idx) {
  if (selectedIds.value.has(idx)) {
    selectedIds.value.delete(idx)
  } else {
    selectedIds.value.add(idx)
  }
  // 触发响应
  selectedIds.value = new Set(selectedIds.value)
}

function selectAll() {
  filtered.value.forEach((_, i) => selectedIds.value.add(i))
  selectedIds.value = new Set(selectedIds.value)
}

function clearSelect() {
  selectedIds.value.clear()
  selectedIds.value = new Set(selectedIds.value)
}

const selectedProducts = computed(() =>
  [...selectedIds.value].map(i => props.products[i]).filter(Boolean)
)
</script>

<template>
  <div class="fade-in-up space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-xl font-semibold text-[var(--color-linear-text)]">产品列表</h2>
        <p class="text-sm text-[var(--color-linear-text-secondary)] mt-1">
          共 {{ products.length }} 条产品数据，点击产品编辑并生成 SDS
        </p>
      </div>
      <div class="flex gap-2">
        <button class="btn-secondary text-sm" @click="emit('back')">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
          </svg>
          重新映射
        </button>
        <button
          v-if="selectedIds.size > 0"
          class="btn-primary text-sm"
          @click="emit('batch', selectedProducts)"
        >
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
          批量下载 ({{ selectedIds.size }})
        </button>
      </div>
    </div>

    <!-- 搜索 + 全选 -->
    <div class="flex gap-3 items-center">
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-linear-text-tertiary)]" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索产品名称..."
          class="input-field w-full pl-9 text-sm"
        />
      </div>
      <button class="btn-secondary text-sm" @click="selectAll">全选</button>
      <button v-if="selectedIds.size > 0" class="btn-secondary text-sm" @click="clearSelect">取消</button>
    </div>

    <!-- 产品列表 -->
    <div class="space-y-2">
      <div
        v-for="(product, idx) in filtered"
        :key="idx"
        class="product-card"
        :class="{ 'product-card--selected': selectedIds.has(idx) }"
        @click="emit('select', { product, index: idx })"
      >
        <div class="flex items-center gap-3">
          <!-- 复选框 -->
          <div
            class="checkbox"
            :class="{ 'checkbox--checked': selectedIds.has(idx) }"
            @click.stop="toggleSelect(idx)"
          >
            <svg v-if="selectedIds.has(idx)" class="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
              <path d="M10.28 2.28L3.989 9.262 1.695 6.978A1 1 0 00.28 8.393l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z"/>
            </svg>
          </div>

          <!-- 产品信息 -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-[var(--color-linear-text)] truncate">
              {{ product.product_name || `产品 #${idx + 1}` }}
            </p>
            <p class="text-xs text-[var(--color-linear-text-secondary)] mt-0.5">
              <span v-if="product.product_code">编号：{{ product.product_code }} &nbsp;·&nbsp;</span>
              <span>{{ Object.keys(product).filter(k => product[k]).length }} 个字段已填写</span>
            </p>
          </div>

          <!-- 操作按钮 -->
          <div class="flex items-center gap-2" @click.stop>
            <button
              class="icon-btn text-[var(--color-linear-accent)]"
              title="编辑并生成 SDS"
              @click="emit('select', { product, index: idx })"
            >
              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <p v-if="filtered.length === 0" class="text-center text-[var(--color-linear-text-tertiary)] py-8">
        没有找到匹配的产品
      </p>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  background: var(--color-linear-surface);
  border: 1px solid var(--color-linear-border);
  border-radius: 0.875rem;
  padding: 0.875rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
}
.product-card:hover {
  border-color: var(--color-linear-accent);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-linear-accent) 15%, transparent);
}
.product-card--selected {
  border-color: var(--color-linear-accent);
  background: color-mix(in srgb, var(--color-linear-accent) 5%, var(--color-linear-surface));
}

.checkbox {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--color-linear-border);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.checkbox--checked {
  background: var(--color-linear-accent);
  border-color: var(--color-linear-accent);
  color: white;
}

.icon-btn {
  padding: 0.375rem;
  border-radius: 0.5rem;
  transition: all 0.15s;
  background: transparent;
  border: none;
  cursor: pointer;
}
.icon-btn:hover {
  background: var(--color-linear-bg-secondary);
}

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
</style>
