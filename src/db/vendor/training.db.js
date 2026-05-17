import pool from "../../lib/connect.js";

// Training partner schedules a training session
export async function createTraining(
   vendorId,
   title,
   description,
   thumbnail,
   agoraChannelName,
   scheduledAt,
   durationMinutes,
   maxParticipants,
) {
   try {
      const result = await pool.query(
         ` INSERT INTO trainings (
          trainer_id,
          title,
          description,
          thumbnail,
          agora_channel_name,
          scheduled_at,
          duration_minutes,
          max_participants
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
         [vendorId, title, description, thumbnail, agoraChannelName, scheduledAt, durationMinutes, maxParticipants],
      );
      return result.rows[0];
   } catch (error) {
      console.error("error occurred while creating trainings", error);
      throw error;
   }
}

// Fetch trainings created by a specific Training partner. This will be used in the Training partner dashboard to list all trainings created by the trainer and also to manage them (edit, delete, view enrolled farmers, etc)
export async function getTrainingsByVendor(vendorId) {
   try {
      const result = await pool.query(
         `SELECT t.id, t.title, t.description, t.thumbnail, t.scheduled_at, t.duration_minutes, t.status, t.max_participants, t.agora_channel_name, COUNT(te.farmer_id) as enrolled_count FROM trainings t LEFT JOIN training_enrollments te ON t.id = te.training_id WHERE t.trainer_id = $1 GROUP BY t.id ORDER BY t.scheduled_at DESC`,
         [vendorId],
      );
      return { data: result.rows, total: result.rows.length };
   } catch (error) {
      console.error("Error fetching trainings by vendor:", error);
      return { error: "Error" };
   }
}

// Enrollments this should be farmers only
export async function enrollFarmerInTraining(trainingId, farmerId) {
   const result = await pool.query(
      `INSERT INTO training_enrollments (training_id, farmer_id) 
       VALUES ($1, $2) 
       ON CONFLICT (training_id, farmer_id) DO NOTHING 
       RETURNING *`,
      [trainingId, farmerId],
   );
   return result.rows[0];
}

// Get farmer enrollment count for a specific training. This will be used in the farmer dashboard
export async function getFarmerEnrollmentsCount(farmerId) {
   try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM training_enrollments WHERE farmer_id = $1`, [
         farmerId,
      ]);

      return { total: result.rows[0].count };
   } catch (error) {
      console.error("Error fetching farmer enrollments:", error);
      return { total: 0 };
   }
}

// Check if a farmer is enrolled in a specific training
export async function isFarmerEnrolled(trainingId, farmerId) {
   try {
      const result = await pool.query(`SELECT id FROM training_enrollments WHERE training_id = $1 AND farmer_id = $2`, [
         trainingId,
         farmerId,
      ]);
      return result.rows.length > 0;
   } catch (error) {
      console.error("Error checking farmer enrollment:", error);
      return false;
   }
}

// Update training status when training starts
export async function startTraining(trainingId) {
   try {
      const result = await pool.query(
         `UPDATE trainings SET status = 'LIVE', started_at = NOW() WHERE id = $1 AND status = 'UPCOMING' RETURNING *`,
         [trainingId],
      );
      return result.rows[0];
   } catch (error) {
      console.error("Error starting training:", error);
      throw error;
   }
}

// Update training status when training ends
export async function endTraining(trainingId) {
   try {
      const result = await pool.query(
         `UPDATE trainings SET status = 'COMPLETED', ended_at = NOW() WHERE id = $1 AND status = 'LIVE' RETURNING *`,
         [trainingId],
      );
      return result.rows[0];
   } catch (error) {
      console.error("Error ending training:", error);
      throw error;
   }
}

// Get training details with enrollment status for a farmer used to verify farmer is enrolled during session start
export async function getTrainingWithEnrollmentStatus(trainingId, farmerId) {
   try {
      const result = await pool.query(
         `SELECT t.*, v.fname AS trainer_fname, v.lname AS trainer_lname,
          CASE WHEN te.id IS NOT NULL THEN true ELSE false END AS is_enrolled
          FROM trainings t 
          LEFT JOIN vendors v ON t.trainer_id = v.id 
          LEFT JOIN training_enrollments te ON t.id = te.training_id AND te.farmer_id = $2
          WHERE t.id = $1`,
         [trainingId, farmerId],
      );
      return result.rows[0];
   } catch (error) {
      console.error("Error getting training with enrollment status:", error);
      throw error;
   }
}

// Get all trainings and enrollment with real-time status updates (farmer side)
export async function getTrainingsWithStatus() {
   try {
      const result = await pool.query(
         `SELECT t.id, t.title, t.description, t.thumbnail, t.scheduled_at, t.duration_minutes, t.status,
          v.fname AS trainer_fname, v.lname AS trainer_lname, te.training_id AS enrolled_training_id,
          CASE
            WHEN t.status = 'UPCOMING' AND t.scheduled_at <= NOW() THEN 'READY_TO_START'
            WHEN t.status = 'LIVE' AND t.scheduled_at + (t.duration_minutes * INTERVAL '1 minute') <= NOW() THEN 'SHOULD_END'
            ELSE t.status
          END AS computed_status
          FROM trainings t
          LEFT JOIN vendors v ON t.trainer_id = v.id
          LEFT JOIN training_enrollments te ON t.id = te.training_id
          ORDER BY t.scheduled_at ASC`,
      );

      // console.log("result", result.rows);
      return { data: result.rows, total: result.rows.length };
   } catch (error) {
      console.error("Error getting trainings with status:", error);
      return { data: [], total: 0 };
   }
}
