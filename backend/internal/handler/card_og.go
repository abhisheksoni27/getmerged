package handler

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"

	"github.com/abhisheksoni27/opendoor/internal/repository"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/math/fixed"
)

// renderShareCardPNG draws the 1200x630 public OG card for a preflight forecast
// (score, verdict badge, repo name, C-Rank call-to-action) using the built-in
// fixed font scaled up for legibility at social-preview sizes.
func renderShareCardPNG(card *repository.ShareCard) []byte {
	const (
		w = 1200
		h = 630
	)
	bg := color.RGBA{0x22, 0x28, 0x31, 0xff} // brand dark #222831
	panel := color.RGBA{0x2c, 0x33, 0x3e, 0xff}
	white := color.RGBA{0xfd, 0xfb, 0xf7, 0xff} // #FDFBF7
	grey := color.RGBA{0x9c, 0xa3, 0xaf, 0xff}
	lightGrey := color.RGBA{0xd4, 0xd4, 0xd8, 0xff}
	emerald := color.RGBA{0x10, 0xb9, 0x81, 0xff}
	amber := color.RGBA{0xf5, 0x9e, 0x0b, 0xff}

	img := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(img, img.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
	// Accent bar across the top.
	draw.Draw(img, image.Rect(0, 0, w, 10), &image.Uniform{emerald}, image.Point{}, draw.Src)

	drawScaledText(img, "GETMERGED - PRE-FLIGHT PR FORECAST", 64, 64, 2, emerald)
	drawScaledText(img, truncateRunes(card.RepoFullName, 34), 64, 120, 8, white)
	if card.PRTitle != nil && *card.PRTitle != "" {
		drawScaledText(img, truncateRunes(*card.PRTitle, 52), 64, 230, 3, lightGrey)
	}

	scoreText := fmt.Sprintf("%d/100", int(card.OverallScore+0.5))
	drawScaledText(img, scoreText, 64, 320, 12, white)
	drawScaledText(img, "PRE-FLIGHT SCORE", 68, 470, 2, grey)

	verdict := "ADJUSTMENTS RECOMMENDED"
	vColor := amber
	if card.ReadyToMerge {
		verdict = "READY TO MERGE"
		vColor = emerald
	}
	badgeX, badgeY, badgeH := 620, 330, 72
	textW := approxTextWidth(verdict, 4)
	draw.Draw(img, image.Rect(badgeX, badgeY, badgeX+textW+56, badgeY+badgeH), &image.Uniform{panel}, image.Point{}, draw.Src)
	drawScaledText(img, verdict, badgeX+28, badgeY+22, 4, vColor)

	if card.Summary != nil && *card.Summary != "" {
		drawScaledText(img, truncateRunes(*card.Summary, 78), 620, 430, 2, lightGrey)
	}

	drawScaledText(img, "View C-Rank and run your own free forecast -> getmerged.abhishekco.de", 64, 552, 2, grey)

	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}

var ogFace = basicfont.Face7x13

// drawScaledText renders text by scaling each glyph pixel of the built-in 7x13 face.
func drawScaledText(img *image.RGBA, s string, x, y, scale int, clr color.Color) {
	face := ogFace
	for _, r := range s {
		dr, mask, maskp, adv, ok := face.Glyph(fixed.I(0), r)
		if !ok {
			continue
		}
		uniform := image.NewUniform(clr)
		for py := dr.Min.Y; py < dr.Max.Y; py++ {
			for px := dr.Min.X; px < dr.Max.X; px++ {
				if _, _, _, a := mask.At(maskp.X+px, maskp.Y+py).RGBA(); a == 0 {
					continue
				}
				rect := image.Rect(x+px*scale, y+py*scale, x+(px+1)*scale, y+(py+1)*scale)
				draw.Draw(img, rect, uniform, image.Point{}, draw.Src)
			}
		}
		x += adv.Round() * scale
	}
}

func approxTextWidth(s string, scale int) int {
	total := 0
	for _, r := range s {
		_, _, _, adv, ok := ogFace.Glyph(fixed.I(0), r)
		if !ok {
			continue
		}
		total += adv.Round()
	}
	return total * scale
}
