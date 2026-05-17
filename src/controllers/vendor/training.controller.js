import {
   createTraining,
   getTrainingsByVendor,
   // getTrainingsForFarmers,
   enrollFarmerInTraining,
   // getEnrolledFarmersForTraining,
   getFarmerEnrollmentsCount,
   isFarmerEnrolled,
   startTraining,
   endTraining,
   getTrainingWithEnrollmentStatus,
   getTrainingsWithStatus,
} from "../../db/vendor/training.db.js";
import { saveImageToCloudinary } from "../../lib/cloudinary.img.js";
import { verifyVendorToken } from "../../sessions/vendor.auth.session.js";
import agoraService from "../../services/agora.service.js";

const trainingController = {};

trainingController.createTraining = async (req, res) => {
   const payload = await verifyVendorToken(req);

   if (!payload) {
      return res.status(401).json({
         success: false,
         message: "Unauthorized",
      });
   }

   const channelName = `training_${Date.now()}`;
   try {
      const { title, description, scheduledAt, durationMinutes, maxParticipants } = req.body;
      const thumbnail = req.file;

      if (!thumbnail || !title || !description || !scheduledAt || !durationMinutes || !maxParticipants) {
         return res.status(400).json({
            success: false,
            message: "All fields are required",
         });
      }

      const thumbnailSaveToCloud = await saveImageToCloudinary(thumbnail, "training_thumbnails");
      if (!thumbnailSaveToCloud) {
         return res.status(500).json({
            success: false,
            message: "Failed to upload thumbnail",
         });
      }

      const training = await createTraining(
         payload.id,
         title,
         description,
         thumbnailSaveToCloud,
         channelName,
         scheduledAt,
         durationMinutes,
         maxParticipants,
      );
      return res.status(201).json({
         success: true,
         data: training,
      });
   } catch (error) {
      console.error("Error creating training:", error);
      return res.status(500).json({
         success: false,
         message: error.message || "Internal server error",
      });
   }
};

trainingController.getTrainingsByVendor = async (req, res) => {
   const payload = await verifyVendorToken(req);
   if (!payload) {
      return res.status(401).json({
         success: false,
         error: "Unauthorized",
      });
   }
   try {
      const trainings = await getTrainingsByVendor(payload.id);
      return res.status(200).json({
         success: true,
         data: trainings.data,
         total: trainings.total,
      });
   } catch (error) {
      console.error("Error fetching trainings:", error);
      return res.status(500).json({
         success: false,
         error: error.message || "Internal server error. Try again later.",
      });
   }
};

trainingController.enrollFarmerInTraining = async (req, res) => {
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

      const enrollment = await enrollFarmerInTraining(trainingId, payload.id);

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

trainingController.getFarmerEnrollmentsCount = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }
      const enrollments = await getFarmerEnrollmentsCount(payload.id);
      return res.status(200).json({
         success: true,
         total: enrollments.total,
      });
   } catch (error) {
      console.error("Error fetching farmer enrollments:", error);
      return res.status(500).json({
         success: false,
         error: error.message || "Internal server error. Try again later.",
      });
   }
};

// Start training session (Training Partner only)
/* trainingController.startTraining = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Training Partner
      if (payload.account_type !== "Training_Partner") {
         return res.status(403).json({
            success: false,
            error: "Only Training Partners can start training sessions",
         });
      }

      const { trainingId } = req.params;

      // Check if training exists and belongs to this trainer
      const training = await getTrainingWithEnrollmentStatus(trainingId, null);
      if (!training || training.trainer_id !== payload.id) {
         return res.status(404).json({
            success: false,
            error: "Training not found or access denied",
         });
      }

      // Start the training
      const updatedTraining = await startTraining(trainingId);

      console.log("Training started:", updatedTraining);
      console.log("Agora channel name:", updatedTraining.agora_channel_name);

      // Generate host token for the trainer
      const uid = `trainer_${payload.id}`;
      const hostToken = agoraService.generateRtcToken(
         updatedTraining.agora_channel_name,
         uid,
         "publisher",
         7200, // 2 hours
      );

      const responseData = {
         training: updatedTraining,
         agoraToken: hostToken,
         channelName: updatedTraining.agora_channel_name,
         appId: agoraService.getAppId(),
      };

      console.log("Sending response:", {
         ...responseData,
         agoraToken: hostToken ? "TOKEN_GENERATED" : "NO_TOKEN",
         appId: agoraService.getAppId() ? "APP_ID_SET" : "NO_APP_ID",
      });

      return res.status(200).json({
         success: true,
         data: responseData,
      });
   } catch (error) {
      console.error("Error starting training:", error);
      return res.status(500).json({
         success: false,
         error: error.message || "Failed to start training",
      });
   }
}; */

trainingController.startTraining = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);

      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      if (payload.account_type !== "Training_Partner") {
         return res.status(403).json({
            success: false,
            error: "Only Training Partners can start training sessions",
         });
      }

      const { trainingId } = req.params;

      const training = await getTrainingWithEnrollmentStatus(trainingId, null);

      if (!training || training.trainer_id !== payload.id) {
         return res.status(404).json({
            success: false,
            error: "Training not found or access denied",
         });
      }

      const updatedTraining = await startTraining(trainingId);

      const uid = `trainer_${payload.id.slice(0, 8)}`;

      const agoraToken = agoraService.generateRtcToken(updatedTraining.agora_channel_name, uid, "publisher", 7200);

      return res.status(200).json({
         success: true,
         data: {
            training: updatedTraining,
            agoraToken,
            channelName: updatedTraining.agora_channel_name,
            appId: agoraService.getAppId(),
            uid,
         },
      });
   } catch (error) {
      console.error(error);

      return res.status(500).json({
         success: false,
         error: error.message || "Failed to start training",
      });
   }
};

// End training session (Training Partner only)
trainingController.endTraining = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      // Verify the vendor is a Training Partner
      if (payload.account_type !== "Training_Partner") {
         return res.status(403).json({
            success: false,
            error: "Only Training Partners can end training sessions",
         });
      }

      const { trainingId } = req.params;

      // End the training
      const updatedTraining = await endTraining(trainingId);

      return res.status(200).json({
         success: true,
         data: updatedTraining,
      });
   } catch (error) {
      console.error("Error ending training:", error);
      return res.status(500).json({
         success: false,
         error: error.message || "Failed to end training",
      });
   }
};

// Join training session (Farmer only)
/* trainingController.joinTraining = async (req, res) => {
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
            error: "Only Farmers can join training sessions",
         });
      }

      const { trainingId } = req.params;

      // Check if farmer is enrolled
      const isEnrolled = await isFarmerEnrolled(trainingId, payload.id);
      if (!isEnrolled) {
         return res.status(403).json({
            success: false,
            error: "You must be enrolled to join this training",
         });
      }

      // Get training details
      const training = await getTrainingWithEnrollmentStatus(trainingId, payload.id);
      if (!training || training.status !== "LIVE") {
         return res.status(400).json({
            success: false,
            error: "Training is not currently live",
         });
      }

      // Generate participant token for the farmer
      const uid = `farmer_${payload.id}`;
      const participantToken = agoraService.generateRtcToken(
         training.agora_channel_name,
         uid,
         "publisher", // Allow farmers to speak too
         7200, // 2 hours
      );

      return res.status(200).json({
         success: true,
         data: {
            training,
            agoraToken: participantToken,
            channelName: training.agora_channel_name,
            appId: agoraService.appId(),
         },
      });
   } catch (error) {
      console.error("Error joining training:", error);
      return res.status(500).json({
         success: false,
         error: error.message || "Failed to join training",
      });
   }
}; */

trainingController.joinTraining = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);

      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      if (payload.account_type !== "Farmer") {
         return res.status(403).json({
            success: false,
            error: "Only Farmers can join training sessions",
         });
      }

      const { trainingId } = req.params;

      const enrolled = await isFarmerEnrolled(trainingId, payload.id);

      if (!enrolled) {
         return res.status(403).json({
            success: false,
            error: "You must be enrolled to join this training",
         });
      }

      const training = await getTrainingWithEnrollmentStatus(trainingId, payload.id);

      if (!training || training.status !== "LIVE") {
         return res.status(400).json({
            success: false,
            error: "Training is not currently live",
         });
      }

      const uid = `farmer_${payload.id.slice(0, 8)}`;

      const agoraToken = agoraService.generateRtcToken(training.agora_channel_name, uid, "publisher", 7200);

      return res.status(200).json({
         success: true,
         data: {
            training,
            agoraToken,
            channelName: training.agora_channel_name,
            appId: agoraService.getAppId(),
            uid,
         },
      });
   } catch (error) {
      console.error(error);

      return res.status(500).json({
         success: false,
         error: error.message || "Failed to join training",
      });
   }
};

// Get trainings with real-time status updates
trainingController.getTrainingsWithStatus = async (req, res) => {
   try {
      const payload = await verifyVendorToken(req);
      if (!payload) {
         return res.status(401).json({
            success: false,
            error: "Unauthorized",
         });
      }

      const trainings = await getTrainingsWithStatus();
      return res.status(200).json({
         success: true,
         data: trainings.data,
         total: trainings.total,
      });
   } catch (error) {
      console.error("Error getting trainings with status:", error);
      return res.status(500).json({
         success: false,
         error: error.message || "Failed to get trainings",
      });
   }
};

export default trainingController;
