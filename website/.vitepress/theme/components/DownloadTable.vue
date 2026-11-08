<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ version: string; locale?: 'zh' | 'en' }>()

const LABELS = {
  zh: {
    platform: '平台',
    installer: '安装包',
    portable: '免安装',
    windows: 'Windows x64',
    mac: 'macOS（Apple Silicon）',
    linux: 'Linux x64'
  },
  en: {
    platform: 'Platform',
    installer: 'Installer',
    portable: 'Portable',
    windows: 'Windows x64',
    mac: 'macOS (Apple Silicon)',
    linux: 'Linux x64'
  }
}

const labels = computed(() => LABELS[props.locale ?? 'zh'])
const base = 'https://github.com/xy200303/termpilot/releases/latest/download'
const file = (name: string) => `${base}/${name}`
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>{{ labels.platform }}</th>
        <th>{{ labels.installer }}</th>
        <th>{{ labels.portable }}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{{ labels.windows }}</td>
        <td><a :href="file(`TermPilot.Setup.${version}.exe`)">TermPilot.Setup.{{ version }}.exe</a></td>
        <td><a :href="file(`TermPilot-${version}-win.zip`)">TermPilot-{{ version }}-win.zip</a></td>
      </tr>
      <tr>
        <td>{{ labels.mac }}</td>
        <td><a :href="file(`TermPilot-${version}-arm64.dmg`)">TermPilot-{{ version }}-arm64.dmg</a></td>
        <td><a :href="file(`TermPilot-${version}-arm64-mac.zip`)">TermPilot-{{ version }}-arm64-mac.zip</a></td>
      </tr>
      <tr>
        <td>{{ labels.linux }}</td>
        <td><a :href="file(`termpilot_${version}_amd64.deb`)">termpilot_{{ version }}_amd64.deb</a></td>
        <td><a :href="file(`TermPilot-${version}.AppImage`)">TermPilot-{{ version }}.AppImage</a></td>
      </tr>
    </tbody>
  </table>
</template>
