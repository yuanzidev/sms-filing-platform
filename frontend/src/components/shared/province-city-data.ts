import pcData from 'china-division/dist/pc.json'

export const PROVINCE_CITY_MAP = pcData as Record<string, string[]>

export const PROVINCES = Object.keys(PROVINCE_CITY_MAP)

export const PROVINCE_OPTIONS = PROVINCES.map((province) => ({
  value: province,
  label: province,
}))
