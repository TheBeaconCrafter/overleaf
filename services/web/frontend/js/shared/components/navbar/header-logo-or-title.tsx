import type { DefaultNavbarMetadata } from '@/shared/components/types/default-navbar-metadata'
import getMeta from '@/utils/meta'

export default function HeaderLogoOrTitle({
  overleafLogo,
  customLogo,
  title,
}: Pick<DefaultNavbarMetadata, 'customLogo' | 'title'> & {
  overleafLogo?: string
}) {
  const { appName } = getMeta('ol-ExposedSettings')
  const logoUrl = customLogo ?? overleafLogo
  const showLogo = logoUrl || !title
  const isHorizontalLogo = logoUrl?.includes('logo-horizontal.png')
  
  return (
    <a href="/" aria-label={appName} className="navbar-brand">
      {showLogo && (
        <div
          className={`navbar-logo ${isHorizontalLogo ? 'navbar-logo-horizontal' : ''}`}
          style={logoUrl ? { backgroundImage: `url("${logoUrl}")` } : {}}
        />
      )}
      {title && (
        <div className="navbar-title">
          <span>{title}</span>
        </div>
      )}
    </a>
  )
}
