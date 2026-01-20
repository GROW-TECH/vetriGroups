import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Platform } from 'react-native';
import { storage } from '../firebaseConfig';

export async function uploadEmployeeProfilePhoto(
  uri: string,
  employeeId: string
): Promise<string> {
  try {
    console.log('🖼️ Uploading photo for employee:', employeeId);
    console.log('Platform:', Platform.OS);
    console.log('Image URI:', uri);

    // Fetch the image as blob
    let blob: Blob;
    
    if (Platform.OS === 'web') {
      // For web: fetch from blob URL or data URL
      if (uri.startsWith('blob:')) {
        const response = await fetch(uri);
        blob = await response.blob();
      } else if (uri.startsWith('data:')) {
        // Convert data URL to blob
        const response = await fetch(uri);
        blob = await response.blob();
      } else {
        // If it's already a URL, just return it
        console.log('🌐 Web: Using existing URL');
        return uri;
      }
    } else {
      // For mobile
      const response = await fetch(uri);
      blob = await response.blob();
    }

    console.log('📦 Blob size:', blob.size, 'type:', blob.type);

    // Create storage reference with unique filename
    const timestamp = Date.now();
    const filename = `profile_${employeeId}_${timestamp}.jpg`;
    const imageRef = ref(storage, `employees/${filename}`);

    // Upload to Firebase Storage
    console.log('⏫ Uploading to Firebase Storage...');
    await uploadBytes(imageRef, blob);
    
    // Get download URL
    console.log('✅ Upload complete, getting download URL...');
    const downloadURL = await getDownloadURL(imageRef);
    
    console.log('🔗 Download URL:', downloadURL);
    return downloadURL;
    
  } catch (error) {
    console.error('❌ Error uploading employee photo:', error);
    
    // Fallback: return the original URI for web
    if (Platform.OS === 'web') {
      console.warn('⚠️ Using fallback URI for web:', uri);
      return uri;
    }
    
    throw error;
  }
}