import { useEffect, useRef } from "react";
import type { CrewLocation } from "../api/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  locations: CrewLocation[];
}

const STATUS_COLORS: Record<string, string> = {
  here: "#22c55e",
  heading: "#eab308",
  leaving: "#ef4444",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CrewMap({ locations }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Center on Denver (EthDenver)
    const map = L.map(mapRef.current).setView([39.7392, -104.9903], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    const validLocations = locations.filter((l) => l.latitude && l.longitude);

    for (const loc of validLocations) {
      const color = STATUS_COLORS[loc.status] || STATUS_COLORS.here;
      const name = loc.display_name || loc.user_id.replace(/^(telegram_|farcaster_)/, "@");

      const marker = L.circleMarker([loc.latitude!, loc.longitude!], {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2,
        fillOpacity: 0.9,
      }).addTo(map);

      const statusLabel = loc.status === "here" ? "At" : loc.status === "heading" ? "Heading to" : "Leaving";
      marker.bindPopup(
        `<strong>${name}</strong><br/>${statusLabel} ${loc.venue_name}<br/><small>${timeAgo(loc.created_at)}</small>`,
      );
    }

    // Fit bounds if we have locations
    if (validLocations.length > 0) {
      const bounds = L.latLngBounds(
        validLocations.map((l) => [l.latitude!, l.longitude!] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [locations]);

  return <div ref={mapRef} className="crew-map" />;
}
