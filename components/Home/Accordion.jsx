// biz-web-app/components/Home/Accordion.jsx

"use client";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { faqItems } from "@/lib/data";
import { motion } from "framer-motion";

function FAQ() {
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
    <motion.section
      className="py-10 md:py-10 mx-auto px-4 w-full max-w-7xl"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h2
        className="text-orange-500 font-bold text-center pb-2 max-w-7xl mx-auto text-xl sm:text-2xl md:text-4xl lg:text-5xl capitalize"
        variants={itemVariants}
      >
        Frequently Asked Questions
      </motion.h2>
      <motion.div
        className="flex flex-col justify-center items-center mt-10 max-w-3xl mx-auto"
        variants={containerVariants}
      >
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <motion.div
              key={`faq-${item.value}-${index}`}
              variants={itemVariants}
            >
              <AccordionItem
                value={item.value}
                className="border-b last:border-b-0"
              >
                <AccordionTrigger className="py-4 px-2 text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-4">
                  <p>{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </motion.div>
    </motion.section>
  );
}

export default FAQ;
