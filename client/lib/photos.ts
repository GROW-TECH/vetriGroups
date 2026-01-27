import { storage, db, auth } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export async function uploadPhotoAndCreateDoc({
  uri,
  siteId,
  siteName,
  uploader,
}: {
  uri: string;
  siteId: string;
  siteName?: string | null;
  uploader?: { id?: string; name?: string } | null;
}): Promise<string> {
  console.log('Starting upload for URI:', uri);
  
  try {
    // Ensure user is authenticated with email
    if (!auth.currentUser) {
      console.log('No authenticated user, creating/signing in with test account...');
      const testEmail = 'test@construction-mt.com';
      const testPassword = 'test123456';
      
      try {
        // Try to create test user first (will fail if already exists)
        console.log('Attempting to create test user...');
        const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        console.log('✅ Test user created successfully:', userCredential.user.uid);
      } catch (createError: any) {
        if (createError.code === 'auth/email-already-in-use') {
          console.log('Test user already exists, signing in...');
          // User already exists, sign in
          const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
          console.log('✅ Existing user sign-in successful:', userCredential.user.uid);
        } else {
          console.error('Failed to create test user:', createError);
          throw createError;
        }
      }
    } else {
      console.log('User already authenticated:', auth.currentUser.uid);
    }

    // Convert URI to blob with better error handling
    let blob: Blob;
    try {
      console.log('Fetching image from URI...');
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      blob = await response.blob();
      console.log('✅ Image blob created successfully, size:', blob.size);
    } catch (fetchError) {
      console.error('Failed to process image:', fetchError);
      throw new Error(`Failed to process image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    // Create filename with proper path
    const timestamp = Date.now();
    const filename = `photos/${siteId}/${timestamp}.jpg`;
    console.log('Uploading to path:', filename);
    
    const storageRef = ref(storage, filename);

    // Upload with metadata
    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: {
        siteId,
        uploadedBy: uploader?.name || auth.currentUser?.email || 'Test User',
        timestamp: timestamp.toString(),
      },
    };

    console.log('Starting Firebase Storage upload...');
    await uploadBytes(storageRef, blob, metadata);
    console.log('✅ Storage upload successful');

    console.log('Getting download URL...');
    const url = await getDownloadURL(storageRef);
    console.log('✅ Download URL obtained:', url);

    // Write Firestore document
    console.log('Writing to Firestore...');
    const docRef = await addDoc(collection(db, 'photos'), {
      url,
      siteId,
      siteName: siteName || null,
      uploader: uploader || { name: auth.currentUser?.email || 'Test User' },
      createdAt: serverTimestamp(),
      filename,
    });
    console.log('✅ Firestore document created:', docRef.id);

    return url;
  } catch (error) {
    console.error('Upload error details:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      uri,
      siteId,
    });
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('unauthorized') || error.message.includes('permission')) {
        throw new Error('Permission denied. Please check Firebase Storage security rules.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      } else if (error.message.includes('quota')) {
        throw new Error('Storage quota exceeded. Please check your Firebase plan.');
      }
    }
    
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
