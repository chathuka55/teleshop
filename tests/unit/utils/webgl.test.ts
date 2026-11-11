import { describe, expect, it } from "vitest";
import { isSoftwareRenderer } from "@/lib/utils/webgl";

describe("isSoftwareRenderer (3D hero poster fallback)", () => {
  it("spots CPU rasterisers", () => {
    for (const r of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "Google SwiftShader",
    ]) {
      expect(isSoftwareRenderer(r), r).toBe(true);
    }
  });

  it("keeps 3D on real GPUs and when the renderer is hidden", () => {
    for (const r of [
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "Apple GPU",
      "Adreno (TM) 740",
      "Mali-G78",
      "",
    ]) {
      expect(isSoftwareRenderer(r), r).toBe(false);
    }
  });
});
