import * as signalR from "@microsoft/signalr";
import { getToken } from "../auth/auth";

let connection: signalR.HubConnection | null = null;

export function getRealtimeConnection() {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:7007/hubs/realtime", {
      accessTokenFactory: () => getToken() || "",
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  return connection;
}

export async function startRealtime() {
  const conn = getRealtimeConnection();
  if (conn.state === signalR.HubConnectionState.Connected) return;

  try {
    await conn.start();
    console.log("✅ SignalR connected");
  } catch (e) {
    console.error("❌ SignalR connect failed", e);
  }
}

export async function stopRealtime() {
  const conn = getRealtimeConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) return;

  try {
    await conn.stop();
  } catch {}
}