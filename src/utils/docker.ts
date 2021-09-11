import _isDocker from 'is-docker'

export const isDocker = () => {
  return isOfficialImage() || _isDocker()
}

export const isOfficialImage = () => {
  return !!process.env.MARP_USER
}
