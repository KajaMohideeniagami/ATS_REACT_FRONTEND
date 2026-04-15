import React, { useEffect, useMemo, useRef, useState } from 'react';

const STALL_AT = 90;

const DEMAND_STEPS = [
  { id: 0, label: 'Analyzing Job Description', sub: 'Parsing structure and tone', icon: 'scan', color: '#6366f1' },
  { id: 1, label: 'Extracting Required Skills', sub: 'Technical and soft skills identified', icon: 'layers', color: '#8b5cf6' },
  { id: 2, label: 'Extracting JD Keywords', sub: 'Role keywords and constraints mapped', icon: 'target', color: '#a855f7' },
  { id: 3, label: 'Evaluating Experience Band', sub: 'Seniority and domain fit scoring', icon: 'chart', color: '#7c3aed' },
  { id: 4, label: 'Generating JD Insights', sub: 'Summary ready for profile matching', icon: 'sparkle', color: '#4f46e5' },
];

const PROFILE_STEPS = [
  { id: 0, label: 'Parsing Resume Content', sub: 'Reading candidate profile and sections', icon: 'scan', color: '#6366f1' },
  { id: 1, label: 'Extracting Candidate Skills', sub: 'Technical and soft skills identified', icon: 'layers', color: '#8b5cf6' },
  { id: 2, label: 'Matching With JD Summary', sub: 'Cross-referencing demand requirements', icon: 'target', color: '#a855f7' },
  { id: 3, label: 'Calculating Match Score', sub: 'Weighted fit evaluation in progress', icon: 'chart', color: '#7c3aed' },
  { id: 4, label: 'Generating Final Insights', sub: 'Summary, matching, and score output', icon: 'sparkle', color: '#4f46e5' },
];

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 4 + 3,
  delay: Math.random() * 3,
}));

const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

const Icon = ({ name, size = 15 }) => {
  const s = size;
  const common = {
    width: s,
    height: s,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.9',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  if (name === 'scan') {
    return (
      <svg {...common}>
        <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    );
  }
  if (name === 'layers') {
    return (
      <svg {...common}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  }
  if (name === 'target') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }
  if (name === 'chart') {
    return (
      <svg {...common}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  }
  if (name === 'sparkle') {
    return (
      <svg {...common}>
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
};

const StepRow = ({ step, state }) => {
  const isPending = state === 'pending';
  const isActive = state === 'active';
  const isDone = state === 'done';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 10,
        background: isActive ? 'rgba(139,92,246,0.08)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(139,92,246,0.2)' : 'transparent'}`,
        opacity: isPending ? 0.35 : 1,
        transition: 'all 0.25s ease',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: isDone
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : isActive
            ? `linear-gradient(135deg, ${step.color}, #a855f7)`
            : 'rgba(99,102,241,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: isPending ? 'rgba(139,92,246,0.4)' : 'white',
          boxShadow: isActive ? `0 0 12px ${step.color}55` : 'none',
          animation: isActive ? 'aiPulse 1.2s infinite' : 'none',
        }}
      >
        <Icon name={isDone ? 'check' : step.icon} size={15} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isPending ? '#94a3b8' : '#e2e8f0',
            letterSpacing: '0.01em',
          }}
        >
          {step.label}
        </div>
        {!isPending && (
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
            {step.sub}
          </div>
        )}
      </div>

      {isActive && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: step.color,
            boxShadow: `0 0 6px ${step.color}`,
            flexShrink: 0,
            animation: 'aiBlink 1s infinite',
          }}
        />
      )}
      {isDone && <span style={{ color: '#10b981', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>v</span>}
    </div>
  );
};

const AiLoader = ({
  mode = 'demand',
  apiCall,
  onComplete,
  onError,
  title,
  duration = 5500,
  className = '',
}) => {
  const steps = useMemo(() => (mode === 'profile' ? PROFILE_STEPS : DEMAND_STEPS), [mode]);
  const displayTitle = title || (mode === 'profile' ? 'AI Profile Analysis' : 'AI JD Extraction');

  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState(new Set());
  const [completed, setCompleted] = useState(false);
  const [isStalled, setIsStalled] = useState(false);

  const rafRef = useRef(null);
  const startRef = useRef(null);
  const apiResolvedRef = useRef(false);
  const apiResultRef = useRef(null);

  useEffect(() => {
    if (!apiCall) return undefined;

    let cancelled = false;
    apiCall()
      .then((result) => {
        if (cancelled) return;
        apiResultRef.current = result;
        apiResolvedRef.current = true;
      })
      .catch((err) => {
        if (cancelled) return;
        onError?.(err);
        apiResultRef.current = { error: err };
        apiResolvedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [apiCall, onError]);

  useEffect(() => {
    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const raw = Math.min(elapsed / duration, 1);
      const eased = easeInOutQuad(raw);

      const target = Math.min(Math.round(eased * STALL_AT), STALL_AT - 1);

      if (!apiCall) {
        setProgress(target);
        setIsStalled(target >= STALL_AT - 1);
        const stepIdx = Math.min(Math.floor((target / 100) * steps.length), steps.length - 1);
        setActiveStep(stepIdx);
        setDoneSteps(new Set(Array.from({ length: stepIdx }, (_, i) => i)));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!apiResolvedRef.current) {
        setProgress(target);
        setIsStalled(target >= STALL_AT - 1);
        const stepIdx = Math.min(Math.floor((target / 100) * steps.length), steps.length - 1);
        setActiveStep(stepIdx);
        setDoneSteps(new Set(Array.from({ length: stepIdx }, (_, i) => i)));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      setProgress(100);
      setIsStalled(false);
      setCompleted(true);
      setDoneSteps(new Set(steps.map((s) => s.id)));
      onComplete?.(apiResultRef.current);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [apiCall, duration, onComplete, steps]);

  const statusText = completed
    ? 'Analysis complete'
    : isStalled
    ? 'Waiting for AI response...'
    : `${steps[activeStep]?.label || 'Analyzing'}...`;

  return (
    <div
      className={className}
      style={{
        width: '100%',
        borderRadius: 20,
        padding: '24px 22px',
        background: 'linear-gradient(160deg, #0f1629 0%, #0d1120 100%)',
        border: '1px solid rgba(139,92,246,0.18)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.35)',
      }}
    >
      <style>{`
        @keyframes aiFloat { 0%,100% { transform: translateY(0px); opacity: 0; } 50% { transform: translateY(-30px); opacity: 0.7; } }
        @keyframes aiPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes aiBlink { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
        @keyframes aiRotate { to { transform: rotate(360deg); } }
        @keyframes aiShimmer { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
        @keyframes aiRing { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.06); opacity: 1; } }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: 'rgba(139,92,246,0.55)',
              animation: `aiFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: -(i * 12),
                borderRadius: '50%',
                border: `1px solid rgba(139,92,246,${0.18 - i * 0.05})`,
                animation: `aiRing ${2.5 + i * 0.6}s ease-in-out ${i * 0.4}s infinite`,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 32px rgba(139,92,246,0.45), 0 0 64px rgba(99,102,241,0.2)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 4,
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: 'rgba(255,255,255,0.65)',
                borderRightColor: 'rgba(255,255,255,0.2)',
                animation: 'aiRotate 1.6s linear infinite',
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: 20,
            padding: '4px 14px',
            marginBottom: 12,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} />
          <span style={{ fontSize: 11.5, color: '#a78bfa', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            AI Processing
          </span>
        </div>

        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
          {displayTitle}
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#64748b' }}>
          {mode === 'profile' ? 'Extracting profile summary and match score' : 'Extracting JD summary and requirement insights'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
        {steps.map((step, i) => {
          const state = completed || doneSteps.has(step.id)
            ? 'done'
            : activeStep === i
            ? 'active'
            : 'pending';
          return <StepRow key={step.id} step={step} state={state} />;
        })}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: isStalled && !completed ? '#f59e0b' : '#94a3b8' }}>{statusText}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#a78bfa',
              fontVariantNumeric: 'tabular-nums',
              animation: isStalled && !completed ? 'aiBlink 1.2s infinite' : 'none',
            }}
          >
            {progress}%
          </span>
        </div>

        <div style={{ height: 5, borderRadius: 99, background: 'rgba(99,102,241,0.12)', overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 99,
              width: `${progress}%`,
              transition: completed ? 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)' : 'width 0.25s ease-out',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)',
              boxShadow: '0 0 10px rgba(139,92,246,0.6)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
              animation: 'aiShimmer 1.8s linear infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AiLoader;
