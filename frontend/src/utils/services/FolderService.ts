import { post, _delete, patch } from "../fetch_utils"

const FOLDER_API_ROUTE = "/user/folders"

export const createFolder = (name: string, color: string) => {
  return post(FOLDER_API_ROUTE, { name, color })
}

export const updateFolder = (
  folderId: string,
  name: string,
  color: string
) => {
  return patch(`${FOLDER_API_ROUTE}/${folderId}`, { name, color })
}

export const deleteFolder = (folderId: string) => {
  return _delete(`${FOLDER_API_ROUTE}/${folderId}`)
}

export const setEventFolder = (eventId: string, folderId: string | null) => {
  return post(`/user/events/${eventId}/set-folder`, { folderId })
}
