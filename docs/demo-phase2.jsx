import React, { useState } from 'react';
import { Heart, Star, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

const series = d3.range(12).map((i) => ({
  month: d3.timeFormat('%b')(new Date(2025, i, 1)),
  value: Math.round(40 + 30 * Math.sin(i / 1.5) + i * 2),
}));

const max = d3.max(series, (d) => d.value);

export default function Phase2Demo() {
  const [liked, setLiked] = useState(false);

  return (
    <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Zap size={28} color="#f59e0b" />
        Phase-2 Library Demo
      </h1>
      <p style={{ color: '#666' }}>Proves lucide-react, recharts, d3, and framer-motion all resolve.</p>

      <motion.button
        onClick={() => setLiked((v) => !v)}
        whileTap={{ scale: 0.92 }}
        animate={{ backgroundColor: liked ? '#fee2e2' : '#f3f4f6' }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          border: '1px solid #d1d5db',
          borderRadius: 8,
          cursor: 'pointer',
          marginBottom: 24,
        }}
      >
        <Heart size={18} color={liked ? '#dc2626' : '#6b7280'} fill={liked ? '#dc2626' : 'none'} />
        {liked ? 'Liked' : 'Like'}
      </motion.button>

      <div style={{ height: 240, background: '#fafafa', borderRadius: 12, padding: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p style={{ marginTop: 16, color: '#374151' }}>
        <Star size={14} color="#f59e0b" style={{ verticalAlign: 'middle' }} />
        {' '}d3 computed peak: <strong>{max}</strong>
      </p>
    </div>
  );
}
