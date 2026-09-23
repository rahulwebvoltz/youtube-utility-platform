import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store.js';

export function CtaSection() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);

  if (status === 'authenticated') return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-orange-500 p-10 text-center text-white shadow-lg"
    >
      <h2 className="text-2xl font-bold sm:text-3xl">Ready to get started?</h2>
      <p className="mx-auto mt-2 max-w-md text-white/90">
        Create a free account to save your history, build collections, and access the public API.
      </p>
      <button
        type="button"
        onClick={() => {
          navigate('/register');
        }}
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-medium text-brand-700 shadow-sm transition-all hover:bg-white/90 active:scale-[0.97]"
      >
        Sign up for free
        <ArrowRight size={16} />
      </button>
    </motion.section>
  );
}
