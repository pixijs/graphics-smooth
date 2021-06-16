const app = new PIXI.Application({ antialias: false,
    width: 800, height: 600,
    backgroundColor: 0xffffff,
    autoDensity: true, resolution: 1,
});
document.body.appendChild(app.view);

function makeFigures(graphics) {
    graphics.lineStyle(2, 0, 1);

    graphics.moveTo(100, 150);
    graphics.lineTo(600, 150);

    graphics.moveTo(100, 160);
    graphics.lineTo(600, 160);

    graphics.moveTo(100, 170);
    graphics.lineTo(600, 170);

    graphics.rotation = 0.06
}

const graphics = new PIXI.smooth.SmoothGraphics();
makeFigures(graphics);
app.stage.addChild(graphics);

const graphics2 = new PIXI.Graphics();
PIXI.Graphics.prototype.drawStar = PIXI.smooth.SmoothGraphics.prototype.drawStar;
graphics2.y = 300;
makeFigures(graphics2);
app.stage.addChild(graphics2);

// const canvasRenderer = new PIXI.CanvasRenderer();
// document.body.appendChild(canvasRenderer.view);
// canvasRenderer.render(app.stage);
