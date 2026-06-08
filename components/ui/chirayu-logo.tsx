import React from "react";

export function ChirayuLogo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3 select-none">
      {/* Solar/Sun Emblem SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Outer solar rays */}
        <circle cx="12" cy="12" r="5" fill="#F4B400" />
        <path
          d="M12 2V5M12 19V22M2 12H5M19 12H22M4.93 4.93L7.05 7.05M16.95 16.95L19.07 19.07M4.93 19.07L7.05 16.95M16.95 7.05L19.07 4.93"
          stroke="#0A4E9B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Modern grid-cell representing a solar panel inside the sun */}
        <path
          d="M10.5 10.5H13.5M10.5 13.5H13.5M12 9V15"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col items-start leading-none">
        <span className="text-lg font-bold tracking-tight text-primary-blue">
          Chirayu Power
        </span>
        <span className="text-[10px] font-medium tracking-wide text-soft-gray uppercase">
          Energy with Integrity
        </span>
      </div>
    </div>
  );
}
