import YUVSurfaceShader from './YUVSurfaceShader.js'
import Texture from './Texture.js'

class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl')
    this.yuvSurfaceShader = YUVSurfaceShader.create(gl)
    this.yTexture = Texture.create(gl, gl.LUMINANCE)
    this.uTexture = Texture.create(gl, gl.LUMINANCE)
    this.vTexture = Texture.create(gl, gl.LUMINANCE)
  }

  /**
   * @param {Uint8Array}buffer
   * @param {number}width
   * @param {number}height
   */
  onPicture (buffer, width, height) {
    // the width & height returned are actually padded, so we have to use the frame size to get the real image dimension
    // when uploading to texture
    const stride = width // stride
    // height is padded with filler rows

    const lumaSize = stride * height
    const chromaSize = lumaSize >> 2

    const yBuffer = buffer.subarray(0, lumaSize)
    const uBuffer = buffer.subarray(lumaSize, lumaSize + chromaSize)
    const vBuffer = buffer.subarray(lumaSize + chromaSize, lumaSize + (2 * chromaSize))

    const chromaHeight = height >> 1
    const chromaStride = stride >> 1

    this.onPlanes(width, height, yBuffer, uBuffer, vBuffer, stride, chromaStride, chromaHeight);
  }

  onPlanes (width, height, yBuffer, uBuffer, vBuffer, stride, chromaStride, chromaHeight) {
    let canvas = this.canvas;

    canvas.width = width
    canvas.height = height

    // if we knew the size of the video before encoding, we could cut out the black filler pixels. We don't, so just set
    // it to the size after encoding
    const sourceWidth = width
    const sourceHeight = height
    const maxXTexCoord = sourceWidth / stride
    const maxYTexCoord = sourceHeight / height
    const maxXTexCoordChroma = (sourceWidth / 2) / chromaStride
    const maxYTexCoordChroma = (sourceHeight / 2) / chromaHeight

    // we upload the entire image, including stride padding & filler rows. The actual visible image will be mapped
    // from texture coordinates as to crop out stride padding & filler rows using maxXTexCoord and maxYTexCoord.

    let yTexture = this.yTexture;
    let uTexture = this.uTexture;
    let vTexture = this.vTexture;

    yTexture.image2dBuffer(yBuffer, stride, height)
    uTexture.image2dBuffer(uBuffer, chromaStride, chromaHeight)
    vTexture.image2dBuffer(vBuffer, chromaStride, chromaHeight)

    this.yuvSurfaceShader.setTexture(yTexture, uTexture, vTexture)
    this.yuvSurfaceShader.updateShaderData({ w: width, h: height }, { maxXTexCoord, maxYTexCoord, maxXTexCoordChroma, maxYTexCoordChroma })
    this.yuvSurfaceShader.draw()
  }
}

export default CanvasRenderer;