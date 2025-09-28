import type { Product } from '../types'
import { useEffect, useState } from 'react'
import { productApi } from '../services/tauriApi'
import ExchangeModal from './ExchangeModal'
import ProductCard from './ProductCard'
import PurchaseHistoryList from './PurchaseHistoryList'
import { ToastContainer, useToast } from './Toast'

interface ClassShopProps {
  classId: string
  className: string
  onBackToStudents?: () => void
}

export default function ClassShop({ classId, className, onBackToStudents }: ClassShopProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'shop' | 'history'>('shop')
  const [exchangeModal, setExchangeModal] = useState<{ isOpen: boolean, product: Product | null }>({
    isOpen: false,
    product: null,
  })

  const { showError, showSuccess, toasts, removeToast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      const productsData = await productApi.getByClass(classId)
      setProducts(productsData)
    }
    catch (error) {
      console.error('Failed to load data:', error)
      showError('加载数据失败，请重试')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [classId])

  const handlePurchase = (product: Product) => {
    setExchangeModal({ isOpen: true, product })
  }

  const handlePurchaseSuccess = async (config: any) => {
    const {
      selectedStudent,
      quantity,
      product,
    } = config
    showSuccess(`${selectedStudent?.name} 成功购买了 ${quantity} 件 ${product.name}！`)
    await loadData() // 重新加载数据刷新库存和学生积分
  }

  const closeExchangeModal = () => {
    setExchangeModal({ isOpen: false, product: null })
  }

  const totalProducts = products.length

  // 如果是购物记录视图，直接显示购物记录组件
  if (currentView === 'history') {
    return (
      <PurchaseHistoryList
        classId={classId}
        className={className}
        onBackToShop={() => setCurrentView('shop')}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* 头部区域 */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-12 rounded-2xl mx-4 mb-8 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black">{className}</h1>
            </div>
            <p className="text-xl font-light text-white/90">精品商城</p>
          </div>
          {/* 装饰元素 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 shadow-lg"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 animate-pulse"></div>
          </div>
          <span className="ml-4 text-lg font-medium text-gray-700">加载精彩商品中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 头部商城横幅 */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-12 rounded-2xl mx-4 mb-8 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-black">豆豆商城</h1>
              </div>
              <p className="text-xl font-light text-white/90 mb-6">{className}</p>
            </div>

            {/* 导航按钮 */}
            <div className="flex flex-col space-y-2">
              {onBackToStudents && (
                <button
                  onClick={onBackToStudents}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105"
                >
                  ← 返回学生管理
                </button>
              )}
              <button
                onClick={() => setCurrentView('history')}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg transition-all duration-200 hover:scale-105"
              >
                📋 购物记录
              </button>
              <div className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                🔥 热销中
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

      {/* 商品展示区域 */}
      <div className="px-4 pb-8">
        {products.length === 0
          ? (
              <div className="bg-white rounded-2xl shadow-xl p-12 text-center mx-auto max-w-md">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">商城建设中</h3>
                <p className="text-gray-600 mb-6">精彩商品即将上架，敬请期待！</p>
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full inline-block font-medium">
                  🚀 即将开启
                </div>
              </div>
            )
          : (
              <>
                {/* 商品分类标签 */}
                <div className="flex items-center justify-between mb-8 px-2">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7v2c0 1-1 2-2 2H8c-1 0-2-1-2-2V4M5 11v10a1 1 0 001 1h12a1 1 0 001-1V11" />
                      </svg>
                    </span>
                    精选商品
                  </h2>

                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span className="font-bold text-sm">
                        {totalProducts}
                        {' '}
                        <span className="font-normal">件商品</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 商品网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onExchange={handlePurchase}
                    />
                  ))}
                </div>
              </>
            )}

        <ExchangeModal
          isOpen={exchangeModal.isOpen}
          onClose={closeExchangeModal}
          product={exchangeModal.product}
          classId={classId}
          onPurchaseSuccess={handlePurchaseSuccess}
        />

        <ToastContainer
          toasts={toasts}
          onRemoveToast={removeToast}
        />
      </div>
    </div>
  )
}
