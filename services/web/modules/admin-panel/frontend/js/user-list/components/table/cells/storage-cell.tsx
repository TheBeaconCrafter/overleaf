import { memo } from 'react'
import { User } from '../../../../../../types/api'

type StorageCellProps = {
  user: User
}

function StorageCell({ user }: StorageCellProps) {
  const storageUsed = user.storageUsed || 0

  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return <span>{formatStorage(storageUsed)}</span>
}

export default memo(StorageCell)

