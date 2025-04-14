"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LandingHero() {
  // Track which QR code modal to show: 'app' or 'play'
  const [qrModalType, setQrModalType] = useState(null);

  const handleOpenQrModal = (type) => {
    setQrModalType(type);
  };

  const handleCloseQrModal = () => {
    setQrModalType(null);
  };

  return (
    <section className="md:py-12 py-7 mx-4 shadow-xl flex flex-col md:flex-row items-center justify-around max-w-7xl bg-gradient-to-r from-orange-400 to-red-600 rounded-xl overflow-hidden relative">
      {/* Left Section: Text and Download Buttons */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full md:w-1/2 p-5 flex flex-col justify-center items-start md:space-y-4 space-y-2"
      >
        <div className="space-y-2 font-medium">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-3xl md:text-5xl text-white"
          >
            Start Time Tracking,
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-3xl md:text-5xl text-black"
          >
            Effortless Productivity
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-base md:text-lg text-black"
          >
            Available on All Platforms
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className=" text-base md:text-lg text-black font-medium"
          >
            <span className="text-white">Bizbuddy</span> is accessible on Google Play, Appstore, Windows, Mac, and Web. Track time effortlessly across all
            your devices and stay productive anywhere, anytime!
          </motion.p>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-base md:text-lg text-black font-medium"
        >
          Download <span className="text-white">Bizbuddy</span> for free!
        </motion.p>

        {/* Download buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex md:gap-4 gap-2 items-center"
        >
          {/* App Store button */}
          <Image
            src="/download-app-store.png"
            alt="download app store"
            width={160}
            height={48}
            className="w-44 sm:w-48 hover:scale-105 transition-transform cursor-pointer"
            onClick={() => handleOpenQrModal("app")}
          />

          {/* Play Store button */}
          <Image
            src="/download-google-play.png"
            alt="download google play"
            width={160}
            height={48}
            className="w-44 sm:w-48 hover:scale-105 transition-transform cursor-pointer"
            onClick={() => handleOpenQrModal("play")}
          />
        </motion.div>
      </motion.div>

      {/* Right Section: Device Image */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
        className="w-full md:w-1/2 flex justify-center items-center md:mt-0 mt-10"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: [20, -20, 20] }}
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 4,
            ease: "easeInOut",
          }}
        >
          <Image src="/landing-hero-image.png" alt="Devices" width={700} height={700} className="w-[150%] h-auto object-contain" />
        </motion.div>
      </motion.div>

      {/* Conditionally render the QR code modal if qrModalType is set */}
      {qrModalType && (
        <div
          className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={handleCloseQrModal} // close by clicking background
        >
          <div
            className="bg-white p-4 rounded-md shadow-lg relative"
            onClick={(e) => e.stopPropagation()} // prevent closing on modal click
          >
            <button onClick={handleCloseQrModal} className="absolute top-2 right-2 text-black font-bold">
              ✕
            </button>
            <div className="flex flex-col items-center">
              <p className="font-semibold text-lg mb-4">Scan to download Bizbuddy</p>
              {/* Render the correct QR code based on 'app' or 'play' */}
              {qrModalType === "app" && <Image src="/bizbuddy-appstore.png" alt="Bizbuddy AppStore QR" width={200} height={200} />}
              {qrModalType === "play" && <Image src="/bizbuddy-playstore.png" alt="Bizbuddy PlayStore QR" width={200} height={200} />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
