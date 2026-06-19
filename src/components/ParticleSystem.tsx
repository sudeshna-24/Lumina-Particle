import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PresetType, TrackingResults, ParticleConfig } from '../types';
import { Maximize2, Play, Pause, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface ParticleSystemProps {
  config: ParticleConfig;
  trackingResults: TrackingResults;
  isSimulating: boolean;
  manualScale: number;
  manualTension: number;
  manualSpeed: number;
}

export default function ParticleSystem({
  config,
  trackingResults,
  isSimulating,
  manualScale,
  manualTension,
  manualSpeed,
}: ParticleSystemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [fps, setFps] = useState<number>(60);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(false);

  // Refs for inside render loops (to avoid React re-render overhead at 60fps)
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);

  // Animation states
  const configRef = useRef<ParticleConfig>(config);
  const trackingRef = useRef<TrackingResults>(trackingResults);
  const isSimulatingRef = useRef<boolean>(isSimulating);
  const manualInputsRef = useRef({ manualScale, manualTension, manualSpeed });

  // Sync refs with props
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { trackingRef.current = trackingResults; }, [trackingResults]);
  useEffect(() => { isSimulatingRef.current = isSimulating; }, [isSimulating]);
  useEffect(() => {
    manualInputsRef.current = { manualScale, manualTension, manualSpeed };
  }, [manualScale, manualTension, manualSpeed]);

  // Handle active preset morphing
  const currentPresetRef = useRef<PresetType>(config.preset);
  const morphProgressRef = useRef<number>(1.0); // 1 = fully morphed

  // Particle positions buffers
  const particleCount = config.particleCount || 8000;
  const positionsRef = useRef<Float32Array | null>(null);
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const colorsRef = useRef<Float32Array | null>(null);
  const initialColorsRef = useRef<Float32Array | null>(null); // To scale color mapping
  const physicsDataRef = useRef<{
    lifetimes: Float32Array;
    maxLifetimes: Float32Array;
    burstOffsets: Float32Array;
    phase: Float32Array;
  } | null>(null);

  const prevScaleTargetRef = useRef<number>(1.0);
  const explosionBoostRef = useRef<number>(0.0);

  // Geometry attributes to update
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Generate gorgeous glowing circle canvas texture
  function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Sleek radial puff
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, 2 * Math.PI);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  // Calculate coordinates for presets
  function generateCoordinatesForPreset(
    preset: PresetType,
    primaryHex: string,
    secondaryHex: string
  ): { target: Float32Array; vels: Float32Array; colArr: Float32Array } {
    const target = new Float32Array(particleCount * 3);
    const vels = new Float32Array(particleCount * 3);
    const colArr = new Float32Array(particleCount * 3);

    const c1 = new THREE.Color(primaryHex);
    const c2 = new THREE.Color(secondaryHex);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      let x = 0, y = 0, z = 0;
      let vx = 0, vy = 0, vz = 0;
      let colorRatio = 0.5;

      switch (preset) {
        case 'hearts': {
          // Mathematical 3D Solid Heart
          const t = Math.random() * Math.PI * 2;
          const u = Math.random() * Math.PI;
          const p = Math.pow(Math.random(), 0.6); // Volume density
          
          // Parametric heart formula
          x = 2.0 * Math.pow(Math.sin(t), 3) * Math.sin(u) * p;
          y = (2.0 * Math.cos(t) - 0.7 * Math.cos(2 * t) - 0.3 * Math.cos(3 * t) - 0.1 * Math.cos(4 * t)) * p;
          // Flatten depth slightly to match a perfect 3D heart symbol
          z = 1.0 * (Math.random() - 0.5) * Math.sin(t) * p;

          // Rotate heart to stand upright in Three.js
          const oldY = y;
          y = oldY * 0.8 + 0.3; // align center
          z = z;

          // Velocity is smooth breathing
          vx = (Math.random() - 0.5) * 0.15;
          vy = (Math.random() - 0.5) * 0.15;
          vz = (Math.random() - 0.5) * 0.15;

          // Color ratio from bottom to top
          colorRatio = (y + 1) / 2;
          break;
        }

        case 'flowers': {
          // Dahlia / Lotus design of Petals using sunflower spiral and Rose curve (k = 5)
          const angle = i * 0.1 // golden angle distribution
                + (Math.random() - 0.5) * 0.05;
          const r = Math.sqrt(i / particleCount) * 2.2;
          const petals = 6;
          // Petal sculpting
          const petalSculpt = Math.abs(Math.sin(angle * (petals / 2)));
          const radiusScale = 0.3 + 0.7 * petalSculpt;
          const finalR = r * radiusScale;

          x = Math.cos(angle) * finalR;
          z = Math.sin(angle) * finalR;
          // Flower bowl curving
          y = -0.5 + (r * r * 0.25) + (Math.random() - 0.5) * 0.06;

          vx = -Math.sin(angle) * 0.1 * finalR;
          vy = 0;
          vz = Math.cos(angle) * 0.1 * finalR;

          // Primary flower color in center, secondary on tips
          colorRatio = r / 2.2;
          break;
        }

        case 'saturn': {
          // Saturn: 70% rings, 30% sphere
          if (i < particleCount * 0.3) {
            // Planet sphere (30%)
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const radius = 0.5 + Math.random() * 0.05;

            x = radius * Math.sin(phi) * Math.cos(theta);
            y = radius * Math.sin(phi) * Math.sin(theta);
            z = radius * Math.cos(phi);

            vx = -Math.sin(theta) * 0.15;
            vy = 0;
            vz = Math.cos(theta) * 0.15;

            colorRatio = 0.1; // Central planet has primary base color
          } else {
            // Rings (70%)
            const theta = Math.random() * Math.PI * 2;
            const innerRadius = 0.9;
            const outerRadius = 2.4;
            // Introduce concentric gaps inside Saturn's rings
            let radius = innerRadius + Math.random() * (outerRadius - innerRadius);
            
            // Add bands
            const isGap = Math.sin(radius * 16.0) < -0.4;
            if (isGap) {
              radius += 0.1;
            }

            x = Math.cos(theta) * radius;
            y = (Math.random() - 0.5) * 0.04; // completely flat
            z = Math.sin(theta) * radius;

            // Planet rings rotate along central gravity
            vx = -Math.sin(theta) * 0.3 * (1.5 / radius);
            vy = 0;
            vz = Math.cos(theta) * 0.3 * (1.5 / radius);

            // Ring color bands
            colorRatio = 0.4 + 0.6 * ((radius - innerRadius) / (outerRadius - innerRadius));
          }
          break;
        }

        case 'galaxy': {
          // Logarithmic spiral arms
          const arms = 2;
          const armIndex = i % arms;
          const tVal = Math.pow(Math.random(), 1.3); // stars more concentrated in core
          const theta = tVal * 6.8 + (armIndex * ((Math.PI * 2) / arms));
          const baseRadius = 0.15 + tVal * 2.5;

          const spread = 0.14 * (1.2 - tVal * 0.5) * (Math.random() - 0.5) * 3;

          x = Math.cos(theta) * baseRadius + Math.sin(theta) * spread;
          z = Math.sin(theta) * baseRadius - Math.cos(theta) * spread;
          // central core bulge
          y = (Math.random() - 0.5) * 0.3 * (1.2 - tVal * 1.1);

          // Keplerian orbital rate (faster in inner core)
          const orbitSpeed = 0.5 / (baseRadius + 0.2);
          vx = -Math.sin(theta) * orbitSpeed;
          vy = 0;
          vz = Math.cos(theta) * orbitSpeed;

          // Galactic core is brilliant white/primary, tips are secondary
          colorRatio = tVal;
          break;
        }

        case 'fireworks': {
          // Explosive burst shells (dynamic vectors radiating from core)
          const u = Math.random();
          const v = Math.random();
          const theta = u * 2.0 * Math.PI;
          const phi = Math.acos(2.0 * v - 1.0);
          
          // Initial coordinate compacted near core
          const initialSize = 0.05 + Math.random() * 0.05;
          x = initialSize * Math.sin(phi) * Math.cos(theta);
          y = initialSize * Math.sin(phi) * Math.sin(theta);
          z = initialSize * Math.cos(phi);

          // Kinetic explosion speed
          const blastSpeed = 0.6 + Math.pow(Math.random(), 2) * 2.4;
          vx = blastSpeed * Math.sin(phi) * Math.cos(theta);
          vy = blastSpeed * Math.sin(phi) * Math.sin(theta) + 0.3; // slight upward velocity
          vz = blastSpeed * Math.cos(phi);

          colorRatio = Math.random();
          break;
        }
      }

      // Assign target positions
      target[idx] = x;
      target[idx + 1] = y;
      target[idx + 2] = z;

      // Assign velocities
      vels[idx] = vx;
      vels[idx + 1] = vy;
      vels[idx + 2] = vz;

      // Blend secondary and primary colors, or use multicolored spectrum for Saturn rings
      let activeColor;
      if (preset === 'saturn' && i >= particleCount * 0.3) {
        // Saturn rings: different colors! Create spectacular concentric multi-colored bands
        const radius = Math.sqrt(x * x + z * z);
        const normRadius = (radius - 0.9) / 1.5; // innerRadius is 0.9, outerRadius is 2.4
        const hue = (normRadius * 0.85 + 0.05) % 1.0; // Dynamic shifting hue across rings
        activeColor = new THREE.Color().setHSL(hue, 0.95, 0.55);
      } else {
        activeColor = c1.clone().lerp(c2, colorRatio);
      }
      colArr[idx] = activeColor.r;
      colArr[idx + 1] = activeColor.g;
      colArr[idx + 2] = activeColor.b;
    }

    return { target, vels, colArr };
  }

  // Trigger Morphing Sequence when presets or colors modify
  const prevPresetRef = useRef<PresetType | null>(null);
  const prevPrimaryColorRef = useRef<string | null>(null);
  const prevSecondaryColorRef = useRef<string | null>(null);

  useEffect(() => {
    const isNewPreset = prevPresetRef.current !== config.preset;
    const isNewPrimary = prevPrimaryColorRef.current !== config.primaryColor;
    const isNewSecondary = prevSecondaryColorRef.current !== config.secondaryColor;

    if (isNewPreset || isNewPrimary || isNewSecondary) {
      const { target, vels, colArr } = generateCoordinatesForPreset(
        config.preset,
        config.primaryColor,
        config.secondaryColor
      );

      // Save targets for active interpolation
      targetPositionsRef.current = target;
      velocitiesRef.current = vels;
      colorsRef.current = colArr;
      
      // Update local storage models
      prevPresetRef.current = config.preset;
      prevPrimaryColorRef.current = config.primaryColor;
      prevSecondaryColorRef.current = config.secondaryColor;

      // Reset morph clock
      morphProgressRef.current = 0.0;
    }
  }, [config.preset, config.primaryColor, config.secondaryColor]);

  // Main ThreeJS Setup & Controls
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create scene with soft environment glow
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c0f1d, 0.015);
    sceneRef.current = scene;

    // Camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    camera.position.set(0, 1.8, 4.2);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2 for performance
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x060814, 1);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 15;
    controls.minDistance = 1;
    controlsRef.current = controls;

    // Technical Axis grid if requested
    const axesHelper = new THREE.AxesHelper(1.5);
    axesRef.current = axesHelper;
    if (showAxes) scene.add(axesHelper);

    // Initial Coordinates
    const { target, vels, colArr } = generateCoordinatesForPreset(
      configRef.current.preset,
      configRef.current.primaryColor,
      configRef.current.secondaryColor
    );

    positionsRef.current = new Float32Array(target);
    targetPositionsRef.current = target;
    velocitiesRef.current = vels;
    colorsRef.current = colArr;
    initialColorsRef.current = new Float32Array(colArr);

    // Physics Lifetimes (used primarily in Fireworks and other presets)
    const lifetimes = new Float32Array(particleCount);
    const maxLifetimes = new Float32Array(particleCount);
    const burstOffsets = new Float32Array(particleCount);
    const phase = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      lifetimes[i] = Math.random() * 2;
      maxLifetimes[i] = 1.5 + Math.random() * 2.5;
      burstOffsets[i] = Math.random() * Math.PI * 2;
      phase[i] = Math.random() * 100.0;
    }
    physicsDataRef.current = { lifetimes, maxLifetimes, burstOffsets, phase };

    // Geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positionsRef.current, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorsRef.current, 3));
    geometryRef.current = geometry;

    // Material with custom generated star sprite and additive blending
    const texture = createParticleTexture();
    const material = new THREE.PointsMaterial({
      size: configRef.current.size || 0.05,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false, // Prevents black block overlays
    });

    // Create system
    const points = new THREE.Points(geometry, material);
    pointsRef.current = points;
    scene.add(points);

    // Responsive Resizing using ResizeObserver
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      rendererRef.current.setSize(width, height);
      
      const pCamera = cameraRef.current as THREE.PerspectiveCamera;
      pCamera.aspect = width / height;
      pCamera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Animation Loop
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsInterval = lastTime;
    let clock = new THREE.Clock();

    let reqId: number;

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Measure FPS
      const currentTime = performance.now();
      frameCount++;
      if (currentTime - fpsInterval >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - fpsInterval)));
        frameCount = 0;
        fpsInterval = currentTime;
      }

      if (!isPlaying) {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        return;
      }

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Compute gesture scaling and tension variables
      // Let's resolve what mode is playing: Webcam AI tracking or fallback Manual Simulation
      let scaleTarget = 1.0;
      let leftHandClose = 0.0;
      let rightHandClose = 0.0;
      let hasLeftHand = false;
      let hasRightHand = false;
      let handCenter = new THREE.Vector3(0, 0, 0);

      const tracking = trackingRef.current;
      const sim = isSimulatingRef.current;
      const manual = manualInputsRef.current;

      if (!sim && tracking) {
        if (tracking.leftHand && tracking.rightHand && tracking.handDistance != null) {
          // Both hands detected: Scale & Dispersal
          // HandDistance goes from 0.1 to 1.5. Let's map it smoothly to 0.4 - 3.5 scale multiplier
          scaleTarget = Math.max(0.3, Math.min(4.0, tracking.handDistance * 2.8));
          leftHandClose = tracking.leftHand.closing;
          rightHandClose = tracking.rightHand.closing;
          hasLeftHand = true;
          hasRightHand = true;

          // Draw an average center from coordinates (mirrored coordinates matched to ThreeJS axes)
          const lX = (tracking.leftHand.x - 0.5) * 4.0;
          const lY = -(tracking.leftHand.y - 0.5) * 3.0;
          const rX = (tracking.rightHand.x - 0.5) * 4.0;
          const rY = -(tracking.rightHand.y - 0.5) * 3.0;
          handCenter.set((lX + rX) / 2, (lY + rY) / 2, 0);
        } else if (tracking.leftHand) {
          // Single left hand
          leftHandClose = tracking.leftHand.closing;
          scaleTarget = 1.0 + (1.0 - leftHandClose) * 1.5; // open expands, close scales down
          hasLeftHand = true;
          handCenter.set((tracking.leftHand.x - 0.5) * 4.0, -(tracking.leftHand.y - 0.5) * 3.0, 0);
        } else if (tracking.rightHand) {
          // Single right hand
          rightHandClose = tracking.rightHand.closing;
          scaleTarget = 1.0 + (1.0 - rightHandClose) * 1.5;
          hasRightHand = true;
          handCenter.set((tracking.rightHand.x - 0.5) * 4.0, -(tracking.rightHand.y - 0.5) * 3.0, 0);
        }
      } else {
        // Fallback Manual coordinates (Sliders / Inputs)
        scaleTarget = manual.manualScale;
        leftHandClose = manual.manualTension; // Map tension to Left hand closure
        rightHandClose = manual.manualTension * 0.8; // Blend right hand
      }

      // Smoothly morph system scale based on hand inputs
      if (pointsRef.current) {
        const targetMultiplier = scaleTarget;
        const currentScale = pointsRef.current.scale.x;
        const newScale = currentScale + (targetMultiplier - currentScale) * 0.1; // Smooth damp
        pointsRef.current.scale.set(newScale, newScale, newScale);
      }

      // Progress morph transitions among presets
      if (morphProgressRef.current < 1.0) {
        morphProgressRef.current = Math.min(1.0, morphProgressRef.current + delta * 2.2); // Morph duration ~ 0.5 seconds
      }

      // Update particle physics matrix
      const positions = positionsRef.current;
      const targetPositions = targetPositionsRef.current;
      const velocities = velocitiesRef.current;
      const colors = colorsRef.current;
      const phys = physicsDataRef.current;

      if (positions && targetPositions && velocities && colors && phys) {
        const pSize = particleCount;
        const speedMultiplier = (configRef.current.speed || 1.0) * (1.0 + rightHandClose * 2.5) * (sim ? manual.manualSpeed : 1.0);
        const morphProgress = morphProgressRef.current;

        // Detect sudden hand/slider expansion to trigger explosive bursts!
        const scaleDiff = scaleTarget - prevScaleTargetRef.current;
        prevScaleTargetRef.current = scaleTarget;

        // Decay explosion-driven velocity boost
        explosionBoostRef.current = Math.max(0.0, explosionBoostRef.current - delta * 3.5);

        if (scaleDiff > 0.04 && configRef.current.preset === 'fireworks') {
          // Explode! Boost velocities and reset lifetimes to launch a fresh blast outwards
          explosionBoostRef.current = Math.min(3.5, explosionBoostRef.current + scaleDiff * 8.0 + 1.2);
          for (let i = 0; i < pSize; i++) {
            if (Math.random() < 0.75) {
              phys.lifetimes[i] = 0;
            }
          }
        }

        for (let i = 0; i < pSize; i++) {
          const idx = i * 3;

          // 1. Morph interpolation from old positions to preset targets
          let tx = targetPositions[idx];
          let ty = targetPositions[idx + 1];
          let tz = targetPositions[idx + 2];

          // 2. Custom mathematical preset behaviors
          const activePreset = configRef.current.preset;

          if (activePreset === 'hearts') {
            // Beating heart pulse logic
            const beatRate = 4.2 + rightHandClose * 4.0;
            const sizePulse = 1.0 + Math.sin(time * beatRate) * 0.08 * (1.0 - leftHandClose);
            tx *= sizePulse;
            ty *= sizePulse;
            tz *= sizePulse;

            // Tension causes particles to drift away wildly
            if (leftHandClose > 0.01) {
              const turbulence = leftHandClose * 0.45;
              tx += Math.sin(time + phys.phase[i]) * turbulence;
              ty += Math.cos(time * 0.8 + phys.phase[i]) * turbulence;
              tz += Math.sin(time * 1.2 + phys.phase[i]) * turbulence;
            }
          } 
          else if (activePreset === 'flowers') {
            // Flowers petals sway elegantly like a wind
            const swayRate = 1.0 + rightHandClose * 2;
            const sway = Math.sin(time * 1.5 + tx * 3) * 0.08 * swayRate;
            tx += sway;
            tz += Math.cos(time + tz * 3) * 0.08 * swayRate;

            // Bloom when I zoom!
            // Under normal scale (scaleTarget = 1.2), keep it balanced.
            const zoomMultiplier = scaleTarget; // typical baseline is around 1.0 to 1.2
            const bloomScale = Math.max(0.15, zoomMultiplier / 1.2);

            // Dynamically scale/spread petals outward based on bloomState
            tx *= bloomScale;
            tz *= bloomScale;

            // Adjust vertical folding based on bloomState:
            // a closed flower bud goes high and upright (conic structure).
            // A fully opened/bloomed flower is wider and flatter or curved slightly down.
            const petalHeight = Math.sqrt(tx * tx + tz * tz);
            const bloomFoldY = (1.2 - zoomMultiplier) * 0.25;
            ty += petalHeight * bloomFoldY;

            // Close hands draws petals into a tight bud, open hands expands them
            const flowTension = leftHandClose * 0.8;
            tx *= (1.0 - flowTension);
            tz *= (1.0 - flowTension);
            ty += leftHandClose * 0.25; // rise up slightly
          } 
          else if (activePreset === 'saturn') {
            // Saturn ring rotations
            const orbitMultiplier = speedMultiplier * 0.2;
            
            // Sphere vs rings check
            if (i >= pSize * 0.3) {
              // It's a ring particle! Shift rotation.
              const angle = time * orbitMultiplier * (2.0 / (Math.sqrt(tx*tx + tz*tz) + 0.1)) + phys.burstOffsets[i];
              const ringRadius = Math.sqrt(targetPositions[idx] * targetPositions[idx] + targetPositions[idx + 2] * targetPositions[idx + 2]);
              tx = Math.cos(angle) * ringRadius;
              tz = Math.sin(angle) * ringRadius;

              // Left Hand Close curls rings up/down into high 3D waves (warp gravitational field!)
              if (leftHandClose > 0.05) {
                ty = Math.sin(ringRadius * 4.0 + time * 3.0) * 0.28 * leftHandClose;
              } else {
                ty = targetPositions[idx + 1];
              }
            } else {
              // central planet sphere breathing
              const sphereA = time * orbitMultiplier * 0.5 + phys.burstOffsets[i];
              const radius = Math.sqrt(targetPositions[idx]*targetPositions[idx] + targetPositions[idx + 1]*targetPositions[idx + 1] + targetPositions[idx + 2]*targetPositions[idx + 2]);
              tx = Math.cos(sphereA) * Math.sin(phys.phase[i]) * radius;
              ty = Math.sin(sphereA) * Math.sin(phys.phase[i]) * radius;
              tz = Math.cos(phys.phase[i]) * radius;
            }
          } 
          else if (activePreset === 'galaxy') {
            // Galaxy spiral rotations
            const angularRate = speedMultiplier * 0.22;
            const radius = Math.sqrt(targetPositions[idx] * targetPositions[idx] + targetPositions[idx + 2] * targetPositions[idx + 2]) + 0.1;
            // Keplers rotation speed law
            const velocityAngle = time * angularRate * (1.2 / radius) + phys.burstOffsets[i];

            tx = Math.cos(velocityAngle) * radius;
            tz = Math.sin(velocityAngle) * radius;

            // Gravitational suction if hands close: galaxies spiral deeply into black hole center!
            if (leftHandClose > 0.05) {
              const drawFactor = 1.0 - leftHandClose * 0.7;
              tx *= drawFactor;
              tz *= drawFactor;
              ty += Math.sin(time + radius * 5) * 0.18 * leftHandClose; // spiral storms!
            } else {
              ty = targetPositions[idx + 1];
            }
          } 
          else if (activePreset === 'fireworks') {
            // Fireworks dynamic projectile physics
            phys.lifetimes[i] += delta * speedMultiplier;

            if (phys.lifetimes[i] >= phys.maxLifetimes[i] || phys.lifetimes[i] === 0) {
              // Reset particle at shell core
              phys.lifetimes[i] = Math.max(0.01, phys.lifetimes[i]);
              positions[idx] = targetPositions[idx];
              positions[idx + 1] = targetPositions[idx + 1];
              positions[idx + 2] = targetPositions[idx + 2];
            }

            // Fly outwards based on speed velocity vector, amplified by rapid hand expansion
            const speedBoost = 1.0 + explosionBoostRef.current;
            const vx = velocities[idx] * speedMultiplier * 0.4 * speedBoost;
            const vy = (velocities[idx + 1] * 0.4 * speedBoost - delta * 0.18) * speedMultiplier; // gravity drop!
            const vz = velocities[idx + 2] * speedMultiplier * 0.4 * speedBoost;

            positions[idx] += vx * delta;
            positions[idx + 1] += vy * delta;
            positions[idx + 2] += vz * delta;

            // If Left hand closes, apply suction pulling fireworks together (charge state!)
            if (leftHandClose > 0.1) {
              const pullX = (0 - positions[idx]) * leftHandClose * 0.12;
              const pullY = (0.2 - positions[idx + 1]) * leftHandClose * 0.12;
              const pullZ = (0 - positions[idx + 2]) * leftHandClose * 0.12;
              positions[idx] += pullX;
              positions[idx + 1] += pullY;
              positions[idx + 2] += pullZ;
            }

            // Fireworks skip the preset morph transition to maintain physics trajectory
            continue; 
          }

          // Apply standard coordinate morph blending to positions
          const cx = positions[idx];
          const cy = positions[idx + 1];
          const cz = positions[idx + 2];

          positions[idx] = cx + (tx - cx) * morphProgress * 0.2;
          positions[idx + 1] = cy + (ty - cy) * morphProgress * 0.2;
          positions[idx + 2] = cz + (tz - cz) * morphProgress * 0.2;

          // 3. Magnetic pull towards Hand center (Magic Wand effect!)
          // It only trigger if hands are actively detected
          if ((hasLeftHand || hasRightHand) && !sim) {
            const dx = handCenter.x - positions[idx];
            const dy = handCenter.y - positions[idx + 1];
            const dz = handCenter.z - positions[idx + 2];
            const distToHand = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // If hand is within threshold, pull them gently to orbit
            if (distToHand < 1.8) {
              const pullPower = (1.8 - distToHand) * 0.12;
              positions[idx] += dx * pullPower;
              positions[idx + 1] += dy * pullPower;
              positions[idx + 2] += dz * pullPower;
            }
          }
        }

        // Fast update points geometry
        if (geometryRef.current) {
          geometryRef.current.attributes.position.needsUpdate = true;
          
          // Smooth blend Colors changes if colors update
          const geometryCols = geometryRef.current.attributes.color.array as Float32Array;
          for (let c = 0; c < colors.length; c++) {
            geometryCols[c] += (colors[c] - geometryCols[c]) * 0.15;
          }
          geometryRef.current.attributes.color.needsUpdate = true;
        }
      }

      // Update material variables
      if (pointsRef.current) {
        const mat = pointsRef.current.material as THREE.PointsMaterial;
        mat.size = configRef.current.size * (1.0 + leftHandClose * 0.4); // scale particle size slightly on hand tension!
      }

      // Update controllers
      if (controlsRef.current) controlsRef.current.update();

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();

      // Memory Clean-ups
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
      if (pointsRef.current) {
        const mat = pointsRef.current.material as THREE.Material;
        mat.dispose();
      }
      texture.dispose();
    };
  }, [isPlaying]);

  // Handle toggling of Axes Helper
  useEffect(() => {
    const scene = sceneRef.current;
    const ax = axesRef.current;
    if (!scene || !ax) return;

    if (showAxes) {
      scene.add(ax);
    } else {
      scene.remove(ax);
    }
  }, [showAxes]);

  // Handle resetting the camera / controls orientation
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 1.8, 4.2);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div id="particle-system-canvas-container" ref={containerRef} className="relative w-full h-full min-h-[400px] md:min-h-[500px] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Floating System HUD Panel */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1 text-[11px] font-mono select-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 shadow-md flex flex-col gap-1 tracking-wide text-slate-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-200 font-bold uppercase shrink-0">VFX HUD Status</span>
            <span className="text-cyan-400 font-bold">{fps} FPS</span>
          </div>
          <div className="h-[1px] bg-slate-800 my-1"/>
          <div className="flex flex-col gap-0.5">
            <span>Core: <b className="text-slate-100 font-bold">{particleCount.toLocaleString()} particles</b></span>
            <span>Scale: <b className="text-slate-100 font-bold">{(pointsRef.current?.scale.x || 1.0).toFixed(2)}x</b></span>
            <span>Morph: <b className="text-slate-100 font-bold">{Math.round(morphProgressRef.current * 100)}%</b></span>
            <span>Preset: <b className="text-emerald-400 font-bold capitalize">{config.preset}</b></span>
          </div>
        </div>
      </div>

      {/* Interactive HUD guidelines */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none text-xs font-sans text-slate-400 animate-pulse bg-slate-900/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800/40 hidden md:block select-none">
        💡 Drag cursor on canvas to pan & rotate particle clusters in 3D Space.
      </div>

      {/* Bottom Right Simulation Control Bars */}
      <div className="absolute bottom-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700/50 text-slate-300 backdrop-blur-md shadow transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title={isPlaying ? "Pause system" : "Resume system"}
        >
          {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          onClick={resetCamera}
          className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700/50 text-slate-300 backdrop-blur-md shadow transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title="Reset viewpoint angle"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={() => setShowAxes(!showAxes)}
          className="p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700/50 text-slate-300 backdrop-blur-md shadow transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center"
          title={showAxes ? "Hide reference axes plane" : "Show reference axes plane"}
        >
          {showAxes ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </div>
  );
}
