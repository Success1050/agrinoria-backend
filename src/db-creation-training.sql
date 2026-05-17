-- Trainings (Main training programs)
CREATE TABLE IF NOT EXISTS trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    thumbnail TEXT,

    agora_channel_name VARCHAR(255) UNIQUE NOT NULL,

    scheduled_at TIMESTAMP NOT NULL,

    duration_minutes INTEGER NOT NULL,

    max_participants INTEGER,

    status VARCHAR(50) DEFAULT 'UPCOMING',

    started_at TIMESTAMP,
    ended_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recorded Videos
CREATE TABLE IF NOT EXISTS recorded_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_url VARCHAR(500) NOT NULL, -- Cloudinary URL
    thumbnail_url VARCHAR(500),
    duration INTEGER, -- in seconds
    file_size BIGINT, -- in bytes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments (Users enrolled in trainings) should be farmers
CREATE TABLE IF NOT EXISTS training_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,

    farmer_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

    attended BOOLEAN DEFAULT FALSE,

    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(training_id, farmer_id)
);

-- Video Progress Tracking
CREATE TABLE IF NOT EXISTS video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES recorded_videos(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    watched_seconds INTEGER DEFAULT 0,
    total_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(video_id, farmer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recorded_videos_training_id ON recorded_videos(training_id);
CREATE INDEX IF NOT EXISTS idx_recorded_videos_vendor_id ON recorded_videos(vendor_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_training_id ON training_enrollments(training_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_farmer_id ON training_enrollments(farmer_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_farmer_id ON video_progress(farmer_id);
