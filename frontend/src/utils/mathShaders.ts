import * as THREE from 'three'

const GLSL_NOISE = `
vec2 mcHash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float mcHash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}
float mcNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mcHash(i), mcHash(i + vec2(1.0, 0.0)), f.x),
    mix(mcHash(i + vec2(0.0, 1.0)), mcHash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float mcFbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) { v += a * mcNoise(p); p = rot * p * 2.07; a *= 0.5; }
  return v;
}
float voronoiEdge(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      float d = length(g + mcHash2(n + g) - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return d2 - d1;
}
`

const WORLD_POS_VERT = `
#include <begin_vertex>
vec4 wp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
#endif
vSlabWorldPos = (modelMatrix * wp).xyz;
`

/** 纯数学世界坐标 fBm 混凝土材质（支持 Voronoi 折线裂纹）。 */
export function makeMathConcrete(baseHex: number, roughness: number, withCracks = false, envInt = 0.18): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: baseHex, roughness, metalness: 0.03, envMapIntensity: envInt })
  mat.customProgramCacheKey = () => `math-concrete-v3-${baseHex}-${withCracks}`
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vSlabWorldPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', WORLD_POS_VERT)
    const crack = withCracks
      ? `
        vec2 cUv = vSlabWorldPos.xz * 0.09 + vec2(mcFbm(vSlabWorldPos.xz * 0.6) * 0.14);
        float cZone = smoothstep(0.54, 0.72, mcNoise(vSlabWorldPos.xz * 0.11));
        shade *= (1.0 - 0.58 * (1.0 - smoothstep(0.002, 0.011, voronoiEdge(cUv))) * cZone);`
      : ''
    shader.fragmentShader = ('varying vec3 vSlabWorldPos;\n' + GLSL_NOISE + shader.fragmentShader)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float shade = 0.82 + mcFbm(vSlabWorldPos.xz * 0.16) * 0.16 + (mcFbm(vSlabWorldPos.xz * 2.4) - 0.5) * 0.09 + (mcHash(floor(vSlabWorldPos.xz * 42.0)) - 0.5) * 0.05;${crack}
        diffuseColor.rgb *= shade;`,
      )
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = clamp(roughness * (0.90 + mcFbm(vSlabWorldPos.xz * 0.25) * 0.18), 0.78, 0.98);`)
  }
  return mat
}

/** 纯数学可复用拼接木料材质（错缝木板 + 随机木板色差 + 拉伸年轮纤维，支持 InstancedMesh）。 */
export function makeMathWood(baseHex = 0xd6b588, roughness = 0.62): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: baseHex, roughness, metalness: 0.02, envMapIntensity: 0.35 })
  mat.customProgramCacheKey = () => `math-wood-v1-${baseHex}`
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vSlabWorldPos;\n' + shader.vertexShader.replace('#include <begin_vertex>', WORLD_POS_VERT)
    shader.fragmentShader = ('varying vec3 vSlabWorldPos;\n' + GLSL_NOISE + shader.fragmentShader)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 wp2 = vSlabWorldPos.xz + vSlabWorldPos.xy * 0.65;
        float row = floor(wp2.y * 5.5);
        float stagger = mod(row, 2.0) * 0.5 + mcHash(vec2(row, 3.1)) * 0.35;
        float col = floor(wp2.x * 1.4 + stagger);
        float pSeed = mcHash(vec2(col, row));
        vec2 cellF = vec2(fract(wp2.x * 1.4 + stagger), fract(wp2.y * 5.5));
        float seam = step(0.025, cellF.x) * step(0.04, cellF.y);
        float ringNoise = mcFbm(vec2(wp2.x * 1.8 + pSeed * 12.0, wp2.y * 18.0));
        float grain = 0.5 + 0.5 * sin(wp2.y * 52.0 + ringNoise * 8.5 + pSeed * 6.28);
        float plankTone = (0.86 + pSeed * 0.22) * (0.90 + grain * 0.14) * (0.72 + 0.28 * seam);
        diffuseColor.rgb *= plankTone;`,
      )
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = clamp(roughness * (0.85 + mcFbm(vSlabWorldPos.xz * 3.0) * 0.3), 0.42, 0.9);`)
  }
  return mat
}
