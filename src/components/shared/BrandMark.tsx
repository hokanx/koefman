import koefmanIcon from '@/assets/koefman-icon.png';
import koefmanWordmark from '@/assets/koefman-wordmark.png';

interface BrandMarkProps {
  variant?: 'icon' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
  className?: string;
}

const sizeMap = {
  icon: { sm: 'h-6', md: 'h-10', lg: 'h-16' },
  wordmark: { sm: 'h-5', md: 'h-7', lg: 'h-12' },
};

const BrandMark = ({ variant = 'wordmark', size = 'md', align = 'left', className = '' }: BrandMarkProps) => {
  const src = variant === 'icon' ? koefmanIcon : koefmanWordmark;
  const h = sizeMap[variant][size];
  const alignClass = align === 'center' ? 'mx-auto' : '';

  return (
    <img
      src={src}
      alt="KÖFMAN"
      className={`${h} w-auto object-contain ${alignClass} ${className}`}
      draggable={false}
    />
  );
};

export default BrandMark;
