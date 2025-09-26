import type { CartItem } from '../types'

interface CartSummaryProps {
  cartItems: CartItem[]
  onRemoveItem: (itemId: string) => void
  onCheckout: () => void
}

export default function CartSummary({ cartItems, onRemoveItem, onCheckout }: CartSummaryProps) {
  if (cartItems.length === 0) return null

  const totalPoints = cartItems.reduce((sum, item) => sum + (item.points * item.quantity), 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* 头部统计 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h13M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-gray-900">购物清单</div>
                <div className="text-sm text-gray-500">{totalItems} 件商品</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">总积分</div>
              <div className="text-xl font-black text-orange-600">{totalPoints}</div>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-bold transition-colors cursor-pointer"
          >
            批量兑换
          </button>
        </div>

        {/* 商品列表 */}
        <div className="max-h-48 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cartItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-50 rounded-lg p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{item.productName}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md font-mono">
                      {item.studentName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>{item.points} 积分</span>
                    <span>×</span>
                    <span>{item.quantity}</span>
                    <span>=</span>
                    <span className="font-semibold text-orange-600">
                      {item.points * item.quantity} 积分
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="移除商品"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 展开/收起指示器 */}
        <div className="flex justify-center mt-2">
          <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}