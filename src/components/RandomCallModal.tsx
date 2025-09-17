import type { Student } from '../types'
import { useEffect, useState } from 'react'

interface RandomCallModalProps {
  isOpen: boolean
  onClose: () => void
  students: Student[]
}

export default function RandomCallModal({ isOpen, onClose, students }: RandomCallModalProps) {
  const [isRolling, setIsRolling] = useState(false)
  const [currentName, setCurrentName] = useState('')
  const [finalStudent, setFinalStudent] = useState<Student | null>(null)
  const [rollInterval, setRollInterval] = useState<NodeJS.Timeout | null>(null)

  const startRolling = () => {
    if (students.length === 0)
      return

    setIsRolling(true)
    setFinalStudent(null)

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * students.length)
      setCurrentName(students[randomIndex].name)
    }, 50) // 每50ms切换一次名字

    setRollInterval(interval)
  }

  const stopRolling = () => {
    if (rollInterval) {
      clearInterval(rollInterval)
      setRollInterval(null)
    }

    setIsRolling(false)

    // 最终随机选择一个学生
    const randomIndex = Math.floor(Math.random() * students.length)
    const selectedStudent = students[randomIndex]
    setFinalStudent(selectedStudent)
    setCurrentName(selectedStudent.name)
  }

  const resetAndClose = () => {
    if (rollInterval) {
      clearInterval(rollInterval)
      setRollInterval(null)
    }
    setIsRolling(false)
    setCurrentName('')
    setFinalStudent(null)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      resetAndClose()
    }
  }, [isOpen])

  useEffect(() => {
    return () => {
      if (rollInterval) {
        clearInterval(rollInterval)
      }
    }
  }, [rollInterval])

  if (!isOpen)
    return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">随机点名</h2>
          <button
            onClick={resetAndClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="mb-6">
            <div className={`text-4xl font-bold h-16 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg ${
              isRolling
                ? 'bg-yellow-50 border-yellow-300 animate-pulse'
                : finalStudent ? 'bg-green-50 border-green-300' : 'bg-gray-50'
            }`}
            >
              {currentName || '准备点名...'}
            </div>
          </div>

          {finalStudent && !isRolling && (
            <div className="mb-4 p-4 bg-green-100 rounded-lg">
              <p className="text-green-800 font-medium">
                🎉 选中学生：
                {finalStudent.name}
              </p>
              <p className="text-green-600 text-sm">
                学号：
                {finalStudent.studentNumber}
                {' '}
                | 积分：
                {finalStudent.points}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center space-x-4">
          {!isRolling
            ? (
                <>
                  <button
                    onClick={startRolling}
                    disabled={students.length === 0}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M9 16h1m4 0h1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>开始点名</span>
                  </button>
                </>
              )
            : (
                <button
                  onClick={stopRolling}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6" />
                  </svg>
                  <span>停止</span>
                </button>
              )}
        </div>
      </div>
    </div>
  )
}
