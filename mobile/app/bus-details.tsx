import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  View,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { busService } from '../services';
import { BusSchedule, Seat, BoardingPoint, DroppingPoint } from '../types';
import { useAuth } from '../context/AuthContext';
import Colors from '@/constants/Colors';

export default function BusDetailsScreen() {
  const router = useRouter();
  const { scheduleId } = useLocalSearchParams<{ scheduleId: string }>();
  const { isAuthenticated } = useAuth();
  const [schedule, setSchedule] = useState<BusSchedule | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'seats' | 'boarding' | 'dropping'>('seats');

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

  const getSeatStyle = (seat: Seat) => {
    if (!seat.is_available) return { bg: '#E5E7EB', border: '#E5E7EB' };
    if (selectedSeats.find((s) => s.id === seat.id)) return { bg: Colors.success, border: Colors.success };
    if (seat.is_ladies_only) return { bg: '#FCE7F3', border: '#EC4899' };
    return { bg: '#fff', border: '#E5E7EB' };
  };

  // Check if this is a sleeper bus
  const isSleeper = schedule?.bus.bus_type.toLowerCase().includes('sleeper');

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!schedule) return null;

  // Group seats by deck, then by row, then by side
  const renderSeatMap = (deckSeats: Seat[]) => {
    const rows: { [key: number]: { left: Seat[]; right: Seat[] } } = {};
    
    deckSeats.forEach((seat) => {
      if (!rows[seat.row_number]) {
        rows[seat.row_number] = { left: [], right: [] };
      }
      if (seat.side === 'left') {
        rows[seat.row_number].left.push(seat);
      } else {
        rows[seat.row_number].right.push(seat);
      }
    });

    // Sort seats within each side by column
    Object.values(rows).forEach((row) => {
      row.left.sort((a, b) => a.column_number - b.column_number);
      row.right.sort((a, b) => a.column_number - b.column_number);
    });

    return (
      <View style={styles.seatMap}>
        {/* Driver indicator */}
        <View style={styles.driverRow}>
          <View style={styles.steeringWheel}>
            <FontAwesome name="circle-o" size={20} color="#9CA3AF" />
          </View>
          <Text style={styles.driverText}>Driver</Text>
        </View>

        {Object.keys(rows)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map((rowNum) => {
            const row = rows[parseInt(rowNum)];
            return (
              <View key={rowNum} style={styles.seatRow}>
                {/* Left side seats */}
                <View style={styles.sideSeats}>
                  {row.left.map((seat) => renderSeat(seat))}
                </View>
                
                {/* Aisle */}
                <View style={[styles.aisle, isSleeper && styles.sleeperAisle]} />
                
                {/* Right side seats */}
                <View style={styles.sideSeats}>
                  {row.right.map((seat) => renderSeat(seat))}
                </View>
              </View>
            );
          })}
      </View>
    );
  };

  const renderSeat = (seat: Seat) => {
    const seatStyle = getSeatStyle(seat);
    const isSelected = selectedSeats.find((s) => s.id === seat.id);
    
    if (isSleeper) {
      // Sleeper seat - horizontal rectangle (bed shape)
      return (
        <TouchableOpacity
          key={seat.id}
          style={[
            styles.sleeperSeat,
            { backgroundColor: seatStyle.bg, borderColor: seatStyle.border },
          ]}
          onPress={() => toggleSeat(seat)}
          disabled={!seat.is_available}
        >
          <View style={styles.sleeperContent}>
            {/* Pillow icon */}
            <View style={[
              styles.pillow, 
              !seat.is_available && { backgroundColor: '#D1D5DB' },
              isSelected && { backgroundColor: 'rgba(255,255,255,0.3)' }
            ]} />
            <Text
              style={[
                styles.sleeperSeatNumber,
                !seat.is_available && styles.unavailableSeatText,
                isSelected && styles.selectedSeatText,
              ]}
            >
              {seat.seat_number}
            </Text>
          </View>
          {seat.is_window && (
            <View style={[styles.sleeperWindowIndicator, isSelected && { backgroundColor: '#fff' }]} />
          )}
        </TouchableOpacity>
      );
    } else {
      // Seater seat - square with chair icon
      return (
        <TouchableOpacity
          key={seat.id}
          style={[
            styles.seaterSeat,
            { backgroundColor: seatStyle.bg, borderColor: seatStyle.border },
          ]}
          onPress={() => toggleSeat(seat)}
          disabled={!seat.is_available}
        >
          {/* Chair back */}
          <View style={[
            styles.chairBack,
            !seat.is_available && { backgroundColor: '#D1D5DB' },
            isSelected && { backgroundColor: 'rgba(255,255,255,0.4)' }
          ]} />
          <Text
            style={[
              styles.seaterSeatNumber,
              !seat.is_available && styles.unavailableSeatText,
              isSelected && styles.selectedSeatText,
            ]}
          >
            {seat.seat_number}
          </Text>
          {seat.is_window && (
            <View style={[styles.windowIndicator, isSelected && { backgroundColor: '#fff' }]} />
          )}
        </TouchableOpacity>
      );
    }
  };

  const lowerDeck = seats.filter((s) => s.deck === 'lower');
  const upperDeck = seats.filter((s) => s.deck === 'upper');

  const renderBoardingPoint = (point: BoardingPoint) => (
    <View key={point.id} style={styles.pointCard}>
      <View style={styles.pointTimeContainer}>
        <Text style={styles.pointTime}>{point.time.slice(0, 5)}</Text>
      </View>
      <View style={styles.pointInfo}>
        <Text style={styles.pointName}>{point.name}</Text>
        {point.landmark && <Text style={styles.pointLandmark}>📍 {point.landmark}</Text>}
        {point.contact_number && <Text style={styles.pointContact}>📞 {point.contact_number}</Text>}
      </View>
    </View>
  );

  const renderDroppingPoint = (point: DroppingPoint) => (
    <View key={point.id} style={styles.pointCard}>
      <View style={[styles.pointTimeContainer, { backgroundColor: '#E8F5E9' }]}>
        <Text style={[styles.pointTime, { color: Colors.success }]}>{point.time.slice(0, 5)}</Text>
      </View>
      <View style={styles.pointInfo}>
        <Text style={styles.pointName}>{point.name}</Text>
        {point.landmark && <Text style={styles.pointLandmark}>📍 {point.landmark}</Text>}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Bus Info Header */}
      <LinearGradient
        colors={[Colors.primary, '#FF6B6B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.operatorName}>{schedule.bus.operator.name}</Text>
          <View style={[styles.busTypeBadge, isSleeper ? styles.sleeperBadge : styles.seaterBadge]}>
            <FontAwesome 
              name={isSleeper ? "bed" : "user"} 
              size={10} 
              color="#fff" 
              style={{ marginRight: 4 }} 
            />
            <Text style={styles.busTypeBadgeText}>
              {schedule.bus.bus_type.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.busInfo}>
          {schedule.bus.seat_layout} Layout • {schedule.bus.bus_number}
        </Text>
        <View style={styles.routeInfo}>
          <Text style={styles.routeText}>
            {schedule.route.from_city.name} → {schedule.route.to_city.name}
          </Text>
        </View>
        <Text style={styles.dateText}>
          📅 {schedule.travel_date} • 🕐 {schedule.departure_time.slice(0, 5)}
        </Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'seats' && styles.activeTab]}
          onPress={() => setActiveTab('seats')}
        >
          <Text style={[styles.tabText, activeTab === 'seats' && styles.activeTabText]}>Seats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'boarding' && styles.activeTab]}
          onPress={() => setActiveTab('boarding')}
        >
          <Text style={[styles.tabText, activeTab === 'boarding' && styles.activeTabText]}>Boarding</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dropping' && styles.activeTab]}
          onPress={() => setActiveTab('dropping')}
        >
          <Text style={[styles.tabText, activeTab === 'dropping' && styles.activeTabText]}>Dropping</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'seats' && (
          <>
            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                {isSleeper ? (
                  <View style={[styles.legendSleeper, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' }]} />
                ) : (
                  <View style={[styles.legendSeater, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' }]} />
                )}
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                {isSleeper ? (
                  <View style={[styles.legendSleeper, { backgroundColor: Colors.success }]} />
                ) : (
                  <View style={[styles.legendSeater, { backgroundColor: Colors.success }]} />
                )}
                <Text style={styles.legendText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                {isSleeper ? (
                  <View style={[styles.legendSleeper, { backgroundColor: '#E5E7EB' }]} />
                ) : (
                  <View style={[styles.legendSeater, { backgroundColor: '#E5E7EB' }]} />
                )}
                <Text style={styles.legendText}>Booked</Text>
              </View>
              <View style={styles.legendItem}>
                {isSleeper ? (
                  <View style={[styles.legendSleeper, { backgroundColor: '#FCE7F3' }]} />
                ) : (
                  <View style={[styles.legendSeater, { backgroundColor: '#FCE7F3' }]} />
                )}
                <Text style={styles.legendText}>Ladies</Text>
              </View>
            </View>

            {lowerDeck.length > 0 && (
              <View style={styles.deckSection}>
                <Text style={styles.deckTitle}>
                  {isSleeper ? '🛏️ Lower Deck' : '💺 Seats'}
                </Text>
                <View style={styles.deckContainer}>
                  {renderSeatMap(lowerDeck)}
                </View>
              </View>
            )}
            
            {upperDeck.length > 0 && (
              <View style={styles.deckSection}>
                <Text style={styles.deckTitle}>🛏️ Upper Deck</Text>
                <View style={styles.deckContainer}>
                  {renderSeatMap(upperDeck)}
                </View>
              </View>
            )}
          </>
        )}

        {activeTab === 'boarding' && (
          <View style={styles.pointsSection}>
            <Text style={styles.pointsSectionTitle}>Boarding Points</Text>
            {schedule.boarding_points?.map(renderBoardingPoint)}
            {(!schedule.boarding_points || schedule.boarding_points.length === 0) && (
              <Text style={styles.noPoints}>No boarding points available</Text>
            )}
          </View>
        )}

        {activeTab === 'dropping' && (
          <View style={styles.pointsSection}>
            <Text style={styles.pointsSectionTitle}>Dropping Points</Text>
            {schedule.dropping_points?.map(renderDroppingPoint)}
            {(!schedule.dropping_points || schedule.dropping_points.length === 0) && (
              <Text style={styles.noPoints}>No dropping points available</Text>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.selectionInfo}>
          <Text style={styles.selectedCount}>
            {selectedSeats.length} {isSleeper ? 'berth' : 'seat'}{selectedSeats.length !== 1 ? 's' : ''} selected
          </Text>
          <Text style={styles.totalAmount}>₹{getTotalAmount().toFixed(0)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.continueButton, selectedSeats.length === 0 && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={selectedSeats.length === 0}
        >
          <LinearGradient
            colors={selectedSeats.length > 0 ? [Colors.success, '#00C853'] : ['#D1D5DB', '#D1D5DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <FontAwesome name="arrow-right" size={14} color="#fff" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FD',
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  operatorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  busTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sleeperBadge: {
    backgroundColor: '#7C3AED',
  },
  seaterBadge: {
    backgroundColor: '#2563EB',
  },
  busTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  busInfo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  routeInfo: {
    marginTop: 14,
  },
  routeText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 14,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendSeater: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 6,
  },
  legendSleeper: {
    width: 28,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  deckSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  deckTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 14,
    textAlign: 'center',
  },
  deckContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  seatMap: {
    alignItems: 'center',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    width: '100%',
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  steeringWheel: {
    marginRight: 8,
  },
  driverText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sideSeats: {
    flexDirection: 'row',
  },
  aisle: {
    width: 24,
    height: 44,
  },
  sleeperAisle: {
    width: 20,
    height: 36,
  },
  // Seater seat styles (chair-like)
  seaterSeat: {
    width: 44,
    height: 48,
    marginHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
    position: 'relative',
  },
  chairBack: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  seaterSeatNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  // Sleeper seat styles (bed-like)
  sleeperSeat: {
    width: 70,
    height: 36,
    marginHorizontal: 3,
    marginVertical: 2,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sleeperContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pillow: {
    width: 12,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    marginRight: 6,
  },
  sleeperSeatNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  sleeperWindowIndicator: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#60A5FA',
  },
  windowIndicator: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#60A5FA',
  },
  unavailableSeatText: {
    color: '#9CA3AF',
  },
  selectedSeatText: {
    color: '#fff',
  },
  pointsSection: {
    padding: 16,
  },
  pointsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  pointCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pointTimeContainer: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 14,
  },
  pointTime: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  pointInfo: {
    flex: 1,
  },
  pointName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  pointLandmark: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  pointContact: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noPoints: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  selectionInfo: {
    flex: 1,
  },
  selectedCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
