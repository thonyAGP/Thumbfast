export const OUTPUT_MODES = [
  { id: "thumbnail", label: "Thumbnail", description: "YouTube thumbnail with bold text" },
  { id: "icon", label: "App Icon", description: "Square app icon, minimal, recognizable" },
  { id: "logo", label: "Logo", description: "Clean logo design, vector-style" },
  { id: "cartoon", label: "Cartoon", description: "Cartoon/illustrated style" },
  { id: "avatar", label: "Avatar", description: "Profile picture / avatar" },
  { id: "social", label: "Social Post", description: "Instagram/social media visual" },
  { id: "banner", label: "Banner", description: "Wide banner / cover image" },
] as const

export type OutputMode = (typeof OUTPUT_MODES)[number]["id"]

export const GRID_OPTIONS = [
  { value: 1, label: "Single" },
  { value: 2, label: "2-up" },
  { value: 3, label: "3-up" },
  { value: 4, label: "4-up" },
] as const

export type GridLayout = (typeof GRID_OPTIONS)[number]["value"]
