import type React from 'react'
import { useMemo } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

interface MapMarker {
  id: string
  latitude: number
  longitude: number
  title: string
  description?: string
}

interface OpenStreetMapViewProps {
  style?: any
  latitude: number
  longitude: number
  zoom?: number
  markers?: MapMarker[]
  showUserLocation?: boolean
  onMarkerPress?: (markerId: string) => void
}

export const OpenStreetMapView: React.FC<OpenStreetMapViewProps> = ({
  style,
  latitude,
  longitude,
  zoom = 13,
  markers = [],
  showUserLocation = false,
  onMarkerPress,
}) => {
  const mapHtml = useMemo(() => {
    const markerElements = markers
      .map(
        marker => `
          L.marker([${marker.latitude}, ${marker.longitude}])
            .addTo(map)
            .bindPopup(\`
              <div style="text-align: center; min-width: 150px;">
                <b style="font-size: 14px;">${marker.title}</b>
                ${marker.description ? `<br/><span style="font-size: 12px; color: #666;">${marker.description}</span>` : ''}
                <br/>
                <button 
                  onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'markerPress', markerId: '${marker.id}'}))"
                  style="margin-top: 8px; padding: 6px 12px; background: #B967FF; color: white; border: none; border-radius: 4px; font-size: 12px;"
                >
                  View Details
                </button>
              </div>
            \`);
        `,
      )
      .join('\n')

    const userLocationScript = showUserLocation
      ? `
        // Add user location marker
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Add a blue circle for user location
            L.circle([userLat, userLng], {
              color: '#007AFF',
              fillColor: '#007AFF',
              fillOpacity: 0.3,
              radius: 100
            }).addTo(map);
            
            // Add a smaller inner circle
            L.circleMarker([userLat, userLng], {
              radius: 8,
              color: 'white',
              fillColor: '#007AFF',
              fillOpacity: 1,
              weight: 2
            }).addTo(map);
          });
        }
      `
      : ''

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100%; }
            .leaflet-popup-content { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            // Initialize map
            const map = L.map('map', {
              center: [${latitude}, ${longitude}],
              zoom: ${zoom},
              zoomControl: true,
              attributionControl: true
            });
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
            
            // Add markers
            ${markerElements}
            
            ${userLocationScript}
            
            // Handle map clicks
            map.on('click', function(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapClick',
                latitude: e.latlng.lat,
                longitude: e.latlng.lng
              }));
            });
          </script>
        </body>
      </html>
    `
  }, [latitude, longitude, zoom, markers, showUserLocation])

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.markerId)
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error)
    }
  }

  if (Platform.OS === 'web') {
    // For web, we can use an iframe
    return (
      <View style={[styles.container, style]}>
        <iframe
          srcDoc={mapHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="OpenStreetMap"
        />
      </View>
    )
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        scalesPageToFit
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
})
