'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';

type AnimatedListProps<T> = {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
};

/**
 * Generic animated list that fades/slides items in and out
 * Uses Framer Motion AnimatePresence for smooth transitions
 */
export function AnimatedList<T>({
  items,
  keyExtractor,
  renderItem,
  className = 'flex flex-col gap-4',
}: AnimatedListProps<T>) {
  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={keyExtractor(item)}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            layout
          >
            {renderItem(item)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
