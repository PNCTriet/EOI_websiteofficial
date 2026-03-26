"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Props = {
  stlUrl: string;
  posterUrl?: string | null;
};

function is3mfUrl(url: string): boolean {
  const path = url.trim().split("?")[0].split("#")[0].toLowerCase();
  return path.endsWith(".3mf");
}

/** Same-origin proxy avoids CORS when loading models from Supabase Storage in Three.js. */
function stlUrlForLoader(stlUrl: string): string {
  const trimmed = stlUrl.trim();
  if (!trimmed) return stlUrl;
  // Static files under public/ — same origin, no proxy.
  if (trimmed.startsWith("/")) return trimmed;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return stlUrl;
  try {
    const target = new URL(trimmed);
    const supabase = new URL(base);
    if (
      target.hostname === supabase.hostname &&
      target.pathname.startsWith("/storage/v1/object/")
    ) {
      return `/api/stl-proxy?u=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    // fall through
  }
  return trimmed;
}

/**
 * Three.js thumbnail preview for product cards (STL or 3MF).
 *
 * Note: We lazily start rendering only when the card becomes visible to avoid
 * loading multiple model files at once.
 */
export function Product3DThumb({ stlUrl, posterUrl }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const poster = posterUrl ?? null;
  const aspectKey = useMemo(() => stlUrl, [stlUrl]);
  const loaderUrl = useMemo(() => stlUrlForLoader(stlUrl), [stlUrl]);
  const is3mf = useMemo(() => is3mfUrl(stlUrl), [stlUrl]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const anyVisible = entries.some((x) => x.isIntersecting);
        if (anyVisible) setInView(true);
      },
      { threshold: 0.2 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const host = hostRef.current;
    if (!host) return;

    let stopped = false;
    let frameId = 0;
    let renderer: any = null;
    let scene: any = null;
    let camera: any = null;
    let root: any = null;

    const width = host.clientWidth || 1;
    const height = host.clientHeight || 1;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Ensure the canvas sits under the poster overlay.
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.zIndex = "0";
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 1000);
    camera.position.set(0, 0.22, 1.25);

    // Lights: keep it subtle so materials look premium.
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(1.2, 1.5, 2.0);
    scene.add(dir);

    const fill = new THREE.DirectionalLight(0xff6aa8, 0.35);
    fill.position.set(-1.2, 0.6, 1.8);
    scene.add(fill);

    function animate() {
      if (stopped || !renderer || !scene || !camera) return;
      if (root) {
        const speed = hovered ? 0.015 : 0.006;
        root.rotation.y += speed;
      }
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    }

    const thumbMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      metalness: 0.15,
      roughness: 0.75,
      envMapIntensity: 0.7,
    });

    function addGround() {
      const groundGeo = new THREE.CircleGeometry(0.65, 48);
      const groundMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.09,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.position.y = -0.42;
      ground.rotation.x = -Math.PI / 2;
      scene!.add(ground);
    }

    let loaderCancelled = false;
    (async () => {
      try {
        if (loaderCancelled || stopped) return;

        if (is3mf) {
          const { ThreeMFLoader } = await import("three/examples/jsm/loaders/3MFLoader");
          if (loaderCancelled || stopped) return;

          const loader = new ThreeMFLoader();
          (loader as any).setCrossOrigin?.("anonymous");
          loader.load(
            loaderUrl,
            (object: any) => {
              if (loaderCancelled || stopped) return;

              object.traverse((child: any) => {
                if (child instanceof THREE.Mesh) {
                  child.material = thumbMaterial.clone();
                }
              });

              // 3MF is often z-up; Three.js scenes are y-up.
              object.rotation.set(-Math.PI / 2, 0, 0);

              const pivot = new THREE.Group();
              pivot.add(object);

              const box = new THREE.Box3().setFromObject(pivot);
              const center = new THREE.Vector3();
              const size = new THREE.Vector3();
              box.getCenter(center);
              box.getSize(size);
              const maxDim = Math.max(size.x, size.y, size.z) || 1;
              pivot.position.sub(center);
              pivot.scale.setScalar(1 / maxDim);
              pivot.position.y -= 0.05;
              pivot.rotation.x = -0.2;

              root = pivot;
              scene!.add(pivot);
              addGround();
            setLoaded(true);
            animate();
            },
            undefined,
            () => {
            setFailed(true);
            animate();
            }
          );
          return;
        }

        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader");
        if (loaderCancelled || stopped) return;

        const loader = new STLLoader();
        (loader as any).setCrossOrigin?.("anonymous");
        loader.load(
          loaderUrl,
          (geometry: any) => {
            if (loaderCancelled || stopped) return;

            geometry.computeBoundingBox();
            geometry.computeVertexNormals();

            const box = geometry.boundingBox;
            if (!box) {
              animate();
              return;
            }

            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const scale = 1 / maxDim;

            geometry.translate(-center.x, -center.y, -center.z);
            geometry.scale(scale, scale, scale);

            const mesh = new THREE.Mesh(geometry, thumbMaterial);
            mesh.position.y = -0.05;
            mesh.rotation.x = -0.2;
            root = mesh;
            scene!.add(mesh);
            addGround();
            setLoaded(true);
            animate();
          },
          undefined,
          () => {
            setFailed(true);
            animate();
          }
        );
      } catch {
        setFailed(true);
        animate();
      }
    })();

    const onResize = () => {
      if (!renderer || !camera) return;
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      stopped = true;
      loaderCancelled = true;
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(frameId);

      if (renderer) {
        renderer.dispose();
        const child = renderer.domElement;
        if (child.parentElement === host) host.removeChild(child);
      }
      if (scene) {
        scene.traverse((obj: any) => {
          const o = obj as any;
          if (o.geometry) o.geometry.dispose?.();
          if (o.material) {
            const m = o.material;
            if (Array.isArray(m)) m.forEach((x: any) => x.dispose?.());
            else m.dispose?.();
          }
        });
      }
    };
  }, [inView, loaderUrl, hovered, is3mf]);

  return (
    <div
      key={aspectKey}
      ref={hostRef}
      className="absolute inset-0"
      style={{ position: "absolute" }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      aria-hidden
    >
      {poster ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={`object-cover object-center transition-opacity duration-300 ${
              failed ? "opacity-100" : loaded ? "opacity-90" : "opacity-100"
            }`}
            priority={false}
          />
        </div>
      ) : null}
    </div>
  );
}

