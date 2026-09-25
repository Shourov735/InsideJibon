"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslations } from "@/i18n/client";

/**
 * R9 — Proctoring runtime toolbar + lobby.
 *
 * Three lightweight signals:
 *   - fullscreen.exit  — fired when the user presses Esc or otherwise
 *                         exits fullscreen; tab-switch detection uses
 *                         `document.visibilityState === 'hidden'`.
 *   - tab.blur / focus — fired on `visibilitychange`.
 *   - webcam.start / stop / chunk — MediaRecorder uploads via signed
 *                         PUTs to R2; see `services/proctoring/webcam`.
 *
 * Each signal posts to `/api/exam-attempts/[id]/proctor/event` which
 * calls `services/proctoring/events.recordEvent`. The server-side
 * counter bumps atomically; the toolbar reflects the latest count via
 * the response payload.
 *
 * The toolbar is mounted inside `<ExamTaker>` only when the exam has at
 * least one proctoring flag enabled.
 */

type ProctorSettings = {
  fullscreenRequired: boolean;
  tabSwitchFlag: boolean;
  webcamRequired: boolean;
};

type EventKind =
  | "fullscreen.enter"
  | "fullscreen.exit"
  | "tab.blur"
  | "tab.focus"
  | "webcam.start"
  | "webcam.stop"
  | "webcam.chunk"
  | "paste"
  | "rightclick";

type RecorderStatus = "idle" | "requesting" | "recording" | "stopped" | "denied";

type ProctorToolbarProps = {
  attemptId: string;
  settings: ProctorSettings;
};

export function ProctorToolbar({ attemptId, settings }: ProctorToolbarProps) {
  const { t, tn } = useTranslations();
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [recorder, setRecorder] = useState<RecorderStatus>("idle");
  const [flagCount, setFlagCount] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);

  const sendEvent = useCallback(
    async (kind: EventKind, payload: Record<string, unknown> = {}) => {
      try {
        const res = await fetch(
          `/api/exam-attempts/${attemptId}/proctor/event`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, payload }),
          }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          flagCount: number;
          flagged: boolean;
        };
        setFlagCount(data.flagCount);
        if (data.flagged) {
          setWarning(t("proctor.runtime.flaggedWarning"));
        }
      } catch {
        /* swallow; the toolbar is best-effort. */
      }
    },
    [attemptId, t]
  );

  // --- Fullscreen ---------------------------------------------------------
  const requestFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) return;
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
      sendEvent("fullscreen.enter");
    } catch {
      // Permission denied is non-fatal — the exam still starts. We log
      // a single "denied" event so the reviewer sees it.
      sendEvent("fullscreen.exit", { reason: "denied" });
    }
  }, [sendEvent]);

  useEffect(() => {
    if (!settings.fullscreenRequired) return;
    const onChange = () => {
      const inFs = document.fullscreenElement != null;
      setFullscreen(inFs);
      if (!inFs) sendEvent("fullscreen.exit");
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [settings.fullscreenRequired, sendEvent]);

  // --- Visibility / tab switch -------------------------------------------
  useEffect(() => {
    if (!settings.tabSwitchFlag) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        sendEvent("tab.blur");
        setWarning(t("proctor.runtime.tabSwitched"));
      } else {
        sendEvent("tab.focus");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, [settings.tabSwitchFlag, sendEvent, t]);

  // --- Paste / right-click guards (light signals) -----------------------
  useEffect(() => {
    const onPaste = () => sendEvent("paste");
    const onContext = (event: MouseEvent) => {
      event.preventDefault();
      sendEvent("rightclick");
    };
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [sendEvent]);

  // --- Webcam recorder --------------------------------------------------
  const startWebcam = useCallback(async () => {
    if (!settings.webcamRequired) return;
    setRecorder("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false,
      });
      const mimeCandidates = [
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];
      const mimeType =
        mimeCandidates.find((m) =>
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(m)
        ) ?? "";
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunkIndexRef.current = 0;
      recorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0) return;
        const chunkNumber = chunkIndexRef.current++;
        const urlRes = await fetch(
          `/api/exam-attempts/${attemptId}/proctor/chunk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chunkNumber }),
          }
        );
        if (!urlRes.ok) return;
        const { uploadUrl, storageKey } = (await urlRes.json()) as {
          uploadUrl: string;
          storageKey: string;
        };
        try {
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": event.data.type || "video/webm" },
            body: event.data,
          });
          sendEvent("webcam.chunk", { chunkNumber, storageKey });
        } catch {
          /* network blip; recorder keeps going */
        }
      };
      recorder.start(30_000); // emit a chunk every 30s
      recorderRef.current = recorder;
      setRecorder("recording");
      sendEvent("webcam.start");
    } catch {
      setRecorder("denied");
      sendEvent("webcam.stop", { reason: "denied" });
    }
  }, [settings.webcamRequired, attemptId, sendEvent]);

  const stopWebcam = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current?.stream
      .getTracks()
      .forEach((track) => track.stop());
    recorderRef.current = null;
    setRecorder("stopped");
    sendEvent("webcam.stop");
    void fetch(`/api/exam-attempts/${attemptId}/proctor/finalize`, {
      method: "POST",
    }).catch(() => undefined);
  }, [attemptId, sendEvent]);

  useEffect(() => {
    return () => {
      // Hard-stop on unmount: leave no zombie recorder stream running.
      recorderRef.current?.stream
        .getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  // --- Render ------------------------------------------------------------
  return (
    <div
      role="region"
      aria-label={t("proctor.runtime.toolbar")}
      className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest/95 px-4 py-2 text-xs shadow-sm backdrop-blur"
      data-testid="proctor-toolbar"
    >
      <div className="flex flex-wrap items-center gap-2">
        {settings.fullscreenRequired ? (
          <button
            type="button"
            onClick={() =>
              fullscreen ? document.exitFullscreen() : requestFullscreen()
            }
            className={`rounded-full px-3 py-1 font-semibold ${
              fullscreen
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
            data-testid="proctor-fullscreen-toggle"
          >
            {fullscreen
              ? t("proctor.runtime.fullscreenOn")
              : t("proctor.runtime.fullscreenExit")}
          </button>
        ) : null}
        {settings.tabSwitchFlag ? (
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              warning
                ? "bg-amber-100 text-amber-800"
                : "bg-surface-container-low text-secondary"
            }`}
            data-testid="proctor-tabstate"
          >
            {warning ?? t("proctor.runtime.tabFocused")}
          </span>
        ) : null}
        {settings.webcamRequired ? (
          <span
            className={`rounded-full px-3 py-1 font-semibold ${
              recorder === "recording"
                ? "bg-emerald-100 text-emerald-800"
                : recorder === "denied"
                  ? "bg-error-container text-on-error-container"
                  : "bg-surface-container-low text-secondary"
            }`}
            data-testid="proctor-webcam-state"
          >
            {recorder === "recording"
              ? t("proctor.runtime.webcamOn")
              : recorder === "denied"
                ? t("proctor.runtime.webcamDenied")
                : t("proctor.runtime.webcamOff")}
          </span>
        ) : null}
        {flagCount > 0 ? (
          <span
            className="rounded-full bg-error-container px-3 py-1 font-semibold text-on-error-container"
            data-testid="proctor-flagcount"
          >
            {tn("proctor.runtime.flagCount", flagCount)}
          </span>
        ) : null}
      </div>
      {settings.webcamRequired && recorder === "idle" ? (
        <button
          type="button"
          onClick={startWebcam}
          className="rounded-full bg-primary px-3 py-1 font-semibold text-on-primary hover:bg-primary/90"
          data-testid="proctor-webcam-start"
        >
          {t("proctor.runtime.startWebcam")}
        </button>
      ) : null}
      {settings.webcamRequired && recorder === "recording" ? (
        <button
          type="button"
          onClick={stopWebcam}
          className="rounded-full border border-outline-variant px-3 py-1 font-semibold text-secondary hover:bg-surface-container-low"
          data-testid="proctor-webcam-stop"
        >
          {t("proctor.runtime.stopWebcam")}
        </button>
      ) : null}
    </div>
  );
}

export type ProctorLobbyProps = {
  settings: ProctorSettings;
  onContinue: () => void;
};

/**
 * R9 — Proctoring lobby. Shown above the exam questions BEFORE the timer
 * starts. Surfaces the requirements (fullscreen / webcam / tab-switch)
 * and triggers the permission requests.
 */
export function ProctorLobby({ settings, onContinue }: ProctorLobbyProps) {
  const { t } = useTranslations();
  const [acknowledged, setAcknowledged] = useState(false);
  const items: string[] = [];
  if (settings.fullscreenRequired) items.push(t("proctor.lobby.fullscreen"));
  if (settings.webcamRequired) items.push(t("proctor.lobby.webcam"));
  if (settings.tabSwitchFlag) items.push(t("proctor.lobby.tabSwitch"));

  return (
    <div
      role="region"
      aria-label={t("proctor.lobby.title")}
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"
      data-testid="proctor-lobby"
    >
      <h2 className="text-base font-semibold text-on-surface">
        {t("proctor.lobby.title")}
      </h2>
      <p className="mt-2 text-sm text-secondary">
        {t("proctor.lobby.description")}
      </p>
      {items.length > 0 ? (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-on-surface">
          {items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setAcknowledged(true)}
          className="rounded-full px-4 py-2 text-xs font-medium text-secondary hover:bg-surface-container-low"
          data-testid="proctor-lobby-ack"
        >
          {acknowledged
            ? t("proctor.lobby.acknowledged")
            : t("proctor.lobby.acknowledge")}
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!acknowledged && items.length > 0}
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-60"
          data-testid="proctor-lobby-start"
        >
          {t("proctor.lobby.start")}
        </button>
      </div>
    </div>
  );
}
