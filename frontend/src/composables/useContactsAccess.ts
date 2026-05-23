import { ref } from "vue"
import { get } from "@/utils"

function isContactsAccessError(error: unknown): boolean {
  const code = (error as { error?: { code?: number } }).error?.code
  return code === 401 || code === 403
}

export function useContactsAccess() {
  const hasContactsAccess = ref(true)

  async function probeContactsAccess(): Promise<void> {
    try {
      await get("/user/searchContacts?query=")
      hasContactsAccess.value = true
    } catch (error) {
      if (isContactsAccessError(error)) {
        hasContactsAccess.value = false
      }
    }
  }

  return {
    hasContactsAccess,
    probeContactsAccess,
  }
}
