import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  View,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { bookingService } from '../services';
import { BookingDetail, BoardingPoint, DroppingPoint } from '../types';
import Colors from '@/constants/Colors';

export default function TicketDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadBookingDetails(parseInt(id));
    }
  }, [id]);

  const loadBookingDetails = async (bookingId: number) => {
    try {
      const data = await bookingService.getBookingDetails(bookingId);
      setBooking(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load booking details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? Amount will be refunded to your wallet.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingService.cancelBooking(booking.id);
              Alert.alert('Success', 'Booking cancelled. Amount refunded to wallet.');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: '#E8F5E9', color: Colors.success, icon: 'check-circle' as const };
      case 'cancelled':
        return { bg: '#FFEBEE', color: Colors.error, icon: 'times-circle' as const };
      case 'completed':
        return { bg: '#E3F2FD', color: Colors.info, icon: 'flag-checkered' as const };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', icon: 'clock-o' as const };
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (time: string) => time?.slice(0, 5) || '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const statusStyle = getStatusStyle(booking.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, '#FF6B6B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ticket Details</Text>
          <Text style={styles.bookingCode}>{booking.booking_code}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <FontAwesome name={statusStyle.icon} size={12} color="#fff" />
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Route Card */}
        <View style={styles.card}>
          <View style={styles.routeHeader}>
            <Text style={styles.operatorName}>{booking.operator_name}</Text>
            {booking.operator_rating && (
              <View style={styles.ratingBadge}>
                <FontAwesome name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{booking.operator_rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.busInfo}>
            <Text style={styles.busType}>{booking.bus_type?.toUpperCase()}</Text>
            <Text style={styles.busNumber}>{booking.bus_number}</Text>
          </View>

          <View style={styles.routeSection}>
            <View style={styles.cityBlock}>
              <Text style={styles.timeText}>{formatTime(booking.departure_time || '')}</Text>
              <Text style={styles.cityName}>{booking.from_city}</Text>
            </View>
            <View style={styles.routeLine}>
              <View style={styles.dot} />
              <View style={styles.line}>
                <Text style={styles.durationText}>{formatDuration(booking.duration_minutes)}</Text>
              </View>
              <View style={styles.dot} />
            </View>
            <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
              <Text style={styles.timeText}>{formatTime(booking.arrival_time || '')}</Text>
              <Text style={styles.cityName}>{booking.to_city}</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <FontAwesome name="calendar" size={14} color={Colors.primary} />
            <Text style={styles.dateText}>{booking.travel_date}</Text>
            <View style={styles.divider} />
            <FontAwesome name="road" size={14} color={Colors.primary} />
            <Text style={styles.dateText}>{booking.distance_km} km</Text>
          </View>
        </View>

        {/* Passengers */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="users" size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Passengers</Text>
          </View>
          {booking.passengers.map((passenger, index) => (
            <View key={passenger.id} style={styles.passengerRow}>
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>{passenger.passenger_name}</Text>
                <Text style={styles.passengerDetails}>
                  {passenger.passenger_age} yrs • {passenger.passenger_gender}
                </Text>
              </View>
              <View style={styles.seatBadge}>
                <FontAwesome name="ticket" size={12} color={Colors.primary} />
                <Text style={styles.seatNumber}>{passenger.seat_number}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bus Tracking - Boarding Points */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="map-marker" size={16} color={Colors.success} />
            <Text style={styles.sectionTitle}>Boarding Points</Text>
          </View>
          <View style={styles.timeline}>
            {booking.boarding_points.map((point, index) => (
              <View key={point.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: Colors.success }]} />
                  {index < booking.boarding_points.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: '#D1FAE5' }]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.pointHeader}>
                    <Text style={styles.pointTime}>{formatTime(point.time)}</Text>
                    <Text style={styles.pointName}>{point.name}</Text>
                  </View>
                  {point.landmark && (
                    <Text style={styles.pointLandmark}>📍 {point.landmark}</Text>
                  )}
                  {point.address && (
                    <Text style={styles.pointAddress}>{point.address}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bus Tracking - Dropping Points */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="flag" size={16} color={Colors.error} />
            <Text style={styles.sectionTitle}>Dropping Points</Text>
          </View>
          <View style={styles.timeline}>
            {booking.dropping_points.map((point, index) => (
              <View key={point.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: Colors.error }]} />
                  {index < booking.dropping_points.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: '#FEE2E2' }]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.pointHeader}>
                    <Text style={styles.pointTime}>{formatTime(point.time)}</Text>
                    <Text style={styles.pointName}>{point.name}</Text>
                  </View>
                  {point.landmark && (
                    <Text style={styles.pointLandmark}>📍 {point.landmark}</Text>
                  )}
                  {point.address && (
                    <Text style={styles.pointAddress}>{point.address}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Amenities */}
        {booking.amenities && booking.amenities.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="star" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Amenities</Text>
            </View>
            <View style={styles.amenitiesRow}>
              {booking.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityBadge}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="credit-card" size={16} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Payment</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method</Text>
            <Text style={styles.paymentValue}>{booking.payment_method.toUpperCase()}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₹{booking.total_amount.toFixed(0)}</Text>
          </View>
        </View>

        {/* Cancel Button */}
        {booking.status === 'confirmed' && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBooking}>
            <FontAwesome name="times" size={16} color="#fff" />
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FD' },
  errorText: { fontSize: 16, color: '#6B7280' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, marginLeft: 15 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  bookingCode: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff', marginLeft: 6 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  operatorName: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { fontSize: 12, fontWeight: '600', color: '#92400E', marginLeft: 4 },
  busInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  busType: { fontSize: 12, fontWeight: '600', color: Colors.primary, backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 10 },
  busNumber: { fontSize: 13, color: '#6B7280' },
  routeSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cityBlock: { flex: 1 },
  timeText: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  cityName: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  routeLine: { flex: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  line: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
  durationText: { fontSize: 10, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  dateText: { fontSize: 14, color: '#1A1A2E', fontWeight: '500', marginLeft: 8 },
  divider: { width: 1, height: 16, backgroundColor: '#E5E7EB', marginHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginLeft: 10 },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  passengerDetails: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  seatBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  seatNumber: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginLeft: 6 },
  timeline: { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', marginBottom: 8 },
  timelineLeft: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 12 },
  pointHeader: { flexDirection: 'row', alignItems: 'center' },
  pointTime: { fontSize: 14, fontWeight: '700', color: Colors.primary, width: 50 },
  pointName: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', flex: 1 },
  pointLandmark: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  pointAddress: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap' },
  amenityBadge: { backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  amenityText: { fontSize: 12, fontWeight: '500', color: '#0369A1', textTransform: 'capitalize' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  paymentLabel: { fontSize: 14, color: '#6B7280' },
  paymentValue: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  totalAmount: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.error, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  cancelButtonText: { fontSize: 16, fontWeight: '700', color: '#fff', marginLeft: 10 },
});
