"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { EventResult } from "../api/types";

// Leaflet loaded dynamically (browser-only)
let L: typeof import("leaflet") | null = null;

const CAT_COLORS: Record<string, string> = {
  defi: "#f97316", ai: "#a855f7", infrastructure: "#22c55e",
  build: "#3b82f6", social: "#ec4899", music: "#6366f1",
  food: "#ef4444", party: "#f59e0b", workshop: "#14b8a6",
  networking: "#06b6d4", hackathon: "#8b5cf6", default: "#2563eb",
};

function getCatColor(ev: EventResult): string {
  const cats = (ev.categories || []).map((c) => c.toLowerCase());
  for (const [key, color] of Object.entries(CAT_COLORS)) {
    if (cats.some((c) => c.includes(key))) return color;
  }
  return CAT_COLORS.default;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`;
}

interface Props {
  events: EventResult[];
  onEventClick?: (eventId: string) => void;
}

export function EventMap({ events, onEventClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const refMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [refLoc, setRefLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [mappedCount, setMappedCount] = useState(0);

  // Dynamic import of Leaflet
  useEffect(() => {
    if (L) { setReady(true); return; }
    Promise.all([
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([leaflet]) => {
      L = leaflet.default || leaflet;
      setReady(true);
    });
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !L || !mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [30.2672, -97.7431],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);

    map.on("click", (e: any) => {
      setRefLoc([e.latlng.lat, e.latlng.lng]);
    });

    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [ready]);

  // Render markers
  useEffect(() => {
    if (!L || !mapInstance.current || !markersLayer.current) return;
    const layer = markersLayer.current;
    layer.clearLayers();

    const bounds: [number, number][] = [];
    let count = 0;
    const refPt = refLoc || userLoc;

    for (const ev of events) {
      const lat = ev.latitude;
      const lng = ev.longitude;
      if (!lat || !lng) continue;
      count++;
      bounds.push([lat, lng]);

      const color = getCatColor(ev);
      const size = 28;
      const icon = L.divIcon({
        className: "ev-pin",
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;"><div style="width:${size * 0.35}px;height:${size * 0.35}px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size + 4],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(layer);
      const date = new Date(ev.startTime);
      const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const distHtml = refPt ? `<span style="color:#3b82f6;font-weight:500;">${formatDist(haversine(refPt[0], refPt[1], lat, lng))}</span>` : "";

      marker.bindPopup(
        `<div style="overflow:hidden;border-radius:8px;min-width:180px;">
          <div style="padding:8px 10px;">
            <div style="font-size:13px;font-weight:600;margin-bottom:3px;">${ev.title}</div>
            <div style="font-size:11px;color:#888;margin-bottom:3px;">${dateStr} &middot; ${timeStr} ${distHtml}</div>
            ${ev.locationName ? `<div style="font-size:11px;color:#666;margin-bottom:6px;">${ev.locationName}</div>` : ""}
            <button class="fc-map-view-btn" data-eid="${ev.id}" style="padding:4px 12px;font-size:11px;font-weight:600;color:#fff;background:#2563eb;border:none;border-radius:20px;cursor:pointer;">View</button>
          </div>
        </div>`,
        { className: "fc-map-popup", closeButton: true, maxWidth: 260 },
      );
    }

    setMappedCount(count);
    if (bounds.length > 1) mapInstance.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    else if (bounds.length === 1) mapInstance.current.setView(bounds[0], 14);
  }, [events, userLoc, refLoc, ready]);

  // Ref pin
  useEffect(() => {
    if (!L || !mapInstance.current || !refLoc) return;
    if (refMarkerRef.current) {
      refMarkerRef.current.setLatLng(refLoc);
    } else {
      const icon = L.divIcon({
        className: "ref-pin",
        html: `<svg width="28" height="38" viewBox="0 0 32 42" fill="none"><path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#2563eb"/><circle cx="16" cy="16" r="7" fill="#fff"/><circle cx="16" cy="16" r="3.5" fill="#2563eb"/></svg>`,
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -38],
      });
      const m = L.marker(refLoc, { icon, zIndexOffset: 900, draggable: true }).addTo(mapInstance.current);
      m.bindPopup(`<div style="padding:8px;font-size:12px;"><strong style="color:#3b82f6">Reference Pin</strong><br><span style="color:#888">Drag to move</span></div>`, { className: "fc-map-popup" });
      m.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        setRefLoc([pos.lat, pos.lng]);
      });
      refMarkerRef.current = m;
    }
  }, [refLoc, ready]);

  // GPS
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation || !L) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLoc(loc);
        if (!mapInstance.current) return;
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(loc);
        } else {
          const icon = L!.divIcon({
            className: "user-pin",
            html: `<div style="position:relative;width:20px;height:20px;"><div style="position:absolute;width:20px;height:20px;background:rgba(37,99,235,0.3);border-radius:50%;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div><div style="position:absolute;top:3px;left:3px;width:14px;height:14px;background:linear-gradient(135deg,#2563eb,#3b82f6);border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(37,99,235,0.5);"></div></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          userMarkerRef.current = L!.marker(loc, { icon, zIndexOffset: 1000 }).addTo(mapInstance.current);
        }
        mapInstance.current.flyTo(loc, 14, { duration: 1 });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [ready]);

  // Click delegation for popup buttons
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(".fc-map-view-btn") as HTMLElement | null;
      if (btn?.dataset.eid && onEventClick) onEventClick(btn.dataset.eid);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onEventClick]);

  const btnStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "5px 10px", fontSize: 12, fontWeight: 500,
    color: "#e4e4ec", background: "#1a1a1a",
    border: "1px solid #2a2a2a", borderRadius: 20, cursor: "pointer",
  };

  return (
    <div style={{ margin: "8px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
        <button style={{ ...btnStyle, ...(locating ? { color: "#3b82f6", borderColor: "#2563eb" } : {}) }} onClick={handleLocate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /><circle cx="12" cy="12" r="8" strokeDasharray="2 3" />
          </svg>
          GPS
        </button>
        {refLoc && (
          <button style={btnStyle} onClick={() => {
            setRefLoc(null);
            if (refMarkerRef.current && mapInstance.current) {
              mapInstance.current.removeLayer(refMarkerRef.current);
              refMarkerRef.current = null;
            }
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            Clear Pin
          </button>
        )}
        <span style={{ fontSize: 11, color: "#888", marginLeft: "auto" }}>
          {mappedCount} of {events.length} mapped
        </span>
      </div>
      <div
        ref={mapRef}
        style={{
          width: "100%", height: 320, borderRadius: 12,
          border: "1px solid #2a2a2a", overflow: "hidden",
          background: "#1a1a1a",
        }}
      />
      <div style={{ textAlign: "center", fontSize: 11, color: "#555", padding: "4px 0" }}>
        Tap map to drop a reference pin
      </div>

      <style>{`
        .ev-pin, .ref-pin, .user-pin { background: none !important; border: none !important; }
        .fc-map-popup .leaflet-popup-content-wrapper { background: #1a1a1a; color: #e4e4ec; border-radius: 12px; border: 1px solid #2a2a2a; box-shadow: 0 8px 32px rgba(0,0,0,0.4); padding: 0; }
        .fc-map-popup .leaflet-popup-content { margin: 0; }
        .fc-map-popup .leaflet-popup-tip { background: #1a1a1a; border: 1px solid #2a2a2a; border-top: none; border-left: none; }
        .fc-map-popup .leaflet-popup-close-button { color: #888; font-size: 16px; padding: 4px 6px; }
        .leaflet-control-zoom a { background: #1a1a1a !important; color: #e4e4ec !important; border-color: #2a2a2a !important; }
        .leaflet-control-zoom a:hover { background: #222 !important; }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.6; } 75%, 100% { transform: scale(2.2); opacity: 0; } }
      `}</style>
    </div>
  );
}
