import { useState, useEffect } from 'react'
import type { Class } from '../types'

interface ClassModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<Class, 'id' | 'createdAt' | 'studentCount'>) => void
  classData?: Class | null
}

export default function ClassModal({ isOpen, onClose, onSubmit, classData }: ClassModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (classData) {
      setFormData({
        name: classData.name,
        description: classData.description || ''
      })
    } else {
      setFormData({
        name: '',
        description: ''
      })
    }
  }, [classData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      studentCount: classData?.studentCount || 0
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {classData ? '编辑班级' : '新增班级'}
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
              班级名称 *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入班级名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              班级描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="请输入班级描述（可选）"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              {classData ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}