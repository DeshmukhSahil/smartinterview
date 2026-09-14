"use client";


import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";


const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-solar-display" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-solar-mono" });

export const solarFonts = `${display.variable} ${mono.variable}`;

