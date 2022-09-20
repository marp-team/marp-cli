export const showAllKey = 'marp-cli-show-all'

export default function serverIndex() {
  const showAll = document.getElementById('show-all') as HTMLInputElement
  const index = document.getElementById('index') as HTMLElement

  const applyShowAll = (state: boolean) => {
    showAll.checked = state
    index.classList.toggle('show-all', state)

    try {
      sessionStorage.setItem(showAllKey, state ? '1' : '')
    } catch (e: unknown) {
      console.error(e)
    }
  }

  applyShowAll(!!sessionStorage.getItem(showAllKey))
  showAll.addEventListener('change', () => applyShowAll(showAll.checked))
}
