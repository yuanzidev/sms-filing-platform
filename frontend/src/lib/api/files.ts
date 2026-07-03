import api from '../api'
import type { FileAttachmentPublic } from './types'

/**
 * 上传文件（选文件立即上传）
 */
export const uploadFile = async (
  file: File,
  entityType: string,
  entityId: string,
): Promise<FileAttachmentPublic> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entity_type', entityType)
  formData.append('entity_id', entityId)

  const response = await api.post('/api/v1/files/upload', formData, {
    timeout: 60000,
  })
  return response.data
}

/**
 * 获取文件下载 URL（跟随重定向获取 presigned URL）
 */
export const getFileUrl = async (id: string): Promise<string> => {
  const response = await api.get(`/api/v1/files/${id}`, {
    maxRedirects: 0,
    validateStatus: (status) => status === 307,
  })
  return response.headers['location'] || `/api/v1/files/${id}/download`
}

/**
 * 删除文件
 */
export const deleteFile = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/files/${id}`)
  return response.data
}
