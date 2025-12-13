import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  View,
  Text,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { bookingService } from '../../services';
import { Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import Colors from '@/constants/Colors';

export default function BookingsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadBookings();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadBookings = async () => {
    try {
      const response = await bookingService.getBookings();
      setBookings(response.bookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }, []);

  const handleCancelBooking = async (bookingId: number) => {
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
              await bookingService.cancelBooking(bookingId);
              Alert.alert('Success', 'Booking cancelled. Amount refunded to wallet.');
              loadBookings();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIcon}>
          <FontAwesome name="ticket" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Login to view your trips</Text>
        <Text style={styles.emptySubtitle}>Book and manage your journeys</Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.loginButton}>
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: '#E8F5E9', color: Colors.success };
      case 'cancelled':
        return { bg: '#FFEBEE', color: Colors.error };
      case 'completed':
        return { bg: '#E3F2FD', color: Colors.info };
      default:
        return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => {
    const statusStyle = getStatusStyle(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.bookingCard}
        onPress={() => router.push(`/ticket-details?id=${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.bookingCode}>{item.booking_code}</Text>
            <Text style={styles.operatorName}>{item.operator_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.routeSection}>
          <View style={styles.cityBlock}>
            <Text style={styles.timeText}>{item.departure_time?.slice(0, 5)}</Text>
            <Text style={styles.cityName}>{item.from_city || 'N/A'}</Text>
          </View>
          <View style={styles.routeLine}>
            <View style={styles.dot} />
            <View style={styles.line} />
            <FontAwesome name="bus" size={14} color={Colors.primary} />
            <View style={styles.line} />
            <View style={styles.dot} />
          </View>
          <View style={[styles.cityBlock, { alignItems: 'flex-end' }]}>
            <Text style={styles.timeText}>{item.arrival_time?.slice(0, 5)}</Text>
            <Text style={styles.cityName}>{item.to_city || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <FontAwesome name="calendar" size={12} color="#6B7280" />
            <Text style={styles.detailText}>{item.travel_date}</Text>
          </View>
          <View style={styles.detailItem}>
            <FontAwesome name="users" size={12} color="#6B7280" />
            <Text style={styles.detailText}>{item.passengers.length} Passenger(s)</Text>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <Text style={styles.amountText}>₹{item.total_amount.toFixed(0)}</Text>
          <View style={styles.viewDetailsButton}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <FontAwesome name="chevron-right" size={12} color={Colors.primary} style={{ marginLeft: 6 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {bookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIcon}>
            <FontAwesome name="suitcase" size={40} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>Book your first bus ticket now!</Text>
          <TouchableOpacity 
            style={styles.bookNowButton}
            onPress={() => router.push('/(tabs)')}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Book Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
    padding: 20,
    backgroundColor: '#F8F9FD',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookNowButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    paddingHorizontal: 48,
    paddingVertical: 14,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cityBlock: {
    flex: 1,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  cityName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  routeLine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
  },
  amountText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  cancelButton: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: 13,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewDetailsText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});
