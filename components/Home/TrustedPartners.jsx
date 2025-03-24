// biz-web-app/components/Home/TrustedPartners.jsx

"use client";

import { trustedPartners } from "@/lib/data";
import { motion, useAnimationControls } from "framer-motion";
import Image from "next/image";
import { useEffect } from "react";

function TrustedPartners() {
  const controls = useAnimationControls();

  useEffect(() => {
    // Animate from 0% to -50%, then repeat infinitely.
    controls.start({
      x: ["0%", "-50%"],
      transition: {
        duration: 30, // adjust speed as you like
        repeat: Infinity, // infinite loop
        ease: "linear", // no “slow down” at edges
      },
    });
  }, [controls]);

  // Duplicate the array so we can scroll through the first set,
  // then seamlessly continue into the second set
  const partnersForMarquee = [...trustedPartners, ...trustedPartners];

  return (
    <div
      className="w-full md:px-0 my-10 py-10 md:py-24 
                    flex flex-col items-center"
    >
      <h2
        className="text-orange-500 font-bold text-center pb-2 
                     max-w-7xl mx-auto text-xl sm:text-2xl 
                     md:text-4xl lg:text-5xl capitalize"
      >
        Our Trusted Partners
      </h2>

      {/* Marquee container */}
      <div className="relative w-full md:mt-80 mt-36">
        {/* Overflow hidden ensures we only see the marquee “window” */}
        <div className="overflow-hidden w-full bg-gradient-to-b dark:from-black from-orange-50/30 via-white dark:via-neutral-900 dark:to-black to-orange-50/30 py-2">
          <motion.div
            // Start at x=0, animate to x=-50% of its own width
            animate={controls}
            initial={{ x: "0%" }}
            // “w-[200%]” so the container is twice as wide as the parent
            className="flex items-center gap-16 sm:gap-24 md:gap-32 lg:gap-40 w-[200%]"
          >
            {partnersForMarquee.map((partner, index) => (
              <div key={index} className="flex-shrink-0">
                <Image
                  src={partner.src || "/placeholder.svg"}
                  alt={partner.name || `Trusted Partner ${index + 1}`}
                  width={200}
                  height={200}
                  className="w-16 sm:w-20 md:w-24 lg:w-32
                             h-16 sm:h-20 md:h-24 lg:h-32 
                             object-contain"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default TrustedPartners;
