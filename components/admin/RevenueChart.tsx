"use client";

import { useRef, useState } from "react";
import { fmtPrice, faNum } from "@/lib/format";

/* برچسب محور: مقدار تومان را به «هزار» با رقم فارسی نشان می‌دهد */
function axisLabel(v: number) {
  if (v <= 0) return faNum.format(0);
  return `${faNum.format(Math.round(v / 1000))} هزار`;
}

export function RevenueChart({ data, height = 220 }: { data: number[]; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  const W = 640;
  const H = height;
  const padL = 6;
  const padR = 6;
  const padT = 18;
  const padB = 20;
  const max = Math.max(...data) * 1.12;

  const x = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  let linePath = `M ${x(0)} ${y(data[0])}`;
  data.forEach((v, i) => {
    if (i) linePath += ` L ${x(i)} ${y(v)}`;
  });
  const areaPath = `${linePath} L ${x(data.length - 1)} ${H - padB} L ${x(0)} ${H - padB} Z`;
  const last = data.length - 1;
  const gridLines = [0, 1, 2].map((g) => ({ value: (max * g) / 2, pct: (y((max * g) / 2) / H) * 100 }));

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const relX = ((e.clientX - box.left) / box.width) * W;
    let i = Math.round((relX - padL) / ((W - padL - padR) / (data.length - 1)));
    i = Math.max(0, Math.min(data.length - 1, i));
    setHover({ i, x: (x(i) / W) * box.width, y: (y(data[i]) / H) * box.height });
  }

  return (
    <div className="adm-chart-wrap" style={{ height: H }}>
      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <linearGradient id="adm-rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-orange-solid)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--brand-orange-solid)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {gridLines.map((g, i) => (
          <line key={i} x1={padL} y1={y(g.value)} x2={W - padR} y2={y(g.value)} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 4" />
        ))}
        <path d={areaPath} fill="url(#adm-rev-grad)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--brand-orange-solid)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {hover ? <line x1={x(hover.i)} y1={padT} x2={x(hover.i)} y2={H - padB} stroke="var(--ink-2)" strokeWidth={1} opacity={0.45} vectorEffect="non-scaling-stroke" /> : null}
        <circle cx={x(last)} cy={y(data[last])} r={4.5} fill="var(--brand-orange-solid)" stroke="var(--surface)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <rect x={0} y={padT} width={W} height={H - padT - padB} fill="transparent" style={{ cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>

      {/* برچسب‌ها به‌جای SVG با HTML رندر می‌شوند تا با کشیده‌شدن افقی نمودار بدشکل نشوند */}
      {gridLines.map((g, i) => (
        <span className="adm-axis-label" key={i} style={{ top: `${g.pct}%` }}>
          {axisLabel(g.value)}
        </span>
      ))}

      {hover ? (
        <div className="adm-chart-tip show" style={{ left: hover.x, top: hover.y - 38 }}>
          {data.length - 1 - hover.i === 0 ? "امروز" : `${faNum.format(data.length - 1 - hover.i)} روز پیش`} · {fmtPrice(data[hover.i])} تومان
        </div>
      ) : null}
    </div>
  );
}
