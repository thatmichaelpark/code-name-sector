display = (function () {

	var gameState;
	var canvas;
	var ctx;
	var compassLeds = [];
	
	function init() {
		gameState = game.gameState;
		canvas = document.getElementById('displaycanvas');
		ctx = canvas.getContext('2d');

		drawDisplay();
		drawCompass();

		update();
		
		function drawDisplay() {
			// LED display
			ctx.save();
			ctx.fillStyle = 'white';
			ctx.strokeStyle = 'white';
			ctx.translate(0, 10);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(canvas.width, 0);
			ctx.moveTo(0, 15);
			ctx.lineTo(canvas.width, 15);
			ctx.moveTo(0, 70);
			ctx.lineTo(canvas.width, 70);
			ctx.moveTo(24, 0);
			ctx.lineTo(24, 70);
			ctx.moveTo(54, 0);
			ctx.lineTo(54, 70);
			ctx.moveTo(54, 55);
			ctx.lineTo(canvas.width, 55);
			ctx.moveTo(99, 0);
			ctx.lineTo(99, 15);
			ctx.stroke();

			ctx.font = '8px sans-serif';
			ctx.fillText('SHIP', 2, 10);
			ctx.fillText('SPEED', 26, 10);
			ctx.fillText('NORTH', 62, 10);
			ctx.fillText('EAST', 111, 10);
			ctx.fillText('RANGE', 90, 65);

			ctx.restore();
			
		}
		function drawCompass() {
			// compass rose
			var r0 = 60;
			var r1 = 50;
			var r2 = 50;
			var w = 10;
			ctx.strokeStyle = 'white';
			ctx.lineWidth = 1;
			ctx.save();
			ctx.translate(canvas.width/2.0, 180);

			ctx.save();
			var i;
			ctx.rotate(Math.PI/4);
			for (i=0; i<4; ++i) {
				drawArm(r2, w);
				ctx.rotate(Math.PI/2);
			}
			ctx.rotate(Math.PI/4);
			for (i=0; i<4; ++i) {
				drawArm(r1, w);
				ctx.rotate(Math.PI/2);
			}
			ctx.restore();
			ctx.arc(0, 0, r0, 0, Math.PI * 2);
			ctx.stroke();
			
			for (i=0; i<8; ++i) {
				var x = r0 * Math.sin(Math.PI * i / 4);
				var y = r0 * -Math.cos(Math.PI * i / 4);
				compassLeds.push({x:x, y:y});
			}
			ctx.restore();

			function drawArm(r, w) {
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(w, w);
				ctx.lineTo(r, 0);
				ctx.fillStyle = 'white';
				ctx.fill();
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(w, -w);
				ctx.lineTo(r, 0);
				ctx.fillStyle = 'maroon';
				ctx.fill();
				ctx.stroke();
			}
		}
	}

	var timer = null;
	var blinker;
	
	function update() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		var s, d;
		switch (gameState.display) {
			case 'ship':
				s = gameState.currentShip.no + '' + gameState.currentShip.speed +
					gameState.currentShip.lat + ' ' + gameState.currentShip.lon;
				d = gameState.currentShip.heading;
				break;
			case 'range':
				s = '      '.substring(0, 6 - gameState.range.length) + gameState.range + ' ';
				d = -1;
				break;
			case 'aim':
				s = '       ';
				d = gameState.torpedoHeading;
				timer = setInterval(function () {
					blink(s, d);
				}, 500);
				blinker = true;
				break;
			case 'SOS':
			case 'COLL':
			case 'SUB':
			case 'OFF1':
			case 'OFF2':
				s = '  ' + gameState.display + '  ';
				d = -1;
				timer = setInterval(function () {
					blink(s, d);
				}, 500);
				blinker = true;
				break;
		}
		
		update7SegmentDisplay(s);
		updateCompass(d);
		
		function blink(s, d) {
			blinker = !blinker;
			update7SegmentDisplay(blinker ? s : '       ');
			updateCompass(blinker ? d : -1);
		}

		function update7SegmentDisplay(s) {

			function draw7Segment(m) {
			// each bit in m corresponds to a segment
				var pts = [
					[ 1.0,  0.0],	// upper left
					[10.0,  0.0],	// upper right
					[ 0.0, 10.0],	// middle left
					[ 9.0, 10.0],	// middle right
					[-1.0, 20.0],	// lower left
					[ 8.0, 20.0]	// lower right
				];
				var segs = [
					[0, 1],		// a
					[3, 1],		// b
					[5, 3],		// c
					[4, 5],		// d
					[2, 4],		// e
					[0, 2],		// f
					[2, 3]		// g
				];
				ctx.fillStyle = 'black';
				ctx.fillRect(-2.5, -2.5, 15, 25);
				ctx.beginPath();
				for (var i=0; i<7; ++i) {
					if (m & (64>>i)) {
						ctx.moveTo(pts[segs[i][0]][0], pts[segs[i][0]][1]);
						ctx.lineTo(pts[segs[i][1]][0], pts[segs[i][1]][1]);
					}
				}
				ctx.strokeStyle = 'red';
				ctx.lineWidth = 3;
				ctx.stroke();
			}

			var charGen = {
				' ': 0,
				'0': 126,
				'1': 48,
				'2': 109,
				'3': 121,
				'4': 51,
				'5': 91,
				'6': 95,
				'7': 112,
				'8': 127,
				'9': 123,
				'-': 1,
				'B': 127,
				'C': 78,
				'F': 71,
				'L': 14,
				'O': 126,
				'S': 91,
				'U': 62
			};
			ctx.save();
			ctx.translate(5, 35);
			for (var i=0; i<7; ++i) {
				draw7Segment(charGen[s[i]]);
				ctx.translate(i<2 ? 30 : 15, 0);
			}
			ctx.restore();
		}
		
		function updateCompass(dir) {

			function drawLed(x, y, on) {
				ctx.fillStyle = on ? 'red' : 'black';
				ctx.beginPath();
				ctx.arc(x, y, 8, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = on ? 'pink' : 'maroon';
				ctx.stroke();
			}
			
			ctx.save();
			ctx.translate(canvas.width/2.0, 180);
			for (var i=0; i<8; ++i) {
				drawLed(compassLeds[i].x, compassLeds[i].y, i==dir);
			}
			ctx.restore();
		}
	}
	return {
		init: init,
		update: update
	}
})();