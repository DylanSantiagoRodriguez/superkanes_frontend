import { useEffect } from 'react'
export function canNavigate() {
  return document.dispatchEvent(
    new Event('superkanes:before-navigation', { cancelable: true })
  )
}
export function useUnsavedGuard(dirty: boolean, onBlocked?: () => void) {
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const navigation = (event: Event) => {
      event.preventDefault()
      onBlocked?.()
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('superkanes:before-navigation', navigation)
    return () => {
      window.removeEventListener('beforeunload', unload)
      document.removeEventListener('superkanes:before-navigation', navigation)
    }
  }, [dirty, onBlocked])
}
