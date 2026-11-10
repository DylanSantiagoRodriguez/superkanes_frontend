import type { Api } from '../workspace/model'
export async function downloadClinical(api: Api, id: string, name: string) {
  const blob = await api.clinicalFile(id),
    url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
