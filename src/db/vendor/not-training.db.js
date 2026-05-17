import pool from "../../lib/connect.js";

// Training Categories
export async function getAllTrainingCategories() {
   const result = await pool.query("SELECT * FROM training_categories ORDER BY name");
   return result.rows;
}

export async function createTrainingCategory(name, description, icon) {
   const result = await pool.query(
      "INSERT INTO training_categories (name, description, icon) VALUES ($1, $2, $3) RETURNING *",
      [name, description, icon],
   );
   return result.rows[0];
}

// Trainings
export async function createTraining(vendorId, categoryId, title, description, thumbnailUrl, difficultyLevel) {
   const result = await pool.query(
      `INSERT INTO trainings (vendor_id, category_id, title, description, thumbnail_url, difficulty_level) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [vendorId, categoryId, title, description, thumbnailUrl, difficultyLevel],
   );
   return result.rows[0];
}

export async function getVendorTrainings(vendorId, includeInactive = false) {
   const query = includeInactive
      ? "SELECT * FROM trainings WHERE vendor_id = $1 ORDER BY created_at DESC"
      : "SELECT * FROM trainings WHERE vendor_id = $1 AND is_active = true ORDER BY created_at DESC";

   const result = await pool.query(query, [vendorId]);
   return result.rows;
}

export async function getAllTrainings(limit = 20, offset = 0) {
   const result = await pool.query(
      `SELECT t.*, tc.name as category_name, v.fname as vendor_fname, v.lname as vendor_lname, v.profile_image_url
       FROM trainings t 
       LEFT JOIN training_categories tc ON t.category_id = tc.id 
       LEFT JOIN vendors v ON t.vendor_id = v.id 
       WHERE t.is_active = true 
       ORDER BY t.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset],
   );
   return result.rows;
}

export async function getTrainingById(trainingId) {
   const result = await pool.query(
      `SELECT t.*, tc.name as category_name, v.fname as vendor_fname, v.lname as vendor_lname, v.profile_image_url
       FROM trainings t 
       LEFT JOIN training_categories tc ON t.category_id = tc.id 
       LEFT JOIN vendors v ON t.vendor_id = v.id 
       WHERE t.id = $1`,
      [trainingId],
   );
   return result.rows[0];
}

export async function updateTraining(trainingId, updates) {
   const fields = Object.keys(updates);
   const values = Object.values(updates);
   const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ");

   const result = await pool.query(`UPDATE trainings SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`, [
      trainingId,
      ...values,
   ]);
   return result.rows[0];
}

export async function deleteTraining(trainingId) {
   const result = await pool.query(
      "UPDATE trainings SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *",
      [trainingId],
   );
   return result.rows[0];
}

// Live Sessions
export async function createLiveSession(
   trainingId,
   vendorId,
   title,
   description,
   scheduledStart,
   scheduledEnd,
   maxParticipants,
) {
   const result = await pool.query(
      `INSERT INTO live_sessions (training_id, vendor_id, title, description, scheduled_start, scheduled_end, max_participants) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [trainingId, vendorId, title, description, scheduledStart, scheduledEnd, maxParticipants],
   );
   return result.rows[0];
}

export async function getVendorLiveSessions(vendorId) {
   const result = await pool.query(
      `SELECT ls.*, t.title as training_title 
       FROM live_sessions ls 
       LEFT JOIN trainings t ON ls.training_id = t.id 
       WHERE ls.vendor_id = $1 
       ORDER BY ls.scheduled_start DESC`,
      [vendorId],
   );
   return result.rows;
}

export async function getUpcomingLiveSessions(limit = 10) {
   const result = await pool.query(
      `SELECT ls.*, t.title as training_title, v.fname as vendor_fname, v.lname as vendor_lname, v.profile_image_url
       FROM live_sessions ls 
       LEFT JOIN trainings t ON ls.training_id = t.id 
       LEFT JOIN vendors v ON ls.vendor_id = v.id 
       WHERE ls.status = 'scheduled' AND ls.scheduled_start > NOW() 
       ORDER BY ls.scheduled_start ASC 
       LIMIT $1`,
      [limit],
   );
   return result.rows;
}

export async function getLiveSessionById(sessionId) {
   const result = await pool.query(
      `SELECT ls.*, t.title as training_title, v.fname as vendor_fname, v.lname as vendor_lname, v.profile_image_url
       FROM live_sessions ls 
       LEFT JOIN trainings t ON ls.training_id = t.id 
       LEFT JOIN vendors v ON ls.vendor_id = v.id 
       WHERE ls.id = $1`,
      [sessionId],
   );
   return result.rows[0];
}

export async function updateLiveSession(sessionId, updates) {
   const fields = Object.keys(updates);
   const values = Object.values(updates);
   const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ");

   const result = await pool.query(
      `UPDATE live_sessions SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [sessionId, ...values],
   );
   return result.rows[0];
}

// Recorded Videos
export async function createRecordedVideo(
   trainingId,
   vendorId,
   title,
   description,
   videoUrl,
   thumbnailUrl,
   duration,
   fileSize,
) {
   const result = await pool.query(
      `INSERT INTO recorded_videos (training_id, vendor_id, title, description, video_url, thumbnail_url, duration, file_size) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [trainingId, vendorId, title, description, videoUrl, thumbnailUrl, duration, fileSize],
   );
   return result.rows[0];
}

export async function getVendorRecordedVideos(vendorId) {
   const result = await pool.query(
      `SELECT rv.*, t.title as training_title 
       FROM recorded_videos rv 
       LEFT JOIN trainings t ON rv.training_id = t.id 
       WHERE rv.vendor_id = $1 AND rv.is_active = true 
       ORDER BY rv.created_at DESC`,
      [vendorId],
   );
   return result.rows;
}

export async function getTrainingVideos(trainingId) {
   const result = await pool.query(
      "SELECT * FROM recorded_videos WHERE training_id = $1 AND is_active = true ORDER BY created_at ASC",
      [trainingId],
   );
   return result.rows;
}

export async function getRecordedVideoById(videoId) {
   const result = await pool.query(
      `SELECT rv.*, t.title as training_title, v.fname as vendor_fname, v.lname as vendor_lname, v.profile_image_url
       FROM recorded_videos rv 
       LEFT JOIN trainings t ON rv.training_id = t.id 
       LEFT JOIN vendors v ON rv.vendor_id = v.id 
       WHERE rv.id = $1`,
      [videoId],
   );
   return result.rows[0];
}

// Enrollments this should be farmers
export async function enrollUserInTraining(trainingId, farmerId) {
   const result = await pool.query(
      `INSERT INTO training_enrollments (training_id, farmer_id) 
       VALUES ($1, $2) 
       ON CONFLICT (training_id, farmer_id) DO NOTHING 
       RETURNING *`,
      [trainingId, farmerId],
   );
   return result.rows[0];
}

export async function getUserEnrollments(farmerId) {
   const result = await pool.query(
      `SELECT te.*, t.title, t.description, t.thumbnail_url, v.fname as vendor_fname, v.lname as vendor_lname
       FROM training_enrollments te 
       LEFT JOIN trainings t ON te.training_id = t.id 
       LEFT JOIN vendors v ON t.vendor_id = v.id 
       WHERE te.farmer_id = $1 
       ORDER BY te.enrolled_at DESC`,
      [farmerId],
   );
   return result.rows;
}

export async function getTrainingEnrollments(trainingId) {
   const result = await pool.query(
      `SELECT te.*, b.name as buyer_name, b.email as buyer_email
       FROM training_enrollments te 
       LEFT JOIN buyers b ON te.buyer_id = b.buyer_id 
       WHERE te.training_id = $1 
       ORDER BY te.enrolled_at DESC`,
      [trainingId],
   );
   return result.rows;
}

// Live Session Participants
export async function joinLiveSession(sessionId, buyerId) {
   const result = await pool.query(
      `INSERT INTO live_session_participants (session_id, farmer_id, joined_at, is_active) 
       VALUES ($1, $2, NOW(), true) 
       ON CONFLICT (session_id, farmer_id) 
       DO UPDATE SET 
         joined_at = NOW(), 
         is_active = true, 
         left_at = NULL 
       RETURNING *`,
      [sessionId, buyerId],
   );
   return result.rows[0];
}

export async function leaveLiveSession(sessionId, farmerId) {
   const result = await pool.query(
      `UPDATE live_session_participants 
       SET is_active = false, left_at = NOW() 
       WHERE session_id = $1 AND farmer_id = $2 
       RETURNING *`,
      [sessionId, farmerId],
   );
   return result.rows[0];
}

export async function getLiveSessionParticipants(sessionId) {
   const result = await pool.query(
      `SELECT lsp.*, v.fname as farmer_name, v.email as farmer_email
       FROM live_session_participants lsp 
       LEFT JOIN vendors v ON lsp.farmer_id = v.id 
       WHERE lsp.session_id = $1 
       ORDER BY lsp.joined_at ASC`,
      [sessionId],
   );
   return result.rows;
}

// Video Progress
export async function updateVideoProgress(videoId, buyerId, watchedSeconds, totalSeconds, isCompleted) {
   const result = await pool.query(
      `INSERT INTO video_progress (video_id, farmer_id, watched_seconds, total_seconds, is_completed, last_watched_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       ON CONFLICT (video_id, farmer_id) 
       DO UPDATE SET 
         watched_seconds = GREATEST(video_progress.watched_seconds, EXCLUDED.watched_seconds),
         total_seconds = EXCLUDED.total_seconds,
         is_completed = EXCLUDED.is_completed,
         last_watched_at = NOW() 
       RETURNING *`,
      [videoId, buyerId, watchedSeconds, totalSeconds, isCompleted],
   );
   return result.rows[0];
}

export async function getVideoProgress(videoId, farmerId) {
   const result = await pool.query("SELECT * FROM video_progress WHERE video_id = $1 AND farmer_id = $2", [
      videoId,
      farmerId,
   ]);
   return result.rows[0];
}

export async function getUserVideoProgress(farmerId, trainingId) {
   const result = await pool.query(
      `SELECT vp.*, rv.title, rv.duration
       FROM video_progress vp 
       LEFT JOIN recorded_videos rv ON vp.video_id = rv.id 
       WHERE vp.farmer_id = $1 AND rv.training_id = $2`,
      [farmerId, trainingId],
   );
   return result.rows;
}

// Live Chat
export async function addLiveChatMessage(sessionId, senderId, senderType, message) {
   const result = await pool.query(
      "INSERT INTO live_chat_messages (session_id, sender_id, sender_type, message) VALUES ($1, $2, $3, $4) RETURNING *",
      [sessionId, senderId, senderType, message],
   );
   return result.rows[0];
}

export async function getLiveChatMessages(sessionId, limit = 50) {
   const result = await pool.query(
      `SELECT lcm.*, 
              CASE 
                WHEN lcm.sender_type = 'vendor' THEN v.fname || ' ' || v.lname
                ELSE b.name
              END as sender_name
       FROM live_chat_messages lcm 
       LEFT JOIN vendors v ON lcm.sender_id = v.id AND lcm.sender_type = 'vendor'
       LEFT JOIN buyers b ON lcm.sender_id = b.buyer_id AND lcm.sender_type = 'buyer'
       WHERE lcm.session_id = $1 
       ORDER BY lcm.created_at ASC 
       LIMIT $2`,
      [sessionId, limit],
   );
   return result.rows;
}
