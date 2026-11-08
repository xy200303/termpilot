import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import Home from './Home.vue'
import DownloadTable from './components/DownloadTable.vue'
import { i18n } from './i18n'
import { vPress, vLift, vSpot } from './motion/directives'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.use(i18n)
    app.component('Home', Home)
    app.component('DownloadTable', DownloadTable)
    app.directive('press', vPress)
    app.directive('lift', vLift)
    app.directive('spot', vSpot)
  }
} satisfies Theme
