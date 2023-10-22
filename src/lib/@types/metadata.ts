import type { Contact } from './contacts.js'

export type Tag = {
  id: string
  label: string
  description?: string
}

export type Metadata = {
  tags: Tag['id'][]
  contact?: Contact['id']
  note?: string
}
