import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // The magic hour job ID
  preset: { type: String, required: true },
  status: { type: String, required: true, enum: ['pending', 'processing', 'complete', 'failed'], default: 'pending' },
  timestamp: { type: String, required: true }, // We'll just store the ISO string
  duration: { type: String, default: '0:00' },
  strength: { type: Number, default: 0 },
  model: { type: String, default: 'Standard' },
  gradient: { type: String, default: '' },
  originalVideoUrl: { type: String, required: true },
  generatedVideoUrl: { type: String }, // Populated when complete
  error: { type: String } // Populated if failed
}, { timestamps: true });

export default mongoose.models.Job || mongoose.model('Job', JobSchema);
