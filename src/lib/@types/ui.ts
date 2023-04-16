export type Notification = {
  id: string
  type: 'error' | 'hint' | 'success'
  heading: string
  message: string
}
