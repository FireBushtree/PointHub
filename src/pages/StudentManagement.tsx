import type { Class, Student } from '../types'
import { useEffect, useState } from 'react'
import { Confirm, useConfirm } from '../components/Confirm'
import StudentModal from '../components/StudentModal'
import { ToastContainer, useToast } from '../components/Toast'
import { classApi, studentApi } from '../services/api'

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()

  const loadData = async () => {
    try {
      setLoading(true)
      const [studentsData, classesData] = await Promise.all([
        studentApi.getAll(),
        classApi.getAll(),
      ])
      setStudents(studentsData)
      setClasses(classesData)
    }
    catch (error) {
      console.error('Failed to load data:', error)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = () => {
    setEditingStudent(null)
    setModalOpen(true)
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    showConfirm('确定要删除这个学生吗？删除后将无法恢复。', async () => {
      try {
        await studentApi.delete(id)
        await loadData()
        showSuccess('学生删除成功')
      }
      catch (error) {
        console.error('Failed to delete student:', error)
        showError('删除失败，请重试')
      }
    }, '删除确认')
  }

  const handleSubmit = async (data: Omit<Student, 'id'>) => {
    try {
      if (editingStudent) {
        await studentApi.update(editingStudent.id, data)
        showSuccess('学生修改成功')
      }
      else {
        await studentApi.create(data)
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

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = !selectedClassId || student.classId === selectedClassId
    return matchesSearch && matchesClass
  })

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
            <h1 className="text-3xl font-bold text-gray-900">学生积分管理</h1>
            <p className="text-gray-600 mt-2">管理所有学生积分信息</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>新增学生</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="搜索学生姓名..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="w-48">
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">所有班级</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredStudents.length === 0
            ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm || selectedClassId ? '未找到匹配的学生' : '暂无学生'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || selectedClassId ? '请尝试其他搜索条件' : '开始添加第一个学生吧'}
                  </p>
                  {!searchTerm && !selectedClassId && (
                    <button
                      onClick={handleCreate}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                      新增学生
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
                          班级
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
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {student.points}
                                {' '}
                                分
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.className}
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

        <StudentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          studentData={editingStudent}
        />

        <ToastContainer
          toasts={toasts}
          onRemoveToast={removeToast}
        />

        <Confirm
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
