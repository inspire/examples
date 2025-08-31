"use client"

import React from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  className?: string
}

export function Sparkline({
  data,
  width = 100,
  height = 20,
  color = 'currentColor',
  strokeWidth = 2,
  className = '',
}: SparklineProps) {
  if (!data || data.length < 2) {
    return null
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min
  
  if (range === 0) {
    // All values are the same, draw a straight line
    const y = height / 2
    return (
      <svg width={width} height={height} className={className}>
        <line
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </svg>
    )
  }

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  })

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}