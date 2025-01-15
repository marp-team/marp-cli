import _isInsideContainer from 'is-inside-container'

export const isInsideContainer = () =>
  isOfficialContainerImage() ||
  (_isInsideContainer() && !process.env.MARP_TEST_CI)

export const isOfficialContainerImage = () => !!process.env.MARP_USER
