// client/lib/photoDownload.ts
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type PhotoDoc = {
  id: string;
  url: string;
};

type PhotoGroup = {
  groupId: string;
  siteName: string;
  date: string;
  items: PhotoDoc[];
};

export async function downloadGroupAsZip(group: PhotoGroup) {
  try {
    const photoUrls = group.items.map(p => p.url);
    
    const response = await fetch('https://projects.growtechnologies.in/vetrigroups/download-photos.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoUrls),
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    saveAs(blob, `${group.siteName}_${group.date}.zip`);
    
  } catch (error) {
    console.error('Failed to create ZIP:', error);
    alert('Failed to download photos. Please try again.');
  }
}

/* ================= HELPERS ================= */

function loadImageAsBlob(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas not supported');

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject('Blob conversion failed');
      }, 'image/jpeg');
    };

    img.onerror = () => reject('Image load failed');

    img.src = url;
  });
}