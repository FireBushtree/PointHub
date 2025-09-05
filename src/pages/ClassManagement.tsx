import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Class } from '../types'
import { classApi } from '../services/api'
import ClassCard from '../components/ClassCard'
import ClassModal from '../components/ClassModal'

export default function ClassManagement() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)

  useEffect(() => {
    loadClasses()
  }, [])

  const loadClasses = async () => {
    try {
      setLoading(true)
      const data = await classApi.getAll()
      setClasses(data)
    } catch (error) {
      console.error('Failed to load classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClassClick = (classId: string) => {
    navigate(`/class/${classId}`)
  }

  const handleCreate = () => {
    setEditingClass(null)
    setModalOpen(true)
  }

  const handleEdit = (classData: Class) => {
    setEditingClass(classData)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个班级吗？删除后该班级下的所有学生信息也将被删除。')) {
      return
    }

    try {
      await classApi.delete(id)
      await loadClasses()
    } catch (error) {
      console.error('Failed to delete class:', error)
      alert('删除失败，请重试')
    }
  }

  const handleSubmit = async (data: Omit<Class, 'id' | 'createdAt' | 'studentCount'>) => {
    try {
      if (editingClass) {
        await classApi.update(editingClass.id, data)
      } else {
        await classApi.create(data)
      }
      await loadClasses()
    } catch (error) {
      console.error('Failed to save class:', error)
      alert('保存失败，请重试')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">班级管理</h1>
            <p className="text-gray-600 mt-2">管理所有班级信息</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>新增班级</span>
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无班级</h3>
            <p className="text-gray-600 mb-6">开始创建第一个班级吧</p>
            <button
              onClick={handleCreate}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              新增班级
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classData) => (
              <ClassCard
                key={classData.id}
                classData={classData}
                onClick={handleClassClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <ClassModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          classData={editingClass}
        />
      </div>
    </div>
  )
}