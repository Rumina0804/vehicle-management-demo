import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** 要素の外側クリック・Esc キーで閉じる */
export function useClickOutside(target: Ref<HTMLElement | null>, onOutside: () => void) {
  const onPointer = (e: PointerEvent) => {
    const el = target.value
    if (el && !el.contains(e.target as Node)) onOutside()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onOutside()
  }
  onMounted(() => {
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointer)
    document.removeEventListener('keydown', onKey)
  })
}
