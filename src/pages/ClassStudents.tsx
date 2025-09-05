import type { Class, Student } from '../types'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SimpleStudentModal from '../components/SimpleStudentModal'
import { ToastContainer, useToast } from '../components/Toast'
import { classApi, studentApi } from '../services/tauriApi'

export default function ClassStudents() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { toasts, showSuccess, showError, removeToast } = useToast()

  const loadData = async () => {
    if (!classId)
      return

    try {
      setLoading(true)
      const [studentsData, classesData] = await Promise.all([
        studentApi.getByClass(classId),
        classApi.getAll(),
      ])

      const currentClass = classesData.find(c => c.id === classId)
      if (!currentClass) {
        navigate('/')
        return
      }

      setClassInfo(currentClass)
      setStudents(studentsData)
    }
    catch (error) {
      console.error('Failed to load data:', error)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (classId) {
      loadData()
    }
  }, [classId])

  const handleCreate = () => {
    setEditingStudent(null)
    setModalOpen(true)
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个学生吗？')) {
      return
    }

    try {
      await studentApi.delete(id)
      await loadData()
    }
    catch (error) {
      console.error('Failed to delete student:', error)
      showError('删除失败，请重试')
    }
  }

  const handleSubmit = async (data: { name: string, points: number }) => {
    try {
      const studentData = {
        ...data,
        classId: classId!,
        className: classInfo!.name,
      }

      if (editingStudent) {
        await studentApi.update(editingStudent.id, studentData)
        showSuccess('学生修改成功')
      }
      else {
        await studentApi.create(studentData)
        showSuccess('学生创建成功')
      }
      await loadData()
      setModalOpen(false)
    }
    catch (error) {
      console.error('Failed to save student:', error)
      showError('保存失败，请重试')
    }
  }

  const handlePointsChange = async (student: Student, delta: number) => {
    const newPoints = Math.max(0, student.points + delta)

    // 立即更新前端状态
    setStudents(prev => prev.map(s =>
      s.id === student.id ? { ...s, points: newPoints } : s,
    ))

    try {
      await studentApi.update(student.id, { points: newPoints })
    }
    catch (error) {
      console.error('Failed to update points:', error)
      // 失败时回滚到原来的积分
      setStudents(prev => prev.map(s =>
        s.id === student.id ? { ...s, points: student.points } : s,
      ))
      showError('积分更新失败，请重试')
    }
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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

  if (!classInfo) {
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classInfo.name}</h1>
              <p className="text-gray-600">班级学生管理</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <span>
                {students.length}
                {' '}
                名学生
              </span>
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1.5 text-sm cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>添加学生</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <input
              type="text"
              placeholder="搜索学生姓名..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {filteredStudents.length === 0
            ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? '未找到匹配的学生' : '暂无学生'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm ? '请尝试其他搜索条件' : '开始添加第一个学生吧'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleCreate}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm cursor-pointer"
                    >
                      添加学生
                    </button>
                  )}
                </div>
              )
            : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          姓名
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          积分
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {student.name.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {student.points}
                                {' '}
                                分
                              </span>
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handlePointsChange(student, 1)}
                                  className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-600 rounded flex items-center justify-center transition-colors cursor-pointer"
                                  title="加1分"
                                >
                                  <span className="text-xs font-medium">+1</span>
                                </button>
                                <button
                                  onClick={() => handlePointsChange(student, 5)}
                                  className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-600 rounded flex items-center justify-center transition-colors cursor-pointer"
                                  title="加5分"
                                >
                                  <span className="text-xs font-medium">+5</span>
                                </button>
                                <button
                                  onClick={() => handlePointsChange(student, -1)}
                                  className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded flex items-center justify-center transition-colors cursor-pointer"
                                  title="减1分"
                                >
                                  <span className="text-xs font-medium">-1</span>
                                </button>
                                <button
                                  onClick={() => handlePointsChange(student, -5)}
                                  className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded flex items-center justify-center transition-colors cursor-pointer"
                                  title="减5分"
                                >
                                  <span className="text-xs font-medium">-5</span>
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(student)}
                                className="text-blue-600 hover:text-blue-900 p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(student.id)}
                                className="text-red-600 hover:text-red-900 p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </div>

        <SimpleStudentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          studentData={editingStudent}
        />

        <ToastContainer
          toasts={toasts}
          onRemoveToast={removeToast}
        />
      </div>
    </div>
  )
}
