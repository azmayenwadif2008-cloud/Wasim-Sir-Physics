import { useEffect, useMemo, useRef, useState } from 'react';
import { LabParamControl, LabShell } from './LabShell';

function prepareCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return null;
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

/* ============================================================================
   Chapter 01 Sub-Lab A: Vernier Calipers Precision & Zero Error
   ============================================================================ */
export function VernierCalipersLab() {
  const [trueLengthCm, setTrueLengthCm] = useState(2.36);
  const [vcCm, setVcCm] = useState<0.01 | 0.005>(0.01);
  const [zeroErrorCm, setZeroErrorCm] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const calc = useMemo(() => {
    const observed = Math.max(0.2, trueLengthCm + zeroErrorCm);
    const mainScaleCm = Math.floor(observed * 10 + 1e-6) / 10;
    const remainder = Math.max(0, observed - mainScaleCm);
    const vernierDivs = Math.round(remainder / vcCm);
    const maxDivs = vcCm === 0.01 ? 10 : 20;
    const clampedV = Math.min(maxDivs - 1, Math.max(0, vernierDivs));
    const measured = mainScaleCm + clampedV * vcCm - zeroErrorCm;
    return { observed, mainScaleCm, vernierDiv: clampedV, maxDivs, measured };
  }, [trueLengthCm, vcCm, zeroErrorCm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = prepareCanvas(canvas);
    if (!frame) return;
    const { ctx, width, height } = frame;

    const pxPerCm = Math.min(95, (width - 80) / 6.5);
    const originX = 48;
    const beamY = height * 0.42;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 24; x < width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Steel beam
    const steelGrad = ctx.createLinearGradient(0, beamY - 38, 0, beamY);
    steelGrad.addColorStop(0, '#334155');
    steelGrad.addColorStop(0.5, '#1E293B');
    steelGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = steelGrad;
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(originX - 18, beamY - 38, width - originX, 38, 4);
    ctx.fill();
    ctx.stroke();

    // Fixed left jaw
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(originX - 16, beamY);
    ctx.lineTo(originX, beamY);
    ctx.lineTo(originX, beamY + 102);
    ctx.lineTo(originX - 10, beamY + 86);
    ctx.lineTo(originX - 16, beamY + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Main Scale graduations
    ctx.strokeStyle = '#E2E8F0';
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '10px "IBM Plex Mono", monospace';
    for (let mm = 0; mm <= 55; mm++) {
      const x = originX + (mm / 10) * pxPerCm;
      if (x > width - 26) break;
      const isCm = mm % 10 === 0;
      const isHalf = mm % 5 === 0;
      const tickH = isCm ? 16 : isHalf ? 11 : 7;
      ctx.lineWidth = isCm ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, beamY);
      ctx.lineTo(x, beamY - tickH);
      ctx.stroke();
      if (isCm) ctx.fillText(`${mm / 10}`, x - 3, beamY - 21);
    }

    // Measured Object (Cylindrical metal rod with 3D studio rose-pink gradient)
    const objW = trueLengthCm * pxPerCm;
    const objGrad = ctx.createLinearGradient(originX, 0, originX + objW, 0);
    objGrad.addColorStop(0, '#DB2777');
    objGrad.addColorStop(0.5, '#FBCFE8');
    objGrad.addColorStop(1, '#9D174D');
    ctx.fillStyle = objGrad;
    ctx.fillRect(originX, beamY + 36, objW, 52);
    ctx.strokeStyle = '#F472B6';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(originX, beamY + 36, objW, 52);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px "IBM Plex Mono", monospace';
    ctx.fillText(`d = ${trueLengthCm.toFixed(2)} cm`, originX + Math.max(6, objW / 2 - 36), beamY + 66);

    // Sliding Vernier caliper jaw
    const jawX = originX + calc.observed * pxPerCm;
    const vernierSpan = (calc.maxDivs === 10 ? 0.9 : 1.9) * pxPerCm;
    ctx.fillStyle = 'rgba(10, 13, 22, 0.95)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(jawX - 4, beamY + 2, vernierSpan + 28, 34, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(jawX, beamY + 36);
    ctx.lineTo(jawX + 14, beamY + 36);
    ctx.lineTo(jawX + 14, beamY + 86);
    ctx.lineTo(jawX + 6, beamY + 102);
    ctx.lineTo(jawX, beamY + 102);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i <= calc.maxDivs; i++) {
      const vx = jawX + (i / calc.maxDivs) * vernierSpan;
      const isCoincide = i === calc.vernierDiv;
      ctx.strokeStyle = isCoincide ? '#F472B6' : '#38BDF8';
      ctx.lineWidth = isCoincide ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(vx, beamY + 2);
      ctx.lineTo(vx, beamY + (i % 5 === 0 || isCoincide ? 17 : 12));
      ctx.stroke();

      if (isCoincide) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#F472B6';
        ctx.beginPath();
        ctx.moveTo(vx, beamY - 14);
        ctx.lineTo(vx, beamY + 26);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#F472B6';
        ctx.font = 'bold 10px "IBM Plex Mono", monospace';
        ctx.fillText(`V = ${calc.vernierDiv}`, vx - 12, beamY + 32);
      }
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillText(`M = ${calc.mainScaleCm.toFixed(1)} cm | VC = ${vcCm} cm`, 18, height - 16);
    ctx.restore();
  }, [trueLengthCm, vcCm, calc]);

  return (
    <LabShell
      symbolGuide="L = প্রকৃত দৈর্ঘ্য · M = প্রধান স্কেল · V = ভার্নিয়ার সমপাতন · VC = ভার্নিয়ার ধ্রুবক"
      onReset={() => {
        setTrueLengthCm(2.36);
        setVcCm(0.01);
        setZeroErrorCm(0);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="ভার্নিয়ার ক্যালিপার্স সিমুলেশন" />}
      metrics={[
        { label: 'প্রধান স্কেল (M)', value: `${calc.mainScaleCm.toFixed(1)} cm`, accentClass: 'text-sky-300' },
        { label: 'ভার্নিয়ার সমপাতন (V)', value: `${calc.vernierDiv} দাগ`, accentClass: 'text-pink-300' },
        { label: 'পর্যবেক্ষিত পাঠ', value: `${calc.observed.toFixed(3)} cm`, accentClass: 'text-purple-300' },
        { label: 'প্রকৃত দৈর্ঘ্য (L)', value: `${calc.measured.toFixed(3)} cm`, accentClass: 'text-green-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="v-len"
            label="বস্তুর দৈর্ঘ্য (d)"
            value={Number(trueLengthCm.toFixed(3))}
            min={0.8}
            max={4.6}
            step={0.01}
            unit="cm"
            inputMin={0.1}
            inputMax={12}
            onChange={setTrueLengthCm}
          />
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-slate-200">ভার্নিয়ার ধ্রুবক (VC)</span>
              <span className="font-mono text-sky-300 tabular-nums">{vcCm} cm</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([0.01, 0.005] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setVcCm(val)}
                  className={`px-3 py-2 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                    vcCm === val ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold' : 'bg-[#0C0E13] border-[#2E3442] text-slate-300'
                  }`}
                >
                  {val === 0.01 ? '0.01 cm (১০ ভাগ)' : '0.005 cm (২০ ভাগ)'}
                </button>
              ))}
            </div>
          </div>
          <LabParamControl
            id="v-err"
            label="যান্ত্রিক ত্রুটি (e)"
            value={Number(zeroErrorCm.toFixed(3))}
            min={-0.03}
            max={0.03}
            step={0.01}
            unit="cm"
            inputMin={-0.2}
            inputMax={0.2}
            onChange={setZeroErrorCm}
          />
        </>
      }
      boardTip="ধনাত্মক যান্ত্রিক ত্রুটি থাকলে তা মূল পাঠ থেকে বিয়োগ করতে হয় এবং ঋণাত্মক ত্রুটি থাকলে যোগ করতে হয়।"
    />
  );
}

/* ============================================================================
   Chapter 01 Sub-Lab B: 3D Rotating Screw Gauge (Micrometer)
   ============================================================================ */
export function ScrewGaugeLab() {
  const [wireDiaMm, setWireDiaMm] = useState(1.45);
  const [pitchMm, setPitchMm] = useState(1.0);
  const [circularDivs, setCircularDivs] = useState(100);
  const [running, setRunning] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const leastCount = pitchMm / circularDivs;
  const mainScaleMm = Math.floor(wireDiaMm);
  const circularReading = Math.round((wireDiaMm - mainScaleMm) / leastCount);
  const measuredDia = mainScaleMm + circularReading * leastCount;

  useEffect(() => {
    let animId: number;
    let rotationAngle = 0;

    const render = () => {
      if (running) {
        rotationAngle += 0.02;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const cx = width * 0.38;
          const cy = height * 0.5;

          // Technical background grid
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
          ctx.lineWidth = 1;
          for (let x = 20; x < width; x += 25) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }

          // 3D Metallic U-Frame
          const uGrad = ctx.createLinearGradient(cx - 140, cy - 100, cx - 140, cy + 100);
          uGrad.addColorStop(0, '#475569');
          uGrad.addColorStop(0.5, '#1E293B');
          uGrad.addColorStop(1, '#0F172A');
          ctx.strokeStyle = uGrad;
          ctx.lineWidth = 20;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx - 50, cy, 85, Math.PI * 0.48, Math.PI * 1.52);
          ctx.stroke();

          // Fixed Anvil on Left
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(cx - 50, cy - 10, 16, 20);
          ctx.strokeStyle = '#E2E8F0';
          ctx.strokeRect(cx - 50, cy - 10, 16, 20);

          // Measured Wire (with 3D radial shine)
          const wirePx = wireDiaMm * 14;
          const wireGrad = ctx.createRadialGradient(cx - 34 + wirePx / 2, cy, 2, cx - 34 + wirePx / 2, cy, wirePx);
          wireGrad.addColorStop(0, '#FBCFE8');
          wireGrad.addColorStop(0.7, '#EC4899');
          wireGrad.addColorStop(1, '#831843');
          ctx.fillStyle = wireGrad;
          ctx.beginPath();
          ctx.roundRect(cx - 34, cy - 28, wirePx, 56, 4);
          ctx.fill();
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Spindle extending from right towards wire
          const spindleX = cx - 34 + wirePx;
          ctx.fillStyle = '#64748B';
          ctx.fillRect(spindleX, cy - 10, 80, 20);

          // Sleeve / Main Scale Barrel
          const sleeveX = cx + 55;
          const sleeveGrad = ctx.createLinearGradient(sleeveX, cy - 18, sleeveX, cy + 18);
          sleeveGrad.addColorStop(0, '#334155');
          sleeveGrad.addColorStop(0.5, '#1E293B');
          sleeveGrad.addColorStop(1, '#0F172A');
          ctx.fillStyle = sleeveGrad;
          ctx.fillRect(sleeveX, cy - 18, 95, 36);
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sleeveX, cy - 18, 95, 36);

          // Main horizontal reference datum line
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sleeveX, cy);
          ctx.lineTo(sleeveX + 90, cy);
          ctx.stroke();

          // Millimeter graduation markings
          ctx.strokeStyle = '#E2E8F0';
          ctx.fillStyle = '#CBD5E1';
          ctx.font = '9px "IBM Plex Mono", monospace';
          for (let mm = 0; mm <= 8; mm++) {
            const mx = sleeveX + 10 + mm * 9;
            ctx.beginPath();
            ctx.moveTo(mx, cy);
            ctx.lineTo(mx, cy - 10);
            ctx.stroke();
            if (mm % 2 === 0) {
              ctx.fillText(`${mm}`, mx - 3, cy - 13);
            }
          }

          // 3D Shaded Rotating Thimble
          const thimbleX = sleeveX + 24 + wireDiaMm * 10;
          const thimbleGrad = ctx.createLinearGradient(thimbleX, cy - 26, thimbleX, cy + 26);
          thimbleGrad.addColorStop(0, '#475569');
          thimbleGrad.addColorStop(0.3, '#CBD5E1');
          thimbleGrad.addColorStop(0.7, '#1E293B');
          thimbleGrad.addColorStop(1, '#0F172A');
          ctx.fillStyle = thimbleGrad;
          ctx.beginPath();
          ctx.roundRect(thimbleX, cy - 26, 75, 52, 4);
          ctx.fill();
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Rotating circular divisions on thimble face
          for (let i = -5; i <= 5; i++) {
            const angleVal = (circularReading + i + (running ? Math.sin(rotationAngle) * 2 : 0) + circularDivs) % circularDivs;
            const ty = cy + i * 4.5;
            if (ty >= cy - 24 && ty <= cy + 24) {
              ctx.strokeStyle = i === 0 ? '#F472B6' : 'rgba(248, 250, 252, 0.6)';
              ctx.lineWidth = i === 0 ? 2 : 1;
              ctx.beginPath();
              ctx.moveTo(thimbleX, ty);
              ctx.lineTo(thimbleX + (i === 0 ? 14 : 7), ty);
              ctx.stroke();
              if (i === 0) {
                ctx.fillStyle = '#F472B6';
                ctx.font = 'bold 10px "IBM Plex Mono", monospace';
                ctx.fillText(`${Math.round(angleVal)}`, thimbleX + 18, ty + 3);
              }
            }
          }

          // Ratchet on the extreme right
          ctx.fillStyle = '#334155';
          ctx.fillRect(thimbleX + 75, cy - 14, 28, 28);

          // Specular highlights
          ctx.fillStyle = '#F472B6';
          ctx.font = '11px "IBM Plex Mono", monospace';
          ctx.fillText(`LC = ${leastCount.toFixed(3)} mm | তারের ব্যাস = ${measuredDia.toFixed(3)} mm`, 18, height - 16);
          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [wireDiaMm, pitchMm, circularDivs, leastCount, circularReading, measuredDia, running]);

  return (
    <LabShell
      symbolGuide="d = তারের ব্যাস · M = রৈখিক স্কেল · C = বৃত্তাকার স্কেল · LC = লঘিষ্ঠ ধ্রুবক"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setWireDiaMm(1.45);
        setPitchMm(1.0);
        setCircularDivs(100);
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="স্ক্রু-গজ মাইক্রোমিটার সিমুলেশন" />}
      metrics={[
        { label: 'রৈখিক স্কেল পাঠ (M)', value: `${mainScaleMm}.0 mm`, accentClass: 'text-sky-300' },
        { label: 'ঘুর্ণন স্কেল (C)', value: `${circularReading} ভাগ`, accentClass: 'text-pink-300' },
        { label: 'লঘিষ্ঠ ধ্রুবক (LC)', value: `${leastCount.toFixed(3)} mm`, accentClass: 'text-green-300' },
        { label: 'পরিমাপকৃত ব্যাস (d)', value: `${measuredDia.toFixed(3)} mm`, accentClass: 'text-purple-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="sg-dia"
            label="তারের প্রকৃত ব্যাস"
            value={Number(wireDiaMm.toFixed(3))}
            min={0.3}
            max={4.0}
            step={0.01}
            unit="mm"
            inputMin={0.05}
            inputMax={10}
            onChange={setWireDiaMm}
          />
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-slate-200">স্ক্রুর পিচ (Pitch)</span>
              <span className="font-mono text-sky-300 tabular-nums">{pitchMm} mm</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '1.0 mm পিচ', p: 1.0 },
                { label: '0.5 mm পিচ', p: 0.5 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setPitchMm(item.p)}
                  className={`px-3 py-2 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                    pitchMm === item.p ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold' : 'bg-[#0C0E13] border-[#2E3442] text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-slate-200">বৃত্তাকার স্কেলের ভাগসংখ্যা</span>
              <span className="font-mono text-sky-300 tabular-nums">{circularDivs} ভাগ</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[50, 100].map((divs) => (
                <button
                  key={divs}
                  type="button"
                  onClick={() => setCircularDivs(divs)}
                  className={`px-3 py-2 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                    circularDivs === divs ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold' : 'bg-[#0C0E13] border-[#2E3442] text-slate-300'
                  }`}
                >
                  {divs} ভাগ (LC = {(pitchMm / divs).toFixed(3)})
                </button>
              ))}
            </div>
          </div>
        </>
      }
      boardTip="স্ক্রু একবার পূর্ণ ঘুরালে রৈখিক স্কেল বরাবর যেটুকু সরে তা-ই হলো পিচ (Pitch)।"
    />
  );
}

/* ============================================================================
   Chapter 02 Sub-Lab A: River-Boat Crossing
   ============================================================================ */
export function VectorRiverLab() {
  const [riverCurrent, setRiverCurrent] = useState(4);
  const [boatSpeed, setBoatSpeed] = useState(8);
  const [angleDeg, setAngleDeg] = useState(120);
  const [riverWidth, setRiverWidth] = useState(400);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simTimeRef = useRef(0);

  const metrics = useMemo(() => {
    const rad = (angleDeg * Math.PI) / 180;
    const vxRes = riverCurrent + boatSpeed * Math.cos(rad);
    const vyRes = Math.max(0.4, boatSpeed * Math.sin(rad));
    const resultant = Math.hypot(vxRes, vyRes);
    const crossTime = riverWidth / vyRes;
    const drift = vxRes * crossTime;
    const minDistPossible = boatSpeed > riverCurrent;
    const minDistAngle = minDistPossible ? (Math.acos(-riverCurrent / boatSpeed) * 180) / Math.PI : 120;
    return { vxRes, vyRes, resultant, crossTime, drift, minDistPossible, minDistAngle };
  }, [riverCurrent, boatSpeed, angleDeg, riverWidth]);

  useEffect(() => {
    simTimeRef.current = 0;
  }, [riverCurrent, boatSpeed, angleDeg, riverWidth]);

  useEffect(() => {
    let animId: number;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (running) {
        simTimeRef.current += dt * 8;
        if (simTimeRef.current >= metrics.crossTime) {
          simTimeRef.current = 0;
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const simTime = simTimeRef.current;

          const topBankY = 44;
          const botBankY = height - 44;
          const riverPxH = botBankY - topBankY;
          const startX = width * 0.42;

          ctx.fillStyle = '#1E293B';
          ctx.fillRect(0, 0, width, topBankY);
          ctx.fillRect(0, botBankY, width, height - botBankY);

          ctx.fillStyle = 'rgba(14, 116, 144, 0.18)';
          ctx.fillRect(0, topBankY, width, riverPxH);

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
          ctx.lineWidth = 1.2;
          const shift = (simTime * riverCurrent * 12) % 70;
          for (let row = 1; row <= 3; row++) {
            const y = topBankY + (riverPxH / 4) * row;
            for (let x = -40 + shift; x < width; x += 70) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + 28, y);
              ctx.lineTo(x + 22, y - 4);
              ctx.moveTo(x + 28, y);
              ctx.lineTo(x + 22, y + 4);
              ctx.stroke();
            }
          }

          const progress = Math.min(1, simTime / metrics.crossTime);
          const scalePxPerM = riverPxH / riverWidth;
          const targetX = startX + metrics.drift * scalePxPerM;
          const boatX = startX + (targetX - startX) * progress;
          const boatY = botBankY - riverPxH * progress;

          // Draw Resultant Trajectory Line (Glow)
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, botBankY);
          ctx.lineTo(boatX, boatY);
          ctx.stroke();

          // 3D V-shaped Wake Waves behind boat
          const boatRad = (angleDeg * Math.PI) / 180;
          const wakeAngle1 = boatRad + Math.PI * 0.75;
          const wakeAngle2 = boatRad - Math.PI * 0.75;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(boatX, boatY);
          ctx.lineTo(boatX + Math.cos(wakeAngle1) * 36, boatY - Math.sin(wakeAngle1) * 36);
          ctx.moveTo(boatX, boatY);
          ctx.lineTo(boatX + Math.cos(wakeAngle2) * 36, boatY - Math.sin(wakeAngle2) * 36);
          ctx.stroke();

          // Churning Engine Propeller Foam Particles
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          for (let f = 0; f < 5; f++) {
            const fx = boatX - Math.cos(boatRad) * (14 + f * 5) + (Math.random() - 0.5) * 6;
            const fy = boatY + Math.sin(boatRad) * (14 + f * 5) + (Math.random() - 0.5) * 6;
            ctx.beginPath();
            ctx.arc(fx, fy, 2 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3D Modeled Motorboat Hull
          ctx.save();
          ctx.translate(boatX, boatY);
          ctx.rotate(-boatRad);

          // Boat Hull (Fiberglass gradient)
          const hullGrad = ctx.createLinearGradient(0, -8, 0, 8);
          hullGrad.addColorStop(0, '#FFFFFF');
          hullGrad.addColorStop(0.3, '#E2E8F0');
          hullGrad.addColorStop(0.7, '#0284C7');
          hullGrad.addColorStop(1, '#0369A1');
          ctx.fillStyle = hullGrad;
          ctx.beginPath();
          ctx.moveTo(18, 0); // Pointed bow
          ctx.lineTo(6, 9);
          ctx.lineTo(-16, 8); // Stern
          ctx.lineTo(-16, -8);
          ctx.lineTo(6, -9);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Windshield & Cockpit
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.moveTo(8, -5);
          ctx.lineTo(8, 5);
          ctx.lineTo(-4, 5);
          ctx.lineTo(-4, -5);
          ctx.closePath();
          ctx.fill();

          // Outboard Engine at Stern
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-20, -4, 5, 8);

          ctx.restore();

          // Vectors from boat: u (river), v (boat heading), R (resultant)
          const vecScale = 5.5;
          const uDx = riverCurrent * vecScale;
          const uDy = 0;
          const vDx = boatSpeed * Math.cos(boatRad) * vecScale;
          const vDy = -boatSpeed * Math.sin(boatRad) * vecScale;
          const rDx = metrics.vxRes * vecScale;
          const rDy = -metrics.vyRes * vecScale;

          // Helper to draw clean vector with arrowhead
          const renderArrow = (dx: number, dy: number, color: string, width = 2.5) => {
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(boatX, boatY);
            ctx.lineTo(boatX + dx, boatY + dy);
            ctx.stroke();
            const ang = Math.atan2(dy, dx);
            ctx.beginPath();
            ctx.moveTo(boatX + dx, boatY + dy);
            ctx.lineTo(boatX + dx - 8 * Math.cos(ang - 0.45), boatY + dy - 8 * Math.sin(ang - 0.45));
            ctx.lineTo(boatX + dx - 8 * Math.cos(ang + 0.45), boatY + dy - 8 * Math.sin(ang + 0.45));
            ctx.closePath();
            ctx.fill();
          };

          // Draw the 3 distinct vectors
          renderArrow(uDx, uDy, '#38BDF8'); // u (river)
          renderArrow(vDx, vDy, '#F472B6'); // v (boat)
          renderArrow(rDx, rDy, '#4ADE80', 3); // R (resultant)

          // Angle alpha arc between u and v
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(boatX, boatY, 26, -boatRad, 0);
          ctx.stroke();

          // Anti-collision badge plate for crystal clear readability
          const drawLabelBadge = (bx: number, by: number, text: string, color: string) => {
            ctx.font = 'bold 10px "IBM Plex Mono", monospace';
            const tw = ctx.measureText(text).width;
            const clampedX = Math.max(8, Math.min(width - tw - 12, bx));
            const clampedY = Math.max(20, Math.min(height - 16, by));
            ctx.fillStyle = 'rgba(10, 13, 22, 0.95)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(clampedX - 6, clampedY - 12, tw + 12, 18, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.fillText(text, clampedX, clampedY + 1);
          };

          // Smart collision-free symbol labels
          drawLabelBadge(boatX + 18, boatY - 16, 'α', '#C084FC');
          drawLabelBadge(boatX + uDx * 0.5 - 20, boatY + 22, 'u (স্রোত)', '#38BDF8');
          drawLabelBadge(boatX + vDx - 48, boatY + vDy + 10, 'v (নৌকা)', '#F472B6');
          drawLabelBadge(boatX + rDx + 14, boatY + rDy - 18, 'R (লব্ধি)', '#4ADE80');

          ctx.fillStyle = '#CBD5E1';
          ctx.font = '11px "IBM Plex Mono", monospace';
          ctx.fillText('d (নদীর প্রস্থ)', 14, topBankY + 18);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [riverCurrent, boatSpeed, angleDeg, riverWidth, running, metrics]);

  return (
    <LabShell
      symbolGuide="u = স্রোতের বেগ · v = নৌকার বেগ · R = লব্ধি বেগ · d = নদীর প্রস্থ · α = রওনা কোণ"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setRiverCurrent(4);
        setBoatSpeed(8);
        setAngleDeg(120);
        setRiverWidth(400);
        simTimeRef.current = 0;
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="নদী-নৌকা ভেক্টর সিমুলেশন" />}
      metrics={[
        { label: 'লব্ধি বেগ (R)', value: `${metrics.resultant.toFixed(2)} m/s`, accentClass: 'text-green-300' },
        { label: 'পারাপারের সময় (t)', value: `${metrics.crossTime.toFixed(1)} s`, accentClass: 'text-sky-300' },
        { label: 'পার্শ্ব সরণ (Drift)', value: `${Math.abs(metrics.drift).toFixed(1)} m`, accentClass: 'text-pink-300' },
        { label: 'সোজাসুজি পারাপার', value: Math.abs(metrics.drift) < 5 ? 'সম্ভব (০ m)' : 'ড্রিফট রয়েছে', accentClass: 'text-purple-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="r-d"
            label="নদীর প্রস্থ (d)"
            value={riverWidth}
            min={100}
            max={1000}
            step={25}
            unit="m"
            accent="sky"
            inputMin={10}
            inputMax={5000}
            onChange={setRiverWidth}
          />
          <LabParamControl
            id="r-u"
            label="স্রোতের বেগ (u)"
            value={riverCurrent}
            min={1}
            max={10}
            step={0.5}
            unit="m/s"
            inputMin={0}
            inputMax={30}
            onChange={setRiverCurrent}
          />
          <LabParamControl
            id="r-v"
            label="নৌকার বেগ (v)"
            value={boatSpeed}
            min={2}
            max={15}
            step={0.5}
            unit="m/s"
            inputMin={0.5}
            inputMax={50}
            onChange={setBoatSpeed}
          />
          <LabParamControl
            id="r-a"
            label="রওনা কোণ (α)"
            value={angleDeg}
            min={30}
            max={150}
            step={0.5}
            unit="°"
            inputMin={5}
            inputMax={175}
            onChange={setAngleDeg}
          />
        </>
      }
      boardTip="সোজাসুজি নদী পার হতে হলে cos α = -u/v শর্ত পূরণ করতে হবে।"
    />
  );
}

/* ============================================================================
   Chapter 02 Sub-Lab B: 3D Animated Rain & Umbrella Relative Velocity
   ============================================================================ */
export function VectorRainLab() {
  const [rainSpeed, setRainSpeed] = useState(12); // m/s vertically down
  const [manSpeed, setManSpeed] = useState(7); // m/s forward horizontally
  const [autoAngle, setAutoAngle] = useState(false);
  const [manualTiltDeg, setManualTiltDeg] = useState(12);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rain particle system state
  const rainDropsRef = useRef(
    Array.from({ length: 160 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 500,
      depth: 0.3 + Math.random() * 0.7, // 3D depth layer
      length: 12 + Math.random() * 14,
    })),
  );

  const splashesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Calculate optimum physics angle
  const optimumAngleRad = Math.atan2(manSpeed, rainSpeed);
  const optimumAngleDeg = (optimumAngleRad * 180) / Math.PI;
  const currentAngleDeg = autoAngle ? optimumAngleDeg : manualTiltDeg;
  const currentAngleRad = (currentAngleDeg * Math.PI) / 180;
  const relSpeed = Math.hypot(rainSpeed, manSpeed);

  // Umbrella efficiency: how close current angle is to optimum
  const angularDiff = Math.abs(currentAngleDeg - optimumAngleDeg);
  const shieldEfficiency = Math.max(0, Math.min(100, Math.round(100 - angularDiff * 3.2)));

  useEffect(() => {
    let animId: number;
    let walkCycle = 0;
    let roadScroll = 0;

    const render = () => {
      if (running) {
        walkCycle += manSpeed * 0.04;
        roadScroll = (roadScroll + manSpeed * 2) % 60;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const groundY = height - 60;
          const manX = width * 0.44;
          const torsoY = groundY - 48;
          const lean = Math.min(12, manSpeed * 0.8);
          const handX = manX + 10 + lean * 0.5;
          const handY = torsoY - 8;
          const cosA = Math.cos(currentAngleRad);
          const sinA = Math.sin(currentAngleRad);

          // 3D Perspective Highway / Road
          const roadGrad = ctx.createLinearGradient(0, groundY - 30, 0, height);
          roadGrad.addColorStop(0, '#0F172A');
          roadGrad.addColorStop(0.3, '#1E293B');
          roadGrad.addColorStop(1, '#090D16');
          ctx.fillStyle = roadGrad;
          ctx.fillRect(0, groundY, width, height - groundY);

          // Moving dashed white stripes on asphalt
          ctx.strokeStyle = 'rgba(248, 250, 252, 0.4)';
          ctx.lineWidth = 3;
          ctx.setLineDash([20, 25]);
          ctx.beginPath();
          ctx.moveTo(-roadScroll, groundY + 28);
          ctx.lineTo(width + 40, groundY + 28);
          ctx.stroke();
          ctx.setLineDash([]);

          // Horizon curb
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, groundY);
          ctx.lineTo(width, groundY);
          ctx.stroke();

          // 3D Depth Rain Animation
          // Relative to observer moving with man: rain has horizontal component -manSpeed
          const rainAngle = Math.atan2(-manSpeed, rainSpeed);
          const dropDx = Math.sin(rainAngle);
          const dropDy = Math.cos(rainAngle);

          // Draw raindrops
          for (let i = 0; i < rainDropsRef.current.length; i++) {
            const drop = rainDropsRef.current[i];
            if (running) {
              drop.y += rainSpeed * drop.depth * 0.9;
              drop.x -= manSpeed * drop.depth * 0.9;

              if (drop.y > groundY) {
                // Splash on ground
                if (Math.random() < 0.25) {
                  splashesRef.current.push({
                    x: drop.x,
                    y: groundY + Math.random() * 4,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -Math.random() * 3 - 1,
                    life: 1,
                  });
                }
                drop.y = -10;
                drop.x = Math.random() * (width + 200) - 50;
              }
              if (drop.x < -40) drop.x = width + 40;
              if (drop.x > width + 40) drop.x = -40;
            }

            // Transform raindrop into rotated umbrella local frame to test accurate canopy interception
            const relDx = drop.x - handX;
            const relDy = drop.y - handY;
            const localX = relDx * cosA + relDy * sinA;
            const localY = -relDx * sinA + relDy * cosA;
            const distCanopy = Math.hypot(localX, localY + 44);
            const isBlocked = distCanopy <= 42 && localY <= -40;

            // Check if unblocked drop hits runner when protection is suboptimal
            const hitsRunner =
              !isBlocked &&
              shieldEfficiency < 92 &&
              Math.abs(drop.x - (manX + lean * 0.25)) < 11 &&
              drop.y > torsoY - 26 &&
              drop.y < groundY - 4;

            if (!isBlocked) {
              ctx.strokeStyle = hitsRunner
                ? 'rgba(248, 113, 113, 0.8)'
                : `rgba(56, 189, 248, ${0.25 + drop.depth * 0.55})`;
              ctx.lineWidth = drop.depth * 1.8;
              ctx.beginPath();
              ctx.moveTo(drop.x, drop.y);
              ctx.lineTo(drop.x + dropDx * drop.length * drop.depth, drop.y + dropDy * drop.length * drop.depth);
              ctx.stroke();

              if (hitsRunner && running && Math.random() < 0.25) {
                splashesRef.current.push({
                  x: drop.x,
                  y: drop.y,
                  vx: (Math.random() - 0.5) * 3,
                  vy: -Math.random() * 2.5,
                  life: 0.7,
                });
              }
            } else if (running && Math.random() < 0.2) {
              // Water droplet bouncing off umbrella canopy
              splashesRef.current.push({
                x: drop.x,
                y: drop.y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3,
                life: 0.8,
              });
            }
          }

          // Update & draw ground/umbrella splashes
          ctx.fillStyle = '#38BDF8';
          for (let s = splashesRef.current.length - 1; s >= 0; s--) {
            const sp = splashesRef.current[s];
            if (running) {
              sp.x += sp.vx;
              sp.y += sp.vy;
              sp.vy += 0.2; // gravity on splash
              sp.life -= 0.04;
            }
            if (sp.life <= 0) {
              splashesRef.current.splice(s, 1);
            } else {
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, 1.4 * sp.life, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Stylized Athletic Runner Character
          const legPhase = Math.sin(walkCycle);

          // Runner Shadow on Wet Asphalt
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(manX + lean * 0.4, groundY + 4, 18, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Left & Right Legs (Athletic Running Pose)
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Rear leg
          const rearKneeX = manX - legPhase * 14;
          const rearKneeY = groundY - 24 + Math.abs(legPhase) * 6;
          ctx.beginPath();
          ctx.moveTo(manX + lean * 0.4, torsoY + 16);
          ctx.lineTo(rearKneeX, rearKneeY);
          ctx.lineTo(rearKneeX - 6, groundY);
          ctx.stroke();

          // Front leg
          const frontKneeX = manX + legPhase * 16;
          const frontKneeY = groundY - 24 + Math.abs(-legPhase) * 6;
          ctx.beginPath();
          ctx.moveTo(manX + lean * 0.4, torsoY + 16);
          ctx.lineTo(frontKneeX, frontKneeY);
          ctx.lineTo(frontKneeX + 6, groundY);
          ctx.stroke();

          // Shoes (Pink running sneakers with splash contact)
          ctx.fillStyle = '#EC4899';
          ctx.fillRect(rearKneeX - 9, groundY - 3, 10, 4);
          ctx.fillRect(frontKneeX + 3, groundY - 3, 10, 4);

          // Torso (Windbreaker Jacket with gradient)
          const jacketGrad = ctx.createLinearGradient(manX, torsoY - 12, manX + lean, torsoY + 16);
          jacketGrad.addColorStop(0, '#A855F7');
          jacketGrad.addColorStop(0.5, '#EC4899');
          jacketGrad.addColorStop(1, '#7E22CE');
          ctx.fillStyle = jacketGrad;
          ctx.beginPath();
          ctx.roundRect(manX - 8 + lean * 0.2, torsoY - 12, 16, 28, 4);
          ctx.fill();
          ctx.strokeStyle = '#FBCFE8';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Head with Athletic Running Cap
          ctx.fillStyle = '#FBCFE8';
          ctx.beginPath();
          ctx.arc(manX + lean * 0.3, torsoY - 20, 8, 0, Math.PI * 2);
          ctx.fill();
          // Cap visor facing forward
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.moveTo(manX + lean * 0.3 - 4, torsoY - 24);
          ctx.lineTo(manX + lean * 0.3 + 12, torsoY - 22);
          ctx.lineTo(manX + lean * 0.3 + 6, torsoY - 18);
          ctx.closePath();
          ctx.fill();

          // Arm holding umbrella forward
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(manX - 2, torsoY - 4);
          ctx.lineTo(handX, handY);
          ctx.stroke();

          // 3D Curved Canopy Umbrella
          ctx.save();
          ctx.translate(handX, handY);
          ctx.rotate(currentAngleRad);

          // Umbrella Shaft (Metallic chrome rod)
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 10);
          ctx.lineTo(0, -44);
          ctx.stroke();

          // Curved handle at bottom
          ctx.beginPath();
          ctx.arc(-4, 12, 4, 0, Math.PI);
          ctx.stroke();

          // 3D Umbrella Canopy Dome
          const canopyGrad = ctx.createRadialGradient(0, -48, 4, 0, -48, 44);
          canopyGrad.addColorStop(0, '#7DD3FC');
          canopyGrad.addColorStop(0.3, '#38BDF8');
          canopyGrad.addColorStop(0.8, '#0284C7');
          canopyGrad.addColorStop(1, '#0C4A6E');
          ctx.fillStyle = canopyGrad;
          ctx.beginPath();
          ctx.arc(0, -44, 42, Math.PI, 0, false);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#BAE6FD';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Canopy metallic ribs
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.2;
          for (let r = -28; r <= 28; r += 18) {
            ctx.beginPath();
            ctx.ellipse(r * 0.5, -44, Math.abs(r) * 0.32, 40, 0, Math.PI, 0);
            ctx.stroke();
          }

          ctx.restore();

          // ------------------------------------------------------------------
          // Anti-Collision Vector Triangle HUD (Generous spacing, zero text overlap)
          // ------------------------------------------------------------------
          const hudW = 184;
          const hudH = 132;
          const hudX = Math.max(10, width - hudW - 14);
          const hudY = 16;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(hudX, hudY, hudW, hudH, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#CBD5E1';
          ctx.font = 'bold 10px "IBM Plex Mono", monospace';
          ctx.fillText('ভেক্টর ত্রিভুজ HUD', hudX + 12, hudY + 16);

          // Scaled vector triangle coordinates with fixed readable bounds
          const originX = hudX + 44;
          const originY = hudY + 28;
          const vrLen = 48; // fixed vertical leg for clear geometry
          const vmLen = Math.max(30, Math.min(76, (manSpeed / Math.max(1, rainSpeed)) * vrLen));
          const botY = originY + vrLen;
          const rightX = originX + vmLen;

          // 1. vr vector (downward - sky blue)
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX, botY);
          ctx.stroke();
          // Arrowhead
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.moveTo(originX, botY);
          ctx.lineTo(originX - 4, botY - 6);
          ctx.lineTo(originX + 4, botY - 6);
          ctx.closePath();
          ctx.fill();

          // 2. -vm vector (horizontal to right - pink)
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(originX, botY);
          ctx.lineTo(rightX, botY);
          ctx.stroke();
          // Arrowhead
          ctx.fillStyle = '#F472B6';
          ctx.beginPath();
          ctx.moveTo(rightX, botY);
          ctx.lineTo(rightX - 6, botY - 4);
          ctx.lineTo(rightX - 6, botY + 4);
          ctx.closePath();
          ctx.fill();

          // 3. v_mr resultant hypotenuse (light green)
          ctx.strokeStyle = '#4ADE80';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(rightX, botY);
          ctx.stroke();
          // Arrowhead
          const hypAngle = Math.atan2(vrLen, vmLen);
          ctx.fillStyle = '#4ADE80';
          ctx.beginPath();
          ctx.moveTo(rightX, botY);
          ctx.lineTo(rightX - 7 * Math.cos(hypAngle - 0.4), botY - 7 * Math.sin(hypAngle - 0.4));
          ctx.lineTo(rightX - 7 * Math.cos(hypAngle + 0.4), botY - 7 * Math.sin(hypAngle + 0.4));
          ctx.closePath();
          ctx.fill();

          // Angle arc θ at top origin (shows optimum relative rain angle)
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(originX, originY, 14, Math.PI * 0.5 - optimumAngleRad, Math.PI * 0.5);
          ctx.stroke();

          // Helper for drawing neat text badge inside HUD
          const drawHudBadge = (bx: number, by: number, text: string, color: string) => {
            ctx.font = 'bold 9px "IBM Plex Mono", monospace';
            const tw = ctx.measureText(text).width;
            ctx.fillStyle = 'rgba(10, 13, 22, 0.95)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(bx - 3, by - 9, tw + 6, 14, 3);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.fillText(text, bx, by + 1);
          };

          // Distinct Non-Overlapping Badge Positions:
          // v_r: placed on the LEFT of the vertical leg
          drawHudBadge(hudX + 6, originY + vrLen * 0.5, 'v_r', '#38BDF8');

          // -v_m: placed cleanly BELOW the bottom leg
          drawHudBadge(originX + vmLen * 0.5 - 12, botY + 14, '-v_m', '#F472B6');

          // v_mr: placed OUTSIDE to the right of the hypotenuse
          drawHudBadge(rightX + 6, originY + vrLen * 0.5, 'v_mr', '#4ADE80');

          // Angle theta symbol readout
          ctx.fillStyle = '#C084FC';
          ctx.font = 'bold 10px "IBM Plex Mono", monospace';
          ctx.fillText('θ', hudX + 12, hudH + hudY - 10);

          // Shield status tag in top-left
          ctx.fillStyle = shieldEfficiency >= 85 ? '#4ADE80' : shieldEfficiency >= 55 ? '#F472B6' : '#CBD5E1';
          ctx.font = 'bold 11px "Noto Sans Bengali", sans-serif';
          ctx.fillText(
            shieldEfficiency >= 85 ? '● সুরক্ষিত' : '▲ বৃষ্টি গায়ে লাগবে',
            16,
            28,
          );

          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [rainSpeed, manSpeed, currentAngleRad, currentAngleDeg, optimumAngleDeg, optimumAngleRad, shieldEfficiency, running]);

  return (
    <LabShell
      symbolGuide="v_r = বৃষ্টির বেগ · v_m = মানুষের বেগ · v_mr = আপেক্ষিক বেগ · θ = ছাতার কোণ"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setRainSpeed(12);
        setManSpeed(7);
        setAutoAngle(false);
        setManualTiltDeg(12);
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="বৃষ্টি ও ছাতার আপেক্ষিক বেগ 3D অ্যানিমেশন" />}
      metrics={[
        { label: 'বৃষ্টির বেগ (v_r)', value: `${rainSpeed} m/s`, accentClass: 'text-sky-300' },
        { label: 'মানুষের বেগ (v_m)', value: `${manSpeed} m/s`, accentClass: 'text-pink-300' },
        { label: 'উপযুক্ত / বর্তমান কোণ', value: `${optimumAngleDeg.toFixed(1)}° / ${currentAngleDeg.toFixed(0)}°`, accentClass: 'text-purple-300' },
        {
          label: 'সুরক্ষা দক্ষতা',
          value: `${shieldEfficiency}%`,
          accentClass: shieldEfficiency >= 85 ? 'text-green-300' : shieldEfficiency >= 55 ? 'text-pink-300' : 'text-[#CBD5E1]',
        },
      ]}
      controls={
        <>
          <LabParamControl
            id="rm-rain"
            label="বৃষ্টি পড়ার বেগ (v_r)"
            value={rainSpeed}
            min={4}
            max={22}
            step={1}
            unit="m/s"
            inputMin={1}
            inputMax={50}
            onChange={setRainSpeed}
          />

          <LabParamControl
            id="rm-man"
            label="মানুষের হাঁটার/দৌড়ের বেগ (v_m)"
            value={manSpeed}
            min={0}
            max={16}
            step={0.5}
            unit="m/s"
            inputMin={0}
            inputMax={40}
            onChange={setManSpeed}
          />

          <div className="p-3 rounded-lg bg-[#0C0E13] border border-[#262B36] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-200">ছাতা নিয়ন্ত্রণের মোড</span>
              <button
                type="button"
                onClick={() => setAutoAngle((a) => !a)}
                className={`px-3 py-1 text-xs rounded border transition-colors cursor-pointer ${
                  autoAngle ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {autoAngle ? 'স্বয়ংক্রিয় নিখুঁত কোণ' : 'ম্যানুয়াল কোণ পরিবর্তন'}
              </button>
            </div>

            {!autoAngle && (
              <LabParamControl
                id="rm-tilt"
                label="হাতে ছাতার কোণ ঘোরান"
                value={manualTiltDeg}
                min={0}
                max={75}
                step={1}
                unit="°"
                accent="sky"
                inputMin={0}
                inputMax={89}
                onChange={setManualTiltDeg}
              />
            )}
          </div>
        </>
      }
      boardTip="উলম্বভাবে পড়া বৃষ্টির ক্ষেত্রে ব্যক্তি সামনে এগোলে আপেক্ষিক বেগ v_mr = √(v_r² + v_m²) হবে এবং ছাতাকে tan θ = v_m / v_r কোণে সামনের দিকে কাত করে ধরতে হবে।"
    />
  );
}

/* ============================================================================
   Chapter 03 Sub-Lab A: Projectile Motion (with Full Mathematical Components)
   ============================================================================ */
export function ProjectileLabCanvas({ initialPreset }: { initialPreset?: 'default' | 'neymar' }) {
  const [velocity, setVelocity] = useState(initialPreset === 'neymar' ? 35 : 32);
  const [angleDeg, setAngleDeg] = useState(initialPreset === 'neymar' ? 30 : 45);
  const [gravity, setGravity] = useState(9.8);
  const [showComponents, setShowComponents] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simTimeRef = useRef(0);
  const sparkParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);
  const [instantReadout, setInstantReadout] = useState({ vx: 0, vy: 0, speed: 0, time: 0 });

  useEffect(() => {
    if (initialPreset === 'neymar') {
      setVelocity(35);
      setAngleDeg(30);
      setGravity(9.8);
      simTimeRef.current = 0;
    }
  }, [initialPreset]);

  const metrics = useMemo(() => {
    const rad = (angleDeg * Math.PI) / 180;
    const vx = velocity * Math.cos(rad);
    const vy0 = velocity * Math.sin(rad);
    const timeOfFlight = (2 * vy0) / gravity;
    const maxHeight = (vy0 * vy0) / (2 * gravity);
    const range = (velocity * velocity * Math.sin(2 * rad)) / gravity;
    return { rad, vx, vy0, timeOfFlight, maxHeight, range };
  }, [velocity, angleDeg, gravity]);

  useEffect(() => {
    simTimeRef.current = 0;
    sparkParticlesRef.current = [];
  }, [velocity, angleDeg, gravity]);

  useEffect(() => {
    let animId: number;
    let last = performance.now();
    let throttleCounter = 0;

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const T = metrics.timeOfFlight;
      if (running) {
        simTimeRef.current += dt;
        // Brief pause after landing before repeating
        if (simTimeRef.current > T + 0.6) {
          simTimeRef.current = 0;
        }
      }

      const t = Math.min(simTimeRef.current, T);
      const currentX = metrics.vx * t;
      const currentY = Math.max(0, metrics.vy0 * t - 0.5 * gravity * t * t);
      const currentVy = metrics.vy0 - gravity * t;
      const currentSpeed = Math.hypot(metrics.vx, currentVy);

      throttleCounter++;
      if (throttleCounter % 5 === 0) {
        setInstantReadout({ vx: metrics.vx, vy: currentVy, speed: currentSpeed, time: t });
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;

          // Viewport margins and plotting bounds
          const padLeft = 64;
          const padRight = 50;
          const padTop = 38;
          const padBottom = 54;
          const plotW = width - padLeft - padRight;
          const plotH = height - padTop - padBottom;
          const groundY = padTop + plotH;

          // Coordinate system bounds
          const worldMaxX = Math.max(50, metrics.range * 1.15);
          const worldMaxY = Math.max(22, metrics.maxHeight * 1.35);

          const toPxX = (wx: number) => padLeft + (wx / worldMaxX) * plotW;
          const toPxY = (wy: number) => groundY - (wy / worldMaxY) * plotH;

          // Helper: draw anti-collision pill badge
          const drawBadge = (
            bx: number,
            by: number,
            text: string,
            textColor: string,
            borderColor?: string,
            align: CanvasTextAlign = 'center'
          ) => {
            ctx.font = 'bold 9.5px "IBM Plex Mono", monospace';
            const tw = ctx.measureText(text).width;
            let startX = bx - tw / 2 - 6;
            if (align === 'left') startX = bx - 6;
            if (align === 'right') startX = bx - tw - 6;

            const clampedX = Math.max(6, Math.min(width - tw - 16, startX));
            const clampedY = Math.max(16, Math.min(height - 12, by));

            ctx.fillStyle = 'rgba(10, 13, 22, 0.96)';
            ctx.strokeStyle = borderColor || textColor;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(clampedX, clampedY - 11, tw + 12, 17, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = textColor;
            ctx.textAlign = 'left';
            ctx.fillText(text, clampedX + 6, clampedY + 1);
          };

          // 1. Subtle Background Coordinate Grid
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
          ctx.lineWidth = 1;
          const gridCols = 8;
          const gridRows = 5;
          for (let c = 0; c <= gridCols; c++) {
            const gx = padLeft + (plotW / gridCols) * c;
            ctx.beginPath();
            ctx.moveTo(gx, padTop);
            ctx.lineTo(gx, groundY);
            ctx.stroke();
          }
          for (let r = 0; r <= gridRows; r++) {
            const gy = padTop + (plotH / gridRows) * r;
            ctx.beginPath();
            ctx.moveTo(padLeft, gy);
            ctx.lineTo(padLeft + plotW, gy);
            ctx.stroke();
          }

          // 2. Solid Ground Surface Strip
          const groundGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 24);
          groundGrad.addColorStop(0, '#181C24');
          groundGrad.addColorStop(1, '#0C0E13');
          ctx.fillStyle = groundGrad;
          ctx.fillRect(0, groundY, width, height - groundY);

          // Glowing Grass Line
          ctx.strokeStyle = '#4ADE80';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, groundY);
          ctx.lineTo(width, groundY);
          ctx.stroke();

          // 3. Complete Parabolic Theoretical Trajectory (Dashed Guide)
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          const steps = 70;
          for (let s = 0; s <= steps; s++) {
            const stepT = (T * s) / steps;
            const px = toPxX(metrics.vx * stepT);
            const py = toPxY(Math.max(0, metrics.vy0 * stepT - 0.5 * gravity * stepT * stepT));
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.restore();

          // 4. Traveled Trajectory Trail (Solid Glowing Cyan)
          if (t > 0) {
            ctx.save();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 2.8;
            ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            const activeSteps = Math.max(2, Math.floor((t / T) * 60));
            for (let s = 0; s <= activeSteps; s++) {
              const stepT = (t * s) / activeSteps;
              const px = toPxX(metrics.vx * stepT);
              const py = toPxY(Math.max(0, metrics.vy0 * stepT - 0.5 * gravity * stepT * stepT));
              if (s === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();
          }

          // 5. MAXIMUM HEIGHT (H) DIMENSION & APEX MARKER
          if (showDimensions) {
            const apexWorldX = metrics.range / 2;
            const apexPxX = toPxX(apexWorldX);
            const apexPxY = toPxY(metrics.maxHeight);

            // Vertical dashed plumb line
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(244, 114, 182, 0.5)';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(apexPxX, groundY);
            ctx.lineTo(apexPxX, apexPxY);
            ctx.stroke();
            ctx.restore();

            // Apex indicator dot & ring
            ctx.fillStyle = '#EC4899';
            ctx.beginPath();
            ctx.arc(apexPxX, apexPxY, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FBCFE8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(apexPxX, apexPxY, 7.5, 0, Math.PI * 2);
            ctx.stroke();

            // Vertical Dimension Arrow Bar (at apexPxX + 18)
            const dimBarX = apexPxX + 18;
            ctx.strokeStyle = '#F472B6';
            ctx.fillStyle = '#F472B6';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dimBarX, groundY - 2);
            ctx.lineTo(dimBarX, apexPxY + 2);
            ctx.stroke();

            // Up Arrowhead
            ctx.beginPath();
            ctx.moveTo(dimBarX, apexPxY + 2);
            ctx.lineTo(dimBarX - 3.5, apexPxY + 9);
            ctx.lineTo(dimBarX + 3.5, apexPxY + 9);
            ctx.closePath();
            ctx.fill();

            // Down Arrowhead
            ctx.beginPath();
            ctx.moveTo(dimBarX, groundY - 2);
            ctx.lineTo(dimBarX - 3.5, groundY - 9);
            ctx.lineTo(dimBarX + 3.5, groundY - 9);
            ctx.closePath();
            ctx.fill();

            // Apex labels (pure symbols only, trajectory completely unobstructed)
            drawBadge(
              apexPxX,
              apexPxY - 14,
              'vᵧ = 0',
              '#CBD5E1',
              '#475569'
            );
            drawBadge(
              dimBarX + 8,
              (groundY + apexPxY) / 2,
              'H',
              '#F472B6',
              '#EC4899',
              'left'
            );
          }

          // 6. HORIZONTAL RANGE (R) DIMENSION LINE & LANDING TARGET FLAG
          if (showDimensions) {
            const originPxX = toPxX(0);
            const landingPxX = toPxX(metrics.range);
            const rDimY = groundY + 28;

            // Target Flagpole at landing point
            ctx.strokeStyle = '#CBD5E1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(landingPxX, groundY);
            ctx.lineTo(landingPxX, groundY - 28);
            ctx.stroke();

            // Fluttering Silver-White Checkered Target Flag
            ctx.fillStyle = '#CBD5E1';
            ctx.beginPath();
            ctx.moveTo(landingPxX, groundY - 28);
            ctx.lineTo(landingPxX + 14, groundY - 21);
            ctx.lineTo(landingPxX, groundY - 14);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(landingPxX + 5, groundY - 21, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Dimension line ticks at origin and landing point
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(originPxX, groundY + 4);
            ctx.lineTo(originPxX, rDimY + 6);
            ctx.moveTo(landingPxX, groundY + 4);
            ctx.lineTo(landingPxX, rDimY + 6);
            ctx.stroke();

            // Horizontal dimension line with double arrows
            ctx.beginPath();
            ctx.moveTo(originPxX + 2, rDimY);
            ctx.lineTo(landingPxX - 2, rDimY);
            ctx.stroke();

            // Left Arrow
            ctx.fillStyle = '#38BDF8';
            ctx.beginPath();
            ctx.moveTo(originPxX + 2, rDimY);
            ctx.lineTo(originPxX + 9, rDimY - 3.5);
            ctx.lineTo(originPxX + 9, rDimY + 3.5);
            ctx.closePath();
            ctx.fill();

            // Right Arrow
            ctx.beginPath();
            ctx.moveTo(landingPxX - 2, rDimY);
            ctx.lineTo(landingPxX - 9, rDimY - 3.5);
            ctx.lineTo(landingPxX - 9, rDimY + 3.5);
            ctx.closePath();
            ctx.fill();

            // Range badge in center
            const centerRx = (originPxX + landingPxX) / 2;
            drawBadge(
              centerRx,
              rDimY + 14,
              'R',
              '#38BDF8'
            );
          }

          // 7. LAUNCH CANNON AT ORIGIN
          const cannonOriginX = toPxX(0);
          const cannonOriginY = groundY;
          const barrelLen = 32;
          const barrelW = 10;
          const radAngle = metrics.rad;

          ctx.save();
          ctx.translate(cannonOriginX, cannonOriginY);

          // Cannon Wheel (Dark Gunmetal Rim + Purple Center)
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.arc(-2, -4, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#64748B';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#C084FC';
          ctx.beginPath();
          ctx.arc(-2, -4, 3, 0, Math.PI * 2);
          ctx.fill();

          // Cannon Barrel rotated by -radAngle
          ctx.rotate(-radAngle);
          const barrelGrad = ctx.createLinearGradient(0, -barrelW / 2, barrelLen, barrelW / 2);
          barrelGrad.addColorStop(0, '#334155');
          barrelGrad.addColorStop(0.5, '#64748B');
          barrelGrad.addColorStop(1, '#1E293B');
          ctx.fillStyle = barrelGrad;
          ctx.beginPath();
          ctx.roundRect(0, -barrelW / 2, barrelLen, barrelW, 2);
          ctx.fill();
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Muzzle Ring
          ctx.fillStyle = '#EC4899';
          ctx.fillRect(barrelLen - 2, -barrelW / 2 - 1, 3, barrelW + 2);

          // Firing muzzle smoke / spark puff when near start
          if (t < 0.12 && running) {
            ctx.fillStyle = 'rgba(236, 72, 153, 0.7)';
            ctx.beginPath();
            ctx.arc(barrelLen + 6, 0, 7, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // 8. LAUNCH COMPONENTS & INITIAL VECTORS (θ₀, v₀, v₀x, v₀y)
          if (showComponents) {
            const v0Scale = Math.min(110, Math.max(55, velocity * 2.2));
            const v0TipX = cannonOriginX + v0Scale * Math.cos(radAngle);
            const v0TipY = cannonOriginY - v0Scale * Math.sin(radAngle);
            const v0xTipX = cannonOriginX + v0Scale * Math.cos(radAngle);
            const v0yTipY = cannonOriginY - v0Scale * Math.sin(radAngle);

            // Rectangular Projection Box (Dashed Parallelogram)
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(v0xTipX, cannonOriginY);
            ctx.lineTo(v0TipX, v0TipY);
            ctx.moveTo(cannonOriginX, v0yTipY);
            ctx.lineTo(v0TipX, v0TipY);
            ctx.stroke();
            ctx.restore();

            // Horizontal Launch Component Arrow: v0x
            ctx.strokeStyle = '#38BDF8';
            ctx.fillStyle = '#38BDF8';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(cannonOriginX, cannonOriginY);
            ctx.lineTo(v0xTipX, cannonOriginY);
            ctx.stroke();
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(v0xTipX, cannonOriginY);
            ctx.lineTo(v0xTipX - 7, cannonOriginY - 4);
            ctx.lineTo(v0xTipX - 7, cannonOriginY + 4);
            ctx.closePath();
            ctx.fill();

            // Vertical Launch Component Arrow: v0y
            ctx.strokeStyle = '#10B981';
            ctx.fillStyle = '#10B981';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(cannonOriginX, cannonOriginY);
            ctx.lineTo(cannonOriginX, v0yTipY);
            ctx.stroke();
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(cannonOriginX, v0yTipY);
            ctx.lineTo(cannonOriginX - 4, v0yTipY + 7);
            ctx.lineTo(cannonOriginX + 4, v0yTipY + 7);
            ctx.closePath();
            ctx.fill();

            // Initial Velocity Vector Arrow: v0
            ctx.strokeStyle = '#F472B6';
            ctx.fillStyle = '#F472B6';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(cannonOriginX, cannonOriginY);
            ctx.lineTo(v0TipX, v0TipY);
            ctx.stroke();
            // Arrowhead
            const v0Ang = -radAngle;
            ctx.beginPath();
            ctx.moveTo(v0TipX, v0TipY);
            ctx.lineTo(v0TipX - 9 * Math.cos(v0Ang - 0.4), v0TipY - 9 * Math.sin(v0Ang - 0.4));
            ctx.lineTo(v0TipX - 9 * Math.cos(v0Ang + 0.4), v0TipY - 9 * Math.sin(v0Ang + 0.4));
            ctx.closePath();
            ctx.fill();

            // Launch Angle θ0 Arc & Badge
            const arcR = 38;
            ctx.strokeStyle = '#C084FC';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(cannonOriginX, cannonOriginY, arcR, -radAngle, 0);
            ctx.stroke();
            ctx.fillStyle = 'rgba(192, 132, 252, 0.14)';
            ctx.beginPath();
            ctx.moveTo(cannonOriginX, cannonOriginY);
            ctx.arc(cannonOriginX, cannonOriginY, arcR, -radAngle, 0);
            ctx.closePath();
            ctx.fill();

            // Dedicated Non-Overlapping Symbol Badges (pure symbols, no numbers):
            // 1. θ0 badge placed along bisector angle
            const bisectAng = -radAngle / 2;
            const thetaBx = cannonOriginX + (arcR + 18) * Math.cos(bisectAng);
            const thetaBy = cannonOriginY + (arcR + 18) * Math.sin(bisectAng);
            drawBadge(thetaBx, thetaBy, 'θ₀', '#C084FC', '#A855F7');

            // 2. u (initial velocity) badge placed past arrow tip
            drawBadge(
              v0TipX + 14 * Math.cos(v0Ang),
              v0TipY + 14 * Math.sin(v0Ang),
              'u',
              '#F472B6'
            );

            // 3. ux badge cleanly below ground line
            drawBadge(
              cannonOriginX + (v0Scale * Math.cos(radAngle)) / 2,
              cannonOriginY + 14,
              'uₓ',
              '#38BDF8'
            );

            // 4. uy badge to left of vertical arrow
            drawBadge(
              cannonOriginX - 10,
              cannonOriginY - (v0Scale * Math.sin(radAngle)) / 2,
              'uᵧ',
              '#4ADE80',
              '#22C55E',
              'right'
            );
          }

          // 9. DYNAMIC MOVING PROJECTILE & INSTANTANEOUS VELOCITY VECTORS
          const ballPxX = toPxX(currentX);
          const ballPxY = toPxY(currentY);

          // Motion spark trail
          if (running && t < T) {
            sparkParticlesRef.current.push({
              x: ballPxX + (Math.random() - 0.5) * 4,
              y: ballPxY + (Math.random() - 0.5) * 4,
              vx: -metrics.vx * 0.1 + (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              life: 0.8,
              color: Math.random() > 0.5 ? '#F472B6' : '#38BDF8',
            });
            if (sparkParticlesRef.current.length > 25) sparkParticlesRef.current.shift();
          }

          // Render spark particles
          for (let sp = sparkParticlesRef.current.length - 1; sp >= 0; sp--) {
            const p = sparkParticlesRef.current[sp];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) {
              sparkParticlesRef.current.splice(sp, 1);
            } else {
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Instantaneous velocity arrows & crisp symbol labels on moving ball
          if (showComponents && t > 0 && t < T) {
            const vInstScale = 1.4;
            const instVxLen = metrics.vx * vInstScale;
            const instVyLen = currentVy * vInstScale;

            // Instantaneous vx (horizontal)
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(ballPxX, ballPxY);
            ctx.lineTo(ballPxX + instVxLen, ballPxY);
            ctx.stroke();

            // Instantaneous vy (vertical)
            const vyColor = currentVy >= 0 ? 'rgba(74, 222, 128, 0.85)' : 'rgba(244, 63, 94, 0.85)';
            ctx.strokeStyle = vyColor;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(ballPxX, ballPxY);
            ctx.lineTo(ballPxX, ballPxY - instVyLen);
            ctx.stroke();

            // Tangent velocity vector v
            ctx.strokeStyle = '#F472B6';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(ballPxX, ballPxY);
            ctx.lineTo(ballPxX + instVxLen, ballPxY - instVyLen);
            ctx.stroke();

            // Clean inline symbol labels (no bulky boxes hiding the projectile)
            ctx.font = 'bold 10px "IBM Plex Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#38BDF8';
            ctx.fillText('vₓ', ballPxX + instVxLen + 4, ballPxY + 3);

            if (Math.abs(instVyLen) > 6) {
              ctx.fillStyle = currentVy >= 0 ? '#4ADE80' : '#CBD5E1';
              ctx.fillText('vᵧ', ballPxX - 16, ballPxY - instVyLen + (currentVy >= 0 ? -3 : 10));
            }

            ctx.fillStyle = '#F472B6';
            ctx.fillText('v', ballPxX + instVxLen + 5, ballPxY - instVyLen - 4);
          }

          // Projectile Metallic Sphere with 3D Radial Glow
          const ballGrad = ctx.createRadialGradient(ballPxX - 2, ballPxY - 2, 1, ballPxX, ballPxY, 7);
          ballGrad.addColorStop(0, '#FFFFFF');
          ballGrad.addColorStop(0.3, '#F472B6');
          ballGrad.addColorStop(0.8, '#A855F7');
          ballGrad.addColorStop(1, '#581C87');
          ctx.fillStyle = ballGrad;
          ctx.beginPath();
          ctx.arc(ballPxX, ballPxY, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FBCFE8';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [velocity, angleDeg, gravity, metrics, running, showComponents, showDimensions]);

  return (
    <LabShell
      symbolGuide="u (v₀) = আদিবেগ · uₓ, uᵧ = আদি উপাংশ · v = তাৎক্ষণিক বেগ · vₓ, vᵧ = উপাংশ · H = সর্বোচ্চ উচ্চতা · R = পাল্লা"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setVelocity(32);
        setAngleDeg(45);
        setGravity(9.8);
        simTimeRef.current = 0;
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="প্রাসের গতিপথ ও উপাংশ সিমুলেশন" />}
      metrics={[
        { label: 'অনুভূমিক পাল্লা (R)', value: `${metrics.range.toFixed(2)} m`, accentClass: 'text-sky-300' },
        { label: 'সর্বোচ্চ উচ্চতা (H)', value: `${metrics.maxHeight.toFixed(2)} m`, accentClass: 'text-pink-300' },
        { label: 'বিচরণকাল (T)', value: `${metrics.timeOfFlight.toFixed(2)} s`, accentClass: 'text-purple-300' },
        { label: 'তাৎক্ষণিক বেগ |v|', value: `${instantReadout.speed.toFixed(2)} m/s`, accentClass: 'text-green-300' },
      ]}
      controls={
        <>
          {/* Quick Concept Presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-300">দ্রুত কনসেপ্ট প্রিসেট</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setVelocity(32);
                  setAngleDeg(45);
                  setGravity(9.8);
                }}
                className={`px-2.5 py-1.5 text-xs rounded border transition-colors cursor-pointer text-left ${
                  angleDeg === 45 && velocity === 32
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold'
                    : 'bg-[#0C0E13] border-[#2E3442] text-slate-300 hover:bg-slate-800'
                }`}
              >
                সর্বোচ্চ পাল্লা (θ₀=৪৫°)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVelocity(35);
                  setAngleDeg(30);
                  setGravity(9.8);
                }}
                className={`px-2.5 py-1.5 text-xs rounded border transition-colors cursor-pointer text-left ${
                  angleDeg === 30 && velocity === 35
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold'
                    : 'bg-[#0C0E13] border-[#2E3442] text-slate-300 hover:bg-slate-800'
                }`}
              >
                নেইমার শট (θ₀=৩০°)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVelocity(40);
                  setAngleDeg(75);
                  setGravity(9.8);
                }}
                className={`px-2.5 py-1.5 text-xs rounded border transition-colors cursor-pointer text-left ${
                  angleDeg === 75
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold'
                    : 'bg-[#0C0E13] border-[#2E3442] text-slate-300 hover:bg-slate-800'
                }`}
              >
                উচ্চতা লব (θ₀=৭৫°)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVelocity(32);
                  setAngleDeg(60);
                  setGravity(9.8);
                }}
                className={`px-2.5 py-1.5 text-xs rounded border transition-colors cursor-pointer text-left ${
                  angleDeg === 60
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold'
                    : 'bg-[#0C0E13] border-[#2E3442] text-slate-300 hover:bg-slate-800'
                }`}
              >
                পরিপূরক কোণ (θ₀=৬০°)
              </button>
            </div>
          </div>

          {/* Celestial Gravity Selector */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-300">মহাজাগতিক অভিকর্ষ (g)</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { name: 'পৃথিবী', val: 9.8 },
                { name: 'চাঁদ', val: 1.62 },
                { name: 'মঙ্গল', val: 3.72 },
              ].map((cel) => (
                <button
                  key={cel.name}
                  type="button"
                  onClick={() => setGravity(cel.val)}
                  className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer text-center ${
                    Math.abs(gravity - cel.val) < 0.1
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold'
                      : 'bg-[#0C0E13] border-[#2E3442] text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {cel.name} ({cel.val})
                </button>
              ))}
            </div>
          </div>

          {/* Component and Dimension Toggles */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowComponents((c) => !c)}
              className={`flex-1 py-1.5 px-2 text-xs rounded border transition-colors cursor-pointer text-center ${
                showComponents
                  ? 'bg-green-500/20 border-green-400 text-green-200 font-semibold'
                  : 'bg-[#0C0E13] border-[#2E3442] text-slate-400'
              }`}
            >
              {showComponents ? '✓ উপাংশ ভেক্টর চালু' : '✗ উপাংশ লুকানো'}
            </button>
            <button
              type="button"
              onClick={() => setShowDimensions((d) => !d)}
              className={`flex-1 py-1.5 px-2 text-xs rounded border transition-colors cursor-pointer text-center ${
                showDimensions
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-semibold'
                  : 'bg-[#0C0E13] border-[#2E3442] text-slate-400'
              }`}
            >
              {showDimensions ? '✓ পাল্লা R ও H রেখা' : '✗ পরিমাপ লুকানো'}
            </button>
          </div>

          {/* Sliders & Manual Numeric Inputs */}
          <LabParamControl
            id="p-v0"
            label="আদিবেগ u (v₀)"
            value={velocity}
            min={10}
            max={60}
            step={1}
            unit="m/s"
            inputMin={1}
            inputMax={200}
            onChange={setVelocity}
          />

          <LabParamControl
            id="p-th"
            label="নিক্ষেপণ কোণ (θ₀)"
            value={angleDeg}
            min={15}
            max={85}
            step={1}
            unit="°"
            inputMin={1}
            inputMax={89}
            onChange={setAngleDeg}
          />

          <LabParamControl
            id="p-g"
            label="অভিকর্ষজ ত্বরণ (g)"
            value={gravity}
            min={1}
            max={25}
            step={0.1}
            unit="m/s²"
            accent="sky"
            inputMin={0.5}
            inputMax={50}
            onChange={setGravity}
          />
        </>
      }
      boardTip="θ₀ = ৪৫° কোণে প্রাসের অনুভূমিক পাল্লা R সর্বোচ্চ হয়। পরস্পরের পরিপূরক কোণ (যেমন ৩০° ও ৬০°)-এ পাল্লা R একই থাকে।"
    />
  );
}

/* ============================================================================
   Chapter 03 Sub-Lab B: 3D Uniform Circular Motion & Centripetal Force
   ============================================================================ */
export function CircularMotionLab() {
  const [speed, setSpeed] = useState(14); // m/s
  const [radius, setRadius] = useState(6); // m
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const thetaRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number; alpha: number }[]>([]);

  const ac = (speed * speed) / radius;
  const period = (2 * Math.PI * radius) / speed;

  useEffect(() => {
    let animId: number;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (running) {
        thetaRef.current = (thetaRef.current + dt * (speed / radius)) % (Math.PI * 2);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const cx = width / 2;
          const cy = height / 2;
          const rx = Math.min(width, height) * 0.40;
          const ry = rx * 0.54; // 3D perspective tilt
          const theta = thetaRef.current;

          // 3D Perspective Velodrome Track
          const trackW = 48;
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
          ctx.lineWidth = 1;
          for (let r = 0.2; r <= 1.3; r += 0.2) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx * r, ry * r, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Dark Asphalt Track Ring
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = trackW;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Outer and Inner Track Boundaries
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx - trackW / 2, ry - (trackW / 2) * 0.54, 0, 0, Math.PI * 2);
          ctx.ellipse(cx, cy, rx + trackW / 2, ry + (trackW / 2) * 0.54, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Center Pylon / Axis
          ctx.fillStyle = '#EC4899';
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FBCFE8';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Particle / Car Position on 3D Ellipse
          const px = cx + rx * Math.cos(theta);
          const py = cy + ry * Math.sin(theta);

          // Motion trail
          if (running) {
            trailRef.current.push({ x: px, y: py, alpha: 1.0 });
            if (trailRef.current.length > 32) trailRef.current.shift();
          }

          // Draw Glowing Trail
          for (let i = 0; i < trailRef.current.length; i++) {
            const pt = trailRef.current[i];
            pt.alpha -= 0.025;
            ctx.fillStyle = `rgba(244, 114, 182, ${Math.max(0, pt.alpha * 0.5)})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4 * Math.max(0, pt.alpha), 0, Math.PI * 2);
            ctx.fill();
          }

          // Centripetal Acceleration Vector Arrow (towards center)
          ctx.strokeStyle = '#F472B6';
          ctx.fillStyle = '#F472B6';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          const acLen = 48;
          const acDirX = (cx - px) / Math.hypot(cx - px, cy - py);
          const acDirY = (cy - py) / Math.hypot(cx - px, cy - py);
          ctx.lineTo(px + acDirX * acLen, py + acDirY * acLen);
          ctx.stroke();
          ctx.font = 'bold 10px "IBM Plex Mono", monospace';
          ctx.fillText('a_c', px + acDirX * (acLen + 10) - 8, py + acDirY * (acLen + 10));

          // Tangential Velocity Vector Arrow
          ctx.strokeStyle = '#38BDF8';
          ctx.fillStyle = '#38BDF8';
          ctx.lineWidth = 2.5;
          const vLen = 45;
          const tanDirX = -rx * Math.sin(theta);
          const tanDirY = ry * Math.cos(theta);
          const normTan = Math.hypot(tanDirX, tanDirY);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + (tanDirX / normTan) * vLen, py + (tanDirY / normTan) * vLen);
          ctx.stroke();
          ctx.fillText('v', px + (tanDirX / normTan) * (vLen + 8), py + (tanDirY / normTan) * (vLen + 8));

          // 3D Race Car Driving along the Track Tangent
          const carAngle = Math.atan2(tanDirY, tanDirX);
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(carAngle);

          // Headlight Beam Casting on Track Ahead
          const beamGrad = ctx.createRadialGradient(28, 0, 4, 65, 0, 50);
          beamGrad.addColorStop(0, 'rgba(224, 242, 254, 0.55)');
          beamGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.2)');
          beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(16, -6);
          ctx.lineTo(65, -22);
          ctx.lineTo(65, 22);
          ctx.lineTo(16, 6);
          ctx.closePath();
          ctx.fill();

          // 3D Sports Car Chassis (Studio Purple-Pink)
          const carGrad = ctx.createLinearGradient(-15, 0, 15, 0);
          carGrad.addColorStop(0, '#9D174D');
          carGrad.addColorStop(0.4, '#FBCFE8');
          carGrad.addColorStop(0.8, '#EC4899');
          carGrad.addColorStop(1, '#581C87');
          ctx.fillStyle = carGrad;
          ctx.beginPath();
          ctx.roundRect(-16, -9, 32, 18, 4);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Windshield
          ctx.fillStyle = '#0284C7';
          ctx.beginPath();
          ctx.roundRect(-4, -6, 12, 12, 2);
          ctx.fill();

          // 4 Rotating Wheels
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-12, -12, 7, 3);
          ctx.fillRect(5, -12, 7, 3);
          ctx.fillRect(-12, 9, 7, 3);
          ctx.fillRect(5, 9, 7, 3);

          // Dual Silver Taillights
          ctx.fillStyle = '#CBD5E1';
          ctx.fillRect(-16, -7, 2, 4);
          ctx.fillRect(-16, 3, 2, 4);

          // Exhaust flame
          if (running) {
            ctx.fillStyle = '#38BDF8';
            ctx.fillRect(-19, -4, -4, 2);
            ctx.fillRect(-19, 2, -4, 2);
          }

          ctx.restore();

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [speed, radius, running, ac]);

  return (
    <LabShell
      symbolGuide="v = রৈখিক দ্রুতি · a_c = কেন্দ্রমুখী ত্বরণ · r = বৃত্তের ব্যাসার্ধ · ω = কৌণিক দ্রুতি"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setSpeed(14);
        setRadius(6);
        thetaRef.current = 0;
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="3D বৃত্তাকার গতি সিমুলেশন" />}
      metrics={[
        { label: 'কেন্দ্রমুখী ত্বরণ (a_c)', value: `${ac.toFixed(2)} m/s²`, accentClass: 'text-pink-300' },
        { label: 'পর্যায়কাল (T)', value: `${period.toFixed(2)} s`, accentClass: 'text-sky-300' },
        { label: 'রৈখিক দ্রুতি (v)', value: `${speed} m/s`, accentClass: 'text-green-300' },
        { label: 'কৌণিক দ্রুতি (ω)', value: `${(speed / radius).toFixed(2)} rad/s`, accentClass: 'text-purple-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="cm-v"
            label="রৈখিক দ্রুতি (v)"
            value={speed}
            min={4}
            max={25}
            step={1}
            unit="m/s"
            inputMin={1}
            inputMax={100}
            onChange={setSpeed}
          />
          <LabParamControl
            id="cm-r"
            label="বৃত্তের ব্যাসার্ধ (r)"
            value={radius}
            min={3}
            max={12}
            step={0.5}
            unit="m"
            inputMin={0.5}
            inputMax={100}
            onChange={setRadius}
          />
        </>
      }
      boardTip="সমবৃত্তাকার গতিতে দ্রুতি ধ্রুব হলেও বেগের দিক প্রতি মুহূর্তে পরিবর্তনের কারণে সর্বদা কেন্দ্রমুখী ত্বরণ a_c = v²/r উৎপন্ন হয়।"
    />
  );
}

/* ============================================================================
   Chapter 04: 3D Road Banking & Safe Velocity
   ============================================================================ */
/* ============================================================================
   Chapter 04: 3D Road Banking Racing Simulator & Force Analysis
   ============================================================================ */
export function RoadBankingLab() {
  const [speed, setSpeed] = useState(22); // m/s
  const [radius, setRadius] = useState(80); // m
  const [bankDeg, setBankDeg] = useState(18); // degrees
  const [frictionMu, setFrictionMu] = useState(0.25); // road friction
  const [cameraMode, setCameraMode] = useState<'curve' | 'chase' | 'fbd'>('curve');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phiRef = useRef(0); // angular position along curved track
  const driftOffsetRef = useRef(0); // lateral outward displacement
  const smokeRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number }[]>([]);
  const skidMarksRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const sparksRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Web Audio Synthesizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const screechGainRef = useRef<GainNode | null>(null);

  const g = 9.8;
  const bankRad = (bankDeg * Math.PI) / 180;
  const tanTheta = Math.tan(bankRad);

  const metrics = useMemo(() => {
    // Ideal speed with zero lateral friction
    const vOptimum = Math.sqrt(radius * g * tanTheta);
    // Required bank angle for current speed
    const idealDeg = (Math.atan((speed * speed) / (radius * g)) * 180) / Math.PI;

    // Safe max speed with friction mu
    const denom = 1 - frictionMu * tanTheta;
    const safeMaxSpeed = denom > 0.02 ? Math.sqrt(radius * g * ((tanTheta + frictionMu) / denom)) : 99;

    // Minimum speed to prevent inward slide on steep banks
    const minSpeed = tanTheta > frictionMu ? Math.sqrt(radius * g * ((tanTheta - frictionMu) / (1 + frictionMu * tanTheta))) : 0;

    const centripetalAcc = (speed * speed) / radius;
    const gForce = centripetalAcc / g;
    const isOverSpeed = speed > safeMaxSpeed + 0.5;
    const isUnderSpeed = minSpeed > 1 && speed < minSpeed - 0.5;
    const isSafe = !isOverSpeed && !isUnderSpeed;

    // Road dimensions
    const roadWidthM = 8;
    const elevationHeightM = roadWidthM * Math.sin(bankRad);

    return {
      vOptimum,
      idealDeg,
      safeMaxSpeed,
      minSpeed,
      centripetalAcc,
      gForce,
      isOverSpeed,
      isUnderSpeed,
      isSafe,
      roadWidthM,
      elevationHeightM,
    };
  }, [speed, radius, bankDeg, frictionMu, tanTheta]);

  // Audio setup & cleanup
  const toggleSound = () => {
    if (!soundEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        // Engine oscillator
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50 + speed * 3.5, ctx.currentTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(360, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        engineOscRef.current = osc;
        engineGainRef.current = gain;

        // Tire screech white noise
        const bufSize = ctx.sampleRate * 2;
        const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        noiseSrc.loop = true;

        const screechFilter = ctx.createBiquadFilter();
        screechFilter.type = 'bandpass';
        screechFilter.frequency.setValueAtTime(1200, ctx.currentTime);
        screechFilter.Q.setValueAtTime(3.5, ctx.currentTime);

        const screechGain = ctx.createGain();
        screechGain.gain.setValueAtTime(0, ctx.currentTime);

        noiseSrc.connect(screechFilter);
        screechFilter.connect(screechGain);
        screechGain.connect(ctx.destination);
        noiseSrc.start();

        screechGainRef.current = screechGain;
        setSoundEnabled(true);
      } catch {
        setSoundEnabled(false);
      }
    } else {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setSoundEnabled(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Update audio dynamically
  useEffect(() => {
    if (audioCtxRef.current && engineOscRef.current) {
      engineOscRef.current.frequency.setTargetAtTime(50 + speed * 3.6, audioCtxRef.current.currentTime, 0.1);
    }
    if (audioCtxRef.current && screechGainRef.current) {
      screechGainRef.current.gain.setTargetAtTime(metrics.isOverSpeed ? 0.12 : 0, audioCtxRef.current.currentTime, 0.06);
    }
  }, [speed, metrics.isOverSpeed]);

  // Main 3D Animation Loop
  useEffect(() => {
    let animId: number;
    let chaseScroll = 0;
    let exhaustPhase = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (running) {
        // Advance car along the circular banked track
        const angularVelocity = speed / radius;
        phiRef.current = (phiRef.current + angularVelocity * dt * 2.2) % (Math.PI * 2);

        chaseScroll = (chaseScroll + speed * 2.2) % 100;
        exhaustPhase += 0.3;

        // Lateral drift physics
        if (metrics.isOverSpeed) {
          const excess = speed - metrics.safeMaxSpeed;
          driftOffsetRef.current = Math.min(38, driftOffsetRef.current + excess * 15 * dt);

          // Tire smoke
          if (Math.random() < 0.65) {
            smokeRef.current.push({
              x: 0,
              y: 0,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              r: 4 + Math.random() * 6,
              alpha: 0.85,
            });
          }

          // Sparks if scraping barrier
          if (driftOffsetRef.current > 30 && Math.random() < 0.5) {
            for (let s = 0; s < 4; s++) {
              sparksRef.current.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.2) * 6 + 2,
                vy: (Math.random() - 0.5) * 6,
                life: 1.0,
              });
            }
          }
        } else if (metrics.isUnderSpeed) {
          driftOffsetRef.current = Math.max(-28, driftOffsetRef.current - 12 * dt);
        } else {
          // Recover towards center lane
          if (driftOffsetRef.current > 0) {
            driftOffsetRef.current = Math.max(0, driftOffsetRef.current - 18 * dt);
          } else if (driftOffsetRef.current < 0) {
            driftOffsetRef.current = Math.min(0, driftOffsetRef.current + 18 * dt);
          }
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;

          // ==================================================================
          // MODE 1: 3D CURVED BANKED RACETRACK (The Car Actively Drives!)
          // ==================================================================
          if (cameraMode === 'curve') {
            const cx = width * 0.48;
            const cy = height * 0.50;
            const rx = Math.min(width, height) * 0.42;
            const ry = rx * 0.52; // 3D isometric perspective tilt
            const roadW = 72;
            const bankElevation = roadW * Math.sin(bankRad) * 0.85; // Raised outer edge

            // Twilight sky background
            const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
            skyGrad.addColorStop(0, '#060913');
            skyGrad.addColorStop(0.5, '#0B132B');
            skyGrad.addColorStop(1, '#050811');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, width, height);

            // Stadium Floodlight Pylons casting light cones
            const pylons = [
              { x: width * 0.12, y: height * 0.18 },
              { x: width * 0.88, y: height * 0.18 },
              { x: width * 0.08, y: height * 0.82 },
              { x: width * 0.92, y: height * 0.82 },
            ];
            for (const p of pylons) {
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y + 20);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();

              // Light glow
              const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 70);
              glow.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
              glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.1)');
              glow.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 70, 0, Math.PI * 2);
              ctx.fill();
            }

            // Central Infield Grass (Dark emerald island)
            ctx.fillStyle = '#064E3B';
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx - roadW / 2 - 4, ry - (roadW / 2) * 0.52 - 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#047857';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Center Telemetry / Radius Indicator
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + rx, cy);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#38BDF8';
            ctx.font = '10px "IBM Plex Mono", monospace';
            ctx.fillText('R', cx + rx * 0.48, cy - 6);

            // Center Pivot Pole
            ctx.fillStyle = '#EC4899';
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fill();

            // 3D Banked Racetrack Surface Segments
            const numSegments = 56;
            for (let i = 0; i < numSegments; i++) {
              const a1 = (i / numSegments) * Math.PI * 2;
              const a2 = ((i + 1) / numSegments) * Math.PI * 2;

              // Inner road edge (ground level)
              const rIn = rx - roadW / 2;
              const rInY = ry - (roadW / 2) * 0.52;
              const xin1 = cx + rIn * Math.cos(a1);
              const yin1 = cy + rInY * Math.sin(a1);
              const xin2 = cx + rIn * Math.cos(a2);
              const yin2 = cy + rInY * Math.sin(a2);

              // Outer road edge (raised in 3D by bankElevation)
              const rOut = rx + roadW / 2;
              const rOutY = ry + (roadW / 2) * 0.52;
              const xout1 = cx + rOut * Math.cos(a1);
              const yout1 = cy + rOutY * Math.sin(a1) - bankElevation;
              const xout2 = cx + rOut * Math.cos(a2);
              const yout2 = cy + rOutY * Math.sin(a2) - bankElevation;

              // Outer 3D Embankment Wall Foundation (showing road thickness & elevation)
              if (Math.sin(a1) > -0.2) {
                ctx.fillStyle = '#0F172A';
                ctx.beginPath();
                ctx.moveTo(xout1, yout1);
                ctx.lineTo(xout2, yout2);
                ctx.lineTo(xout2, yout2 + bankElevation);
                ctx.lineTo(xout1, yout1 + bankElevation);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#1E293B';
                ctx.lineWidth = 1;
                ctx.stroke();
              }

              // Asphalt Road Quad
              const quadGrad = ctx.createLinearGradient(xin1, yin1, xout1, yout1);
              quadGrad.addColorStop(0, '#1E293B');
              quadGrad.addColorStop(0.5, '#0F172A');
              quadGrad.addColorStop(1, '#1E293B');
              ctx.fillStyle = quadGrad;
              ctx.beginPath();
              ctx.moveTo(xin1, yin1);
              ctx.lineTo(xout1, yout1);
              ctx.lineTo(xout2, yout2);
              ctx.lineTo(xin2, yin2);
              ctx.closePath();
              ctx.fill();

              // Slate & White Rumble Curbs (Inner & Outer)
              const isDark = i % 2 === 0;
              // Inner curb
              ctx.fillStyle = isDark ? '#475569' : '#F8FAFC';
              ctx.beginPath();
              ctx.moveTo(xin1, yin1);
              ctx.lineTo(xin1 + (xout1 - xin1) * 0.08, yin1 + (yout1 - yin1) * 0.08);
              ctx.lineTo(xin2 + (xout2 - xin2) * 0.08, yin2 + (yout2 - yin2) * 0.08);
              ctx.lineTo(xin2, yin2);
              ctx.closePath();
              ctx.fill();

              // Outer elevated curb
              ctx.beginPath();
              ctx.moveTo(xout1 - (xout1 - xin1) * 0.09, yout1 - (yout1 - yin1) * 0.09);
              ctx.lineTo(xout1, yout1);
              ctx.lineTo(xout2, yout2);
              ctx.lineTo(xout2 - (xout2 - xin2) * 0.09, yout2 - (yout2 - yin2) * 0.09);
              ctx.closePath();
              ctx.fill();

              // Center Dashed White Line
              if (i % 2 === 0) {
                const xmid1 = (xin1 + xout1) / 2;
                const ymid1 = (yin1 + yout1) / 2;
                const xmid2 = (xin2 + xout2) / 2;
                const ymid2 = (yin2 + yout2) / 2;
                ctx.strokeStyle = '#F8FAFC';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(xmid1, ymid1);
                ctx.lineTo(xmid2, ymid2);
                ctx.stroke();
              }
            }

            // Outer Safety Crash Barrier
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(cx, cy - bankElevation, rx + roadW / 2 + 2, (ry + (roadW / 2) * 0.52) + 2, 0, 0, Math.PI * 2);
            ctx.stroke();

            // ----------------------------------------------------------------
            // CAR DYNAMICS & POSITION ALONG CURVE
            // ----------------------------------------------------------------
            const carAngle = phiRef.current;
            const lateralOffset = driftOffsetRef.current; // outward drift
            const carTrackR = rx + lateralOffset;
            const carTrackRY = ry + lateralOffset * 0.52;

            // Elevation calculated by banking fraction
            const bankFraction = (lateralOffset + roadW / 2) / roadW;
            const carZ = bankFraction * bankElevation;

            const carX = cx + carTrackR * Math.cos(carAngle);
            const carY = cy + carTrackRY * Math.sin(carAngle) - carZ;

            // Velocity tangent direction
            const vxDir = -carTrackR * Math.sin(carAngle);
            const vyDir = carTrackRY * Math.cos(carAngle);
            const headingRad = Math.atan2(vyDir, vxDir);

            // Record tire skid marks
            if (metrics.isOverSpeed && running) {
              skidMarksRef.current.push({ x: carX, y: carY, alpha: 1.0 });
              if (skidMarksRef.current.length > 50) skidMarksRef.current.shift();
            }

            // Render Skid Marks on track
            for (let k = 0; k < skidMarksRef.current.length; k++) {
              const sm = skidMarksRef.current[k];
              sm.alpha -= 0.015;
              if (sm.alpha > 0) {
                ctx.fillStyle = `rgba(15, 23, 42, ${sm.alpha * 0.7})`;
                ctx.beginPath();
                ctx.arc(sm.x, sm.y, 4, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // Render Tire Smoke Particles
            for (let s = smokeRef.current.length - 1; s >= 0; s--) {
              const sm = smokeRef.current[s];
              if (running) {
                sm.x += sm.vx;
                sm.y += sm.vy;
                sm.r += 0.4;
                sm.alpha -= 0.035;
              }
              if (sm.alpha <= 0) {
                smokeRef.current.splice(s, 1);
              } else {
                ctx.fillStyle = `rgba(226, 232, 240, ${sm.alpha * 0.45})`;
                ctx.beginPath();
                ctx.arc(carX + sm.x, carY + sm.y, sm.r, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // Render Collision Barrier Sparks
            for (let sp = sparksRef.current.length - 1; sp >= 0; sp--) {
              const spark = sparksRef.current[sp];
              if (running) {
                spark.x += spark.vx;
                spark.y += spark.vy;
                spark.life -= 0.05;
              }
              if (spark.life <= 0) {
                sparksRef.current.splice(sp, 1);
              } else {
                ctx.fillStyle = '#F472B6';
                ctx.beginPath();
                ctx.arc(carX + spark.x, carY + spark.y, 1.8 * spark.life, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // ----------------------------------------------------------------
            // 3D SPORTS CAR MODEL (Actively Driving & Turning!)
            // ----------------------------------------------------------------
            ctx.save();
            ctx.translate(carX, carY);
            // Rotate to face tangent + oversteer slip angle
            const slipAngle = (lateralOffset / 38) * 0.35;
            ctx.rotate(headingRad + slipAngle);

            // Tilting / Banking Roll Effect
            ctx.scale(1, Math.cos(bankRad * 0.6));

            // Headlight beams illuminating the track ahead
            const beamGrad = ctx.createRadialGradient(28, 0, 4, 75, 0, 55);
            beamGrad.addColorStop(0, 'rgba(224, 242, 254, 0.6)');
            beamGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.25)');
            beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = beamGrad;
            ctx.beginPath();
            ctx.moveTo(18, -8);
            ctx.lineTo(80, -28);
            ctx.lineTo(80, 28);
            ctx.lineTo(18, 8);
            ctx.closePath();
            ctx.fill();

            // Aerodynamic Car Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.beginPath();
            ctx.ellipse(0, 4, 22, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // 4 High-Speed Rotating Wheels
            ctx.fillStyle = '#0F172A';
            // Rear Wheels (fixed straight)
            ctx.fillRect(-15, -13, 8, 4);
            ctx.fillRect(-15, 9, 8, 4);

            // Front Steered Wheels (steered into bend)
            ctx.save();
            ctx.translate(11, -11);
            ctx.rotate(0.25);
            ctx.fillRect(-4, -2, 8, 4);
            ctx.restore();

            ctx.save();
            ctx.translate(11, 11);
            ctx.rotate(0.25);
            ctx.fillRect(-4, -2, 8, 4);
            ctx.restore();

            // 3D Car Chassis
            const carGrad = ctx.createLinearGradient(-18, 0, 18, 0);
            if (metrics.isSafe) {
              carGrad.addColorStop(0, '#9D174D');
              carGrad.addColorStop(0.3, '#FBCFE8');
              carGrad.addColorStop(0.7, '#EC4899');
              carGrad.addColorStop(1, '#581C87');
            } else {
              carGrad.addColorStop(0, '#64748B');
              carGrad.addColorStop(0.3, '#FFFFFF');
              carGrad.addColorStop(0.7, '#E2E8F0');
              carGrad.addColorStop(1, '#475569');
            }
            ctx.fillStyle = carGrad;
            ctx.beginPath();
            ctx.roundRect(-18, -10, 36, 20, 5);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Cockpit Windshield
            ctx.fillStyle = '#0284C7';
            ctx.beginPath();
            ctx.roundRect(-4, -7, 14, 14, 3);
            ctx.fill();
            ctx.strokeStyle = '#7DD3FC';
            ctx.lineWidth = 1;
            ctx.stroke();

            // GT Racing Wing Spoiler
            ctx.fillStyle = '#1E293B';
            ctx.fillRect(-18, -9, 3, 18);
            ctx.strokeStyle = '#C084FC';
            ctx.lineWidth = 1;
            ctx.strokeRect(-18, -9, 3, 18);

            // Silver LED Taillights
            ctx.fillStyle = '#CBD5E1';
            ctx.fillRect(-19, -8, 2, 4);
            ctx.fillRect(-19, 4, 2, 4);

            // Twin Nitro Exhaust Flames
            if (running) {
              const flame = 4 + Math.sin(exhaustPhase) * 3;
              ctx.fillStyle = '#38BDF8';
              ctx.fillRect(-22, -6, -flame, 3);
              ctx.fillRect(-22, 3, -flame, 3);
            }

            ctx.restore();

            // ----------------------------------------------------------------
            // 3D FORCE VECTORS ANCHORED ON THE MOVING CAR
            // ----------------------------------------------------------------
            // Gravity mg (straight down)
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(carX, carY);
            ctx.lineTo(carX, carY + 55);
            ctx.stroke();
            ctx.fillStyle = '#94A3B8';
            ctx.font = 'bold 10px "IBM Plex Mono", monospace';
            ctx.fillText('mg', carX + 6, carY + 52);

            // Normal Reaction N (perpendicular to road, tilted inward by bankRad)
            const nLen = 65;
            // Inward normal vector direction
            const nx = carX - nLen * Math.sin(bankRad) * Math.cos(carAngle);
            const ny = carY - nLen * Math.cos(bankRad);
            ctx.strokeStyle = '#38BDF8';
            ctx.beginPath();
            ctx.moveTo(carX, carY);
            ctx.lineTo(nx, ny);
            ctx.stroke();
            ctx.fillStyle = '#38BDF8';
            ctx.fillText('N', nx - 14, ny - 4);

            // Centripetal force component N sin theta pointing directly to center (cx, cy)
            const dirToCenterDist = Math.hypot(cx - carX, cy - carY);
            const dirX = (cx - carX) / dirToCenterDist;
            const dirY = (cy - carY) / dirToCenterDist;
            const fcLen = Math.min(50, metrics.centripetalAcc * 3.5);

            ctx.strokeStyle = '#4ADE80';
            ctx.beginPath();
            ctx.moveTo(carX, carY);
            ctx.lineTo(carX + dirX * fcLen, carY + dirY * fcLen);
            ctx.stroke();
            ctx.fillStyle = '#4ADE80';
            ctx.fillText('N sin θ', carX + dirX * (fcLen + 10) - 16, carY + dirY * (fcLen + 10) + 4);

            // Friction Vector fs if overspeeding (inward down slope) or underspeeding (outward)
            if (metrics.isOverSpeed) {
              ctx.strokeStyle = '#CBD5E1';
              ctx.beginPath();
              ctx.moveTo(carX, carY);
              ctx.lineTo(carX + dirX * 35, carY + dirY * 35 + 12);
              ctx.stroke();
              ctx.fillStyle = '#CBD5E1';
              ctx.fillText('f_s (ঘর্ষণ)', carX + dirX * 38, carY + dirY * 38 + 14);
            }

            // Road Status Banner in Top Left
            ctx.fillStyle = metrics.isSafe ? '#4ADE80' : '#CBD5E1';
            ctx.font = 'bold 12px "Noto Sans Bengali", sans-serif';
            ctx.fillText(
              metrics.isSafe ? '● গাড়ি নিরাপদে ঘুরছে' : '▲ টায়ার স্কিড! গতি কমান',
              18,
              28,
            );
          }

          // ==================================================================
          // MODE 2: 3D CHASE CAM (Driver's Behind-the-Car View)
          // ==================================================================
          else if (cameraMode === 'chase') {
            const roadTilt = -bankRad;
            const horizonY = height * 0.42;

            // Sky
            const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
            skyGrad.addColorStop(0, '#060A14');
            skyGrad.addColorStop(1, '#0F1E36');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, width, horizonY);

            // Distant Mountains
            ctx.fillStyle = '#1E293B';
            ctx.beginPath();
            ctx.moveTo(0, horizonY);
            ctx.lineTo(width * 0.2, horizonY - 35);
            ctx.lineTo(width * 0.45, horizonY - 15);
            ctx.lineTo(width * 0.7, horizonY - 45);
            ctx.lineTo(width, horizonY);
            ctx.closePath();
            ctx.fill();

            ctx.save();
            ctx.translate(width / 2, height * 0.55);
            // Tilt the camera by banking angle
            ctx.rotate(roadTilt);

            // Banked Roadway Perspective Surface
            const roadW = width * 0.85;
            const roadH = height * 0.75;
            const roadGrad = ctx.createLinearGradient(-roadW / 2, 0, roadW / 2, 0);
            roadGrad.addColorStop(0, '#1E293B');
            roadGrad.addColorStop(0.3, '#0F172A');
            roadGrad.addColorStop(0.7, '#1E293B');
            roadGrad.addColorStop(1, '#334155');
            ctx.fillStyle = roadGrad;
            ctx.fillRect(-roadW / 2, -roadH / 2, roadW, roadH);

            // Moving Curbs & Rumble Strips
            const numStrips = 16;
            for (let s = 0; s < numStrips; s++) {
              const sy = -roadH / 2 + ((s * 25 + chaseScroll) % (roadH + 25)) - 10;
              const isDark = s % 2 === 0;
              ctx.fillStyle = isDark ? '#475569' : '#F8FAFC';
              ctx.fillRect(-roadW / 2, sy, 16, 12);
              ctx.fillRect(roadW / 2 - 16, sy, 16, 12);
            }

            // Moving Center Dashed Line
            ctx.strokeStyle = '#F8FAFC';
            ctx.lineWidth = 4;
            ctx.setLineDash([22, 28]);
            ctx.beginPath();
            ctx.moveTo(0, -roadH / 2 - chaseScroll);
            ctx.lineTo(0, roadH / 2 + 80);
            ctx.stroke();
            ctx.setLineDash([]);

            // Lateral position of car (slides right when overspeeding)
            const carX = driftOffsetRef.current * 1.5;
            const carY = 30;

            // Skid marks behind rear wheels
            if (metrics.isOverSpeed) {
              ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
              ctx.lineWidth = 6;
              ctx.beginPath();
              ctx.moveTo(carX - 28, carY + 10);
              ctx.lineTo(carX - 28 - 10, carY + 65);
              ctx.moveTo(carX + 28, carY + 10);
              ctx.lineTo(carX + 28 - 10, carY + 65);
              ctx.stroke();
            }

            // 3D Sports Car from Rear
            const carW = 80;
            const carH = 42;
            const chassisGrad = ctx.createLinearGradient(carX - carW / 2, 0, carX + carW / 2, 0);
            if (metrics.isSafe) {
              chassisGrad.addColorStop(0, '#9D174D');
              chassisGrad.addColorStop(0.4, '#FBCFE8');
              chassisGrad.addColorStop(0.7, '#EC4899');
              chassisGrad.addColorStop(1, '#581C87');
            } else {
              chassisGrad.addColorStop(0, '#64748B');
              chassisGrad.addColorStop(0.4, '#FFFFFF');
              chassisGrad.addColorStop(0.7, '#E2E8F0');
              chassisGrad.addColorStop(1, '#475569');
            }

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            ctx.ellipse(carX, carY + 18, carW * 0.6, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Wheels
            ctx.fillStyle = '#0F172A';
            ctx.fillRect(carX - carW / 2 - 3, carY + 4, 11, 20);
            ctx.fillRect(carX + carW / 2 - 8, carY + 4, 11, 20);

            // Body
            ctx.fillStyle = chassisGrad;
            ctx.beginPath();
            ctx.roundRect(carX - carW / 2, carY - carH / 2, carW, carH, 8);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Rear Windshield
            ctx.fillStyle = '#0369A1';
            ctx.beginPath();
            ctx.roundRect(carX - carW / 2 + 12, carY - carH / 2 + 5, carW - 24, 14, 4);
            ctx.fill();
            ctx.strokeStyle = '#7DD3FC';
            ctx.lineWidth = 1;
            ctx.stroke();

            // GT Spoiler
            ctx.fillStyle = '#1E293B';
            ctx.fillRect(carX - carW / 2 + 6, carY + 15, carW - 12, 6);
            ctx.strokeStyle = '#C084FC';
            ctx.strokeRect(carX - carW / 2 + 6, carY + 15, carW - 12, 6);

            // Taillights
            ctx.fillStyle = '#CBD5E1';
            ctx.fillRect(carX - carW / 2 + 6, carY + 4, 14, 7);
            ctx.fillRect(carX + carW / 2 - 20, carY + 4, 14, 7);

            // Exhaust Flames
            if (running) {
              const flameH = 6 + Math.sin(exhaustPhase) * 5;
              ctx.fillStyle = '#38BDF8';
              ctx.fillRect(carX - 14, carY + 18, 6, flameH);
              ctx.fillRect(carX + 8, carY + 18, 6, flameH);
            }

            ctx.restore();
          }

          // ==================================================================
          // MODE 3: CROSS-SECTION FREE BODY DIAGRAM (FBD & Exam Math)
          // ==================================================================
          else if (cameraMode === 'fbd') {
            const startX = width * 0.22;
            const endX = width * 0.78;
            const baseY = height * 0.74;
            const baseW = endX - startX;
            const riseH = baseW * Math.tan(bankRad);
            const topY = baseY - riseH;

            // Ground base
            ctx.strokeStyle = '#64748B';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startX - 20, baseY);
            ctx.lineTo(endX + 30, baseY);
            ctx.stroke();

            // Banked Incline Wedge
            const wedgeGrad = ctx.createLinearGradient(startX, baseY, endX, topY);
            wedgeGrad.addColorStop(0, 'rgba(30, 41, 59, 0.4)');
            wedgeGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
            ctx.fillStyle = wedgeGrad;
            ctx.beginPath();
            ctx.moveTo(startX, baseY);
            ctx.lineTo(endX, baseY);
            ctx.lineTo(endX, topY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Height h Dimension Line
            ctx.strokeStyle = '#F472B6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(endX + 16, baseY);
            ctx.lineTo(endX + 16, topY);
            ctx.stroke();
            ctx.fillStyle = '#F472B6';
            ctx.font = 'bold 11px "IBM Plex Mono", monospace';
            ctx.fillText('h', endX + 24, (baseY + topY) / 2);

            // Base width w Dimension Line
            ctx.fillStyle = '#94A3B8';
            ctx.fillText('w', (startX + endX) / 2, baseY + 20);

            // Angle arc at bottom-left
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(startX, baseY, 42, 0, -bankRad, true);
            ctx.stroke();
            ctx.fillStyle = '#38BDF8';
            ctx.font = 'bold 12px "IBM Plex Mono", monospace';
            ctx.fillText('θ', startX + 50, baseY - 12);

            // Car on the incline
            const carMidX = (startX + endX) * 0.52;
            const carMidY = baseY - (carMidX - startX) * Math.tan(bankRad);

            ctx.save();
            ctx.translate(carMidX, carMidY);
            ctx.rotate(-bankRad);

            // Car chassis
            ctx.fillStyle = '#EC4899';
            ctx.beginPath();
            ctx.roundRect(-24, -20, 48, 20, 4);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Wheels resting on slope
            ctx.fillStyle = '#0F172A';
            ctx.fillRect(-22, 0, 10, 4);
            ctx.fillRect(12, 0, 10, 4);

            ctx.restore();

            // Force Vectors from Center of Mass
            // 1. mg straight down
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(carMidX, carMidY - 10);
            ctx.lineTo(carMidX, carMidY + 65);
            ctx.stroke();
            ctx.fillStyle = '#94A3B8';
            ctx.fillText('mg', carMidX + 8, carMidY + 62);

            // 2. Normal force N perpendicular to slope
            const nx = carMidX - 75 * Math.sin(bankRad);
            const ny = carMidY - 10 - 75 * Math.cos(bankRad);
            ctx.strokeStyle = '#38BDF8';
            ctx.beginPath();
            ctx.moveTo(carMidX, carMidY - 10);
            ctx.lineTo(nx, ny);
            ctx.stroke();
            ctx.fillStyle = '#38BDF8';
            ctx.fillText('N', nx - 16, ny - 6);

            // 3. N cos theta vertical
            ctx.strokeStyle = '#38BDF8';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(carMidX, carMidY - 10);
            ctx.lineTo(carMidX, ny);
            ctx.stroke();
            ctx.fillStyle = '#38BDF8';
            ctx.fillText('N cos θ', carMidX + 8, ny);

            // 4. N sin theta horizontal (centripetal force)
            ctx.strokeStyle = '#4ADE80';
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(carMidX, carMidY - 10);
            ctx.lineTo(nx, carMidY - 10);
            ctx.stroke();
            ctx.fillStyle = '#4ADE80';
            ctx.fillText('N sin θ', nx - 46, carMidY - 16);
          }

          // ------------------------------------------------------------------
          // SPEEDOMETER & TELEMETRY HUD (All Views)
          // ------------------------------------------------------------------
          const hudX = width - 155;
          const hudY = 56;
          ctx.fillStyle = 'rgba(10, 13, 22, 0.92)';
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(hudX - 10, hudY - 36, 150, 85, 8);
          ctx.fill();
          ctx.stroke();

          // Dial Arc
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(hudX + 64, hudY + 12, 28, Math.PI * 0.8, Math.PI * 2.2);
          ctx.stroke();

          const speedFrac = Math.min(1, speed / 45);
          ctx.strokeStyle = metrics.isSafe ? '#4ADE80' : '#CBD5E1';
          ctx.beginPath();
          ctx.arc(hudX + 64, hudY + 12, 28, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * speedFrac));
          ctx.stroke();

          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 13px "IBM Plex Mono", monospace';
          ctx.fillText(`${(speed * 3.6).toFixed(0)} km/h`, hudX + 36, hudY + 12);
          ctx.font = '9px "IBM Plex Mono", monospace';
          ctx.fillStyle = '#94A3B8';
          ctx.fillText(`${speed} m/s | ${metrics.gForce.toFixed(2)} G`, hudX + 32, hudY + 28);
          ctx.fillText(`v_safe = ${metrics.safeMaxSpeed.toFixed(1)} m/s`, hudX + 16, hudY + 42);

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [speed, radius, bankDeg, metrics, running, cameraMode]);

  return (
    <LabShell
      symbolGuide="v = গাড়ির বেগ · R = বাঁকের ব্যাসার্ধ · θ = ব্যাংকিং কোণ · N = প্রতিক্রিয়া বল · mg = ওজন"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setSpeed(22);
        setRadius(80);
        setBankDeg(18);
        setFrictionMu(0.25);
        setCameraMode('curve');
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="রাস্তার ব্যাংকিং সিমুলেশন" />}
      metrics={[
        { label: 'প্রয়োজনীয় ব্যাংকিং (θ₀)', value: `${metrics.idealDeg.toFixed(1)}°`, accentClass: 'text-sky-300' },
        { label: 'সর্বোচ্চ নিরাপদ বেগ', value: `${metrics.safeMaxSpeed.toFixed(1)} m/s`, accentClass: 'text-pink-300' },
        { label: 'রাস্তার উচ্চতা (h)', value: `${metrics.elevationHeightM.toFixed(2)} m`, accentClass: 'text-purple-300' },
        { label: 'অবস্থা', value: metrics.isSafe ? '● নিরাপদ গ্রিপ' : '▲ টায়ার স্কিড!', accentClass: metrics.isSafe ? 'text-green-300' : 'text-[#CBD5E1]' },
      ]}
      controls={
        <>
          {/* Camera View Switcher */}
          <div>
            <span className="block text-xs text-slate-400 uppercase tracking-wider mb-2 font-mono">ক্যামেরা ভিউ</span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0C0E13] rounded-xl border border-[#262B36]">
              <button
                type="button"
                onClick={() => setCameraMode('curve')}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${cameraMode === 'curve' ? 'bg-sky-400 text-[#0C0E13] font-bold shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                🏎️ ৩ডি ট্র্যাক
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('chase')}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${cameraMode === 'chase' ? 'bg-sky-400 text-[#0C0E13] font-bold shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                🏁 চেজ ক্যাম
              </button>
              <button
                type="button"
                onClick={() => setCameraMode('fbd')}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${cameraMode === 'fbd' ? 'bg-sky-400 text-[#0C0E13] font-bold shadow-md' : 'text-slate-300 hover:text-white'}`}
              >
                📐 FBD কোণ
              </button>
            </div>
          </div>

          {/* Engine Sound Synthesizer Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`w-full py-2 px-3 text-xs font-medium rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${soundEnabled ? 'bg-green-950/60 border-green-500/50 text-green-300' : 'bg-[#0C0E13] border-[#262B36] text-slate-400 hover:text-slate-200'}`}
          >
            <span>{soundEnabled ? '🔊 ইঞ্জিন ও টায়ার সাউন্ড: চালু' : '🔇 ইঞ্জিন সাউন্ড চালু করুন'}</span>
          </button>

          <LabParamControl
            id="bk-v"
            label="গাড়ির বেগ (v)"
            extraNote={`(${(speed * 3.6).toFixed(0)} km/h)`}
            value={speed}
            min={8}
            max={45}
            step={1}
            unit="m/s"
            inputMin={1}
            inputMax={120}
            onChange={setSpeed}
          />

          <LabParamControl
            id="bk-r"
            label="বাঁকের ব্যাসার্ধ (R)"
            value={radius}
            min={30}
            max={200}
            step={5}
            unit="m"
            inputMin={5}
            inputMax={1000}
            onChange={setRadius}
          />

          <LabParamControl
            id="bk-t"
            label="ব্যাংকিং কোণ (θ)"
            extraNote={`(h=${metrics.elevationHeightM.toFixed(2)}m)`}
            value={bankDeg}
            min={2}
            max={38}
            step={1}
            unit="°"
            inputMin={0}
            inputMax={60}
            onChange={setBankDeg}
          />

          <LabParamControl
            id="bk-mu"
            label="রাস্তার ঘর্ষণ গুণাঙ্ক (μ)"
            value={frictionMu}
            min={0.05}
            max={0.5}
            step={0.05}
            accent="sky"
            inputMin={0}
            inputMax={1.2}
            onChange={setFrictionMu}
            footer={
              <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
                <span>ভেজা পিচ্ছিল (0.05)</span>
                <span>শুকনো অ্যাসফল্ট (0.50)</span>
              </div>
            }
          />
        </>
      }
      boardTip="রাস্তার ব্যাংকিং কোণ θ হলে প্রতিক্রিয়া বলের অনুভূমিক উপাংশ N sin θ গাড়িকে প্রয়োজনীয় কেন্দ্রমুখী বল সরবরাহ করে নিরাপদে বাঁক নিতে সাহায্য করে।"
    />
  );
}

/* ============================================================================
   Chapter 05: 3D Well & Animated Pump
   ============================================================================ */
export function WellPumpLab() {
  const [depthH, setDepthH] = useState(12);
  const [waterCol, setWaterCol] = useState(8);
  const [radius, setRadius] = useState(1.2);
  const [efficiency, setEfficiency] = useState(75);
  const [pumpTime, setPumpTime] = useState(60);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const metrics = useMemo(() => {
    const safeWater = Math.min(waterCol, depthH);
    const emptyTop = depthH - safeWater;
    const hAvg = emptyTop + safeWater / 2;
    const volume = Math.PI * radius * radius * safeWater;
    const mass = volume * 1000;
    const workJ = mass * 9.8 * hAvg;
    const pOutW = workJ / pumpTime;
    const pInW = pOutW / (efficiency / 100);
    return { hAvg, workKJ: workJ / 1000, pOutKw: pOutW / 1000, pInKw: pInW / 1000 };
  }, [depthH, waterCol, radius, efficiency, pumpTime]);

  useEffect(() => {
    let animId: number;
    let rotorAngle = 0;
    let waterWave = 0;

    const render = () => {
      if (running) {
        rotorAngle += 0.15;
        waterWave += 0.05;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const wellX = width * 0.32;
          const wellW = 140;
          const wellTopY = 60;
          const wellH = height - 90;

          // Ground Level
          ctx.strokeStyle = '#64748B';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(20, wellTopY);
          ctx.lineTo(wellX, wellTopY);
          ctx.moveTo(wellX + wellW, wellTopY);
          ctx.lineTo(width - 20, wellTopY);
          ctx.stroke();

          // 3D Transparent Well Cylinder Shaft
          const wellGrad = ctx.createLinearGradient(wellX, 0, wellX + wellW, 0);
          wellGrad.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
          wellGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.5)');
          wellGrad.addColorStop(1, 'rgba(30, 41, 59, 0.85)');
          ctx.fillStyle = wellGrad;
          ctx.fillRect(wellX, wellTopY, wellW, wellH);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.strokeRect(wellX, wellTopY, wellW, wellH);

          // Water Column inside well
          const pxPerM = wellH / depthH;
          const waterH = Math.min(waterCol, depthH) * pxPerM;
          const waterTop = wellTopY + wellH - waterH;

          const waterGrad = ctx.createLinearGradient(wellX, waterTop, wellX, wellTopY + wellH);
          waterGrad.addColorStop(0, '#0284C7');
          waterGrad.addColorStop(1, '#0C4A6E');
          ctx.fillStyle = waterGrad;
          ctx.fillRect(wellX + 2, waterTop, wellW - 4, waterH);

          // Animated Water Surface Ripples
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(wellX + 2, waterTop);
          for (let x = wellX + 2; x <= wellX + wellW - 2; x += 10) {
            ctx.lineTo(x, waterTop + Math.sin(waterWave + (x - wellX) * 0.1) * 2.5);
          }
          ctx.stroke();

          // Pipe going down into water
          ctx.fillStyle = '#64748B';
          ctx.fillRect(wellX + wellW * 0.65, wellTopY - 10, 10, wellH - 15);

          // Pump House / Motor at top
          const pumpX = wellX + wellW * 0.58;
          const pumpY = wellTopY - 34;
          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(pumpX - 10, pumpY, 44, 28, 4);
          ctx.fill();
          ctx.stroke();

          // Spinning Impeller rotor
          ctx.save();
          ctx.translate(pumpX + 12, pumpY + 14);
          ctx.rotate(rotorAngle);
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(8, 0);
          ctx.moveTo(0, -8);
          ctx.lineTo(0, 8);
          ctx.stroke();
          ctx.restore();

          // Water Discharge Stream from Pump
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(pumpX + 34, pumpY + 14);
          ctx.lineTo(width - 40, pumpY + 14);
          ctx.stroke();

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [depthH, waterCol, metrics, running]);

  return (
    <LabShell
      symbolGuide="H = কুয়ার গভীরতা · h_avg = গড় সরণ · W = কৃতকাজ · P_out = কার্যকর ক্ষমতা · η = কর্মদক্ষতা"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setDepthH(12);
        setWaterCol(8);
        setRadius(1.2);
        setEfficiency(75);
        setPumpTime(60);
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="কুয়া ও পাম্প সিমুলেশন" />}
      metrics={[
        { label: 'গড় সরণ (h_avg)', value: `${metrics.hAvg.toFixed(2)} m`, accentClass: 'text-pink-300' },
        { label: 'কৃতকাজ (W)', value: `${metrics.workKJ.toFixed(1)} kJ`, accentClass: 'text-sky-300' },
        { label: 'কার্যকর ক্ষমতা', value: `${metrics.pOutKw.toFixed(2)} kW`, accentClass: 'text-green-300' },
        { label: 'প্রদত্ত ক্ষমতা (P_in)', value: `${metrics.pInKw.toFixed(2)} kW`, accentClass: 'text-purple-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="w-dep"
            label="কুয়ার গভীরতা (H)"
            value={depthH}
            min={6}
            max={24}
            step={1}
            unit="m"
            inputMin={1}
            inputMax={100}
            onChange={(val) => {
              setDepthH(val);
              if (waterCol > val) setWaterCol(val);
            }}
          />
          <LabParamControl
            id="w-wat"
            label="পানির স্তরের উচ্চতা"
            value={Math.min(waterCol, depthH)}
            min={1}
            max={depthH}
            step={0.5}
            unit="m"
            inputMin={0.5}
            inputMax={depthH}
            onChange={setWaterCol}
          />
          <LabParamControl
            id="w-rad"
            label="কুয়ার ব্যাসার্ধ (r)"
            value={radius}
            min={0.5}
            max={5}
            step={0.1}
            unit="m"
            accent="sky"
            inputMin={0.2}
            inputMax={20}
            onChange={setRadius}
          />
          <LabParamControl
            id="w-time"
            label="পানি তোলার সময় (t)"
            value={pumpTime}
            min={10}
            max={300}
            step={5}
            unit="s"
            accent="sky"
            inputMin={1}
            inputMax={7200}
            onChange={setPumpTime}
          />
          <LabParamControl
            id="w-eff"
            label="কর্মদক্ষতা (η)"
            value={efficiency}
            min={40}
            max={100}
            step={1}
            unit="%"
            inputMin={5}
            inputMax={100}
            onChange={setEfficiency}
          />
        </>
      }
      boardTip="কুয়া খালি করার কৃতকাজে গড় সরণ h_avg = (ভারকেন্দ্রের আদি সরণ + শেষ সরণ) / ২।"
    />
  );
}
