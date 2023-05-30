<script lang="ts">
  import { Particle } from '$lib/utils.js'
  import debounce from 'lodash.debounce'
  import { onMount } from 'svelte'

  let canvas: HTMLCanvasElement[] = []
  let innerHeight: number
  let innerWidth: number

  type Wave = {
    ctx: CanvasRenderingContext2D
    w: number
    h: number
    animationId: number
    particles: Particle[]
    level: number
    colors: string[]
    c: number
    g: number
  }

  const waves: Wave[] = []

  const wavesCustomisations: { level: number; colors: string[]; g: number }[] = [
    { level: 5, colors: ['#4000e2', '#6305f0'], g: 100 },
    { level: 1, colors: ['#6305f0', '#5600ea'], g: 200 }
  ]

  // Function to start or restart the animation
  function init(wave: number): void {
    const canvasElement = canvas[wave]
    canvasElement.width = innerWidth
    canvasElement.height = innerHeight

    waves[wave] = {
      ctx: canvasElement.getContext('2d') as CanvasRenderingContext2D,
      w: innerWidth,
      h: innerHeight,
      c: 0,
      level: wavesCustomisations[wave].level,
      colors: wavesCustomisations[wave].colors,
      g: wavesCustomisations[wave].g,
      particles: [],
      animationId: 0
    }

    for (let i = 0; i < 40; i++) {
      const obj: Particle = new Particle(0, 0, 0, waves[wave].level, waves[wave].w, waves[wave].h)
      obj.respawn()
      waves[wave].particles.push(obj)
    }

    waves[wave].animationId = window.requestAnimationFrame(() => draw(wave))
  }

  // Function that draws into the canvas in a loop
  function draw(wave: number): void {
    const ctx = waves[wave].ctx
    ctx.clearRect(0, 0, waves[wave].w, waves[wave].h)
    const gradient = ctx.createLinearGradient(0, 0, 50, waves[wave].g)
    gradient.addColorStop(0, waves[wave].colors[0])
    gradient.addColorStop(1, waves[wave].colors[1])
    ctx.fillStyle = gradient
    ctx.strokeStyle = waves[wave].colors[0]

    // Draw the liquid
    ctx.beginPath()
    ctx.moveTo(0, ((waves[wave].h - 100) * waves[wave].level) / 100 + 50) // Move to the top-left corner

    const temp: number = 50 * Math.sin((waves[wave].c * 1 + wave * 40) / 50)

    ctx.bezierCurveTo(
      waves[wave].w / 3,
      ((waves[wave].h - 100) * waves[wave].level) / 100 + 50 + temp,
      (2 * waves[wave].w) / 3,
      ((waves[wave].h - 100) * waves[wave].level) / 100 + 50 - temp,
      waves[wave].w,
      ((waves[wave].h - 100) * waves[wave].level) / 100 + 50
    )

    ctx.lineTo(waves[wave].w, 0) // Line to the top-right corner
    ctx.lineTo(0, 0) // Line back to the top-left corner

    ctx.fill()

    update(wave)
    waves[wave].animationId = window.requestAnimationFrame(() => draw(wave))
  }

  function update(wave: number): void {
    waves[wave].c = waves[wave].c + 0.4
    if (100 * Math.PI <= waves[wave].c) waves[wave].c = 0
    for (let i = 0; i < 40; i++) {
      waves[wave].particles[i].x = waves[wave].particles[i].x + Math.random() * 2 - 1
      waves[wave].particles[i].y = waves[wave].particles[i].y - 1
      waves[wave].particles[i].d = waves[wave].particles[i].d - 0.04
      if (waves[wave].particles[i].d <= 0) waves[wave].particles[i].respawn()
    }
  }

  function handleResize() {
    waves.forEach(({ animationId }) => window.cancelAnimationFrame(animationId))
    init(0)
    init(1)
  }

  onMount(() => {
    init(0)
    init(1)
  })
</script>

<svelte:window on:resize={debounce(handleResize, 500)} bind:innerHeight bind:innerWidth />

<canvas class="absolute top-0 left-0" bind:this={canvas[0]} />
<canvas class="absolute top-0 left-0" bind:this={canvas[1]} />
