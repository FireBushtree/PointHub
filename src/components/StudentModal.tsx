import { useState, useEffect } from 'react'
import type { Student, Class } from '../types'
import { classApi } from '../services/api'

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Omit<Student, 'id'>) => void
  studentData?: Student | null
}

export default function StudentModal({ isOpen, onClose, onSubmit, studentData }: StudentModalProps) {
  const [classes, setClasses] = useState<Class[]>([])
  const [formData, setFormData] = useState({
    name: '',
    points: 0,
    classId: '',
    className: ''
  })

  useEffect(() => {
    if (isOpen) {
      loadClasses()
    }
  }, [isOpen])

  useEffect(() => {
    if (studentData) {
      setFormData({
        name: studentData.name,
        points: studentData.points,
        classId: studentData.classId,
        className: studentData.className
      })
    } else {
      setFormData({
        name: '',
        points: 0,
        classId: '',
        className: ''
      })
    }
  }, [studentData, isOpen])

  const loadClasses = async () => {
    try {
      const data = await classApi.getAll()
      setClasses(data)
      if (!studentData && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          classId: data[0].id,
          className: data[0].name
        }))
      }
    } catch (error) {
      console.error('Failed to load classes:', error)
    }
  }

  const handleClassChange = (classId: string) => {
    const selectedClass = classes.find(c => c.id === classId)
    setFormData(prev => ({
      ...prev,
      classId,
      className: selectedClass?.name || ''
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.classId) return
    
    onSubmit({
      name: formData.name.trim(),
      points: formData.points,
      classId: formData.classId,
      className: formData.className
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入学生姓名"
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
              onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="请输入积分"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              所属班级 *
            </label>
            <select
              required
              value={formData.classId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              <option value="">请选择班级</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
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
              {studentData ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}