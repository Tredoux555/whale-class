// components/cms/Avatar.tsx
// Initial-on-Harbor-gradient. There are no binary assets in this repo, and a
// generated initial beats a grey silhouette placeholder anyway.

const SIZES = {
  sm: 'w-7 h-7 rounded-lg text-xs',
  md: 'w-11 h-11 rounded-xl text-base',
  lg: 'w-[46px] h-[46px] rounded-[13px] text-lg',
} as const;

export function Avatar({
  name,
  size = 'md',
  quiet = false,
}: {
  name: string;
  size?: keyof typeof SIZES;
  /** Quiet = tinted plate instead of the solid gradient. For dense rows. */
  quiet?: boolean;
}) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      className={`${quiet ? 'cms-avatar-quiet' : 'cms-avatar'} ${SIZES[size]}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
