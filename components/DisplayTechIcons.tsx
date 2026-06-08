"use client";

import { useState } from "react";
import Image from "next/image";

import { cn, getTechLogos } from "@/lib/utils";

interface TechIconProps {
  techStack: string[];
}

const SafeTechIcon = ({ tech, url, index }: { tech: string; url: string; index: number }) => {
  const [imgSrc, setImgSrc] = useState(url);

  return (
    <div
      className={cn(
        "relative group bg-dark-300 rounded-full p-2 flex items-center justify-center",
        index >= 1 && "-ml-3"
      )}
    >
      <span className="tech-tooltip">{tech}</span>

      <Image
        src={imgSrc}
        alt={tech}
        width={20}
        height={20}
        className="size-5 object-contain"
        onError={() => {
          setImgSrc("/tech.svg");
        }}
      />
    </div>
  );
};

const DisplayTechIcons = ({ techStack }: TechIconProps) => {
  const techIcons = getTechLogos(techStack);

  return (
    <div className="flex flex-row">
      {techIcons.slice(0, 3).map(({ tech, url }, index) => (
        <SafeTechIcon key={tech} tech={tech} url={url} index={index} />
      ))}
    </div>
  );
};

export default DisplayTechIcons;
