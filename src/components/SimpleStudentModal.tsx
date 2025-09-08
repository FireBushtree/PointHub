import type { Student } from '../types'
import { useEffect, useState } from 'react'

interface SimpleStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string, studentNumber: string, points: number }) => void
  studentData?: Student | null
}

export default function SimpleStudentModal({ isOpen, onClose, onSubmit, studentData }: SimpleStudentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    studentNumber: '',
    points: 0,
  })

  useEffect(() => {
    if (studentData) {
      setFormData({
        name: studentData.name,
        studentNumber: studentData.studentNumber,
        points: studentData.points,
      })
    }
    else {
      setFormData({
        name: '',
        studentNumber: '',
        points: 0,
      })
    }
  }, [studentData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.studentNumber.trim())
      return

    onSubmit({
      name: formData.name.trim(),
      studentNumber: formData.studentNumber.trim(),
      points: formData.points,
    })
    onClose()
  }

  if (!isOpen)
    return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {studentData ? '编辑学生' : '新增学生'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学生姓名 *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入学生姓名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学号 *
            </label>
            <input
              type="text"
              required
              value={formData.studentNumber}
              onChange={e => setFormData({ ...formData, studentNumber: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入学号"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              积分 *
            </label>
            <input
              type="number"
              required
              value={formData.points}
              onChange={e => setFormData({ ...formData, points: Number(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入积分"
              min="0"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm cursor-pointer"
            >
              {studentData ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
