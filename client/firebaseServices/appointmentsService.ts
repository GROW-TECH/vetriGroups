// D:\projects\vetri_updated\client\firebaseServices\appointmentsService.ts

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Appointment } from '@/types';

const COLLECTION_NAME = 'appointments';

export class AppointmentsService {
  /**
   * Get all appointments
   */
  static async getAll(): Promise<Appointment[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Appointment[];
    } catch (error) {
      console.error('Error getting appointments:', error);
      throw error;
    }
  }

  /**
   * Get appointments by client ID
   */
  static async getByClientId(clientId: string): Promise<Appointment[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('clientId', '==', clientId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Appointment[];
    } catch (error) {
      console.error('Error getting appointments by client:', error);
      throw error;
    }
  }

  /**
   * Get appointments by status
   */
  static async getByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<Appointment[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', status),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Appointment[];
    } catch (error) {
      console.error('Error getting appointments by status:', error);
      throw error;
    }
  }

  /**
   * Add a new appointment
   */
  static async add(appointment: Appointment): Promise<string> {
    try {
      const appointmentRef = doc(db, COLLECTION_NAME, appointment.id);
      await setDoc(appointmentRef, {
        ...appointment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return appointment.id;
    } catch (error) {
      console.error('Error adding appointment:', error);
      throw error;
    }
  }

  /**
   * Update an appointment
   */
  static async update(appointmentId: string, data: Partial<Appointment>): Promise<void> {
    try {
      const appointmentRef = doc(db, COLLECTION_NAME, appointmentId);
      const { id, ...updateData } = data;
      
      await updateDoc(appointmentRef, {
        ...updateData,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  }

  /**
   * Delete an appointment
   */
  static async delete(appointmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, appointmentId));
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  }

  /**
   * Real-time listener for appointments
   */
  static onAppointmentsChange(callback: (appointments: Appointment[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appointments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Appointment[];
        callback(appointments);
      },
      (error) => {
        console.error('Error in appointments listener:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Approve an appointment
   */
  static async approve(appointmentId: string): Promise<void> {
    try {
      await this.update(appointmentId, { status: 'approved' });
    } catch (error) {
      console.error('Error approving appointment:', error);
      throw error;
    }
  }

  /**
   * Reject an appointment
   */
  static async reject(appointmentId: string): Promise<void> {
    try {
      await this.update(appointmentId, { status: 'rejected' });
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      throw error;
    }
  }
}