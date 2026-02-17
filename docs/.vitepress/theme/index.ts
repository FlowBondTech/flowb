import DefaultTheme from 'vitepress/theme'
import RefreshDocs from './RefreshDocs.vue'
import './custom.css'
import type { Theme } from 'vitepress'
import { h } from 'vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(RefreshDocs),
    })
  },
} satisfies Theme
