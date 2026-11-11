/**
 * WebGL renderer strings of CPU rasterisers (SwiftShader, Mesa llvmpipe/softpipe, Microsoft
 * Basic Render Driver). On these the 3D hero keeps its still poster (docs/06 §3).
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render driver/i;

export function isSoftwareRenderer(renderer: string): boolean {
  return SOFTWARE_RENDERER.test(renderer);
}
