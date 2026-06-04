"use client";
// https://nextjs.org/docs/app/building-your-application/rendering/client-components
import Link from "next/link";
import React, { useEffect } from "react";
import {useRouter} from "next/navigation";
import axios from "axios";
// ts requires type defination since axios 
// type are not defined you have to explicitly install them
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { cn } from "../../../lib/utils";
import { IconBrandGoogle } from "@tabler/icons-react";
import toast from "react-hot-toast";
 

export default function LoginFormDemo() {

const router = useRouter();
const [user, setUser] = React.useState({
    email: "",
    password: ""
})

  const [buttonDisabled, setButtonDisabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
    e.preventDefault();
    setLoading(true);
    const response = await axios.post("/api/users/login", user);
    console.log("Login success", response.data);
    toast.success("Login success");
    window.location.href = "/profile";
    } catch (error:any) {
      console.log("Login failed", error.message)
      toast.error(error.message)
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
      if(user.email.length > 0 && user.password.length > 0) {
        setButtonDisabled(false);
      } else {
        setButtonDisabled(true);
      }
    }, [user]);

  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[rgba(255,255,255,0.1)] to-[rgb(0,0,0)]">
    <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
      <h2 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
      {loading ? "Login" : "Login"}
      </h2>
 
      <form className="mt-8" onSubmit={handleSubmit}>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input 
          id="email" 
          type="email" 
          autoComplete="email"
          value={user.email} 
          onChange={(e) => setUser({...user, email: e.target.value})}/>
        </LabelInputContainer>
                                    {/* spread operator ...user */}
        <LabelInputContainer className="mb-4">
          <Label htmlFor="password">Password</Label>
          <Input 
          id="password" 
          type="password" 
          value={user.password} 
          onChange={(e) => setUser({...user, password: e.target.value})}/>
        </LabelInputContainer>
 
        <button
          className="my-8 group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset]"
          type="submit" disabled={buttonDisabled || loading}>
          {loading ? 'Logging in…' : 'Login →'}
          <BottomGradient />
        </button>
 
        <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />
        <div className="flex flex-col space-y-4">
        <button
          className="group/btn shadow-input relative flex h-10 w-full items-center justify-center space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
          type="button" disabled={buttonDisabled || loading}>
          <IconBrandGoogle className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Login with Google
          </span>
          <BottomGradient />
        </button>
        
        <div className="text-center">
            <span className="text-neutral-700 dark:text-neutral-300 text-sm">
            Don't have an account?{" "}
            </span>
            <Link href="/signup">
            <span className="underline text-sm text-neutral-700 dark:text-neutral-300">Signup</span>
            </Link>
        </div>

        </div>
      </form>
    </div>
    </div>
  );
}
 
const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};
 
const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};