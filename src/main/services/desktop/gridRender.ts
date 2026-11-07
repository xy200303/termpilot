c      if (vertical) {
          ctx.moveTo(Math.round(fixed) + 0.5, from)
          ctx.lineTo(Math.round(fixed) + 0.5, to)
        } else {
          ctx.moveTo(from, Math.round(fixed) + 0.5)
          ctx.lineTo(to, Math.round(fixed) + 0.5)
        }
        ctx.stroke()
      }

      ctx.lineWidth = 1
      // 数字按「第几条线」抽稀，保证标签一定落在线上
      const labelEvery = Math.max(1, Math.round(LABEL_STEP / STEP))
      let indexX = 0
      for (let gx = 0; gx * sx <= canvas.width - 1; gx += STEP) {
        const x = gx * sx
        for (let y = 0; y < canvas.height; ) {
          const end = Math.min(canvas.height, (Math.floor(y / BLOCK) + 1) * BLOCK)
          paintRun(true, x, y, end)
          y = end
        }
        if (indexX % labelEvery === 0 && !(hasChip && gx === 0)) label(String(Math.round(ORIGIN_X + gx)), Math.min(canvas.width - font * 3, Math.round(x) + 3), 3)
        indexX += 1
      }
      let indexY = 0
      for (let gy = 0; gy * sy <= canvas.height - 1; gy += STEP) {
        const y = gy * sy
        for (let x = 0; x < canvas.width; ) {
          const end = Math.min(canvas.width, (Math.floor(x / BLOCK) + 1) * BLOCK)
          paintRun(false, y, x, end)
          x = end
        }
        if (indexY % labelEvery === 0 && !(hasChip && gy === 0)) label(String(Math.round(ORIGIN_Y + gy)), 4, Math.min(canvas.height - font - 1, Math.round(y) + 2))
        indexY += 1
      }
      // 角标最后画，盖在线条和数字上面
      if (hasChip) {
        const chip = '(' + Math.round(ORIGIN_X) + ', ' + Math.round(ORIGIN_Y) + ')'
        const tw = ctx.measureText(chip).width
        ctx.fillStyle = CHIP_BG
        ctx.fillRect(0, 0, tw + 4, font + 4)
        ctx.fillStyle = CHIP_FG
        ctx.fillText(chip, 2, 2)
      }
      return canvas.toDataURL('image/png')
    })()`
    const out = (await wc.executeJavaScript(script, true)) as string
    if (!out || !out.startsWith('data:image/png;base64,')) return image
    const drawn = nativeImage.createFromDataURL(out)
    return drawn.isEmpty() ? image : drawn
  } catch {
    return image
