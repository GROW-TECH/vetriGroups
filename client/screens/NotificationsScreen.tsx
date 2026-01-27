import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ThemedText } from '@/components/ThemedText';

interface Notification {
  id: string;
  type: string;
  clientName?: string;
  clientUsername?: string;
  message?: string;
  reason?: string;
  status: string;
  createdAt: any;
  date?: string;
  time?: string;
  readAt?: any;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Query for payment requests
    const requestsQuery = query(
      collection(db, 'requests'),
      where('type', '==', 'payment'),
      orderBy('createdAt', 'desc')
    );

    // Query for appointments
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      orderBy('createdAt', 'desc')
    );

    // Listen to both collections
    const unsubRequests = onSnapshot(requestsQuery, (snap) => {
      const requestsList: Notification[] = [];
      snap.forEach(doc => {
        requestsList.push({ 
          id: doc.id, 
          type: 'payment',
          ...doc.data() 
        } as Notification);
      });
      
      // Merge with appointments
      setNotifications(prev => {
        const appointments = prev.filter(n => n.type === 'appointment');
        return sortNotifications([...requestsList, ...appointments]);
      });
    });

    const unsubAppointments = onSnapshot(appointmentsQuery, (snap) => {
      const appointmentsList: Notification[] = [];
      snap.forEach(doc => {
        appointmentsList.push({ 
          id: doc.id, 
          type: 'appointment',
          ...doc.data() 
        } as Notification);
      });
      
      // Merge with requests
      setNotifications(prev => {
        const requests = prev.filter(n => n.type === 'payment');
        return sortNotifications([...requests, ...appointmentsList]);
      });
    });

    return () => {
      unsubRequests();
      unsubAppointments();
    };
  }, []);

  // Helper function to safely sort notifications
  const sortNotifications = (notifs: Notification[]) => {
    return notifs.sort((a, b) => {
      const timeA = getTimestamp(a.createdAt);
      const timeB = getTimestamp(b.createdAt);
      return timeB - timeA;
    });
  };

  // Helper function to safely get timestamp
  const getTimestamp = (createdAt: any): number => {
    if (!createdAt) return 0;
    
    // If it's a Firestore Timestamp object
    if (createdAt.toMillis && typeof createdAt.toMillis === 'function') {
      return createdAt.toMillis();
    }
    
    // If it's a Firestore Timestamp with seconds
    if (createdAt.seconds) {
      return createdAt.seconds * 1000;
    }
    
    // If it's already a number (unix timestamp)
    if (typeof createdAt === 'number') {
      return createdAt;
    }
    
    // If it's a Date object
    if (createdAt instanceof Date) {
      return createdAt.getTime();
    }
    
    // If it's a string, try to parse it
    if (typeof createdAt === 'string') {
      return new Date(createdAt).getTime();
    }
    
    return 0;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      // If it's a Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } 
      // If it has seconds property
      else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // If it's already a Date
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // If it's a string or number
      else {
        date = new Date(timestamp);
      }
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
      return '';
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <ThemedText type="title" style={{ marginBottom: 16 }}>
        Notifications
      </ThemedText>

      {notifications.length === 0 && (
        <ThemedText style={{ textAlign: 'center', marginTop: 32, color: '#999' }}>
          No notifications
        </ThemedText>
      )}

      {notifications.map(n => (
        <View
          key={n.id}
          style={{
            backgroundColor: '#fff',
            padding: 14,
            borderRadius: 12,
            marginBottom: 12,
            borderLeftWidth: 4,
            borderLeftColor: n.type === 'payment' ? '#4CAF50' : '#2196F3',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <ThemedText style={{ fontWeight: '700', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>
              {n.type === 'payment' ? '💰 Payment Request' : '📅 Appointment'}
            </ThemedText>
            <ThemedText style={{ fontSize: 11, color: '#999' }}>
              {formatDate(n.createdAt)}
            </ThemedText>
          </View>

          <ThemedText style={{ fontWeight: '600', marginTop: 8, fontSize: 16 }}>
            {n.clientName || n.clientUsername || 'Unknown Client'}
          </ThemedText>

          {n.type === 'payment' && n.message && (
            <ThemedText style={{ marginTop: 4, color: '#555' }}>
              {n.message}
            </ThemedText>
          )}

          {n.type === 'appointment' && (
            <View style={{ marginTop: 4 }}>
              {n.date && (
                <ThemedText style={{ color: '#555' }}>
                  📆 {n.date} at {n.time || 'N/A'}
                </ThemedText>
              )}
              {n.reason && (
                <ThemedText style={{ color: '#555', marginTop: 2 }}>
                  Reason: {n.reason}
                </ThemedText>
              )}
            </View>
          )}

          <View style={{ 
            marginTop: 8, 
            paddingVertical: 4,
            paddingHorizontal: 10,
            backgroundColor: n.status === 'accepted' ? '#E8F5E9' : n.status === 'declined' ? '#FFEBEE' : '#FFF3E0',
            borderRadius: 6,
            alignSelf: 'flex-start'
          }}>
            <ThemedText style={{ 
              fontSize: 12, 
              fontWeight: '600',
              color: n.status === 'accepted' ? '#2E7D32' : n.status === 'declined' ? '#C62828' : '#E65100'
            }}>
              {n.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}