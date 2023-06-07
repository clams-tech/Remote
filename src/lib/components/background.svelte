<script>
  // https://codepen.io/siokoden/pen/gvpaMg

  import { onMount } from 'svelte'
  let canvas

  function start() {
    var t,
      i = {
        screen: {
          elem: null,
          callback: null,
          ctx: null,
          width: 0,
          height: 0,
          left: 0,
          top: 0,
          init: function (t, i, s) {
            canvas.height = window.innerHeight
            canvas.width = window.innerWidth

            return (
              (this.elem = canvas),
              (this.callback = i || null),
              (this.ctx = this.elem.getContext('2d')),
              window.addEventListener(
                'resize',
                function () {
                  this.resize()
                }.bind(this),
                !1
              ),
              (this.elem.onselectstart = function () {
                return !1
              }),
              (this.elem.ondrag = function () {
                return !1
              }),
              s && this.resize(),
              this
            )
          },
          resize: function () {
            var t = this.elem
            for (
              this.width = t.offsetWidth, this.height = t.offsetHeight, this.left = 0, this.top = 0;
              null != t;
              t = t.offsetParent
            )
              (this.left += t.offsetLeft), (this.top += t.offsetTop)
            this.ctx && ((this.elem.width = this.width), (this.elem.height = this.height)),
              this.callback && this.callback()
          }
        }
      },
      s = function (t, i) {
        ;(this.x = t),
          (this.y = i),
          (this.magnitude = t * t + i * i),
          (this.computed = 0),
          (this.force = 0)
      }
    s.prototype.add = function (t) {
      return new s(this.x + t.x, this.y + t.y)
    }
    var h = function (t) {
      var i = 0.1,
        h = 1.5
      ;(this.vel = new s(
        (Math.random() > 0.5 ? 1 : -1) * (0.2 + 0.25 * Math.random()),
        (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random())
      )),
        (this.pos = new s(
          0.2 * t.width + Math.random() * t.width * 0.6,
          0.2 * t.height + Math.random() * t.height * 0.6
        )),
        (this.size = t.wh / 15 + (1.4 * Math.random() + 0.1) * (t.wh / 15)),
        (this.width = t.width),
        (this.height = t.height)
    }
    h.prototype.move = function () {
      this.pos.x >= this.width - this.size
        ? (this.vel.x > 0 && (this.vel.x = -this.vel.x), (this.pos.x = this.width - this.size))
        : this.pos.x <= this.size &&
          (this.vel.x < 0 && (this.vel.x = -this.vel.x), (this.pos.x = this.size)),
        this.pos.y >= this.height - this.size
          ? (this.vel.y > 0 && (this.vel.y = -this.vel.y), (this.pos.y = this.height - this.size))
          : this.pos.y <= this.size &&
            (this.vel.y < 0 && (this.vel.y = -this.vel.y), (this.pos.y = this.size)),
        (this.pos = this.pos.add(this.vel))
    }
    var e = function (t, i, e, o, n) {
      ;(this.step = 5),
        (this.width = t),
        (this.height = i),
        (this.wh = Math.min(t, i)),
        (this.sx = Math.floor(this.width / this.step)),
        (this.sy = Math.floor(this.height / this.step)),
        (this.paint = !1),
        (this.metaFill = r(t, i, t, o, n)),
        (this.plx = [0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0]),
        (this.ply = [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1]),
        (this.mscases = [0, 3, 0, 3, 1, 3, 0, 3, 2, 2, 0, 2, 1, 1, 0]),
        (this.ix = [1, 0, -1, 0, 0, 1, 0, -1, -1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1]),
        (this.grid = []),
        (this.balls = []),
        (this.iter = 0),
        (this.sign = 1)
      for (var a = 0; a < (this.sx + 2) * (this.sy + 2); a++)
        this.grid[a] = new s(
          (a % (this.sx + 2)) * this.step,
          Math.floor(a / (this.sx + 2)) * this.step
        )
      for (var l = 0; l < e; l++) this.balls[l] = new h(this)
    }
    ;(e.prototype.computeForce = function (t, i, s) {
      var h,
        e = s || t + i * (this.sx + 2)
      if (0 === t || 0 === i || t === this.sx || i === this.sy) h = 0.6 * this.sign
      else {
        h = 0
        for (var r = this.grid[e], o = 0, n; (n = this.balls[o++]); )
          h +=
            (n.size * n.size) /
            (-2 * r.x * n.pos.x - 2 * r.y * n.pos.y + n.pos.magnitude + r.magnitude)
        h *= this.sign
      }
      return (this.grid[e].force = h), h
    }),
      (e.prototype.marchingSquares = function (t) {
        var i = t[0],
          s = t[1],
          h = t[2],
          e = i + s * (this.sx + 2)
        if (this.grid[e].computed === this.iter) return !1
        for (var r, o = 0, n = 0; n < 4; n++) {
          var l = i + this.ix[n + 12] + (s + this.ix[n + 16]) * (this.sx + 2),
            d = this.grid[l].force
          ;((d > 0 && this.sign < 0) || (d < 0 && this.sign > 0) || !d) &&
            (d = this.computeForce(i + this.ix[n + 12], s + this.ix[n + 16], l)),
            Math.abs(d) > 1 && (o += Math.pow(2, n))
        }
        if (15 === o) return [i, s - 1, !1]
        5 === o
          ? (r = 2 === h ? 3 : 1)
          : 10 === o
          ? (r = 3 === h ? 0 : 2)
          : ((r = this.mscases[o]), (this.grid[e].computed = this.iter))
        var p =
          this.step /
          (Math.abs(
            Math.abs(
              this.grid[i + this.plx[4 * r + 2] + (s + this.ply[4 * r + 2]) * (this.sx + 2)].force
            ) - 1
          ) /
            Math.abs(
              Math.abs(
                this.grid[i + this.plx[4 * r + 3] + (s + this.ply[4 * r + 3]) * (this.sx + 2)].force
              ) - 1
            ) +
            1)
        return (
          a.lineTo(
            this.grid[i + this.plx[4 * r] + (s + this.ply[4 * r]) * (this.sx + 2)].x +
              this.ix[r] * p,
            this.grid[i + this.plx[4 * r + 1] + (s + this.ply[4 * r + 1]) * (this.sx + 2)].y +
              this.ix[r + 4] * p
          ),
          (this.paint = !0),
          [i + this.ix[r + 4], s + this.ix[r + 8], r]
        )
      }),
      (e.prototype.renderMetaballs = function () {
        for (var t = 0, i; (i = this.balls[t++]); ) i.move()
        for (
          this.iter++,
            this.sign = -this.sign,
            this.paint = !1,
            a.fillStyle = this.metaFill,
            a.beginPath(),
            t = 0;
          (i = this.balls[t++]);

        ) {
          var s = [Math.round(i.pos.x / this.step), Math.round(i.pos.y / this.step), !1]
          do {
            s = this.marchingSquares(s)
          } while (s)
          this.paint && (a.fill(), a.closePath(), a.beginPath(), (this.paint = !1))
        }
      })
    var r = function (t, i, s, h, e) {
        var r = a.createRadialGradient(t / 1, i / 1, 0, t / 1, i / 1, s)
        return r.addColorStop(0, h), r.addColorStop(1, e), r
      },
      o = function () {
        requestAnimationFrame(o), a.clearRect(0, 0, n.width, n.height), t.renderMetaballs()
      },
      n = i.screen.init('liquid', null, !0),
      a = n.ctx
    n.resize(),
      (t = new e(n.width, n.height, window.innerWidth > 600 ? 6 : 10, '#A066FF', '#310080')),
      o()
  }

  onMount(() => start())
</script>

<canvas
  class="absolute top-0 left-0 dark:bg-neutral-900 bg-neutral-50 w-screen h-[calc(100dvh)]"
  bind:this={canvas}
/>
