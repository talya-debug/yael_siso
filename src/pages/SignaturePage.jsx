import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import yaelLogo from '../assets/yael-logo.jpeg'

export default function SignaturePage() {
  const { token } = useParams()
  const canvasRef = useRef(null)
  const [signed, setSigned] = useState(false)
  const [signError, setSignError] = useState('')
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [sigRequest, setSigRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signerName, setSignerName] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('signatures')
        .select('*, tasks(name, phase_name)')
        .eq('token', token)
        .maybeSingle()
      setSigRequest(data)
      if (data?.status === 'signed') setSigned(true)
      setLoading(false)
    }
    load()
  }, [token])

  function getCtx() { return canvasRef.current?.getContext('2d') }

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top
    return { x, y }
  }

  function startDraw(e) {
    e.preventDefault()
    const ctx = getCtx()
    if (!ctx) return
    setDrawing(true)
    setHasDrawn(true)
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const ctx = getCtx()
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#091426'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function endDraw() { setDrawing(false) }

  function clearCanvas() {
    const ctx = getCtx()
    if (!ctx) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHasDrawn(false)
  }

  async function handleSign() {
    if (!hasDrawn || !signerName.trim()) return

    const signatureData = canvasRef.current?.toDataURL('image/png')

    // עדכון חתימה + סטטוס משימה דרך API (עוקף RLS)
    try {
      const res = await fetch('/api/update-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signer_name: signerName.trim(),
          signature_data: signatureData,
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setSignError(result.error || 'Failed to save signature. Please try again.')
        return
      }
    } catch (e) {
      setSignError('Failed to save signature. Please try again.')
      return
    }

    setSigned(true)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!sigRequest) return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <img src={yaelLogo} alt="Yael Siso" className="h-12 mx-auto mb-4" />
        <p className="text-[#6B7A90]">This signature link is invalid or has expired.</p>
      </div>
    </div>
  )

  if (signed) return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <img src={yaelLogo} alt="Yael Siso" className="h-12 mx-auto mb-4" />
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight mb-2">Signed Successfully</h1>
        <p className="text-[#6B7A90] text-sm">Thank you for signing. The design team has been notified.</p>
        <p className="text-[#6B7A90] text-xs mt-6 tracking-widest uppercase font-[Manrope]">YAEL SISO — Interior Design</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* לוגו */}
        <div className="flex flex-col items-center mb-6">
          <img src={yaelLogo} alt="Yael Siso" className="h-14 mb-2" />
        </div>

        <div className="border-t border-[#E2E8F0] pt-5 mb-5">
          <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight mb-1">
            Document Approval
          </h2>
          {sigRequest.tasks?.name && (
            <p className="text-sm text-[#7B5800] font-medium mb-1">{sigRequest.tasks.name}</p>
          )}
          {sigRequest.tasks?.phase_name && (
            <p className="text-xs text-[#6B7A90]">{sigRequest.tasks.phase_name}</p>
          )}
          <p className="text-sm text-[#6B7A90] mt-3">
            Please review the document and sign below to confirm your approval.
          </p>
        </div>

        {/* Signer name */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-1.5">Your Full Name</p>
          <input value={signerName} onChange={e => setSignerName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
        </div>

        {/* Signature canvas */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-1.5">Your Signature</p>
          <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={400}
              height={160}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <div className="flex justify-end mt-1.5">
            <button onClick={clearCanvas} className="text-xs text-[#6B7A90] hover:text-red-500 transition">Clear</button>
          </div>
        </div>

        {signError && <p className="text-red-500 text-sm mb-2">{signError}</p>}
        <button onClick={() => { setSignError(''); handleSign() }} disabled={!hasDrawn || !signerName.trim()}
          className="w-full bg-[#091426] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1E293B] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          Confirm & Sign
        </button>

        <p className="text-[10px] text-[#6B7A90] text-center mt-4">
          By signing, you confirm approval of the document presented to you.
        </p>
      </div>
    </div>
  )
}
