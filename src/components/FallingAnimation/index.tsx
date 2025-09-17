import { useEffect, useState } from 'react'
import iconBoom from './icon-boom.svg'
import iconStar from './icon-star.svg'

interface FallingItem {
  id: number
  type: 'star' | 'mine'
  angle: number
  distance: number
  scale: number
  delay: number
}

interface FallingAnimationProps {
  trigger: number
  type: 'star' | 'mine'
  count?: number
}

export default function FallingAnimation({ trigger, type, count = 8 }: FallingAnimationProps) {
  const [items, setItems] = useState<FallingItem[]>([])

  useEffect(() => {
    if (trigger === 0)
      return

    const newItems: FallingItem[] = []
    for (let i = 0; i < count; i++) {
      newItems.push({
        id: Date.now() + i,
        type,
        angle: (360 / count) * i + Math.random() * 20 - 10, // 均匀分布角度，加一点随机偏移
        distance: Math.random() * 50 + 80, // 80-130px的随机扩散距离
        scale: Math.random() * 0.6 + 0.7, // 0.7-1.3倍随机大小
        delay: i * 50, // 每个延迟50ms
      })
    }

    setItems(newItems)

    // 动画结束后清理
    const timer = setTimeout(() => {
      setItems([])
    }, 1300)

    return () => clearTimeout(timer)
  }, [trigger, type, count])

  if (items.length === 0)
    return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {items.map((item) => {
        // 计算最终位置
        const angleRad = (item.angle * Math.PI) / 180
        const finalX = Math.cos(angleRad) * item.distance
        const finalY = Math.sin(angleRad) * item.distance

        return (
          <div
            key={item.id}
            className="absolute"
            style={{
              'left': '50%',
              'top': '50%',
              'transform': 'translate(-50%, -50%)',
              '--final-x': `${finalX}px`,
              '--final-y': `${finalY}px`,
              '--scale': item.scale,
              'animationDelay': `${item.delay}ms`,
              'animationDuration': '1000ms',
              'animationFillMode': 'forwards',
              'animationName': 'explodeOut',
              'animationTimingFunction': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            } as React.CSSProperties}
          >
            {item.type === 'star'
              ? (
                  <img src={iconStar} className="w-6 h-6" />
                )
              : (
                  <img src={iconBoom} className="w-6 h-6" />
                )}
          </div>
        )
      })}

      <style>
        {`
        @keyframes explodeOut {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) scale(var(--scale));
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%)
                      translate(var(--final-x), var(--final-y))
                      rotate(720deg)
                      scale(calc(var(--scale) * 0.3));
            opacity: 0;
          }
        }
      `}
      </style>
    </div>
  )
}
