import { Feather } from '@expo/vector-icons'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemedStyles } from '../hooks/useThemedStyles'
import { moderateScale, scale, verticalScale } from '../styles/responsive'
import { type Coordinates, geocodeAddress } from '../utils/locationUtils'

export interface PlaceDetails {
  address: string
  city?: string
  state?: string
  country?: string
  coordinates?: Coordinates
  placeId?: string
}

interface AddressAutocompleteProps {
  value: string
  onSelect: (place: PlaceDetails) => void
  placeholder?: string
  style?: any
}

// Simple address search using Nominatim (OpenStreetMap) - free and no API key required
const searchAddresses = async (query: string): Promise<PlaceDetails[]> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query,
      )}&limit=5&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      },
    )

    if (!response.ok) {
      throw new Error('Failed to search addresses')
    }

    const data = await response.json()

    return data.map((item: any) => ({
      address: item.display_name,
      city: item.address?.city || item.address?.town || item.address?.village,
      state: item.address?.state,
      country: item.address?.country,
      coordinates: {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      },
      placeId: item.place_id,
    }))
  } catch (error) {
    console.error('Error searching addresses:', error)
    return []
  }
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onSelect,
  placeholder = 'Search for address...',
  style,
}) => {
  const { styles: themedStyles, colors } = useThemedStyles()
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<PlaceDetails[]>([])
  const [loading, setLoading] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const results = await searchAddresses(query)
      setSuggestions(results)
    } catch (error) {
      console.error('Search error:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleTextChange = (text: string) => {
    setSearchQuery(text)

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    searchTimeout.current = setTimeout(() => {
      handleSearch(text)
    }, 500)
  }

  const handleSelectPlace = async (place: PlaceDetails) => {
    // If coordinates aren't available, try to geocode
    if (!place.coordinates) {
      const coords = await geocodeAddress(place.address)
      if (coords) {
        place.coordinates = coords
      }
    }

    onSelect(place)
    setSearchQuery(place.address)
    setShowModal(false)
    setSuggestions([])
  }

  const renderSuggestion = ({ item }: { item: PlaceDetails }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectPlace(item)}>
      <Feather name="map-pin" size={scale(16)} color={colors.textSecondary} />
      <View style={styles.suggestionText}>
        <Text style={[styles.suggestionTitle, { color: colors.text }]} numberOfLines={1}>
          {item.address.split(',')[0]}
        </Text>
        <Text
          style={[styles.suggestionSubtitle, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {item.address}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <>
      <TouchableOpacity style={[themedStyles.input, style]} onPress={() => setShowModal(true)}>
        <Feather
          name="map-pin"
          size={scale(18)}
          color={colors.textSecondary}
          style={styles.inputIcon}
        />
        <Text
          style={[styles.inputText, { color: value ? colors.text : colors.textSecondary }]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Feather name="x" size={scale(24)} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Select Location</Text>
            <View style={{ width: scale(24) }} />
          </View>

          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={scale(18)}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[themedStyles.input, styles.searchInput]}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={handleTextChange}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => handleSearch(searchQuery)}
            />
            {loading && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.loadingIndicator}
              />
            )}
          </View>

          {suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={item => item.placeId || item.address}
              contentContainerStyle={styles.suggestionsList}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              )}
            />
          ) : searchQuery.length >= 3 && !loading ? (
            <View style={styles.emptyState}>
              <Feather name="map" size={scale(48)} color={colors.textSecondary} />
              <Text style={[themedStyles.text, styles.emptyText, { color: colors.text }]}>
                No locations found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Try searching for a different address
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="search" size={scale(48)} color={colors.textSecondary} />
              <Text style={[themedStyles.text, styles.emptyText, { color: colors.text }]}>
                Search for a location
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Enter at least 3 characters to search
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  inputIcon: {
    marginRight: scale(8),
  },
  inputText: {
    flex: 1,
    fontSize: moderateScale(16),
  },
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  searchIcon: {
    position: 'absolute',
    left: scale(28),
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    paddingLeft: scale(40),
  },
  loadingIndicator: {
    position: 'absolute',
    right: scale(28),
  },
  suggestionsList: {
    paddingVertical: verticalScale(8),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  suggestionText: {
    flex: 1,
    marginLeft: scale(12),
  },
  suggestionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
  suggestionSubtitle: {
    fontSize: moderateScale(13),
    marginTop: verticalScale(2),
  },
  separator: {
    height: 1,
    marginHorizontal: scale(16),
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  emptyText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: verticalScale(8),
    textAlign: 'center',
    fontSize: moderateScale(13),
  },
})
