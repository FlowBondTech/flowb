/**
 * EventMapScreen
 *
 * Full-screen map view showing events with colored markers,
 * GPS location, and reference pin functionality.
 * Uses react-native-maps (MapView) with expo-location for GPS.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, Callout, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../../theme/colors';
import { useEventsStore } from '../../stores/useEventsStore';
import type { EventResult } from '../../api/types';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CAT_COLORS: Record<string, string> = {
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
  default: '#2563eb',
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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`;
}

// Austin TX default
const DEFAULT_REGION: Region = {
  latitude: 30.2672,
  longitude: -97.7431,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function EventMapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView>(null);
  const { events } = useEventsStore();

  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [refPin, setRefPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const mappedEvents = events.filter(
    (e) => e.latitude && e.longitude,
  );

  // GPS locate
  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Enable location to use GPS.');
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLoc(coords);
      mapRef.current?.animateToRegion(
        {
          ...coords,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800,
      );
    } catch (err) {
      Alert.alert('Location Error', 'Could not get your location.');
    }
    setLocating(false);
  }, []);

  // Long press to drop ref pin
  const handleMapLongPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      setRefPin(e.nativeEvent.coordinate);
    },
    [],
  );

  const refPoint = refPin || userLoc;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Controls Bar */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, locating && styles.ctrlBtnActive]}
          onPress={handleLocate}
          activeOpacity={0.7}
        >
          <Ionicons
            name="locate"
            size={18}
            color={locating ? colors.accent.primary : colors.text.secondary}
          />
          <Text
            style={[
              styles.ctrlText,
              locating && { color: colors.accent.primary },
            ]}
          >
            GPS
          </Text>
        </TouchableOpacity>

        {refPin && (
          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => setRefPin(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color={colors.text.secondary} />
            <Text style={styles.ctrlText}>Clear Pin</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.stats}>
          {mappedEvents.length} of {events.length} mapped
        </Text>
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        provider={PROVIDER_DEFAULT}
        userInterfaceStyle="dark"
        onLongPress={handleMapLongPress}
        showsUserLocation={!!userLoc}
        showsMyLocationButton={false}
      >
        {/* Event Markers */}
        {mappedEvents.map((ev) => {
          const color = getCatColor(ev);
          const date = new Date(ev.startTime);
          const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          const dist =
            refPoint && ev.latitude && ev.longitude
              ? formatDist(
                  haversine(
                    refPoint.latitude,
                    refPoint.longitude,
                    ev.latitude,
                    ev.longitude,
                  ),
                )
              : null;

          return (
            <Marker
              key={ev.id}
              coordinate={{
                latitude: ev.latitude!,
                longitude: ev.longitude!,
              }}
              pinColor={color}
              tracksViewChanges={false}
            >
              <Callout
                onPress={() =>
                  navigation.navigate('EventDetail', { eventId: ev.id })
                }
              >
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {ev.title}
                  </Text>
                  <Text style={styles.calloutMeta}>
                    {timeStr}
                    {dist ? ` \u00B7 ${dist}` : ''}
                  </Text>
                  {ev.locationName ? (
                    <Text style={styles.calloutVenue} numberOfLines={1}>
                      {ev.locationName}
                    </Text>
                  ) : null}
                  <Text style={styles.calloutAction}>Tap to view</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Reference Pin */}
        {refPin && (
          <Marker
            coordinate={refPin}
            draggable
            onDragEnd={(e) => setRefPin(e.nativeEvent.coordinate)}
            pinColor={colors.accent.primary}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={[styles.calloutTitle, { color: colors.accent.primary }]}>
                  Reference Pin
                </Text>
                <Text style={styles.calloutMeta}>Drag to move</Text>
              </View>
            </Callout>
          </Marker>
        )}
      </MapView>

      {/* Hint */}
      <Text style={[styles.hint, { paddingBottom: insets.bottom + 4 }]}>
        Long press on map to drop a reference pin
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  ctrlBtnActive: {
    borderColor: colors.accent.primary,
  },
  ctrlText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  stats: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: 'auto',
  },
  map: {
    flex: 1,
  },
  callout: {
    minWidth: 160,
    maxWidth: 220,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  calloutMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  calloutVenue: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  calloutAction: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.tertiary,
    paddingVertical: 6,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
});
