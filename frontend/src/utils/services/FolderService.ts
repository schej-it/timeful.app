import type { Folder } from "@/types"
import type { RawFolder } from "@/types/transport"
import { fromRawFolder } from "@/types/transport"
import { post, _delete, patch, get } from "../fetch_utils"

const FOLDER_API_ROUTE = "/user/folders"

export const createFolder = (name: string, color: string) => {
  return post(FOLDER_API_ROUTE, { name, color })
}

export const fetchUserFolders = async (): Promise<Folder[]> =>
  (await get<RawFolder[]>(FOLDER_API_ROUTE)).map(fromRawFolder)

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
