import type { Settings, Tile } from './@types/settings.js'

export const mergeDefaultsWithStoredSettings = (
  defaults: Settings,
  stored: string | null
): Settings => {
  const { tiles } = defaults
  const storedSettings: Settings = stored ? JSON.parse(stored) : {}

  const mergedTiles = Object.keys(tiles).reduce((merged, key) => {
    const val = (
      storedSettings.tiles && typeof storedSettings.tiles[key as Tile] === 'boolean'
        ? storedSettings.tiles[key as Tile]
        : tiles[key as Tile]
    ) as boolean
    merged[key as Tile] = val

    return merged
  }, {} as Record<Tile, boolean>)

  return {
    ...defaults,
    ...storedSettings,
    tiles: mergedTiles
  }
}
