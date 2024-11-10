// Canvas setup
const c = document.getElementById("c")
const ctx = c.getContext("2d")

const c2 = document.getElementById("c2")
const ctx2 = c2.getContext("2d")

// Resize
function updateCanvasDims() {
    c.width = Math.floor(window.innerWidth * window.devicePixelRatio)
    c.height = Math.floor(window.innerHeight * window.devicePixelRatio)
    
    c2.width = Math.floor(window.innerWidth * window.devicePixelRatio)
    c2.height = Math.floor(window.innerHeight * window.devicePixelRatio)

    resizeCanvas()
}

function resizeCanvas() {
    c.setAttribute("style", `width: ${c.width/window.devicePixelRatio}px; height: ${c.height/window.devicePixelRatio}px`)
    c2.setAttribute("style", `width: ${c.width/window.devicePixelRatio}px; height: ${c.height/window.devicePixelRatio}px`)
}

updateCanvasDims()
window.addEventListener("resize", resizeCanvas)

// Draw
function colorPixel(x, y, h, s, l) {
    ctx.fillStyle = `hsl(${h}, ${s*100}%, ${l*100}%)`
    ctx.fillRect(x, y, 1, 1)
}

// Graph config
let globalXBound = [-2, 2]
let globalYBound = [-1.4, 1.4]

let xBound = [globalXBound[0], globalXBound[1]]
let yBound = [globalYBound[0], globalYBound[1]]

let xBoundHist = []
let yBoundHist = []

let cx = -1
let cy = 0

let maxIter = 20

// Rescale from canvas coords to complex plane coords
const c2gX = (canvasX) => ((canvasX / c.width) * (xBound[1] - xBound[[0]]) + xBound[0])
const c2gY = (canvasY) => (((c.height - canvasY) / c.height) * (yBound[1] - yBound[[0]]) + yBound[0])

// Rescale from complex plane coords to canvas coords
const g2cX = (graphX) => ((graphX - xBound[0]) / (xBound[1] - xBound[0]) * c.width)
const g2cY = (graphY) => (c.height - ((graphY - yBound[0]) / (yBound[1] - yBound[0]) * c.height))

// Workers
const workerPath = "worker.js"

const nWorkers = 20
let workers = []

let workerOut = []

function initWorkers(dataCallback) {
    workers = []

    for (let i = 0; i < nWorkers; i++) {
        const worker = new Worker(workerPath)

        worker.postMessage({
            "startTime": new Date() - 0,
            "type": "updateConfig",
            "xBound": globalXBound,
            "yBound": globalYBound,
            "maxIter": maxIter,
            "cx": cx,
            "cy": cy
        })

        worker.addEventListener("message", e => {
            console.log(`Worker ${i+1} finished ${e.data["type"]} task in ${new Date() - e.data["startTime"]}ms`)
            dataCallback(e.data)
        })

        workers.push(worker)
    }
}

function updateWorkers() {
    for (const worker of workers) {
        worker.postMessage({
            "startTime": new Date() - 0,
            "type": "updateConfig",
            "xBound": globalXBound,
            "yBound": globalYBound,
            "maxIter": maxIter,
            "cx": cx,
            "cy": cy
        })
    }
}

function dispatchGrid(grid) {
    let curr = []
    let currWorkerIdx = 0
    let i0 = 0

    workerOut = []

    const rowsPerSubgrid = Math.ceil(grid.length/nWorkers)

    for (let i = 0; i < grid.length; i++) {
        curr.push(grid[i])

        if ((curr.length < rowsPerSubgrid) && (i < grid.length - 1)) {
            continue
        }

        workers[currWorkerIdx].postMessage({
            "startTime": new Date() - 0,
            "type": "compute",
            "i0": i0,
            "grid": curr
        })

        curr = []
        i0 = i + 1
        currWorkerIdx += 1
    }
}

function handleWorkerData(data) {
    if (data["type"] == "updateConfig") {
        return
    } else if (data["type"] == "compute") {
        workerOut.push(data)

        if (workerOut.length == nWorkers) drawGrid()
    }
}

function drawGrid() {
    const startTime = new Date()

    const img = ctx.getImageData(0, 0, c.width, c.height)

    let buf = new ArrayBuffer(img.data.length)
    let buf8 = new Uint8ClampedArray(buf)
    let data = new Uint32Array(buf)

    for (const out of workerOut) {
        const i0 = out["i0"]
        const grid = out["grid"]

        for (let i = 0; i < grid.length; i++) {
            // Compute color
            const rgb = hslToRgb(...grid[i])

            // Bit shift bs
            data[i0 + i] = (rgb[0]      ) | // R
                           (rgb[1] << 8 ) | // G
                           (rgb[2] << 16) | // B
                           (255    << 24)   // A
        }
    }

    img.data.set(buf8)

    ctx.putImageData(img, 0, 0)

    enableButtons()

    console.log(`Finished drawing in ${new Date() - startTime}ms`)
}

// Colored Julia Set
function updateFunction(cx_, cy_) {
    cx = cx_
    cy = cy_

    updateWorkers()
}

function draw() {
    let grid = []

    for (let i = 0; i < c.height; i++) {
        for (let j = 0; j < c.width; j++) {
            grid.push([c2gX(j), c2gY(i)])
        }
    }

    dispatchGrid(grid)
}

function addNewBounds() {
    const x1 = Math.min(c2gX(Math.round(xOnDown)), c2gX(Math.round(lastX)))
    const y1 = Math.min(c2gY(Math.round(yOnDown)), c2gY(Math.round(lastY)))
    const x2 = Math.max(c2gX(Math.round(xOnDown)), c2gX(Math.round(lastX)))
    const y2 = Math.max(c2gY(Math.round(yOnDown)), c2gY(Math.round(lastY)))

    xBoundHist.push(xBound)
    yBoundHist.push(yBound)

    xBound = [x1, x2]
    yBound = [y1, y2]

    recompute()
}

function backOneBound() {
    xBound = xBoundHist[xBoundHist.length - 1]
    yBound = yBoundHist[yBoundHist.length - 1]

    xBoundHist.pop()
    yBoundHist.pop()

    recompute()
}

function resetBound() {
    xBound = xBoundHist[0]
    yBound = yBoundHist[0]

    xBoundHist = []
    yBoundHist = []

    recompute()
}

// Orbits
const orbitNodeRadius = 10
const orbitColor = "#fff"
let showOrbits = true

function toggleOrbits() {
    showOrbits = !showOrbits

    if (showOrbits) {
        orbits.innerText = "Hide Orbits"
    } else {
        orbits.innerText = "Show Orbits"
    }
}

function circle(x, y) {
    ctx2.arc(x, y, orbitNodeRadius, 0, 2 * Math.PI, false)
    ctx2.fill()
}

function drawOrbit(x, y) {
    x = c2gX(x)
    y = c2gY(y)

    ctx2.fillStyle = orbitColor
    ctx2.strokeStyle = orbitColor

    for (let i = 0; i < maxIter; i++) {
        let nx = x**2 - y**2 + cx
        let ny = 2*x*y + cy

        circle(g2cX(x), g2cY(y))

        ctx2.beginPath()
        ctx2.moveTo(g2cX(x), g2cY(y))
        ctx2.lineTo(g2cX(nx), g2cY(ny))
        ctx2.closePath()
        ctx2.stroke()

        x = nx
        y = ny
    }

    circle(g2cX(x), g2cY(y))
}

// Menu
const cxElt = document.getElementById("cx")
const cyElt = document.getElementById("cy")
const recomp = document.getElementById("recompute")
const orbits = document.getElementById("orbits")
const back = document.getElementById("back")
const reset = document.getElementById("reset")

function enforceRange(e, prev) {
    const v = parseFloat(e.target.value)

    if (isNaN(v) || (e.target.value < -2) || (e.target.value > 2)) {
        e.target.value = prev
    }
}

function disableButtons() {
    cxElt.toggleAttribute("disabled", true)
    cyElt.toggleAttribute("disabled", true)
    recomp.toggleAttribute("disabled", true)
    orbits.toggleAttribute("disabled", true)
    back.toggleAttribute("disabled", true)
    reset.toggleAttribute("disabled", true)
}

function enableButtons() {
    cxElt.toggleAttribute("disabled", false)
    cyElt.toggleAttribute("disabled", false)
    recomp.toggleAttribute("disabled", false)
    orbits.toggleAttribute("disabled", false)

    if (xBoundHist.length > 0) {
        back.toggleAttribute("disabled", false)
        reset.toggleAttribute("disabled", false)
    }
}

function recompute() {
    disableButtons()

    wait2frames(() => {
        updateFunction(parseFloat(cxElt.value), parseFloat(cyElt.value))
        draw()
    })
}

cxElt.addEventListener("change", e => {enforceRange(e, cx)})
cyElt.addEventListener("change", e => {enforceRange(e, cy)})

cxElt.addEventListener("keyup", e => {
    if (e.key == "Enter") recompute()
})
cyElt.addEventListener("keyup", e => {
    if (e.key == "Enter") recompute()
})

recomp.addEventListener("click", recompute)

orbits.addEventListener("click", toggleOrbits)

back.addEventListener("click", backOneBound)

reset.addEventListener("click", resetBound)

function wait2frames(callback) {
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(callback)
    })
}

// Track mouse down
let mouseDown = false
let xOnDown = 0
let yOnDown = 0

let lastX = 0
let lastY = 0

document.addEventListener('mousedown', e => {
    mouseDown = true

    xOnDown = e.clientX * window.devicePixelRatio
    yOnDown = e.clientY * window.devicePixelRatio

    mouseEvent(e)
})

document.addEventListener('mouseup', e => {
    mouseDown = false

    console.log(xOnDown, lastX)
    console.log(yOnDown, lastY)

    if ((Math.abs(xOnDown - lastX) > minSize) && (Math.abs(yOnDown - lastY) > minSize)) {
        addNewBounds()
    }

    mouseEvent(e)
})

// Crosshair
const crossWidth = 6
const crossHeight = 40

const minSize = 150

function round3d(n) {
    return Math.round(n * 1000) / 1000
}

function drawCrosshair(x, y) {
    ctx2.fillStyle = "rgba(255, 255, 255, 0.5)"
    
    ctx2.rect(Math.min(x, xOnDown), Math.min(y, yOnDown), Math.abs(x - xOnDown), Math.abs(y - yOnDown))

    ctx2.fill()
    
    if ((Math.abs(xOnDown - lastX) > minSize) && (Math.abs(yOnDown - lastY) > minSize)) {
        ctx2.strokeStyle = "rgb(255, 255, 255)"
        ctx2.lineWidth = crossWidth+4
        ctx2.stroke()

        ctx2.strokeStyle = "rgb(0, 0, 0)"
        ctx2.lineWidth = crossWidth
        ctx2.stroke()
    }

    ctx2.fillStyle = "#ffffff"
    ctx2.fillRect(x - crossWidth/2, y - crossHeight/2, crossWidth, crossHeight)
    ctx2.fillRect(x - crossHeight/2, y - crossWidth/2, crossHeight, crossWidth)
}

function drawCoords(x, y) {
    ctx2.fillStyle = "#fff"
    ctx2.font = "30px sans-serif"
    ctx2.fillText(`${round3d(c2gX(x))} + ${round3d(c2gY(y))}i`, x + crossHeight/2, y - crossHeight/2)
}

// Main
initWorkers(handleWorkerData)

draw()

function mouseEvent(e) {
    if (e.target.tagName != "CANVAS") return

    lastX = e.clientX * window.devicePixelRatio
    lastY = e.clientY * window.devicePixelRatio

    ctx2.reset()

    if (mouseDown) {
        drawCrosshair(lastX, lastY)
    } else if (showOrbits) {
        drawOrbit(lastX, lastY)
    }

    drawCoords(lastX, lastY)
}

document.addEventListener("mousemove", mouseEvent)
