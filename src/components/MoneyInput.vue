<script setup>
import { ref, watch } from "vue";
import { normalizeMoneyInput } from "@/utils/formatters";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  modelValue: { type: [Number, String], default: "" },
  allowNegative: { type: Boolean, default: false },
  precision: { type: Number, default: 2 },
  showPrefix: { type: Boolean, default: true },
  min: { type: [Number, String], default: undefined },
  max: { type: [Number, String], default: undefined },
  step: { type: [Number, String], default: undefined },
});
const emit = defineEmits(["update:modelValue"]);
const display = ref("");
const inputElement = ref(null);
let lastEmitted;

function validateValue(input, value) {
  if (!input) return;
  if (value === "") {
    input.setCustomValidity("");
    return;
  }

  const numericValue = Number(value);
  const min = props.min == null ? null : Number(props.min);
  const max = props.max == null ? null : Number(props.max);
  const step =
    props.step == null || props.step === "any" ? null : Number(props.step);
  const stepBase = min ?? 0;
  const stepPosition = step ? (numericValue - stepBase) / step : 0;
  const stepMismatch =
    step && Math.abs(stepPosition - Math.round(stepPosition)) > 1e-8;

  input.setCustomValidity(
    (min != null && numericValue < min) ||
      (max != null && numericValue > max) ||
      stepMismatch
      ? "Masukkan nominal sesuai batas dan satuan yang ditentukan."
      : "",
  );
}

watch(
  () => [props.modelValue, props.allowNegative, props.precision],
  ([value]) => {
    const isSameEmittedValue =
      lastEmitted !== undefined &&
      (String(value ?? "") === String(lastEmitted) ||
        (String(value ?? "") !== "" &&
          Number.isFinite(Number(value)) &&
          Number(value) === Number(lastEmitted)));
    if (isSameEmittedValue) return;
    lastEmitted = undefined;
    display.value = normalizeMoneyInput(
      String(value ?? "").replace(".", ","),
      props.allowNegative,
      props.precision,
    ).display;
    validateValue(inputElement.value, value == null ? "" : String(value));
  },
  { immediate: true },
);
function update(event) {
  const result = normalizeMoneyInput(
    event.target.value,
    props.allowNegative,
    props.precision,
  );
  display.value = result.display;
  event.target.value = result.display;
  validateValue(event.target, result.value);
  lastEmitted = result.value;
  emit("update:modelValue", result.value);
}
</script>

<template>
  <span class="money-input-shell relative block">
    <span
      v-if="showPrefix"
      class="money-input-prefix absolute left-3 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none"
      aria-hidden="true"
      >Rp</span
    >
    <input
      ref="inputElement"
      v-bind="$attrs"
      :min="min"
      :max="max"
      :step="step"
      :value="display"
      @input="update"
      type="text"
      inputmode="decimal"
      :style="{ paddingLeft: showPrefix ? '2.75rem' : '0.5rem' }"
    />
  </span>
</template>
