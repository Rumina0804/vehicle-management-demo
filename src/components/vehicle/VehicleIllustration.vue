<script setup lang="ts">
import { computed, useId } from 'vue'
import type { BodyKind, SizeClass } from '@/types'

/**
 * 車両イラスト（側面図・右向き）。
 * デモでは実車写真の代わりに、車両タイプに応じた形状を描画します。
 */
const props = withDefaults(
  defineProps<{
    kind: BodyKind
    size?: SizeClass
    /** 車体色のバリエーション（車両IDから決定） */
    seed?: string
    mirrored?: boolean
    showShadow?: boolean
  }>(),
  { size: 'M', seed: '', mirrored: false, showShadow: true },
)

const gid = useId()
const url = (n: string) => `url(#${gid}-${n})`

const LIGHT_KINDS: BodyKind[] = ['van', 'minivan', 'sedan', 'kei']
const isLight = computed(() => LIGHT_KINDS.includes(props.kind))

/** 乗用・バンの車体色（白・シルバー・淡いブルー） */
const paint = computed(() => {
  const h = [...props.seed].reduce((s, c) => s + c.charCodeAt(0), 0) % 3
  return [
    { a: '#ffffff', b: '#dbe4ef' },
    { a: '#f1f4f8', b: '#b7c2cf' },
    { a: '#eef5ff', b: '#b7cdea' },
  ][h]!
})

/** トラック系の後輪位置 */
const rearWheels = computed(() => {
  if (props.size === 'L') return [64, 92]
  if (props.size === 'S') return [96]
  return [84]
})

const tankStart = computed(() => (props.size === 'L' ? 16 : 42))
</script>

<template>
  <svg viewBox="0 0 240 120" class="block" role="img" :aria-label="`${kind} のイラスト`">
    <defs>
      <linearGradient :id="`${gid}-cab`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" stop-color="#d9e2ee" />
      </linearGradient>
      <linearGradient :id="`${gid}-paint`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="paint.a" />
        <stop offset="1" :stop-color="paint.b" />
      </linearGradient>
      <linearGradient :id="`${gid}-glass`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1e3a68" />
        <stop offset="0.6" stop-color="#3f679f" />
        <stop offset="1" stop-color="#8fb0dc" />
      </linearGradient>
      <linearGradient :id="`${gid}-alu`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fbfcfe" />
        <stop offset="1" stop-color="#cbd6e3" />
      </linearGradient>
      <linearGradient :id="`${gid}-steel`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#dfe5ec" />
        <stop offset="1" stop-color="#9aa7b7" />
      </linearGradient>
      <linearGradient :id="`${gid}-tank`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="0.45" stop-color="#e7edf4" />
        <stop offset="1" stop-color="#b3c1d2" />
      </linearGradient>
      <linearGradient :id="`${gid}-water`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#eaf4ff" />
        <stop offset="1" stop-color="#9fc0e6" />
      </linearGradient>
      <linearGradient :id="`${gid}-boom`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#4b95f5" />
        <stop offset="1" stop-color="#1d5fc9" />
      </linearGradient>
    </defs>

    <g :transform="mirrored ? 'translate(240 0) scale(-1 1)' : undefined">
      <ellipse v-if="showShadow" cx="120" cy="107" rx="112" ry="5" fill="#0b2a5b" opacity="0.13" />

      <!-- ===== トラック系 ===== -->
      <template v-if="!isLight">
        <!-- シャシー -->
        <rect x="12" y="84" width="204" height="7" rx="1.5" fill="#3a4350" />

        <!-- ウイング / 箱型 -->
        <template v-if="kind === 'wing' || kind === 'box' || kind === 'smallbox'">
          <g v-for="b in [kind === 'wing' ? { x: 10, y: 20, w: 154, h: 66 } : kind === 'box' ? { x: 38, y: 28, w: 126, h: 58 } : { x: 64, y: 40, w: 100, h: 46 }]" :key="b.x">
            <rect :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="2" :fill="url('alu')" stroke="#a9b8cb" />
            <rect :x="b.x" :y="b.y" :width="b.w" height="4" fill="#c4d0de" />
            <path v-if="kind === 'wing'" :d="`M${b.x} ${b.y + 10} H${b.x + b.w}`" stroke="#b4c2d4" />
            <path
              v-for="i in Math.floor(b.w / 26)"
              :key="i"
              :d="`M${b.x + i * 26} ${b.y + 12} V${b.y + b.h - 6}`"
              stroke="#d5dee9"
            />
            <rect :x="b.x" :y="b.y + b.h - 6" :width="b.w" height="6" fill="#95a5b9" />
            <g :transform="`translate(${b.x + b.w / 2 - 26} ${b.y + b.h / 2 - 9})`">
              <path d="M0 16 L6 0 H11 L5 16 Z" fill="#1b66d6" />
              <path d="M9 16 L15 0 H20 L14 16 Z" fill="#4c8ef0" />
              <text x="24" y="13" font-size="12" font-weight="900" font-style="italic" fill="#0b2a5b" letter-spacing="0.5">DOUKO</text>
            </g>
          </g>
        </template>

        <!-- 平ボディ -->
        <template v-else-if="kind === 'flat'">
          <rect x="40" y="72" width="124" height="13" fill="#c9d2dd" stroke="#99a7b8" />
          <path d="M40 78 H164" stroke="#aab6c5" />
          <rect x="156" y="44" width="8" height="28" fill="#99a7b8" />
          <rect x="150" y="44" width="20" height="4" fill="#7d8b9d" />
        </template>

        <!-- ダンプ -->
        <template v-else-if="kind === 'dump'">
          <path d="M28 44 H162 V86 H38 Z" :fill="url('steel')" stroke="#7f8c9e" />
          <rect x="28" y="42" width="134" height="5" fill="#6f7c8e" />
          <path v-for="x in [54, 80, 106, 132]" :key="x" :d="`M${x} 47 V86`" stroke="#8592a3" stroke-width="2" />
          <path d="M156 42 L170 30 H178 V36 L164 46 Z" fill="#8a97a8" />
        </template>

        <!-- ミキサー -->
        <template v-else-if="kind === 'mixer'">
          <rect x="34" y="78" width="130" height="7" fill="#6b7686" />
          <path d="M42 60 C40 40 74 28 112 30 L152 38 C164 42 166 70 154 76 L112 84 C74 90 44 80 42 60 Z" :fill="url('tank')" stroke="#97a5b8" />
          <path d="M72 34 C84 48 84 70 76 86" stroke="#1b66d6" stroke-width="5" fill="none" opacity="0.85" />
          <path d="M102 31 C114 46 114 70 106 86" stroke="#1b66d6" stroke-width="5" fill="none" opacity="0.85" />
          <path d="M132 34 C142 48 142 68 136 80" stroke="#1b66d6" stroke-width="5" fill="none" opacity="0.85" />
          <path d="M26 36 L42 44 L42 56 L26 50 Z" fill="#8995a6" />
          <rect x="152" y="66" width="12" height="16" rx="2" fill="#5d6b7d" />
        </template>

        <!-- クレーン（ユニック・トラッククレーン） -->
        <template v-else-if="kind === 'crane'">
          <rect x="26" y="74" width="126" height="11" fill="#c9d2dd" stroke="#99a7b8" />
          <rect x="150" :y="size === 'L' ? 34 : 40" width="15" :height="size === 'L' ? 52 : 46" rx="2" :fill="url('boom')" />
          <path
            :d="size === 'L' ? 'M162 38 L14 50 L14 60 L162 48 Z' : 'M160 44 L36 54 L36 62 L160 52 Z'"
            :fill="url('boom')"
            stroke="#164fae"
          />
          <path :d="size === 'L' ? 'M112 43 v10 M64 47 v10' : 'M118 48 v8 M78 51 v8'" stroke="#164fae" />
          <path :d="size === 'L' ? 'M16 60 v10' : 'M38 62 v8'" stroke="#2b3442" stroke-width="1.5" />
          <circle :cx="size === 'L' ? 16 : 38" :cy="size === 'L' ? 72 : 72" r="2.6" fill="#2b3442" />
          <rect v-if="size === 'L'" x="40" y="84" width="14" height="6" fill="#f0a020" />
          <rect v-if="size === 'L'" x="128" y="84" width="14" height="6" fill="#f0a020" />
        </template>

        <!-- 強力吸引車・吸引洗浄兼用車 -->
        <template v-else-if="kind === 'vacuum'">
          <rect :x="tankStart" y="34" :width="150 - tankStart" height="50" rx="24" :fill="url('tank')" stroke="#9fb0c6" />
          <circle :cx="tankStart + 9" cy="59" r="22" fill="none" stroke="#8ea0b8" stroke-width="2.4" />
          <circle :cx="tankStart + 9" cy="59" r="6" fill="#b9c6d6" />
          <path
            v-for="x in (size === 'L' ? [56, 92, 126] : [78, 112])"
            :key="x"
            :d="`M${x} 35 V83`"
            stroke="#c2cdda"
            stroke-width="2"
          />
          <rect :x="tankStart + 4" y="58" :width="146 - tankStart" height="5" fill="#1b66d6" opacity="0.9" />
          <rect x="150" y="42" width="16" height="44" rx="2" fill="#5f6e82" />
          <circle cx="158" cy="54" r="4" fill="#d6dee8" />
          <path :d="`M${tankStart + 24} 34 Q ${tankStart + 60} 18 146 30`" stroke="#f08a24" stroke-width="5" fill="none" stroke-linecap="round" />
        </template>

        <!-- 高圧洗浄車 -->
        <template v-else-if="kind === 'washer'">
          <rect x="52" y="46" width="70" height="38" rx="10" :fill="url('tank')" stroke="#9fb0c6" />
          <rect x="52" y="62" width="70" height="4" fill="#1b66d6" opacity="0.9" />
          <rect x="122" y="40" width="44" height="46" rx="3" fill="#e2e8f0" stroke="#9fb0c6" />
          <path d="M130 48 H158 M130 54 H158 M130 60 H158" stroke="#b6c3d3" stroke-width="2" />
          <rect x="18" y="80" width="34" height="5" fill="#6b7686" />
          <circle cx="34" cy="60" r="20" fill="#3b4656" />
          <circle cx="34" cy="60" r="14" fill="none" stroke="#f08a24" stroke-width="6" />
          <circle cx="34" cy="60" r="4.5" fill="#cbd5e1" />
        </template>

        <!-- 高所作業車 -->
        <template v-else-if="kind === 'aerial'">
          <rect x="40" y="76" width="124" height="9" fill="#c9d2dd" stroke="#99a7b8" />
          <rect x="132" y="64" width="22" height="12" rx="2" fill="#e8a317" />
          <path d="M146 64 L44 50 L44 58 L146 72 Z" fill="#f5c542" stroke="#cf960b" />
          <rect x="20" y="44" width="24" height="22" rx="2" fill="#f7f9fc" stroke="#97a6b8" stroke-width="1.5" />
          <path d="M20 52 H44" stroke="#97a6b8" />
        </template>

        <!-- 散水車 -->
        <template v-else-if="kind === 'tank'">
          <rect x="22" y="38" width="140" height="46" rx="23" :fill="url('water')" stroke="#86a9d4" />
          <path v-for="x in [58, 92, 126]" :key="x" :d="`M${x} 39 V83`" stroke="#a9c4e6" stroke-width="2" />
          <rect x="30" y="56" width="124" height="4" fill="#1b66d6" opacity="0.85" />
          <rect x="12" y="82" width="22" height="4" fill="#5d6b7d" />
        </template>

        <!-- セルフローダー -->
        <template v-else-if="kind === 'carrier'">
          <path d="M8 80 L164 75 L164 86 L12 88 Z" fill="#c9d2dd" stroke="#99a7b8" />
          <rect x="156" y="50" width="8" height="25" fill="#99a7b8" />
          <g transform="translate(46 52) scale(0.42)" opacity="0.95">
            <path d="M14 86 Q12 72 24 68 L58 64 Q78 44 100 42 H150 Q172 44 190 62 L218 66 Q230 70 230 80 V86 Z" fill="#c3ccd8" stroke="#8e9bab" stroke-width="2" />
            <circle cx="56" cy="88" r="13" fill="#2b3240" />
            <circle cx="190" cy="88" r="13" fill="#2b3240" />
          </g>
        </template>

        <!-- 泥除け -->
        <path v-for="x in [...rearWheels, 204]" :key="`m${x}`" :d="`M${x - 16} 92 a16 16 0 0 1 32 0`" fill="#2a313b" />

        <!-- キャブ -->
        <g>
          <path d="M166 40 Q166 32 173 32 L210 32 Q219 32 221 41 L226 76 L226 92 L166 92 Z" :fill="url('cab')" stroke="#a6b5c9" />
          <path d="M174 39 L209 39 Q214 39 215 44 L218.5 61 L174 61 Z" :fill="url('glass')" />
          <path d="M174 39 L188 39 L180 61 L174 61 Z" fill="#ffffff" opacity="0.18" />
          <rect x="166" y="65" width="60" height="4" fill="#1b66d6" />
          <rect x="166" y="70" width="60" height="1.6" fill="#7fb0f2" />
          <path d="M172 63 V90" stroke="#c3cfdd" />
          <rect x="188" y="74" width="9" height="2.2" rx="1" fill="#9aa9bb" />
          <rect x="222" y="38" width="4.5" height="14" rx="1.5" fill="#2b3442" />
          <rect x="220" y="77" width="7" height="5" rx="1" fill="#ffd36a" />
          <rect x="164" y="88" width="64" height="7" rx="2" fill="#56657a" />
        </g>

        <!-- タイヤ -->
        <g v-for="x in [...rearWheels, 204]" :key="`w${x}`">
          <circle :cx="x" cy="95" r="12.5" fill="#1b2129" />
          <circle :cx="x" cy="95" r="7" fill="#a7b3c2" />
          <circle :cx="x" cy="95" r="2.6" fill="#4b5563" />
        </g>
      </template>

      <!-- ===== 乗用・バン系 ===== -->
      <template v-else>
        <template v-if="kind === 'van'">
          <path d="M16 90 V48 Q16 36 28 36 H174 Q188 36 196 46 L216 70 Q224 74 224 82 V90 Z" :fill="url('paint')" stroke="#a6b5c9" />
          <path d="M28 43 H84 V60 H28 Z M90 43 H140 V60 H90 Z" :fill="url('glass')" />
          <path d="M146 43 H175 Q182 43 188 49 L201 62 H146 Z" :fill="url('glass')" />
          <rect x="16" y="66" width="208" height="4" fill="#1b66d6" />
          <path d="M143 43 V88 M88 62 V88" stroke="#c3cfdd" />
        </template>
        <template v-else-if="kind === 'minivan'">
          <path d="M18 90 V52 Q18 38 32 37 L160 35 Q178 35 190 46 L214 68 Q226 72 226 82 V90 Z" :fill="url('paint')" stroke="#a6b5c9" />
          <path d="M30 44 H78 V62 H30 Z M84 43 H134 V62 H84 Z" :fill="url('glass')" />
          <path d="M140 42 H162 Q174 42 184 51 L196 63 H140 Z" :fill="url('glass')" />
          <path d="M137 44 V88 M81 64 V88" stroke="#c3cfdd" />
        </template>
        <template v-else-if="kind === 'sedan'">
          <path d="M14 88 Q12 72 24 68 L58 64 Q78 44 100 42 H150 Q172 44 190 62 L218 66 Q230 70 230 80 V88 Z" :fill="url('paint')" stroke="#a6b5c9" />
          <path d="M66 64 Q82 49 100 48 H122 V64 Z" :fill="url('glass')" />
          <path d="M128 48 H150 Q166 49 180 64 H128 Z" :fill="url('glass')" />
          <path d="M125 66 V86" stroke="#c3cfdd" />
          <rect x="222" y="72" width="7" height="4" rx="1" fill="#ffd36a" />
        </template>
        <template v-else>
          <!-- 軽自動車 -->
          <path d="M44 90 V44 Q44 34 54 34 H160 Q172 34 180 44 L198 66 Q204 70 204 78 V90 Z" :fill="url('paint')" stroke="#a6b5c9" />
          <path d="M54 41 H100 V60 H54 Z" :fill="url('glass')" />
          <path d="M106 41 H158 Q166 41 172 48 L184 62 H106 Z" :fill="url('glass')" />
          <path d="M103 41 V88" stroke="#c3cfdd" />
          <rect x="44" y="66" width="160" height="3" fill="#1b66d6" opacity="0.8" />
        </template>

        <!-- 乗用系のタイヤ -->
        <g v-for="x in kind === 'kei' ? [72, 176] : kind === 'sedan' ? [58, 190] : [54, 190]" :key="`lw${x}`">
          <path :d="`M${x - 15} 90 a15 15 0 0 1 30 0`" fill="#2a313b" />
          <circle :cx="x" cy="94" r="12" fill="#1b2129" />
          <circle :cx="x" cy="94" r="6.5" fill="#b4bfcc" />
          <circle :cx="x" cy="94" r="2.4" fill="#4b5563" />
        </g>
      </template>
    </g>
  </svg>
</template>
