import type { Product, Student } from '../types'
import { useEffect, useState } from 'react'
import { studentApi } from '../services/tauriApi'

interface ExchangeModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  classId: string
  onExchange: (studentId: string, productId: string) => void
}

export default function ExchangeModal({ isOpen, onClose, product, classId, onExchange }: ExchangeModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)

  const loadStudents = async () => {
    if (!classId)
      return

    setStudentsLoading(true)
    try {
      const data = await studentApi.getByClass(classId)
      setStudents(data)
    }
    catch (error) {
      console.error('Failed to load students:', error)
      setStudents([])
    }
    finally {
      setStudentsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && classId) {
      loadStudents()
    }
  }, [isOpen, classId])

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !product)
    return null

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const canAfford = selectedStudent ? selectedStudent.points >= product.points : false

  const handleExchange = async () => {
    if (!selectedStudentId || !canAfford)
      return

    setLoading(true)
    try {
      onExchange(selectedStudentId, product.id)
      onClose()
      setSelectedStudentId('')
    }
    catch (error) {
      console.error('Exchange failed:', error)
    }
    finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedStudentId('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">积分兑换</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 商品信息 */}
        <div className="p-6 shadow-lg relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
            <div className="text-right">
              <div className="text-2xl font-black text-orange-600">{product.points}</div>
              <div className="text-sm text-gray-500">积分</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            剩余库存：
            <span className="font-semibold text-green-600">{product.stock}</span>
            {' '}
            件
          </div>
        </div>

        {/* 学生选择 */}
        <div className="p-6 max-h-96 overflow-y-auto">

          {studentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-200 border-t-orange-500"></div>
              <span className="ml-3 text-gray-600">加载学生中...</span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {students.map((student) => {
                  const canStudentAfford = student.points >= product.points
                  const isSelected = student.id === selectedStudentId

                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(isSelected ? '' : student.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white border-2 border-orange-500'
                          : canStudentAfford
                            ? 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                            : 'bg-gray-100 text-gray-400 border-2 border-gray-100 cursor-not-allowed'
                      }`}
                      disabled={!canStudentAfford}
                      title={canStudentAfford ? `${student.name} (${student.points}积分)` : `${student.name} (${student.points}积分 - 积分不足)`}
                    >
                      {student.name}
                    </button>
                  )
                })}
              </div>

              {students.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  该班级暂无学生
                </div>
              )}

              {/* 选中学生信息 */}
              {selectedStudent && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">已选择：</span>
                      <span className="font-bold text-orange-600">{selectedStudent.name}</span>
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-mono">
                        {selectedStudent.studentNumber}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold text-blue-600">
                        {selectedStudent.points}
                        {' '}
                        积分
                      </div>
                      <div className="text-gray-500">
                        兑换后剩余:
                        {selectedStudent.points - product.points}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-6 bg-gray-50 flex space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExchange}
            disabled={!canAfford || !selectedStudentId || loading}
            className={`flex-1 px-4 py-3 rounded-lg font-bold transition-colors ${
              canAfford && selectedStudentId && !loading
                ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? '兑换中...' : '确认兑换'}
          </button>
        </div>
      </div>
    </div>
  )
}
