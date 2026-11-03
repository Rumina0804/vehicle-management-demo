<script setup lang="ts">
import { ref, watch } from 'vue'
import { num, parseIntLoose } from '@/utils/format'

/** 3桁区切りで表示する金額・数値入力 */
const props = withDefaults(
  defineProps<{
    modelValue: number | null
    unit?: string
    invalid?: boolean
    placeholder?: string
    id?: string
    max?: number
  }>(),
  { unit: '円', invalid: false, placeholder: '0', id: undefined, max: 999_999_999 },
)
const emit = defineEmits<{ 'update:modelValue': [number | null] }>()

const text = ref(props.modelValue === null ? '' : num(props.modelValue))
const focused = ref(false)

watch(
  () => props.modelValue,
  (v) => {
    if (!focused.value) text.value = v === null ? '' : num(v)
  },
)

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const n = parseIntLoose(raw)
  const clamped = n === null ? null : Math.min(Math.max(n, 0), props.max)
  text.value = raw
  emit('update:modelValue', clamped)
}

function onFocus() {
  focused.value = true
  text.value = props.modelValue === null ? '' : String(props.modelValue)
}

function onBlur() {
  focused.value = false
  text.value = props.modelValue === null ? '' : num(props.modelValue)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      :id="id"
      :value="text"
      inputmode="numeric"
      autocomplete="off"
      class="input tnum text-right"
      :class="invalid ? 'is-invalid' : ''"
      :placeholder="placeholder"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <span v-if="unit" class="w-6 shrink-0 text-[13px] font-bold text-ink-2">{{ unit }}</span>
  </div>
</template>
