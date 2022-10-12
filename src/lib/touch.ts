import Hammer, {
  DIRECTION_ALL,
  DIRECTION_DOWN,
  DIRECTION_HORIZONTAL,
  DIRECTION_LEFT,
  DIRECTION_RIGHT,
  DIRECTION_UP,
  DIRECTION_VERTICAL,
  Pan
} from 'hammerjs'

export function drag(
  node: HTMLElement,
  { direction, threshold, maxDrag = 50 }: DragOptions
): { update: (options: DragOptions) => void; destroy: () => void } {
  const hammer = new Hammer(node)

  hammer.add(new Pan({ direction, threshold }))

  hammer.on('pan', (ev: HammerInput) => {
    const { deltaX, deltaY, deltaTime } = ev

    const beyondMaxDragX = Math.abs(deltaX) > maxDrag
    const beyondMaxDragY = Math.abs(deltaY) > maxDrag

    if (
      !beyondMaxDragY &&
      ((direction === DIRECTION_DOWN && deltaY > 0) ||
        (direction === DIRECTION_UP && deltaY < 0) ||
        direction === DIRECTION_ALL ||
        direction === DIRECTION_VERTICAL)
    ) {
      node.style.top = `${deltaY}px`
    }

    if (
      !beyondMaxDragX &&
      ((direction === DIRECTION_RIGHT && deltaX > 0) ||
        (direction === DIRECTION_LEFT && deltaX < 0) ||
        direction === DIRECTION_ALL ||
        direction === DIRECTION_HORIZONTAL)
    ) {
      node.style.top = `${deltaY}px`
    }

    // reset back to position
    if (ev.isFinal) {
      if (deltaTime > 300 || !beyondMaxDragY) {
        node.style.top = '0px'
      }

      if (deltaTime > 300 || !beyondMaxDragX) {
        node.style.left = '0px'
      }
    }
  })

  return {
    update(opt) {
      hammer.get('pan').set(opt)
    },
    destroy() {
      hammer.off('pan')
    }
  }
}

type SwipeOptions = {
  direction: number
  threshold?: number
  velocity?: number
}

type DragOptions = {
  direction?: number
  threshold?: number
  maxDrag?: number
}

export function swipe(
  node: HTMLElement,
  options?: SwipeOptions
): { update: (options?: SwipeOptions) => void; destroy: () => void } {
  const hammer = new Hammer(node)
  hammer.get('swipe').set(options)
  hammer.on('swipe', (ev: HammerInput) =>
    node.dispatchEvent(new CustomEvent('swipe', { detail: ev }))
  )

  return {
    update(opt) {
      hammer.get('swipe').set(opt)
    },
    destroy() {
      hammer.off('swipe')
    }
  }
}
