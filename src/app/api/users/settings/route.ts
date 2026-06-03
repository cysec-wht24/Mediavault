import { NextRequest, NextResponse } from "next/server";
import { connect } from "@/dbConfig/dbConfig";
import User from "@/models/userModel";
import { getDataFromToken } from "@/helpers/getDataFromToken";
import bcryptjs from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

connect();

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET method to fetch user settings
export async function GET(request: NextRequest) {
  try {
    // Get user ID from token
    const userId = await getDataFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find the user
    const user = await User.findById(userId).select("-password -forgotPasswordToken -forgotPasswordTokenExpiry -verifyToken -verifyTokenExpiry");
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        fullName: user.fullName || "",
        profilePicture: user.profilePicture || "",
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error: any) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// POST method to update user settings
export async function POST(request: NextRequest) {
  try {
    // Get user ID from token
    const userId = await getDataFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const fullName = formData.get("fullName") as string;
    const username = formData.get("username") as string;
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const profilePictureFile = formData.get("profilePicture") as File | null;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update basic fields
    if (fullName !== undefined && fullName !== null) {
      user.fullName = fullName;
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 }
        );
      }
      user.username = username;
    }

    // Handle password change
    if (currentPassword && newPassword) {
      // Verify current password
      const validPassword = await bcryptjs.compare(currentPassword, user.password);
      if (!validPassword) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }

      // Hash and update new password
      const salt = await bcryptjs.genSalt(10);
      user.password = await bcryptjs.hash(newPassword, salt);
    }

    // Handle profile picture upload
    if (profilePictureFile && profilePictureFile.size > 0) {
      const bytes = await profilePictureFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to Cloudinary as base64
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "mediavault/profiles",
              public_id: `profile-${userId}`,
              overwrite: true,
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      });

      user.profilePicture = uploadResult.secure_url;
    }

    // Save updated user
    await user.save();

    return NextResponse.json({
      message: "Settings updated successfully",
      success: true,
      user: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error: any) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}