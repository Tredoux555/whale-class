'use client';

import React from 'react';
import { Child, ProgressSummaryByArea } from '@/types/database';

interface CurriculumMindmapSVGProps {
  childData: Child;
  progressData: ProgressSummaryByArea[];
  hoveredArea: string | null;
  onAreaHover: (area: string | null) => void;
  onAreaClick: (area: string) => void;
}

// Curriculum areas in order
const AREAS = [
  { key: 'practical_life', label: 'Practical Life', angle: 0 },
  { key: 'english', label: 'English', angle: 60 },
  { key: 'sensorial', label: 'Sensorial', angle: 120 },
  { key: 'cultural', label: 'Cultural', angle: 180 },
  { key: 'language', label: 'Language', angle: 240 },
  { key: 'mathematics', label: 'Mathematics', angle: 300 },
];

const CENTER_X = 408;
const CENTER_Y = 450;
const RADIUS = 150;
const NODE_SIZE = 80;
const CENTRAL_SIZE = 100;

// Helper function to convert progress percentage to color
const getProgressColor = (percentage: number): string => {
  if (percentage === 0) return '#e8f4f8'; // Light blue - unfilled
  if (percentage < 25) return '#a8d8e8'; // Light blue - 25%
  if (percentage < 50) return '#78bcd8'; // Medium blue - 50%
  if (percentage < 75) return '#4a90e2'; // Blue - 75%
  return '#2c5f7c'; // Dark blue - 100%
};

// Helper function to get text color based on background
const getTextColor = (percentage: number): string => {
  return percentage > 50 ? '#ffffff' : '#2c5f7c';
};

export const CurriculumMindmapSVG: React.FC<CurriculumMindmapSVGProps> = ({
  childData,
  progressData,
  hoveredArea,
  onAreaHover,
  onAreaClick,
}) => {
  // Create a map of area progress for quick lookup
  // Convert average_status (0-5) to percentage (0-100)
  const progressMap = new Map(
    progressData.map(p => [p.area, (p.average_status / 5) * 100])
  );

  return (
    <div className="w-full flex justify-center py-8">
      <svg
        viewBox="0 0 816 900"
        className="w-full max-w-2xl border border-gray-300 rounded-lg bg-white shadow-lg"
        style={{ aspectRatio: '816/900' }}
      >
        {/* Title */}
        <text
          x="408"
          y="30"
          textAnchor="middle"
          className="text-lg font-bold"
          fill="#2c5f7c"
        >
          Curriculum Progress Overview
        </text>

        {/* Central Node - Child Profile */}
        <g>
          {/* Background circle */}
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={CENTRAL_SIZE}
            fill="#e8f4f8"
            stroke="#4a90e2"
            strokeWidth="3"
          />

          {/* Child name */}
          <text
            x={CENTER_X}
            y={CENTER_Y - 15}
            textAnchor="middle"
            className="text-base font-bold"
            fill="#2c5f7c"
          >
            {childData.name}
          </text>

          {/* Child age group */}
          <text
            x={CENTER_X}
            y={CENTER_Y + 15}
            textAnchor="middle"
            className="text-sm"
            fill="#4a90e2"
          >
            {childData.age_group}
          </text>
        </g>

        {/* Connecting lines from center to areas */}
        {AREAS.map((area) => {
          const rad = (area.angle * Math.PI) / 180;
          const x = CENTER_X + RADIUS * Math.cos(rad);
          const y = CENTER_Y + RADIUS * Math.sin(rad);

          return (
            <line
              key={`line-${area.key}`}
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={x}
              y2={y}
              stroke="#d0e8f0"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          );
        })}

        {/* Area Nodes */}
        {AREAS.map((area) => {
          const rad = (area.angle * Math.PI) / 180;
          const x = CENTER_X + RADIUS * Math.cos(rad);
          const y = CENTER_Y + RADIUS * Math.sin(rad);
          const progress = progressMap.get(area.key as any) || 0;
          const bgColor = getProgressColor(progress);
          const textColor = getTextColor(progress);
          const isHovered = hoveredArea === area.key;

          return (
            <g
              key={`area-${area.key}`}
              onMouseEnter={() => onAreaHover(area.key)}
              onMouseLeave={() => onAreaHover(null)}
              onClick={() => onAreaClick(area.key)}
              style={{ cursor: 'pointer' }}
            >
              {/* Shadow/glow effect when hovered */}
              {isHovered && (
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_SIZE + 8}
                  fill="none"
                  stroke="#4a90e2"
                  strokeWidth="3"
                  opacity="0.5"
                />
              )}

              {/* Node circle */}
              <circle
                cx={x}
                cy={y}
                r={NODE_SIZE}
                fill={bgColor}
                stroke="#4a90e2"
                strokeWidth={isHovered ? '3' : '2'}
                className="transition-all duration-200"
              />

              {/* Progress bar (arc) at bottom of circle */}
              {progress > 0 && (
                <path
                  d={getProgressArc(x, y, NODE_SIZE, progress)}
                  fill="none"
                  stroke="#2c5f7c"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}

              {/* Area label */}
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                className="text-sm font-semibold"
                fill={textColor}
              >
                {area.label.split(' ')[0]}
              </text>

              {/* Progress percentage */}
              <text
                x={x}
                y={y + 12}
                textAnchor="middle"
                className="text-lg font-bold"
                fill={textColor}
              >
                {Math.round(progress)}%
              </text>

              {/* Hover indicator text */}
              {isHovered && (
                <text
                  x={x}
                  y={y + 30}
                  textAnchor="middle"
                  className="text-xs"
                  fill="#4a90e2"
                  opacity="0.7"
                >
                  Click to see activities
                </text>
              )}
            </g>
          );
        })}

        {/* Legend at bottom */}
        <g>
          <text x="30" y="850" className="text-xs font-semibold" fill="#2c5f7c">
            Progress Legend:
          </text>

          {/* Color legend items */}
          {[
            { color: '#e8f4f8', label: '0%' },
            { color: '#a8d8e8', label: '25%' },
            { color: '#78bcd8', label: '50%' },
            { color: '#4a90e2', label: '75%' },
            { color: '#2c5f7c', label: '100%' },
          ].map((item, idx) => (
            <g key={`legend-${idx}`}>
              <circle
                cx={30 + idx * 155}
                cy="870"
                r="6"
                fill={item.color}
                stroke="#4a90e2"
                strokeWidth="1"
              />
              <text
                x={45 + idx * 155}
                y="874"
                className="text-xs"
                fill="#2c5f7c"
              >
                {item.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

// Helper function to create SVG arc for progress indicator
function getProgressArc(
  cx: number,
  cy: number,
  radius: number,
  percentage: number
): string {
  const startAngle = -90; // Start from top
  const endAngle = startAngle + (percentage / 100) * 360;

  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const largeArc = percentage > 50 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

