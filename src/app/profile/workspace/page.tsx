"use client";

import React, { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { CldUploadWidget } from 'next-cloudinary';
import { useSearchParams } from "next/navigation";
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Video {
  public_id: string;
  thumbnail_url: string | null;
  original_name: string | null;
  secure_url: string | null;
}

type RepeatMode = 'off' | 'video' | 'playlist';

function Workspace() {
  const [videoDetails, setVideoDetails] = useState<Video[]>([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [aspectRatio, setAspectRatio] = useState<string>('original');
  const [quality, setQuality] = useState<string>('auto');
  const [format, setFormat] = useState<string>('mp4');
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('id');

  // ─── Fetch videos ────────────────────────────────────────────────────────────

  const fetchVideoDetails = useCallback(async () => {
    if (!playlistId) {
      setError("Missing playlist ID in URL.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/users/workspace?id=${encodeURIComponent(playlistId)}`);
      const videos: Video[] = response.data.videos;
      setVideoDetails(videos);

      if (videos.length > 0 && videos[0].secure_url) {
        setSelectedVideoUrl(videos[0].secure_url);
        setSelectedVideoId(videos[0].public_id);
        setCurrentVideoIndex(0);
      } else {
        setSelectedVideoUrl(null);
        setSelectedVideoId(null);
      }
    } catch (err: any) {
      console.error('Error fetching video details:', err);
      setError('Failed to load video details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    fetchVideoDetails();
  }, [fetchVideoDetails]);

  // ─── Playback ─────────────────────────────────────────────────────────────────

  const handleVideoClick = (video: Video, index: number) => {
    if (video.secure_url) {
      setSelectedVideoUrl(video.secure_url);
      setSelectedVideoId(video.public_id);
      setCurrentVideoIndex(index);
    }
  };

  const playNextVideo = () => {
    if (videoDetails.length === 0) return;
    const nextIndex = (currentVideoIndex + 1) % videoDetails.length;
    const nextVideo = videoDetails[nextIndex];
    if (nextVideo?.secure_url) {
      setSelectedVideoUrl(nextVideo.secure_url);
      setSelectedVideoId(nextVideo.public_id);
      setCurrentVideoIndex(nextIndex);
    }
  };

  const handleVideoEnded = () => {
    if (repeatMode === 'video') {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else if (repeatMode === 'playlist') {
      playNextVideo();
    }
  };

  const toggleRepeatMode = () => {
    const modes: RepeatMode[] = ['off', 'video', 'playlist'];
    const next = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    setRepeatMode(next);
    toast.success(`Repeat: ${next === 'off' ? 'Off' : next === 'video' ? 'Current Video' : 'Playlist'}`);
  };

  const getRepeatIcon = () => {
    if (repeatMode === 'video') {
      return (
        <div className="relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="absolute -top-1 -right-1 text-[10px] font-bold">1</span>
        </div>
      );
    }
    if (repeatMode === 'playlist') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  };

  // ─── Transform ────────────────────────────────────────────────────────────────

  const handleApplyTransformations = async () => {
    if (!selectedVideoId) {
      toast.error('No video selected');
      return;
    }
    if (aspectRatio === 'original' && quality === 'auto' && format === 'mp4') {
      toast.error('Please select at least one transformation option');
      return;
    }
    try {
      setIsTransforming(true);
      toast.loading('Applying transformations...');
      const response = await axios.post('/api/users/transform', {
        public_id: selectedVideoId,
        aspectRatio,
        quality,
        format,
        playlistId,
      });
      toast.dismiss();
      toast.success('Transformations applied!');
      if (response.data.url) {
        setSelectedVideoUrl(response.data.url);
        setVideoDetails(prev =>
          prev.map(v =>
            v.public_id === selectedVideoId
              ? { ...v, secure_url: response.data.url }
              : v
          )
        );
      }
    } catch (error: any) {
      toast.dismiss();
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Failed to apply transformations');
      } else {
        toast.error('Failed to apply transformations');
      }
    } finally {
      setIsTransforming(false);
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (!selectedVideoUrl) return;
    try {
      toast.loading("Preparing download...");
      const response = await fetch(selectedVideoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedVideoId?.split("/").pop() || "video"}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Download started!");
    } catch {
      toast.dismiss();
      toast.error("Failed to download video");
    }
  };

  // ─── Upload ───────────────────────────────────────────────────────────────────

  // Saves each video to DB as it finishes uploading
  const handleUploadSuccess = async (result: any) => {
    if (!playlistId) return;
    const public_id = result?.info?.public_id;
    const original_filename = result?.info?.original_filename;
    if (!public_id) return;
    try {
      await axios.post('/api/users/workspace', {
        public_id,
        playlistId,
        title: original_filename || public_id,
      });
    } catch (error: any) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.error || 'Failed to save video'
        : 'Failed to save video';
      toast.error(msg);
    }
  };

  // Fires once when all queued uploads are done — refreshes the list
  const handleQueuesEnd = async () => {
    toast.success('Videos uploaded successfully!');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await fetchVideoDetails();
  };

  // ─── Delete ───────────────────────────────────────────────────────────────────

  const handleDeleteVideo = async (public_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playlistId) {
      toast.error('Playlist ID is missing.');
      return;
    }
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }
    try {
      toast.loading('Deleting video...');
      await axios.delete(`/api/users/workspace?id=${encodeURIComponent(playlistId)}`, {
        data: { public_id },
      });
      toast.dismiss();
      toast.success('Video deleted successfully!');

      const updatedVideos = videoDetails.filter(v => v.public_id !== public_id);
      setVideoDetails(updatedVideos);

      if (selectedVideoId === public_id) {
        if (updatedVideos.length > 0 && updatedVideos[0].secure_url) {
          setSelectedVideoUrl(updatedVideos[0].secure_url);
          setSelectedVideoId(updatedVideos[0].public_id);
          setCurrentVideoIndex(0);
        } else {
          setSelectedVideoUrl(null);
          setSelectedVideoId(null);
          setCurrentVideoIndex(0);
        }
      }
    } catch (error: any) {
      toast.dismiss();
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Failed to delete video.');
      } else {
        toast.error('Failed to delete video.');
      }
    }
  };

  // ─── Rename ───────────────────────────────────────────────────────────────────
  const handleRename = async (public_id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playlistId) return;
    if (!renameValue.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      await axios.patch(`/api/users/workspace?id=${encodeURIComponent(playlistId)}`, {
        public_id,
        newTitle: renameValue,
      });
      setVideoDetails(prev =>
        prev.map(v => v.public_id === public_id ? { ...v, original_name: renameValue } : v)
      );
      toast.success('Video renamed!');
      setRenamingId(null);
    } catch {
      toast.error('Failed to rename video');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="flex h-screen">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          {/* Video Player */}
          <div className="bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
            {selectedVideoUrl ? (
              <video
                ref={videoRef}
                src={selectedVideoUrl}
                className="w-full h-full"
                controls
                autoPlay
                onEnded={handleVideoEnded}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-24 h-24 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg">No video selected</p>
                </div>
              </div>
            )}
          </div>

          {/* Video Editor Bar */}
          <div className="bg-[#212121] rounded-xl p-6 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Video Editor</h3>
              <span className="text-sm text-gray-400">
                {selectedVideoId ? `Editing: ${selectedVideoId}` : 'No video selected'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Aspect Ratio */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  disabled={isTransforming}
                  className="w-full px-4 py-3 bg-[#3f3f3f] hover:bg-[#4f4f4f] rounded-lg text-sm transition-colors border-none outline-none cursor-pointer"
                >
                  <option value="original">Original</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3 (Classic)</option>
                  <option value="21:9">21:9 (Ultrawide)</option>
                  <option value="4:5">4:5 (Instagram)</option>
                </select>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Quality</label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  disabled={isTransforming}
                  className="w-full px-4 py-3 bg-[#3f3f3f] hover:bg-[#4f4f4f] rounded-lg text-sm transition-colors border-none outline-none cursor-pointer"
                >
                  <option value="auto">Auto</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="480p">480p (SD)</option>
                  <option value="360p">360p (Low)</option>
                </select>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  disabled={isTransforming}
                  className="w-full px-4 py-3 bg-[#3f3f3f] hover:bg-[#4f4f4f] rounded-lg text-sm transition-colors border-none outline-none cursor-pointer"
                >
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="mov">MOV</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleApplyTransformations}
                disabled={!selectedVideoId || isTransforming}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isTransforming ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Transforming...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Apply Transformations
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                disabled={!selectedVideoUrl}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Playlist Sidebar */}
        <div className="w-96 bg-[#212121] flex flex-col border-l border-[#3f3f3f]">
          {/* Upload */}
          <div className="p-4 border-b border-[#3f3f3f]">
            <CldUploadWidget
              signatureEndpoint="/api/users/sign-cloudinary-params"
              options={{
                sources: ['local'],
                resourceType: 'video',
                singleUploadAutoClose: false,
                clientAllowedFormats: ['mp4', 'mov', 'webm'],
                maxFileSize: 100000000,
              }}
              onSuccess={handleUploadSuccess}
              onQueuesEnd={handleQueuesEnd}
            >
              {({ open }) => (
                <button
                  className="w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
                  onClick={() => open()}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Video
                </button>
              )}
            </CldUploadWidget>
          </div>

          {/* Playlist Header */}
          <div className="p-4 border-b border-[#3f3f3f]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold">Playlist</h3>
                <p className="text-sm text-gray-400">
                  {videoDetails.length} {videoDetails.length === 1 ? 'video' : 'videos'}
                </p>
              </div>
              <button
                onClick={toggleRepeatMode}
                className={`p-2 rounded-lg transition-all ${
                  repeatMode === 'off'
                    ? 'bg-[#3f3f3f] text-gray-400 hover:bg-[#4f4f4f]'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
                title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'video' ? 'Current Video' : 'Playlist'}`}
              >
                {getRepeatIcon()}
              </button>
            </div>
          </div>

          {/* Playlist Items */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-gray-400">
                <div className="animate-pulse">Loading videos...</div>
              </div>
            )}

            {error && (
              <div className="p-4 text-center text-red-500">{error}</div>
            )}

            {!loading && !error && videoDetails.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>No videos in this playlist</p>
                <p className="text-sm mt-1">Upload your first video to get started</p>
              </div>
            )}

            {videoDetails.map((video, index) => (
              <div
                key={video.public_id}
                className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-[#3f3f3f] ${
                  selectedVideoId === video.public_id ? 'bg-[#3f3f3f]' : ''
                }`}
                onClick={() => handleVideoClick(video, index)}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-40 h-24 bg-[#0f0f0f] rounded-lg overflow-hidden">
                    {video.thumbnail_url ? (
                      <img
                        src={video.thumbnail_url}
                        alt={video.original_name || 'Video'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 px-1 py-0.5 rounded text-xs">
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  {renamingId === video.public_id ? (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(video.public_id, e as any);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="text-sm bg-[#3f3f3f] text-white rounded px-2 py-0.5 w-full outline-none border border-gray-500 focus:border-red-500"
                      />
                      <button
                        onClick={e => handleRename(video.public_id, e)}
                        className="text-xs px-2 py-0.5 bg-green-600 hover:bg-green-700 rounded text-white shrink-0"
                      >✓</button>
                      <button
                        onClick={e => { e.stopPropagation(); setRenamingId(null); }}
                        className="text-xs px-2 py-0.5 bg-gray-600 hover:bg-gray-700 rounded text-white shrink-0"
                      >✕</button>
                    </div>
                  ) : (
                    <h4
                      className="text-sm font-medium text-white truncate cursor-text"
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setRenamingId(video.public_id);
                        setRenameValue(video.original_name || '');
                      }}
                      title="Double-click to rename"
                    >
                      {video.original_name || 'Untitled Video'}
                    </h4>
                  )}
                  <p className="text-xs text-gray-400 mt-1 truncate">{video.public_id}</p>
                </div>

                <button
                  onClick={(e) => handleDeleteVideo(video.public_id, e)}
                  className="flex-shrink-0 p-2 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all"
                  title="Delete video"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-neutral-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading workspace...</p>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <Workspace />
    </Suspense>
  );
}