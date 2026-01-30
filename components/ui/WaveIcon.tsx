interface WaveIconProps {
  active: boolean;
  className?: string;
}

export const WaveIcon = ({ active, className = '' }: WaveIconProps) => (
  <div className={`flex items-center justify-center gap-[3px] w-6 h-6 ${className}`}>
    {[1,2,3,4,5].map(i => (
      <div key={i}
        className={`w-1 bg-white rounded-full transition-all duration-300 ${active ? 'animate-wave' : 'h-1 opacity-50'}`}
        style={{ height: active ? undefined : '4px', animationDelay: `${i*0.1}s`, animationDuration: '0.8s' }}
      />
    ))}
  </div>
);
