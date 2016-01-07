game = (function () {

	var logDiv;
	var gameState = {};

	// headings are 0..7, where 0 is N, 1 is NE, etc.
	var compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
	var dlats = [1, 1, 0, -1, -1, -1, 0, 1];
	var dlons = [0, 1, 1, 1, 0, -1, -1, -1];
	
	function init() {
		logDiv = document.getElementById('log');
		var buttons = document.querySelectorAll('#controlbuttons button');
		for (var i=0; i<buttons.length; ++i) {
			buttons[i].addEventListener('click', controlClickListener);
		}
		reset();
	}
	
	function reset() {
		var gameType = document.getElementById('gametype').value; // regular/evasive/teach
		game.log('New game (' + gameType + ').');

		gameState.evasiveSub = gameType == 'evasive sub';	// boolean

		if (gameType == 'teach mode') {
			gameState.sub = {lat:34, lon:34, heading:1, depth: 1};	// hack: one step before actual initial position
																	//  because we're going to start with 'next'
																	//  which will advance the sub (see below).
		} else {
			gameState.sub = {
				lat: randi(latMin+5, latMax-5),
				lon: randi(lonMin+5, lonMax-5),
				heading: randi(0, 7),
				depth: randi(1, 3)
			};
		}
		gameState.ships = [
			{no: 1, lat: 35, lon: 25, heading: 1, speed: 0, color: 'red'},
			{no: 2, lat: 30, lon: 25, heading: 1, speed: 0, color: 'green'},
			{no: 3, lat: 25, lon: 30, heading: 1, speed: 0, color: 'blue'},
			{no: 4, lat: 25, lon: 35, heading: 1, speed: 0, color: 'black'},
		];
		gameState.ships[0].next = gameState.ships[1];
		gameState.ships[1].next = gameState.ships[2];
		gameState.ships[2].next = gameState.ships[3];
		gameState.ships[3].next = gameState.ships[0];
		
		gameState.torpedoHeading = 0;
		
		setDisplay('ship');		// ship/range/aim/sos/coll/off/sub
//		setMoved(false);		// true if ship has moved this turn.
		setMoved(true);			// hack: for first 'next' (below)
		setFired(false);		// true if torpedo has been fired this turn.
		disableElements(['aim', 'depthselect', 'fire']);
		gameState.currentShip = gameState.ships[3];	// hack: first 'next' will increment to ships[0].
		
		document.getElementById('depthselect').addEventListener('change', depthListener);
		
		executeCommand('next');			// that first 'next' I was talking about.
	}
	
	function setDisplay(d) {
	// some special things have to happen for certain displays
		if (d == 'aim') {
			enableElements(['depthselect']);
		} else {
			document.getElementById('depthselect').value = '-';
			disableElements(['depthselect', 'fire']);
			if (gameState.fired) {
				disableElements(['aim']);
			} else {
				enableElements(['aim']);
			}
		}
		gameState.display = d;
	}
	
	function setMoved(m) {
	// some special things have to happen when gameState.moved changes
		gameState.moved = m;
		if (m) {
			disableElements(['left', 'right', 'slower', 'faster', 'move']);
			enableElements(['next']);
		} else {
			enableElements(['left', 'right', 'slower', 'faster', 'move']);
			disableElements(['next']);
		}
	}
	
	function setFired(f) {
	// some special things have to happen when gameState.fired changes
		gameState.fired = f;
		if (f) {
			disableElements(['aim', 'depthselect', 'fire']);
		} else {
			enableElements(['aim']);
		}
	}

	function enableElements(es) {
	// es is an array of ids
		for (var i=0; i<es.length; ++i) {
			var e = document.getElementById(es[i]);
			e.removeAttribute('disabled');
		}
	}
	
	function disableElements(es) {
	// es is an array of ids
		for (var i=0; i<es.length; ++i) {
			var e = document.getElementById(es[i]);
			e.setAttribute('disabled', '');
		}
	}
	
	function depthListener(e) {
		if (e.target.value == '-') {
			disableElements(['fire']);
		} else {
			enableElements(['fire']);
		}
	}
	
	function randi(min, max) {
	// returns random int in [min..max] (n.b. inclusive)
	  return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function controlClickListener(e) {
		executeCommand(e.target.id);
		display.update();
	}
	
	function executeCommand(cmd) {
		switch (cmd) {
			case 'next':
				gameState.currentShip = gameState.currentShip.next;
				game.log('Ship ' + (gameState.currentShip.no) + ' at ' +
					gameState.currentShip.lat + 'N, ' +
					gameState.currentShip.lon + 'E' + '.');
				chart.plotShip(gameState.currentShip);
				moveSub();
				setMoved(false);
				setFired(false);
				setDisplay('ship');
				chart.selectColor(gameState.currentShip.color);
				break;
			case 'left':
			case 'right':
				gameState.currentShip.heading = (gameState.currentShip.heading + (cmd == 'left' ? -1 : 1)) & 7;
				setDisplay('ship');
				break;
			case 'slower':
				gameState.currentShip.speed = Math.max(gameState.currentShip.speed - 1, 0);
				setDisplay('ship');
				break;
			case 'faster':
				gameState.currentShip.speed = Math.min(gameState.currentShip.speed + 1, 9);
				setDisplay('ship');
				break;
			case 'move':
				moveShip(gameState.currentShip);
				setDisplay('ship');
				setMoved(true);
				break;
			case 'range':
				var dlat = Math.abs(gameState.sub.lat - gameState.currentShip.lat);
				var dlon = Math.abs(gameState.sub.lon - gameState.currentShip.lon);
				var r = Math.max(dlat, dlon);
				chart.plotRange(gameState.currentShip, r);
				gameState.range = (r <= 2 && (dlat == 0 || dlon == 0 || dlat == dlon) ? 'F' : '') + r;	// string; e.g. '17' or 'F1'
				game.log('Sub detected at range ' + gameState.range);
				setDisplay('range');
				break;
			case 'aim':
				if (gameState.display == 'aim') {
					gameState.torpedoHeading = (gameState.torpedoHeading + 1) & 7;
				} else {
					gameState.torpedoHeading = 0;
					setDisplay('aim');
				}
				break;
			case 'fire':
				function fireTorpedo(depth) {
				// return -1 if torpedo misses completely
				//		   0 if torpedo sinks sub
				//         1 if torpedo depth is off by 1
				//		   2 if torpedo depth is off by 2
					var lat = gameState.currentShip.lat;
					var lon = gameState.currentShip.lon;
					var dlat = dlats[gameState.torpedoHeading];
					var dlon = dlons[gameState.torpedoHeading];
					for (var i=0; i<=2; ++i) {
						if (lat == gameState.sub.lat && lon == gameState.sub.lon) {
							return Math.abs(gameState.sub.depth - depth);
						}
						lat += dlat;
						lon += dlon;
					}
					return -1;
				}
				
				var depth = Number(document.getElementById('depthselect').value);
				game.log('Torpedo fired, heading ' + compassDirs[gameState.torpedoHeading] + '.');
				var result = fireTorpedo(depth);	// -1, 0, 1, 2
				setDisplay(['SOS', 'SUB', 'OFF1', 'OFF2'][result + 1]);
				if (result == -1) {			// SOS: torpedo missed completely
					game.log('Torpedo missed. Enemy retaliates.');
					newCourse(gameState.currentShip);
					game.log('Ship ' + gameState.currentShip.no + ' now at ' +
						gameState.currentShip.lat + 'N, ' + gameState.currentShip.lon + 'E.');
					chart.plotShip(gameState.currentShip);
				} else if (result == 0) {	// SUB: sub destroyed
					game.log('Sub at ' + gameState.sub.lat + 'N, ' +
							gameState.sub.lon + 'E destroyed at depth ' +
							gameState.sub.depth + '.');
					gameState.sub.lat = randi(latMin+5, latMax-5);
					gameState.sub.lon = randi(lonMin+5, lonMax-5);
					gameState.sub.heading = randi(0, 7);
					gameState.sub.depth = randi(1, 3);
				} else {
					game.log('Torpedo depth off by ' + result + '.');
				}
				
				setFired(true);
				
				if (gameState.evasiveSub) {
					gameState.sub.heading = (gameState.sub.heading + randi(-1, 1)) & 7;
				}
				break;
			case 'recall':
				setDisplay('ship');
				break;
			case 'restart':
				chart.reset();
				reset();
				break;
		}
		return;
		
		function moveSub() {
			var newLat = gameState.sub.lat + dlats[gameState.sub.heading];
			var newLon = gameState.sub.lon + dlons[gameState.sub.heading];
			
			if (latMin + 5 <= newLat && newLat <= latMax - 5
			 && lonMin + 5 <= newLon && newLon <= lonMax - 5) {
			 	
				// sub is inside or on the limit line; do nothing
				
			} else {	// if sub is about to go outside the limit line, change heading
					//  to one that keeps the sub within (not on) the limit line.
				do {
					gameState.sub.heading = randi(0, 7);
					newLat = gameState.sub.lat + dlats[gameState.sub.heading];
					newLon = gameState.sub.lon + dlons[gameState.sub.heading];
				} while (newLat <= latMin + 5 || newLat >= latMax - 5
				      || newLon <= lonMin + 5 || newLon >= lonMax - 5);
			}
			gameState.sub.lat = newLat;
			gameState.sub.lon = newLon;
			console.log(newLat + "N, " + newLon + "E, heading " + gameState.sub.heading + ", depth " + gameState.sub.depth);
		}

		function checkCollisions(ship) {
		// if ship has collided with another ship, return that ship; otherwise return null;
			for (var i=0; i<4; ++i) {
				var thatShip = gameState.ships[i];
				if (thatShip === ship) continue;
				if (thatShip.lat == ship.lat && thatShip.lon == ship.lon) {
					return thatShip;
				}
			}
			return null;
		}

		function tryToMove(ship) {
		// try to move ship. if move succeeds, update ship's position and return null;
		// if move fails (collision), leave ship's position unchanged and return the other ship in collision
			var lat = ship.lat;
			var lon = ship.lon;
			var heading = ship.heading;
			for (var i=0; i<ship.speed; ++i) {
				ship.lat += dlats[ship.heading];
				ship.lon += dlons[ship.heading];
				var collision = checkCollisions(ship);
				if (collision) {
					ship.lat = lat;	// restore original
					ship.lon = lon; //  position
					return collision;
				}
			}
			return null;
		}
		
		function newCourse(ship) {
		// when ship is blown off course by collision or sub attack, randomize
		// heading and move ship
			do {
				ship.heading = randi(0, 7);
			} while(tryToMove(ship) != null);
		}
		
		function moveShip(ship) {
			game.log('Ship ' + ship.no + ' heading ' + compassDirs[ship.heading] + ', speed ' + ship.speed + '.');
			var collision = tryToMove(ship);
			if (collision) {
				game.log('Collision with Ship ' + collision.no + ' at ' + collision.lat + 'N, ' + collision.lon + 'E!');
				ship.lat = collision.lat;
				ship.lon = collision.lon;
				chart.plotShip(ship);
				newCourse(ship);
				setDisplay('COLL');
				if (gameState.evasiveSub) {
					gameState.sub.heading = (gameState.sub.heading + randi(-1, 1)) & 7;
				}
			}
			game.log('Ship ' + ship.no + ' now at ' + ship.lat + 'N, ' + ship.lon + 'E.');
			chart.plotShip(ship);
		}
	}

	function log(s) {
		logDiv.appendChild(document.createElement('P')).appendChild(document.createTextNode(s));
		logDiv.scrollTop = logDiv.scrollHeight;
	}
	
	return {
		init: init,
		log: log,
		gameState: gameState
	}


})();
