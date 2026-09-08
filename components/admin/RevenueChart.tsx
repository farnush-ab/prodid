"use client";

import { useRef, useState } from "react";
import { fmtPrice } from "@/lib/format";

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
    <div className="adm-chart-wrap">
      <svg ref={svgRef} width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="adm-rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-orange-solid)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--brand-orange-solid)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((g) => {
          const gv = (max * g) / 2;
          const gy = y(gv);
          return (
            <g key={g}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 4" />
              <text x={W - padR} y={gy - 4} textAnchor="end" fontSize="9" fill="var(--ink-2)">
                {Math.round(gv / 1000)}هزار
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#adm-rev-grad)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--brand-orange-solid)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(last)} cy={y(data[last])} r={4.5} fill="var(--brand-orange-solid)" stroke="var(--surface)" strokeWidth={2} />
        {hover ? <line x1={x(hover.i)} y1={padT} x2={x(hover.i)} y2={H - padB} stroke="var(--ink-2)" strokeWidth={1} opacity={0.5} /> : null}
        <rect x={0} y={padT} width={W} height={H - padT - padB} fill="transparent" style={{ cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hover ? (
        <div className="adm-chart-tip show" style={{ left: hover.x, top: hover.y - 38 }}>
          {(data.length - 1 - hover.i === 0 ? "امروز" : `${data.length - 1 - hover.i} روز پیش`)} · {fmtPrice(data[hover.i])} تومان
        </div>
      ) : null}
    </div>
  );
}
