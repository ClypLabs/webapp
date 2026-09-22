"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// A single page-wide atmosphere layer, rather than a glow bolted onto each
// section. Sections previously lit themselves, which left obvious dark bands
// between them - light does not stop at a section boundary.
//
// Fixed rather than absolute: the blobs stay put while the page scrolls past,
// so the colour behind the content shifts gradually instead of travelling with
// it. Everything here is decorative, sits behind all content, and never takes a
// pointer event.
//
// Drawn by a shader, with the CSS blobs as the fallback. A wash this faint has
// only ~20 shades of green to spread over hundreds of pixels, so as a CSS
// gradient it shows as rings - and the grain, at a strength that stays
// invisible elsewhere, is far too weak to break them up. The shader mixes the
// base colour and every wash in full precision, then adds +-1 step of noise to
// the final colour before the display rounds it to 8 bits. That dither is what
// removes the rings. It has to be applied to the final colour: dithering each
// translucent layer on its own is undone when the browser stores it
// premultiplied.
//
// Still not animated, and it costs nothing after the first frame: the field is
// drawn once, and again only when the viewport changes size.

// Matches the phone rule in globals.css that drops the two extra blobs.
const WIDE = "(min-width: 768px)";

// Where the light sits. Each blob is a box anchored like the CSS fallback
// (left/right, top/bottom, as a fraction of the viewport), so the shader and the
// fallback paint the same light. Its centre is fx*width + sx*rx along x and
// fy*height + sy*ry along y: sx is +1 for a left-anchored box, -1 for a
// right-anchored one, and the same for y. Linear falloff from the centre colour
// to nothing, as radial-gradient(closest-side) draws it.
//
// Pages get their own layout so the site does not feel like one wallpaper
// pasted behind everything; "home" is the original arrangement.
type Blob = {
  fx: number; sx: 1 | -1; fy: number; sy: 1 | -1;
  rx: number; ry: number;
  rgb: [number, number, number]; peak: number;
  // Dropped on phones along with the rule in globals.css.
  extra?: boolean;
};

const LAYOUTS = {
  home: [
    // Top-left wash, warm side of the accent.
    { fx: -0.14, sx: 1, fy: -0.22, sy: 1, rx: 610, ry: 520, rgb: [16, 185, 129], peak: 0.13 },
    // Counterweight on the right, cooler, so the page is not lit evenly.
    { fx: 1.2, sx: -1, fy: 0.18, sy: 1, rx: 580, ry: 490, rgb: [45, 212, 191], peak: 0.09 },
    // Low and centred, to keep the lower half of the page from going flat.
    { fx: 0.14, sx: 1, fy: 1.18, sy: -1, rx: 600, ry: 470, rgb: [6, 182, 212], peak: 0.08, extra: true },
    // Faint fourth, offset so no pair of blobs lines up.
    { fx: 0.3, sx: 1, fy: 0.48, sy: 1, rx: 460, ry: 410, rgb: [52, 211, 153], peak: 0.07, extra: true },
  ],
  // Mirrored: the strong wash top-right over the header's controls, the cool
  // counterweight low on the left behind the form, a faint band along the
  // bottom and a lift between the two columns.
  admin: [
    { fx: 1.12, sx: -1, fy: -0.24, sy: 1, rx: 620, ry: 520, rgb: [16, 185, 129], peak: 0.12 },
    { fx: -0.2, sx: 1, fy: 0.5, sy: 1, rx: 560, ry: 480, rgb: [45, 212, 191], peak: 0.09 },
    { fx: 0.42, sx: 1, fy: 1.22, sy: -1, rx: 640, ry: 460, rgb: [6, 182, 212], peak: 0.07, extra: true },
    { fx: 0.5, sx: 1, fy: 0.16, sy: 1, rx: 420, ry: 380, rgb: [52, 211, 153], peak: 0.06, extra: true },
  ],
} satisfies Record<string, Blob[]>;

export type AmbienceLayout = keyof typeof LAYOUTS;

const f = (value: number) => value.toFixed(4);

function fragmentShader(blobs: Blob[]) {
  const wash = (blob: Blob) =>
    `colour = wash(colour, point, vec2(${f(blob.fx)} * size.x + ${f(blob.sx * blob.rx)}, ${f(blob.fy)} * size.y + ${f(blob.sy * blob.ry)}),
      vec2(${f(blob.rx)}, ${f(blob.ry)}), vec3(${blob.rgb.map(f).join(", ")}), ${f(blob.peak)});`;
  return `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform vec2 size;    // viewport, CSS px
  uniform float scale;  // device px per CSS px
  uniform float extras; // 1 when the extra blobs are shown

  vec3 wash(vec3 base, vec2 point, vec2 center, vec2 radii, vec3 rgb, float peak) {
    float f = clamp(1.0 - length((point - center) / radii), 0.0, 1.0);
    return mix(base, rgb / 255.0, peak * f);
  }

  // Sine-free hash (Hoskins), so it holds up at large pixel coordinates.
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 point = vec2(gl_FragCoord.x, size.y * scale - gl_FragCoord.y) / scale;
    vec3 colour = vec3(10.0, 13.0, 17.0) / 255.0; // --background
    ${blobs.filter((blob) => !blob.extra).map(wash).join("\n    ")}
    if (extras > 0.5) {
      ${blobs.filter((blob) => blob.extra).map(wash).join("\n      ")}
    }
    // Triangular noise of +-1 step, which the output's rounding turns into
    // dither rather than error.
    float noise = hash(gl_FragCoord.xy) + hash(gl_FragCoord.xy + 91.7) - 1.0;
    gl_FragColor = vec4(colour + noise / 255.0, 1.0);
  }
`;
}

// The CSS fallback's box for a blob: anchored on the same side the shader
// measures from, so the two agree.
function blobStyle(blob: Blob): CSSProperties {
  const percent = (value: number) => `${+(value * 100).toFixed(2)}%`;
  return {
    width: blob.rx * 2,
    height: blob.ry * 2,
    ...(blob.sx === 1 ? { left: percent(blob.fx) } : { right: percent(1 - blob.fx) }),
    ...(blob.sy === 1 ? { top: percent(blob.fy) } : { bottom: percent(1 - blob.fy) }),
    background: `radial-gradient(closest-side, rgba(${blob.rgb.join(",")},${blob.peak}), transparent)`,
  };
}

const VERTEX_SHADER = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";

// Compiles the field onto the canvas and returns its draw call, or null if the
// browser cannot - in which case the CSS blobs simply stay.
function createField(canvas: HTMLCanvasElement, blobs: Blob[]) {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentShader(blobs));
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // One triangle that covers the whole viewport.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const size = gl.getUniformLocation(program, "size");
  const scaleUniform = gl.getUniformLocation(program, "scale");
  const extras = gl.getUniformLocation(program, "extras");
  const wide = window.matchMedia(WIDE);

  return () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    // Device pixels, so the dither lands one step per physical pixel. Capped
    // at 2x - past that the grain is finer than anyone can see anyway.
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      gl.viewport(0, 0, pixelWidth, pixelHeight);
    }
    gl.uniform2f(size, width, height);
    gl.uniform1f(scaleUniform, pixelWidth / width);
    gl.uniform1f(extras, wide.matches ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
}

export default function Ambience({ layout = "home" }: { layout?: AmbienceLayout }) {
  const blobs: Blob[] = LAYOUTS[layout];
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    if (!layer || !canvas) return;

    const draw = createField(canvas, blobs);
    if (!draw) return;

    // Swap on a frame boundary: the blobs go and the drawn field appears in
    // the same paint, so there is no frame of either both or neither.
    const frame = requestAnimationFrame(() => {
      layer.dataset.live = "";
      draw();
    });
    const wide = window.matchMedia(WIDE);
    const lost = () => {
      delete layer.dataset.live;
    };
    window.addEventListener("resize", draw);
    wide.addEventListener("change", draw);
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", draw);
      wide.removeEventListener("change", draw);
      canvas.removeEventListener("webglcontextlost", lost);
    };
  }, [blobs]);

  return (
    <div
      ref={layerRef}
      aria-hidden
      className="group pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* The shader's field. Hidden until it has drawn; see above. */}
      <canvas ref={canvasRef} className="absolute inset-0 hidden h-full w-full group-data-[live]:block" />

      {/* The CSS fallback, and what shows until the field is ready.

          Radial gradients, not blurred circles. A 160px blur on a 900px box has
          to be re-rasterised by the GPU on every frame it changes - and these
          are fixed, so they never leave the viewport. The gradient paints the
          same falloff once and then costs nothing to move. The boxes are larger
          than the old ones because a blur spread well past its element. */}
      {/* Not animated, on any viewport. This layer is fixed, so unlike the
          hero's glow it never scrolls out of the way - an animation here is
          four viewport-sized layers being composited sixty times a second for
          the entire visit. The drift cycled over 19 to 41 seconds, which reads
          as a still wash anyway. Painted once, then free. */}
      <div className="contents group-data-[live]:hidden">
        {blobs.map((blob, index) => (
          <div key={index} className={`ambience-blob absolute ${blob.extra ? "ambience-extra" : ""}`} style={blobStyle(blob)} />
        ))}
      </div>

      {/* Grain. Takes the plastic sheen off the flat areas, over either the
          field or the fallback. */}
      <div className="page-grain absolute inset-0" />
    </div>
  );
}
