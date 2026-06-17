import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type AppToastType = 'info' | 'success' | 'error';

interface AppToastProps {
  message: string | null;
  type?: AppToastType;
}

export default function AppToast({ message, type = 'info' }: AppToastProps) {
  const Icon = type === 'error' ? AlertCircle : type === 'success' ? CheckCircle : Info;
  const toneClasses = type === 'error'
    ? 'border-red-500/50 text-red-700'
    : type === 'success'
      ? 'border-[#71b536]/60 text-[#2f6518]'
      : 'border-[#ee317b]/45 text-[#5d1734]';
  const iconClasses = type === 'error'
    ? 'text-red-600'
    : type === 'success'
      ? 'text-[#3f7f1f]'
      : 'text-[#ee317b]';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-[calc(100vw-2rem)] rounded-lg border bg-[#fffaf2] px-4 py-2.5 font-sans text-xs shadow-2xl flex items-center gap-2 ${toneClasses}`}
        >
          <Icon className={`w-4 h-4 shrink-0 ${iconClasses}`} />
          <span className="font-bold text-[#15110d]">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
