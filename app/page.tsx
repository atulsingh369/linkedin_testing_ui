"use client";

import { useState, useEffect, useRef } from "react";

const BASE_URL = "http://172.203.222.133:4000";
const DEMO_USER_ID = "testuser1";
const DUMMY_MESSAGE =
  "Hi, I'd love to connect and explore potential collaboration opportunities.";

type Status = "idle" | "browser_open" | "connected" | "error";

export default function Home() {
  const [profileUrl, setProfileUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [vncUrl, setVncUrl] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()} → ${msg}`, ...prev]);

  // Poll login status every 3 seconds after browser opens
  useEffect(() => {
    if (status === "browser_open") {
      addLog("Polling for login completion...");
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `${BASE_URL}/linkedin/status/${DEMO_USER_ID}`,
          );
          const data = await res.json();
          if (data.connected) {
            clearInterval(pollRef.current!);
            setStatus("connected");
            addLog("✅ LinkedIn connected! Session saved on VM.");
          }
        } catch {
          addLog("⚠️ Poll error — retrying...");
        }
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status]);

  const handleConnectLinkedIn = async () => {
    try {
      setIsConnecting(true);
      setStatus("idle");
      addLog("Requesting browser launch on VM...");

      const res = await fetch(`${BASE_URL}/linkedin/start-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: DEMO_USER_ID }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      addLog(`VM response: ${data.status}`);

      if (data.vncUrl) {
        setVncUrl(data.vncUrl);
        setStatus("browser_open");
        addLog("Browser is open on VM. Login via the VNC link below.");
      }
    } catch (err) {
      addLog(`❌ Error: ${err}`);
      setStatus("error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendConnectionRequest = async () => {
    const trimmedUrl = profileUrl.trim();
    if (!trimmedUrl) return;

    try {
      setIsSending(true);
      addLog(`Sending connection request to: ${trimmedUrl}`);

      const res = await fetch(`${BASE_URL}/linkedin/send-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          profileUrl: trimmedUrl,
          connectionMessage: DUMMY_MESSAGE,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      addLog(`✅ ${data.message || data.status}`);
      alert("Connection request is being sent in background!");
    } catch (err) {
      addLog(`❌ Error: ${err}`);
      alert("Failed to send connection request.");
    } finally {
      setIsSending(false);
    }
  };

  const statusColor = {
    idle: "bg-slate-400",
    browser_open: "bg-yellow-400 animate-pulse",
    connected: "bg-green-500",
    error: "bg-red-500",
  }[status];

  const statusText = {
    idle: "Not connected",
    browser_open: "Waiting for login...",
    connected: "LinkedIn Connected ✅",
    error: "Error — check logs",
  }[status];

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-lg space-y-5">
        <h1 className="text-center text-2xl font-semibold text-slate-900">
          🦞 OpenClaw — LinkedIn Tester
        </h1>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${statusColor}`} />
          <span className="text-sm text-slate-600">{statusText}</span>
        </div>

        {/* VNC Link — shows after browser opens */}
        {vncUrl && status === "browser_open" && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-300 p-4 space-y-2">
            <p className="text-sm font-medium text-yellow-800">
              Browser is open on the VM. Click below to view and login:
            </p>
            <a
              href={vncUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-900 hover:bg-yellow-300"
            >
              🖥️ Open LinkedIn Browser (VNC)
            </a>
            <p className="text-xs text-yellow-700">
              Login with your credentials. If LinkedIn sends a verification
              code, enter it in the VNC window. This page will auto-detect when
              you're done.
            </p>
          </div>
        )}

        {/* Profile URL Input */}
        <input
          type="url"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          placeholder="LinkedIn Profile URL (for sending connection)"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Connect Button */}
        <button
          onClick={handleConnectLinkedIn}
          disabled={isConnecting || isSending || status === "browser_open"}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 text-lg font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isConnecting
            ? "Launching browser..."
            : status === "browser_open"
              ? "Waiting for login..."
              : status === "connected"
                ? "Reconnect LinkedIn"
                : "Connect LinkedIn"}
        </button>

        {/* Send Connection Button */}
        <button
          onClick={handleSendConnectionRequest}
          disabled={!profileUrl.trim() || isSending || status !== "connected"}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-lg font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isSending ? "Sending..." : "Send Connection Request"}
        </button>

        {status !== "connected" && (
          <p className="text-center text-xs text-slate-400">
            Connect LinkedIn first to enable sending requests
          </p>
        )}

        {/* Live Log */}
        <div className="rounded-lg bg-slate-950 p-4 h-40 overflow-y-auto space-y-1">
          <p className="text-xs text-slate-500 mb-2 font-mono">// Live Logs</p>
          {log.length === 0 && (
            <p className="text-xs text-slate-600 font-mono">
              No activity yet...
            </p>
          )}
          {log.map((entry, i) => (
            <p key={i} className="text-xs text-green-400 font-mono">
              {entry}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
