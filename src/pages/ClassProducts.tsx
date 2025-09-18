import type { Class, Product } from '../types'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Confirm, useConfirm } from '../components/Confirm'
import { ToastContainer, useToast } from '../components/Toast'
import { classApi, fileApi, productApi } from '../services/tauriApi'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string, points: number, stock: number }) => void
  onDelete?: () => void
  productData?: Product | null
}

function ProductModal({ isOpen, onClose, onSubmit, onDelete, productData }: ProductModalProps) {
  const [name, setName] = useState('')
  const [points, setPoints] = useState(0)
  const [stock, setStock] = useState(0)

  useEffect(() => {
    if (isOpen) {
      if (productData) {
        setName(productData.name)
        setPoints(productData.points)
        setStock(productData.stock)
      }
      else {
        setName('')
        setPoints(0)
        setStock(0)
      }
    }
  }, [isOpen, productData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim())
      return
    onSubmit({ name: name.trim(), points, stock })
  }

  if (!isOpen)
    return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">
          {productData ? '编辑商品' : '添加商品'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              商品名称
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入商品名称"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所需积分
            </label>
            <input
              type="number"
              value={points}
              onChange={e => setPoints(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              库存数量
            </label>
            <input
              type="number"
              value={stock}
              onChange={e => setStock(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            {productData && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              {productData ? '更新' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClassProducts() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirm()

  const loadData = async () => {
    if (!classId)
      return

    try {
      setLoading(true)
      const [productsData, classesData] = await Promise.all([
        productApi.getByClass(classId),
        classApi.getAll(),
      ])

      const currentClass = classesData.find(c => c.id === classId)
      if (!currentClass) {
        navigate('/')
        return
      }

      setClassInfo(currentClass)
      setProducts(productsData)
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
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    showConfirm('确定要删除这个商品吗？删除后将无法恢复。', async () => {
      try {
        await productApi.delete(id)
        await loadData()
        showSuccess('商品删除成功')
      }
      catch (error) {
        console.error('Failed to delete product:', error)
        showError('删除失败，请重试')
      }
    }, '删除确认')
  }

  const handleSubmit = async (data: { name: string, points: number, stock: number }) => {
    try {
      const productData = {
        ...data,
        classId: classId!,
      }

      if (editingProduct) {
        await productApi.update(editingProduct.id, productData)
        showSuccess('商品修改成功')
      }
      else {
        await productApi.create(productData)
        showSuccess('商品创建成功')
      }
      await loadData()
      setModalOpen(false)
    }
    catch (error) {
      console.error('Failed to save product:', error)
      showError('保存失败，请重试')
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
          const productsToImport = jsonData.slice(1).filter(row => row[0]).map(row => ({
            name: String(row[0] || '').trim(),
            points: row[1] === undefined || row[1] === null || row[1] === '' ? 0 : (Number(row[1]) || 0),
            stock: row[2] === undefined || row[2] === null || row[2] === '' ? 0 : (Number(row[2]) || 0),
            classId: classId!,
          })).filter(product => product.name)

          if (productsToImport.length === 0) {
            showError('未找到有效的商品数据')
            setImportLoading(false)
            return
          }

          // 批量创建商品
          let successCount = 0
          for (const productData of productsToImport) {
            try {
              await productApi.create(productData)
              successCount++
            }
            catch (error) {
              console.error(`Failed to create product ${productData.name}:`, error)
            }
          }

          await loadData()
          showSuccess(`成功导入 ${successCount} 个商品`)
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

  const handleDownloadTemplate = async () => {
    try {
      // 创建模板数据
      const templateData = [
        ['商品名称', '所需积分', '库存数量'], // 标题行
        ['文具套装', 50, 10],
        ['课外书籍', 30, 15],
        ['体育用品', 80, 5],
      ]

      // 创建工作簿
      const worksheet = XLSX.utils.aoa_to_sheet(templateData)
      const workbook = XLSX.utils.book_new()

      // 设置列宽
      worksheet['!cols'] = [
        { wch: 15 }, // 商品名称列宽
        { wch: 12 }, // 所需积分列宽
        { wch: 12 }, // 库存数量列宽
      ]

      // 添加工作表
      XLSX.utils.book_append_sheet(workbook, worksheet, '商品导入模板')

      // 生成二进制数据
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const uint8Array = new Uint8Array(excelBuffer)

      // 保存到桌面
      await fileApi.saveToDesktop('商品导入模板.xlsx', uint8Array)

      showSuccess('模板已下载到桌面: 商品导入模板.xlsx')
    }
    catch (error) {
      console.error('Failed to download template:', error)
      showError('模板下载失败，请重试')
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
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
              onClick={() => navigate(`/class/${classId}/students`)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{classInfo.name}</h1>
              <p className="text-gray-600">班级商城管理</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>
                {products.length}
                {' '}
                个商品
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
              onClick={handleCreate}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>添加商品</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <input
              type="text"
              placeholder="搜索商品名称..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {filteredProducts.length === 0
            ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? '未找到匹配的商品' : '暂无商品'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm ? '请尝试其他搜索条件' : '开始添加第一个商品吧'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleCreate}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                    >
                      添加商品
                    </button>
                  )}
                </div>
              )
            : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          商品名称
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          所需积分
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          库存
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          状态
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              <span className="text-sm font-semibold text-amber-600">{product.points}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              product.stock > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                            >
                              {product.stock > 0 ? '有库存' : '缺货'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="text-blue-600 hover:text-blue-900"
                                title="编辑商品"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-900"
                                title="删除商品"
                              >
                                删除
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

        <ProductModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          onDelete={editingProduct
            ? () => {
                setModalOpen(false)
                handleDelete(editingProduct.id)
              }
            : undefined}
          productData={editingProduct}
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
