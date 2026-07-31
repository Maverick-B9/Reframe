import express from 'express';
import cors from 'cors';

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const app = express();
app.use(cors());
app.use(express.json());

import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('=> using existing database connection');
    return;
  }
  
  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is undefined. Vercel environment variables are missing!');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      tlsAllowInvalidCertificates: true
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('Connected to real MongoDB Atlas instance');
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas!', err.message);
  }
};

// Add a middleware to ensure connection before handling API routes
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

const JobSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  preset: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'complete', 'failed'], default: 'pending' },
  timestamp: { type: String, required: true },
  strength: { type: Number, default: 0 },
  model: { type: String, default: 'Standard' },
  gradient: { type: String, default: '' },
  originalVideoUrl: { type: String },
  generatedVideoUrl: { type: String },
  error: { type: String }
});
const Job = mongoose.models.Job || mongoose.model('Job', JobSchema);

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post('/api/upload', async (req, res) => {
  try {
    const { uploadcareUrl } = req.body;
    if (!uploadcareUrl) return res.status(400).json({ error: 'uploadcareUrl required' });
    console.log('[Real API] Uploading to Cloudinary:', uploadcareUrl);
    const uploadResult = await cloudinary.uploader.upload(uploadcareUrl, {
      resource_type: 'video',
      folder: 'reframe_uploads',
    });
    console.log('[Real API] Cloudinary upload successful:', uploadResult.secure_url);
    res.json({ success: true, cloudinaryUrl: uploadResult.secure_url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PRESET_MAP = {
  'Cinematic': 'Cyberpunk',
  'Anime': 'Ghibli Anime',
  'Oil Paint': 'Oil Painting',
  'Neon City': 'Neon Dream',
  'Dreamscape': 'Dark Fantasy',
  'Vintage Film': 'Retro Sci-Fi',
  'Watercolor': 'Watercolor',
  'Noir': 'No Art Style'
};

app.post('/api/transform', async (req, res) => {
  try {
    const { videoUrl, preset, prompt, strength, model, gradient } = req.body;
    console.log('[Real API] Starting Magic Hour transform for video:', videoUrl);
    
    // 1. Map preset to allowed art style
    const artStyle = PRESET_MAP[preset] || 'No Art Style';
    
    // 2. Download from Cloudinary to a Buffer
    console.log('[Real API] Downloading video from Cloudinary...');
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error('Failed to download source video');
    const videoBuffer = await videoResponse.arrayBuffer();
    
    // 3. Request Magic Hour Upload URL
    console.log('[Real API] Requesting Magic Hour Upload URL...');
    const uploadUrlReq = await fetch('https://api.magichour.ai/v1/files/upload-urls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAGIC_HOUR_API_KEY}`
      },
      body: JSON.stringify({ items: [{ type: 'video', extension: 'mp4' }] })
    });
    const uploadUrlData = await uploadUrlReq.json();
    if (!uploadUrlReq.ok) throw new Error(`Magic Hour upload URL failed: ${uploadUrlData.message || JSON.stringify(uploadUrlData)}`);
    
    const { upload_url, file_path } = uploadUrlData.items[0];
    
    // 4. Upload the video to Magic Hour
    console.log('[Real API] Uploading video to Magic Hour...', file_path);
    const putReq = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4'
      },
      body: videoBuffer
    });
    if (!putReq.ok) throw new Error(`Failed to upload to Magic Hour CDN: ${putReq.status}`);

    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook`;

    // 5. Trigger Video-to-Video API
    console.log('[Real API] Triggering transformation...');
    const response = await fetch('https://api.magichour.ai/v1/video-to-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAGIC_HOUR_API_KEY}`,
      },
      body: JSON.stringify({
        style: {
          art_style: artStyle,
          model: "default",
          prompt: prompt || null
        },
        assets: {
          video_source: "file",
          video_file_path: file_path
        },
        start_seconds: 0,
        end_seconds: 2,
        name: `Reframe-${Date.now()}`,
        webhook_url: webhookUrl.startsWith('http://localhost') ? 'https://example.com/api/webhook' : webhookUrl, // MH requires a valid URL
      }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error('Magic Hour Error:', data);
      return res.status(response.status).json({ error: data.message });
    }
    
    const jobId = data.id;
    console.log('[Real API] Magic Hour Job created:', jobId);
    
    await Job.create({
      id: jobId,
      preset,
      status: 'pending',
      timestamp: new Date().toISOString(),
      strength,
      model,
      gradient,
      originalVideoUrl: videoUrl,
    });
    res.json({ success: true, jobId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/status/:jobId', async (req, res) => {
  try {
    const job = await Job.findOne({ id: req.params.jobId });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    // If the job is still pending or processing, poll the actual Magic Hour API
    // because local webhooks won't work on localhost without ngrok!
    if (job.status === 'pending' || job.status === 'processing') {
      const mhResponse = await fetch(`https://api.magichour.ai/v1/video-projects/${req.params.jobId}`, {
        headers: { 'Authorization': `Bearer ${process.env.MAGIC_HOUR_API_KEY}` }
      });
      if (mhResponse.ok) {
        const mhData = await mhResponse.json();
        console.log(`[Real API] Job ${req.params.jobId} MH Status:`, mhData.status);
        
        if (mhData.status === 'completed' || mhData.status === 'complete') {
            job.status = 'complete';
            
            let videoUrlToUpload = null;
            if (mhData.download && mhData.download.url) {
                videoUrlToUpload = mhData.download.url;
            } else if (mhData.downloads && mhData.downloads.length > 0) {
                videoUrlToUpload = mhData.downloads[0].url;
            } else if (mhData.result && mhData.result.video_url) {
                videoUrlToUpload = mhData.result.video_url;
            }

            if (videoUrlToUpload) {
                const uploadResult = await cloudinary.uploader.upload(videoUrlToUpload, {
                    resource_type: 'video',
                    folder: 'reframe_results',
                });
                job.generatedVideoUrl = uploadResult.secure_url;
            }
            await job.save();
        } else if (mhData.status === 'error' || mhData.status === 'failed') {
            job.status = 'failed';
            job.error = mhData.error || 'Magic hour processing failed';
            await job.save();
        } else if (mhData.status === 'processing' || mhData.status === 'in_progress' || mhData.status === 'rendering') {
            if (job.status !== 'processing') {
                job.status = 'processing';
                await job.save();
            }
        }
      } else {
        const text = await mhResponse.text();
        console.error(`[Real API] MH Polling failed for ${req.params.jobId}: ${mhResponse.status} - ${text}`);
      }
    }

    res.json({ success: true, job });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ timestamp: -1 });
    res.json({ success: true, jobs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// We keep webhook for completion if deployed, though polling handles local dev.
app.post('/api/webhook', async (req, res) => {
  try {
    console.log('[Real API] Webhook received', req.body.type || 'unknown event');
    const { type, payload } = req.body;
    
    if (payload && payload.id) {
        const job = await Job.findOne({ id: payload.id });
        if (job) {
            if (type === 'video.completed' || payload.status === 'complete' || payload.status === 'completed') {
                job.status = 'complete';
                
                let videoUrlToUpload = null;
                if (payload.download && payload.download.url) {
                    videoUrlToUpload = payload.download.url;
                } else if (payload.downloads && payload.downloads.length > 0) {
                    videoUrlToUpload = payload.downloads[0].url;
                } else if (payload.result && payload.result.video_url) {
                    videoUrlToUpload = payload.result.video_url;
                }

                if (videoUrlToUpload && !job.generatedVideoUrl) {
                    console.log(`[Real API] Webhook: Uploading ${payload.id} video to Cloudinary...`);
                    const uploadResult = await cloudinary.uploader.upload(videoUrlToUpload, {
                        resource_type: 'video',
                        folder: 'reframe_results',
                    });
                    job.generatedVideoUrl = uploadResult.secure_url;
                }
                await job.save();
                console.log(`[Real API] Webhook: Job ${payload.id} successfully marked as complete.`);
            } else if (type === 'video.errored' || payload.status === 'error' || payload.status === 'failed') {
                job.status = 'failed';
                job.error = payload.error || 'Magic hour processing failed';
                await job.save();
                console.error(`[Real API] Webhook: Job ${payload.id} failed.`);
            } else if (payload.status === 'processing' || payload.status === 'in_progress') {
                if (job.status !== 'processing') {
                    job.status = 'processing';
                    await job.save();
                    console.log(`[Real API] Webhook: Job ${payload.id} marked as processing.`);
                }
            }
        }
    }
    res.json({ success: true });
  } catch (e) {
    console.error('Webhook processing error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default app;
