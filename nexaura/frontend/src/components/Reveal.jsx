import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reveal — subtle, premium scroll-into-view animation.
 * Wraps children in a fade + lift that respects reduced-motion preferences.
 *
 * Props:
 *  - as: element tag to render (default 'div')
 *  - delay: seconds to delay the entrance (default 0)
 *  - y: vertical travel distance in px (default 22)
 *  - once: animate only the first time in view (default true)
 *  - className, ...rest: passed through
 */
export default function Reveal({
  as: Tag = 'div',
  delay = 0,
  y = 22,
  once = true,
  className = '',
  children,
  ...rest
}) {
  const MotionTag = motion[Tag] || motion.div;

  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
