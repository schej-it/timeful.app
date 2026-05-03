<template>
  <div>
    <h1>Test</h1>
    <UpgradeDialog :model-value="true" />
  </div>
</template>

<script setup lang="ts">
import UpgradeDialog from "@/components/pricing/UpgradeDialog.vue"

defineOptions({ name: 'AppTest' })
</script>
