import { useCallback, useState } from 'react'

interface ConfirmState {
  isOpen: boolean
  title?: string
  message: string
  onConfirm?: () => void
}

export function useConfirm() {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    message: '',
  })

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    title?: string,
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm()
    }
    setConfirmState({ isOpen: false, message: '' })
  }, [confirmState.onConfirm])

  const handleCancel = useCallback(() => {
    setConfirmState({ isOpen: false, message: '' })
  }, [])

  return {
    confirmState,
    showConfirm,
    handleConfirm,
    handleCancel,
  }
}
