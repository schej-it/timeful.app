import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  type CSSProperties,
  type Ref,
} from "vue"

interface SignUpBlocksListViewport {
  containerStyle: Readonly<Ref<CSSProperties | undefined>>
  desktopScrollContainer: Readonly<Ref<HTMLElement | null>>
  hasMounted: Readonly<Ref<boolean>>
  scrollableSection: Ref<HTMLElement | null>
  signUpBlocksScrollView: Ref<HTMLElement | null>
  scrollToSignUpBlock: (id: string) => void
}

const DESKTOP_BOTTOM_OFFSET_PX = 32
const SIGN_UP_BLOCKS_LIST_MIN_HEIGHT_PX = 400

export function useSignUpBlocksListViewport(
  isPhone: Readonly<Ref<boolean>>
): SignUpBlocksListViewport {
  const scrollableSection = ref<HTMLElement | null>(null)
  const signUpBlocksScrollView = ref<HTMLElement | null>(null)
  const desktopMaxHeight = ref(0)
  const hasMounted = ref(false)

  const signUpBlocksListMaxHeight = computed(() =>
    Math.max(desktopMaxHeight.value, SIGN_UP_BLOCKS_LIST_MIN_HEIGHT_PX)
  )

  const containerStyle = computed<CSSProperties | undefined>(() =>
    isPhone.value
      ? undefined
      : {
          maxHeight: `${String(signUpBlocksListMaxHeight.value)}px`,
        }
  )

  const desktopScrollContainer = computed(() =>
    isPhone.value ? null : signUpBlocksScrollView.value
  )

  function setDesktopMaxHeight() {
    const el = scrollableSection.value
    if (!el) {
      desktopMaxHeight.value = 0
      return
    }

    const { top } = el.getBoundingClientRect()
    desktopMaxHeight.value = window.innerHeight - top - DESKTOP_BOTTOM_OFFSET_PX
  }

  function scrollToSignUpBlock(id: string) {
    const scrollView = signUpBlocksScrollView.value
    if (!scrollView) {
      return
    }

    const targetBlock = scrollView.querySelector<HTMLElement>(`[data-id='${id}']`)
    if (!targetBlock) {
      return
    }

    const scrollTop = targetBlock.offsetTop - scrollView.offsetTop
    scrollView.scrollTo({ top: scrollTop, behavior: "smooth" })
  }

  onMounted(() => {
    setDesktopMaxHeight()
    addEventListener("resize", setDesktopMaxHeight)
    void nextTick(() => {
      hasMounted.value = true
    })
  })

  onUnmounted(() => {
    removeEventListener("resize", setDesktopMaxHeight)
  })

  return {
    containerStyle,
    desktopScrollContainer,
    hasMounted,
    scrollableSection,
    signUpBlocksScrollView,
    scrollToSignUpBlock,
  }
}
