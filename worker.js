// Local data
let xBound
let yBound

let xCenter
let yCenter

let maxIter

let cx
let cy

let gradient
const recipRoot2 = 1 / Math.sqrt(2)

function updateConfig(data) {
    // Bounds
    xBound = data["xBound"]
    yBound = data["yBound"]

    // Compute center
    xCenter = (xBound[0] + xBound[1])/2
    yCenter = (yBound[0] + yBound[1])/2

    // Iter
    maxIter = data["maxIter"]

    // Compute gradient
    gradient = []
    
    for (let i = 0; i < maxIter; i++) {
        gradient.push(
            [(i * Math.min(i, 15)) % 360, 1, (0.5 - 0.3)/(maxIter - 1) * i + 0.3]
        )
    }

    // Constant
    cx = data["cx"]
    cy = data["cy"]
}

function computeHSL(x, y) {
    let nx
    let ny

    for (let i = 0; i < maxIter; i++) {
        // Independently compute real and complex components
        nx = x**2 - y**2 + cx
        ny = 2*x*y + cy

        x = nx
        y = ny

        if (isNaN(x) || isNaN(y)) return [360, 1, 0.5]

        if ((x < xBound[0]) || (x > xBound[1]) || (y < yBound[0]) || (y > yBound[1])) {
            return gradient[i]
        }
    }

    return [0, 0, 0]

    // Black if converged, colored if escaped
    // if ((x < xBound[0]) || (x > xBound[1]) || (y < yBound[0]) || (y > yBound[1])) {
    //     const d = Math.hypot(x - xCenter, y - yCenter)

    //     return [180 + 180 * Math.tanh(), 1, 0.5]
    // } else {
    //     return [0, 0, 0]
    // }
}

function computeGridHSL(grid) {
    for (let i = 0; i < grid.length; i++) {
        grid[i] = computeHSL(...grid[i])
    }
}

self.addEventListener("message", e => {
    const data = e.data

    if (data["type"] == "updateConfig") {
        updateConfig(data)
    } else if (data["type"] == "compute") {
        console.log(xBound)
        computeGridHSL(data["grid"])
    }

    self.postMessage(data)
})
