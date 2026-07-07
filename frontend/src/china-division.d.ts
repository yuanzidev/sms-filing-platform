declare module 'china-division' {
  export const provinces: string[]
  export const cities: string[]
  export const areas: string[]
  export const streets: string[]
  export const villages: string[]
  export const pc: Record<string, string[]>
  export const pcC: Array<{ code: string; name: string; children: Array<{ code: string; name: string }> }>
  export const pca: Record<string, Record<string, string[]>>
  export const pcaC: Array<{ code: string; name: string; children: Array<{ code: string; name: string; children: Array<{ code: string; name: string }> }> }>
  export const pcas: Record<string, Record<string, Record<string, string[]>>>
  export const pcasC: unknown[]
}
