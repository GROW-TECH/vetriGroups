// D:\projects\vetri_updated\client\firebaseServices\projectFilesService.ts

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { ProjectFile } from '@/types';

const COLLECTION_NAME = 'projectFiles';

export class ProjectFilesService {
  /**
   * Get all project files
   */
  static async getAll(): Promise<ProjectFile[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTION_NAME));
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ProjectFile[];
    } catch (error) {
      console.error('Error getting project files:', error);
      throw error;
    }
  }

  /**
   * Get files by client ID
   */
  static async getByClientId(clientId: string): Promise<ProjectFile[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('clientId', '==', clientId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ProjectFile[];
    } catch (error) {
      console.error('Error getting files by client:', error);
      throw error;
    }
  }

  /**
   * Get files by type
   */
  static async getByType(clientId: string, type: 'plan' | 'agreement' | 'photo'): Promise<ProjectFile[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('clientId', '==', clientId),
        where('type', '==', type)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ProjectFile[];
    } catch (error) {
      console.error('Error getting files by type:', error);
      throw error;
    }
  }

  /**
   * Add a new project file
   */
  static async add(file: ProjectFile): Promise<string> {
    try {
      const fileRef = doc(db, COLLECTION_NAME, file.id);
      await setDoc(fileRef, {
        ...file,
        uploadedAt: file.uploadedAt || new Date().toISOString(),
      });
      return file.id;
    } catch (error) {
      console.error('Error adding project file:', error);
      throw error;
    }
  }

  /**
   * Delete a project file
   */
  static async delete(fileId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, fileId));
    } catch (error) {
      console.error('Error deleting project file:', error);
      throw error;
    }
  }

  /**
   * Real-time listener for project files
   */
  static onProjectFilesChange(callback: (files: ProjectFile[]) => void): () => void {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION_NAME),
      (snapshot) => {
        const files = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as ProjectFile[];
        callback(files);
      },
      (error) => {
        console.error('Error in project files listener:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Get photos for a client (convenience method)
   */
  static async getPhotosByClientId(clientId: string): Promise<ProjectFile[]> {
    return this.getByType(clientId, 'photo');
  }

  /**
   * Get plans for a client (convenience method)
   */
  static async getPlansByClientId(clientId: string): Promise<ProjectFile[]> {
    return this.getByType(clientId, 'plan');
  }

  /**
   * Get agreements for a client (convenience method)
   */
  static async getAgreementsByClientId(clientId: string): Promise<ProjectFile[]> {
    return this.getByType(clientId, 'agreement');
  }
}