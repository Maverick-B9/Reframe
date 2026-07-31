import React, { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'landing' | 'parameters' | 'processing' | 'result' | 'history'
type Theme = 'dark' | 'light'
type UploadState = 'idle' | 'dragover' | 'uploading' | 'success' | 'error'
type HistoryFilter = 'all' | 'complete' | 'processing' | 'failed'

interface Preset {
  id: string
  label: string
  gradient: string
}

interface HistoryItem {
  id: string
  preset: string
  status: 'complete' | 'processing' | 'failed'
  timestamp: string
  duration?: string
  strength?: number
  model?: string
  gradient?: string
  originalVideoUrl?: string
  generatedVideoUrl?: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PRESETS: Preset[] = [
  { id: 'cinematic', label: 'Cinematic', gradient: 'linear-gradient(135deg, #2C1810 0%, #8B4513 55%, #D4A043 100%)' },
  { id: 'anime', label: 'Anime', gradient: 'linear-gradient(135deg, #00C9FF 0%, #7B2FFF 50%, #FF6B9D 100%)' },
  { id: 'oil-paint', label: 'Oil Paint', gradient: 'linear-gradient(135deg, #0B3D2E 0%, #2D7A58 50%, #9BD4B4 100%)' },
  { id: 'noir', label: 'Noir', gradient: 'linear-gradient(135deg, #0A0A0A 0%, #2A2A2A 55%, #4A4A4A 100%)' },
  { id: 'neon-city', label: 'Neon City', gradient: 'linear-gradient(135deg, #FF0080 0%, #7B2FFF 50%, #00FFC6 100%)' },
  { id: 'watercolor', label: 'Watercolor', gradient: 'linear-gradient(135deg, #FCE4EC 0%, #E3F2FD 50%, #F3E5F5 100%)' },
  { id: 'vintage', label: 'Vintage Film', gradient: 'linear-gradient(135deg, #3D2B1F 0%, #9C6B3C 50%, #D4A96A 100%)' },
  { id: 'dreamscape', label: 'Dreamscape', gradient: 'linear-gradient(135deg, #060620 0%, #5B0080 55%, #A855F7 100%)' },
]

/* 
const HISTORY: HistoryItem[] = [
  { id: '1', preset: 'Cinematic', status: 'complete', timestamp: '2 hours ago', duration: '0:34', strength: 75, model: 'Standard', gradient: 'linear-gradient(135deg, #2C1810 0%, #8B4513 55%, #D4A043 100%)' },
  { id: '2', preset: 'Neon City', status: 'complete', timestamp: '5 hours ago', duration: '1:12', strength: 90, model: 'Premium', gradient: 'linear-gradient(135deg, #FF0080 0%, #7B2FFF 50%, #00FFC6 100%)' },
  { id: '3', preset: 'Anime', status: 'processing', timestamp: '8 min ago', duration: '0:45', strength: 60, model: 'Standard', gradient: 'linear-gradient(135deg, #00C9FF 0%, #7B2FFF 50%, #FF6B9D 100%)' },
  { id: '4', preset: 'Noir', status: 'failed', timestamp: '1 day ago', duration: '0:28', strength: 85, model: 'Premium', gradient: 'linear-gradient(135deg, #0A0A0A 0%, #2A2A2A 55%, #4A4A4A 100%)' },
  { id: '5', preset: 'Dreamscape', status: 'complete', timestamp: '2 days ago', duration: '0:55', strength: 70, model: 'Turbo', gradient: 'linear-gradient(135deg, #060620 0%, #5B0080 55%, #A855F7 100%)' },
  { id: '6', preset: 'Watercolor', status: 'complete', timestamp: '3 days ago', duration: '1:03', strength: 50, model: 'Standard', gradient: 'linear-gradient(135deg, #FCE4EC 0%, #E3F2FD 50%, #F3E5F5 100%)' },
] 
*/

const STAGES = [
  'Uploading to secure storage',
  'Queued for processing',
  'Analyzing video frames',
  'Applying transformation',
  'Finalizing your video',
]

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = ({ sz = 24, sw = 1.5, children }: { sz?: number; sw?: number; children: React.ReactNode }) => (
  <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

const IUpload = ({ sz }: { sz?: number }) => <Ic sz={sz}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Ic>
const IVideo = ({ sz }: { sz?: number }) => <Ic sz={sz}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></Ic>
const IX = ({ sz }: { sz?: number }) => <Ic sz={sz}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ic>
const ICheck = ({ sz }: { sz?: number }) => <Ic sz={sz}><polyline points="20 6 9 17 4 12" /></Ic>
const IDownload = ({ sz }: { sz?: number }) => <Ic sz={sz}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Ic>
const IShare = ({ sz }: { sz?: number }) => <Ic sz={sz}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></Ic>
const IRefresh = ({ sz }: { sz?: number }) => <Ic sz={sz}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Ic>
const IHistory = ({ sz }: { sz?: number }) => <Ic sz={sz}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ic>
const IGrid = ({ sz }: { sz?: number }) => <Ic sz={sz}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></Ic>
const IPlay = ({ sz }: { sz?: number }) => <Ic sz={sz}><polygon points="5 3 19 12 5 21 5 3" /></Ic>
const IChevDown = ({ sz }: { sz?: number }) => <Ic sz={sz}><polyline points="6 9 12 15 18 9" /></Ic>
const IArrow = ({ sz }: { sz?: number }) => <Ic sz={sz}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Ic>
const IZap = ({ sz }: { sz?: number }) => <Ic sz={sz}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Ic>
const IAlert = ({ sz }: { sz?: number }) => <Ic sz={sz}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Ic>
const ISun = ({ sz }: { sz?: number }) => <Ic sz={sz}><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></Ic>
const IMoon = ({ sz }: { sz?: number }) => <Ic sz={sz}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></Ic>
const ISave = ({ sz }: { sz?: number }) => <Ic sz={sz}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></Ic>
const ISliders = ({ sz }: { sz?: number }) => <Ic sz={sz}><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></Ic>

// ─── Gradient orbs ────────────────────────────────────────────────────────────
const GradientOrbs = ({ intensity = 1, shift = false }: { intensity?: number; shift?: boolean }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', borderRadius: '50%', width: shift ? '700px' : '900px', height: shift ? '700px' : '900px', background: 'radial-gradient(circle at center, rgba(123,47,255,0.28) 0%, transparent 65%)', top: shift ? '-120px' : '-300px', left: shift ? '5%' : '-5%', filter: 'blur(70px)', animation: 'orb-drift 18s ease-in-out infinite', opacity: intensity }} />
    <div style={{ position: 'absolute', borderRadius: '50%', width: '550px', height: '550px', background: 'radial-gradient(circle at center, rgba(59,13,160,0.22) 0%, transparent 65%)', bottom: '-80px', right: '-3%', filter: 'blur(80px)', animation: 'orb-drift-alt 24s ease-in-out infinite', opacity: intensity }} />
    <div style={{ position: 'absolute', borderRadius: '50%', width: '380px', height: '380px', background: 'radial-gradient(circle at center, rgba(0,195,245,0.1) 0%, transparent 65%)', top: '45%', left: '58%', filter: 'blur(55px)', animation: 'orb-drift-slow 32s ease-in-out infinite', opacity: intensity * 0.7 }} />
  </div>
)

// ─── Progress ring SVG ────────────────────────────────────────────────────────
const ProgressRing = ({ progress, size = 80, sw = 3, dimTrack = false }: { progress: number; size?: number; sw?: number; dimTrack?: boolean }) => {
  const r = (size - sw * 2) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dimTrack ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#vg)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(progress, 100) / 100)} style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1)' }} />
      <defs>
        <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4A0FBF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  const color = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#7B2FFF'
  return (
    <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 14, background: 'rgba(20,20,22,0.97)', backdropFilter: 'blur(20px)', border: `1px solid ${color}40`, boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`, animation: 'toast-in 0.28s ease both', maxWidth: 380 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', lineHeight: 1.45 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-ink-faint)', cursor: 'pointer', padding: 0, marginLeft: 4, flexShrink: 0 }}><IX sz={16} /></button>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: 'complete' | 'processing' | 'failed' | 'pending' | string }) => {
  const m: Record<string, any> = { complete: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', c: '#10B981', label: 'Complete' }, processing: { bg: 'rgba(123,47,255,0.12)', border: 'rgba(123,47,255,0.3)', c: '#9B5FFF', label: 'Processing' }, failed: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', c: '#EF4444', label: 'Failed' }, pending: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', c: '#F59E0B', label: 'Pending' } }
  const s = m[status] || m.pending
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, border: `1px solid ${s.border}`, color: s.c, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c, boxShadow: `0 0 5px ${s.c}` }} />{s.label}</span>
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
const Btn = ({ onClick, disabled, full, size = 'md', variant = 'primary', ch, style: sx }: { onClick?: () => void; disabled?: boolean; full?: boolean; size?: 'sm' | 'md' | 'lg'; variant?: 'primary' | 'secondary' | 'ghost'; ch: React.ReactNode; style?: React.CSSProperties }) => {
  const ps = { sm: '8px 16px', md: '12px 24px', lg: '16px 32px' }
  const fs = { sm: 13, md: 14, lg: 16 }
  const vs: Record<string, React.CSSProperties> = {
    primary: { background: disabled ? 'rgba(123,47,255,0.35)' : 'linear-gradient(135deg, #5B10CC, #7B2FFF)', color: '#fff', border: 'none', boxShadow: disabled ? 'none' : '0 0 22px rgba(123,47,255,0.3)' },
    secondary: { background: 'var(--color-surface-raised)', color: 'var(--color-ink)', border: '1px solid var(--color-line-strong)' },
    ghost: { background: 'transparent', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, fontFamily: 'var(--font-sans)', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', width: full ? '100%' : undefined, padding: ps[size], fontSize: fs[size], transition: 'all 0.18s ease', ...vs[variant], ...sx }}>
      {ch}
    </button>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const Nav = ({ screen, setScreen, theme, setTheme }: { screen: Screen; setScreen: (s: Screen) => void; theme: Theme; setTheme: (t: Theme) => void }) => (
  <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-line)' }}>
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', height: 60 }}>
      <button onClick={() => setScreen('landing')} style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--color-ink)', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ color: '#7B2FFF' }}>RE</span>FRAME
      </button>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {screen !== 'processing' && (
          <>
            <NBtn active={screen === 'history'} onClick={() => setScreen('history')}><IHistory sz={15} /><span>History</span></NBtn>
            {screen !== 'landing' && (
              <NBtn active={false} onClick={() => setScreen('landing')}><IUpload sz={15} /><span>New Upload</span></NBtn>
            )}
          </>
        )}
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-raised)', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)', cursor: 'pointer' }}>
          {theme === 'light' ? <IMoon sz={16} /> : <ISun sz={16} />}
        </button>
      </div>
    </div>
  </nav>
)

const NBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: active ? 'rgba(123,47,255,0.15)' : 'transparent', border: active ? '1px solid rgba(123,47,255,0.3)' : '1px solid transparent', color: active ? '#9B5FFF' : 'var(--color-ink-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
    {children}
  </button>
)

// ─── LANDING ──────────────────────────────────────────────────────────────────
const LandingScreen = ({ onComplete }: { onComplete: (name: string) => void }) => {
  const [us, setUs] = useState<UploadState>('idle')
  const [prog, setProg] = useState(0)
  const [fname, setFname] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startUpload = useCallback(async (file: File) => {
    const valid = /\.(mp4|mov)$/i.test(file.name) || ['video/mp4', 'video/quicktime'].includes(file.type)
    if (!valid) { setErrMsg('Invalid format — please upload MP4 or MOV.'); setUs('error'); setTimeout(() => setUs('idle'), 2600); return }
    setFname(file.name); setUs('uploading'); setProg(5)
    
    try {
      // Upload using real Uploadcare client
      const UPLOADCARE_PUBLIC_KEY = import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY || 'e2e18c5d455856e78cb2';
      const result = await import('@uploadcare/upload-client').then(m => m.uploadFile(file, {
        publicKey: UPLOADCARE_PUBLIC_KEY,
        onProgress: (progress) => {
          if ('value' in progress) {
            setProg(5 + Math.round((progress.value as number) * 45));
          }
        }
      }));
      const simulatedUploadcareUrl = result.cdnUrl;
      setProg(50)
      
      // 2. Call our Next.js API route to upload to Cloudinary
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadcareUrl: simulatedUploadcareUrl })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      
      setProg(100)
      setUs('success')
      // Pass the Cloudinary URL (or fallback) to the next screen
      setTimeout(() => onComplete(data.cloudinaryUrl || file.name), 1700)
    } catch (e: any) {
      setErrMsg(e.message); setUs('error'); setTimeout(() => setUs('idle'), 2600);
    }
  }, [onComplete])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const zoneStyle: React.CSSProperties = {
    borderRadius: 20, padding: '52px 32px', position: 'relative', overflow: 'hidden',
    background: 'rgba(255,255,255,0.018)',
    cursor: us === 'uploading' || us === 'success' ? 'default' : 'pointer',
  }
  const zoneClass = us === 'dragover' ? 'drop-zone drop-zone-dragover' : us === 'success' ? 'drop-zone drop-zone-success' : us === 'error' ? 'drop-zone drop-zone-error' : 'drop-zone'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', position: 'relative', overflowX: 'hidden' }}>
      <GradientOrbs intensity={0.85} />
      {/* Subtle noise */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.022, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: 'repeat', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, paddingTop: 120, paddingBottom: 80 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }} className="anim-fade-up">
          <div className="font-mono-custom" style={{ fontSize: 11, letterSpacing: '0.26em', color: '#7B2FFF', textTransform: 'uppercase', marginBottom: 22, fontWeight: 500 }}>AI Video Transformation</div>
          <h1 className="font-display" style={{ fontSize: 'clamp(56px, 9.5vw, 104px)', fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 0.91, color: 'var(--color-ink)', margin: '0 auto 22px', textTransform: 'uppercase' }}>
            Transform<br /><span style={{ color: '#7B2FFF' }}>Any Video</span>
          </h1>
          <p style={{ fontSize: 18, color: 'var(--color-ink-muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6, fontWeight: 400 }}>
            Upload a source video. Choose your style. Receive a cinematic AI transformation in minutes.
          </p>
        </div>

        {/* Upload zone */}
        <div style={{ maxWidth: 640, margin: '0 auto 48px', padding: '0 24px' }}>
          <div
            className={zoneClass} style={zoneStyle}
            onDragOver={e => { e.preventDefault(); if (us === 'idle') setUs('dragover') }}
            onDragLeave={() => { if (us === 'dragover') setUs('idle') }}
            onDrop={e => { e.preventDefault(); setUs('idle'); const f = e.dataTransfer.files[0]; if (f) startUpload(f) }}
            onClick={() => { if (us === 'idle' || us === 'error') fileRef.current?.click() }}
          >
            <input ref={fileRef} type="file" accept=".mp4,.mov" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) startUpload(f); e.target.value = '' }} />

            {(us === 'idle' || us === 'dragover') && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }} className="anim-fade-up">
                <div style={{ width: 76, height: 76, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: us === 'dragover' ? 'rgba(123,47,255,0.22)' : 'rgba(123,47,255,0.1)', border: `1.5px solid ${us === 'dragover' ? 'rgba(123,47,255,0.5)' : 'rgba(123,47,255,0.22)'}`, color: '#7B2FFF', transition: 'all 0.2s ease', animation: 'float-y 4s ease-in-out infinite' }}>
                  <IUpload sz={34} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 7 }}>{us === 'dragover' ? 'Release to upload' : 'Drop your video here'}</div>
                  <div style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>or <span style={{ color: '#7B2FFF', fontWeight: 600 }}>click to browse</span></div>
                </div>
              </div>
            )}

            {us === 'uploading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }} className="anim-fade-up">
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <ProgressRing progress={prog} size={80} sw={3} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="font-mono-custom" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>{Math.round(prog)}%</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fname}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>Uploading…</div>
                </div>
                <button onClick={e => { e.stopPropagation(); if (timerRef.current) clearInterval(timerRef.current); setUs('idle') }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
                  <IX sz={14} /> Cancel
                </button>
              </div>
            )}

            {us === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }} className="anim-fade-up">
                <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(16,185,129,0.14)', border: '1.5px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                  <ICheck sz={34} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#10B981', marginBottom: 5 }}>Upload complete</div>
                  <div style={{ fontSize: 13, color: 'var(--color-ink-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fname}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>Redirecting to studio…</div>
              </div>
            )}

            {us === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }} className="anim-fade-up">
                <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                  <IAlert sz={34} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>{errMsg}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>Click to try again</div>
                </div>
              </div>
            )}
          </div>

          {/* Format info */}
          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
            {['MP4 or MOV', 'Up to 500 MB', 'Max 10 minutes'].map(l => (
              <span key={l} className="font-mono-custom" style={{ fontSize: 11, color: 'var(--color-ink-faint)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{l}</span>
            ))}
          </div>
        </div>

        {/* Sample transformations row */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span className="font-mono-custom" style={{ fontSize: 10, color: 'var(--color-ink-faint)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Sample transformations</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { p: 'Cinematic', b: 'linear-gradient(135deg,#1a1a2e 0%,#2d3561 100%)', a: 'linear-gradient(135deg,#2C1810 0%,#8B4513 55%,#D4A043 100%)' },
              { p: 'Neon City', b: 'linear-gradient(135deg,#0d1b2a 0%,#1b2f4c 100%)', a: 'linear-gradient(135deg,#FF0080 0%,#7B2FFF 50%,#00FFC6 100%)' },
              { p: 'Dreamscape', b: 'linear-gradient(135deg,#1a1a2e 0%,#2d3561 100%)', a: 'linear-gradient(135deg,#060620 0%,#5B0080 55%,#A855F7 100%)' },
            ].map(({ p, b, a }) => (
              <div key={p} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-line)', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                <div style={{ display: 'flex', height: 90 }}>
                  <div style={{ flex: 1, background: b, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="font-mono-custom" style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Before</span>
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
                  <div style={{ flex: 1, background: a, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="font-mono-custom" style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>After</span>
                  </div>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--color-surface-raised)', borderTop: '1px solid var(--color-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-ink-muted)' }}>{p}</span>
                  <IArrow sz={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PARAMETERS ───────────────────────────────────────────────────────────────
const ParametersScreen = ({ fileName, preset, setPreset, strength, setStrength, model, setModel, onTransform }: { fileName: string; preset: string; setPreset: (p: string) => void; strength: number; setStrength: (s: number) => void; model: string; setModel: (m: string) => void; onTransform: (id: string) => void }) => {
  const [showAdv, setShowAdv] = useState(false)
  const [seed, setSeed] = useState('42')
  const [prompt, setPrompt] = useState('')
  const [valErr, setValErr] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pData = PRESETS.find(p => p.id === preset)
  const prevGrad = pData?.gradient ?? 'linear-gradient(135deg,#1a1a2e 0%,#2d3561 100%)'
  const estTime = model === 'turbo' ? '30–60 sec' : model === 'premium' ? '3–6 min' : '1–3 min'

  const handleTransform = async () => {
    if (!preset) { setValErr('Please select a style preset to continue.'); return }
    if (isSubmitting) return;
    setValErr(''); 
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: fileName, // fileName contains the Cloudinary URL
          preset,
          prompt,
          strength,
          model,
          gradient: pData?.gradient
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transform failed');
      
      onTransform(data.jobId);
    } catch (e: any) {
      setValErr(e.message);
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', paddingTop: 60, position: 'relative' }}>
      <GradientOrbs intensity={0.45} shift />
      <div className="params-layout" style={{ position: 'relative', zIndex: 1, maxWidth: 1160, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, alignItems: 'start' }}>

        {/* Left: video preview */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div className="font-mono-custom" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-ink-faint)', textTransform: 'uppercase', marginBottom: 12 }}>Source Preview</div>
          <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-line)', position: 'relative', background: '#0E0E10' }}>
            <div style={{ paddingBottom: '56.25%', position: 'relative' }}>
              {fileName.startsWith('http') ? (
                <video src={fileName} controls autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', inset: 0, background: prevGrad, opacity: strength / 200, transition: 'opacity 0.3s ease, background 0.4s ease' }} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, padding: '14px 18px', borderRadius: 14, background: 'var(--color-surface-raised)', border: '1px solid var(--color-line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(123,47,255,0.1)', border: '1px solid rgba(123,47,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7B2FFF', flexShrink: 0 }}>
              <IVideo sz={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
              <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginTop: 2 }}>MP4 · 128 MB · 0:34</div>
            </div>
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-ink-faint)', textAlign: 'center' }}>Preview updates live as you adjust parameters</p>
        </div>

        {/* Right: param panel */}
        <div className="glass-panel" style={{ borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '22px 24px 0' }}>
            <div className="font-mono-custom" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-ink-faint)', textTransform: 'uppercase', marginBottom: 3 }}>Transform Studio</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>Parameters</h2>
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 26 }}>
            {/* Presets */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>Style Preset</label>
                {preset && <span style={{ fontSize: 12, color: '#9B5FFF', fontWeight: 500 }}>{pData?.label}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => { setPreset(p.id); setValErr('') }} style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer', padding: 0, border: preset === p.id ? '2px solid #7B2FFF' : '2px solid transparent', boxShadow: preset === p.id ? '0 0 12px rgba(123,47,255,0.35)' : 'none', transition: 'all 0.18s ease', background: 'none', transform: preset === p.id ? 'scale(1.04)' : 'scale(1)' }}>
                    <div style={{ height: 48, background: p.gradient }} />
                    <div style={{ padding: '5px 3px', background: 'var(--color-surface-high)', textAlign: 'center' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: preset === p.id ? '#9B5FFF' : 'var(--color-ink-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{p.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              {valErr && <div style={{ marginTop: 10, fontSize: 13, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}><IAlert sz={14} />{valErr}</div>}
            </section>

            {/* Prompt */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>Custom Prompt</label>
              </div>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe your desired transformation (optional)"
                style={{ width: '100%', height: 80, padding: 12, borderRadius: 12, background: 'var(--color-surface-high)', border: '1px solid var(--color-line)', color: 'var(--color-ink)', fontSize: 14, resize: 'none' }}
              />
            </section>

            {/* Strength */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>Transformation Strength</label>
                <span className="font-mono-custom" style={{ fontSize: 18, fontWeight: 500, color: '#9B5FFF', minWidth: 32, textAlign: 'right' }}>{strength}</span>
              </div>
              <div style={{ position: 'relative', height: 20 }}>
                <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: 4, borderRadius: 2, background: 'var(--color-surface-high)' }}>
                  <div style={{ height: '100%', width: `${strength}%`, background: 'linear-gradient(90deg, #4A0FBF, #7B2FFF)', borderRadius: 2, transition: 'width 0.08s ease' }} />
                </div>
                <input type="range" min={1} max={100} value={strength} onChange={e => setStrength(+e.target.value)} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 20, opacity: 0, cursor: 'pointer', width: '100%', margin: 0 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {['Subtle', 'Balanced', 'Intense'].map(l => (
                  <span key={l} className="font-mono-custom" style={{ fontSize: 10, color: 'var(--color-ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</span>
                ))}
              </div>
            </section>

            {/* Model */}
            <section>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 10 }}>Model / Quality</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-line)' }}>
                {[{ id: 'turbo', l: 'Turbo', s: '~45 sec', icon: true }, { id: 'standard', l: 'Standard', s: '~2 min', icon: false }, { id: 'premium', l: 'Premium', s: '~5 min', icon: false }].map(({ id, l, s, icon }, i) => (
                  <button key={id} onClick={() => setModel(id)} style={{ padding: '12px 6px', cursor: 'pointer', textAlign: 'center', background: model === id ? 'rgba(123,47,255,0.18)' : 'var(--color-surface-raised)', borderLeft: i > 0 ? '1px solid var(--color-line)' : 'none', border: 'none', borderLeftStyle: i > 0 ? 'solid' as const : 'none' as const, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'var(--color-line)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'background 0.15s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: model === id ? '#9B5FFF' : 'var(--color-ink)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
                      {icon && <IZap sz={13} />}{l}
                    </div>
                    <span className="font-mono-custom" style={{ fontSize: 10, color: model === id ? '#7B2FFF' : 'var(--color-ink-faint)', letterSpacing: '0.06em' }}>{s}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Advanced */}
            <section>
              <button onClick={() => setShowAdv(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-muted)', fontSize: 14, fontWeight: 500, padding: 0, fontFamily: 'var(--font-sans)' }}>
                <ISliders sz={16} /><span>Advanced Options</span><div style={{ flex: 1 }} />
                <div style={{ transform: showAdv ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><IChevDown sz={16} /></div>
              </button>
              {showAdv && (
                <div style={{ marginTop: 14, padding: 16, borderRadius: 12, background: 'var(--color-surface-raised)', border: '1px solid var(--color-line)', display: 'flex', flexDirection: 'column', gap: 14 }} className="anim-fade-up">
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-ink-muted)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Seed</label>
                    <input type="number" value={seed} onChange={e => setSeed(e.target.value)} placeholder="Random" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--color-surface-high)', border: '1px solid var(--color-line)', color: 'var(--color-ink)', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-ink-muted)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Temporal Consistency</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                      {['Low', 'Medium', 'High'].map(v => (
                        <button key={v} style={{ padding: '8px', borderRadius: 8, background: v === 'Medium' ? 'rgba(123,47,255,0.15)' : 'var(--color-surface-high)', border: `1px solid ${v === 'Medium' ? 'rgba(123,47,255,0.3)' : 'var(--color-line)'}`, color: v === 'Medium' ? '#9B5FFF' : 'var(--color-ink-muted)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* CTA */}
          <div style={{ padding: '18px 24px 24px', borderTop: '1px solid var(--color-line)' }}>
            <button onClick={handleTransform} disabled={!preset || isSubmitting} style={{ width: '100%', padding: '16px 24px', borderRadius: 14, background: preset ? 'linear-gradient(135deg,#5B10CC,#7B2FFF,#9B5FFF)' : 'rgba(123,47,255,0.22)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: preset && !isSubmitting ? 'pointer' : 'not-allowed', boxShadow: preset && !isSubmitting ? '0 0 28px rgba(123,47,255,0.32)' : 'none', transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? (
                <>
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Processing...
                </>
              ) : 'Transform Video'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 9, fontSize: 12, color: 'var(--color-ink-faint)' }}>
              Estimated time: <span style={{ color: 'var(--color-ink-muted)', fontWeight: 500 }}>{estTime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── PROCESSING ───────────────────────────────────────────────────────────────
const ProcessingScreen = ({ jobId, preset, onComplete, onLeave }: { jobId: string; preset: string; onComplete: (url?: string) => void; onLeave: () => void }) => {
  const [prog, setProg] = useState(0)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    let iv: any;
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`)
        const data = await res.json()
        if (data.success && data.job) {
          const { status, error, generatedVideoUrl } = data.job
          
          if (status === 'pending') {
             setProg(p => Math.min(p + 1.5, 30));
             setStage(1);
          } else if (status === 'processing') {
             // Fake progress for visual feedback while waiting
             setProg(p => Math.min(p + 4, 85));
             setStage(2);
          } else if (status === 'complete') {
             setProg(100);
             setStage(3);
             clearInterval(iv);
             setTimeout(() => onComplete(generatedVideoUrl), 700);
          } else if (status === 'failed') {
             clearInterval(iv);
             alert('Job Failed: ' + error);
          }
        }
      } catch (e) {
        console.error('Polling error', e)
      }
    }
    
    // Initial fetch, then poll
    pollStatus();
    iv = setInterval(pollStatus, 2500)
    
    return () => clearInterval(iv)
  }, [onComplete, jobId])

  const pData = PRESETS.find(p => p.id === preset)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <GradientOrbs intensity={1.05} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px', maxWidth: 520, gap: 0 }}>

        <div className="font-display" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.25em', color: 'rgba(155,95,255,0.55)', textTransform: 'uppercase', marginBottom: 48 }}>REFRAME</div>

        {/* Animation */}
        <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 44 }}>
          <div style={{ position: 'absolute', animation: 'spin-cw 20s linear infinite' }}>
            <svg width={280} height={280} viewBox="0 0 280 280"><circle cx={140} cy={140} r={128} fill="none" stroke="rgba(123,47,255,0.07)" strokeWidth={1} strokeDasharray="3 13" /></svg>
          </div>
          <div style={{ position: 'absolute', animation: 'spin-ccw 14s linear infinite' }}>
            <svg width={280} height={280} viewBox="0 0 280 280"><circle cx={140} cy={140} r={112} fill="none" stroke="rgba(123,47,255,0.13)" strokeWidth={1} strokeDasharray="5 10" /></svg>
          </div>
          <div style={{ position: 'absolute' }}>
            <ProgressRing progress={prog} size={200} sw={2.5} dimTrack />
          </div>
          {/* Pulse rings */}
          <div style={{ position: 'absolute', width: 168, height: 168, borderRadius: '50%', border: '1px solid rgba(123,47,255,0.18)', animation: 'pulse-ring 3s ease-out infinite' }} />
          <div style={{ position: 'absolute', width: 168, height: 168, borderRadius: '50%', border: '1px solid rgba(123,47,255,0.12)', animation: 'pulse-ring 3s ease-out infinite 1.5s' }} />
          <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,47,255,0.2) 0%, transparent 70%)', filter: 'blur(16px)' }} />
          {/* Center content */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span className="font-display" style={{ fontSize: 52, fontWeight: 900, color: 'var(--color-ink)', lineHeight: 1, letterSpacing: '-0.02em' }}>{Math.round(prog)}</span>
            <span className="font-mono-custom" style={{ fontSize: 12, color: 'rgba(155,95,255,0.65)', letterSpacing: '0.1em' }}>%</span>
          </div>
          {pData && (
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(123,47,255,0.15)', border: '1px solid rgba(123,47,255,0.25)', color: '#9B5FFF', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{pData.label}</div>
          )}
        </div>

        {/* Stage text */}
        <p key={stage} style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-ink)', margin: '0 0 20px', minHeight: 26, animation: 'stage-in 0.35s ease both' }}>{STAGES[stage]}</p>

        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: 380, marginBottom: 28 }}>
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${prog}%`, background: 'linear-gradient(90deg,#4A0FBF,#7B2FFF,#9B5FFF)', borderRadius: 2, transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '30%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)', animation: 'shimmer 2s ease-in-out infinite', borderRadius: 2 }} />
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-line)', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--color-ink-muted)', margin: 0, lineHeight: 1.6 }}>This usually takes <strong style={{ color: 'var(--color-ink)' }}>1–3 minutes</strong> depending on video length and model.</p>
        </div>

        <button onClick={onLeave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: 'none', border: '1px solid var(--color-line)', color: 'var(--color-ink-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
          Leave page — we'll notify you when done
        </button>
      </div>
    </div>
  )
}

// ─── BEFORE / AFTER SLIDER ────────────────────────────────────────────────────
const BASlider = ({ beforeUrl, afterUrl, beforeGradient, afterGradient }: { beforeUrl?: string; afterUrl?: string; beforeGradient: string; afterGradient: string }) => {
  const [pos, setPos] = useState(50)
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const calc = useCallback((cx: number) => {
    if (!ref.current) return
    const { left, width } = ref.current.getBoundingClientRect()
    setPos(Math.max(5, Math.min(95, ((cx - left) / width) * 100)))
  }, [])
  useEffect(() => {
    if (!drag) return
    const mv = (e: MouseEvent | TouchEvent) => calc('touches' in e ? e.touches[0].clientX : e.clientX)
    const up = () => setDrag(false)
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', mv, { passive: true }); window.addEventListener('touchend', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); window.removeEventListener('touchmove', mv); window.removeEventListener('touchend', up) }
  }, [drag, calc])

  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, cursor: drag ? 'col-resize' : 'ew-resize', userSelect: 'none', border: '1px solid var(--color-line)' }}>
      <div style={{ position: 'absolute', inset: 0, background: beforeGradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {beforeUrl && <video src={beforeUrl} autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <span className="font-mono-custom" style={{ position: 'relative', zIndex: 1, fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Original</span>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: afterGradient, clipPath: `inset(0 ${100 - pos}% 0 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {afterUrl && <video src={afterUrl} autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <span className="font-mono-custom" style={{ position: 'relative', zIndex: 1, fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Transformed</span>
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.85)', zIndex: 10, transform: 'translateX(-50%)', left: `${pos}%` }}>
        <div onMouseDown={e => { e.preventDefault(); setDrag(true) }} onTouchStart={e => { e.preventDefault(); setDrag(true) }} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: '#fff', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 24px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.15)', zIndex: 20 }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0A0A0B" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /><polyline points="9 6 15 12 9 18" /></svg>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 16, left: 16, padding: '4px 12px', borderRadius: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 5 }}>
        <span className="font-mono-custom" style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Before</span>
      </div>
      <div style={{ position: 'absolute', top: 16, right: 16, padding: '4px 12px', borderRadius: 20, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 5 }}>
        <span className="font-mono-custom" style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>After</span>
      </div>
      <div style={{ paddingBottom: '56.25%' }} />
    </div>
  )
}

// ─── RESULT ───────────────────────────────────────────────────────────────────
const ResultScreen = ({ preset, originalUrl, resultUrl, onTryAgain, onNewUpload, onHistory, showToast }: { preset: string; originalUrl: string; resultUrl: string; onTryAgain: () => void; onNewUpload: () => void; onHistory: () => void; showToast: (m: string) => void }) => {
  const pData = PRESETS.find(p => p.id === preset)
  const beforeGradient = 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)'
  const afterGradient = pData?.gradient ?? 'linear-gradient(135deg,#7B2FFF 0%,#4A0FBF 100%)'

  const handleDownload = async () => {
    if (!resultUrl) {
      showToast('No video to download', 'error');
      return;
    }
    showToast('Starting download...', 'info');
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `reframe-${preset}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      showToast('Download complete!');
    } catch (error) {
      console.error('Download failed via fetch, opening in new tab', error);
      const a = document.createElement('a');
      a.href = resultUrl;
      a.download = `reframe-${preset}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', paddingTop: 60, position: 'relative' }}>
      <GradientOrbs intensity={0.38} shift />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }} className="anim-fade-up">
          <div>
            <div className="font-mono-custom" style={{ fontSize: 11, letterSpacing: '0.2em', color: '#10B981', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }} />Transformation complete
            </div>
            <h1 className="font-display" style={{ fontSize: 44, fontWeight: 900, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>Your Result</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={() => showToast('Saved to your history')} ch={<><ISave sz={15} />Save</>} />
            <Btn variant="secondary" size="sm" onClick={() => showToast('Link copied to clipboard')} ch={<><IShare sz={15} />Share</>} />
            <Btn variant="primary" size="sm" onClick={handleDownload} ch={<><IDownload sz={15} />Download</>} />
          </div>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: 20 }} className="anim-fade-up">
          <BASlider beforeUrl={originalUrl} afterUrl={resultUrl} beforeGradient={beforeGradient} afterGradient={afterGradient} />
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 36, padding: '14px 20px', borderRadius: 14, background: 'var(--color-surface-raised)', border: '1px solid var(--color-line)' }}>
          {pData && <><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 32, height: 22, borderRadius: 6, background: pData.gradient }} /><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{pData.label}</span></div><div style={{ width: 1, height: 20, background: 'var(--color-line)' }} /></>}
          <span className="font-mono-custom" style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Strength 75</span>
          <div style={{ width: 1, height: 20, background: 'var(--color-line)' }} />
          <span className="font-mono-custom" style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>Standard model</span>
          <div style={{ width: 1, height: 20, background: 'var(--color-line)' }} />
          <StatusBadge status="complete" />
        </div>

        {/* Action cards */}
        <div className="result-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { icon: <IRefresh sz={22} />, title: 'Try different style', desc: 'Keep this source and apply a different preset.', action: 'Adjust parameters', onClick: onTryAgain, bg: 'rgba(123,47,255,0.12)', border: 'rgba(123,47,255,0.22)' },
            { icon: <IUpload sz={22} />, title: 'New video', desc: 'Upload a different source video to start fresh.', action: 'Upload new', onClick: onNewUpload, bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.22)' },
            { icon: <IGrid sz={22} />, title: 'View history', desc: 'Browse all your past transformations.', action: 'Open gallery', onClick: onHistory, bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          ].map(({ icon, title, desc, action, onClick, bg, border }) => (
            <div key={title} onClick={onClick} style={{ padding: 20, borderRadius: 18, background: bg, border: `1px solid ${border}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, transition: 'transform 0.18s ease' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-3px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
              <div style={{ color: 'var(--color-ink-muted)' }}>{icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 5 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-ink-muted)', marginTop: 'auto' }}>{action}<IArrow sz={14} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
const HistoryScreen = ({ onViewResult, onResumeProcessing, onNewUpload, showToast }: { onViewResult: (item: HistoryItem) => void; onResumeProcessing: (id: string, preset: string) => void; onNewUpload: () => void; showToast: (m: string) => void }) => {
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [hovered, setHovered] = useState<string | null>(null)
  const [historyList, setHistoryList] = useState<HistoryItem[]>([])
  
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      if (data.success && Array.isArray(data.jobs)) setHistoryList(data.jobs)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])
  
  const filtered = Array.isArray(historyList) ? historyList.filter(it => filter === 'all' || it.status === filter) : []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', paddingTop: 60 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }} className="anim-fade-up">
          <div>
            <div className="font-mono-custom" style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--color-ink-faint)', textTransform: 'uppercase', marginBottom: 8 }}>Your transformations</div>
            <h1 className="font-display" style={{ fontSize: 52, fontWeight: 900, color: 'var(--color-ink)', margin: 0, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>History</h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="secondary" onClick={fetchHistory} ch={<><IRefresh sz={16} />Refresh</>} />
            <Btn variant="primary" onClick={onNewUpload} ch={<><IUpload sz={16} />New Transform</>} />
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--color-surface-raised)', border: '1px solid var(--color-line)', width: 'fit-content', marginBottom: 24 }}>
          {(['all', 'complete', 'processing', 'pending', 'failed'] as HistoryFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: filter === f ? 'rgba(123,47,255,0.18)' : 'transparent', border: filter === f ? '1px solid rgba(123,47,255,0.3)' : '1px solid transparent', color: filter === f ? '#9B5FFF' : 'var(--color-ink-muted)', textTransform: 'capitalize', transition: 'all 0.14s ease', fontFamily: 'var(--font-sans)' }}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, gap: 22 }}>
            <div style={{ width: 96, height: 96, borderRadius: 24, background: 'var(--color-surface-raised)', border: '1px solid var(--color-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-faint)', animation: 'float-y 4s ease-in-out infinite' }}><IVideo sz={38} /></div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 8 }}>No transformations yet</div>
              <div style={{ fontSize: 15, color: 'var(--color-ink-muted)' }}>Upload a video to create your first AI transformation.</div>
            </div>
            <Btn variant="primary" onClick={onNewUpload} ch={<><IUpload sz={16} />Get started</>} />
          </div>
        ) : (
          <div className="history-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {filtered.map(item => {
              const failed = item.status === 'failed'
              const pending = item.status === 'pending' || item.status === 'processing'
              const h = hovered === item.id
              return (
                <div key={item.id} onClick={() => {
                    if (failed) return showToast('Retrying transformation…');
                    if (pending) return onResumeProcessing(item.id, item.preset);
                    onViewResult(item);
                  }} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)}
                  style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--color-line)', background: 'var(--color-surface-raised)', transform: h ? 'translateY(-4px)' : 'translateY(0)', boxShadow: h ? '0 16px 48px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.18)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', filter: failed ? 'saturate(0.25)' : undefined }}>
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', height: 155, background: item.gradient, overflow: 'hidden' }}>
                    {item.generatedVideoUrl ? (
                      <video src={item.generatedVideoUrl} muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : item.originalVideoUrl ? (
                      <video src={item.originalVideoUrl} muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                    ) : null}
                    <div style={{ position: 'absolute', bottom: 10, left: 10, width: 42, height: 30, borderRadius: 6, background: 'linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%)', border: '2px solid rgba(255,255,255,0.18)', zIndex: 2 }} />
                    <div className="font-mono-custom" style={{ position: 'absolute', bottom: 10, right: 10, padding: '3px 8px', borderRadius: 5, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', fontSize: 11, color: '#fff', letterSpacing: '0.04em', zIndex: 2 }}>0:02</div>
                    {h && !failed && !pending && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }} className="anim-fade-up">
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IPlay sz={20} /></div>
                      </div>
                    )}
                    {failed && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, flexDirection: 'column', gap: 8 }}><IAlert sz={26} /><span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>Failed</span></div>}
                    {pending && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#7B2FFF', animation: 'pulse-ring 1.5s ease-out infinite' }} /></div>}
                  </div>
                  {/* Body */}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 18, borderRadius: 5, background: PRESETS.find(p => p.id === item.preset)?.gradient ?? '#333', flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', textTransform: 'capitalize' }}>{(item.preset || 'unknown').replace('-', ' ')}</span>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      {[`Strength ${item.strength || 0}`, item.model || 'Unknown'].map((t, idx) => (
                        <span key={idx} className="font-mono-custom" style={{ padding: '2px 8px', borderRadius: 5, background: 'var(--color-surface-high)', fontSize: 10, color: 'var(--color-ink-faint)', letterSpacing: '0.05em', textTransform: 'uppercase', border: '1px solid var(--color-line)' }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="font-mono-custom" style={{ fontSize: 11, color: 'var(--color-ink-faint)', letterSpacing: '0.04em' }}>{new Date(item.timestamp).toLocaleDateString()}</span>
                      {failed
                        ? <button onClick={e => { e.stopPropagation(); showToast('Retrying transformation…') }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)' }}><IRefresh sz={13} />Retry</button>
                        : pending
                        ? <div style={{ color: '#7B2FFF', fontSize: 12, fontWeight: 600 }}>Processing...</div>
                        : <div style={{ color: h ? '#7B2FFF' : 'var(--color-ink-faint)', transition: 'color 0.15s' }}><IArrow sz={16} /></div>
                      }
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [theme, setTheme] = useState<Theme>('dark')
  const [fileName, setFileName] = useState('')
  const [preset, setPreset] = useState('cinematic')
  const [strength, setStrength] = useState(70)
  const [model, setModel] = useState('standard')
  const [jobId, setJobId] = useState('')
  const [originalUrl, setOriginalUrl] = useState('')
  const [resultUrl, setResultUrl] = useState('')
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' | 'info' } | null>(null)
  const [viewItem, setViewItem] = useState<HistoryItem | null>(null)

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', theme === 'light')
  }, [theme])

  const goScreen = useCallback((s: Screen) => { setViewItem(null); setScreen(s) }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)', color: 'var(--color-ink)' }}>
      {screen !== 'processing' && (
        <Nav screen={screen} setScreen={goScreen} theme={theme} setTheme={setTheme} />
      )}

      {screen === 'landing' && (
        <LandingScreen onComplete={name => { setFileName(name); setScreen('parameters') }} />
      )}
      {screen === 'parameters' && (
        <ParametersScreen
          fileName={fileName || 'source_video.mp4'}
          preset={preset} setPreset={setPreset}
          strength={strength} setStrength={setStrength}
          model={model} setModel={setModel}
          onTransform={(id) => { setJobId(id); setScreen('processing') }}
        />
      )}
      {screen === 'processing' && (
        <ProcessingScreen
          jobId={jobId}
          preset={preset}
          onComplete={(url) => { if (url) setResultUrl(url); setOriginalUrl(fileName); showToast('Transformation complete — saved to history.'); setScreen('result') }}
          onLeave={() => { showToast("Got it — we'll notify you when done.", 'info'); setScreen('history') }}
        />
      )}
      {screen === 'result' && (
        <ResultScreen
          preset={viewItem ? viewItem.preset.toLowerCase().replace(/ /g, '-') : preset}
          originalUrl={viewItem ? (viewItem.originalVideoUrl || '') : originalUrl}
          resultUrl={viewItem ? (viewItem.generatedVideoUrl || '') : resultUrl}
          onTryAgain={() => setScreen('parameters')}
          onNewUpload={() => { setFileName(''); setScreen('landing') }}
          onHistory={() => setScreen('history')}
          showToast={showToast}
        />
      )}
      {screen === 'history' && (
        <HistoryScreen
          onViewResult={item => { setViewItem(item); setPreset(item.preset.toLowerCase().replace(/ /g, '-')); setScreen('result') }}
          onResumeProcessing={(jobId: string, preset: string) => { setJobId(jobId); setPreset(preset); setScreen('processing') }}
          onNewUpload={() => { setFileName(''); setScreen('landing') }}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
