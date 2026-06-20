'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_DIM  = 1280
const JPEG_Q   = 0.78
const DF_FILTERS = [
  { id:'original', name:'Original', css:'' },
  { id:'warm',     name:'Warm',     css:'sepia(0.3) saturate(1.4) hue-rotate(-10deg) brightness(1.05)' },
  { id:'cool',     name:'Cool',     css:'saturate(1.2) hue-rotate(20deg) brightness(1.02)' },
  { id:'bw',       name:'B & W',    css:'grayscale(1) contrast(1.1)' },
  { id:'vintage',  name:'Vintage',  css:'sepia(0.55) contrast(0.9) brightness(0.92) saturate(0.8)' },
  { id:'vivid',    name:'Vivid',    css:'saturate(1.8) contrast(1.1) brightness(1.05)' },
  { id:'matte',    name:'Matte',    css:'contrast(0.85) saturate(0.9) brightness(1.08)' },
  { id:'fade',     name:'Fade',     css:'contrast(0.75) brightness(1.15) saturate(0.7)' },
  { id:'drama',    name:'Drama',    css:'contrast(1.4) saturate(1.3) brightness(0.9)' },
]

interface Props {
  srcDataUrl: string
  onApply:  (dataUrl: string) => void
  onCancel: () => void
}

interface Crop { x:number; y:number; w:number; h:number }

export default function ImageEditor({ srcDataUrl, onApply, onCancel }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const cropBoxRef  = useRef<HTMLDivElement>(null)
  const imgRef      = useRef<HTMLImageElement|null>(null)

  const [activeFilter, setActiveFilter] = useState('original')
  const [cropEnabled,  setCropEnabled]  = useState(false)
  const [crop,         setCrop]         = useState<Crop>({ x:0, y:0, w:0, h:0 })
  const [canvasSize,   setCanvasSize]   = useState({ w:0, h:0 })
  const dragRef = useRef<null|{ type:string; startX:number; startY:number; startCrop:Crop; scale:number }>(null)

  /* ── load image into canvas ─────────────────────────────────── */
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      let w = img.naturalWidth, h = img.naturalHeight
      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM }
        else       { w = Math.round(w * MAX_DIM / h); h = MAX_DIM }
      }
      const canvas = canvasRef.current!
      canvas.width = w; canvas.height = h
      setCanvasSize({ w, h })
      setCrop({ x:0, y:0, w, h })
      drawCanvas(img, 'original')
    }
    img.src = srcDataUrl
  }, [srcDataUrl])

  const filterCss = (id: string) => DF_FILTERS.find(f => f.id === id)?.css ?? ''

  const drawCanvas = useCallback((img: HTMLImageElement, filterId: string) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    canvas.style.filter = filterCss(filterId)
  }, [])

  useEffect(() => {
    if (imgRef.current) drawCanvas(imgRef.current, activeFilter)
  }, [activeFilter, drawCanvas])

  /* ── crop box sync ──────────────────────────────────────────── */
  const canvasDomScale = () => {
    const canvas = canvasRef.current; if (!canvas) return 1
    return canvas.getBoundingClientRect().width / canvasSize.w
  }

  const syncCropBox = (c: Crop) => {
    const box = cropBoxRef.current; if (!box) return
    const s = canvasDomScale()
    box.style.left   = `${c.x * s}px`
    box.style.top    = `${c.y * s}px`
    box.style.width  = `${c.w * s}px`
    box.style.height = `${c.h * s}px`
  }

  useEffect(() => { if (cropEnabled) syncCropBox(crop) }, [crop, cropEnabled])

  /* ── drag handlers ──────────────────────────────────────────── */
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const dx = (clientX - dragRef.current.startX) * dragRef.current.scale
      const dy = (clientY - dragRef.current.startY) * dragRef.current.scale
      const { x, y, w, h } = dragRef.current.startCrop
      const { w: cW, h: cH } = canvasSize
      const MIN = 30
      let nx=x, ny=y, nw=w, nh=h
      const t = dragRef.current.type
      if (t === 'move') {
        nx = Math.max(0, Math.min(cW - w, x + dx))
        ny = Math.max(0, Math.min(cH - h, y + dy))
      } else {
        if (t.includes('e')) nw = Math.max(MIN, Math.min(cW - x, w + dx))
        if (t.includes('s')) nh = Math.max(MIN, Math.min(cH - y, h + dy))
        if (t.includes('w')) { const ex = Math.max(0, Math.min(x + w - MIN, x + dx)); nw = w + x - ex; nx = ex }
        if (t.includes('n')) { const ey = Math.max(0, Math.min(y + h - MIN, y + dy)); nh = h + y - ey; ny = ey }
      }
      const nc = { x:nx, y:ny, w:nw, h:nh }
      setCrop(nc)
      syncCropBox(nc)
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onUp)
    }
  }, [canvasSize])

  const startDrag = (type: string, e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragRef.current = {
      type,
      startX: clientX,
      startY: clientY,
      startCrop: { ...crop },
      scale: 1 / canvasDomScale(),
    }
    e.preventDefault()
  }

  /* ── apply ──────────────────────────────────────────────────── */
  const handleApply = () => {
    const img = imgRef.current; if (!img) return
    const sw = cropEnabled ? crop.w : canvasSize.w
    const sh = cropEnabled ? crop.h : canvasSize.h
    const sx = cropEnabled ? crop.x : 0
    const sy = cropEnabled ? crop.y : 0
    // Scale back to natural coords
    const scaleX = img.naturalWidth  / canvasSize.w
    const scaleY = img.naturalHeight / canvasSize.h
    const out = document.createElement('canvas')
    out.width  = Math.round(sw)
    out.height = Math.round(sh)
    const octx = out.getContext('2d')!

    // Apply filter matrix manually (can't use CSS filter on toDataURL)
    octx.drawImage(img, sx * scaleX, sy * scaleY, sw * scaleX, sh * scaleY, 0, 0, sw, sh)
    applyFilterPixels(octx, Math.round(sw), Math.round(sh), activeFilter)

    let q = JPEG_Q
    let url = out.toDataURL('image/jpeg', q)
    while (url.length * 0.75 > 1_500_000 && q > 0.3) { q -= 0.1; url = out.toDataURL('image/jpeg', q) }
    onApply(url)
  }

  return (
    <div className="img-editor">
      {/* header */}
      <div className="ie-header">
        <div className="ie-title">✂ Edit Photo</div>
        <div className="ie-header-actions">
          <button className="ie-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="ie-btn apply"  onClick={handleApply}>Use Photo</button>
        </div>
      </div>

      {/* toolbar */}
      <div className="ie-toolbar">
        <button
          className={`ie-tool-btn ${cropEnabled ? 'active' : ''}`}
          onClick={() => {
            const next = !cropEnabled
            setCropEnabled(next)
            if (next) { const c = { x:0,y:0,...canvasSize }; setCrop(c); syncCropBox(c) }
          }}
        >✂ Crop</button>
        <button className="ie-reset" onClick={() => {
          setActiveFilter('original')
          setCropEnabled(false)
          const c = { x:0,y:0,...canvasSize }; setCrop(c)
        }}>↺ Reset</button>
      </div>

      {/* canvas stage */}
      <div className="ie-stage">
        <div className="ie-canvas-wrap">
          <canvas ref={canvasRef} id="ie-canvas" />

          {/* crop overlay */}
          {cropEnabled && (
            <div
              ref={cropBoxRef}
              className="ie-crop-box"
              onMouseDown={e => startDrag('move', e)}
              onTouchStart={e => startDrag('move', e)}
            >
              {/* grid */}
              <div className="ie-grid-line" style={{position:'absolute',left:'33.3%',top:0,width:1,height:'100%'}} />
              <div className="ie-grid-line" style={{position:'absolute',left:'66.6%',top:0,width:1,height:'100%'}} />
              <div className="ie-grid-line" style={{position:'absolute',top:'33.3%',left:0,height:1,width:'100%'}} />
              <div className="ie-grid-line" style={{position:'absolute',top:'66.6%',left:0,height:1,width:'100%'}} />
              {['nw','n','ne','e','se','s','sw','w'].map(dir => (
                <div key={dir} className="ie-handle" data-dir={dir}
                  onMouseDown={e => { e.stopPropagation(); startDrag(dir, e) }}
                  onTouchStart={e => { e.stopPropagation(); startDrag(dir, e) }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* filter strip */}
      <div className="ie-filters">
        <div className="ie-filters-label">Filters</div>
        <div className="ie-filter-strip">
          {DF_FILTERS.map(f => (
            <FilterChip
              key={f.id}
              filter={f}
              active={activeFilter === f.id}
              src={srcDataUrl}
              onClick={() => setActiveFilter(f.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Filter thumbnail chip ───────────────────────────────────── */
function FilterChip({ filter, active, src, onClick }:{
  filter:{id:string;name:string;css:string}; active:boolean; src:string; onClick:()=>void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const img = new Image(); img.src = src
    img.onload = () => {
      canvas.width = 120; canvas.height = 88
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, 120, 88)
      canvas.style.filter = filter.css
    }
  }, [src, filter.css])

  return (
    <div className={`ie-filter-chip ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="ie-filter-thumb"><canvas ref={canvasRef} /></div>
      <div className="ie-filter-name">{filter.name}</div>
    </div>
  )
}

/* ── Pixel-level filter application (for canvas export) ────── */
function applyFilterPixels(ctx: CanvasRenderingContext2D, w: number, h: number, filterId: string) {
  const p: Record<string,any> = {
    warm:    { brighten:1.05, saturate:1.4,  hueShift:-10, sepia:0.3 },
    cool:    { brighten:1.02, saturate:1.2,  hueShift:20 },
    bw:      { grayscale:1,  contrast:1.1 },
    vintage: { sepia:0.55,   contrast:0.9,   brighten:0.92, saturate:0.8 },
    vivid:   { saturate:1.8, contrast:1.1,   brighten:1.05 },
    matte:   { contrast:0.85,saturate:0.9,   brighten:1.08 },
    fade:    { contrast:0.75,saturate:0.7,   brighten:1.15 },
    drama:   { contrast:1.4, saturate:1.3,   brighten:0.9 },
  }
  const params = p[filterId]; if (!params) return
  const { brighten=1, saturate=1, contrast=1, sepia=0, grayscale=0, hueShift=0 } = params
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    let r=data[i], g=data[i+1], b=data[i+2]
    if (grayscale) { const gr=.299*r+.587*g+.114*b; r+=(gr-r)*grayscale; g+=(gr-g)*grayscale; b+=(gr-b)*grayscale }
    if (sepia)     { const sr=.393*r+.769*g+.189*b,sg=.349*r+.686*g+.168*b,sb=.272*r+.534*g+.131*b; r+=(sr-r)*sepia; g+=(sg-g)*sepia; b+=(sb-b)*sepia }
    r*=brighten; g*=brighten; b*=brighten
    if (contrast!==1) { r=(r-128)*contrast+128; g=(g-128)*contrast+128; b=(b-128)*contrast+128 }
    if (saturate!==1) { const lum=.299*r+.587*g+.114*b; r=lum+(r-lum)*saturate; g=lum+(g-lum)*saturate; b=lum+(b-lum)*saturate }
    if (hueShift)  {
      const rad=hueShift*Math.PI/180, cos=Math.cos(rad), sin=Math.sin(rad)
      const nr=r*(.299+.701*cos+.168*sin)+g*(.587-.587*cos+.330*sin)+b*(.114-.114*cos-.497*sin)
      const ng=r*(.299-.299*cos-.328*sin)+g*(.587+.413*cos+.035*sin)+b*(.114-.114*cos+.292*sin)
      const nb=r*(.299-.3*cos+1.25*sin) +g*(.587-.588*cos-1.05*sin)+b*(.114+.886*cos-.203*sin)
      r=nr; g=ng; b=nb
    }
    data[i]=Math.max(0,Math.min(255,Math.round(r))); data[i+1]=Math.max(0,Math.min(255,Math.round(g))); data[i+2]=Math.max(0,Math.min(255,Math.round(b)))
  }
  ctx.putImageData(imgData, 0, 0)
}
