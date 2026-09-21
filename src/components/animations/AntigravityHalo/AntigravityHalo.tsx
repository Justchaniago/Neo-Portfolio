"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { generatePoissonDisc } from "./poissonDisc";
import { VERTEX_SHADER, FRAGMENT_SHADER } from "./shaders";

export interface AntigravityHaloProps {
  className?: string;
  density?: number;
  particlesScale?: number;
  ringRadius?: number;
  ringWidth?: number;
  ringWidth2?: number;
  ringDisplacement?: number;
  color1?: string; // Charcoal monochrome
  color2?: string; // Deep velvet burgundy
  color3?: string; // Rich burgundy accent
  idleDrift?: boolean;
}

export function AntigravityHalo({
  className = "",
  density = 220,
  particlesScale = 1.0,
  ringRadius = 0.20,
  ringWidth = 0.12,
  ringWidth2 = 0.05,
  ringDisplacement = 0.18,
  color1 = "#18181b",
  color2 = "#a01838",
  color3 = "#dfa13d",
  idleDrift = true,
}: AntigravityHaloProps) {

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Dimensions
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.z = 3.1;

    // WebGL Renderer with graceful fallback
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
        stencil: false,
      });
    } catch (e) {
      console.warn("AntigravityHalo: WebGL context could not be initialized.", e);
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 0); // Transparent background

    const canvas = renderer.domElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.pointerEvents = "none";
    container.appendChild(canvas);

    // Generate Poisson Disc Points across entire plane
    const mappedMinDist = 9.5 - (density / 300) * 5.5; // ~4.5 - 5.5
    const pointsData = generatePoissonDisc(500, 500, Math.max(3.2, mappedMinDist), 20);
    const count = pointsData.length / 2;

    const geometry = new THREE.BufferGeometry();
    const refPosArray = new Float32Array(count * 2);
    const posArray = new Float32Array(count * 3);
    const seedsArray = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      const rx = pointsData[i * 2 + 0];
      const ry = pointsData[i * 2 + 1];

      refPosArray[i * 2 + 0] = rx;
      refPosArray[i * 2 + 1] = ry;

      posArray[i * 3 + 0] = rx;
      posArray[i * 3 + 1] = ry;
      posArray[i * 3 + 2] = 0;

      seedsArray[i * 4 + 0] = Math.random();
      seedsArray[i * 4 + 1] = Math.random();
      seedsArray[i * 4 + 2] = Math.random();
      seedsArray[i * 4 + 3] = Math.random();
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    geometry.setAttribute("refPos", new THREE.BufferAttribute(refPosArray, 2));
    geometry.setAttribute("seeds", new THREE.BufferAttribute(seedsArray, 4));

    // Responsive helper functions
    const isPortrait = () => width < height;

    const calculateParticleScale = (w: number) => {
      // Mobile viewports protection: keep bold, distinct capsule pills
      if (w <= 640) {
        return 0.42 * particlesScale;
      }
      if (w <= 1024) {
        return 0.38 * particlesScale;
      }
      return Math.max(0.32, w / pixelRatio / 2000) * particlesScale;
    };

    const getBaseRingRadius = () => (isPortrait() ? 0.088 : ringRadius);
    const getBaseRingWidth = () => (isPortrait() ? 0.055 : ringWidth);
    const getBaseRingWidth2 = () => (isPortrait() ? 0.022 : ringWidth2);
    const getBaseRingDisplacement = () => (isPortrait() ? 0.09 : ringDisplacement);

    // Uniforms matching Google Antigravity
    const uniforms = {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(color1) },
      uColor2: { value: new THREE.Color(color2) },
      uColor3: { value: new THREE.Color(color3) },
      uAlpha: { value: 1.0 },
      uRingPos: { value: new THREE.Vector2(0.0, 0.06) },
      uRez: { value: new THREE.Vector2(width, height) },
      uParticleScale: { value: calculateParticleScale(width) },
      uPixelRatio: { value: pixelRatio },
      uRingRadius: { value: getBaseRingRadius() },
      uRingWidth: { value: getBaseRingWidth() },
      uRingWidth2: { value: getBaseRingWidth2() },
      uRingDisplacement: { value: getBaseRingDisplacement() },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const pointsMesh = new THREE.Points(geometry, material);
    // Key Antigravity Scaling: scale by 5.0 to fully span the entire viewport
    pointsMesh.scale.set(5.0, 5.0, 5.0);
    scene.add(pointsMesh);

    // Raycast Plane in world space for accurate pointer intersection
    const raycastPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(25, 25),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(raycastPlane);

    const raycaster = new THREE.Raycaster();
    const ndcMouse = new THREE.Vector2(-999, -999);
    const ringPos = new THREE.Vector2(0.0, 0.06);
    const targetCursorPos = new THREE.Vector2(0.0, 0.06);

    let isMouseActive = false;
    let isIntersecting = false;

    // Pointer event handlers - continuous tracking across the full window
    const updatePointerFromClient = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      isMouseActive = true;
      ndcMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndcMouse.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(ndcMouse, camera);
      const intersects = raycaster.intersectObject(raycastPlane);
      if (intersects.length > 0) {
        // Since pointsMesh is scaled by 5.0, dividing world coordinates by 5.0 (* 0.2)
        // precisely maps the pointer to local mesh coordinate space!
        targetCursorPos.x = intersects[0].point.x * 0.2;
        targetCursorPos.y = intersects[0].point.y * 0.2;
        isIntersecting = true;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const handlePointerLeave = () => {
      isMouseActive = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updatePointerFromClient(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updatePointerFromClient(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      isMouseActive = false;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("pointerleave", handlePointerLeave);

    // Responsive Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      uniforms.uRez.value.set(width, height);
      uniforms.uParticleScale.value = calculateParticleScale(width);
      uniforms.uRingRadius.value = getBaseRingRadius();
      uniforms.uRingWidth.value = getBaseRingWidth();
      uniforms.uRingWidth2.value = getBaseRingWidth2();
      uniforms.uRingDisplacement.value = getBaseRingDisplacement();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Intersection Observer to stop animation when out of view
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(container);

    // Animation Loop
    const clock = new THREE.Clock();
    let animFrameId: number;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const elapsedTime = prefersReducedMotion ? 1.0 : clock.getElapsedTime();
      uniforms.uTime.value = elapsedTime;

      // Dynamic breathing halo radius
      const currentRadius = getBaseRingRadius();
      const radiusPulsing = isPortrait() ? 0.010 : 0.025;
      const radiusPulsing2 = isPortrait() ? 0.006 : 0.015;

      if (!prefersReducedMotion) {
        uniforms.uRingRadius.value =
          currentRadius +
          Math.sin(elapsedTime * 1.2) * radiusPulsing +
          Math.cos(elapsedTime * 2.8) * radiusPulsing2;
      }

      // Autonomous Mobile & Idle Wander Motion
      let targetX = 0;
      let targetY = 0;
      let lerpSpeed = 0.075;

      if (isMouseActive && isIntersecting) {
        // Direct finger touch or mouse cursor tracking
        const t = elapsedTime * 0.8;
        const subtleNoiseX = Math.sin(t * 1.1) * 0.02;
        const subtleNoiseY = Math.cos(t * 0.9) * 0.02;
        targetX = targetCursorPos.x + subtleNoiseX;
        targetY = targetCursorPos.y + subtleNoiseY;
        lerpSpeed = 0.09;
      } else if (idleDrift && !prefersReducedMotion) {
        const wanderTime = elapsedTime * 0.38;
        if (isPortrait()) {
          // Portrait mobile:
          // Keep halo centered and framing Just Chaniago's head and sunglasses!
          // X stays comfortably between [-0.055, 0.055]
          // Y stays comfortably between [0.02, 0.12]
          targetX =
            Math.sin(wanderTime * 0.8) * 0.045 +
            Math.cos(wanderTime * 0.35) * 0.015;
          targetY =
            0.06 +
            Math.cos(wanderTime * 0.65) * 0.045 +
            Math.sin(wanderTime * 1.1) * 0.015;
          lerpSpeed = 0.032;
        } else {
          // Desktop / Landscape:
          targetX =
            Math.sin(wanderTime * 0.85) * 0.35 +
            Math.cos(wanderTime * 0.38) * 0.18;
          targetY =
            Math.cos(wanderTime * 0.65) * 0.22 +
            Math.sin(wanderTime * 1.15) * 0.10;
          lerpSpeed = 0.028;
        }
      } else {
        targetX = isPortrait() ? 0 : 0.35;
        targetY = isPortrait() ? 0.06 : 0.15;
        lerpSpeed = 0.02;
      }

      ringPos.x += (targetX - ringPos.x) * lerpSpeed;
      ringPos.y += (targetY - ringPos.y) * lerpSpeed;

      uniforms.uRingPos.value.copy(ringPos);

      renderer.render(scene, camera);
    };



    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("pointerleave", handlePointerLeave);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();

      geometry.dispose();
      material.dispose();
      raycastPlane.geometry.dispose();
      (raycastPlane.material as THREE.Material).dispose();
      renderer.dispose();

      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
    };
  }, [
    density,
    particlesScale,
    ringRadius,
    ringWidth,
    ringWidth2,
    ringDisplacement,
    color1,
    color2,
    color3,
    idleDrift,
  ]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
