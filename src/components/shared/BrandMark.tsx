import koefmanIcon from '@/assets/koefman-icon.png';
import koefmanWordmark from '@/assets/koefman-wordmark.png';

interface BrandMarkProps {
  variant?: 'icon' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
  className?: string;
}

const sizeMap = {
  icon: { sm: 'h-7', md: 'h-12', lg: 'h-20' },
  wordmark: { sm: 'h-7', md: 'h-9', lg: 'h-14' },
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
