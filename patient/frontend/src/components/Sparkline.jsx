import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export default function Sparkline({ data, datakey = 'value', color = 'var(--moss-700)', height = 50 }) {
  if (!data || data.length < 2) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)' }}>Not enough data</div>;
  }

  // Calculate min/max for sensible domain
  const values = data.map(d => d[datakey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 1;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <YAxis domain={[min - padding, max + padding]} hide />
          <Line 
            type="monotone" 
            dataKey={datakey} 
            stroke={color} 
            strokeWidth={2} 
            dot={{ r: 0 }}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
