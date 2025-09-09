import type { Class, Student } from '../types'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Confirm, useConfirm } from '../components/Confirm'
import SimpleStudentModal from '../components/SimpleStudentModal'
import { ToastContainer, useToast } from '../components/Toast'
import { classApi, fileApi, studentApi } from '../services/tauriApi'

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
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()
  const [importLoading, setImportLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'student-number' | 'points-asc' | 'points-desc'>('student-number')

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

  const handleSubmit = async (data: { name: string, studentNumber: string, points: number }) => {
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

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file)
      return

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showError('请上传Excel文件(.xlsx 或 .xls)')
      return
    }

    setImportLoading(true)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]

          // 转换为JSON，跳过第一行标题
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          if (jsonData.length < 2) {
            showError('Excel文件内容为空或格式错误')
            setImportLoading(false)
            return
          }

          // 从第二行开始处理数据
          const studentsToImport = jsonData.slice(1).filter(row => row[0] || row[1]).map(row => ({
            name: String(row[1] || '').trim(),
            studentNumber: String(row[0] || '').trim(),
            points: row[2] === undefined || row[2] === null || row[2] === '' ? 0 : (Number(row[2]) || 0),
            classId: classId!,
            className: classInfo!.name,
          })).filter(student => student.name)

          if (studentsToImport.length === 0) {
            showError('未找到有效的学生数据')
            setImportLoading(false)
            return
          }

          // 批量创建学生
          let successCount = 0
          for (const studentData of studentsToImport) {
            try {
              await studentApi.create(studentData)
              successCount++
            }
            catch (error) {
              console.error(`Failed to create student ${studentData.name}:`, error)
            }
          }

          await loadData()
          showSuccess(`成功导入 ${successCount} 个学生`)
        }
        catch (error) {
          console.error('Failed to parse Excel:', error)
          showError('Excel文件解析失败，请检查文件格式')
        }
        finally {
          setImportLoading(false)
          // 清空文件输入
          event.target.value = ''
        }
      }

      reader.readAsArrayBuffer(file)
    }
    catch (error) {
      console.error('Failed to read file:', error)
      showError('文件读取失败')
      setImportLoading(false)
    }
  }

  const handleExportExcel = async () => {
    if (students.length === 0) {
      showError('暂无学生数据可导出')
      return
    }

    try {
      // 准备导出数据
      const exportData = [
        ['学号', '学生姓名', '积分'], // 标题行
        ...students.map(student => [student.studentNumber, student.name, student.points]),
      ]

      // 创建工作簿
      const worksheet = XLSX.utils.aoa_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()

      // 设置列宽
      worksheet['!cols'] = [
        { wch: 12 }, // 学号列宽
        { wch: 15 }, // 学生姓名列宽
        { wch: 10 }, // 积分列宽
      ]

      // 添加工作表
      XLSX.utils.book_append_sheet(workbook, worksheet, '学生列表')

      // 生成文件名
      const fileName = `${classInfo?.name || '班级'}_学生名单_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`

      // 生成二进制数据
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const uint8Array = new Uint8Array(excelBuffer)

      // 保存到桌面
      await fileApi.saveToDesktop(fileName, uint8Array)

      showSuccess(`文件已保存到桌面: ${fileName}`)
    }
    catch (error) {
      console.error('Failed to export Excel:', error)
      showError('导出失败，请重试')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      // 创建模板数据
      const templateData = [
        ['学号', '学生姓名', '积分'], // 标题行
        ['1', '张三', 85],
        ['2', '李四', 92],
        ['3', '王五', 78],
      ]

      // 创建工作簿
      const worksheet = XLSX.utils.aoa_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()

      // 设置列宽
      worksheet['!cols'] = [
        { wch: 12 }, // 学号列宽
        { wch: 15 }, // 学生姓名列宽
        { wch: 10 }, // 积分列宽
      ]

      // 添加工作表
      XLSX.utils.book_append_sheet(workbook, worksheet, '学生导入模板')

      // 生成二进制数据
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const uint8Array = new Uint8Array(excelBuffer)

      // 保存到桌面
      await fileApi.saveToDesktop('学生导入模板.xlsx', uint8Array)

      showSuccess('模板已下载到桌面: 学生导入模板.xlsx')
    }
    catch (error) {
      console.error('Failed to download template:', error)
      showError('模板下载失败，请重试')
    }
  }

  const handleSortByPoints = () => {
    if (sortBy === 'student-number') {
      setSortBy('points-desc')
    }
    else if (sortBy === 'points-desc') {
      setSortBy('points-asc')
    }
    else {
      setSortBy('student-number')
    }
  }

  const filteredStudents = students
    .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'points-asc') {
        return a.points - b.points
      }
      else if (sortBy === 'points-desc') {
        return b.points - a.points
      }
      // student-number: keep original order (by student_number asc from backend)
      return 0
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

          <div className="flex items-center space-x-3">
            <label className="relative bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1.5 text-sm cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span>{importLoading ? '导入中...' : '导入Excel'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                disabled={importLoading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>

            <button
              onClick={handleDownloadTemplate}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1.5 text-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>下载导入模板</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1.5 text-sm cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 8l3 3m0 0l-3 3m3-3H9" />
              </svg>
              <span>导出Excel</span>
            </button>

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
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleSortByPoints}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-700">积分排序</span>
                        {sortBy === 'points-desc' && (
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        )}
                        {sortBy === 'points-asc' && (
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        )}
                        {sortBy === 'student-number' && (
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5T6.5 15a2.5 2.5 0 002.5-2.5V6.5z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStudents.map(student => (
                      <div
                        key={student.id}
                        className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-200 group"
                      >
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-white font-semibold text-lg">
                              {student.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {student.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              学号: {student.studentNumber}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              {student.points} 分
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between space-x-2">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handlePointsChange(student, 1)}
                              className="w-8 h-8 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                              title="加1分"
                            >
                              <span className="text-sm font-semibold">+1</span>
                            </button>
                            <button
                              onClick={() => handlePointsChange(student, 2)}
                              className="w-8 h-8 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                              title="加2分"
                            >
                              <span className="text-sm font-semibold">+2</span>
                            </button>
                            <button
                              onClick={() => handlePointsChange(student, -1)}
                              className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                              title="减1分"
                            >
                              <span className="text-sm font-semibold">-1</span>
                            </button>
                            <button
                              onClick={() => handlePointsChange(student, -2)}
                              className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                              title="减2分"
                            >
                              <span className="text-sm font-semibold">-2</span>
                            </button>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleEdit(student)}
                              className="w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                              title="编辑学生"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(student.id)}
                              className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
                              title="删除学生"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
