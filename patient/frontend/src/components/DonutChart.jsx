import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function DonutChart({ data, height = 180, centerText, centerSub }) {
  // data format: [{ name: 'Category', value: 400, color: '#1B5E4F' }]
  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius="65%"
            outerRadius="100%"
            dataKey="value"
            stroke="none"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || 'var(--moss-600)'} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', fontSize: '12px', padding: '8px 12px' }}
            itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {(centerText || centerSub) && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          {centerText && <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{centerText}</div>}
          {centerSub && <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '4px' }}>{centerSub}</div>}
        </div>
      )}
    </div>
  );
}
