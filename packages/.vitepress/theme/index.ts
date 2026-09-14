import type { Theme } from 'vitepress'
import TwoSlashFloatingVue from '@shikijs/vitepress-twoslash/client'
import DefaultTheme from 'vitepress/theme'
import Changelog from './components/Changelog.vue'
import Contributors from './components/Contributors.vue'
import DemoContainer from './components/DemoContainer.vue'
import FunctionInfo from './components/FunctionInfo.vue'
import FunctionsList from './components/FunctionsList.vue'
import Note from './components/Note.vue'
import ReloadPrompt from './components/ReloadPrompt.vue'
import '@shikijs/vitepress-twoslash/style.css'
import './styles/main.css'
import './styles/vars.css'
import './styles/overrides.css'
import './styles/demo.css'
import './styles/utils.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Renders the twoslash output computed at build time: the floating panel
    // component the transformer's `<v-menu>` markup expects.
    app.use(TwoSlashFloatingVue)
    app.component('DemoContainer', DemoContainer)
    app.component('FunctionInfo', FunctionInfo)
    app.component('FunctionsList', FunctionsList)
    app.component('Note', Note)
    app.component('Contributors', Contributors)
    app.component('Changelog', Changelog)
    app.component('ReloadPrompt', ReloadPrompt)
  },
} satisfies Theme
