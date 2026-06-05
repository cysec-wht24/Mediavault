import {connect} from "@/dbConfig/dbConfig";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/helpers/getDataFromToken";
import { v2 as cloudinary } from 'cloudinary';

import Playlist from '@/models/playlistModel';
import mongoose from 'mongoose';

connect()

// Configure Cloudinary - Make sure this runs before any API calls
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function generateThumbnailUrl(
  publicId: string,
  {
    startOffset = '0',     
    width       = 320,     
    height      = 180      
  } = {}
): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',               
    format: 'jpg',                        
    transformation: [
      { start_offset: startOffset },      
      { width, height, crop: 'fill' }     
    ]
  });
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate the user
        const userId = await getDataFromToken(request);
        if (!userId) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    
        // Parse request body
        const { public_id, playlistId, title } = await request.json();
        console.log("Received data:", { public_id, playlistId, title });
    
        // Validate inputs
        if (!public_id) {
          return NextResponse.json(
            { error: "Missing public_id" },
            { status: 400 }
          );
        }

        if (!playlistId) {
            return NextResponse.json(
              { error: "Missing playlist_Id" },
              { status: 400 }
            );
          }
    
        // Generate thumbnail URL
        const thumbnailUrl = generateThumbnailUrl(public_id, {
          startOffset: "2",
          width: 640,
          height: 360,
        });

        // Create proper video object
        const videoObject = {
          url: public_id,  // Store the public_id as url
          title: title || public_id, // Use provided title or fallback to public_id
          thumbnail: thumbnailUrl,
          addedAt: new Date()
        };

        console.log("Creating video object:", videoObject);
    
        // Update the playlist by adding the video OBJECT (not just the string!)
        const updatedPlaylist = await Playlist.findOneAndUpdate(
          { _id: playlistId, owner: userId },
          { $push: { videos: videoObject } },  // Push object, not string!
          { new: true }
        );
    
        if (!updatedPlaylist) {
          console.error(`Failed to update playlist with ID: ${playlistId}`);
          return NextResponse.json(
            { error: "Playlist not found or not owned by user" },
            { status: 404 }
          );
        }

        // Set playlist thumbnail if this is the first video
        if (updatedPlaylist.videos.length === 1) {
          updatedPlaylist.thumbnail = thumbnailUrl;
          await updatedPlaylist.save();
        }
    
        return NextResponse.json({
          message: "Video added to playlist successfully",
          playlist: updatedPlaylist,
        });
      } catch (error) {
        console.error("Error adding video to playlist:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
      }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const userId = await getDataFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract and validate playlistId from query parameters
    const playlistId = request.nextUrl.searchParams.get("id");
    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
      return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
    }

    // Fetch the playlist document
    const playlist = await Playlist.findOne({ _id: playlistId, owner: userId });
    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Map videos from the playlist
    const videos = playlist.videos.map((video: any) => {
      // Handle both old format (string) and new format (object)
      if (typeof video === 'string') {
        // Old format: just public_id string
        const thumbnailUrl = generateThumbnailUrl(video, {
          startOffset: "2",
          width: 640,
          height: 360,
        });
        
        return {
          public_id: video,
          original_name: video,
          secure_url: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/${video}.mp4`,
          thumbnail_url: thumbnailUrl,
        };
      } else if (video && typeof video === 'object') {
        // New format: video object with url, title, thumbnail
        const public_id = video.url || video.public_id;
        
        return {
          public_id: public_id,
          original_name: video.title || public_id,
          secure_url: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/${public_id}.mp4`,
          thumbnail_url: video.thumbnail || generateThumbnailUrl(public_id, {
            startOffset: "2",
            width: 640,
            height: 360,
          }),
        };
      }
      
      return null;
    }).filter(Boolean); // Remove any null entries

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Error retrieving playlist videos:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    // Authenticate the user
    const userId = await getDataFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract playlistId from query parameters
    const playlistId = request.nextUrl.searchParams.get('id');
    console.log('Playlist ID backend API:', playlistId);

    // Validate the playlistId
    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
      console.log('Invalid playlist ID');
      return NextResponse.json({ error: 'Invalid playlist ID' }, { status: 400 });
    }

    // Parse request body
    const { public_id } = await request.json();

    // Validate inputs
    if (!public_id) {
      return NextResponse.json(
        { error: 'Missing public_id' },
        { status: 400 }
      );
    }

    // Delete video from Cloudinary
    try {
      const cloudinaryResponse = await cloudinary.uploader.destroy(public_id, {
        resource_type: 'video',
        invalidate: true,
      });

      if (cloudinaryResponse.result !== 'ok' && cloudinaryResponse.result !== 'not found') {
        console.warn('Cloudinary deletion warning:', cloudinaryResponse);
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue anyway - we still want to remove from playlist
    }

    // Update the playlist by removing the video
    // This handles both old format (string) and new format (object with url field)
    const updatedPlaylist = await Playlist.findOneAndUpdate(
      { _id: playlistId, owner: userId },
      {
        $pull: {
          videos: { url: public_id }  // new format (object with url field)
        }
      },
      { new: true }
    );

    if (!updatedPlaylist) {
      return NextResponse.json(
        { error: 'Playlist not found or not owned by user' },
        { status: 404 }
      );
    }

    // Handle old format (plain string stored directly)
    await Playlist.findOneAndUpdate(
      { _id: playlistId, owner: userId },
      {
        $pull: {
          videos: public_id  // old format (string)
        }
      }
    );

    // Update playlist thumbnail if needed
    // After both pulls, fetch fresh document for thumbnail update
    const finalPlaylist = await Playlist.findOne({ _id: playlistId, owner: userId });
    if (!finalPlaylist) return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });

    if (finalPlaylist.videos.length > 0) {
      const firstVideo = finalPlaylist.videos[0];
      finalPlaylist.thumbnail = typeof firstVideo === 'object' && firstVideo.thumbnail
        ? firstVideo.thumbnail
        : generateThumbnailUrl(typeof firstVideo === 'string' ? firstVideo : firstVideo.url, { startOffset: "2", width: 640, height: 360 });
      await finalPlaylist.save();
    } else {
      finalPlaylist.thumbnail = null;
      await finalPlaylist.save();
    }

    return NextResponse.json({
      message: 'Video removed from playlist and deleted from Cloudinary successfully',
      playlist: finalPlaylist,
    });
  } catch (error) {
    console.error('Error removing video from playlist:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}