import _isDocker from 'is-docker'

export const isDocker = () => isOfficialImage() || _isDocker()
export const isOfficialImage = () => !!process.env.MARP_USER
