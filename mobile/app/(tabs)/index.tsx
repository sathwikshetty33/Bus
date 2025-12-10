import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { busService } from '../../services';
import { City } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [popularCities, setPopularCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPopularCities();
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setTravelDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const loadPopularCities = async () => {
    try {
      const cities = await busService.getCities(undefined, true);
      setPopularCities(cities);
    } catch (error) {
      console.error('Failed to load cities:', error);
    }
  };

  const handleSearch = async () => {
    if (!fromCity || !toCity || !travelDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (fromCity.toLowerCase() === toCity.toLowerCase()) {
      Alert.alert('Error', 'From and To cities cannot be the same');
      return;
    }

    router.push({
      pathname: '/search-results',
      params: {
        from: fromCity,
        to: toCity,
        date: travelDate,
      },
    });
  };

  const swapCities = () => {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  };

  const selectCity = (cityName: string, field: 'from' | 'to') => {
    if (field === 'from') {
      setFromCity(cityName);
    } else {
      setToCity(cityName);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Where would you like to go?</Text>
        <Text style={styles.headerSubtitle}>Book bus tickets in seconds</Text>
      </View>

      <View style={styles.searchCard}>
        {/* From City */}
        <View style={styles.inputRow}>
          <FontAwesome name="circle-o" size={16} color="#4CAF50" style={styles.inputIcon} />
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>From</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter departure city"
              placeholderTextColor="#999"
              value={fromCity}
              onChangeText={setFromCity}
            />
          </View>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={swapCities}>
          <FontAwesome name="exchange" size={16} color="#007AFF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* To City */}
        <View style={styles.inputRow}>
          <FontAwesome name="map-marker" size={18} color="#F44336" style={styles.inputIcon} />
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>To</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter destination city"
              placeholderTextColor="#999"
              value={toCity}
              onChangeText={setToCity}
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Date */}
        <View style={styles.inputRow}>
          <FontAwesome name="calendar" size={16} color="#2196F3" style={styles.inputIcon} />
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Travel Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={travelDate}
              onChangeText={setTravelDate}
            />
          </View>
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <FontAwesome name="search" size={18} color="#fff" />
              <Text style={styles.searchButtonText}>Search Buses</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Popular Cities */}
      <View style={styles.popularSection}>
        <Text style={styles.sectionTitle}>Popular Cities</Text>
        <View style={styles.citiesGrid}>
          {popularCities.slice(0, 8).map((city) => (
            <TouchableOpacity
              key={city.id}
              style={styles.cityChip}
              onPress={() => selectCity(city.name, fromCity ? 'to' : 'from')}
            >
              <Text style={styles.cityChipText}>{city.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Routes */}
      <View style={styles.routesSection}>
        <Text style={styles.sectionTitle}>Popular Routes</Text>
        {[
          { from: 'Bengaluru', to: 'Chennai' },
          { from: 'Mumbai', to: 'Pune' },
          { from: 'Hyderabad', to: 'Bengaluru' },
          { from: 'Bengaluru', to: 'Goa' },
        ].map((route, index) => (
          <TouchableOpacity
            key={index}
            style={styles.routeCard}
            onPress={() => {
              setFromCity(route.from);
              setToCity(route.to);
            }}
          >
            <View style={styles.routeInfo}>
              <Text style={styles.routeText}>{route.from}</Text>
              <FontAwesome name="arrow-right" size={12} color="#999" style={styles.routeArrow} />
              <Text style={styles.routeText}>{route.to}</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  searchCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  inputIcon: {
    width: 24,
  },
  inputWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  swapButton: {
    position: 'absolute',
    right: 16,
    top: 48,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 36,
  },
  searchButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  popularSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cityChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  cityChipText: {
    fontSize: 14,
    color: '#333',
  },
  routesSection: {
    padding: 16,
    paddingTop: 0,
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 15,
    fontWeight: '500',
  },
  routeArrow: {
    marginHorizontal: 12,
  },
});
