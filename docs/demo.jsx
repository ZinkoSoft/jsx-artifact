import React, { useState, useEffect, useRef } from 'react';

const C = {
  bg: '#0a0a0f',
  card: '#12121a',
  cardHover: '#1a1a28',
  border: '#1e1e2e',
  borderHover: '#2e2e4e',
  accent: '#6c5ce7',
  accentSoft: 'rgba(108, 92, 231, 0.12)',
  green: '#00cec9',
  greenSoft: 'rgba(0, 206, 201, 0.12)',
  amber: '#fdcb6e',
  amberSoft: 'rgba(253, 203, 110, 0.12)',
  rose: '#e17055',
  roseSoft: 'rgba(225, 112, 85, 0.12)',
  text: '#e8e8f0',
  muted: '#6b6b80',
  dim: '#44445a',
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

function Spark({ data, color, w = 100, h = 32 }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  const lastY = parseFloat(pts.split(' ').pop().split(',')[1]);

  return (
    <svg width={w} height={h} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`g-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${w},${h} 0,${h}`} fill={`url(#g-${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

function MetricCard({ label, value, suffix, prefix, change, color, colorSoft, sparkData }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="metric-card"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.cardHover : C.card,
        border: `1px solid ${hov ? C.borderHover : C.border}`,
        borderRadius: 14,
        padding: 'clamp(14px, 2vw, 24px)',
        transition: 'all 0.3s ease',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 'clamp(10px, 1.2vw, 13px)', color: C.muted, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {label}
          </div>
          <div style={{ fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 700, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
            <AnimatedNumber value={value} suffix={suffix} prefix={prefix} />
          </div>
        </div>
        <Spark data={sparkData} color={color} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          background: colorSoft, color, fontSize: 'clamp(10px, 1.1vw, 12px)',
          fontWeight: 600, padding: '2px 7px', borderRadius: 5,
        }}>
          {change > 0 ? '+' : ''}{change}%
        </span>
        <span style={{ fontSize: 'clamp(10px, 1vw, 12px)', color: C.dim }}>vs last period</span>
      </div>
    </div>
  );
}

function ActivityRow({ name, action, time, avatar, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0', borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff',
      }}>{avatar}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'clamp(12px, 1.3vw, 14px)', color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: 'clamp(10px, 1.1vw, 12px)', color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{action}</div>
      </div>
      <div style={{ fontSize: 'clamp(10px, 1vw, 12px)', color: C.dim, flexShrink: 0 }}>{time}</div>
    </div>
  );
}

function ProgressRing({ progress, size = 48, color }) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnim(progress), 200);
    return () => clearTimeout(t);
  }, [progress]);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="3.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - anim / 100)} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={C.text} fontSize="11" fontWeight="700" fontFamily="system-ui"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >{anim}%</text>
    </svg>
  );
}

function GoalCard({ title, progress, target, current, color }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 12,
        background: hov ? C.cardHover : 'transparent', borderRadius: 10,
        transition: 'background 0.2s ease', cursor: 'default',
      }}
    >
      <ProgressRing progress={progress} color={color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'clamp(12px, 1.3vw, 14px)', fontWeight: 600, color: C.text }}>{title}</div>
        <div style={{ fontSize: 'clamp(10px, 1.1vw, 12px)', color: C.muted, marginTop: 3 }}>
          {current.toLocaleString()} / {target.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

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

        @media (min-width: 700px) {
          .metrics-grid { grid-template-columns: repeat(4, 1fr); }
          .bottom-grid  { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'clamp(20px, 3vw, 36px)', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>
            {greeting}, Alex
          </h1>
          <p style={{ fontSize: 'clamp(11px, 1.3vw, 14px)', color: C.muted }}>
            Here's what's happening with your projects today.
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '8px 14px',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}` }} />
          <span style={{ fontSize: 'clamp(10px, 1.2vw, 13px)', color: C.muted }}>All systems operational</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <MetricCard label="Revenue" value={48290} prefix="$" suffix="" change={12.5} color={C.green} colorSoft={C.greenSoft} sparkData={[20,25,22,30,28,35,32,40,38,45,42,48]} />
        <MetricCard label="Active Users" value={12847} suffix="" prefix="" change={8.3} color={C.accent} colorSoft={C.accentSoft} sparkData={[60,65,58,72,68,80,75,85,90,88,95,100]} />
        <MetricCard label="Conversion" value={3} suffix=".2%" prefix="" change={-2.1} color={C.amber} colorSoft={C.amberSoft} sparkData={[35,38,32,36,30,34,28,33,31,29,32,30]} />
        <MetricCard label="Avg Response" value={142} suffix="ms" prefix="" change={-18.4} color={C.rose} colorSoft={C.roseSoft} sparkData={[200,190,185,175,180,165,170,155,150,148,145,142]} />
      </div>

      {/* Bottom Section */}
      <div className="bottom-grid">
        {/* Activity Feed */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 'clamp(14px, 2vw, 24px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', fontWeight: 600 }}>Recent Activity</h2>
            <span style={{ fontSize: 'clamp(10px, 1.1vw, 12px)', color: C.accent, cursor: 'pointer', fontWeight: 500 }}>View all</span>
          </div>
          <ActivityRow name="Sarah Chen" action="Deployed v2.4.0 to production" time="2m" avatar="SC" accent={C.accent} />
          <ActivityRow name="Marcus Webb" action="Merged PR #847 — auth refactor" time="18m" avatar="MW" accent={C.green} />
          <ActivityRow name="Ava Rodriguez" action="Opened issue: Dashboard lag on Safari" time="1h" avatar="AR" accent={C.amber} />
          <ActivityRow name="James Liu" action="Completed security audit review" time="3h" avatar="JL" accent={C.rose} />
          <ActivityRow name="Priya Sharma" action="Updated API rate limiting config" time="5h" avatar="PS" accent={C.accent} />
        </div>

        {/* Goals */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 'clamp(14px, 2vw, 24px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', fontWeight: 600 }}>Q2 Goals</h2>
            <span style={{
              fontSize: 'clamp(10px, 1.1vw, 12px)', color: C.green,
              background: C.greenSoft, padding: '3px 9px', borderRadius: 5, fontWeight: 600,
            }}>On Track</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <GoalCard title="Monthly Active Users" progress={85} target={15000} current={12847} color={C.accent} />
            <GoalCard title="Revenue Target" progress={72} target={67000} current={48290} color={C.green} />
            <GoalCard title="API Uptime" progress={99} target={100} current={99} color={C.amber} />
            <GoalCard title="NPS Score" progress={68} target={80} current={54} color={C.rose} />
          </div>
        </div>
      </div>
    </div>
  );
}
