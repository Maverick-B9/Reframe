import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch all jobs, sorted by newest first
    const jobs = await Job.find({}).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        preset: job.preset,
        status: job.status,
        timestamp: job.timestamp,
        duration: job.duration,
        strength: job.strength,
        model: job.model,
        gradient: job.gradient,
        originalVideoUrl: job.originalVideoUrl,
        generatedVideoUrl: job.generatedVideoUrl,
        error: job.error,
      }))
    });
  } catch (error: any) {
    console.error('Error in /api/history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
