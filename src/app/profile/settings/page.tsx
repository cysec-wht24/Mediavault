"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Sidebar, SidebarBody, SidebarLink } from "../../../components/ui/sidebar";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "../../../../lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("Username");

  // Fetch current username for sidebar
  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const response = await axios.get("/api/users/me");
        setCurrentUsername(response.data.data.username);
      } catch (error: any) {
        console.error("Error fetching username:", error.message);
      }
    };
    fetchUsername();
  }, []);

  const logout = async () => {
    try {
      const response = await axios.get("/api/users/logout");
      if (response.data.success) {
        toast.success(response.data.message);
        router.push("/login");
      } else {
        toast.error("Logout failed");
      }
    } catch (error: any) {
      console.error("Logout error:", error.message);
      toast.error("An error occurred while logging out");
    }
  };

  const links = [
    {
      label: "Back to Dashboard",
      href: "/profile",
      icon: (
        <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Logout",
      href: "#",
      icon: (
        <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
      onClick: logout,
    },
  ];

  return (
    <div className={cn("mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800 h-screen")}>
      <Sidebar open={open} setOpen={setOpen} animate={true}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <Logo />
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: currentUsername || "Loading...",
                href: "#",
                icon: null,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <SettingsContent />
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      href="/profile"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black">
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white">
        MediaVault
      </motion.span>
    </Link>
  );
};

const SettingsContent = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [userData, setUserData] = useState({
    username: "",
    fullName: "",
    email: "",
    profilePicture: "",
  });
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get("/api/users/settings");
      
      if (response.data.success) {
        setUserData(response.data.user);
        setFormData({
          fullName: response.data.user.fullName || "",
          username: response.data.user.username || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPreviewUrl(response.data.user.profilePicture || "");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load user data");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: "error", text: "Image size should be less than 5MB" });
        toast.error("Image size should be less than 5MB");
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    // Validate password fields
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        setMessage({ type: "error", text: "Please enter current password to change password" });
        toast.error("Please enter current password to change password");
        setLoading(false);
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: "error", text: "New passwords do not match" });
        toast.error("New passwords do not match");
        setLoading(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        setMessage({ type: "error", text: "New password must be at least 6 characters" });
        toast.error("New password must be at least 6 characters");
        setLoading(false);
        return;
      }
    }

    try {
      const submitData = new FormData();
      submitData.append("fullName", formData.fullName);
      submitData.append("username", formData.username);
      
      if (formData.currentPassword && formData.newPassword) {
        submitData.append("currentPassword", formData.currentPassword);
        submitData.append("newPassword", formData.newPassword);
      }
      
      if (profileImage) {
        submitData.append("profilePicture", profileImage);
      }

      const response = await axios.post("/api/users/settings", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setMessage({ type: "success", text: "Settings updated successfully!" });
        toast.success("Settings updated successfully!");
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
        setProfileImage(null);
        await fetchUserData();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to update settings";
      setMessage({ type: "error", text: errorMessage });
      toast.error(errorMessage);
      console.error("Error updating settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      "Are you sure you want to delete your account? This will permanently delete all your playlists and videos. This action cannot be undone."
    );
    if (!confirmed) return;

    const doubleConfirmed = confirm(
      "Last warning — this is permanent. Delete account?"
    );
    if (!doubleConfirmed) return;

    try {
      await axios.delete("/api/users/settings");
      toast.success("Account deleted");
      window.location.replace("/");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete account");
    }
  };

  return (
    <div className="flex flex-1 flex-col h-screen rounded-tl-2xl rounded-tr-2xl overflow-hidden border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black p-6 border-b border-neutral-700 flex justify-between items-center rounded-tl-2xl rounded-tr-2xl">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {message.text && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-900/30 text-green-400 border border-green-800"
                  : "bg-red-900/30 text-red-400 border border-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Profile Picture Section */}
            <div className="bg-black p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Profile Picture</h2>
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                      {userData.username ? userData.username.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="profilePicture"
                    className="inline-block px-4 py-2 bg-slate-100 text-black rounded-full cursor-pointer hover:bg-gray-200 transition-colors font-bold"
                  >
                    Upload New Picture
                  </label>
                  <input
                    type="file"
                    id="profilePicture"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Information Section */}
            <div className="bg-black p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium mb-2 text-gray-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium mb-2 text-gray-300">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={userData.email}
                    disabled
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-gray-500 rounded-lg opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-black p-6 rounded-lg border border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-white">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium mb-2 text-gray-300">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-2 text-gray-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-gray-300">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-slate-100 text-black rounded-full font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
          {/* Danger Zone */}
          <div className="bg-black p-6 rounded-lg border border-red-900 mt-8">
            <h2 className="text-xl font-semibold mb-2 text-red-500">Danger Zone</h2>
            <p className="text-sm text-gray-400 mb-4">
              Permanently delete your account and all associated playlists and media. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};