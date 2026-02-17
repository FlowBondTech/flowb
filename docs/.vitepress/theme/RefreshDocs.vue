<script setup>
const workflowUrl = 'https://github.com/FlowBondTech/flowb/actions/workflows/docs.yml'
</script>

<template>
  <a
    :href="workflowUrl"
    target="_blank"
    rel="noopener"
    class="refresh-docs"
    title="Trigger docs regeneration on GitHub Actions"
  >
    Refresh Docs
  </a>
</template>

<style scoped>
.refresh-docs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s;
  cursor: pointer;
  text-decoration: none;
}

.refresh-docs:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
</style>
