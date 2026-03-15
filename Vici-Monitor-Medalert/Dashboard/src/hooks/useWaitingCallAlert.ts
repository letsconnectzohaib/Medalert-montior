import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

const THRESHOLD = 5;

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not available
  }
}

export function useWaitingCallAlert(waitingCalls: number, soundEnabled: boolean) {
  const wasAbove = useRef(false);
  const lastAlertTime = useRef(0);

  const checkAlert = useCallback(() => {
    const now = Date.now();
    const isAbove = waitingCalls >= THRESHOLD;

    // Alert when crossing threshold or every 60s while above
    if (isAbove && (!wasAbove.current || now - lastAlertTime.current > 60000)) {
      if (soundEnabled) playAlertSound();
      toast.warning(`⚠️ ${waitingCalls} calls waiting in queue`, {
        description: "Queue exceeds threshold of 5 calls",
        duration: 8000,
      });
      lastAlertTime.current = now;
    }

    wasAbove.current = isAbove;
  }, [waitingCalls, soundEnabled]);

  useEffect(() => {
    checkAlert();
  }, [checkAlert]);

  return { isAboveThreshold: waitingCalls >= THRESHOLD };
}
