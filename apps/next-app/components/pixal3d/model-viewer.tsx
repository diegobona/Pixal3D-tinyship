"use client";

import { useEffect, useRef, useState } from "react";

interface ModelViewerProps {
  modelUrl?: string;
  idleLabel: string;
  loadingLabel: string;
  errorLabel: string;
}

export function ModelViewer({ modelUrl, idleLabel, loadingLabel, errorLabel }: ModelViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    modelUrl ? "loading" : "idle"
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) {
      setStatus("idle");
      return;
    }

    const modelSource = modelUrl;
    let disposed = false;
    let cleanup = () => {};

    setStatus("loading");

    async function renderModel() {
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls");

      if (disposed || !mountRef.current) return;

      const container = mountRef.current;
      const width = container.clientWidth || 640;
      const height = container.clientHeight || 480;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0c1737);

      const camera = new THREE.PerspectiveCamera(38, width / height, 0.01, 100);
      camera.position.set(2.4, 1.8, 3.2);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.outputEncoding = THREE.sRGBEncoding;
      container.innerHTML = "";
      container.appendChild(renderer.domElement);

      const ambient = new THREE.HemisphereLight(0xffffff, 0x1b2544, 1.7);
      scene.add(ambient);
      const key = new THREE.DirectionalLight(0xffffff, 2.1);
      key.position.set(4, 5, 3);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xc8e4ff, 0.9);
      fill.position.set(-3, 2, -4);
      scene.add(fill);

      const grid = new THREE.GridHelper(4, 16, 0x3a8edb, 0x23345e);
      grid.position.y = -0.02;
      scene.add(grid);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.55;
      controls.target.set(0, 0.75, 0);

      const loader = new GLTFLoader();
      loader.load(
        modelSource,
        (gltf) => {
          if (disposed) return;
          const root = gltf.scene;
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const maxAxis = Math.max(size.x, size.y, size.z) || 1;
          root.scale.multiplyScalar(1.7 / maxAxis);
          root.position.sub(center.multiplyScalar(1.7 / maxAxis));
          root.position.y += 0.85;
          scene.add(root);
          setStatus("ready");
        },
        undefined,
        () => {
          if (!disposed) setStatus("error");
        }
      );

      const onResize = () => {
        const nextWidth = container.clientWidth || width;
        const nextHeight = container.clientHeight || height;
        camera.aspect = nextWidth / nextHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight);
      };
      window.addEventListener("resize", onResize);

      renderer.setAnimationLoop(() => {
        controls.update();
        renderer.render(scene, camera);
      });

      cleanup = () => {
        window.removeEventListener("resize", onResize);
        renderer.setAnimationLoop(null);
        controls.dispose();
        renderer.dispose();
        container.innerHTML = "";
      };
    }

    renderModel().catch(() => {
      if (!disposed) setStatus("error");
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [modelUrl]);

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg border border-[#25314f] bg-[#0c1737]">
      <div ref={mountRef} data-testid="pixal3d-model-canvas" className="h-full min-h-[360px] w-full" />
      {status !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c1737]/90 px-6 text-center">
          <p className="text-sm font-semibold text-[#aeb6ca]">
            {status === "loading" ? loadingLabel : status === "error" ? errorLabel : idleLabel}
          </p>
        </div>
      )}
    </div>
  );
}
