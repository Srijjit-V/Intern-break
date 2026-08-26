import { UserRound } from 'lucide-react';

type UserAvatarProps = {
  name?: string;
  color?: string;
  emoji?: string;
  avatarUrl?: string;
  imageUrl?: string;
  size?: number;
  className?: string;
};

export default function UserAvatar({
  name = '',
  color = 'hsl(var(--primary))',
  emoji,
  avatarUrl,
  imageUrl,
  size = 36,
  className = '',
}: UserAvatarProps) {
  const src = avatarUrl ?? imageUrl;
  const px = `${size}px`;
  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name} avatar` : 'User avatar'}
        className={`rounded-full object-cover ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-sm font-bold text-primary-foreground ${className}`}
      style={{ width: px, height: px, backgroundColor: color, flexShrink: 0 }}
    >
      {emoji || (name ? name.charAt(0).toUpperCase() : <UserRound size={Math.round(size * 0.5)} aria-hidden="true" />)}
    </span>
  );
}
