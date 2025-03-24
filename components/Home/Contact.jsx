// biz-web-app/components/Home/Contact.jsx

"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiMessageSquare, FiSend } from "react-icons/fi";
import { MdOutlineContactSupport } from "react-icons/md";
import { FaPhone } from "react-icons/fa6";
import { MdOutlineEmail } from "react-icons/md";

// Example icons from react-icons (AiOutlinePhone, AiOutlineMail)
import { AiOutlinePhone, AiOutlineMail } from "react-icons/ai";

function Contact() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <motion.div
      className="py-10 mx-auto px-4 w-full max-w-7xl "
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h2
        className="text-orange-500 font-bold text-center pb-2 max-w-7xl mx-auto text-xl sm:text-2xl md:text-4xl lg:text-5xl capitalize"
        variants={itemVariants}
      >
        Get in Touch
      </motion.h2>
      <p></p>
      <div className="flex flex-col justify-center items-center w-full mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          <motion.div variants={itemVariants} className="w-full">
            <Card className="rounded-xl p-2 border-none shadow-xl h-full bg-white dark:bg-neutral-800">
              <CardHeader>
                <h3 className="flex items-center text-xl sm:text-2xl font-bold dark:text-neutral-200 text-neutral-800">
                  <MdOutlineContactSupport className="mr-2 text-orange-500" />
                  Contact Details
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 bg-orange-50 dark:bg-neutral-900 p-2 rounded-xl text-neutral-600 text-base dark:text-neutral-400 ">
                    <FaPhone className="w-6 h-6 text-white bg-orange-500 p-1 rounded-xl" />
                    <span className="text-xs sm:text-sm">(123) 456-7890</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-orange-50 dark:bg-neutral-900 p-2 rounded-xl text-neutral-600 dark:text-neutral-400 text-base">
                    <MdOutlineEmail className="w-6 h-6 text-white bg-orange-500 p-1 rounded-xl" />
                    <Link
                      href="#"
                      prefetch={false}
                      className="text-xs sm:text-sm hover:text-orange-500 transition-colors"
                    >
                      info@example.com
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full">
            <Card className="rounded-xl p-2 border-none shadow-xl h-full bg-orange-50 dark:bg-neutral-900">
              <CardHeader>
                <h3 className="flex items-center text-xl sm:text-2xl font-bold dark:text-neutral-200 text-neutral-800">
                  <FiMessageSquare className="mr-2 text-orange-500" />
                  Send Message
                </h3>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      id="name"
                      placeholder="Your name"
                      className="border-none p-2 pl-3 bg-white dark:bg-neutral-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <Input
                      id="email"
                      placeholder="Your email"
                      type="email"
                      className="border-none p-2 pl-3 bg-white dark:bg-neutral-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      id="message"
                      placeholder="Your message"
                      className="bg-white dark:bg-neutral-800"
                    />
                  </div>

                  <Button className="py-3 px-4 w-full font-semibold text-white rounded-xl text-sm bg-gradient-to-r from-orange-500 to-orange-600">
                    <span className="flex items-center justify-center">
                      <span className="mr-2">Send Message</span>
                      <FiSend />
                    </span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default Contact;
