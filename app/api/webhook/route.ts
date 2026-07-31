import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-magic-hour-signature');
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
      console.warn('WEBHOOK_SECRET not set, skipping signature verification');
    } else if (signature) {
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    console.log('Webhook payload received:', payload);

    await connectToDatabase();
    
    // Magic Hour webhook payload format typically includes id, status, etc.
    const { id, status, error, output_url } = payload;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 });
    }

    const job = await Job.findOne({ id });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (status === 'complete' || status === 'completed') {
      let finalVideoUrl = output_url;
      
      // Upload Magic Hour result to Cloudinary for permanent storage
      if (output_url) {
        try {
          const uploadResult = await cloudinary.uploader.upload(output_url, {
            resource_type: 'video',
            folder: 'reframe_results',
          });
          finalVideoUrl = uploadResult.secure_url;
        } catch (uploadError) {
          console.error('Failed to upload result to Cloudinary:', uploadError);
          // Fallback to the original URL if upload fails
        }
      }

      job.status = 'complete';
      job.generatedVideoUrl = finalVideoUrl;
    } else if (status === 'failed' || status === 'error') {
      job.status = 'failed';
      job.error = error || 'Unknown error occurred during processing';
    } else {
      // Processing or other status
      job.status = 'processing';
    }

    await job.save();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
