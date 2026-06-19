export type PresetType = 'hearts' | 'flowers' | 'saturn' | 'galaxy' | 'fireworks';

export interface HandData {
  present: boolean;
  x: number; // Normalized coordinates (0 to 1) from the camera
  y: number;
  z: number;
  closing: number; // Fist closure value from 0 (open) to 1 (closed)
  score: number; // Detection confidence
  handedness: 'Left' | 'Right';
}

export interface TrackingResults {
  leftHand: HandData | null;
  rightHand: HandData | null;
  handDistance: number | null; // Distance between hands if both detected
  rawLandmarks?: any;
}

export interface ParticleConfig {
  preset: PresetType;
  primaryColor: string;
  secondaryColor: string;
  particleCount: number;
  speed: number;
  size: number;
  interactive: boolean;
}
