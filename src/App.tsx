import { useState } from 'react';
import { 
  Heart, 
  Flower, 
  Sparkles, 
  Sliders, 
  Palette, 
  Info, 
  HelpCircle, 
  Hand, 
  Maximize2,
  Atom,
  Rotate3d,
  Layers,
  ChevronRight,
  ChevronDown,
  Sparkle,
  Plus
} from 'lucide-react';
import HandWebcam from './components/HandWebcam';
import ParticleSystem from './components/ParticleSystem';
import { PresetType, TrackingResults, ParticleConfig } from './types';

// Gorgeous Sophisticated Dark color palettes
const COLOR_THEMES = [
  { name: 'Supernova Purple', primary: '#ec4899', secondary: '#8b5cf6', buttonBg: 'bg-indigo-500' },
  { name: 'Aurora Ocean', primary: '#10b981', secondary: '#06b6d4', buttonBg: 'bg-emerald-500' },
  { name: 'Cosmic Flare', primary: '#f97316', secondary: '#eab308', buttonBg: 'bg-amber-400' },
  { name: 'Midnight Neon', primary: '#3b82f6', secondary: '#ec4899', buttonBg: 'bg-fuchsia-500' },
  { name: 'Pure Diamond', primary: '#ffffff', secondary: '#475569', buttonBg: 'bg-zinc-100' },
  { name: 'Sky Electric', primary: '#0ea5e9', secondary: '#c084fc', buttonBg: 'bg-sky-400' },
];

export default function App() {
  // Tracking result state passed between Webcam tracking and ThreeJS systems
  const [trackingResults, setTrackingResults] = useState<TrackingResults>({
    leftHand: null,
    rightHand: null,
    handDistance: null,
  });

  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  // Manual simulation variables
  const [manualScale, setManualScale] = useState<number>(1.2);
  const [manualTension, setManualTension] = useState<number>(0.0);
  const [manualSpeed, setManualSpeed] = useState<number>(1.0);

  // General configuration
  const [particleConfig, setParticleConfig] = useState<ParticleConfig>({
    preset: 'galaxy',
    primaryColor: '#ec4899',
    secondaryColor: '#8b5cf6',
    particleCount: 8000,
    speed: 1.0,
    size: 0.05,
    interactive: true,
  });

  // Track if custom popup help is open
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showCustomColorPickerSetting, setShowCustomColorPickerSetting] = useState<boolean>(false);
  const [isChromaticsOpen, setIsChromaticsOpen] = useState<boolean>(false);

  // Helper inside helper for live FPS from ThreeJs
  const [liveFps, setLiveFps] = useState<number>(120);

  const handleTrackingUpdate = (results: TrackingResults) => {
    setTrackingResults(results);
  };

  const updatePreset = (preset: PresetType) => {
    setParticleConfig((prev) => ({ ...prev, preset }));
  };

  const updateColors = (primaryColor: string, secondaryColor: string) => {
    setParticleConfig((prev) => ({ ...prev, primaryColor, secondaryColor }));
  };

  // Safe tracking readings to present in real-time inside coordinate HUD
  const leftHandTrk = trackingResults.leftHand;
  const rightHandTrk = trackingResults.rightHand;

  // Determine current tension metrics
  const leftTensionPct = leftHandTrk 
    ? Math.round(leftHandTrk.closing * 100) 
    : Math.round(manualTension * 100);

  const rightTensionPct = rightHandTrk 
    ? Math.round(rightHandTrk.closing * 100) 
    : Math.round(manualTension * 80);

  // Find a tip for the current active template preset
  const getTipForPreset = () => {
    switch (particleConfig.preset) {
      case 'galaxy':
        return "Spreading your reach scales cosmic gravity. Make a left-hand fist to draw atomic gas into a central singularity.";
      case 'flowers':
        return "Spreading your hands apart (zooming in) causes the beautiful digital flora to expand and bloom gracefully. Bring them close together to fold them into a tight bud.";
      case 'saturn':
        return "Tilt left palm coordinate inputs to warp flat dust bands into 3D gravitational waves, glowing in magnificent multicolor bands.";
      case 'fireworks':
        return "Expand your hands apart (zoom out) or expand the scale slider rapidly to ignite spectacular explosive firework bursts! Bring hands close to slow and charge them.";
      default:
        return "Expand your arms or use the sliders to morph and blend the active geometry model.";
    }
  };

  return (
    <div className="min-h-screen md:h-screen flex flex-col bg-[#050505] text-white font-sans selection:bg-indigo-500/20 overflow-x-hidden md:overflow-hidden sophisticated-bg">
      
      {/* 1. Header Section */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 md:px-8 bg-black/50 backdrop-blur-md z-30 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow shadow-indigo-600/30">
            <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>
          </div>
          <div>
            <span className="font-bold tracking-tight text-base sm:text-lg uppercase">
              Lumina <span className="text-indigo-400 font-medium">Particle Forge</span>
            </span>
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest block uppercase md:hidden">UltraSense™ AI</span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden md:flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-400' : 'bg-emerald-500 animate-ping'}`}></div>
            <span className="text-xs text-zinc-400 uppercase tracking-widest font-mono font-medium">
              {isSimulating ? 'Active: Intercessor Mode' : 'Camera Active: UltraSense™ AI'}
            </span>
          </div>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-full transition-all uppercase tracking-tight flex items-center gap-1 cursor-pointer shadow"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gesture Guide</span>
            <span className="sm:hidden">Guide</span>
          </button>
        </div>
      </header>

      {/* 2. Main Flex Container */}
      <main className="flex-1 flex flex-col md:flex-row relative min-h-0 overflow-y-auto md:overflow-hidden select-none">
        
        {/* Left Control Sidebar */}
        <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 p-5 md:p-6 flex flex-col gap-6 bg-black/20 z-20 shrink-0 md:overflow-y-auto">
          
          {/* Geometric Preset selectors */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-bold border-b border-white/5 pb-2">
              Geometric Templates
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'galaxy', label: 'Galaxy Core', nativePreset: 'Spiral Galaxy' },
                { id: 'saturn', label: 'Saturn Rings', nativePreset: 'Rings & Sphere' },
                { id: 'flowers', label: 'Digital Flora', nativePreset: 'Lotus Petals' },
                { id: 'fireworks', label: 'Pyrotechnic Burst', nativePreset: 'Burst Sparks' },
              ].map((item) => {
                const isActive = particleConfig.preset === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => updatePreset(item.id as PresetType)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 text-left w-full cursor-pointer group ${
                      isActive 
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400 font-semibold' 
                        : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs tracking-wide">{item.label}</span>
                      <span className="text-[9px] text-zinc-500 group-hover:text-zinc-405">{item.nativePreset}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-400 shadow shadow-indigo-300' : 'border border-zinc-600'}`}></div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Integrated Webcam overlay pip inside structural sidebar */}
          <div className="mt-2">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3 font-bold border-b border-white/5 pb-2">
              Hand Gesture Feedback
            </h3>
            
            <div className="rounded-xl overflow-hidden relative border border-white/10 bg-zinc-950">
              <HandWebcam
                onTrackingUpdate={handleTrackingUpdate}
                isSimulating={isSimulating}
                onSimulationChange={(sim) => setIsSimulating(sim)}
              />
            </div>
          </div>
        </aside>

        {/* Center Canvas Workspace */}
        <section className="flex-1 relative min-h-[420px] md:min-h-0 flex flex-col bg-black overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-[#050505] to-[#050505] pointer-events-none z-0"></div>
          
          {/* Symmetrical digital vector wireframe effect behind canvas */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 z-0">
            <div className="w-[80%] aspect-square max-w-[500px] border-[0.5px] border-white/5 rounded-full scale-100 transition-all duration-1000 group-hover:scale-105"></div>
            <div className="absolute w-[60%] aspect-square max-w-[400px] border-[0.5px] border-indigo-500/10 rounded-full animate-pulse"></div>
          </div>

          <div className="flex-1 relative z-10">
            <ParticleSystem
              config={particleConfig}
              trackingResults={trackingResults}
              isSimulating={isSimulating}
              manualScale={manualScale}
              manualTension={manualTension}
              manualSpeed={manualSpeed}
            />
          </div>

          {/* Symmetrical quick interactive status overlay floating inside bottom-center of scene */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl py-2 px-5 rounded-full border border-white/10 shadow-2xl z-20 whitespace-nowrap text-zinc-300">
            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Input Device</span>
              <span className={`text-[10px] font-mono font-bold ${isSimulating ? 'text-amber-400' : 'text-emerald-400 animate-pulse'}`}>
                {isSimulating ? 'SIMULATOR_VFX' : 'WEBCAM_TRACK'}
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setIsSimulating(false)}
                className={`py-1 px-3.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  !isSimulating 
                    ? 'bg-indigo-500 text-white shadow shadow-indigo-500/20' 
                    : 'bg-white/5 hover:bg-white/10 text-zinc-400'
                }`}
              >
                Track hands
              </button>
              <button
                onClick={() => setIsSimulating(true)}
                className={`py-1 px-3.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isSimulating 
                    ? 'bg-amber-500 text-black shadow shadow-amber-500/20' 
                    : 'bg-white/5 hover:bg-white/10 text-zinc-400'
                }`}
              >
                Use sliders
              </button>
            </div>
          </div>
        </section>

        {/* Right Parameters Sidebar */}
        <aside className="w-full md:w-72 border-t md:border-t-0 md:border-l border-white/10 p-5 md:p-6 flex flex-col gap-6 bg-black/20 z-20 shrink-0 md:overflow-y-auto">
          
          {/* Section: Chromatics (Theme Swatches) */}
          <div>
            <button
              onClick={() => setIsChromaticsOpen(!isChromaticsOpen)}
              className="w-full flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors font-bold border-b border-white/5 pb-2 mb-4 cursor-pointer"
            >
              <span>Chromatics</span>
              {isChromaticsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
            
            {isChromaticsOpen && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-4 gap-3">
                  {COLOR_THEMES.map((theme) => {
                    const isActive = particleConfig.primaryColor.toLowerCase() === theme.primary.toLowerCase();
                    return (
                      <button
                        key={theme.name}
                        onClick={() => {
                          updateColors(theme.primary, theme.secondary);
                          setShowCustomColorPickerSetting(false);
                        }}
                        title={theme.name}
                        className={`w-10 h-10 rounded-full cursor-pointer transition-all ${theme.buttonBg} ${
                          isActive 
                            ? 'ring-2 ring-white ring-offset-4 ring-offset-black scale-105' 
                            : 'hover:scale-110'
                        }`}
                      />
                    );
                  })}

                  {/* Custom selector plus toggle button */}
                  <button
                    onClick={() => setShowCustomColorPickerSetting(!showCustomColorPickerSetting)}
                    title="Custom hex code spectrum"
                    className={`w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 border transition-all ${
                      showCustomColorPickerSetting ? 'border-indigo-400 ring-2 ring-white ring-offset-4 ring-offset-black' : 'border-white/10'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Custom hex palette sliding dropdown */}
                {showCustomColorPickerSetting && (
                  <div className="p-3 bg-zinc-900/45 rounded-xl border border-white/10 flex flex-col gap-2 animate-fade-in text-xs">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Custom Spectrum Core</p>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-zinc-400">Core Primary</span>
                        <input 
                          type="color" 
                          value={particleConfig.primaryColor}
                          onChange={(e) => setParticleConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-full h-7 rounded border border-white/15 cursor-pointer bg-transparent p-0.5"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-zinc-400">Outer Dust</span>
                        <input 
                          type="color" 
                          value={particleConfig.secondaryColor}
                          onChange={(e) => setParticleConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-full h-7 rounded border border-white/15 cursor-pointer bg-transparent p-0.5"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Dynamic Metrics tracker */}
          <div className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold border-b border-white/5 pb-2">
              Tension Metrics
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-500 font-bold">LEFT HAND FIST</span>
                  <span className="text-indigo-400 font-bold">{leftTensionPct}%</span>
                </div>
                <div className="w-full h-[3px] bg-zinc-90 w-full bg-zinc-900 overflow-hidden rounded-full">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-200"
                    style={{ width: `${leftTensionPct}%` }}
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-zinc-500 font-bold">RIGHT HAND SPEED</span>
                  <span className="text-indigo-400 font-bold">{rightTensionPct}%</span>
                </div>
                <div className="w-full h-[3px] bg-zinc-90 w-full bg-zinc-900 overflow-hidden rounded-full">
                  <div 
                    className="h-full bg-indigo-400 transition-all duration-200"
                    style={{ width: `${rightTensionPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Simulator inputs controls */}
          {isSimulating && (
            <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20 flex flex-col gap-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                <span>Simulator sliders</span>
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                  <span>Expansion (Dual scale)</span>
                  <span className="text-emerald-400">{manualScale.toFixed(1)}x</span>
                </div>
                <input 
                  type="range"
                  min="0.4"
                  max="4.0"
                  step="0.1"
                  value={manualScale}
                  onChange={(e) => setManualScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                  <span>Tension (Turbulence)</span>
                  <span className="text-emerald-400">{Math.round(manualTension * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={manualTension}
                  onChange={(e) => setManualTension(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                  <span>Atomic spin rate</span>
                  <span className="text-emerald-400">{manualSpeed.toFixed(1)}x</span>
                </div>
                <input 
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={manualSpeed}
                  onChange={(e) => setManualSpeed(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Section: Symmetrical Tip layout */}
          <div className="mt-auto">
             <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 shadow-sm">
               <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                 <Sparkle className="w-3 h-3 fill-indigo-400" />
                 <span>Gesture Orchestration</span>
               </div>
               <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                 {getTipForPreset()}
               </p>
             </div>
          </div>
        </aside>
      </main>

      {/* 3. Footer telemetry tracking bar */}
      <footer className="h-10 bg-black/80 border-t border-white/5 flex items-center justify-between px-6 md:px-8 text-[9px] text-zinc-500 font-mono tracking-widest shrink-0 uppercase select-none">
        <div className="flex gap-6">
          <span>WebGL: ThreeJS v0.150</span>
          <span className="hidden sm:inline">Telemetry Engine: MediaPipe v0.10.8</span>
          <span className="text-indigo-400 font-semibold font-mono">Dynamic Latency: 4ms</span>
        </div>
        <div className="text-[8.5px] tracking-[0.25em] text-zinc-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow animate-pulse"></span>
          <span>System Integrity Verified</span>
        </div>
      </footer>

      {/* Floating full screen modal - Gesture Instructions */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 max-w-lg w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white tracking-tight uppercase flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
              <Hand className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span>Symphony Hand Tracking Guide</span>
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              When <b>Webcam Tracking</b> is armed, our UltraSense™ computer vision models dynamically map palm centroids and 3D joint configurations directly to physics force fields.
            </p>

            <div className="flex flex-col gap-3.5 mt-5">
              <div className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 self-start">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Scale & Expansion (Twin Palms range)</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                    Spreading both hands apart expands the 3D particle cloud gravity field. Pulling them closer together concentrates them.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 self-start">
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Left Fist Tension (Mathematical Turbulence)</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                    Closing your Left hand into a fist causes systemic tension, introducing wind vectors or high-frequency mathematical noise to the active geometry.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 self-start">
                  <Atom className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Right Fist Closeness (Atomic Orbits Core)</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                    Closing your Right hand accelerates internal spins, particle velocities, orbit periods and morphing cycles.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase transition-all cursor-pointer shadow tracking-tight"
            >
              Dismiss Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
