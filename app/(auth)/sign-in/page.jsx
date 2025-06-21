// app/(auth)/sign-in/page.jsx

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crown, Shield, UserCheck, User, Eye, EyeOff } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import Footer from "@/components/Partial/Footer";
import { motion } from "framer-motion";

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [users, setUsers] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/account/get-user-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`
      );
      const data = await res.json();
      if (res.status === 404) {
        setError("No companies found for this email.");
        setLoading(false);
        return;
      }
      if (res.status !== 200) {
        setError(data.message || "Error checking email");
        setLoading(false);
        return;
      }
      setUsers(data.data);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    }
    setLoading(false);
  };

  const handleCompanySelect = (companyId) => {
    setSelectedCompanyId(companyId);
    setError("");
  };

  const handleSignInWithPassword = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !selectedCompanyId) {
      setError("Email, password, and company selection are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const signInUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/account/sign-in?email=${encodeURIComponent(
        formData.email.trim().toLowerCase()
      )}&password=${encodeURIComponent(formData.password)}&companyId=${encodeURIComponent(selectedCompanyId)}`;
      const res = await fetch(signInUrl);
      const data = await res.json();
      if (res.status !== 200 || !data.data?.token) {
        setError(data.message || "Invalid credentials.");
        setLoading(false);
        return;
      }
      login(data.data.token);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    }
    setLoading(false);
  };

  const getRoleIcon = (role) => {
    switch (role.toLowerCase()) {
      case "superadmin":
        return <Crown className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "supervisor":
        return <UserCheck className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col justify-between bg-white dark:bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div
          className="max-w-md mx-auto mb-8 text-center"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-orange-600 dark:text-orange-500">Welcome Back</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">Sign in to access your account</p>
        </motion.div>

        <motion.div className="max-w-md mx-auto mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${step === 1 ? "bg-orange-500" : "bg-green-500"}`}></div>
            <div className={`h-0.5 w-8 ${step === 2 ? "bg-orange-500" : step > 2 ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-700"}`}></div>
            <div
              className={`w-3 h-3 rounded-full ${step === 2 ? "bg-orange-500" : step > 2 ? "bg-green-500" : "bg-neutral-300 dark:bg-neutral-700"}`}
            ></div>
          </div>
        </motion.div>

        {step === 1 && (
          <motion.form
            onSubmit={handleEmailSubmit}
            className="space-y-6 max-w-md mx-auto bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-lg border border-neutral-100 dark:border-neutral-700"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div>
              <h2 className="text-2xl font-semibold mb-4">Enter your email</h2>
              <input
                type="email"
                name="email"
                placeholder="Your email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all duration-200"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-5 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Continue
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </>
              )}
            </button>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">Don't have an account?</p>
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="w-full mt-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium text-sm flex items-center justify-center"
              >
                Create one here
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </motion.form>
        )}
        {step === 2 && (
          <motion.div
            className="max-w-md mx-auto bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-lg border border-neutral-100 dark:border-neutral-700 space-y-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Back
              </button>
              <div className="px-3 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full text-sm text-neutral-600 dark:text-neutral-300">
                {formData.email}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">Select your company</h2>
              <div className="bg-neutral-50 dark:bg-neutral-700 rounded-xl p-3 mb-4">
                <div className="flex justify-between items-center w-full text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase border-b border-neutral-200 dark:border-neutral-600 pb-2 mb-2">
                  <span>Company</span>
                  <span>Username</span>
                  <span>Role</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {users.map((u) => (
                    <button
                      key={u.companyId}
                      onClick={() => handleCompanySelect(u.companyId)}
                      disabled={loading}
                      className={`w-full p-3 text-sm font-medium flex items-center justify-between rounded-lg transition-all duration-200 ${
                        loading ? "opacity-70 cursor-not-allowed" : "hover:bg-neutral-100 dark:hover:bg-neutral-600"
                      } ${
                        selectedCompanyId === u.companyId
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-l-4 border-orange-500"
                          : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{u.companyName || "No Name"}</span>
                        <span className="text-neutral-600 dark:text-neutral-400">{u.username}</span>
                        <span
                          className={`p-1.5 rounded-full ${
                            selectedCompanyId === u.companyId
                              ? "bg-orange-200 dark:bg-orange-800/50 text-orange-700 dark:text-orange-400"
                              : "bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
                          }`}
                        >
                          {getRoleIcon("admin")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedCompanyId && (
              <motion.form
                onSubmit={handleSignInWithPassword}
                className="space-y-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative">
                  {" "}
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-3 pr-10 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-orange-500/50 transition-all duration-200" // Add pr-10
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3  transform translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" // Adjust top for centering
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full px-5 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}
          </motion.div>
        )}
      </div>
      <Footer className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 py-6" />
    </motion.div>
  );
}
