import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { uploadcareUrl } = await req.json();

    if (!uploadcareUrl) {
      return NextResponse.json({ error: 'uploadcareUrl is required' }, { status: 400 });
    }

    // Upload to Cloudinary using the Uploadcare CDN URL
    const uploadResult = await cloudinary.uploader.upload(uploadcareUrl, {
      resource_type: 'video',
      folder: 'reframe_uploads',
    });

    return NextResponse.json({
      success: true,
      cloudinaryUrl: uploadResult.secure_url,
    });
  } catch (error: any) {
    console.error('Error in /api/upload:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
