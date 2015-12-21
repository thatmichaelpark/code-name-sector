chart = (function () {

	var origin = {lat: 77, lon: 20};
	var gridSize = 8; // size of grid square in pixels
	var gridBlue = '#44a';
	var gridRed = '#f22';
	
	function lat2y(lat) {
		return (origin.lat - lat) * gridSize;
	}
	function lon2x(lon) {
		return (lon - origin.lon) * gridSize;
	}
	function drawGrid(context) {
		var x0, y0;
		var x1, y1;
		context.translate(0.5, 0.5);
		context.lineDashOffset = 3;
		for (var lat=latMin; lat<=latMax; ++lat) {
			y0 = lat2y(lat);
			x0 = lon2x(lonMin);
			x1 = lon2x(lonMax);
			if (lat == latMin + 5 || lat == latMax - 5) {
				context.beginPath();
				context.lineWidth = 1;
				context.moveTo(x0, y0);
				context.lineTo(lon2x(lonMin + 5), y0);
				context.setLineDash([6, 2]);
				context.stroke();
				
				context.beginPath();
				context.strokeStyle = gridRed;
				context.moveTo(lon2x(lonMin + 5), y0);
				x0 = lon2x(lonMax - 5);
				context.lineTo(x0, y0);
				context.stroke();
				
			} else if (lat % 10 == 0) {
				context.lineWidth = 1;
				context.setLineDash([6, 2]);
			} else if (lat % 5 == 0) {
				context.lineWidth = 1;
			} else {
				context.lineWidth = 0.2;
			}
			context.strokeStyle = gridBlue;
			context.beginPath();
			context.moveTo(x0, y0);
			context.lineTo(x1, y0);
			context.stroke();
			context.setLineDash([]);
		}
		for (var lon=lonMin; lon<=lonMax; ++lon) {
			x0 = lon2x(lon);
			y0 = lat2y(latMin);
			y1 = lat2y(latMax);

			if (lon == lonMin + 5 || lon == lonMax - 5) {
				context.beginPath();
				context.lineWidth = 1;
				context.moveTo(x0, y0);
				context.lineTo(x0, lat2y(latMin + 5));
				context.setLineDash([6, 2]);
				context.stroke();
				
				context.beginPath();
				context.strokeStyle = gridRed;
				context.moveTo(x0, lat2y(latMin + 5));
				y0 = lat2y(latMax - 5);
				context.lineTo(x0, y0);
				context.stroke();
				
			} else if (lon % 10 == 0) {
				context.lineWidth = 1;
				context.setLineDash([6, 2]);
			} else if (lon % 5 == 0) {
				context.lineWidth = 1;
			} else {
				context.lineWidth = 0.5;
			}
			context.beginPath();
			context.strokeStyle = gridBlue;
			context.moveTo(x0, y0);
			context.lineTo(x0, y1);
			context.stroke();
			context.setLineDash([]);
		}
		context.strokeStyle = gridRed;
		context.textBaseline = 'middle';
		for (lat=25; lat<=75; lat+=10) {
			y0 = lat2y(lat);
			x0 = lon2x(25) - 28;
			context.strokeText(lat+'N', x0, y0);
		}
		context.textAlign = 'center';
		for (lon=25; lon<=75; lon+=10) {
			x0 = lon2x(lon);
			y0 = lat2y(25) + 15;
			context.strokeText(lon+'E', x0, y0);
		}
	}
	
	var ctxBottom;
	var ctxMiddle;
	var canvasTop;
	var ctxTop;

	var mapStyle;	// for mousemove handler to change cursor when mouse is over the grid.

	function init() {
		ctxBottom = document.getElementById("canvas0").getContext("2d");
		ctxMiddle = document.getElementById("canvas1").getContext("2d");
		canvasTop = document.getElementById("canvas2");
		ctxTop = canvasTop.getContext("2d");
		setClipRect(ctxMiddle);

		drawGrid(ctxBottom);

		mapStyle = document.getElementById('map').style;

		canvasTop.addEventListener("mousedown", mouseDownListener);
		window.addEventListener("mouseup", mouseUpListener);
		window.addEventListener("mousemove", mouseMoveListener);
		
		var buttons = document.querySelectorAll('#colorbuttons > button');
		for (var i=0; i<buttons.length; ++i) {
			buttons[i].addEventListener('click', colorClick);
		}
		reset();
	}
	
	function reset() {
		clearMap();
	}
	
	function clearMap() {
		ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
		ctxMiddle.clearRect(0, 0, canvasTop.width, canvasTop.height);
	}
	
	function setColorSquareColor(c) {
		var colorsquare = document.getElementById('colorsquare');
		colorsquare.style.background = c;
	}
	
	var paintMode = true;	// false => erase mode
	var paintColor = 'red';
	var drawing = false;
	var erasing = false;
	var eraserSize = 15;
	var lineStart = {};
	
	function colorClick(e) {
		selectColor(e.target.value);
	}
	
	function selectColor(c) {
		if (c == 'eraser') {
			setColorSquareColor('white');
			paintMode = false;
		} else if (c == 'clear') {
			clearMap();
			paintMode = true;
		} else {
			setColorSquareColor(c);
			paintMode = true;
			paintColor = c;
		}
	}
	
	function mouseDownListener(e) {
		var bRect = canvasTop.getBoundingClientRect();
		mouseX = (e.clientX - bRect.left);
		mouseY = (e.clientY - bRect.top);
		if (onTheMap(mouseX, mouseY)) {
			if (paintMode) {
				drawing = true;
				lineStart.x = gridSnapX(mouseX);
				lineStart.y = gridSnapY(mouseY);
				ctxTop.strokeStyle = paintColor;
				ctxMiddle.strokeStyle = paintColor;
				ctxTop.beginPath();
				ctxTop.lineWidth = 2;
				ctxTop.moveTo(lineStart.x, lineStart.y);
				ctxTop.lineTo(gridSnapX(mouseX), gridSnapY(mouseY));
				ctxTop.stroke();
			} else { // erase mode
				erasing = true;
				ctxMiddle.clearRect(mouseX - eraserSize/2, mouseY - eraserSize/2, eraserSize, eraserSize);
			}
			e.preventDefault();
		}
	}
	
	function onTheMap(x, y) {
		return lon2x(lonMin) <= x && x <= lon2x(lonMax)
			&& lat2y(latMax) <= y && y <= lat2y(latMin);
	}
	
	function gridSnapX(x) {
		return lon2x(Math.round((x - lon2x(lonMin)) / gridSize + lonMin));
	}
	
	function gridSnapY(y) {
		return lat2y(Math.round((lat2y(latMin) - y) / gridSize + latMin));
	}
		
	function clampMouse(mousex, mousey) {
		var bRect = canvasTop.getBoundingClientRect();
		var x = (mousex - bRect.left);
		var y = (mousey - bRect.top);
		return {x: Math.min(Math.max(x, lon2x(lonMin)), lon2x(lonMax)),
				y: Math.min(Math.max(y, lat2y(latMax)), lat2y(latMin))};
	}
	
	function mouseUpListener(e) {
		if (paintMode) {
			if (!drawing) return;
			drawing = false;
			var mouse = clampMouse(e.clientX, e.clientY);
			ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
			ctxMiddle.beginPath();
			ctxMiddle.lineWidth = 2;
			ctxMiddle.moveTo(lineStart.x, lineStart.y);
			ctxMiddle.lineTo(gridSnapX(mouse.x), gridSnapY(mouse.y));
			ctxMiddle.stroke();
		} else { // erase mode
			erasing = false;
		}
		e.preventDefault();
	}
	
	function mouseMoveListener(e) {
		var bRect = canvasTop.getBoundingClientRect();
		var mouseX = (e.clientX - bRect.left);
		var mouseY = (e.clientY - bRect.top);
		if (paintMode) {
			if (onTheMap(mouseX, mouseY)) {
				mapStyle.cursor = 'crosshair';
			} else {
				mapStyle.cursor = 'default';
			}
			if (!drawing) return;
			var mouse = clampMouse(e.clientX, e.clientY);
			ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
			ctxTop.beginPath();
			ctxTop.moveTo(lineStart.x, lineStart.y);
			ctxTop.lineTo(gridSnapX(mouse.x), gridSnapY(mouse.y));
			ctxTop.stroke();
		} else {	// erase mode
			ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);
			if (!onTheMap(mouseX, mouseY)) return;
			ctxTop.strokeStyle = 'black';
			ctxTop.lineWidth = 1;
			ctxTop.strokeRect(mouseX - eraserSize/2, mouseY - eraserSize/2, eraserSize, eraserSize);
			if (erasing) {
				ctxMiddle.clearRect(mouseX - eraserSize/2, mouseY - eraserSize/2, eraserSize, eraserSize);
			}
		}
		e.preventDefault();
	}

	function setClipRect(ctx) {
		ctx.rect(lon2x(lonMin-0.5), lat2y(latMax+0.5), lon2x(lonMax+1)-lon2x(lonMin), lat2y(latMin-1)-lat2y(latMax));
		ctx.clip();
	}
	
	function autoPlotOn() {
		return document.getElementById('autoplot').checked;
	}
	
	function plotShip(ship) {
		if (autoPlotOn()) {
			selectColor(ship.color);
			if (ship.prevLat) {
				ctxMiddle.beginPath();
				ctxMiddle.lineWidth = 1;
				ctxMiddle.strokeStyle = ship.color;
				ctxMiddle.moveTo(lon2x(ship.prevLon), lat2y(ship.prevLat));
				ctxMiddle.lineTo(lon2x(ship.lon), lat2y(ship.lat));
				ctxMiddle.stroke();
			}
			ctxMiddle.beginPath();
			ctxMiddle.fillStyle = ship.color;
			ctxMiddle.arc(lon2x(ship.lon), lat2y(ship.lat), 2.5, 0, Math.PI * 2);
			ctxMiddle.fill();
		}
		ship.prevLat = ship.lat;
		ship.prevLon = ship.lon;
	}
	
	function plotRange(ship, range) {
		if (autoPlotOn()) {
			var x = lon2x(ship.lon);
			var y = lat2y(ship.lat);
			var d = range * gridSize;
			ctxMiddle.beginPath();
			ctxMiddle.strokeStyle = ship.color;
			ctxMiddle.moveTo(x - d, y - d);
			ctxMiddle.lineTo(x + d, y - d);
			ctxMiddle.lineTo(x + d, y + d);
			ctxMiddle.lineTo(x - d, y + d);
			ctxMiddle.closePath();
			ctxMiddle.stroke();
		}
	}
	
	return {
		init: init,
		reset: reset,
		selectColor: selectColor,
		plotShip: plotShip,
		plotRange: plotRange
	};
})();