# Portal visual assets

The solar panorama comes from the user-provided Chirayu website reference:
https://website-b8vb.vercel.app/assets/sunrise.avif

solar-hero.webp and solar-sidebar.webp are optimized still crops from the first frame of that animated AVIF. The dashboard uses the wide image and the white sidebar uses its coordinated portrait crop. The website image is company context, not a representation of any candidate's job.

Dashboard animation is CSS-only, runs on entry, and honors prefers-reduced-motion. No animation player or chart library is loaded. Saved assessment categories drive the charts; there are no fabricated sample scores. Candidate preferences are explicitly browser-local until a candidate profile backend is available.

## hero-animation.mp4

1920x1080, 10s, looping render of a solar-paneled neighborhood, playing full-bleed behind the whole hero (heading and next-step card sit on top of it) on the candidate dashboard.

This started as `hero-animation.avif` -- an animated AVIF (the "avis" image-sequence brand) converted from the same source footage. Two problems killed that approach:
- It was a 800x450 downscale. Stretched across the full hero width via `object-fit: cover`, that's a 2x+ upscale, which looked pixelated and over-zoomed once the hero was widened to cover the whole banner instead of a short strip.
- This project's `sharp` install can't decode the `avis` brand at all (confirmed locally -- `sharp(file, {animated:true}).metadata()` throws "unsupported image format"), so it could never have gone through `next/image` either.

The source video (`.../…_gwr_video_mvp.mp4` in the original export) is true 1920x1080; a same-resolution, more-compressed 2.3MB re-export of it is what's checked in here as `hero-animation.mp4`, so the crop the browser actually displays has real pixel data behind it instead of being stretched from a much smaller source.

Rendered as a plain `<video autoPlay muted playsInline>` in `app/(root)/page.tsx`, not next/image (next/image doesn't handle video at all) -- served as a static file from `/public`, no optimizer round-trip. `autoPlay` is turned off when `prefers-reduced-motion: reduce` is detected (checked client-side via `matchMedia`), in which case the `poster` frame (`hero-animation-fallback.jpg`, extracted from this same video, also full 1080p) is what shows -- consistent with the CSS-animation reduced-motion handling described above.

The video also now renders behind the portal navbar (which has a transparent background, see `PortalShell.module.css` `.navbar`), not just behind the hero body: `.heroPattern` extends `var(--portal-nav-height)` above `.hero`'s own top edge for this, while `.heroTop`'s actual heading content is unaffected since it's positioned by `.hero`'s normal content box, not by the video layer.

## hero-animation-reverse.mp4

Frame-reversed re-encode of `hero-animation.mp4` (same 1920x1080, ~10s), generated once with `ffmpeg -i hero-animation.mp4 -vf reverse -an hero-animation-reverse.mp4` (a static ffmpeg binary was installed as a one-off dev-time tool via `npm install --no-save ffmpeg-static`; it isn't a project dependency).

The hero plays a "boomerang" loop instead of a hard cut back to frame 0: `<video>` doesn't support `playbackRate: -1` reliably across browsers, so true reverse *playback* of one file isn't an option -- instead `app/(root)/page.tsx` swaps the `<video>`'s `<source>` between this file and the forward one on each `ended` event (no native `loop`), alternating forward/reverse/forward/... forever, so the direction change at each loop point is smooth instead of a jump cut.
