import { rtdb } from '@/firebaseConfig';
import { ref, push, set, onValue, get, child } from 'firebase/database';
import { Client } from '@/types';

export class ClientsRealtimeService {
  private static PATH = 'clients';

  static async getAll(): Promise<Client[]> {
    try {
      const snapshot = await get(child(ref(rtdb), this.PATH));
      if (!snapshot.exists()) return [];
      const data = snapshot.val() || {};
      // data is an object of { key: clientData }
      const list: Client[] = Object.keys(data).map((key) => ({ id: key, ...(data[key] as any) }));
      // sort by name asc if available
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (e) {
      console.error('RTDB getAll clients failed:', e);
      throw e;
    }
  }

  static async add(client: Omit<Client, 'id'>): Promise<string> {
    try {
      const clientsRef = ref(rtdb, this.PATH);
      const newRef = push(clientsRef);
      const payload: any = {
        name: client.name,
        projectName: client.projectName,
        status: client.status,
        totalAmount: client.totalAmount,
        location: client.location,
        ownerPhone: client.ownerPhone,
        username: client.username,
        password: client.password,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      // remove undefined to keep RTDB tidy
      Object.keys(payload).forEach((k) => {
        if (payload[k] === undefined) delete payload[k];
      });
      await set(newRef, payload);
      return newRef.key as string;
    } catch (e) {
      console.error('RTDB add client failed:', e);
      throw e;
    }
  }

  static onClientsChange(callback: (clients: Client[]) => void) {
    const clientsRef = ref(rtdb, this.PATH);
    return onValue(clientsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Client[] = Object.keys(data).map((key) => ({ id: key, ...(data[key] as any) }));
      callback(list);
    });
  }
}
