import _isInsideContainer from 'is-inside-container'

export const isInsideContainer = () =>
  isOfficialDockerImage() || (_isInsideContainer() && !process.env.MARP_TEST_CI)

export const isOfficialDockerImage = () => !!process.env.MARP_USER
