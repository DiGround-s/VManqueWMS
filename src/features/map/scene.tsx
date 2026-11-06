"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, RoundedBox, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { SLOT, type Placed, type Rack, type RowLabel } from "./layout";

type OrbitControlsImpl = React.ComponentRef<typeof OrbitControls>;

export type SlotState = "empty" | "ok" | "low" | "reserve" | "dock";
export type SlotView = { id: string; code: string; state: SlotState; image: string | null; qty: number; dim: boolean; highlight: boolean; picking: boolean; led: boolean };

type Props = {
  placed: Placed[];
  racks: Rack[];
  labels: RowLabel[];
  size: { width: number; depth: number };
  levelHeight: number;
  slots: Map<string, SlotView>;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  dark: boolean;
};

const STATE_COLOR: Record<SlotState, string> = { empty: "#d9dde3", ok: "#2fbf78", low: "#ef5a4c", reserve: "#5b8def", dock: "#f5b301" };
const STATE_COLOR_DARK: Record<SlotState, string> = { empty: "#3a414c", ok: "#2fd182", low: "#ff6b5f", reserve: "#7aa7ff", dock: "#ffc94d" };

export function WarehouseScene(props: Props) {
  const { size, dark } = props;
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ position: [size.width * 0.18, size.depth * 0.45 + 3.5, size.depth * 0.6 + 4], fov: 45 }}
      onPointerMissed={() => props.onSelect(null)}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[dark ? "#0d0f12" : "#eef0f3"]} />
      <fog attach="fog" args={[dark ? "#0d0f12" : "#eef0f3", size.depth * 2.2, size.depth * 4.5]} />
      <hemisphereLight args={[dark ? "#c8d3e6" : "#ffffff", dark ? "#101318" : "#cfd5de", dark ? 0.6 : 0.9]} />
      <directionalLight position={[8, 14, 10]} intensity={dark ? 1.1 : 1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
      <Floor size={size} dark={dark} />
      <Suspense fallback={null}>
        <Shelving {...props} />
      </Suspense>
      <Rig placed={props.placed} selectedId={props.selectedId} size={size} />
    </Canvas>
  );
}

function Floor({ size, dark }: { size: Props["size"]; dark: boolean }) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[size.width + 8, size.depth + 8]} />
        <meshStandardMaterial color={dark ? "#15181d" : "#ffffff"} />
      </mesh>
      <gridHelper args={[Math.max(size.width, size.depth) + 8, Math.round(Math.max(size.width, size.depth) + 8), dark ? "#262b33" : "#e3e6eb", dark ? "#1c2026" : "#eef0f3"]} position={[0, 0.005, 0]} />
    </group>
  );
}

function Shelving({ placed, racks, labels, levelHeight, slots, selectedId, hoveredId, onHover, onSelect, dark }: Props) {
  const urls = useMemo(() => [...new Set([...slots.values()].map((s) => s.image).filter((u): u is string => !!u))], [slots]);
  const textures = useTexture(urls);
  const byUrl = useMemo(() => {
    const m = new Map<string, THREE.Texture>();
    (Array.isArray(textures) ? textures : [textures]).forEach((t, i) => {
      t.colorSpace = THREE.SRGBColorSpace;
      m.set(urls[i], t);
    });
    return m;
  }, [textures, urls]);

  return (
    <group>
      {racks.map((r) => (
        <RackFrame key={r.key} rack={r} levelHeight={levelHeight} dark={dark} />
      ))}
      {placed.map((p) => {
        const s = slots.get(p.id);
        if (!s) return null;
        return (
          <Slot
            key={p.id}
            p={p}
            s={s}
            texture={s.image ? byUrl.get(s.image) : undefined}
            selected={selectedId === p.id}
            hovered={hoveredId === p.id}
            onHover={onHover}
            onSelect={onSelect}
            dark={dark}
          />
        );
      })}
      {labels.map((l) => (
        <Html key={l.key} position={[l.x, 0.05, l.z]} center transform rotation-x={-Math.PI / 2} scale={0.9} zIndexRange={[0, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink shadow-lift">{l.label}</div>
        </Html>
      ))}
    </group>
  );
}

function RackFrame({ rack, levelHeight, dark }: { rack: Rack; levelHeight: number; dark: boolean }) {
  const h = rack.levels * levelHeight + 0.15;
  const post = dark ? "#5b6472" : "#3b4350";
  const shelf = dark ? "#2a3039" : "#c9ced6";
  const xs = [-SLOT.w / 2 - 0.05, SLOT.w / 2 + 0.05];
  const zs = [-SLOT.d / 2, SLOT.d / 2];
  return (
    <group position={[rack.x, 0, rack.z]}>
      {xs.flatMap((x) =>
        zs.map((z) => (
          <mesh key={`${x}${z}`} position={[x, h / 2, z]} castShadow>
            <boxGeometry args={[0.06, h, 0.06]} />
            <meshStandardMaterial color={post} metalness={0.4} roughness={0.5} />
          </mesh>
        )),
      )}
      {Array.from({ length: rack.levels + 1 }, (_, i) => (
        <mesh key={i} position={[0, i * levelHeight + 0.04, 0]} receiveShadow castShadow>
          <boxGeometry args={[SLOT.w + 0.16, 0.05, SLOT.d + 0.06]} />
          <meshStandardMaterial color={shelf} metalness={0.2} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Slot({ p, s, texture, selected, hovered, onHover, onSelect, dark }: { p: Placed; s: SlotView; texture?: THREE.Texture; selected: boolean; hovered: boolean; onHover: (id: string | null) => void; onSelect: (id: string | null) => void; dark: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const color = (dark ? STATE_COLOR_DARK : STATE_COLOR)[s.state];
  const filled = s.state !== "empty";
  const lift = selected ? 0.12 : hovered ? 0.06 : 0;

  useFrame((state, delta) => {
    if (group.current) group.current.position.y = THREE.MathUtils.damp(group.current.position.y, p.y + lift, 10, delta);
    if (mat.current) {
      const pulse = s.highlight ? 0.45 + Math.sin(state.clock.elapsedTime * 4) * 0.35 : selected ? 0.35 : hovered ? 0.18 : 0;
      mat.current.emissiveIntensity = pulse;
      mat.current.opacity = THREE.MathUtils.damp(mat.current.opacity, s.dim ? 0.18 : filled ? 1 : 0.55, 8, delta);
    }
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover(p.id);
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    onHover(null);
    document.body.style.cursor = "";
  };

  const boxH = filled ? SLOT.h * 0.86 : SLOT.h * 0.12;
  return (
    <>
    <LedStrip p={p} on={s.led} />
    <group ref={group} position={[p.x, p.y, p.z]}>
      <RoundedBox
        args={[SLOT.w * 0.9, boxH, SLOT.d * 0.82]}
        radius={0.05}
        smoothness={3}
        position={[0, filled ? 0 : -SLOT.h / 2 + boxH / 2, 0]}
        castShadow={filled}
        onPointerOver={over}
        onPointerOut={out}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(p.id);
        }}
      >
        <meshStandardMaterial ref={mat} color={color} emissive={s.highlight ? "#ffd84d" : color} emissiveIntensity={0} roughness={0.55} transparent opacity={1} />
      </RoundedBox>
      {texture && !s.dim && (
        <mesh position={[0, 0, (SLOT.d * 0.82) / 2 + 0.006]}>
          <planeGeometry args={[SLOT.w * 0.62, boxH * 0.78]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
      {(hovered || selected) && (
        <Html position={[0, SLOT.h / 2 + 0.35, 0]} center zIndexRange={[20, 10]}>
          <div className="pointer-events-none whitespace-nowrap rounded-2xl bg-accent px-3 py-1.5 text-center text-xs font-semibold text-accent-ink shadow-lift">
            <span className="font-mono">{s.code}</span>
            <span className="ml-2 opacity-70">{s.state === "empty" ? "vacía" : `${s.qty} u.`}</span>
          </div>
        </Html>
      )}
      {s.picking && !s.dim && (
        <mesh position={[SLOT.w * 0.45 - 0.08, SLOT.h / 2 - 0.02, SLOT.d * 0.41]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#1f5fd6" emissive="#1f5fd6" emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
    </>
  );
}

const LED_ON = new THREE.Color("#22ff88");
const LED_OFF = new THREE.Color("#2a2f36");

let glow: THREE.Texture | null = null;
/** Vertical gradient (bright at the bottom) used for the LED light spill. */
function glowTexture() {
  if (glow) return glow;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 64, 0, 0);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  glow = new THREE.CanvasTexture(c);
  return glow;
}

/** Pick-to-light: an LED strip on the shelf's front edge under each slot (simulated hardware). */
function LedStrip({ p, on }: { p: Placed; on: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    const k = on ? 0.65 + Math.sin(state.clock.elapsedTime * 6) * 0.35 : 0;
    if (mat.current) mat.current.color.copy(LED_OFF).lerp(LED_ON, on ? 0.55 + k * 0.45 : 0);
    if (halo.current) halo.current.opacity = k * 0.55;
  });
  const y = p.y - SLOT.h / 2 - 0.04;
  const z = p.z + SLOT.d / 2 + 0.045;
  return (
    <group position={[p.x, y, z]}>
      <mesh>
        <boxGeometry args={[SLOT.w * 0.92, 0.035, 0.02]} />
        <meshBasicMaterial ref={mat} color={LED_OFF} toneMapped={false} />
      </mesh>
      {on && (
        // Light spill: a soft additive glow above the strip (no real light, so no shader recompiles).
        <mesh position={[0, 0.22, 0.02]}>
          <planeGeometry args={[SLOT.w * 1.15, 0.5]} />
          <meshBasicMaterial ref={halo} map={glowTexture()} color="#22ff88" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** Eases the orbit target (and camera distance) toward the selected slot. */
function Rig({ placed, selectedId, size }: { placed: Placed[]; selectedId: string | null; size: Props["size"] }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const goal = useRef<{ target: THREE.Vector3; pos: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const p = placed.find((x) => x.id === selectedId);
    if (!p) return;
    const target = new THREE.Vector3(p.x, p.y, p.z);
    // Stand in the aisle in front of the slot (rows are 3.2 apart, so stay under ~2.5 in z).
    goal.current = { target, pos: target.clone().add(new THREE.Vector3(1.1, 2.7, 2.45)) };
  }, [selectedId, placed]);

  useFrame((_, delta) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    c.target.lerp(g.target, 1 - Math.exp(-delta * 4));
    camera.position.lerp(g.pos, 1 - Math.exp(-delta * 3));
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.05) goal.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={Math.max(size.width, size.depth) * 2.2}
      maxPolarAngle={Math.PI / 2.15}
      onStart={() => (goal.current = null)}
    />
  );
}
