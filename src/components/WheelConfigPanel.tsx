import type { WheelDataType } from 'react-custom-roulette'
import type { Product } from '../types'
import { useEffect, useMemo, useState } from 'react'
import { Wheel } from 'react-custom-roulette'
import { wheelApi } from '../services/tauriApi'

interface WheelConfigPanelProps {
  classId: string
  products: Product[]
  onSaved?: () => void | Promise<void>
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export default function WheelConfigPanel({
  classId,
  products,
  onSaved,
  onSuccess,
  onError,
}: WheelConfigPanelProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [spinCost, setSpinCost] = useState(10)
  const [slots, setSlots] = useState<string[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')

  const productMap = useMemo(() => new Map(products.map(product => [product.id, product])), [products])

  const loadConfig = async () => {
    if (!classId)
      return

    try {
      setLoading(true)
      const config = await wheelApi.getConfig(classId)
      setSpinCost(config.spinCost)
      setSlots(config.slots
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .map(slot => slot.productId))
    }
    catch (error) {
      console.error('Failed to load wheel config:', error)
      onError('加载大转盘配置失败，请重试')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [classId])

  const addSlot = (productId: string) => {
    if (!productId)
      return
    setSlots(prev => [...prev, productId])
  }

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, slotIndex) => slotIndex !== index))
  }

  const saveConfig = async () => {
    if (spinCost <= 0) {
      onError('抽奖消耗积分必须大于0')
      return
    }

    if (slots.length === 0) {
      onError('请至少添加一个转盘格子')
      return
    }

    const invalidSlotExists = slots.some(productId => !productMap.has(productId))
    if (invalidSlotExists) {
      onError('存在无效奖品，请重新配置转盘格子')
      return
    }

    try {
      setSaving(true)
      const config = await wheelApi.saveConfig(classId, spinCost, slots)
      setSpinCost(config.spinCost)
      setSlots(config.slots
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .map(slot => slot.productId))
      onSuccess('大转盘配置保存成功')
      await onSaved?.()
    }
    catch (error) {
      console.error('Failed to save wheel config:', error)
      onError('保存转盘配置失败，请重试')
    }
    finally {
      setSaving(false)
    }
  }

  const segmentCount = slots.length
  const slotProducts = slots.map(productId => productMap.get(productId)).filter(Boolean) as Product[]
  const outOfStockProducts = slotProducts.filter(product => product.stock <= 0)
  const wheelColors = [
    '#f59e0b',
    '#fb923c',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#f43f5e',
    '#f97316',
    '#ea580c',
  ]
  const previewWheelData = useMemo<WheelDataType[]>(() => {
    return slotProducts.map((product, index) => ({
      option: product.name,
      style: {
        backgroundColor: wheelColors[index % wheelColors.length],
        textColor: '#111827',
        fontWeight: 700,
        fontSize: 13,
      },
    }))
  }, [slotProducts])
  const pointerIcon = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="96" viewBox="0 0 64 96">
        <defs>
          <linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fde68a"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>
        <path d="M32 4 L58 50 L40 50 L40 90 L24 90 L24 50 L6 50 Z" fill="url(#p)" stroke="#92400e" stroke-width="4"/>
        <circle cx="32" cy="50" r="10" fill="#fffbeb" stroke="#92400e" stroke-width="3"/>
      </svg>
    `
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }, [])
  const slotTagItems = useMemo(() => {
    const seen = new Map<string, number>()
    return slots.map((productId, index) => {
      const count = (seen.get(productId) || 0) + 1
      seen.set(productId, count)
      return {
        index,
        key: `${productId}-${count}`,
        productId,
      }
    })
  }, [slots])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="flex items-center justify-center py-8 text-gray-600">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
          <span className="ml-3">加载转盘配置中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">转盘基础配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每次抽奖消耗积分
            </label>
            <input
              type="number"
              min={1}
              value={spinCost}
              onChange={event => setSpinCost(Math.max(1, Number(event.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">当前格子数量</label>
            <div className="h-10 flex items-center px-3 rounded-lg bg-blue-50 text-blue-700 font-semibold">
              {slots.length}
              {' '}
              格
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? '保存中...' : '保存转盘配置'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">奖品库（点击添加到转盘）</h3>
          {products.length === 0
            ? (
                <p className="text-gray-500">暂无商品，请先在“商品管理”中创建商品。</p>
              )
            : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          商品积分：
                          {product.points}
                          {' '}
                          | 库存：
                          <span className={product.stock > 0 ? 'text-green-600' : 'text-red-500'}>
                            {product.stock}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => addSlot(product.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                      >
                        添加格子
                      </button>
                    </div>
                  ))}
                </div>
              )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">转盘预览（可重复添加同一奖品）</h3>

          <div className="relative mx-auto max-w-[440px] rounded-[26px] bg-gradient-to-b from-amber-100/70 via-orange-100/70 to-yellow-100/80 p-4 border border-amber-200 mb-4">
            <div className="relative bg-white/75 backdrop-blur rounded-[20px] border border-white/90 py-4 px-2">
              <div className="mx-auto w-full max-w-[430px] flex items-center justify-center">
                <Wheel
                  mustStartSpinning={false}
                  prizeNumber={0}
                  data={previewWheelData.length > 0
                    ? previewWheelData
                    : [{
                        option: '请先添加格子',
                        style: { backgroundColor: '#f3f4f6', textColor: '#374151' },
                      }]}
                  spinDuration={0.9}
                  backgroundColors={wheelColors}
                  textColors={['#111827']}
                  outerBorderColor="#b45309"
                  outerBorderWidth={8}
                  innerRadius={16}
                  innerBorderColor="#fef3c7"
                  innerBorderWidth={9}
                  radiusLineColor="#fff7ed"
                  radiusLineWidth={2}
                  textDistance={64}
                  fontFamily="sans-serif"
                  fontSize={14}
                  fontWeight={700}
                  pointerProps={{
                    src: pointerIcon,
                    style: {
                      right: '50%',
                      top: '-10px',
                      width: '18%',
                      transform: 'translateX(50%)',
                    },
                  }}
                  disableInitialAnimation
                />
              </div>
              <p className="mt-3 text-center text-sm text-gray-600">
                当前共
                {' '}
                <span className="font-semibold text-orange-600">{segmentCount}</span>
                {' '}
                个格子
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">格子顺序（点击移除）</p>
            {slots.length === 0
              ? (
                  <p className="text-sm text-gray-500">暂无格子</p>
                )
              : (
                  <div className="flex flex-wrap gap-2">
                    {slotTagItems.map((slotTag) => {
                      const product = productMap.get(slotTag.productId)
                      return (
                        <button
                          key={slotTag.key}
                          onClick={() => removeSlot(slotTag.index)}
                          className="px-3 py-1.5 rounded-full text-xs bg-white hover:bg-red-50 border border-gray-300 hover:border-red-300 text-gray-700 transition-colors"
                          title={`点击移除格子 #${slotTag.index + 1}：${product?.name || '未知商品'}`}
                        >
                          {slotTag.index + 1}
                          .
                          {' '}
                          {product?.name || '未知商品'}
                        </button>
                      )
                    })}
                  </div>
                )}
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">快速添加（下拉）</label>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={event => setSelectedProductId(event.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">请选择商品</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                    {' '}
                    (库存:
                    {product.stock}
                    )
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  addSlot(selectedProductId)
                  setSelectedProductId('')
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          {outOfStockProducts.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              当前奖池存在库存不足商品，按规则将禁止开启转盘：
              {' '}
              {Array.from(new Set(outOfStockProducts.map(product => product.name))).join('、')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
