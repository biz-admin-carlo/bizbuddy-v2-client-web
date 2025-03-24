// biz-web-app/components/Dashboard/LandingHero.jsx

"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function LandingHero() {
  return (
    <section className=" md:py-12 py-7 mx-4 shadow-xl flex flex-col md:flex-row items-center justify-around max-w-7xl  bg-gradient-to-r from-orange-400 to-red-600 rounded-xl overflow-hidden">
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
            <span className="text-white">Bizbuddy</span> is accessible on Google
            Play, Appstore, Windows, Mac, and Web. Track time effortlessly
            across all your devices and stay productive anywhere, anytime!
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex md:gap-4 gap-0 "
        >
          <Image
            src="/download-app-store.png"
            alt="download app store"
            width={160}
            height={48}
            className="w-44 sm:w-48 hover:scale-105 transition-transform cursor-pointer"
          />
          <Image
            src="/download-google-play.png"
            alt="download google play"
            width={160}
            height={48}
            className="w-44 sm:w-48 hover:scale-105 transition-transform cursor-pointer"
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
          <Image
            src="/landing-hero-image.png"
            alt="Devices"
            width={700}
            height={700}
            className="w-[150%] h-auto object-contain"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
