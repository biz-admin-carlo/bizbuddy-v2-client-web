// biz-web-app/components/Home/DataDisplay.jsx

"use client";
import { appData } from "@/lib/data";
import Image from "next/image";
import { motion } from "framer-motion";

function DataDisplay() {
  return (
    <section className="relative w-full shadow-xl  overflow-hidden bg-gradient-to-b from-red-600 via-orange-400 to-neutral-200  outline-none border-none">
      {/* Main Content Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20"
      >
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
          {/* Left Content */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-full lg:w-1/2 space-y-6 text-center lg:text-left lg:pl-20"
          >
            <div className="space-y-2">
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold"
              >
                <span className="text-white">Time Management,</span>
                <br />
                <span className="text-black">Made Simple.</span>
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-lg sm:text-xl text-neutral-800 max-w-2xl mx-auto lg:mx-0"
              >
                Manage schedules, track hours, and stay on top of work. Try
                BizBuddy now!
              </motion.p>
            </div>

            {/* Download Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col md:flex-row items-center justify-center lg:justify-start lg:gap-4 gap-2 lg:pt-4 pt-2"
            >
              <Image
                src="/download-app-store.png"
                alt="Download on App Store"
                width={180}
                height={54}
                className="w-20 sm:w-48 hover:scale-105 transition-transform cursor-pointer"
              />
              <Image
                src="/download-google-play.png"
                alt="Get it on Google Play"
                width={180}
                height={54}
                className="w-20 sm:w-48 hover:scale-105 transition-transform cursor-pointer"
              />
            </motion.div>
          </motion.div>

          {/* Right Content - Laptop Image */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full lg:w-1/2 h-28 flex justify-center items-center mt-4 lg:mt-2"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 3 }}
              className="relative w-full h-[300px] lg:h-[800px]"
            >
              <Image
                src="/laptop.png"
                alt="BizBuddy App Interface"
                fill
                className="object-contain drop-shadow-2xl"
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="w-full bg-red-600 py-8 border-none outline-none"
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {appData.map((data, index) => (
              <motion.div
                key={data.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                className="text-center bg-gradient-to-t from-red-600 via-orange-600 to-orange-400 backdrop-blur-sm rounded-lg p-4 transform hover:scale-105 transition-transform flex-1 min-w-[150px] max-w-[200px]"
              >
                <p className="text-3xl font-bold text-white mb-1">
                  {typeof data.quantity === "number"
                    ? data.quantity.toLocaleString()
                    : data.quantity}
                </p>
                <p className="text-sm text-white/90">{data.metric}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default DataDisplay;
