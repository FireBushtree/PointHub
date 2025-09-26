import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { classApi } from '../services/tauriApi'
import ClassShop from '../components/ClassShop'
import type { Class } from '../types'

export default function ClassShopPage() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [loading, setLoading] = useState(true)

  const loadClassInfo = async () => {
    if (!classId) return

    try {
      setLoading(true)
      const classesData = await classApi.getAll()
      const currentClass = classesData.find(c => c.id === classId)

      if (!currentClass) {
        navigate('/')
        return
      }

      setClassInfo(currentClass)
    } catch (error) {
      console.error('Failed to load class info:', error)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (classId) {
      loadClassInfo()
    }
  }, [classId])

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

  if (!classInfo || !classId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">班级不存在</h1>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <ClassShop
      classId={classId}
      className={classInfo.name}
      onBackToStudents={() => navigate(`/class/${classId}/students`)}
    />
  )
}