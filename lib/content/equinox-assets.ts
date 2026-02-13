import fs from 'node:fs'
import path from 'node:path'

export interface EquinoxAssetItem {
  id: string
  file: string
  alt: string
  width: number
  height: number
}

interface EquinoxAssetManifest {
  version: string
  updatedAt: string
  imageSet: string
  assets: EquinoxAssetItem[]
}

const manifestPath = path.join(
  process.cwd(),
  'public/images/events/equinox/asset-manifest.json'
)

export function getEquinoxAssetManifest(): EquinoxAssetManifest {
  const raw = fs.readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw) as EquinoxAssetManifest
}

export function getEquinoxAssets(imageSetOverride?: string): EquinoxAssetItem[] {
  const manifest = getEquinoxAssetManifest()
  const selectedSet = imageSetOverride || manifest.imageSet

  if (selectedSet !== manifest.imageSet) {
    return []
  }

  return manifest.assets
}
