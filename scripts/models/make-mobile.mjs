/**
 * Phone copies of the hero models (docs/06-3d-hero.md §4): pnpm models:mobile
 *
 * On a ~380 px phone canvas normal / specular maps are invisible but they were most of the
 * download, so the copies keep only colour, metal/roughness and emissive (screen) textures at
 * ≤ 384 px (specular factors stay, its textures go), and the
 * meshes are simplified (meshopt, error ≤ 0.2 % of the model size). Reads the desktop GLBs in
 * public/models, writes `*-mobile.glb` next to them.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsSpecular } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const MODELS = [
  { src: "hero-phone.glb", out: "hero-phone-mobile.glb", ratio: 0.5 },
  { src: "hero-laptop.glb", out: "hero-laptop-mobile.glb", ratio: 0.4 },
  { src: "hero-headset.glb", out: "hero-headset-mobile.glb", ratio: 0.35 },
];
const DIR = "public/models";

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

for (const { src, out, ratio } of MODELS) {
  const doc = await io.read(`${DIR}/${src}`);
  for (const material of doc.getRoot().listMaterials()) {
    material.setNormalTexture(null);
    material.setOcclusionTexture(null);
    // keep the specular colour/strength (it tints metals), drop only its textures
    const specular = material.getExtension(KHRMaterialsSpecular.EXTENSION_NAME);
    specular?.setSpecularTexture(null).setSpecularColorTexture(null);
  }
  await doc.transform(
    prune(),
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.002 }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [384, 384], quality: 80 }),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
    prune(),
  );
  await io.write(`${DIR}/${out}`, doc);
  console.log(`${out}: written`);
}
