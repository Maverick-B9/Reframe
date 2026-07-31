import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoUrl, preset, strength, model, gradient } = body;

    if (!videoUrl || !preset) {
      return NextResponse.json({ error: 'videoUrl and preset are required' }, { status: 400 });
    }

    const MAGIC_HOUR_API_KEY = process.env.MAGIC_HOUR_API_KEY;
    const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhook`;

    if (!MAGIC_HOUR_API_KEY) {
      // Return a simulated success for local dev without keys, but log the issue
      console.warn('MAGIC_HOUR_API_KEY is not set. Simulating response.');
      const mockJobId = `mock_job_${Date.now()}`;
      
      await connectToDatabase();
      await Job.create({
        id: mockJobId,
        preset,
        status: 'pending',
        timestamp: new Date().toISOString(),
        strength: strength || 0,
        model: model || 'Standard',
        gradient: gradient || '',
        originalVideoUrl: videoUrl,
      });

      return NextResponse.json({ success: true, jobId: mockJobId });
    }

    // Call Magic Hour API
    const response = await fetch('https://api.magichour.ai/v1/ai-video/video-to-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAGIC_HOUR_API_KEY}`,
      },
      body: JSON.stringify({
        video_url: videoUrl,
        style: preset, // Assuming preset maps to style or similar prompt logic
        webhook_url: WEBHOOK_URL,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Magic Hour API Error:', data);
      return NextResponse.json({ error: data.message || 'Magic Hour API Error' }, { status: response.status });
    }

    const jobId = data.id;

    // Save job in MongoDB
    await connectToDatabase();
    await Job.create({
      id: jobId,
      preset,
      status: 'pending',
      timestamp: new Date().toISOString(),
      strength: strength || 0,
      model: model || 'Standard',
      gradient: gradient || '',
      originalVideoUrl: videoUrl,
    });

    return NextResponse.json({
      success: true,
      jobId,
    });
  } catch (error: any) {
    console.error('Error in /api/transform:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
