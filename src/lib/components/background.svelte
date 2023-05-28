<script lang="ts">
  import { Particle } from '$lib/utils.js'
  import debounce from 'lodash.debounce'
  import { onMount } from 'svelte'

  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  let innerHeight: number
  let innerWidth: number
  let w: number
  let h: number

  //essential variables
  let animationId: number

  const particles: Particle[] = [] //particle array
  const level: number = 10
  const color: string = '#6305f0'
  let c: number

  //function to start or restart the animation
  function init(): void {
    w = innerWidth - 230
    h = innerHeight
    canvas.width = w
    canvas.height = h
    c = 0
    particles.length = 0
    for (let i = 0; i < 40; i++) {
      const obj: Particle = new Particle(0, 0, 0, level, w, h)
      obj.respawn()
      particles.push(obj)
    }
    animationId = window.requestAnimationFrame(draw)
  }

  //function that draws into the canvas in a loop
  function draw(): void {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = color
    ctx.strokeStyle = color

    //draw the liquid
    ctx.beginPath()
    ctx.moveTo(w, h - ((h - 100) * level) / 100 - 50)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.lineTo(0, h - ((h - 100) * level) / 100 - 50)

    const temp: number = 50 * Math.sin((c * 1) / 50)

    ctx.bezierCurveTo(
      w / 3,
      h - ((h - 100) * level) / 100 - 50 - temp,
      (2 * w) / 3,
      h - ((h - 100) * level) / 100 - 50 + temp,
      w,
      h - ((h - 100) * level) / 100 - 50
    )

    ctx.fill()

    update()
    animationId = window.requestAnimationFrame(draw)
  }

  function update(): void {
    c++
    if (100 * Math.PI <= c) c = 0
    for (let i = 0; i < 40; i++) {
      particles[i].x = particles[i].x + Math.random() * 2 - 1
      particles[i].y = particles[i].y - 1
      particles[i].d = particles[i].d - 0.04
      if (particles[i].d <= 0) particles[i].respawn()
    }
  }

  function handleResize() {
    window.cancelAnimationFrame(animationId)
    init()
  }

  onMount(() => {
    ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    init()
  })
</script>

<svelte:window on:resize={debounce(handleResize, 500)} bind:innerHeight bind:innerWidth />

<canvas class="w-screen h-screen" bind:this={canvas} />
