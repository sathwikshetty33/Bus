import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { busService } from '../services';
import { BusSchedule } from '../types';

export default function SearchResultsScreen() {
  const router = useRouter();
  const { from, to, date } = useLocalSearchParams<{ from: string; to: string; date: string }>();
  const [buses, setBuses] = useState<BusSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    searchBuses();
  }, []);

  const searchBuses = async () => {
    try {
      const results = await busService.searchBuses({
        from_city: from,
        to_city: to,
        travel_date: date,
      });
      setBuses(results);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No buses found for this route');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderBus = ({ item }: { item: BusSchedule }) => (
    <TouchableOpacity
      style={styles.busCard}
      onPress={() =>
        router.push({
          pathname: '/bus-details',
          params: { scheduleId: item.id.toString() },
        })
      }
    >
      {/* Operator Header */}
      <View style={styles.busHeader}>
        <View>
          <Text style={styles.operatorName}>{item.bus.operator.name}</Text>
          <Text style={styles.busType}>
            {item.bus.bus_type.toUpperCase()} • {item.bus.seat_layout}
          </Text>
        </View>
        <View style={styles.ratingBadge}>
          <FontAwesome name="star" size={12} color="#FFC107" />
          <Text style={styles.ratingText}>{item.bus.operator.rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Time & Route */}
      <View style={styles.routeSection}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeText}>{item.departure_time.slice(0, 5)}</Text>
          <Text style={styles.cityText}>{item.route.from_city.name}</Text>
        </View>
        <View style={styles.durationBlock}>
          <Text style={styles.durationText}>
            {formatDuration(item.route.duration_minutes)}
          </Text>
          <View style={styles.routeLine}>
            <View style={styles.dot} />
            <View style={styles.line} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.distanceText}>{item.route.distance_km} km</Text>
        </View>
        <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
          <Text style={styles.timeText}>{item.arrival_time.slice(0, 5)}</Text>
          <Text style={styles.cityText}>{item.route.to_city.name}</Text>
        </View>
      </View>

      {/* Amenities */}
      <View style={styles.amenitiesRow}>
        {item.bus.amenities?.slice(0, 4).map((amenity, index) => (
          <View key={index} style={styles.amenityChip}>
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.busFooter}>
        <View>
          <Text style={styles.seatsText}>{item.available_seats} seats left</Text>
        </View>
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Starts from</Text>
          <Text style={styles.priceText}>₹{item.base_price.toFixed(0)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Searching buses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="bus" size={48} color="#ccc" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Route Header */}
      <View style={styles.routeHeader}>
        <Text style={styles.routeTitle}>
          {from} → {to}
        </Text>
        <Text style={styles.dateText}>{date} • {buses.length} buses</Text>
      </View>

      <FlatList
        data={buses}
        renderItem={renderBus}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text>No buses found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  routeHeader: {
    padding: 16,
    backgroundColor: '#007AFF',
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  listContent: {
    padding: 12,
  },
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  busType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color: '#F57C00',
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeBlock: {
    flex: 1,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cityText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  durationBlock: {
    flex: 1,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  distanceText: {
    fontSize: 11,
    color: '#999',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  amenityChip: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  amenityText: {
    fontSize: 10,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  busFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  seatsText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
    color: '#999',
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});
