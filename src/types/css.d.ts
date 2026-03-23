// Tells TypeScript how to handle *.module.css imports.
// Next.js provides this automatically after `next build` / `next dev`
// via .next/types, but this file ensures `tsc --noEmit` works before
// the first build.
declare module '*.module.css' {
  const styles: { readonly [className: string]: string }
  export default styles
}
