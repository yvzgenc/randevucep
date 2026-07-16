import type { LucideIcon, LucideProps } from 'lucide-react'

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const ICON_SIZE_PX: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
}

export interface IconProps extends Omit<LucideProps, 'size'> {
  icon: LucideIcon
  size?: IconSize | number
}

/**
 * Thin convention wrapper around lucide-react icons: standardizes sizing to
 * the app's scale and lets icons inherit text color via `currentColor`
 * (lucide's default). Import icons individually from 'lucide-react' and pass
 * them in — never barrel-import the whole icon set, it defeats tree-shaking.
 *
 *   import { Mail } from 'lucide-react'
 *   <Icon icon={Mail} size="lg" />
 */
export function Icon({ icon: IconComponent, size = 'md', strokeWidth = 1.75, ...props }: IconProps) {
  const px = typeof size === 'number' ? size : ICON_SIZE_PX[size]
  return <IconComponent size={px} strokeWidth={strokeWidth} {...props} />
}
