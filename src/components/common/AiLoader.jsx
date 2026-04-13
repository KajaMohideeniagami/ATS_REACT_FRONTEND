import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const DEMAND_STEPS = [
  {
    id: 0,
    label: 'Analyzing Job Description',
    sub: 'Parsing structure and tone',
    icon: 'scan',
    color: '#6366f1',
  },
  {
    id: 1,
    label: 'Extracting Required Skills',
    sub: 'Technical & soft skills identified',
    icon: 'layers',
    color: '#8b5cf6',
  },
  {
    id: 2,
    label: 'Identifying Responsibilities',
    sub: 'Core duties and expectations',
    icon: 'target',
    color: '#a855f7',
  },
  {
    id: 3,
    label: 'Deriving Keywords',
    sub: 'Role-specific tags generated',
    icon: 'chart',
    color: '#7c3aed',
  },
  {
    id: 4,
    label: 'Generating Summary',
    sub: 'AI extraction ready',
    icon: 'sparkle',
    color: '#4f46e5',
  },
];

const PROFILE_STEPS = [
  {
    id: 0,
    label: 'Parsing Resume',
    sub: 'Reading skills and experience',
    icon: 'scan',
    color: '#6366f1',
  },
  {
    id: 1,
    label: 'Extracting Core Skills',
    sub: 'Mapping technical strengths',
    icon: 'layers',
    color: '#8b5cf6',
  },
  {
    id: 2,
    label: 'Matching JD Summary',
    sub: 'Cross-referencing demand requirements',
    icon: 'target',
    color: '#a855f7',
  },
  {
    id: 3,
    label: 'Scoring Fit',
    sub: 'Skills & experience alignment',
    icon: 'chart',
    color: '#7c3aed',
  },
  {
    id: 4,
    label: 'Generating Insights',
    sub: 'Summary & match score',
    icon: 'sparkle',
    color: '#4f46e5',
  },
];

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 4 + 3,
  delay: Math.random() * 3,
}));

const Icon = ({ name, size = 18 }) => {
  const s = size;
  const icons = {
    scan: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
        <line x1="3" y1="12" x2="21" y2="12"/>
      </svg>
    ),
    layers: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>
    ),
    target: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    chart: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    sparkle: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
      </svg>
    ),
    check: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  };
  return icons[name] ?? null;
};

const NeuralOrb = () => (
  <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 24px' }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        style={{
          position: 'absolute',
          inset: -(i * 12),
          borderRadius: '50%',
          border: `1px solid rgba(139, 92, 246, ${0.18 - i * 0.05})`,
        }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5 + i * 0.6, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
      />
    ))}
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 32px rgba(139, 92, 246, 0.45), 0 0 64px rgba(99, 102, 241, 0.2)',
      }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'rgba(255,255,255,0.6)',
          borderRightColor: 'rgba(255,255,255,0.2)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
      />
      <svg width={30} height={30} viewBox="0 0 24 24" fill="none" style={{ color: 'white', position: 'relative' }}>
        <path d="M12 2a10 10 0 1 0 10 10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M12 6v6l4 2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.div>
  </div>
);

const StepRow = ({ step, state, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: state === 'pending' ? 0.35 : 1, x: 0 }}
    transition={{ delay: index * 0.08, duration: 0.35 }}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      borderRadius: 10,
      background: state === 'active' ? 'rgba(139,92,246,0.08)' : 'transparent',
      border: state === 'active' ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent',
      transition: 'background 0.3s, border 0.3s',
    }}
  >
    <motion.div
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        background:
          state === 'done'
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : state === 'active'
            ? `linear-gradient(135deg, ${step.color}, #a855f7)`
            : 'rgba(99,102,241,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: state === 'pending' ? 'rgba(139,92,246,0.4)' : 'white',
        boxShadow: state === 'active' ? `0 0 12px ${step.color}55` : 'none',
      }}
      animate={state === 'active' ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 1.2, repeat: Infinity }}
    >
      <Icon name={state === 'done' ? 'check' : step.icon} size={15} />
    </motion.div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 13,
        fontWeight: 500,
        color: state === 'pending' ? '#94a3b8' : '#e2e8f0',
        letterSpacing: '0.01em',
      }}>
        {step.label}
      </div>
      {state !== 'pending' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}
        >
          {step.sub}
        </motion.div>
      )}
    </div>

    {state === 'active' && (
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity }}
        style={{
          width: 6, height: 6, borderRadius: '50%',
          background: step.color,
          boxShadow: `0 0 6px ${step.color}`,
          flexShrink: 0,
        }}
      />
    )}
    {state === 'done' && (
      <div style={{ color: '#10b981', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>✓</div>
    )}
  </motion.div>
);

const AiLoader = ({
  mode = 'demand',
  title,
  duration = 6200,
  onComplete,
  className = '',
}) => {
  const steps = useMemo(() => (mode === 'profile' ? PROFILE_STEPS : DEMAND_STEPS), [mode]);
  const finalTitle = title || (mode === 'profile' ? 'Profile Analysis' : 'JD Extraction');
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState(new Set());
  const [completed, setCompleted] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const raw = Math.min(elapsed / duration, 1);
      const eased = ease(raw);
      const pct = Math.round(eased * 100);
      setProgress(pct);

      const stepIndex = Math.min(Math.floor(eased * steps.length), steps.length - 1);
      setActiveStep(stepIndex);
      setDoneSteps(new Set(Array.from({ length: stepIndex }, (_, i) => i)));

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCompleted(true);
        setDoneSteps(new Set(steps.map((s) => s.id)));
        onComplete?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [duration, onComplete, steps]);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        borderRadius: 16,
        padding: 20,
        background: 'linear-gradient(160deg, #0f1629 0%, #0d1120 100%)',
        border: '1px solid rgba(139,92,246,0.18)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 18px 48px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: 'rgba(139,92,246,0.55)',
            }}
            animate={{ y: [0, -30, 0], opacity: [0, 0.7, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <NeuralOrb />
        <motion.div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 20, padding: '4px 14px', marginBottom: 10,
          }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} />
          <span style={{ fontSize: 11.5, color: '#a78bfa', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            AI Processing
          </span>
        </motion.div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
          {finalTitle}
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#64748b' }}>
          {mode === 'profile' ? 'Analyzing resume vs demand requirements' : 'Extracting insights from JD'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
        {steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            index={i}
            state={
              completed || doneSteps.has(step.id)
                ? 'done'
                : activeStep === step.id
                ? 'active'
                : 'pending'
            }
          />
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={activeStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ fontSize: 12, color: '#94a3b8' }}
            >
              {completed ? 'Analysis complete' : `${steps[activeStep]?.label}...`}
            </motion.span>
          </AnimatePresence>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', fontVariantNumeric: 'tabular-nums' }}>
            {progress}%
          </span>
        </div>

        <div style={{
          height: 5,
          borderRadius: 99,
          background: 'rgba(99,102,241,0.12)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <motion.div
            style={{
              height: '100%',
              borderRadius: 99,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)',
              boxShadow: '0 0 10px rgba(139,92,246,0.6)',
              transformOrigin: 'left',
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          <motion.div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    </div>
  );
};

export default AiLoader;
