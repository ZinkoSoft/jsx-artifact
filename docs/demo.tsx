import React, { useState, useEffect, useRef } from 'react';

const C = {
  bg: '#f8f9fc',
  card: '#ffffff',
  cardHover: '#f0f2f8',
  border: '#e4e7ee',
  borderHover: '#c8cde0',
  accent: '#4f46e5',
  accentSoft: 'rgba(79, 70, 229, 0.08)',
  green: '#059669',
  greenSoft: 'rgba(5, 150, 105, 0.08)',
  amber: '#d97706',
  amberSoft: 'rgba(217, 119, 6, 0.08)',
  rose: '#dc2626',
  roseSoft: 'rgba(220, 38, 38, 0.08)',
  text: '#111827',
  muted: '#6b7280',
  dim: '#9ca3af',
};

function AnimatedNumber({ value, suffix = '', prefix = '' }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const duration = 1800;
    const t0 = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / duration, 1);
      setDisplay(Math.floor((1 - Math.pow(1 - p, 4)) * value));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

function BarChart({ data, color, height = 48 }) {
  const max = Math.max(...data);
  const barW = 100 / data.length;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, flexShrink: 0, width: 100 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${(v / max) * 100}%`,
          background: i === data.length - 1 ? color : `${color}33`,
          borderRadius: 2,
          transition: 'height 0.4s ease',
        }} />
      ))}
    </div>
  );
}

function MetricCard({ label, value, suffix, prefix, change, color, colorSoft, chartData, icon }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="metric-card"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.card,
        border: `1px solid ${hov ? C.borderHover : C.border}`,
        borderRadius: 12,
        padding: 'clamp(14px, 2vw, 20px)',
        transition: 'all 0.25s ease',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 4px 20px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: colorSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>{icon}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 'clamp(10px, 1.1vw, 12px)', fontWeight: 600,
            color: change > 0 ? C.green : C.rose,
          }}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 'clamp(10px, 1.2vw, 12px)', color: C.muted, marginBottom: 4, letterSpacing: '0.02em' }}>
          {label}
        </div>
        <div style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
          <AnimatedNumber value={value} suffix={suffix} prefix={prefix} />
        </div>
      </div>
      <BarChart data={chartData} color={color} />
    </div>
  );
}

function ProjectRow({ name, status, statusColor, statusBg, progress, members, updated }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 0', borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'clamp(12px, 1.3vw, 14px)', color: C.text, fontWeight: 600, marginBottom: 6 }}>{name}</div>
        <div style={{
          height: 4, borderRadius: 2, background: C.border, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${progress}%`, borderRadius: 2,
            background: `linear-gradient(90deg, ${statusColor}, ${statusColor}cc)`,
            transition: 'width 1s ease',
          }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          fontSize: 'clamp(10px, 1vw, 11px)', fontWeight: 600,
          color: statusColor, background: statusBg,
          padding: '3px 8px', borderRadius: 6,
        }}>{status}</span>
        <div style={{ display: 'flex' }}>
          {members.map((m, i) => (
            <div key={i} style={{
              width: 24, height: 24, borderRadius: '50%',
              background: `hsl(${m * 40}, 60%, 65%)`,
              border: `2px solid ${C.card}`,
              marginLeft: i > 0 ? -6 : 0,
              fontSize: 9, fontWeight: 700, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{String.fromCharCode(65 + m)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: C.accentSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 'clamp(10px, 1.1vw, 12px)', color: C.muted, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: C.border, borderRadius: 8, padding: 3 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onSelect(t)} style={{
          padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontSize: 'clamp(11px, 1.2vw, 13px)', fontWeight: 500,
          fontFamily: 'inherit',
          background: active === t ? C.card : 'transparent',
          color: active === t ? C.text : C.muted,
          boxShadow: active === t ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
          transition: 'all 0.2s ease',
        }}>{t}</button>
      ))}
    </div>
  );
}

export default function ProjectDashboard() {
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState('All');
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{
      background: C.bg, minHeight: '100vh', color: C.text,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: 'clamp(16px, 3vw, 40px)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }

        .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(8px, 1.5vw, 16px); margin-bottom: clamp(16px, 2.5vw, 32px); }
        .bottom-grid  { display: grid; grid-template-columns: 1fr; gap: clamp(8px, 1.5vw, 16px); }
        .stats-row    { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(8px, 1.5vw, 12px); margin-bottom: clamp(12px, 2vw, 20px); }

        @media (min-width: 700px) {
          .metrics-grid { grid-template-columns: repeat(4, 1fr); }
          .bottom-grid  { grid-template-columns: 1fr 1fr; }
          .stats-row    { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'clamp(20px, 3vw, 32px)', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4, color: C.text }}>
            Project Overview
          </h1>
          <p style={{ fontSize: 'clamp(11px, 1.3vw, 14px)', color: C.muted }}>
            {dateStr} &middot; {timeStr}
          </p>
        </div>
        <TabBar tabs={['All', 'Active', 'Review', 'Done']} active={tab} onSelect={setTab} />
      </div>

      {/* Quick Stats */}
      <div className="stats-row">
        <StatItem icon="📋" label="Total Projects" value="24" />
        <StatItem icon="⚡" label="In Progress" value="12" />
        <StatItem icon="👁" label="In Review" value="5" />
        <StatItem icon="✓" label="Completed" value="7" />
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <MetricCard label="Team Velocity" value={847} prefix="" suffix=" pts" change={14.2} color={C.accent} colorSoft={C.accentSoft} icon="🚀" chartData={[60,72,65,80,75,90,85,95,88,100,92,105]} />
        <MetricCard label="Issues Closed" value={156} suffix="" prefix="" change={22.8} color={C.green} colorSoft={C.greenSoft} icon="✅" chartData={[30,35,28,42,38,45,50,48,55,52,60,58]} />
        <MetricCard label="Avg Cycle Time" value={4} suffix=".2 days" prefix="" change={-16.3} color={C.amber} colorSoft={C.amberSoft} icon="⏱" chartData={[8,7.5,7,6.5,6,5.8,5.5,5.2,5,4.8,4.5,4.2]} />
        <MetricCard label="Bug Rate" value={2} suffix=".1%" prefix="" change={-8.7} color={C.rose} colorSoft={C.roseSoft} icon="🐛" chartData={[4,3.8,3.5,3.2,3,2.8,2.9,2.6,2.5,2.3,2.2,2.1]} />
      </div>

      {/* Bottom Section */}
      <div className="bottom-grid">
        {/* Projects */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 'clamp(14px, 2vw, 24px)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', fontWeight: 600 }}>Active Projects</h2>
            <span style={{ fontSize: 'clamp(10px, 1.1vw, 12px)', color: C.accent, cursor: 'pointer', fontWeight: 500 }}>View all →</span>
          </div>
          <ProjectRow name="Design System v3" status="On Track" statusColor={C.green} statusBg={C.greenSoft} progress={72} members={[0,1,2]} updated="2h" />
          <ProjectRow name="Auth Service Rewrite" status="At Risk" statusColor={C.amber} statusBg={C.amberSoft} progress={45} members={[3,4]} updated="4h" />
          <ProjectRow name="Mobile App Launch" status="On Track" statusColor={C.green} statusBg={C.greenSoft} progress={88} members={[0,2,5]} updated="1h" />
          <ProjectRow name="API Rate Limiter" status="Blocked" statusColor={C.rose} statusBg={C.roseSoft} progress={30} members={[1]} updated="1d" />
          <ProjectRow name="Analytics Dashboard" status="Review" statusColor={C.accent} statusBg={C.accentSoft} progress={95} members={[3,5,6]} updated="30m" />
        </div>

        {/* Timeline */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 'clamp(14px, 2vw, 24px)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', fontWeight: 600, marginBottom: 16 }}>This Week</h2>
          {[
            { day: 'Mon', done: 8, total: 8 },
            { day: 'Tue', done: 12, total: 12 },
            { day: 'Wed', done: 6, total: 10 },
            { day: 'Thu', done: 9, total: 14 },
            { day: 'Fri', done: 3, total: 11 },
          ].map(d => (
            <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 'clamp(11px, 1.2vw, 13px)', color: C.muted, width: 32, flexShrink: 0, fontWeight: 500 }}>{d.day}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.border, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${(d.done / d.total) * 100}%`,
                  background: d.done === d.total
                    ? `linear-gradient(90deg, ${C.green}, ${C.green}cc)`
                    : `linear-gradient(90deg, ${C.accent}, ${C.accent}cc)`,
                  transition: 'width 1s ease',
                }} />
              </div>
              <span style={{ fontSize: 'clamp(10px, 1.1vw, 12px)', color: C.dim, flexShrink: 0, width: 40, textAlign: 'right' }}>
                {d.done}/{d.total}
              </span>
            </div>
          ))}
          <div style={{
            marginTop: 8, padding: '12px 16px', borderRadius: 10,
            background: C.accentSoft, border: `1px solid ${C.accent}22`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <div>
              <div style={{ fontSize: 'clamp(12px, 1.3vw, 14px)', fontWeight: 600, color: C.text }}>
                Weekly Completion: 69%
              </div>
              <div style={{ fontSize: 'clamp(10px, 1.1vw, 12px)', color: C.muted, marginTop: 2 }}>
                38 of 55 tasks completed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
