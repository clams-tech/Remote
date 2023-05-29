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
  }

  const waves: Wave[] = []
  const wavesCustomisations: { level: number; colors: string[] }[] = [
    { level: 12, colors: ['#5600ea', '#9a67f6'] },
    { level: 10, colors: ['#6305f0', '#9a67f6'] }
  ]

  //function to start or restart the animation
  function init(wave: number): void {
    canvas[wave].width = innerWidth
    canvas[wave].height = innerHeight

    waves[wave] = {
      ctx: canvas[wave].getContext('2d') as CanvasRenderingContext2D,
      w: innerWidth,
      h: innerHeight,
      c: 0,
      level: wavesCustomisations[wave].level,
      colors: wavesCustomisations[wave].colors,
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

  //function that draws into the canvas in a loop
  function draw(wave: number): void {
    waves[wave].ctx.clearRect(0, 0, waves[wave].w, waves[wave].h)
    const gradient = waves[wave].ctx.createLinearGradient(0, 400, 3000, 2000)
    console.log(waves[wave].colors[0], waves[wave].colors[1])
    gradient.addColorStop(0, waves[wave].colors[0])
    gradient.addColorStop(1, waves[wave].colors[1])
    waves[wave].ctx.fillStyle = gradient
    waves[wave].ctx.strokeStyle = waves[wave].colors[0]

    //draw the liquid
    waves[wave].ctx.beginPath()
    waves[wave].ctx.moveTo(
      waves[wave].w,
      waves[wave].h - ((waves[wave].h - 100) * waves[wave].level) / 100 - 50
    )
    waves[wave].ctx.lineTo(waves[wave].w, waves[wave].h)
    waves[wave].ctx.lineTo(0, waves[wave].h)
    waves[wave].ctx.lineTo(
      0,
      waves[wave].h - ((waves[wave].h - 100) * waves[wave].level) / 100 - 50
    )

    const temp: number = 50 * Math.sin((waves[wave].c * 1 + wave * 40) / 50)

    waves[wave].ctx.bezierCurveTo(
      waves[wave].w / 3,
      waves[wave].h - ((waves[wave].h - 100) * waves[wave].level) / 100 - 50 - temp,
      (2 * waves[wave].w) / 3,
      waves[wave].h - ((waves[wave].h - 100) * waves[wave].level) / 100 - 50 + temp,
      waves[wave].w,
      waves[wave].h - ((waves[wave].h - 100) * waves[wave].level) / 100 - 50
    )

    waves[wave].ctx.fill()

    update(wave)
    waves[wave].animationId = window.requestAnimationFrame(() => draw(wave))
  }

  function update(wave: number): void {
    waves[wave].c++
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
