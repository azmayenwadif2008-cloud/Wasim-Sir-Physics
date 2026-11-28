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
   Chapter 06: 3D Satellite Orbit & Escape Velocity
   ============================================================================ */
export function GravityOrbitLab() {
  const [altitudeKm, setAltitudeKm] = useState(1200);
  const [launchSpeedKmS, setLaunchSpeedKmS] = useState(7.3);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const thetaRef = useRef(0);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  const R_EARTH = 6400;
  const GM = 3.986e5;

  const metrics = useMemo(() => {
    const r = R_EARTH + altitudeKm;
    const gPrime = 9.8 * Math.pow(R_EARTH / r, 2);
    const vOrbital = Math.sqrt(GM / r);
    const vEscape = Math.sqrt((2 * GM) / r);
    const periodMin = (2 * Math.PI * Math.sqrt(Math.pow(r, 3) / GM)) / 60;
    const isEscaping = launchSpeedKmS >= vEscape;
    return { r, gPrime, vOrbital, vEscape, periodMin, isEscaping };
  }, [altitudeKm, launchSpeedKmS]);

  useEffect(() => {
    let animId: number;
    let earthSpin = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (running) {
        earthSpin += 0.01;
        thetaRef.current = (thetaRef.current + dt * (launchSpeedKmS / 6)) % (Math.PI * 2);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const cx = width / 2;
          const cy = height / 2;
          const earthR = Math.min(width, height) * 0.18;
          const maxVisR = Math.min(width, height) * 0.44;

          // Starfield Background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          for (let i = 0; i < 28; i++) {
            const sx = ((i * 137) % (width - 10)) + 5;
            const sy = ((i * 73) % (height - 10)) + 5;
            ctx.fillRect(sx, sy, 1.2, 1.2);
          }

          // Orbit Radius Mapping
          const orbitR = earthR + 16 + (Math.min(altitudeKm, 36000) / 36000) * (maxVisR - earthR - 16);

          // 3D Projected Orbit Ellipse
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = metrics.isEscaping ? 'rgba(248, 113, 113, 0.6)' : 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, orbitR, orbitR * 0.72, -0.2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // 3D Shaded Earth Globe
          const earthGrad = ctx.createRadialGradient(cx - earthR * 0.3, cy - earthR * 0.3, 4, cx, cy, earthR);
          earthGrad.addColorStop(0, '#7DD3FC');
          earthGrad.addColorStop(0.3, '#0284C7');
          earthGrad.addColorStop(0.8, '#0C4A6E');
          earthGrad.addColorStop(1, '#082F49');
          ctx.fillStyle = earthGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, earthR, 0, Math.PI * 2);
          ctx.fill();

          // Atmospheric Glow
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Continents Texture (moving slowly)
          ctx.fillStyle = 'rgba(52, 211, 153, 0.45)';
          ctx.beginPath();
          ctx.arc(cx + Math.sin(earthSpin) * 12, cy - 8, earthR * 0.4, 0, Math.PI * 2);
          ctx.fill();

          // Satellite Coordinates on tilted orbit
          const theta = thetaRef.current;
          const satX = cx + orbitR * Math.cos(theta);
          const satY = cy + orbitR * 0.72 * Math.sin(theta);

          // Trail
          if (running) {
            trailRef.current.push({ x: satX, y: satY });
            if (trailRef.current.length > 24) trailRef.current.shift();
          }

          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < trailRef.current.length; i++) {
            const p = trailRef.current[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();

          // 3D Satellite with Solar Panels
          ctx.save();
          ctx.translate(satX, satY);
          ctx.rotate(theta + Math.PI / 2);

          // Solar panel left
          ctx.fillStyle = '#0284C7';
          ctx.fillRect(-16, -4, 10, 8);
          // Solar panel right
          ctx.fillRect(6, -4, 10, 8);
          // Central satellite bus
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(-5, -6, 10, 12);
          // Blinking beacon
          ctx.fillStyle = '#CBD5E1';
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Labels (pure symbols)
          ctx.fillStyle = '#CBD5E1';
          ctx.font = '11px "IBM Plex Mono", monospace';
          ctx.fillText('h', 18, 26);
          ctx.fillText('v_c  |  v_e', 18, height - 16);
          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [altitudeKm, launchSpeedKmS, metrics, running]);

  return (
    <LabShell
      symbolGuide="h = উচ্চতা · v = নিক্ষেপণ বেগ · v_c = কক্ষীয় বেগ · v_e = মুক্তিবেগ · g′ = অভিকর্ষজ ত্বরণ"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setAltitudeKm(1200);
        setLaunchSpeedKmS(7.3);
        thetaRef.current = 0;
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="3D উপগ্রহ কক্ষপথ সিমুলেশন" />}
      metrics={[
        { label: 'অভিকর্ষজ ত্বরণ (g′)', value: `${metrics.gPrime.toFixed(2)} m/s²`, accentClass: 'text-sky-300' },
        { label: 'কক্ষীয় বেগ (v_c)', value: `${metrics.vOrbital.toFixed(2)} km/s`, accentClass: 'text-pink-300' },
        { label: 'মুক্তিবেগ (v_e)', value: `${metrics.vEscape.toFixed(2)} km/s`, accentClass: 'text-green-300' },
        { label: 'আবর্তনকাল (T)', value: `${(metrics.periodMin / 60).toFixed(2)} hr`, accentClass: 'text-purple-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="g-h"
            label="উচ্চতা (h)"
            value={altitudeKm}
            min={200}
            max={36000}
            step={200}
            unit="km"
            inputMin={50}
            inputMax={100000}
            onChange={setAltitudeKm}
          />
          <LabParamControl
            id="g-v"
            label="নিক্ষেপণ বেগ (v)"
            value={launchSpeedKmS}
            min={3.0}
            max={12.5}
            step={0.1}
            unit="km/s"
            inputMin={0.5}
            inputMax={30}
            onChange={setLaunchSpeedKmS}
          />
        </>
      }
      boardTip="মুক্তিবেগ v_e = √2 × v_c; ভূ-স্থির উপগ্রহের পর্যায়কাল ২৪ ঘণ্টা।"
    />
  );
}

/* ============================================================================
   Chapter 07 Sub-Lab A: 3D Wire Elongation & Young's Modulus
   ============================================================================ */
export function YoungModulusLab() {
  const [massKg, setMassKg] = useState(12);
  const [lengthM, setLengthM] = useState(2.5);
  const [diameterMm, setDiameterMm] = useState(1.0);
  const [material, setMaterial] = useState<'steel' | 'copper' | 'aluminum'>('steel');

  const materials = {
    steel: { label: 'ইস্পাত (Steel)', y: 20e10, limitMPa: 250, color: '#38BDF8' },
    copper: { label: 'তামা (Copper)', y: 12e10, limitMPa: 140, color: '#F472B6' },
    aluminum: { label: 'অ্যালুমিনিয়াম', y: 7e10, limitMPa: 110, color: '#C084FC' },
  } as const;

  const metrics = useMemo(() => {
    const mat = materials[material];
    const radiusM = (diameterMm / 2) * 1e-3;
    const area = Math.PI * radiusM * radiusM;
    const force = massKg * 9.8;
    const stressMPa = force / area / 1e6;
    const strain = (force / area) / mat.y;
    const deltaLMm = strain * lengthM * 1000;
    return { stressMPa, strain, deltaLMm, mat };
  }, [massKg, lengthM, diameterMm, material]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = prepareCanvas(canvas);
    if (!frame) return;
    const { ctx, width, height } = frame;

    const rigX = width * 0.32;
    const topY = 40;
    const wireBaseH = 120 + (lengthM / 4) * 80;
    const visualStretch = Math.min(45, metrics.deltaLMm * 18);

    // Ceiling Mount
    ctx.fillStyle = '#475569';
    ctx.fillRect(rigX - 50, topY - 14, 100, 14);

    // Stretched Metal Wire with 3D Specular Highlight
    ctx.strokeStyle = metrics.mat.color;
    ctx.lineWidth = Math.max(2, diameterMm * 2.5);
    ctx.beginPath();
    ctx.moveTo(rigX, topY);
    ctx.lineTo(rigX, topY + wireBaseH + visualStretch);
    ctx.stroke();

    // 3D Hanging Cast-Iron Slotted Weights
    const weightY = topY + wireBaseH + visualStretch;
    const weightCount = Math.min(6, Math.ceil(massKg / 4));
    for (let w = 0; w < weightCount; w++) {
      const wy = weightY + w * 12;
      const grad = ctx.createLinearGradient(rigX - 25, 0, rigX + 25, 0);
      grad.addColorStop(0, '#1E293B');
      grad.addColorStop(0.5, '#475569');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fillRect(rigX - 26, wy, 52, 10);
      ctx.strokeStyle = '#C084FC';
      ctx.lineWidth = 1;
      ctx.strokeRect(rigX - 26, wy, 52, 10);
    }

    // Microscopic Zoom Loupe on Right
    const loupeX = width * 0.72;
    const loupeY = height * 0.48;
    const loupeR = 55;

    ctx.fillStyle = 'rgba(10, 13, 22, 0.92)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(loupeX, loupeY, loupeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Magnified Vernier divisions inside Loupe
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    for (let d = -4; d <= 4; d++) {
      const dy = loupeY + d * 10;
      ctx.beginPath();
      ctx.moveTo(loupeX - 30, dy);
      ctx.lineTo(loupeX - (d === 0 ? 8 : 16), dy);
      ctx.stroke();
    }
    // Pointer indicating extension
    ctx.strokeStyle = '#EC4899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(loupeX + 30, loupeY + (metrics.deltaLMm % 1) * 20);
    ctx.lineTo(loupeX + 5, loupeY + (metrics.deltaLMm % 1) * 20);
    ctx.stroke();

    ctx.fillStyle = '#F472B6';
    ctx.font = 'bold 11px "IBM Plex Mono", monospace';
    ctx.fillText('ΔL', loupeX - 8, loupeY + loupeR + 20);

    ctx.restore();
  }, [massKg, lengthM, diameterMm, metrics]);

  return (
    <LabShell
      symbolGuide="L = আদি দৈর্ঘ্য · ΔL = দৈর্ঘ্য বৃদ্ধি · d = তারের ব্যাস · m = ঝুলানো ভর"
      onReset={() => {
        setMassKg(12);
        setLengthM(2.5);
        setDiameterMm(1.0);
        setMaterial('steel');
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="ইয়ং গুণাঙ্ক সিমুলেশন" />}
      metrics={[
        { label: 'পীড়ন (Stress)', value: `${metrics.stressMPa.toFixed(1)} MPa`, accentClass: 'text-sky-300' },
        { label: 'বিকৃতি (Strain)', value: metrics.strain.toExponential(2), accentClass: 'text-purple-300' },
        { label: 'দৈর্ঘ্য বৃদ্ধি (ΔL)', value: `${metrics.deltaLMm.toFixed(2)} mm`, accentClass: 'text-pink-300' },
        { label: 'উপাদান', value: materials[material].label, accentClass: 'text-green-300' },
      ]}
      controls={
        <>
          <div>
            <span className="block text-sm font-medium text-slate-200 mb-2">উপাদান</span>
            <div className="grid grid-cols-3 gap-2">
              {(['steel', 'copper', 'aluminum'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMaterial(key)}
                  className={`px-2 py-2 text-xs rounded-lg border cursor-pointer ${
                    material === key ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-semibold' : 'bg-[#0C0E13] border-[#2E3442] text-slate-300'
                  }`}
                >
                  {materials[key].label}
                </button>
              ))}
            </div>
          </div>
          <LabParamControl
            id="ym-m"
            label="ঝুলানো ভর (m)"
            value={massKg}
            min={2}
            max={30}
            step={1}
            unit="kg"
            inputMin={0.5}
            inputMax={200}
            onChange={setMassKg}
          />
          <LabParamControl
            id="ym-l"
            label="তারের আদি দৈর্ঘ্য (L)"
            value={lengthM}
            min={0.5}
            max={5.0}
            step={0.1}
            unit="m"
            accent="sky"
            inputMin={0.2}
            inputMax={20}
            onChange={setLengthM}
          />
          <LabParamControl
            id="ym-d"
            label="তারের ব্যাস (d)"
            value={diameterMm}
            min={0.4}
            max={3.0}
            step={0.1}
            unit="mm"
            accent="sky"
            inputMin={0.1}
            inputMax={10}
            onChange={setDiameterMm}
          />
        </>
      }
      boardTip="ইস্পাতের ইয়ং গুণাঙ্ক বেশি হওয়ায় এতে প্রসারণ কম হয়।"
    />
  );
}

/* ============================================================================
   Chapter 07 Sub-Lab B: 3D Capillary Rise & Surface Tension
   ============================================================================ */
export function CapillaryRiseLab() {
  const [radiusMm, setRadiusMm] = useState(0.4);
  const [surfaceTension, setSurfaceTension] = useState(0.073); // N/m (Water)
  const [contactAngleDeg, setContactAngleDeg] = useState(0);

  const g = 9.8;
  const rho = 1000;
  const rM = radiusMm * 1e-3;
  const thetaRad = (contactAngleDeg * Math.PI) / 180;
  const hM = (2 * surfaceTension * Math.cos(thetaRad)) / (rM * rho * g);
  const hMm = hM * 1000;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let wave = 0;

    const render = () => {
      wave += 0.05;
      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const beakerX = width * 0.28;
          const beakerY = height * 0.42;
          const beakerW = width * 0.44;
          const beakerH = height * 0.48;

          // 3D Glass Beaker
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(beakerX, beakerY);
          ctx.lineTo(beakerX, beakerY + beakerH);
          ctx.lineTo(beakerX + beakerW, beakerY + beakerH);
          ctx.lineTo(beakerX + beakerW, beakerY);
          ctx.stroke();

          // Beaker Water Level
          const waterBaseY = beakerY + 40;
          const waterGrad = ctx.createLinearGradient(0, waterBaseY, 0, beakerY + beakerH);
          waterGrad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
          waterGrad.addColorStop(1, 'rgba(2, 132, 199, 0.7)');
          ctx.fillStyle = waterGrad;
          ctx.fillRect(beakerX + 2, waterBaseY, beakerW - 4, beakerH - 42);

          // Glass Capillary Tube (Submerged vertically)
          const tubeX = beakerX + beakerW / 2;
          const tubeW = Math.max(8, radiusMm * 24);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.strokeRect(tubeX - tubeW / 2, 30, tubeW, beakerH + 30);

          // Water Column inside Capillary Tube
          const risePx = Math.min(beakerY + 30, (hMm / 60) * 120);
          const colTopY = waterBaseY - risePx;

          const colGrad = ctx.createLinearGradient(0, colTopY, 0, waterBaseY);
          colGrad.addColorStop(0, '#38BDF8');
          colGrad.addColorStop(1, '#0284C7');
          ctx.fillStyle = colGrad;
          ctx.fillRect(tubeX - tubeW / 2 + 1, colTopY, tubeW - 2, waterBaseY - colTopY);

          // Concave Meniscus at Top
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(tubeX, colTopY, tubeW / 2, 0, Math.PI);
          ctx.stroke();

          // Surface Tension Vectors T pulling up at angle theta
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tubeX - tubeW / 2, colTopY);
          ctx.lineTo(tubeX - tubeW / 2 - 14 * Math.sin(thetaRad), colTopY - 14 * Math.cos(thetaRad));
          ctx.moveTo(tubeX + tubeW / 2, colTopY);
          ctx.lineTo(tubeX + tubeW / 2 + 14 * Math.sin(thetaRad), colTopY - 14 * Math.cos(thetaRad));
          ctx.stroke();

          // Height annotation bracket
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(tubeX + tubeW / 2 + 14, waterBaseY);
          ctx.lineTo(tubeX + tubeW / 2 + 24, waterBaseY);
          ctx.moveTo(tubeX + tubeW / 2 + 14, colTopY);
          ctx.lineTo(tubeX + tubeW / 2 + 24, colTopY);
          ctx.moveTo(tubeX + tubeW / 2 + 19, waterBaseY);
          ctx.lineTo(tubeX + tubeW / 2 + 19, colTopY);
          ctx.stroke();

          ctx.fillStyle = '#F472B6';
          ctx.font = 'bold 11px "IBM Plex Mono", monospace';
          ctx.fillText('h', tubeX + tubeW / 2 + 28, (waterBaseY + colTopY) / 2 + 4);

          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [radiusMm, surfaceTension, contactAngleDeg, hMm, thetaRad]);

  return (
    <LabShell
      symbolGuide="h = তরলের উত্থান উচ্চতা · r = নলের ব্যাসার্ধ · T = পৃষ্ঠটান · θ = স্পর্শ কোণ"
      onReset={() => {
        setRadiusMm(0.4);
        setSurfaceTension(0.073);
        setContactAngleDeg(0);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="কৈশিক নল উত্থান সিমুলেশন" />}
      metrics={[
        { label: 'উচ্চতা (h)', value: `${hMm.toFixed(1)} mm`, accentClass: 'text-pink-300' },
        { label: 'নলের ব্যাসার্ধ (r)', value: `${radiusMm} mm`, accentClass: 'text-sky-300' },
        { label: 'পৃষ্ঠটান (T)', value: `${surfaceTension} N/m`, accentClass: 'text-green-300' },
        { label: 'স্পর্শ কোণ (θ)', value: `${contactAngleDeg}°`, accentClass: 'text-purple-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="cp-r"
            label="নলের ব্যাসার্ধ (r)"
            value={radiusMm}
            min={0.2}
            max={1.5}
            step={0.05}
            unit="mm"
            inputMin={0.05}
            inputMax={5}
            onChange={setRadiusMm}
          />
          <LabParamControl
            id="cp-t"
            label="পৃষ্ঠটান (T)"
            value={surfaceTension}
            min={0.02}
            max={0.12}
            step={0.005}
            unit="N/m"
            inputMin={0.005}
            inputMax={1.0}
            onChange={setSurfaceTension}
          />
          <LabParamControl
            id="cp-th"
            label="স্পর্শ কোণ (θ)"
            value={contactAngleDeg}
            min={0}
            max={60}
            step={1}
            unit="°"
            accent="sky"
            inputMin={0}
            inputMax={89}
            onChange={setContactAngleDeg}
          />
        </>
      }
      boardTip="কৈশিক নলে তরল উত্থানের উচ্চতা নলের ব্যাসার্ধের ব্যস্তানুপাতিক (h ∝ 1/r)।"
    />
  );
}

/* ============================================================================
   Chapter 08: 3D Simple Pendulum & Kinetic/Potential Energy
   ============================================================================ */
export function PendulumShmLab() {
  const [lengthM, setLengthM] = useState(1.5);
  const [ampDeg, setAmpDeg] = useState(20);
  const [gravity, setGravity] = useState(9.8);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const metrics = useMemo(() => {
    const omega = Math.sqrt(gravity / lengthM);
    const period = (2 * Math.PI) / omega;
    const freq = 1 / period;
    return { omega, period, freq };
  }, [lengthM, gravity]);

  useEffect(() => {
    let animId: number;
    let time = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (running) {
        time += dt;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const pivotX = width * 0.38;
          const pivotY = 36;
          const pxLen = 90 + (lengthM / 3.0) * 140;

          const currentAngleRad = ((ampDeg * Math.PI) / 180) * Math.cos(metrics.omega * time);
          const bobX = pivotX + pxLen * Math.sin(currentAngleRad);
          const bobY = pivotY + pxLen * Math.cos(currentAngleRad);

          // Energy fractions
          const ekFraction = Math.pow(Math.sin(metrics.omega * time), 2);
          const epFraction = 1 - ekFraction;

          // Ceiling Support
          ctx.fillStyle = '#475569';
          ctx.fillRect(pivotX - 60, pivotY - 12, 120, 12);

          // Taut String
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pivotX, pivotY);
          ctx.lineTo(bobX, bobY);
          ctx.stroke();

          // 3D Shaded Studio Sphere Bob
          const bobGrad = ctx.createRadialGradient(bobX - 4, bobY - 4, 3, bobX, bobY, 14);
          bobGrad.addColorStop(0, '#FDF2F8');
          bobGrad.addColorStop(0.3, '#F472B6');
          bobGrad.addColorStop(0.7, '#A855F7');
          bobGrad.addColorStop(1, '#581C87');
          ctx.fillStyle = bobGrad;
          ctx.beginPath();
          ctx.arc(bobX, bobY, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Dynamic Energy Bars on Right
          const barBaseY = height - 45;
          const maxH = height * 0.52;
          const bx = width * 0.72;

          ctx.fillStyle = '#1E293B';
          ctx.fillRect(bx, barBaseY - maxH, 26, maxH);
          ctx.fillRect(bx + 40, barBaseY - maxH, 26, maxH);

          // Kinetic Energy Ek (Light Green)
          ctx.fillStyle = '#4ADE80';
          ctx.fillRect(bx, barBaseY - maxH * ekFraction, 26, maxH * ekFraction);

          // Potential Energy Ep (Sky Blue)
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(bx + 40, barBaseY - maxH * epFraction, 26, maxH * epFraction);

          ctx.fillStyle = '#CBD5E1';
          ctx.font = 'bold 11px "IBM Plex Mono", monospace';
          ctx.fillText('Ek', bx + 6, barBaseY + 16);
          ctx.fillText('Ep', bx + 46, barBaseY + 16);
          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [lengthM, ampDeg, gravity, metrics, running]);

  return (
    <LabShell
      symbolGuide="L = কার্যকর দৈর্ঘ্য · T = দোলনকাল · θ₀ = কৌণিক বিস্তার · Ek = গতিশক্তি · Ep = বিভব শক্তি"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setLengthM(1.5);
        setAmpDeg(20);
        setGravity(9.8);
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="3D সরল দোলক সিমুলেশন" />}
      metrics={[
        { label: 'দোলনকাল (T)', value: `${metrics.period.toFixed(2)} s`, accentClass: 'text-pink-300' },
        { label: 'কম্পাঙ্ক (f)', value: `${metrics.freq.toFixed(2)} Hz`, accentClass: 'text-sky-300' },
        { label: 'কার্যকর দৈর্ঘ্য (L)', value: `${lengthM} m`, accentClass: 'text-green-300' },
        { label: 'ত্বরণ (g)', value: `${gravity} m/s²`, accentClass: 'text-purple-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="p-l"
            label="কার্যকর দৈর্ঘ্য (L)"
            value={lengthM}
            min={0.4}
            max={3.0}
            step={0.1}
            unit="m"
            inputMin={0.1}
            inputMax={20}
            onChange={setLengthM}
          />
          <LabParamControl
            id="p-th"
            label="কৌণিক বিস্তার (θ₀)"
            value={ampDeg}
            min={5}
            max={30}
            step={1}
            unit="°"
            inputMin={1}
            inputMax={60}
            onChange={setAmpDeg}
          />
          <LabParamControl
            id="p-grav"
            label="অভিকর্ষজ ত্বরণ (g)"
            value={gravity}
            min={1.6}
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
      boardTip="সাম্যাবস্থানে গতিশক্তি Ek সর্বোচ্চ এবং বিভব শক্তি Ep শূন্য হয়; প্রান্তীয় অবস্থানে বিভব শক্তি সর্বোচ্চ হয়।"
    />
  );
}

/* ============================================================================
   Chapter 09 Sub-Lab A: Wave Beats & Superposition Animation
   ============================================================================ */
export function WaveBeatsLab() {
  const [f1, setF1] = useState(12);
  const [f2, setF2] = useState(14);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beatFreq = Math.abs(f1 - f2);

  useEffect(() => {
    let animId: number;
    let phase = 0;

    const render = () => {
      if (running) phase += 0.04;

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const padX = 30;
          const plotW = width - padX * 2;
          const midY = height * 0.52;
          const amp = height * 0.2;

          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padX, midY);
          ctx.lineTo(padX + plotW, midY);
          ctx.stroke();

          // Combined Beat Wave
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          for (let i = 0; i <= 260; i++) {
            const u = i / 260;
            const x = padX + u * plotW;
            const y = Math.sin(2 * Math.PI * (f1 * u - phase)) + Math.sin(2 * Math.PI * (f2 * u - phase));
            const py = midY - (y / 2) * amp * 1.35;
            if (i === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
          }
          ctx.stroke();

          // Envelope Modulation Curves
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 1.5;
          for (const sign of [1, -1]) {
            ctx.beginPath();
            for (let i = 0; i <= 140; i++) {
              const u = i / 140;
              const x = padX + u * plotW;
              const env = Math.abs(Math.cos(Math.PI * (f1 - f2) * u)) * amp * 1.35;
              const py = midY - sign * env;
              if (i === 0) ctx.moveTo(x, py);
              else ctx.lineTo(x, py);
            }
            ctx.stroke();
          }
          ctx.setLineDash([]);

          ctx.fillStyle = '#CBD5E1';
          ctx.font = '11px "IBM Plex Mono", monospace';
          ctx.fillText('N (বিট)', 18, 28);
          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [f1, f2, beatFreq, running]);

  return (
    <LabShell
      symbolGuide="f₁ = ১ম কম্পাঙ্ক · f₂ = ২য় কম্পাঙ্ক · N = প্রতি সেকেন্ডে বিট সংখ্যা"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setF1(12);
        setF2(14);
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="শব্দের বিট সিমুলেশন" />}
      metrics={[
        { label: 'কম্পাঙ্ক ১ (f₁)', value: `${f1} Hz`, accentClass: 'text-sky-300' },
        { label: 'কম্পাঙ্ক ২ (f₂)', value: `${f2} Hz`, accentClass: 'text-purple-300' },
        { label: 'বিট সংখ্যা (N)', value: `${beatFreq} /sec`, accentClass: 'text-pink-300' },
        { label: 'শ্রবণযোগ্যতা', value: beatFreq <= 10 ? 'সহজে শোনা যাবে' : 'অস্পষ্ট (>10)', accentClass: 'text-green-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="wb-f1"
            label="প্রথম সুরশলাকার কম্পাঙ্ক (f₁)"
            value={f1}
            min={6}
            max={24}
            step={1}
            unit="Hz"
            inputMin={1}
            inputMax={500}
            onChange={setF1}
          />
          <LabParamControl
            id="wb-f2"
            label="দ্বিতীয় সুরশলাকার কম্পাঙ্ক (f₂)"
            value={f2}
            min={6}
            max={24}
            step={1}
            unit="Hz"
            inputMin={1}
            inputMax={500}
            onChange={setF2}
          />
        </>
      }
      boardTip="প্রতি সেকেন্ডে বিটের সংখ্যা দুটি শব্দের কম্পাঙ্কের পার্থক্যের সমান।"
    />
  );
}

/* ============================================================================
   Chapter 09 Sub-Lab B: 3D Doppler Effect Wavefront Animation
   ============================================================================ */
export function DopplerEffectLab() {
  const [sourceSpeed, setSourceSpeed] = useState(40); // m/s
  const [originalFreq, setOriginalFreq] = useState(440); // Hz
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const soundSpeed = 340; // m/s

  const fApproaching = (soundSpeed / (soundSpeed - sourceSpeed)) * originalFreq;
  const fReceding = (soundSpeed / (soundSpeed + sourceSpeed)) * originalFreq;

  const wavesRef = useRef<{ x: number; y: number; r: number }[]>([]);

  useEffect(() => {
    let animId: number;
    let sourceX = 100;
    let waveTimer = 0;

    let flashPhase = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const midY = height * 0.52;

          if (running) {
            sourceX += sourceSpeed * 0.05;
            if (sourceX > width - 40) sourceX = 40;
            flashPhase += 0.2;

            waveTimer++;
            if (waveTimer % 14 === 0) {
              wavesRef.current.push({ x: sourceX, y: midY, r: 2 });
            }
          }

          // 3D Perspective Roadway
          const roadH = 64;
          const roadGrad = ctx.createLinearGradient(0, midY - roadH / 2, 0, midY + roadH / 2);
          roadGrad.addColorStop(0, '#0F172A');
          roadGrad.addColorStop(0.5, '#1E293B');
          roadGrad.addColorStop(1, '#0F172A');
          ctx.fillStyle = roadGrad;
          ctx.fillRect(0, midY - roadH / 2, width, roadH);

          // Road Curbs
          ctx.fillStyle = '#475569';
          ctx.fillRect(0, midY - roadH / 2 - 2, width, 2);
          ctx.fillRect(0, midY + roadH / 2, width, 2);

          // Moving Dashed Center Line
          ctx.strokeStyle = 'rgba(248, 250, 252, 0.4)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([16, 20]);
          ctx.beginPath();
          ctx.moveTo(0, midY);
          ctx.lineTo(width, midY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Expand sound wavefronts with frequency compression visual
          for (let i = wavesRef.current.length - 1; i >= 0; i--) {
            const w = wavesRef.current[i];
            if (running) w.r += soundSpeed * 0.016;
            if (w.r > 270) {
              wavesRef.current.splice(i, 1);
            } else {
              // Soundwave rings: brighter and blue in direction of travel, warmer behind
              const alpha = Math.max(0, 1 - w.r / 270);
              ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.75})`;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
              ctx.stroke();
            }
          }

          // Dual Flashing Strobe Light Beams (Red & Blue alternating)
          const isRedFlash = Math.sin(flashPhase) > 0;
          const strobeColor = isRedFlash ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)';
          const strobeGlow = ctx.createRadialGradient(sourceX, midY - 14, 2, sourceX, midY - 14, 45);
          strobeGlow.addColorStop(0, strobeColor);
          strobeGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = strobeGlow;
          ctx.beginPath();
          ctx.arc(sourceX, midY - 14, 45, 0, Math.PI * 2);
          ctx.fill();

          // 3D Emergency Vehicle Body
          ctx.save();
          ctx.translate(sourceX, midY);

          // Vehicle Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.beginPath();
          ctx.ellipse(0, 12, 28, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Headlight Beam forward
          const hBeam = ctx.createRadialGradient(24, 0, 4, 75, 0, 40);
          hBeam.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
          hBeam.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = hBeam;
          ctx.beginPath();
          ctx.moveTo(20, -5);
          ctx.lineTo(75, -20);
          ctx.lineTo(75, 20);
          ctx.lineTo(20, 5);
          ctx.closePath();
          ctx.fill();

          // Wheels
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-18, -14, 8, 4);
          ctx.fillRect(10, -14, 8, 4);
          ctx.fillRect(-18, 10, 8, 4);
          ctx.fillRect(10, 10, 8, 4);

          // Vehicle Chassis (Emergency Cruiser White/Blue)
          const cruiserGrad = ctx.createLinearGradient(-22, 0, 22, 0);
          cruiserGrad.addColorStop(0, '#1E293B');
          cruiserGrad.addColorStop(0.3, '#F8FAFC');
          cruiserGrad.addColorStop(0.7, '#E2E8F0');
          cruiserGrad.addColorStop(1, '#0284C7');
          ctx.fillStyle = cruiserGrad;
          ctx.beginPath();
          ctx.roundRect(-22, -11, 44, 22, 5);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Windshield
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(4, -8, 8, 16);

          // Rooftop Dual Emergency Light Bar (Silver & Sky Blue)
          ctx.fillStyle = isRedFlash ? '#CBD5E1' : '#1E293B';
          ctx.fillRect(-4, -5, 4, 10);
          ctx.fillStyle = !isRedFlash ? '#38BDF8' : '#1E293B';
          ctx.fillRect(0, -5, 4, 10);

          ctx.restore();

          // Stationary Listeners (Ahead & Behind)
          // Listener 1 (Behind - Hearing low pitch)
          ctx.fillStyle = '#CBD5E1';
          ctx.beginPath();
          ctx.arc(36, midY, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Listener 2 (Ahead - Hearing high pitch)
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(width - 36, midY, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#6EE7B7';
          ctx.stroke();

          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 11px "IBM Plex Mono", monospace';
          ctx.fillText('শ্রোতা ১ (পিছনে)', 14, midY - 22);
          ctx.fillStyle = '#CBD5E1';
          ctx.fillText('f′ (কম কম্পাঙ্ক)', 14, midY + 28);

          ctx.fillStyle = '#F8FAFC';
          ctx.fillText('শ্রোতা ২ (সামনে)', width - 135, midY - 22);
          ctx.fillStyle = '#34D399';
          ctx.fillText('f′ (উচ্চ কম্পাঙ্ক)', width - 135, midY + 28);

          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [sourceSpeed, originalFreq, fApproaching, fReceding, soundSpeed, running]);

  return (
    <LabShell
      symbolGuide="f = মূল কম্পাঙ্ক · f′ = শ্রুত আপাত কম্পাঙ্ক · v_s = উৎসের দ্রুতি · v = শব্দের বেগ"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setSourceSpeed(40);
        setOriginalFreq(440);
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="ডপলার ক্রিয়া সিমুলেশন" />}
      metrics={[
        { label: 'মূল কম্পাঙ্ক (f)', value: `${originalFreq} Hz`, accentClass: 'text-sky-300' },
        { label: 'সামনে আসন্ন কম্পাঙ্ক', value: `${fApproaching.toFixed(1)} Hz`, accentClass: 'text-green-300' },
        { label: 'পেছনে অপসৃত কম্পাঙ্ক', value: `${fReceding.toFixed(1)} Hz`, accentClass: 'text-pink-300' },
        { label: 'উৎসের দ্রুতি (v_s)', value: `${sourceSpeed} m/s`, accentClass: 'text-purple-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="dp-v"
            label="শব্দ উৎসের দ্রুতি (v_s)"
            extraNote={`(${(sourceSpeed * 3.6).toFixed(0)} km/h)`}
            value={sourceSpeed}
            min={0}
            max={140}
            step={5}
            unit="m/s"
            inputMin={0}
            inputMax={300}
            onChange={setSourceSpeed}
          />
          <LabParamControl
            id="dp-f"
            label="মূল কম্পাঙ্ক (f)"
            value={originalFreq}
            min={200}
            max={800}
            step={20}
            unit="Hz"
            inputMin={20}
            inputMax={5000}
            onChange={setOriginalFreq}
          />
        </>
      }
      boardTip="শব্দ উৎস শ্রোতার দিকে এগিয়ে আসলে তরঙ্গদৈর্ঘ্য সংকুচিত হয়ে আপাত কম্পাঙ্ক বৃদ্ধি পায়।"
    />
  );
}

/* ============================================================================
   Chapter 10: 3D Ideal Gas & Molecular Kinetic Theory
   ============================================================================ */
export function IdealGasLab() {
  const [tempK, setTempK] = useState(300);
  const [volumeL, setVolumeL] = useState(25);
  const [moles, setMoles] = useState(1.0);
  const [running, setRunning] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const particlesRef = useRef(
    Array.from({ length: 32 }, (_, i) => ({
      x: 0.2 + ((i * 31) % 60) / 100,
      y: 0.2 + ((i * 47) % 60) / 100,
      vx: Math.cos(i * 1.3),
      vy: Math.sin(i * 1.9),
    })),
  );

  const R = 8.314;
  const pressureKPa = (moles * R * tempK) / volumeL;
  const cRms = Math.sqrt((3 * R * tempK) / 0.032);

  useEffect(() => {
    let animId: number;
    let flamePhase = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (running) {
        flamePhase += 0.2;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const frame = prepareCanvas(canvas);
        if (frame) {
          const { ctx, width, height } = frame;
          const chamberW = Math.min(260, width * 0.52);
          const chamberX = (width - chamberW) / 2;
          const chamberBottom = height - 50;
          const maxH = height - 90;
          const chamberH = (volumeL / 50) * maxH;
          const pistonY = chamberBottom - chamberH;

          // 3D Glass Cylinder Walls
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(chamberX, 35);
          ctx.lineTo(chamberX, chamberBottom);
          ctx.lineTo(chamberX + chamberW, chamberBottom);
          ctx.lineTo(chamberX + chamberW, 35);
          ctx.stroke();

          // Piston Head
          ctx.fillStyle = '#334155';
          ctx.fillRect(chamberX + 2, pistonY - 14, chamberW - 4, 14);
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 2;
          ctx.strokeRect(chamberX + 2, pistonY - 14, chamberW - 4, 14);

          // Animated Gas Molecules
          const speedFactor = (cRms / 480) * 0.8;
          for (let i = 0; i < particlesRef.current.length; i++) {
            const p = particlesRef.current[i];
            if (running) {
              p.x += p.vx * speedFactor * dt;
              p.y += p.vy * speedFactor * dt;
              if (p.x < 0.04 || p.x > 0.96) p.vx *= -1;
              if (p.y < 0.04 || p.y > 0.96) p.vy *= -1;
            }

            const px = chamberX + 6 + p.x * (chamberW - 12);
            const py = pistonY + 4 + p.y * Math.max(16, chamberH - 8);

            ctx.fillStyle = tempK > 400 ? '#CBD5E1' : '#38BDF8';
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          // Animated Burner Flame underneath cylinder
          if (tempK > 250) {
            ctx.fillStyle = '#F472B6';
            for (let f = 0; f < 6; f++) {
              const fx = chamberX + 30 + f * 38;
              const flameH = 10 + Math.sin(flamePhase + f) * 6;
              ctx.beginPath();
              ctx.moveTo(fx - 8, chamberBottom + 16);
              ctx.lineTo(fx + 8, chamberBottom + 16);
              ctx.lineTo(fx, chamberBottom + 16 - flameH);
              ctx.closePath();
              ctx.fill();
            }
          }

          ctx.restore();
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [tempK, volumeL, moles, cRms, pressureKPa, running]);

  return (
    <LabShell
      symbolGuide="P = চাপ · V = আয়তন · T = পরম তাপমাত্রা · n = মোল সংখ্যা · c_rms = মূল গড় বর্গবেগ"
      running={running}
      onToggleRun={() => setRunning((r) => !r)}
      onReset={() => {
        setTempK(300);
        setVolumeL(25);
        setMoles(1.0);
        setRunning(true);
      }}
      canvas={<canvas ref={canvasRef} className="w-full h-full block" aria-label="আদর্শ গ্যাস ও গতিতত্ত্ব 3D সিমুলেশন" />}
      metrics={[
        { label: 'গ্যাসের চাপ (P)', value: `${pressureKPa.toFixed(1)} kPa`, accentClass: 'text-sky-300' },
        { label: 'মূল গড় বর্গবেগ (c_rms)', value: `${cRms.toFixed(0)} m/s`, accentClass: 'text-pink-300' },
        { label: 'পরম তাপমাত্রা (T)', value: `${tempK} K`, accentClass: 'text-[#CBD5E1]' },
        { label: 'আয়তন (V)', value: `${volumeL} L`, accentClass: 'text-green-300' },
      ]}
      controls={
        <>
          <LabParamControl
            id="ig-t"
            label="পরম তাপমাত্রা (T)"
            extraNote={`(${(tempK - 273).toFixed(0)}°C)`}
            value={tempK}
            min={150}
            max={600}
            step={10}
            unit="K"
            inputMin={10}
            inputMax={3000}
            onChange={setTempK}
          />
          <LabParamControl
            id="ig-v"
            label="সিলিন্ডারের আয়তন (V)"
            value={volumeL}
            min={10}
            max={50}
            step={1}
            unit="L"
            inputMin={1}
            inputMax={500}
            onChange={setVolumeL}
          />
          <LabParamControl
            id="ig-n"
            label="মোল সংখ্যা (n)"
            value={moles}
            min={0.5}
            max={4.0}
            step={0.1}
            unit="mol"
            accent="sky"
            inputMin={0.1}
            inputMax={20}
            onChange={setMoles}
          />
        </>
      }
      boardTip="তাপমাত্রা বাড়লে গ্যাস অণুগুলোর মূল গড় বর্গবেগ c_rms = √(3RT/M) বৃদ্ধি পায়।"
    />
  );
}
