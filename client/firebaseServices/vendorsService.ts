import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { Vendor } from "@/types";

export class VendorsService {
  static async getAll(): Promise<Vendor[]> {
    const q = query(collection(db, "vendors"), orderBy("name", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Vendor, "id">),
    }));
  }

  static async add(vendor: Omit<Vendor, "id" | "createdAt">) {
    await addDoc(collection(db, "vendors"), {
      ...vendor,
      materials: vendor.materials.map(m => ({
        category: m.category,
        name: m.name,
        unitPrice: Number(m.unitPrice),
        unit: m.unit,
      })),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  static async update(id: string, data: Partial<Vendor>) {
    await updateDoc(doc(db, "vendors", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  static async delete(id: string) {
    await deleteDoc(doc(db, "vendors", id));
  }
}
