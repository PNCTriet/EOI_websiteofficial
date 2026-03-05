"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  offset = 1.2
) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * offset;
  camera.position.set(center.x + cameraZ * 0.5, center.y + cameraZ * 0.3, center.z + cameraZ);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

type Props = {
  modelUrl: string;
  className?: string;
};

export default function ProductModelViewer3MF({ modelUrl, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfafafa);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 20;

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    dir.castShadow = true;
    scene.add(dir);

    const loader = new ThreeMFLoader();
    loader
      .loadAsync(modelUrl)
      .then((object) => {
        object.rotation.set(-Math.PI / 2, 0, 0);
        scene.add(object);
        fitCameraToObject(camera, object);
        controls.update();
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Không tải được mô hình 3D");
        setLoading(false);
      });

    const onResize = () => {
      if (!container?.parentElement) return;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    onResize();
    window.addEventListener("resize", onResize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm ${className}`}
        style={{ minHeight: 240 }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-[#fafafa] ${className}`}
      style={{ height: 280 }}
      aria-label="Xem mô hình 3D sản phẩm"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fafafa] text-gray-500 text-sm">
          Đang tải mô hình…
        </div>
      )}
    </div>
  );
}
