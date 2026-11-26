import { isPdfFile } from "./fileValidation";

export interface DocumentQualityFeedback {
  isSharp: boolean;
  isNoGlare: boolean;
  areEdgesVisible: boolean;
  isLightingAdequate: boolean;
  isOrientationCorrect: boolean;
  isPdfUpload: boolean;
  meanLuminance: number;
  glareRatio: number;
  issues: string[];
  isCompliant: boolean;
}

/**
 * Pure volatile in-memory quality check mirroring Flutter's DocumentQualityAnalyzer.
 * Evaluates PDF header magic bytes or decoded image canvas luminance, glare, and
 * edge contrast without persisting image data anywhere in browser storage.
 */
export async function analyzeDocumentFileQuality(
  file: File
): Promise<DocumentQualityFeedback> {
  if (!file || file.size === 0) {
    return {
      isSharp: false,
      isNoGlare: false,
      areEdgesVisible: false,
      isLightingAdequate: false,
      isOrientationCorrect: false,
      isPdfUpload: false,
      meanLuminance: 0,
      glareRatio: 0,
      issues: ["Captured file or image buffer is empty."],
      isCompliant: false,
    };
  }

  if (isPdfFile(file)) {
    try {
      const headerBuffer = await file.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(headerBuffer);
      const hasPdfSignature =
        bytes.length >= 4 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46;

      if (!hasPdfSignature) {
        return {
          isSharp: false,
          isNoGlare: true,
          areEdgesVisible: false,
          isLightingAdequate: true,
          isOrientationCorrect: true,
          isPdfUpload: true,
          meanLuminance: 128,
          glareRatio: 0,
          issues: ["Uploaded PDF appears invalid or corrupted."],
          isCompliant: false,
        };
      }

      return {
        isSharp: true,
        isNoGlare: true,
        areEdgesVisible: true,
        isLightingAdequate: true,
        isOrientationCorrect: true,
        isPdfUpload: true,
        meanLuminance: 128,
        glareRatio: 0,
        issues: [],
        isCompliant: true,
      };
    } catch {
      return {
        isSharp: false,
        isNoGlare: true,
        areEdgesVisible: false,
        isLightingAdequate: true,
        isOrientationCorrect: true,
        isPdfUpload: true,
        meanLuminance: 128,
        glareRatio: 0,
        issues: ["Could not read uploaded PDF header."],
        isCompliant: false,
      };
    }
  }

  if (typeof document === "undefined" || typeof URL === "undefined") {
    return {
      isSharp: true,
      isNoGlare: true,
      areEdgesVisible: true,
      isLightingAdequate: true,
      isOrientationCorrect: true,
      isPdfUpload: false,
      meanLuminance: 128,
      glareRatio: 0,
      issues: [],
      isCompliant: true,
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageEl = new Image();
      imageEl.onload = () => resolve(imageEl);
      imageEl.onerror = () => reject(new Error("Image decode error"));
      imageEl.src = objectUrl;
    });

    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;

    if (naturalW < 200 || naturalH < 140) {
      return {
        isSharp: false,
        isNoGlare: true,
        areEdgesVisible: false,
        isLightingAdequate: true,
        isOrientationCorrect: naturalW >= naturalH * 0.65,
        isPdfUpload: false,
        meanLuminance: 128,
        glareRatio: 0,
        issues: [
          "Image resolution is low. Move closer and ensure full document edges are clear.",
        ],
        isCompliant: false,
      };
    }

    const targetW = Math.min(320, naturalW);
    const targetH = Math.max(40, Math.round((naturalH / naturalW) * targetW));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      canvas.width = 0;
      canvas.height = 0;
      return {
        isSharp: true,
        isNoGlare: true,
        areEdgesVisible: true,
        isLightingAdequate: true,
        isOrientationCorrect: true,
        isPdfUpload: false,
        meanLuminance: 128,
        glareRatio: 0,
        issues: [],
        isCompliant: true,
      };
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;
    const pixelCount = targetW * targetH;
    const luma = new Float32Array(pixelCount);

    let totalLuma = 0;
    let blownOut = 0;

    for (let i = 0; i < pixelCount; i += 1) {
      const offset = i * 4;
      const y =
        0.299 * data[offset] +
        0.587 * data[offset + 1] +
        0.114 * data[offset + 2];
      luma[i] = y;
      totalLuma += y;
      if (y > 246) blownOut += 1;
    }

    // Immediate canvas memory cleanup
    ctx.clearRect(0, 0, targetW, targetH);
    canvas.width = 0;
    canvas.height = 0;

    let edgeDiffSum = 0;
    let edgeSamples = 0;
    for (let y = 1; y < targetH - 1; y += 2) {
      for (let x = 1; x < targetW - 1; x += 2) {
        const idx = y * targetW + x;
        const dx = Math.abs(luma[idx] - luma[idx - 1]);
        const dy = Math.abs(luma[idx] - luma[idx - targetW]);
        edgeDiffSum += dx + dy;
        edgeSamples += 1;
      }
    }

    const meanLuminance = totalLuma / pixelCount;
    const glareRatio = blownOut / pixelCount;
    const avgEdgeContrast = edgeSamples > 0 ? edgeDiffSum / edgeSamples : 20;

    const isLightingAdequate = meanLuminance >= 48 && meanLuminance <= 238;
    const isNoGlare = glareRatio <= 0.22;
    const isSharp = avgEdgeContrast >= 6.5;
    const areEdgesVisible = naturalW >= 320 && naturalH >= 200;
    const isOrientationCorrect = true;

    const issues: string[] = [];
    if (!isLightingAdequate) {
      issues.push(
        meanLuminance < 48
          ? "Document photo is too dark. Move to brighter, even lighting."
          : "Document photo appears overexposed."
      );
    }
    if (!isNoGlare) {
      issues.push("Bright flash glare detected. Tilt the card slightly or turn off flash.");
    }
    if (!isSharp) {
      issues.push("Text appears soft or blurry. Hold steady before capturing.");
    }

    return {
      isSharp,
      isNoGlare,
      areEdgesVisible,
      isLightingAdequate,
      isOrientationCorrect,
      isPdfUpload: false,
      meanLuminance,
      glareRatio,
      issues,
      isCompliant:
        isSharp &&
        isNoGlare &&
        areEdgesVisible &&
        isLightingAdequate &&
        isOrientationCorrect,
    };
  } catch {
    return {
      isSharp: false,
      isNoGlare: true,
      areEdgesVisible: false,
      isLightingAdequate: true,
      isOrientationCorrect: true,
      isPdfUpload: false,
      meanLuminance: 0,
      glareRatio: 0,
      issues: ["Unable to decode image preview. Try another JPG/PNG or PDF."],
      isCompliant: false,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
