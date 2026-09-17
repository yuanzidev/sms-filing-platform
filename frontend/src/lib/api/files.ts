import api from '../api'
import type { FileAttachmentPublic } from './types'

/**
 * 上传文件（选文件立即上传）
 */
export const uploadFile = async (
  file: File,
  entityType: string,
  entityId: string
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
 * 返回文件 URL（浏览器自动跟随重定向到 presigned/local URL）
 */
export const getFileUrl = (id: string): string => {
  return `/api/v1/files/${id}`
}

export const listFiles = async (
  entityType: string,
  entityId: string
): Promise<FileAttachmentPublic[]> => {
  const response = await api.get('/api/v1/files', {
    params: { entity_type: entityType, entity_id: entityId },
  })
  return response.data
}

/**
 * 删除文件
 */
export const deleteFile = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/api/v1/files/${id}`)
  return response.data
}
