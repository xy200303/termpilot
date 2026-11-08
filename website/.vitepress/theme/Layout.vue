<script setup lang="ts">
import { watch } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { syncLocale } from './i18n'

const { lang } = useData()

/* 先同步一次：构建期预渲染没有响应式副作用，必须在这里直接设好本页语言；
   客户端切换语言时再靠 watch 跟上 */
syncLocale(lang.value)
watch(lang, (value) => syncLocale(value))
</script>

<template>
  <DefaultTheme.Layout />
</template>
