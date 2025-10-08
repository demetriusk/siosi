import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export async function loadFaceDetectionModels(): Promise<void> {
  if (modelsLoaded) return;

  try {
    // Simple path - middleware now excludes /models/ from locale routing
    const MODEL_URL = '/models';
    
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log('✓ Face detection models loaded');
  } catch (error) {
    console.error('Failed to load face detection models:', error);
    throw new Error('Failed to initialize face detection');
  }
}

export interface FaceValidationResult {
  valid: boolean;
  error?: string;
  errorType?: 'no_face' | 'multiple_faces' | 'face_too_small' | 'profile_view' | 'blurry' | 'too_dark';
  faceCount?: number;
  faceRatio?: number;
  confidence?: number;
}

export async function validateFacePhoto(file: File): Promise<FaceValidationResult> {
  try {
    // Ensure models are loaded
    await loadFaceDetectionModels();

    // Convert file to image
    const img = await createImageFromFile(file);

    // Detect faces with landmarks using SSD MobileNet
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.5
      }))
      .withFaceLandmarks();

    // Check 1: No face detected
    if (detections.length === 0) {
      return {
        valid: false,
        error: 'No face detected in the photo',
        errorType: 'no_face',
        faceCount: 0
      };
    }

    // Check 2: Multiple faces (group photo)
    if (detections.length > 1) {
      return {
        valid: false,
        error: `${detections.length} faces detected. Please upload a photo with only one face`,
        errorType: 'multiple_faces',
        faceCount: detections.length
      };
    }

    const detection = detections[0];
    const box = detection.detection.box;

    // Check 3: Face size ratio
    const faceArea = box.width * box.height;
    const imageArea = img.width * img.height;
    const faceRatio = faceArea / imageArea;

    if (faceRatio < 0.08) {
      return {
        valid: false,
        error: 'Face is too small in the photo. Please upload a closer shot',
        errorType: 'face_too_small',
        faceCount: 1,
        faceRatio: Math.round(faceRatio * 100)
      };
    }

    // Check 4: Profile view detection
    const isProfile = detectProfileView(detection.landmarks);
    if (isProfile) {
      return {
        valid: false,
        error: 'Profile view detected. Please use a front-facing photo',
        errorType: 'profile_view',
        faceCount: 1
      };
    }

    // Check 5: Image brightness (too dark)
    const brightness = await calculateBrightness(img);
    if (brightness < 0.25) {
      return {
        valid: false,
        error: 'Photo is too dark. Please use better lighting',
        errorType: 'too_dark',
        faceCount: 1
      };
    }

    // Check 6: Blur detection
    const isBlurry = await detectBlur(img, box);
    if (isBlurry) {
      return {
        valid: false,
        error: 'Photo is too blurry. Please upload a clearer image',
        errorType: 'blurry',
        faceCount: 1
      };
    }

    // All checks passed
    return {
      valid: true,
      faceCount: 1,
      faceRatio: Math.round(faceRatio * 100),
      confidence: detection.detection.score
    };

  } catch (error) {
    console.error('Face validation error:', error);
    return {
      valid: false,
      error: 'Failed to validate photo. Please try again',
      errorType: 'no_face'
    };
  }
}

// Helper: Convert File to HTMLImageElement
function createImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// Helper: Detect if face is in profile view
function detectProfileView(landmarks: faceapi.FaceLandmarks68): boolean {
  const points = landmarks.positions;
  
  // Get key facial points
  const leftEye = points[36]; // Left eye outer corner
  const rightEye = points[45]; // Right eye outer corner
  const noseTip = points[33]; // Nose tip

  // Calculate horizontal distances
  const eyeDistance = Math.abs(rightEye.x - leftEye.x);
  
  // Calculate nose position relative to eye center
  const eyeCenter = (leftEye.x + rightEye.x) / 2;
  const noseOffset = Math.abs(noseTip.x - eyeCenter);
  const noseOffsetRatio = noseOffset / eyeDistance;

  // Profile indicators:
  // - Nose is significantly offset from eye center
  // - Eye distance is very small (one eye hidden)
  const isProfile = noseOffsetRatio > 0.35 || eyeDistance < 40;

  return isProfile;
}

// Helper: Calculate image brightness
async function calculateBrightness(img: HTMLImageElement): Promise<number> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let totalBrightness = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate perceived brightness
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    totalBrightness += brightness;
  }

  return totalBrightness / pixelCount;
}

// Helper: Detect blur using Laplacian variance
async function detectBlur(img: HTMLImageElement, faceBox: faceapi.Box): Promise<boolean> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Extract face region for blur detection
  const padding = 20;
  const x = Math.max(0, faceBox.x - padding);
  const y = Math.max(0, faceBox.y - padding);
  const width = Math.min(img.width - x, faceBox.width + padding * 2);
  const height = Math.min(img.height - y, faceBox.height + padding * 2);

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to grayscale and calculate Laplacian variance
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    gray.push(avg);
  }

  let variance = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Laplacian kernel
      const laplacian = Math.abs(
        -gray[idx - width - 1] - gray[idx - width] - gray[idx - width + 1] -
        gray[idx - 1] + 8 * gray[idx] - gray[idx + 1] -
        gray[idx + width - 1] - gray[idx + width] - gray[idx + width + 1]
      );

      variance += laplacian * laplacian;
      count++;
    }
  }

  const blurScore = variance / count;
  
  // Threshold: < 100 is considered blurry
  return blurScore < 100;
}