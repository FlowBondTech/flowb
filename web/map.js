// FlowB Map View - Leaflet.js event map with GPS + reference pin
// Adapted from haromink.space map system

(function () {
  'use strict';

  // ===== State =====
  let map = null;
  let markersLayer = null;
  let userMarker = null;
  let refMarker = null;
  let userLocation = null;
  let refLocation = null;
  let selectedMarkerId = null;
  let mapVisible = false;
  let mapInitialized = false;

  // Category colors (matches flowb design)
  const CAT_COLORS = {
    defi: '#f97316',
    ai: '#a855f7',
    infrastructure: '#22c55e',
    build: '#3b82f6',
    social: '#ec4899',
    music: '#6366f1',
    food: '#ef4444',
    party: '#f59e0b',
    workshop: '#14b8a6',
    networking: '#06b6d4',
    hackathon: '#8b5cf6',
    panel: '#64748b',
    default: '#2563eb',
  };

  // ===== Custom Marker Icons =====

  function createEventIcon(color, isSelected) {
    const size = isSelected ? 40 : 30;
    return L.divIcon({
      className: 'flowb-marker',
      html: `<div class="flowb-marker-pin${isSelected ? ' selected' : ''}" style="
        width:${size}px;height:${size}px;background:${color};
        border:3px solid #fff;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
      "><div style="width:${size * 0.35}px;height:${size * 0.35}px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size + 4],
    });
  }

  function createUserIcon() {
    return L.divIcon({
      className: 'flowb-user-marker',
      html: `<div class="flowb-user-dot">
        <div class="flowb-user-ping"></div>
        <div class="flowb-user-center"></div>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  }

  function createRefIcon() {
    return L.divIcon({
      className: 'flowb-ref-marker',
      html: `<div class="flowb-ref-pin">
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#2563eb"/>
          <circle cx="16" cy="16" r="8" fill="#fff"/>
          <circle cx="16" cy="16" r="4" fill="#2563eb"/>
        </svg>
      </div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42],
    });
  }

  // ===== Map Initialization =====

  function initMap() {
    if (mapInitialized) return;

    const container = document.getElementById('mapContainer');
    if (!container) return;

    // Default center: Austin TX (most events are here)
    map = L.map('mapContainer', {
      center: [30.2672, -97.7431],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    // OSM tiles - dark style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Attribution bottom-right (minimal)
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>')
      .addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    // Click on map to set reference pin
    map.on('click', function (e) {
      setReferencePin(e.latlng.lat, e.latlng.lng, 'Dropped Pin');
    });

    mapInitialized = true;

    // If we already have events, render them
    if (window._mapEvents && window._mapEvents.length) {
      renderMapMarkers(window._mapEvents);
    }
  }

  // ===== Marker Rendering =====

  function getCatColor(event) {
    const cat = (event.mainCategoryLabel || '').toLowerCase();
    for (const [key, color] of Object.entries(CAT_COLORS)) {
      if (cat.includes(key)) return color;
    }
    return CAT_COLORS.default;
  }

  function getCoords(event) {
    if (event.coordinates) {
      const lat = event.coordinates.latitude || event.coordinates.lat;
      const lng = event.coordinates.longitude || event.coordinates.lng || event.coordinates.lon;
      if (lat && lng) return [lat, lng];
    }
    if (event.latitude && event.longitude) return [event.latitude, event.longitude];
    return null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDistance(meters) {
    if (meters < 1000) return `${Math.round(meters)}m`;
    const km = meters / 1000;
    if (km < 10) return `${km.toFixed(1)}km`;
    return `${Math.round(km)}km`;
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function renderMapMarkers(events) {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    let hasCoords = 0;
    const bounds = [];

    for (const ev of events) {
      const coords = getCoords(ev);
      if (!coords) continue;
      hasCoords++;

      const color = getCatColor(ev);
      const isSelected = selectedMarkerId === ev.id;
      const icon = createEventIcon(color, isSelected);

      const marker = L.marker(coords, { icon })
        .addTo(markersLayer);

      // Build popup
      const date = new Date(ev.startTime);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const venue = ev.venue?.name || ev.locationName || '';
      const imgHtml = ev.imageUrl
        ? `<img class="map-popup-img" src="${escapeHtml(ev.imageUrl)}" alt="" onerror="this.style.display='none'">`
        : '';

      // Distance from ref pin or user location
      let distHtml = '';
      const refPt = refLocation || userLocation;
      if (refPt) {
        const dist = haversineDistance(refPt[0], refPt[1], coords[0], coords[1]);
        distHtml = `<span class="map-popup-dist">${formatDistance(dist)} away</span>`;
      }

      const priceLabel = ev.isFree ? '<span class="map-popup-free">Free</span>' : '';

      const popupHtml = `
        <div class="map-popup">
          ${imgHtml}
          <div class="map-popup-body">
            <div class="map-popup-title">${escapeHtml(ev.title)}</div>
            <div class="map-popup-meta">
              <span>${dateStr} &middot; ${timeStr}</span>
              ${distHtml}
            </div>
            ${venue ? `<div class="map-popup-venue">${escapeHtml(venue)}</div>` : ''}
            <div class="map-popup-footer">
              ${priceLabel}
              <button class="map-popup-btn" data-event-id="${escapeHtml(ev.id)}">View Event</button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        minWidth: 220,
        className: 'flowb-popup',
        closeButton: true,
      });

      marker.on('click', function () {
        selectedMarkerId = ev.id;
      });

      bounds.push(coords);
    }

    // Fit bounds if we have markers
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }

    // Update event count badge
    updateMapStats(hasCoords, events.length);
  }

  function updateMapStats(mapped, total) {
    const badge = document.getElementById('mapStatsBadge');
    if (!badge) return;
    if (mapped === 0) {
      badge.textContent = 'No events with locations';
    } else {
      badge.textContent = `${mapped} of ${total} events on map`;
    }
  }

  // ===== GPS Location =====

  function locateUser() {
    const btn = document.getElementById('mapGpsBtn');
    if (!btn) return;
    btn.classList.add('locating');

    if (!navigator.geolocation) {
      btn.classList.remove('locating');
      alert('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        btn.classList.remove('locating');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        userLocation = [lat, lng];

        // Add/update user marker
        if (userMarker) {
          userMarker.setLatLng([lat, lng]);
        } else {
          userMarker = L.marker([lat, lng], { icon: createUserIcon(), zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup('<div class="map-popup"><div class="map-popup-body"><div class="map-popup-title">You are here</div></div></div>', {
              className: 'flowb-popup',
            });
        }

        map.flyTo([lat, lng], 14, { duration: 1 });

        // Re-render to show distances
        if (window._mapEvents) renderMapMarkers(window._mapEvents);
      },
      function (err) {
        btn.classList.remove('locating');
        console.warn('Geolocation error:', err.message);
        alert('Could not get your location. Please check your browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ===== Reference Pin =====

  function setReferencePin(lat, lng, label) {
    refLocation = [lat, lng];

    if (refMarker) {
      refMarker.setLatLng([lat, lng]);
    } else {
      refMarker = L.marker([lat, lng], { icon: createRefIcon(), zIndexOffset: 900, draggable: true })
        .addTo(map);

      refMarker.on('dragend', function (e) {
        const pos = e.target.getLatLng();
        refLocation = [pos.lat, pos.lng];
        reverseGeocode(pos.lat, pos.lng).then(name => {
          refMarker.setPopupContent(buildRefPopup(name || 'Dropped Pin'));
        });
        if (window._mapEvents) renderMapMarkers(window._mapEvents);
      });
    }

    refMarker.bindPopup(buildRefPopup(label || 'Dropped Pin'), {
      className: 'flowb-popup',
      closeButton: true,
    }).openPopup();

    // Show the clear button
    const clearBtn = document.getElementById('mapClearRef');
    if (clearBtn) clearBtn.classList.remove('hidden');

    // Reverse geocode for a nice label
    if (label === 'Dropped Pin') {
      reverseGeocode(lat, lng).then(name => {
        if (name) refMarker.setPopupContent(buildRefPopup(name));
      });
    }

    // Re-render markers with distance
    if (window._mapEvents) renderMapMarkers(window._mapEvents);
  }

  function buildRefPopup(label) {
    return `<div class="map-popup"><div class="map-popup-body">
      <div class="map-popup-title" style="color:var(--accent-light)">${escapeHtml(label)}</div>
      <div class="map-popup-meta">Reference Pin &middot; Drag to move</div>
    </div></div>`;
  }

  function clearReferencePin() {
    if (refMarker) {
      map.removeLayer(refMarker);
      refMarker = null;
    }
    refLocation = null;
    const clearBtn = document.getElementById('mapClearRef');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (window._mapEvents) renderMapMarkers(window._mapEvents);
  }

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`);
      const data = await res.json();
      return data.display_name?.split(',').slice(0, 2).join(',').trim() || null;
    } catch {
      return null;
    }
  }

  // ===== Search Location for Ref Pin =====

  async function searchLocation(query) {
    if (!query || query.length < 2) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
      const results = await res.json();
      return results.map(r => ({
        name: r.display_name?.split(',').slice(0, 3).join(',').trim(),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }));
    } catch {
      return [];
    }
  }

  function renderSearchResults(results) {
    const list = document.getElementById('mapSearchResults');
    if (!list) return;
    if (!results || !results.length) {
      list.innerHTML = '<div class="map-search-empty">No results found</div>';
      list.classList.remove('hidden');
      return;
    }
    list.innerHTML = results.map(r => `
      <button class="map-search-item" data-lat="${r.lat}" data-lng="${r.lng}" data-name="${escapeHtml(r.name)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>${escapeHtml(r.name)}</span>
      </button>
    `).join('');
    list.classList.remove('hidden');

    list.querySelectorAll('.map-search-item').forEach(btn => {
      btn.addEventListener('click', function () {
        const lat = parseFloat(this.dataset.lat);
        const lng = parseFloat(this.dataset.lng);
        const name = this.dataset.name;
        setReferencePin(lat, lng, name);
        map.flyTo([lat, lng], 15, { duration: 1 });
        list.classList.add('hidden');
        const input = document.getElementById('mapSearchInput');
        if (input) input.value = '';
      });
    });
  }

  // ===== View Toggle =====

  function showMapView() {
    mapVisible = true;
    document.getElementById('eventsGrid')?.classList.add('hidden');
    document.getElementById('loadMoreWrap')?.style.setProperty('display', 'none');
    document.getElementById('emptyState')?.classList.add('hidden');
    document.getElementById('mapWrap')?.classList.remove('hidden');

    const gridBtn = document.getElementById('viewGridBtn');
    const mapBtn = document.getElementById('viewMapBtn');
    if (gridBtn) gridBtn.classList.remove('active');
    if (mapBtn) mapBtn.classList.add('active');

    // Init map on first show
    if (!mapInitialized) {
      initMap();
    } else {
      // Invalidate size since container was hidden
      setTimeout(() => map?.invalidateSize(), 100);
    }

    // Render current events
    if (window._mapEvents) renderMapMarkers(window._mapEvents);
  }

  function showGridView() {
    mapVisible = false;
    document.getElementById('eventsGrid')?.classList.remove('hidden');
    document.getElementById('mapWrap')?.classList.add('hidden');

    const gridBtn = document.getElementById('viewGridBtn');
    const mapBtn = document.getElementById('viewMapBtn');
    if (gridBtn) gridBtn.classList.add('active');
    if (mapBtn) mapBtn.classList.remove('active');
  }

  // ===== Popup Event Delegation =====

  document.addEventListener('click', function (e) {
    const viewBtn = e.target.closest('.map-popup-btn');
    if (viewBtn) {
      const eventId = viewBtn.dataset.eventId;
      if (eventId && typeof openEventModal === 'function') {
        openEventModal(null, null, null, null, eventId);
      }
    }
  });

  // ===== Init Controls =====

  function bindControls() {
    // View toggle
    document.getElementById('viewGridBtn')?.addEventListener('click', showGridView);
    document.getElementById('viewMapBtn')?.addEventListener('click', showMapView);

    // GPS
    document.getElementById('mapGpsBtn')?.addEventListener('click', locateUser);

    // Clear ref pin
    document.getElementById('mapClearRef')?.addEventListener('click', clearReferencePin);

    // Search input
    const searchInput = document.getElementById('mapSearchInput');
    let searchTimeout;
    searchInput?.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      const q = this.value.trim();
      if (q.length < 2) {
        document.getElementById('mapSearchResults')?.classList.add('hidden');
        return;
      }
      searchTimeout = setTimeout(async () => {
        const results = await searchLocation(q);
        renderSearchResults(results);
      }, 400);
    });

    searchInput?.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.getElementById('mapSearchResults')?.classList.add('hidden');
        this.value = '';
      }
    });

    // Click outside search results to close
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.map-search-wrap')) {
        document.getElementById('mapSearchResults')?.classList.add('hidden');
      }
    });
  }

  // ===== Public API =====

  // Called from app.js when events are loaded/filtered
  window.updateMapEvents = function (events) {
    window._mapEvents = events;
    if (mapVisible && mapInitialized) {
      renderMapMarkers(events);
    }
  };

  window.isMapVisible = function () {
    return mapVisible;
  };

  // ===== Boot =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindControls);
  } else {
    bindControls();
  }

})();
