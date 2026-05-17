import { v2 as cloudinary } from "cloudinary";
if (process.env.CLOUDINARY_API_KEY) {
   cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
   });
} else if (process.env.CLOUDINARY_URL) {
   cloudinary.config({
      secure: true,
   });
}

export { cloudinary };

// This function handles deleting image from the cloudinary still needs more worm.
export async function deleteImageFromCloudinary(imageUrl) {
   try {
      if (!imageUrl) return { success: false, message: "No image URL provided" };
      // Extract public_id from the URL
      const parts = imageUrl.split("/");
      const fileName = parts.pop();
      const folder = parts.slice(parts.indexOf("upload") + 2).join("/");

      const publicId = folder + "/" + fileName.substring(0, fileName.lastIndexOf("."));
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
   } catch (error) {
      return { success: false, error: "Failed to delete image from cloud. Try again." };
   }
}

// This function handles uploading image to the cloudinary
export async function saveImageToCloudinary(image, folder) {
   const base64 = image.buffer.toString("base64");
   const dataURI = `data:${image.mimetype};base64,${base64}`;

   const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: "image",
      folder,
   });

   return result.secure_url;
}
