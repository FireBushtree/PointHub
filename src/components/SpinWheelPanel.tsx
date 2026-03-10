import type { WheelDataType } from 'react-custom-roulette'
import type { SpinWheelResult, Student, WheelConfig } from '../types'
import { useEffect, useMemo, useState } from 'react'
import { Wheel } from 'react-custom-roulette'
import { studentApi, wheelApi } from '../services/tauriApi'

interface SpinWheelPanelProps {
  classId: string
  className: string
  onBackToShop: () => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
}

export default function SpinWheelPanel({
  classId,
  className,
  onBackToShop,
  showSuccess,
  showError,
}: SpinWheelPanelProps) {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<WheelConfig | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [mustSpin, setMustSpin] = useState(false)
  const [prizeNumber, setPrizeNumber] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SpinWheelResult | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)

  const loadData = async () => {
    if (!classId)
      return

    try {
      setLoading(true)
      const [wheelConfig, studentList] = await Promise.all([
        wheelApi.getConfig(classId),
        studentApi.getByClass(classId),
      ])
      setConfig(wheelConfig)
      setStudents(studentList)
    }
    catch (error) {
      console.error('Failed to load wheel data:', error)
      showError('加载大转盘数据失败，请重试')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [classId])

  const selectedStudent = students.find(student => student.id === selectedStudentId) || null
  const slots = config?.slots || []
  const slotCount = slots.length
  const spinCost = config?.spinCost || 0
  const estimatedRemaining = selectedStudent ? selectedStudent.points - spinCost : null
  const insufficientPoints = !!selectedStudent && selectedStudent.points < spinCost
  const outOfStockProducts = useMemo(() => {
    const names = new Set(slots.filter(slot => slot.productStock <= 0).map(slot => slot.productName))
    return Array.from(names)
  }, [slots])
  const stockBlocked = outOfStockProducts.length > 0
  const disableSpin = !selectedStudent || slotCount === 0 || insufficientPoints || stockBlocked || spinning || mustSpin

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

  const applySpinResultToLocalState = (spinResult: SpinWheelResult) => {
    setStudents(prevStudents => prevStudents.map(student => (
      student.id === spinResult.studentId
        ? { ...student, points: spinResult.remainingPoints }
        : student
    )))

    setConfig((prevConfig) => {
      if (!prevConfig)
        return prevConfig

      return {
        ...prevConfig,
        slots: prevConfig.slots.map(slot => (
          slot.productId === spinResult.winningSlot.productId
            ? { ...slot, productStock: Math.max(0, slot.productStock - 1) }
            : slot
        )),
      }
    })
  }

  const startSpin = async () => {
    if (!config || !selectedStudent || disableSpin)
      return

    try {
      setSpinning(true)
      setShowResultModal(false)
      const spinResult = await wheelApi.spin(classId, selectedStudent.id)

      const indexBySlotId = slots.findIndex(slot => slot.id === spinResult.winningSlot.id)
      const indexBySlotIndex = slots.findIndex(slot => slot.slotIndex === spinResult.winningSlot.slotIndex)
      const resolvedPrizeIndex = indexBySlotId >= 0
        ? indexBySlotId
        : indexBySlotIndex >= 0
          ? indexBySlotIndex
          : Math.max(0, Math.min(slotCount - 1, spinResult.winningSlot.slotIndex))

      setPrizeNumber(resolvedPrizeIndex)
      setResult(spinResult)
      applySpinResultToLocalState(spinResult)
      setMustSpin(true)
    }
    catch (error) {
      console.error('Failed to spin wheel:', error)
      showError(typeof error === 'string' ? error : '开启转盘失败，请重试')
      setSpinning(false)
    }
  }

  const wheelDataSignature = useMemo(
    () => slots.map(slot => `${slot.id}:${slot.productName}`).join('|'),
    [slots],
  )
  const slotDisplayItems = useMemo(
    () => slots.map(slot => ({ id: slot.id, productName: slot.productName })),
    [wheelDataSignature],
  )
  const wheelData = useMemo<WheelDataType[]>(() => {
    return slotDisplayItems.map((slot, index) => ({
      option: slot.productName,
      style: {
        backgroundColor: wheelColors[index % wheelColors.length],
        textColor: '#111827',
        fontWeight: 700,
        fontSize: 14,
      },
    }))
  }, [slotDisplayItems])

  const handleWheelSpinStop = () => {
    setMustSpin(false)
    setSpinning(false)

    if (result) {
      showSuccess(`抽奖完成：${result.studentName} 获得 ${result.winningSlot.productName}`)
      setShowResultModal(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-500"></div>
          <span className="ml-4 text-gray-700 font-medium">加载转盘中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900">积分大转盘</h2>
          <p className="text-gray-600 mt-1">{className}</p>
        </div>
        <button
          onClick={onBackToShop}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          返回商城
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">抽奖信息</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择学生</label>
              <select
                value={selectedStudentId}
                onChange={event => setSelectedStudentId(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              >
                <option value="">请选择学生</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                    {' '}
                    (
                    {student.studentNumber}
                    )
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 mb-1">当前积分</p>
                <p className="text-lg font-bold text-blue-700">{selectedStudent?.points ?? '--'}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-600 mb-1">本次消耗</p>
                <p className="text-lg font-bold text-orange-700">{spinCost}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-emerald-600 mb-1">预计剩余</p>
                <p className={`text-lg font-bold ${estimatedRemaining !== null && estimatedRemaining < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {estimatedRemaining ?? '--'}
                </p>
              </div>
            </div>

            {insufficientPoints && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                积分不足，无法开启转盘
              </p>
            )}

            {stockBlocked && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                奖池存在库存不足奖品，按规则禁止转动：
                {' '}
                {outOfStockProducts.join('、')}
              </p>
            )}

            {slotCount === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                当前转盘没有奖品格子，请先到商城设置中配置大转盘。
              </p>
            )}

            <button
              onClick={startSpin}
              disabled={disableSpin}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                disableSpin
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {spinning ? '转盘旋转中...' : '开始转盘'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200/70 p-6 shadow-[0_10px_30px_rgba(245,158,11,0.12)]">
          <h3 className="text-lg font-bold text-gray-900 mb-4">转盘</h3>
          <div className="relative mx-auto max-w-[440px] rounded-[28px] bg-gradient-to-b from-amber-100/80 via-orange-100/70 to-yellow-100/90 p-4 border border-amber-200">
            <div className="absolute -inset-4 -z-10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.35),_transparent_65%)]"></div>
            <div className="relative bg-white/75 backdrop-blur rounded-[22px] border border-white/90 py-4 px-2">
              <div className="mx-auto w-full max-w-[430px] flex items-center justify-center">
                <Wheel
                  mustStartSpinning={mustSpin}
                  prizeNumber={prizeNumber}
                  data={wheelData.length > 0
                    ? wheelData
                    : [{
                        option: '请先配置奖品格子',
                        style: { backgroundColor: '#f3f4f6', textColor: '#374151' },
                      }]}
                  spinDuration={0.9}
                  backgroundColors={wheelColors}
                  textColors={['#111827']}
                  outerBorderColor="#b45309"
                  outerBorderWidth={9}
                  innerRadius={18}
                  innerBorderColor="#fef3c7"
                  innerBorderWidth={10}
                  radiusLineColor="#fff7ed"
                  radiusLineWidth={2}
                  textDistance={64}
                  fontFamily="sans-serif"
                  fontSize={15}
                  fontWeight={700}
                  disableInitialAnimation
                  onStopSpinning={handleWheelSpinStop}
                />
              </div>
              <div className="mt-3 text-center">
                <p className="text-xs tracking-widest text-amber-700 font-semibold">LUCKY WHEEL</p>
                <p className="text-sm text-gray-600">
                  每次消耗
                  {' '}
                  <span className="font-bold text-orange-600">{spinCost}</span>
                  {' '}
                  积分
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showResultModal && result && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">抽奖结果</h3>
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-gray-500">学生：</span>
                <span className="font-semibold text-gray-900">{result.studentName}</span>
              </p>
              <p>
                <span className="text-gray-500">中奖商品：</span>
                <span className="font-semibold text-amber-600">{result.winningSlot.productName}</span>
              </p>
              <p>
                <span className="text-gray-500">消耗积分：</span>
                <span className="font-semibold text-orange-600">{result.spentPoints}</span>
              </p>
              <p>
                <span className="text-gray-500">剩余积分：</span>
                <span className="font-semibold text-emerald-600">{result.remainingPoints}</span>
              </p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowResultModal(false)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
