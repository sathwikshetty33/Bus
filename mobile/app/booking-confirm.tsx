import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { busService, bookingService, walletService } from '../services';
import { BusSchedule, Passenger, Wallet } from '../types';

export default function BookingConfirmScreen() {
  const router = useRouter();
  const { scheduleId, seatIds, seatNumbers, totalAmount } = useLocalSearchParams<{
    scheduleId: string;
    seatIds: string;
    seatNumbers: string;
    totalAmount: string;
  }>();

  const [schedule, setSchedule] = useState<BusSchedule | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>('wallet');

  const parsedSeatIds = JSON.parse(seatIds || '[]') as number[];
  const parsedSeatNumbers = JSON.parse(seatNumbers || '[]') as string[];
  const amount = parseFloat(totalAmount || '0');

  useEffect(() => {
    loadData();
    initPassengers();
  }, []);

  const loadData = async () => {
    try {
      const [scheduleData, walletData] = await Promise.all([
        busService.getBusDetails(parseInt(scheduleId)),
        walletService.getWallet(),
      ]);
      setSchedule(scheduleData);
      setWallet(walletData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initPassengers = () => {
    const initial: Passenger[] = parsedSeatIds.map((seatId) => ({
      seat_id: seatId,
      passenger_name: '',
      passenger_age: 0,
      passenger_gender: 'male' as const,
    }));
    setPassengers(initial);
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: any) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const validatePassengers = () => {
    for (const p of passengers) {
      if (!p.passenger_name.trim()) {
        Alert.alert('Error', 'Please enter all passenger names');
        return false;
      }
      if (!p.passenger_age || p.passenger_age < 1 || p.passenger_age > 120) {
        Alert.alert('Error', 'Please enter valid ages for all passengers');
        return false;
      }
    }
    return true;
  };

  const handleBooking = async () => {
    if (!validatePassengers()) return;

    if (paymentMethod === 'wallet' && wallet && wallet.balance < amount) {
      Alert.alert('Insufficient Balance', 'Please add money to your wallet or choose another payment method');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      `Book ${passengers.length} seat(s) for ₹${amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBooking(true);
            try {
              const result = await bookingService.createBooking({
                bus_schedule_id: parseInt(scheduleId),
                passengers: passengers,
                payment_method: paymentMethod,
              });
              Alert.alert(
                'Booking Confirmed! 🎉',
                `Your booking code is ${result.booking_code}`,
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/bookings') }]
              );
            } catch (error: any) {
              Alert.alert('Booking Failed', error.response?.data?.detail || 'Please try again');
            } finally {
              setBooking(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        {/* Trip Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Summary</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.operatorName}>{schedule?.bus.operator.name}</Text>
            <Text style={styles.busType}>{schedule?.bus.bus_type.toUpperCase()}</Text>
            <View style={styles.routeRow}>
              <View>
                <Text style={styles.timeText}>{schedule?.departure_time.slice(0, 5)}</Text>
                <Text style={styles.cityText}>{schedule?.route.from_city.name}</Text>
              </View>
              <FontAwesome name="arrow-right" size={16} color="#999" />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.timeText}>{schedule?.arrival_time.slice(0, 5)}</Text>
                <Text style={styles.cityText}>{schedule?.route.to_city.name}</Text>
              </View>
            </View>
            <Text style={styles.dateText}>📅 {schedule?.travel_date}</Text>
            <Text style={styles.seatsText}>💺 Seats: {parsedSeatNumbers.join(', ')}</Text>
          </View>
        </View>

        {/* Passenger Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Passenger Details</Text>
          {passengers.map((passenger, index) => (
            <View key={index} style={styles.passengerCard}>
              <Text style={styles.passengerTitle}>
                Passenger {index + 1} - Seat {parsedSeatNumbers[index]}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#999"
                value={passenger.passenger_name}
                onChangeText={(val) => updatePassenger(index, 'passenger_name', val)}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Age"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={passenger.passenger_age > 0 ? String(passenger.passenger_age) : ''}
                  onChangeText={(val) => updatePassenger(index, 'passenger_age', parseInt(val) || 0)}
                />
                <View style={styles.genderButtons}>
                  {(['male', 'female', 'other'] as const).map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderButton,
                        passenger.passenger_gender === gender && styles.genderButtonActive,
                      ]}
                      onPress={() => updatePassenger(index, 'passenger_gender', gender)}
                    >
                      <Text
                        style={[
                          styles.genderButtonText,
                          passenger.passenger_gender === gender && styles.genderButtonTextActive,
                        ]}
                      >
                        {gender.charAt(0).toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'wallet' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('wallet')}
          >
            <FontAwesome name="credit-card" size={20} color={paymentMethod === 'wallet' ? '#007AFF' : '#666'} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Wallet</Text>
              <Text style={styles.paymentBalance}>Balance: ₹{wallet?.balance.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={[styles.radio, paymentMethod === 'wallet' && styles.radioActive]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('card')}
          >
            <FontAwesome name="credit-card-alt" size={18} color={paymentMethod === 'card' ? '#007AFF' : '#666'} />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Card / UPI</Text>
              <Text style={styles.paymentBalance}>Pay via gateway</Text>
            </View>
            <View style={[styles.radio, paymentMethod === 'card' && styles.radioActive]} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{amount.toFixed(0)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.bookButton, booking && styles.bookButtonDisabled]}
          onPress={handleBooking}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookButtonText}>Book Now</Text>
          )}
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
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  busType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  cityText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 13,
    marginBottom: 4,
  },
  seatsText: {
    fontSize: 13,
  },
  passengerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  passengerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#007AFF',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderButtons: {
    flexDirection: 'row',
  },
  genderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  genderButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  genderButtonTextActive: {
    color: '#fff',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  paymentOptionActive: {
    borderColor: '#007AFF',
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 16,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  paymentBalance: {
    fontSize: 12,
    color: '#666',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  radioActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
