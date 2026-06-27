export type SettingsTabHandles = {
  save: () => Promise<boolean>
  discard: () => void
}

export type SettingsTabChildProps = {
  onDirtyChange?: (dirty: boolean) => void
  onBindHandles?: (handles: SettingsTabHandles | null) => void
}
