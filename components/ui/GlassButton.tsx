import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface GlassButtonProps {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  active?: boolean;
}

export const GlassButton = ({ onClick, children, className = '', active = false }: GlassButtonProps) => (
  <button onClick={onClick}
    className={clsx(
      "relative group overflow-hidden backdrop-blur-xl border transition-all duration-300 rounded-2xl",
      active ? "bg-white/10 border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
             : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-[#D4AF37]/20",
      className
    )}>
    <div className="absolute inset-[1px] rounded-2xl border border-white/20 pointer-events-none opacity-50" />
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')]" />
    <div className="relative z-10">{children}</div>
  </button>
);
