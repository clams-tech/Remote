import { BehaviorSubject } from 'rxjs'

// Svelte action to use when wanting to do something when there is a click outside of element
export function clickOutside(element: HTMLElement, callbackFunction: () => void) {
  function onClick(event: MouseEvent) {
    if (!element.contains(event.target as HTMLElement)) {
      callbackFunction()
    }
  }

  document.body.addEventListener('click', onClick)

  return {
    update(newCallbackFunction: () => void) {
      callbackFunction = newCallbackFunction
    },
    destroy() {
      document.body.removeEventListener('click', onClick)
    }
  }
}

// Makes a BehaviourSubject compatible with Svelte stores
export class SvelteSubject<T> extends BehaviorSubject<T> {
  set: BehaviorSubject<T>['next']
  constructor(initialState: T) {
    super(initialState)
    this.set = super.next
  }
}
