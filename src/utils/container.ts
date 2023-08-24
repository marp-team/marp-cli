import _isInsideContainer from 'is-inside-container'

export const isInsideContainer = () =>
  isOfficialDockerImage() || _isInsideContainer()

export const isOfficialDockerImage = () => !!process.env.MARP_USER
