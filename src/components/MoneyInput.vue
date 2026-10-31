<script setup>
import { ref, watch } from "vue";
import { normalizeMoneyInput } from "@/utils/formatters";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  modelValue: { type: [Number, String], default: "" },
  allowNegative: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);
const display = ref("");
let lastEmitted;
watch(
  () => props.modelValue,
  (value) => {
    if (value === lastEmitted) return;
    display.value = normalizeMoneyInput(
      String(value ?? "").replace(".", ","),
      props.allowNegative,
    ).display;
  },
  { immediate: true },
);
function update(event) {
  const result = normalizeMoneyInput(event.target.value, props.allowNegative);
  display.value = result.display;
  event.target.value = result.display;
  lastEmitted = result.value;
  emit("update:modelValue", result.value);
}
</script>

<template>
  <span class="relative block">
    <span
      class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none"
      aria-hidden="true"
      >Rp</span
    >
    <input
      v-bind="$attrs"
      :value="display"
      @input="update"
      type="text"
      inputmode="decimal"
      style="padding-left: 2.75rem"
    />
  </span>
</template>
