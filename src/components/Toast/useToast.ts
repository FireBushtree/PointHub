import { useCallback, useState } from 'react'

interface ToastState {
  id: number
  message: string
  type: 'success' | 'error'
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success')
  }, [showToast])

  const showError = useCallback((message: string) => {
    showToast(message, 'error')
  }, [showToast])

  return {
    toasts,
    showSuccess,
    showError,
    removeToast
  }
}