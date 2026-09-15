import React from "react";

interface ChirayuLogoProps {
  size?: number;
  height?: number | string;
  width?: number | string;
  className?: string;
  alt?: string;
}

export function ChirayuLogo({
  size,
  height,
  width,
  className = "",
  alt = "Chirayu Power Logo",
}: ChirayuLogoProps) {
  const displayHeight = height ?? (size ? size : 44);

  return (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/assets/chirayu-logo.png`}
        alt={alt}
        className="object-contain block max-w-full"
        style={{
          height: typeof displayHeight === "number" ? `${displayHeight}px` : displayHeight,
          width: width ? (typeof width === "number" ? `${width}px` : width) : "auto",
        }}
      />
    </div>
  );
}

export default ChirayuLogo;
