<script setup lang="ts">
import { computed } from 'vue'
import VehicleIllustration from './VehicleIllustration.vue'
import { useDbStore } from '@/stores/db'
import type { Vehicle } from '@/types'

const props = withDefaults(defineProps<{ vehicle: Vehicle; size?: 'sm' | 'md' }>(), { size: 'sm' })
const db = useDbStore()
const type = computed(() => db.typeMap.get(props.vehicle.typeId))
const photo = computed(() => props.vehicle.photos[0]?.src)
</script>

<template>
  <span
    class="relative block overflow-hidden rounded-md border border-[#d3deec] bg-gradient-to-b from-[#f2f7fe] to-[#dde8f6]"
    :class="size === 'sm' ? 'h-[38px] w-[68px]' : 'h-[64px] w-[112px]'"
  >
    <img v-if="photo" :src="photo" alt="" class="size-full object-cover" />
    <VehicleIllustration v-else-if="type" :kind="type.bodyKind" :size="type.sizeClass" :seed="vehicle.id" class="absolute inset-x-0.5 bottom-0" />
  </span>
</template>
