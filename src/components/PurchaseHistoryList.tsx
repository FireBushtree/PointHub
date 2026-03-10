import type { PaginatedPurchaseRecords } from '../types'
import { CheckCircle2, Package, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { purchaseApi } from '../services/tauriApi'
import Pagination from './Pagination'
import { ToastContainer, useToast } from './Toast'

interface PurchaseHistoryListProps {
  classId: string
  className: string
  onBackToShop?: () => void
}

export default function PurchaseHistoryList({ classId, className, onBackToShop }: PurchaseHistoryListProps) {
  const [paginatedData, setPaginatedData] = useState<PaginatedPurchaseRecords>({
    records: [],
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sourceFilter, setSourceFilter] = useState<'all' | '购买' | '抽奖'>('all')
  const [pageSize] = useState(10) // 每页显示10条记录
  const { toasts, removeToast, showError, showSuccess } = useToast()

  const loadRecords = async (page: number = currentPage) => {
    try {
      setLoading(true)
      const data = await purchaseApi.getByClassPaginated(classId, page, pageSize, sourceFilter)
      setPaginatedData(data)
      setCurrentPage(page)
    }
    catch (error) {
      console.error('Failed to load purchase records:', error)
      showError('加载购物记录失败，请重试')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (classId) {
      loadRecords(1) // 重新加载时回到第一页
      setCurrentPage(1)
    }
  }, [classId, sourceFilter])

  const handlePageChange = (page: number) => {
    loadRecords(page)
  }

  const getSourceText = (source: string) => {
    if (source === '抽奖')
      return '抽奖'
    return '购买'
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待发货'
      case 'shipped': return '已发货'
      // 向后兼容：如果数据库中还有delivered状态的记录
      case 'delivered': return '已发货'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Package className="w-4 h-4" />
      case 'shipped': return <CheckCircle2 className="w-4 h-4" />
      // 向后兼容：如果数据库中还有delivered状态的记录
      case 'delivered': return <CheckCircle2 className="w-4 h-4" />
      default: return <Package className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-50'
      case 'shipped': return 'text-green-600 bg-green-50'
      // 向后兼容：如果数据库中还有delivered状态的记录
      case 'delivered': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const handleUpdateStatus = async (recordId: string, newStatus: 'pending' | 'shipped') => {
    // 保存原始状态用于回滚
    const originalRecord = paginatedData.records.find(record => record.id === recordId)
    if (!originalRecord)
      return

    const originalStatus = originalRecord.shippingStatus

    try {
      setUpdating(recordId)

      // 乐观更新：先更新前端状态
      setPaginatedData(prev => ({
        ...prev,
        records: prev.records.map(record =>
          record.id === recordId
            ? { ...record, shippingStatus: newStatus }
            : record,
        ),
      }))

      // 异步调用后端API
      await purchaseApi.updateShippingStatus(recordId, newStatus)
      showSuccess(`发货状态已更新为：${getStatusText(newStatus)}`)
    }
    catch (error) {
      console.error('Failed to update shipping status:', error)
      showError('更新发货状态失败，请重试')

      // 回滚前端状态
      setPaginatedData(prev => ({
        ...prev,
        records: prev.records.map(record =>
          record.id === recordId
            ? { ...record, shippingStatus: originalStatus }
            : record,
        ),
      }))
    }
    finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-12 rounded-2xl mx-4 mb-8 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-black">{className}</h1>
            </div>
            <p className="text-xl font-light text-white/90">购物记录管理</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 shadow-lg"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 animate-pulse"></div>
          </div>
          <span className="ml-4 text-lg font-medium text-gray-700">加载购物记录中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 头部 */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-12 rounded-2xl mx-4 mb-8 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-black">购物记录管理</h1>
              </div>
              <p className="text-xl font-light text-white/90 mb-6">{className}</p>
            </div>

            {/* 导航和统计标签 */}
            <div className="flex flex-col space-y-2">
              {onBackToShop && (
                <button
                  onClick={onBackToShop}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105"
                >
                  🛍️ 返回商城
                </button>
              )}
              <div className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                📦 总计
                {' '}
                {paginatedData.total}
                {' '}
                条记录
              </div>
              <div className="bg-orange-400/80 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                ⏳ 待发货
                {' '}
                {paginatedData.records.filter(r => r.shippingStatus === 'pending').length}
                {' '}
                条
              </div>
              <div className="bg-white/20 rounded-full px-3 py-1">
                <select
                  value={sourceFilter}
                  onChange={event => setSourceFilter(event.target.value as 'all' | '购买' | '抽奖')}
                  className="bg-transparent text-white text-sm font-bold outline-none"
                >
                  <option value="all" className="text-gray-900">全部来源</option>
                  <option value="购买" className="text-gray-900">仅购买</option>
                  <option value="抽奖" className="text-gray-900">仅抽奖</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        <div className="absolute top-1/2 right-1/4 w-4 h-4 bg-white/20 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-white/30 rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* 购物记录表格 */}
      <div className="px-4 pb-8">
        {paginatedData.total === 0
          ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center mx-auto max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">暂无购物记录</h3>
                <p className="text-gray-600 mb-6">该班级还没有学生购买商品</p>
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full inline-block font-medium">
                  📚 开始购物吧
                </div>
              </div>
            )
          : (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          商品信息
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          学生信息
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          数量/积分
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          购买时间
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          来源
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          发货状态
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedData.records.map((record, index) => (
                        <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{record.productName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className="font-bold text-blue-600">{record.quantity}</span>
                              {' '}
                              件
                            </div>
                            <div className="text-sm text-orange-600">
                              <span className="font-bold">{record.points}</span>
                              {' '}
                              积分
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              getSourceText(record.source) === '抽奖'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                            >
                              {getSourceText(record.source)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium gap-1 ${getStatusColor(record.shippingStatus)}`}>
                              {getStatusIcon(record.shippingStatus)}
                              {getStatusText(record.shippingStatus)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {record.shippingStatus === 'pending' && (
                                <button
                                  onClick={() => handleUpdateStatus(record.id, 'shipped')}
                                  disabled={updating === record.id}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {updating === record.id
                                    ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent mr-1"></div>
                                      )
                                    : (
                                        <Truck className="w-3 h-3 mr-1" />
                                      )}
                                  发货
                                </button>
                              )}
                              {/* 已发货状态不显示任何按钮，流程结束 */}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 分页组件 */}
                <Pagination
                  currentPage={paginatedData.currentPage}
                  totalPages={paginatedData.totalPages}
                  pageSize={paginatedData.pageSize}
                  total={paginatedData.total}
                  onPageChange={handlePageChange}
                  loading={loading}
                />
              </div>
            )}
      </div>

      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
      />
    </div>
  )
}
