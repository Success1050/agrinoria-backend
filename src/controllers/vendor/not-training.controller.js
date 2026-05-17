import { z } from "zod";
import {
   getAllTrainingCategories,
   createTraining,
   getVendorTrainings,
   getAllTrainings,
   getTrainingById,
   updateTraining,
   deleteTraining,
   createLiveSession,
   getVendorLiveSessions,
   getUpcomingLiveSessions,
   getLiveSessionById,
   updateLiveSession,
   createRecordedVideo,
   getVendorRecordedVideos,
   getTrainingVideos,
   getRecordedVideoById,
   enrollUserInTraining,
   getUserEnrollments,
   getTrainingEnrollments,
   joinLiveSession,
   leaveLiveSession,
   getLiveSessionParticipants,
   updateVideoProgress,
   getVideoProgress,
   getUserVideoProgress,
   addLiveChatMessage,
   getLiveChatMessages,
} from "../../db/vendor/not-training.db.js";
import { verifyVendorToken } from "../../sessions/vendor.auth.session.js";
import livekitService from "../../services/livekit.service-not-in-use.js";

// Validation schemas
const createTrainingSchema = z.object({
   categoryId: z.string().uuid().optional(),
   title: z.string().min(3).max(200),
   description: z.string().optional(),
   thumbnailUrl: z.string().url().optional(),
   difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
});

const createLiveSessionSchema = z.object({
   trainingId: z.string().uuid(),
   title: z.string().min(3).max(200),
   description: z.string().optional(),
   scheduledStart: z.string().datetime(),
   scheduledEnd: z.string().datetime(),
   maxParticipants: z.number().min(1).max(1000).default(100),
});

const createRecordedVideoSchema = z.object({
   trainingId: z.string().uuid(),
   title: z.string().min(3).max(200),
   description: z.string().optional(),
   videoUrl: z.string().url(),
   thumbnailUrl: z.string().url().optional(),
   duration: z.number().min(1),
   fileSize: z.number().min(1),
});

const updateVideoProgressSchema = z.object({
   watchedSeconds: z.number().min(0),
   totalSeconds: z.number().min(0),
   isCompleted: z.boolean().default(false),
});

const chatMessageSchema = z.object({
   message: z.string().min(1).max(500),
});

const trainingController = {};

// Training Categories
trainingController.getAllCategories = async (req, res) => {
   try {
      const categories = await getAllTrainingCategories();
      return res.status(200).json({
         success: true,
         data: categories,
      });
   } catch (error) {
      console.error("Error getting training categories:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get training categories",
      });
   }
};

// Trainings
trainingController.createTraining = async (req, res) => {
   try {
      // Verify vendor authentication
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Training_Partner
      if (payload.account_type !== "Training_Partner") {
         return res.status(403).json({
            success: false,
            error: "Only Training Partners can create trainings",
         });
      }

      // Validate input
      const validatedData = createTrainingSchema.parse(req.body);

      // Create training
      const training = await createTraining(
         payload.id,
         validatedData.categoryId,
         validatedData.title,
         validatedData.description,
         validatedData.thumbnailUrl,
         validatedData.difficultyLevel,
      );

      return res.status(201).json({
         success: true,
         data: training,
      });
   } catch (error) {
      console.error("Error creating training:", error);
      if (error.name === "ZodError") {
         return res.status(400).json({
            success: false,
            error: error.errors,
         });
      }
      return res.status(500).json({
         success: false,
         error: "Failed to create training",
      });
   }
};

trainingController.getVendorTrainings = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const includeInactive = req.query.includeInactive === "true";
      const trainings = await getVendorTrainings(payload.id, includeInactive);

      return res.status(200).json({
         success: true,
         data: trainings,
      });
   } catch (error) {
      console.error("Error getting vendor trainings:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get trainings",
      });
   }
};

trainingController.getAllTrainings = async (req, res) => {
   try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const trainings = await getAllTrainings(limit, offset);

      return res.status(200).json({
         success: true,
         data: trainings,
      });
   } catch (error) {
      console.error("Error getting all trainings:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get trainings",
      });
   }
};

trainingController.getTrainingById = async (req, res) => {
   try {
      const { id } = req.params;
      const training = await getTrainingById(id);

      if (!training) {
         return res.status(404).json({
            success: false,
            error: "Training not found",
         });
      }

      return res.status(200).json({
         success: true,
         data: training,
      });
   } catch (error) {
      console.error("Error getting training:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get training",
      });
   }
};

trainingController.updateTraining = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const { id } = req.params;
      const updates = req.body;

      const training = await updateTraining(id, updates);

      if (!training) {
         return res.status(404).json({
            success: false,
            error: "Training not found",
         });
      }

      return res.status(200).json({
         success: true,
         data: training,
      });
   } catch (error) {
      console.error("Error updating training:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to update training",
      });
   }
};

trainingController.deleteTraining = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const { id } = req.params;
      const training = await deleteTraining(id);

      if (!training) {
         return res.status(404).json({
            success: false,
            error: "Training not found",
         });
      }

      return res.status(200).json({
         success: true,
         data: training,
      });
   } catch (error) {
      console.error("Error deleting training:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to delete training",
      });
   }
};

// Live Sessions
trainingController.createLiveSession = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const validatedData = createLiveSessionSchema.parse(req.body);

      // Create live session
      const liveSession = await createLiveSession(
         validatedData.trainingId,
         payload.id,
         validatedData.title,
         validatedData.description,
         validatedData.scheduledStart,
         validatedData.scheduledEnd,
         validatedData.maxParticipants,
      );

      return res.status(201).json({
         success: true,
         data: liveSession,
      });
   } catch (error) {
      console.error("Error creating live session:", error);
      if (error.name === "ZodError") {
         return res.status(400).json({
            success: false,
            error: error.errors,
         });
      }
      return res.status(500).json({
         success: false,
         error: "Failed to create live session",
      });
   }
};

trainingController.getVendorLiveSessions = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const sessions = await getVendorLiveSessions(payload.id);

      return res.status(200).json({
         success: true,
         data: sessions,
      });
   } catch (error) {
      console.error("Error getting vendor live sessions:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get live sessions",
      });
   }
};

trainingController.getUpcomingLiveSessions = async (req, res) => {
   try {
      const limit = parseInt(req.query.limit) || 10;
      const sessions = await getUpcomingLiveSessions(limit);

      return res.status(200).json({
         success: true,
         data: sessions,
      });
   } catch (error) {
      console.error("Error getting upcoming live sessions:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get upcoming live sessions",
      });
   }
};

trainingController.getLiveSessionById = async (req, res) => {
   try {
      const { id } = req.params;
      const session = await getLiveSessionById(id);

      if (!session) {
         return res.status(404).json({
            success: false,
            error: "Live session not found",
         });
      }

      return res.status(200).json({
         success: true,
         data: session,
      });
   } catch (error) {
      console.error("Error getting live session:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get live session",
      });
   }
};

trainingController.startLiveSession = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const { id } = req.params;

      // Check if LiveKit is configured
      if (!livekitService.isConfigured()) {
         return res.status(500).json({
            success: false,
            error: "Live streaming service not configured",
         });
      }

      // Get session details
      const session = await getLiveSessionById(id);
      if (!session) {
         return res.status(404).json({
            success: false,
            error: "Live session not found",
         });
      }

      // Verify ownership
      if (session.vendor_id !== payload.id) {
         return res.status(403).json({
            success: false,
            error: "Access denied",
         });
      }

      // Generate room name
      const roomName = livekitService.generateRoomName(`session-${id}`);

      // Create LiveKit room
      await livekitService.createRoom(roomName, 300, session.max_participants);

      // Update session with room info and status
      const updatedSession = await updateLiveSession(id, {
         room_id: roomName,
         status: "live",
         actual_start: new Date().toISOString(),
      });

      // Generate host token
      const hostToken = livekitService.generateAccessToken(
         roomName,
         `${payload.fname} ${payload.lname}`,
         `vendor-${payload.id}`,
         "host",
      );

      return res.status(200).json({
         success: true,
         data: {
            session: updatedSession,
            roomName,
            hostToken,
            serverUrl: livekitService.serverUrl,
         },
      });
   } catch (error) {
      console.error("Error starting live session:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to start live session",
      });
   }
};

trainingController.joinLiveSession = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Farmer
      if (payload.account_type !== "Farmer") {
         return res.status(403).json({
            success: false,
            error: "Only Farmers can join live sessions",
         });
      }

      const { id } = req.params;

      // Get session details
      const session = await getLiveSessionById(id);
      if (!session) {
         return res.status(404).json({
            success: false,
            error: "Live session not found",
         });
      }

      // Check if session is live
      if (session.status !== "live") {
         return res.status(400).json({
            success: false,
            error: "Session is not live",
         });
      }

      // Join session
      await joinLiveSession(id, payload.id);

      // Generate participant token
      const participantToken = livekitService.generateAccessToken(
         session.room_id,
         `${payload.fname} ${payload.lname}`,
         `farmer-${payload.id}`,
         "participant",
      );

      return res.status(200).json({
         success: true,
         data: {
            session,
            roomName: session.room_id,
            participantToken,
            serverUrl: livekitService.serverUrl,
         },
      });
   } catch (error) {
      console.error("Error joining live session:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to join live session",
      });
   }
};

trainingController.endLiveSession = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const { id } = req.params;

      // Get session details
      const session = await getLiveSessionById(id);
      if (!session) {
         return res.status(404).json({
            success: false,
            error: "Live session not found",
         });
      }

      // Verify ownership
      if (session.vendor_id !== payload.id) {
         return res.status(403).json({
            success: false,
            error: "Access denied",
         });
      }

      // Update session status
      const updatedSession = await updateLiveSession(id, {
         status: "ended",
         actual_end: new Date().toISOString(),
      });

      // Delete LiveKit room
      if (session.room_id) {
         try {
            await livekitService.deleteRoom(session.room_id);
         } catch (error) {
            console.error("Error deleting LiveKit room:", error);
         }
      }

      return res.status(200).json({
         success: true,
         data: updatedSession,
      });
   } catch (error) {
      console.error("Error ending live session:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to end live session",
      });
   }
};

// Recorded Videos
trainingController.createRecordedVideo = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const validatedData = createRecordedVideoSchema.parse(req.body);

      const video = await createRecordedVideo(
         validatedData.trainingId,
         payload.id,
         validatedData.title,
         validatedData.description,
         validatedData.videoUrl,
         validatedData.thumbnailUrl,
         validatedData.duration,
         validatedData.fileSize,
      );

      return res.status(201).json({
         success: true,
         data: video,
      });
   } catch (error) {
      console.error("Error creating recorded video:", error);
      if (error.name === "ZodError") {
         return res.status(400).json({
            success: false,
            error: error.errors,
         });
      }
      return res.status(500).json({
         success: false,
         error: "Failed to create recorded video",
      });
   }
};

trainingController.getVendorRecordedVideos = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const videos = await getVendorRecordedVideos(payload.id);

      return res.status(200).json({
         success: true,
         data: videos,
      });
   } catch (error) {
      console.error("Error getting vendor recorded videos:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get recorded videos",
      });
   }
};

trainingController.getTrainingVideos = async (req, res) => {
   try {
      const { id } = req.params;
      const videos = await getTrainingVideos(id);

      return res.status(200).json({
         success: true,
         data: videos,
      });
   } catch (error) {
      console.error("Error getting training videos:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get training videos",
      });
   }
};

trainingController.getRecordedVideoById = async (req, res) => {
   try {
      const { id } = req.params;
      const video = await getRecordedVideoById(id);

      if (!video) {
         return res.status(404).json({
            success: false,
            error: "Video not found",
         });
      }

      return res.status(200).json({
         success: true,
         data: video,
      });
   } catch (error) {
      console.error("Error getting recorded video:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get recorded video",
      });
   }
};

// Enrollments
trainingController.enrollInTraining = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Farmer (not Training_Partner)
      if (payload.account_type !== "Farmer") {
         return res.status(403).json({
            success: false,
            error: "Only Farmers can enroll in trainings",
         });
      }

      const { trainingId } = req.params;

      const enrollment = await enrollUserInTraining(trainingId, payload.id);

      return res.status(201).json({
         success: true,
         data: enrollment,
      });
   } catch (error) {
      console.error("Error enrolling in training:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to enroll in training",
      });
   }
};

trainingController.getUserEnrollments = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Farmer
      if (payload.account_type !== "Farmer") {
         return res.status(403).json({
            success: false,
            error: "Only Farmers can view their enrollments",
         });
      }

      const enrollments = await getUserEnrollments(payload.id);

      return res.status(200).json({
         success: true,
         data: enrollments,
      });
   } catch (error) {
      console.error("Error getting user enrollments:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get enrollments",
      });
   }
};

trainingController.getTrainingEnrollments = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Training_Partner
      if (payload.account_type !== "Training_Partner") {
         return res.status(403).json({
            success: false,
            error: "Only Training Partners can view training enrollments",
         });
      }

      const { trainingId } = req.params;
      const enrollments = await getTrainingEnrollments(trainingId);

      return res.status(200).json({
         success: true,
         data: enrollments,
      });
   } catch (error) {
      console.error("Error getting training enrollments:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get training enrollments",
      });
   }
};

// Video Progress
trainingController.updateVideoProgress = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Farmer
      if (payload.account_type !== "Farmer") {
         return res.status(403).json({
            success: false,
            error: "Only Farmers can update video progress",
         });
      }

      const { videoId } = req.params;
      const validatedData = updateVideoProgressSchema.parse(req.body);

      const progress = await updateVideoProgress(
         videoId,
         payload.id,
         validatedData.watchedSeconds,
         validatedData.totalSeconds,
         validatedData.isCompleted,
      );

      return res.status(200).json({
         success: true,
         data: progress,
      });
   } catch (error) {
      console.error("Error updating video progress:", error);
      if (error.name === "ZodError") {
         return res.status(400).json({
            success: false,
            error: error.errors,
         });
      }
      return res.status(500).json({
         success: false,
         error: "Failed to update video progress",
      });
   }
};

trainingController.getVideoProgress = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Farmer
      if (payload.account_type !== "Farmer") {
         return res.status(403).json({
            success: false,
            error: "Only Farmers can view video progress",
         });
      }

      const { videoId } = req.params;
      const progress = await getVideoProgress(videoId, payload.id);

      return res.status(200).json({
         success: true,
         data: progress || null,
      });
   } catch (error) {
      console.error("Error getting video progress:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get video progress",
      });
   }
};

trainingController.getUserVideoProgress = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Farmer
      if (payload.account_type !== "Farmer") {
         return res.status(403).json({
            success: false,
            error: "Only Farmers can view their video progress",
         });
      }

      const { trainingId } = req.params;
      const progress = await getUserVideoProgress(payload.id, trainingId);

      return res.status(200).json({
         success: true,
         data: progress,
      });
   } catch (error) {
      console.error("Error getting user video progress:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get user video progress",
      });
   }
};

// Live Chat
trainingController.addChatMessage = async (req, res) => {
   try {
      // Allow both vendors (Training_Partners and Farmers) to send messages
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Determine sender type based on account type
      let senderType = payload.account_type === "Training_Partner" ? "trainer" : "farmer";
      let senderId = payload.id;

      const { sessionId } = req.params;
      const validatedData = chatMessageSchema.parse(req.body);

      const message = await addLiveChatMessage(sessionId, senderId, senderType, validatedData.message);

      return res.status(201).json({
         success: true,
         data: message,
      });
   } catch (error) {
      console.error("Error adding chat message:", error);
      if (error.name === "ZodError") {
         return res.status(400).json({
            success: false,
            error: error.errors,
         });
      }
      return res.status(500).json({
         success: false,
         error: "Failed to add chat message",
      });
   }
};

trainingController.getChatMessages = async (req, res) => {
   try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const messages = await getLiveChatMessages(sessionId, limit);

      return res.status(200).json({
         success: true,
         data: messages,
      });
   } catch (error) {
      console.error("Error getting chat messages:", error);
      return res.status(500).json({
         success: false,
         error: "Failed to get chat messages",
      });
   }
};

export default trainingController;
