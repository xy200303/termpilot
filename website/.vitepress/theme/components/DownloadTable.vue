<script setup lang="ts">
import { DOWNLOADS, VERSION } from '../../data/site'
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>平台</th>
        <th>安装包</th>
        <th>免安装</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Windows x64</td>
        <td>
          <a :href="DOWNLOADS.win.setup">TermPilot.Setup.{{ VERSION }}.exe</a>
          <span class="size">143MB</span>
        </td>
        <td>
          <a :href="DOWNLOADS.win.portable">TermPilot-{{ VERSION }}-win.zip</a>
          <span class="size">194MB</span>
        </td>
      </tr>
      <tr>
        <td>macOS（Apple Silicon）</td>
        <td>
          <a :href="DOWNLOADS.mac.dmg">TermPilot-{{ VERSION }}-arm64.dmg</a>
          <span class="size">164MB</span>
        </td>
        <td>
          <a :href="DOWNLOADS.mac.zip">TermPilot-{{ VERSION }}-arm64-mac.zip</a>
          <span class="size">165MB</span>
        </td>
      </tr>
      <tr>
        <td>Linux x64</td>
        <td>
          <a :href="DOWNLOADS.linux.deb">termpilot_{{ VERSION }}_amd64.deb</a>
          <span class="size">126MB</span>
        </td>
        <td>
          <a :href="DOWNLOADS.linux.appimage">TermPilot-{{ VERSION }}.AppImage</a>
          <span class="size">163MB</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.size {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--yc-ink-400);
}
</style>
