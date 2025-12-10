import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { busService } from '../services';
import { BusSchedule, Seat } from '../types';
import { useAuth } from '../context/AuthContext';

export default function BusDetailsScreen() {
  const router = useRouter();
  const { scheduleId } = useLocalSearchParams<{ scheduleId: string }>();
  const { isAuthenticated } = useAuth();
  const [schedule, setSchedule] = useState<BusSchedule | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusDetails();
  }, []);

  const loadBusDetails = async () => {
    try {
      const [scheduleData, seatsData] = await Promise.all([
        busService.getBusDetails(parseInt(scheduleId)),
        busService.getSeats(parseInt(scheduleId)),
      ]);
      setSchedule(scheduleData);
      setSeats(seatsData);
    } catch (error) {
      console.error('Failed to load bus details:', error);
      Alert.alert('Error', 'Failed to load bus details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seat: Seat) => {
    if (!seat.is_available) return;

    const isSelected = selectedSeats.find((s) => s.id === seat.id);
    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= 6) {
        Alert.alert('Limit', 'You can select maximum 6 seats');
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const getTotalAmount = () => {
    return selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  };

  const handleContinue = () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to book tickets', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (selectedSeats.length === 0) {
      Alert.alert('Select Seats', 'Please select at least one seat');
      return;
    }

    router.push({
      pathname: '/booking-confirm',
      params: {
        scheduleId,
        seatIds: JSON.stringify(selectedSeats.map((s) => s.id)),
        seatNumbers: JSON.stringify(selectedSeats.map((s) => s.seat_number)),
        totalAmount: getTotalAmount().toString(),
      },
    });
  };

  const getSeatColor = (seat: Seat) => {
    if (!seat.is_available) return '#ddd';
    if (selectedSeats.find((s) => s.id === seat.id)) return '#4CAF50';
    if (seat.is_ladies_only) return '#E91E63';
    return '#fff';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!schedule) return null;

  // Group seats by deck
  const lowerDeck = seats.filter((s) => s.deck === 'lower');
  const upperDeck = seats.filter((s) => s.deck === 'upper');

  const renderSeat = (seat: Seat) => (
    <TouchableOpacity
      key={seat.id}
      style={[
        styles.seat,
        { backgroundColor: getSeatColor(seat) },
        !seat.is_available && styles.unavailableSeat,
      ]}
      onPress={() => toggleSeat(seat)}
      disabled={!seat.is_available}
    >
      <Text
        style={[
          styles.seatNumber,
          !seat.is_available && styles.unavailableSeatText,
          selectedSeats.find((s) => s.id === seat.id) && styles.selectedSeatText,
        ]}
      >
        {seat.seat_number}
      </Text>
      <Text style={styles.seatPrice}>₹{seat.price.toFixed(0)}</Text>
    </TouchableOpacity>
  );

  const renderDeck = (deckSeats: Seat[], title: string) => {
    // Group by rows
    const rows: { [key: number]: Seat[] } = {};
    deckSeats.forEach((seat) => {
      if (!rows[seat.row_number]) rows[seat.row_number] = [];
      rows[seat.row_number].push(seat);
    });

    return (
      <View style={styles.deckSection}>
        <Text style={styles.deckTitle}>{title}</Text>
        <View style={styles.seatLayout}>
          {Object.keys(rows).map((rowNum) => (
            <View key={rowNum} style={styles.seatRow}>
              {rows[parseInt(rowNum)]
                .sort((a, b) => a.column_number - b.column_number)
                .map(renderSeat)}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Bus Info Header */}
      <View style={styles.header}>
        <Text style={styles.operatorName}>{schedule.bus.operator.name}</Text>
        <Text style={styles.busInfo}>
          {schedule.bus.bus_type.toUpperCase()} • {schedule.bus.bus_number}
        </Text>
        <View style={styles.routeInfo}>
          <Text style={styles.routeText}>
            {schedule.route.from_city.name} → {schedule.route.to_city.name}
          </Text>
          <Text style={styles.dateText}>
            {schedule.travel_date} • {schedule.departure_time.slice(0, 5)}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#ddd' }]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#E91E63' }]} />
          <Text style={styles.legendText}>Ladies</Text>
        </View>
      </View>

      {/* Seat Map */}
      <ScrollView style={styles.seatContainer}>
        {lowerDeck.length > 0 && renderDeck(lowerDeck, 'Lower Deck')}
        {upperDeck.length > 0 && renderDeck(upperDeck, 'Upper Deck')}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectedCount}>
            {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
          </Text>
          <Text style={styles.totalAmount}>₹{getTotalAmount().toFixed(0)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.continueButton, selectedSeats.length === 0 && styles.continueButtonDisabled]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
  },
  header: {
    padding: 16,
    backgroundColor: '#007AFF',
  },
  operatorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  busInfo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  routeInfo: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeText: {
    fontSize: 14,
    color: '#fff',
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  seatContainer: {
    flex: 1,
    padding: 16,
  },
  deckSection: {
    marginBottom: 24,
  },
  deckTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  seatLayout: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  seatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  seat: {
    width: 60,
    height: 50,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableSeat: {
    backgroundColor: '#ddd',
  },
  seatNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  seatPrice: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  unavailableSeatText: {
    color: '#999',
  },
  selectedSeatText: {
    color: '#fff',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  selectionInfo: {
    flex: 1,
  },
  selectedCount: {
    fontSize: 13,
    color: '#666',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
