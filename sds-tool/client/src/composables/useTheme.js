import { ref } from 'vue'

export function useTheme() {
  const isDark = ref(false)

  function init() {
    const saved = localStorage.getItem('sds_theme')
    if (saved) {
      isDark.value = saved === 'dark'
    } else {
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem('sds_theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  return { isDark, toggle, init }
}
