import { useRef, useState, useCallback, useEffect } from "react";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export function WebcamCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActive(true);
    } catch {
      setError("Camera access denied or not available. Please allow camera permission and try again.");
    }
  }

  function handleVideoReady() {
    setReady(true);
    videoRef.current?.play();
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.85);

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    stopStream();
    setActive(false);
    setReady(false);
    setPreview(url);
    onCapture(url);
  }, [onCapture]);

  function retake() {
    setPreview(null);
    onCapture("");
    startCamera();
  }

  function cancel() {
    stopStream();
    setActive(false);
    setReady(false);
  }

  useEffect(() => {
    return () => stopStream();
  }, []);

  if (preview) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative">
          <img src={preview} alt="Visitor" className="w-full rounded-xl object-cover border border-gray-200" style={{ maxHeight: 280 }} />
          <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Captured</span>
        </div>
        <button type="button" onClick={retake} className="btn-secondary">
          Retake Photo
        </button>
      </div>
    );
  }

  if (active) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative rounded-xl overflow-hidden bg-black" style={{ minHeight: 220 }}>
          <video
            ref={videoRef}
            onCanPlay={handleVideoReady}
            playsInline
            muted
            className="w-full object-cover"
            style={{ maxHeight: 320 }}
          />
          {flash && <div className="absolute inset-0 bg-white opacity-80 pointer-events-none" />}
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Starting camera…
            </div>
          )}
          {ready && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={capture}
                className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                aria-label="Take photo"
              >
                <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-400" />
              </button>
            </div>
          )}
        </div>
        <button type="button" onClick={cancel} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="button" onClick={startCamera} className="btn-secondary">
        Open Camera
      </button>
    </div>
  );
}
