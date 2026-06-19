import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Sparkles, AlertCircle, Info, Hand, Sliders } from 'lucide-react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { TrackingResults, HandData } from '../types';

interface HandWebcamProps {
  onTrackingUpdate: (results: TrackingResults) => void;
  isSimulating: boolean;
  onSimulationChange: (sim: boolean) => void;
}

export default function HandWebcam({ onTrackingUpdate, isSimulating, onSimulationChange }: HandWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [active, setActive] = useState<boolean>(true);
  const [modelProgress, setModelProgress] = useState<string>('Initializing...');
  
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [lastResults, setLastResults] = useState<TrackingResults>({
    leftHand: null,
    rightHand: null,
    handDistance: null
  });

  // Helper inside helper
  const distance3D = (p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }) => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
    );
  };

  // Setup MediaPipe Hand Landmarker
  useEffect(() => {
    let activeSetup = true;

    async function initMediaPipe() {
      try {
        setModelProgress('Downloading MediaPipe task vision engine...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
        );

        if (!activeSetup) return;

        setModelProgress('Loading Hand Landmarker AI Model (~5.6MB)...');
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        if (!activeSetup) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setLoading(false);
        setModelProgress('');
      } catch (err) {
        console.error('Failed to load MediaPipe:', err);
        if (activeSetup) {
          setPermissionError('Could not load AI module. Defaulting to simulation mode.');
          setLoading(false);
          onSimulationChange(true);
        }
      }
    }

    initMediaPipe();

    return () => {
      activeSetup = false;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Setup/Stop webcam streams
  useEffect(() => {
    if (isSimulating || !active || loading) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [active, isSimulating, loading]);

  async function startCamera() {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', startDetection);
      }
    } catch (err) {
      console.warn('Webcam permission denied or error:', err);
      setPermissionError('Webcam permission denied or camera is in use. Simulating hand tracking instead!');
      onSimulationChange(true);
    }
  }

  function stopCamera() {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Clean canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function startDetection() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !landmarkerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match dimensions
    if (video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    let lastVideoTime = -1;

    function detectFrame() {
      if (!video || !canvas || !ctx || isSimulating || !active) return;

      if (video.readyState >= 2) {
        const timestamp = performance.now();
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          
          try {
            const detections = landmarkerRef.current!.detectForVideo(video, timestamp);
            processAndDrawDetections(detections, ctx, canvas.width, canvas.height);
          } catch (e) {
            console.error('Detection error:', e);
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(detectFrame);
    }

    detectFrame();
  }

  function processAndDrawDetections(results: any, ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.clearRect(0, 0, width, height);

    let leftHand: HandData | null = null;
    let rightHand: HandData | null = null;

    if (results && results.landmarks && results.landmarks.length > 0) {
      results.landmarks.forEach((landmarks: any[], index: number) => {
        // Handedness: Left or Right
        // MediaPipe indices could be inverted. Let's look at the label
        const classification = results.handedness[index]?.[0];
        const rawLabel = classification?.categoryName || 'Right';
        
        // Since webcam is mirrored, we flip the raw label for natural experience
        // Or we determine by actual coordinate layout to be robust
        const wrist = landmarks[0];
        
        // Calculate fist closing
        // wrist is 0, middle finger MCP is 9
        const mcp_dist = distance3D(wrist, landmarks[9]) || 0.01;
        
        const ratio_index = distance3D(landmarks[8], landmarks[5]) / mcp_dist;
        const ratio_middle = distance3D(landmarks[12], landmarks[9]) / mcp_dist;
        const ratio_ring = distance3D(landmarks[16], landmarks[13]) / mcp_dist;
        const ratio_pinky = distance3D(landmarks[20], landmarks[17]) / mcp_dist;
        
        const average_ratio = (ratio_index + ratio_middle + ratio_ring + ratio_pinky) / 4;
        
        // Map 0.45 (fully closed fist) to 1 open (fully extended) to 1.35
        // closing: 1 = closed, 0 = open
        const closing = Math.max(0, Math.min(1, (1.3 - average_ratio) / (1.3 - 0.4)));

        // Mirror coordinates for rendering and output
        const outputHand: HandData = {
          present: true,
          x: 1 - wrist.x, // Mirror coordinate
          y: wrist.y,
          z: wrist.z,
          closing: closing,
          score: classification?.score || 0.8,
          handedness: rawLabel === 'Right' ? 'Left' : 'Right' // Invert due to mirrored camera
        };

        if (outputHand.handedness === 'Left') {
          leftHand = outputHand;
        } else {
          rightHand = outputHand;
        }

        // Draw Skeletal Overlay with neat technical colors (Glow greens/cyan)
        drawHandSkeleton(ctx, landmarks, outputHand.handedness === 'Left' ? '#06b6d4' : '#10b981');
      });
    }

    // Measure distance if two hands present
    let handDistance: number | null = null;
    if (leftHand && rightHand) {
      handDistance = Math.sqrt(
        Math.pow(leftHand.x - rightHand.x, 2) +
        Math.pow(leftHand.y - rightHand.y, 2) +
        Math.pow(leftHand.z - rightHand.z, 2)
      );
    }

    const resultObj = {
      leftHand,
      rightHand,
      handDistance
    };

    setLastResults(resultObj);
    onTrackingUpdate(resultObj);
  }

  function drawHandSkeleton(ctx: CanvasRenderingContext2D, landmarks: any[], color: string) {
    // Elegant glowing points and paths
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Draw connection paths
    const connections = [
      [0, 1, 2, 3, 4],       // Thumb
      [0, 5, 6, 7, 8],       // Index
      [5, 9, 12],            // Connect knuckles and mid finger
      [9, 10, 11, 12],       // Middle
      [9, 13, 16],           // Knuckle connect and ring
      [13, 14, 15, 16],      // Ring
      [13, 17, 20],          // Knuckle connect and pinky
      [17, 18, 19, 20],      // Pinky
      [0, 17]                // Palm base to pinky
    ];

    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    connections.forEach(path => {
      ctx.beginPath();
      path.forEach((idx, step) => {
        // Remember to mirror drawing
        const x = (1 - landmarks[idx].x) * ctx.canvas.width;
        const y = landmarks[idx].y * ctx.canvas.height;
        if (step === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });

    // Draw joint points
    ctx.shadowBlur = 4;
    landmarks.forEach((pt) => {
      const x = (1 - pt.x) * ctx.canvas.width;
      const y = pt.y * ctx.canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  return (
    <div id="webcam-tracking-container" className="relative group rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/60 shadow-xl w-full aspect-video max-w-sm mx-auto">
      {/* Video stream container */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
            active && !isSimulating && !loading ? 'opacity-75' : 'opacity-0'
          }`}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
        />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6 z-20">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin"></div>
              <Hand className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
        )}

        {/* Simulating Overlay */}
        {(isSimulating || !active) && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900/90 to-slate-950/90 text-center p-6 z-20 transition-all duration-300 border border-cyan-500/20">
            <div className="p-3 bg-cyan-950/50 rounded-2xl border border-cyan-500/20 mb-3 animate-pulse">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
        )}
      </div>

      {/* Floating Status / Mode Controls */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-700/50 text-[11px] font-medium text-slate-300">
          <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
        </div>

        <div className="flex gap-2 pointer-events-auto">
          {!loading && !permissionError && (
            <button
              id="camera_toggle_btn"
              onClick={() => {
                const nextActive = !active;
                setActive(nextActive);
                onSimulationChange(!nextActive);
              }}
              title={active ? "Disable webcam tracking" : "Enable webcam tracking"}
              className="p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-colors cursor-pointer"
            >
              {active ? <Camera className="w-4 h-4 text-emerald-400" /> : <CameraOff className="w-4 h-4 text-slate-400" />}
            </button>
          )}

          <button
            id="simulation_toggle_btn"
            onClick={() => onSimulationChange(!isSimulating)}
            title={isSimulating ? "Switch to Webcam Tracking" : "Switch to Keyboard Simulation"}
            className="p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-colors cursor-pointer"
          >
            {isSimulating ? <Camera className="w-4 h-4 text-emerald-400" /> : <Sliders className="w-4 h-4 text-amber-500 animate-pulse" />}
          </button>
        </div>
      </div>
    </div>
  );
}
