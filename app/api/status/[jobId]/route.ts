import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Job from '@/models/Job';

export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    const job = await Job.findOne({ id: jobId });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // In local dev without keys, let's simulate progression for testing UI
    if (job.status === 'pending' && !process.env.MAGIC_HOUR_API_KEY) {
      // Advance to processing after first poll
      job.status = 'processing';
      await job.save();
    } else if (job.status === 'processing' && !process.env.MAGIC_HOUR_API_KEY) {
      // Advance to complete after second poll
      // 50% chance of failure for UI testing if the user selects Noir (mock logic)
      if (job.preset === 'Noir') {
        job.status = 'failed';
        job.error = 'Simulated Magic Hour failure for testing UI error state';
      } else {
        job.status = 'complete';
        job.generatedVideoUrl = job.originalVideoUrl; // Just use original as mock output
      }
      await job.save();
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        preset: job.preset,
        generatedVideoUrl: job.generatedVideoUrl,
        error: job.error,
      }
    });
  } catch (error: any) {
    console.error('Error in /api/status/[jobId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
