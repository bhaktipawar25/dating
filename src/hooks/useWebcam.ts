"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WebcamStatus =
  | "idle"
  | "requesting"
  | "active"
  | "permission-denied"
  | "unavailable"
  | "error";

export interface UseWebcamResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: WebcamStatus;
  errorMessage: string | null;
  startCamera: (facingMode?: "user" | "environment") => Promise<boolean>;
  stopCamera: () => void;
  capturePhoto: (options?: {
    mirror?: boolean;
    quality?: number;
  }) => Promise<Blob | null>;
}

function mapMediaError(err: unknown): {
  status: WebcamStatus;
  message: string;
} {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
      case "SecurityError":
        return {
          status: "permission-denied",
          message:
            "Camera access was denied. Enable camera permissions in your browser settings and try again.",
        };
      case "NotFoundError":
      case "DevicesNotFoundError":
      case "OverconstrainedError":
        return {
          status: "unavailable",
          message:
            "No compatible camera was found on this device. Connect a webcam or switch devices to continue.",
        };
      case "NotReadableError":
      case "TrackStartError":
        return {
          status: "error",
          message:
            "Your camera is currently in use by another application. Close other camera apps and retry.",
        };
      default:
        return {
          status: "error",
          message: "Unable to access your camera. Please check device permissions and retry.",
        };
    }
  }

  return {
    status: "error",
    message: "Unable to access your camera. Please retry.",
  };
}

export function useWebcam(): UseWebcamResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  const [status, setStatus] = useState<WebcamStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (isMountedRef.current) {
      setStatus("idle");
      setErrorMessage(null);
    }
  }, []);

  const startCamera = useCallback(
    async (facingMode: "user" | "environment" = "user"): Promise<boolean> => {
      stopCamera();

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setStatus("unavailable");
        setErrorMessage(
          "Camera capture is not supported in this browser or requires a secure HTTPS connection."
        );
        return false;
      }

      setStatus("requesting");
      setErrorMessage(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        // Prevent leaked camera stream if component unmounted during permission prompt
        if (!isMountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return false;
        }

        streamRef.current = stream;
        setStatus("active");
        return true;
      } catch (err) {
        if (!isMountedRef.current) return false;
        const mapped = mapMediaError(err);
        setStatus(mapped.status);
        setErrorMessage(mapped.message);
        return false;
      }
    },
    [stopCamera]
  );

  // Attach active MediaStream once the <video> element has mounted
  useEffect(() => {
    if (status !== "active" || !streamRef.current || !videoRef.current) {
      return;
    }

    const videoEl = videoRef.current;
    videoEl.srcObject = streamRef.current;
    videoEl.play().catch(() => {
      // Autoplay policies rarely block muted inline streams, ignore benign abort
    });
  }, [status]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const capturePhoto = useCallback(
    async (options?: {
      mirror?: boolean;
      quality?: number;
    }): Promise<Blob | null> => {
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return null;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        return null;
      }

      if (options?.mirror) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (result) => resolve(result),
          "image/jpeg",
          options?.quality ?? 0.92
        );
      });

      // Immediately clear temporary canvas image buffer
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      canvas.width = 0;
      canvas.height = 0;

      return blob;
    },
    []
  );

  return {
    videoRef,
    status,
    errorMessage,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}
