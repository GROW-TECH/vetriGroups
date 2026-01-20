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
import { Vendor, VendorMaterial } from "@/types";

function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  
  return result as T;
}

export class VendorsService {
  static async getAll(): Promise<Vendor[]> {
    const q = query(collection(db, "vendors"), orderBy("name", "asc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "",
        contactPerson: data.contactPerson || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        materials: data.materials || [],
        gstNumber: data.gstNumber || "",
        notes: data.notes || "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Vendor;
    });
  }

  static async add(vendor: Omit<Vendor, "id" | "createdAt">) {
    // Clean and prepare the vendor data
    const vendorData = {
      name: vendor.name || "",
      contactPerson: vendor.contactPerson || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      materials: vendor.materials.map((m: VendorMaterial) => ({
        category: m.category,
        name: m.name,
        unitPrice: typeof m.unitPrice === 'string' ? parseFloat(m.unitPrice) : m.unitPrice,
        unit: m.unit,
      })),
      gstNumber: vendor.gstNumber || "",
      notes: vendor.notes || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("FINAL VENDOR PAYLOAD:", vendorData); // ✅ debug

    const docRef = await addDoc(collection(db, "vendors"), vendorData);
    return docRef.id;
  }

  static async update(id: string, data: Partial<Vendor>) {
    // Remove undefined values from update data
    const updateData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    
    updateData.updatedAt = serverTimestamp();
    
    await updateDoc(doc(db, "vendors", id), updateData);
  }

  static async delete(id: string) {
    await deleteDoc(doc(db, "vendors", id));
  }
}