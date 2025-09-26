import type { Product } from '../types'

interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onDelete?: (id: string) => void
  onExchange?: (product: Product) => void
}

export default function ProductCard({ product, onEdit, onDelete, onExchange }: ProductCardProps) {
  const isOutOfStock = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
      {/* 商品状态标签 */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1">
        {isOutOfStock && (
          <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
            售罄
          </span>
        )}
        {isLowStock && !isOutOfStock && (
          <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
            库存紧张
          </span>
        )}
      </div>

      {/* 管理按钮 */}
      {(onEdit || onDelete) && (
        <div className="absolute top-16 right-4 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="p-2 bg-white/90 hover:bg-blue-500 text-gray-600 hover:text-white rounded-full shadow-lg backdrop-blur transition-all duration-200"
              title="编辑商品"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(product.id)}
              className="p-2 bg-white/90 hover:bg-red-500 text-gray-600 hover:text-white rounded-full shadow-lg backdrop-blur transition-all duration-200"
              title="删除商品"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}


      {/* 商品信息 */}
      <div className="p-6 pt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        {/* 价格展示 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-black text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
              {product.points}
            </span>
            <span className="text-sm font-medium text-gray-500">积分</span>
          </div>
          <div className="text-right">
            <div className={`text-sm font-semibold ${
              isOutOfStock
                ? 'text-red-500'
                : isLowStock
                  ? 'text-orange-500'
                  : 'text-green-500'
            }`}>
              {isOutOfStock ? '售罄' : `库存 ${product.stock}`}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(product.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* 购买/兑换按钮 */}
        <button
          onClick={() => onExchange && onExchange(product)}
          className={`w-full py-3 px-6 rounded-xl font-bold text-sm shadow-lg ${
            isOutOfStock
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer transition-colors duration-200'
          }`}
          disabled={isOutOfStock}
        >
          {isOutOfStock ? '暂时缺货' : '添加购物车'}
        </button>
      </div>

      {/* 底部装饰条 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
    </div>
  )
}