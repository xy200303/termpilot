<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ version: string }>()

const { t } = useI18n()
const base = 'https://github.com/xy200303/termpilot/releases/latest/download'
const file = (name: string) => `${base}/${name}`
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>{{ t('download.table.platform') }}</th>
        <th>{{ t('download.table.installer') }}</th>
        <th>{{ t('download.table.portable') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{{ t('download.table.windows') }}</td>
        <td><a :href="file(`TermPilot.Setup.${version}.exe`)">TermPilot.Setup.{{ version }}.exe</a></td>
        <td><a :href="file(`TermPilot-${version}-win.zip`)">TermPilot-{{ version }}-win.zip</a></td>
      </tr>
      <tr>
        <td>{{ t('download.table.mac') }}</td>
        <td><a :href="file(`TermPilot-${version}-arm64.dmg`)">TermPilot-{{ version }}-arm64.dmg</a></td>
        <td><a :href="file(`TermPilot-${version}-arm64-mac.zip`)">TermPilot-{{ version }}-arm64-mac.zip</a></td>
      </tr>
      <tr>
        <td>{{ t('download.table.linux') }}</td>
        <td><a :href="file(`termpilot_${version}_amd64.deb`)">termpilot_{{ version }}_amd64.deb</a></td>
        <td><a :href="file(`TermPilot-${version}.AppImage`)">TermPilot-{{ version }}.AppImage</a></td>
      </tr>
    </tbody>
  </table>
</template>
